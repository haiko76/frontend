import { Alchemy, Network } from "alchemy-sdk";
import { AlchemyAPI } from "../api/external-api/alchemy";
import {
	classify,
	getFlashLoans,
	getLiquidation,
	getRepayments,
	getSwaps,
	getTransfers,
} from "../classifier/classifiers";
import { getAlchemyConfig } from "../configs/config";
import type Fetcher from "../parser/fetcher";
import type { RepositoryWrite } from "../repository/repository";
import type {
	Arbitrage,
	Block,
	ChainId,
	FlashLoan,
	Liquidation,
	Log,
	Sandwich,
	TokenMetadata,
	Transaction,
	Transfer,
} from "../types";
import { calculateTokenValueInUSD, calculateTxGasCost } from "../utils/utils";
import { ArbitrageDetector } from "./arb";
import { Converter } from "./arb/converter";
import { LiquidationDetector } from "./liquidation/liqudation";
import { SandwichDetection } from "./sandwich/sandwich";

const WETH_ADDRESS = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";

export type InspectorConstructor = {
	network: Network;
	repository: RepositoryWrite;
	// redisRepository: RedisRepository;
	fetcher: Fetcher;
};

export type MevResult = {
	liquidation: Liquidation[];
	arbitrage: Arbitrage[];
	sandwich: Sandwich[];
	transfers: Transfer[];
};
export class Inspector {
	private readonly sandwichDetector: SandwichDetection;
	private readonly liquidationDetector: LiquidationDetector;
	private readonly arbitrageDetector: ArbitrageDetector;
	private readonly provider: Alchemy;
	private readonly network: Network;
	private readonly fetcher: Fetcher;
	private readonly repository: RepositoryWrite;
	// private readonly redisRepository: RedisRepository;
	private readonly chainId: ChainId;
	private readonly priceFetcher: AlchemyAPI;

	constructor(params: InspectorConstructor) {
		const alchemyConfig = getAlchemyConfig(params.network);
		this.network = params.network;
		this.provider = new Alchemy(alchemyConfig);
		// this.redisRepository = params.redisRepository;
		this.repository = params.repository;
		this.fetcher = params.fetcher;
		this.sandwichDetector = new SandwichDetection();
		this.arbitrageDetector = new ArbitrageDetector();
		this.liquidationDetector = new LiquidationDetector();
		this.priceFetcher = new AlchemyAPI(this.repository);
		switch (params.network) {
			case Network.ETH_MAINNET: {
				this.chainId = 1;
				break;
			}
			default: {
				throw new Error(`Unsupported chain, network: ${params.network}`);
			}
		}
	}

	async inspectMevBlock(blockNumber: bigint): Promise<{
		mev: MevResult;
		transactions: Transaction[];
		block: Block | null;
	}> {
		const response = await this.fetcher.getBlockLogs(Number(blockNumber));
		if (!response) {
			return {
				mev: {
					liquidation: [],
					arbitrage: [],
					sandwich: [],
					transfers: [],
				},
				transactions: [],
				block: null,
			};
		}
		const { block: rawBlock, logs: log } = response;
		const block = Converter.toBlock(rawBlock);
		const mev = await this.getMev(log, block);
		return {
			mev: mev,
			block: block,
			transactions: response.transactions,
		};
	}

	private async getMev(logs: Log[], block: Block): Promise<MevResult> {
		if (logs.length === 0) {
			return {
				arbitrage: [],
				sandwich: [],
				liquidation: [],
				transfers: [],
			};
		}
		const events = classify(this.chainId, logs);
		const pools = await this.fetcher.getPools(this.chainId, events);
		const transfers = getTransfers(events);
		const swaps = getSwaps(this.chainId, pools, transfers, events);
		const markets = await this.fetcher.getMarkets(this.chainId, events);
		const repayments = getRepayments(this.chainId, markets, events);
		const seizures = getLiquidation(this.chainId, markets, events);
		const flashLoan = getFlashLoans(events);
		const flashLoanMap: Record<string, FlashLoan> = {};
		for (const fl of flashLoan) {
			flashLoanMap[fl.transaction.hash] = fl;
		}
		const liquidations = this.liquidationDetector.getLiquidations(repayments, seizures, flashLoanMap);
		const arbitrages = this.arbitrageDetector.detectArbitrage(transfers, flashLoanMap);
		const sandwiches = this.sandwichDetector.getSandwiches(this.chainId, swaps);
		const allAssetMetadataMap: Record<string, TokenMetadata> = {};
		const allAssetAddress: Set<string> = new Set([WETH_ADDRESS]);
		for (const arb of arbitrages) {
			arb.profit.map((p) => allAssetAddress.add(p.address));
		}
		for (const sandwich of sandwiches) {
			sandwich.profit.map((p) => allAssetAddress.add(p.address));
		}
		for (const liq of liquidations) {
			allAssetAddress.add(liq.repayment.borrowedAsset);
			allAssetAddress.add(liq.liquidate.liquidatedAsset);
		}

		if (allAssetAddress.size > 0) {
			const tokenMetadata = await this.priceFetcher.getTokenMetadata(
				Array.from(allAssetAddress),
				block.timestamp,
				block.number,
			);
			for (const [key, value] of Object.entries(tokenMetadata)) {
				allAssetMetadataMap[key] = value;
			}
			for (const arbitrage of arbitrages) {
				for (const profit of arbitrage.profit) {
					const tokenMetadata = allAssetMetadataMap[profit.address];
					if (tokenMetadata && tokenMetadata.price) {
						const revenueInUsd = calculateTokenValueInUSD(
							profit.amount,
							tokenMetadata.price.rate,
							tokenMetadata.decimals,
						);
						const { gasUsed, gasPrice } = arbitrage.cost;
						const wethPrice = allAssetMetadataMap[WETH_ADDRESS]?.price?.rate;
						if (!wethPrice) {
							throw new Error(`Missing rate for token ${WETH_ADDRESS}`);
						}
						const costInUsd = calculateTxGasCost(gasUsed, gasPrice, wethPrice);
						arbitrage.costInUsd = costInUsd;
						arbitrage.profitInUsd = revenueInUsd - costInUsd;
					}
				}
			}
			for (const liquidation of liquidations) {
				const debtToCover = liquidation.repayment.debtAmount;
				const liquidatedAmount = liquidation.liquidate.liquidatedCollateralAmount;
				const debtAssetMetadata = allAssetMetadataMap[liquidation.repayment.borrowedAsset];
				const collateralAssetMetadata = allAssetMetadataMap[liquidation.liquidate.liquidatedAsset];
				if (!debtAssetMetadata.price || !collateralAssetMetadata.price) {
					throw new Error(`Missing rate for token ${liquidation.repayment.borrowedAsset}`);
				}
				const debtToCoverInUsd = calculateTokenValueInUSD(
					debtToCover,
					debtAssetMetadata.price.rate,
					debtAssetMetadata.decimals,
				);
				const liquidatedAmountInUsd = calculateTokenValueInUSD(
					liquidatedAmount,
					collateralAssetMetadata.price.rate,
					collateralAssetMetadata.decimals,
				);
				liquidation.liquidatedAmountInUsd = Number(liquidatedAmountInUsd.toFixed(2));
				liquidation.repaymentAmountInUsd = Number(debtToCoverInUsd.toFixed(2));
				const { gasUsed, gasPrice } = liquidation.liquidate.transaction;
				// WETH address
				const wethPrice = allAssetMetadataMap[WETH_ADDRESS].price?.rate;
				if (!wethPrice) {
					throw new Error(`Missing rate for token ${WETH_ADDRESS}`);
				}
				const costInUsd = calculateTxGasCost(gasUsed, gasPrice, wethPrice);
				liquidation.costInUsd = Number(costInUsd.toFixed(2));
				const profitInUsd = liquidatedAmountInUsd - debtToCoverInUsd - liquidation.costInUsd;
				liquidation.profitInUsd = profitInUsd;
			}

			for (const sandwich of sandwiches) {
				let totalProfit = 0;
				for (const p of sandwich.profit) {
					const tokenMetadata = allAssetMetadataMap[p.address];
					if (!tokenMetadata || !tokenMetadata.price) {
						continue;
					}
					const profitInUsd = calculateTokenValueInUSD(p.amount, tokenMetadata.price.rate, tokenMetadata.decimals);
					totalProfit += profitInUsd;
				}
				sandwich.profitInUsd = totalProfit;
				const { gasUsed: frontGasUsed, gasPrice: frontGasPrice } = sandwich.sandwich.frontSwap.transaction;
				// WETH address
				const wethPrice = allAssetMetadataMap[WETH_ADDRESS].price?.rate;
				if (!wethPrice) {
					throw new Error(`Missing rate for token ${WETH_ADDRESS}`);
				}
				const costInUsd = calculateTxGasCost(frontGasUsed, frontGasPrice, wethPrice);
				const { gasUsed: backGasUsed, gasPrice: backGasPrice } = sandwich.sandwich.backSwap.transaction;
				const backCostInUsd = calculateTxGasCost(backGasUsed, backGasPrice, wethPrice);
				sandwich.costInUsd = costInUsd + backCostInUsd;
			}
		}

		return {
			liquidation: liquidations,
			sandwich: sandwiches,
			arbitrage: arbitrages,
			transfers: transfers,
		};
	}
}

import type { PrismaClient, repayment_event, sandwich, transfer } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import JSONBig from "json-bigint";
import { sha3 } from "../parser";
import {
	type Arbitrage,
	type BaseTxWithTraces,
	type Block,
	type FullArbitrage,
	type FullLiquidation,
	type FullSandwich,
	MevType,
	type Pool,
	type PrismaArbitrage,
	type PrismaLiquidation,
	type PrismaLiquidationEvent,
	type PrismaSandwich,
	type Protocol,
	type TokenMetadata,
	type Transaction,
	type Transfer,
} from "../types";
import { bigintToDecimal, decimalToBigInt } from "../utils/utils";

export type PrismaClientTx = Omit<
	PrismaClient,
	"$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

const DEFAULT_TIMEOUT = 10000;
const DEFAULT_MAX_WAIT = 5000;

export enum PrismaTxType {
	Normal = 0,
	Arbitrage = 1,
	Liquidation = 2,
	Sandwich = 3,
}
export type PrismaTxResponse =
	| {
			type: PrismaTxType.Normal;
			tx: Transaction;
	  }
	| {
			type: PrismaTxType.Arbitrage;
			tx: FullArbitrage;
	  }
	| {
			type: PrismaTxType.Sandwich;
			tx: FullSandwich;
	  }
	| {
			type: PrismaTxType.Liquidation;
			tx: FullLiquidation;
	  }
	| null;
export class Repository {
	protected readonly prisma: PrismaClient | PrismaClientTx;

	constructor(prisma: PrismaClient | PrismaClientTx) {
		this.prisma = prisma;
	}

	async getBlockWithTransactions(blockNumber: number): Promise<{
		block: Block;
		transactions: Transaction[];
	} | null> {
		const block = await this.prisma.block.findUnique({
			where: { number: Number(blockNumber) },
		});
		if (!block) {
			return null;
		}
		const transactions = await this.prisma.transaction.findMany({
			where: { block_number: Number(blockNumber) },
		});

		return {
			block: {
				hash: block.hash,
				number: block.number,
				timestamp: block.timestamp,
			},
			transactions: transactions.map((transaction) => ({
				blockNumber: transaction.block_number,
				hash: transaction.hash,
				from: transaction.from,
				to: transaction.to ?? "",
				index: transaction.index,
				gasPrice: decimalToBigInt(transaction.gas_price),
				gasUsed: decimalToBigInt(transaction.gas_used),
				label: (transaction.label as MevType) ?? null,
				timestamp: transaction.timestamp,
			})),
		};
	}

	async getTransaction(hash: string): Promise<PrismaTxResponse> {
		const res = await this.prisma.transaction.findUnique({
			where: { hash },
		});
		if (!res) {
			return null;
		}
		if (!res.label) {
			return {
				type: PrismaTxType.Normal,
				tx: {
					blockNumber: res.block_number,
					hash: res.hash,
					from: res.from,
					to: res.to ?? "",
					index: res.index,
					gasPrice: decimalToBigInt(res.gas_price),
					gasUsed: decimalToBigInt(res.gas_used),
					timestamp: res.timestamp,
				},
			};
		}
		const commonData = {
			timestamp: res.timestamp,
			from: res.from,
			to: res.to ?? "",
			transactionLogIndex: res.index,
		};
		switch (res.label as MevType) {
			case MevType.Liquidation: {
				const allAssetAddress: string[] = [];
				const liquidationTxs: {
					transaction_hash: string;
					block_number: number;
					liquidator: string | null;
					protocols: string[];
					profit_amount_in_usd: number;
					cost_in_usd: number;
					revenue_in_usd: number;
					event_log_index: number;
					transfer_asset_id: string;
					transfer_sender: string;
					transfer_receiver: string;
					transfer_amount: Decimal;
				}[] = await this.prisma.$queryRaw`
					SELECT 
						l.transaction_hash,
						l.block_number,
						l.liquidator,
						l.protocols,
						l.profit_amount_in_usd,
						l.cost_in_usd,
						l.revenue_in_usd,
						t.event_log_index,
						t.asset_id AS transfer_asset_id,
						t.from AS transfer_sender,
						t.to AS transfer_receiver,
						t.amount AS transfer_amount
					FROM 
						mev_inspect.liquidation l
					JOIN 
						mev_inspect.transfer t ON l.transaction_hash = t.transaction_hash
					WHERE 
						l.transaction_hash = ${hash}
					ORDER BY 
						t.event_log_index
				`;
				if (liquidationTxs.length === 0) {
					return null;
				}

				const repaymentEvents: repayment_event[] = await this.prisma.repayment_event.findMany({
					where: {
						transaction_hash: hash,
					},
				});
				const liquidationEvents: PrismaLiquidationEvent[] = repaymentEvents.map((repayment) => {
					allAssetAddress.push(repayment.asset_in_debt);
					return {
						transactionHash: repayment.transaction_hash,
						payer: repayment.payer,
						borrower: repayment.borrower,
						assetInDebt: repayment.asset_in_debt,
						debtAmount: repayment.debt_to_cover,
						liquidatedAmount: repayment.liquidated_amount,
						liquidatedAsset: repayment.asset_liquidated,
						repaymentAmountInUsd: repayment.repayment_amount_in_usd,
						liquidatedAmountInUsd: repayment.liquidated_amount_in_usd,
						seizureEventLogIndex: repayment.seizure_event_log_index,
						repaymentEventLogIndex: repayment.repayment_event_log_index,
					};
				});
				const traces = liquidationTxs.map((t) => {
					allAssetAddress.push(t.transfer_asset_id);
					return {
						from: t.transfer_sender,
						to: t.transfer_receiver,
						asset: t.transfer_asset_id,
						value: decimalToBigInt(t.transfer_amount),
						eventLogIndex: t.event_log_index,
					};
				});
				const allAssetMetadataMap: Record<
					string,
					Omit<TokenMetadata, "price">
				> = await this.getAssetMetadataByAddresses(allAssetAddress);

				return {
					type: PrismaTxType.Liquidation,
					tx: {
						blockNumber: liquidationTxs[0].block_number,
						transactionHash: liquidationTxs[0].transaction_hash,
						liquidator: liquidationTxs[0].liquidator ?? "",
						protocols: liquidationTxs[0].protocols,
						profitInUsd: Decimal(liquidationTxs[0].profit_amount_in_usd),
						costInUsd: Decimal(liquidationTxs[0].cost_in_usd),
						revenueInUsd: Decimal(liquidationTxs[0].revenue_in_usd),
						repaymentEvents: liquidationEvents,
						traces: traces,
						assetMetadata: allAssetMetadataMap,
						...commonData,
					},
				};
			}
			case MevType.Arbitrage: {
				const arbTx: {
					transaction_hash: string;
					block_number: number;
					arbitrager: string;
					protocols: string[];
					// biome-ignore lint/suspicious/noExplicitAny: should be Token Metadata type, profit_raw is JSON
					profit_raw: any;
					cost_in_usd: number;
					profit_amount_in_usd: number;
					flash_loan_asset: string | null;
					flash_loan_amount: Decimal | null;
					flash_loan_in_usd: number | null;
					transfer_asset_id: string;
					transfer_sender: string;
					transfer_receiver: string;
					transfer_amount: Decimal;
					event_log_index: number;
				}[] = await this.prisma.$queryRaw`
					SELECT 
						a.transaction_hash,
						a.block_number,
						a.arbitrager,
						a.protocols,
						a.profit_raw,
						a.cost_in_usd,
						a.profit_amount_in_usd,
						a.flash_loan_asset,
						a.flash_loan_amount,
						a.flash_loan_in_usd,
						t.asset_id AS transfer_asset_id,
						t.from AS transfer_sender,
						t.to AS transfer_receiver,
						t.amount AS transfer_amount,
						t.event_log_index 
					FROM 
						mev_inspect.arbitrage a
					JOIN 
						mev_inspect.transfer t ON a.transaction_hash = t.transaction_hash
					WHERE 
						a.transaction_hash = ${hash}
					ORDER BY 
						t.event_log_index
				`;
				if (arbTx.length === 0) {
					return null;
				}
				let flashLoan = undefined;
				const tx = arbTx[0];
				if (tx.flash_loan_asset && tx.flash_loan_amount) {
					flashLoan = {
						flashLoanAsset: tx.flash_loan_asset,
						flashLoanAmount: decimalToBigInt(tx.flash_loan_amount),
						flashLoanInUsd: Number(tx.flash_loan_in_usd ?? 0),
					};
				}
				const arbRes: Omit<Arbitrage, "traces" | "cost"> = {
					blockNumber: tx.block_number,
					transactionHash: tx.transaction_hash,
					arbitrager: tx.arbitrager,
					profit: tx.profit_raw,
					profitInUsd: tx.profit_amount_in_usd,
					costInUsd: tx.cost_in_usd,
					protocols: tx.protocols,
					flashLoan: flashLoan,
				};
				const allAssetAddress: string[] = [];
				const traces = arbTx.map((t) => {
					allAssetAddress.push(t.transfer_asset_id);
					return {
						eventLogIndex: t.event_log_index,
						from: t.transfer_sender,
						to: t.transfer_receiver,
						asset: t.transfer_asset_id,
						value: decimalToBigInt(t.transfer_amount),
					};
				});
				const allAssetMetadataMap: Record<
					string,
					Omit<TokenMetadata, "price">
				> = await this.getAssetMetadataByAddresses(allAssetAddress);
				return {
					type: PrismaTxType.Arbitrage,
					tx: {
						...arbRes,
						traces: traces,
						...commonData,
						assetMetadata: allAssetMetadataMap,
					},
				};
			}
			case MevType.Sandwich: {
				const sandwichTxs: sandwich[] = await this.prisma.$queryRaw`
					SELECT 
						block_number,
						sandwich_id,
						transaction_hash,
						transaction_log_index,
						type,
						sandwicher,
						profit_raw,
						profit_amount_in_usd,
						cost_in_usd,
						protocols
					FROM 
						mev_inspect.sandwich
					WHERE sandwich_id=(
						SELECT sandwich_id 
						FROM mev_inspect.sandwich
						WHERE transaction_hash=${hash}
					)`;
				if (sandwichTxs.length === 0) {
					return null;
				}
				const { block_number, profit_amount_in_usd, cost_in_usd, sandwich_id, sandwicher, protocols } = sandwichTxs[0];
				const traces: transfer[] = await this.prisma.$queryRaw`
					SELECT * FROM mev_inspect.transfer 
					WHERE transaction_hash IN (
						SELECT transaction_hash 
						FROM mev_inspect.sandwich 
						WHERE sandwich_id=${sandwich_id}
					)`;
				const tracesGroupedByTxHash: Record<string, transfer[]> = {};
				for (const t of traces) {
					if (!tracesGroupedByTxHash[t.transaction_hash]) {
						tracesGroupedByTxHash[t.transaction_hash] = [];
					}
					tracesGroupedByTxHash[t.transaction_hash].push(t);
				}
				const frontTxs: BaseTxWithTraces[] = [];
				const backTxs: BaseTxWithTraces[] = [];
				const victimTxs: BaseTxWithTraces[] = [];
				const allAssetAddress: string[] = [];

				for (const sandwich of sandwichTxs) {
					const sandwichType = sandwich.type;
					switch (sandwichType) {
						case "front": {
							frontTxs.push({
								txHash: sandwich.transaction_hash,
								transactionLogIndex: sandwich.transaction_log_index,
								traces: tracesGroupedByTxHash[sandwich.transaction_hash].map((t) => {
									allAssetAddress.push(t.asset_id);
									return {
										eventLogIndex: t.event_log_index,
										from: t.from,
										to: t.to ?? "",
										asset: t.asset_id,
										value: decimalToBigInt(t.amount ?? Decimal(0)),
									};
								}),
							});
							break;
						}
						case "back": {
							backTxs.push({
								txHash: sandwich.transaction_hash,
								transactionLogIndex: sandwich.transaction_log_index,
								traces: tracesGroupedByTxHash[sandwich.transaction_hash].map((t) => {
									allAssetAddress.push(t.asset_id);
									return {
										eventLogIndex: t.event_log_index,
										from: t.from,
										to: t.to ?? "",
										asset: t.asset_id,
										value: decimalToBigInt(t.amount ?? Decimal(0)),
									};
								}),
							});
							break;
						}
						case "victim": {
							victimTxs.push({
								txHash: sandwich.transaction_hash,
								transactionLogIndex: sandwich.transaction_log_index,
								traces: tracesGroupedByTxHash[sandwich.transaction_hash].map((t) => {
									allAssetAddress.push(t.asset_id);
									return {
										eventLogIndex: t.event_log_index,
										from: t.from,
										to: t.to ?? "",
										asset: t.asset_id,
										value: decimalToBigInt(t.amount ?? Decimal(0)),
									};
								}),
							});
							break;
						}
					}
				}
				const allAssetMetadataMap: Record<
					string,
					Omit<TokenMetadata, "price">
				> = await this.getAssetMetadataByAddresses(allAssetAddress);

				return {
					type: PrismaTxType.Sandwich,
					tx: {
						blockNumber: block_number,
						sandwicher: sandwicher,
						protocols: protocols,
						profitInUsd: Number(profit_amount_in_usd),
						costInUsd: Number(cost_in_usd),
						sandwichId: sandwich_id,
						frontSwap: frontTxs,
						backSwap: backTxs,
						victimSwap: victimTxs,
						...commonData,
						assetMetadata: allAssetMetadataMap,
					},
				};
			}
		}
	}

	async getAssetMetadataByAddresses(addresses: string[]): Promise<Record<string, Omit<TokenMetadata, "price">>> {
		const assetMetadata = await this.prisma.token.findMany({
			where: {
				address: { in: addresses },
			},
		});
		const assetMetadataMap: Record<string, Omit<TokenMetadata, "price">> = {};
		for (const token of assetMetadata) {
			assetMetadataMap[token.address] = {
				address: token.address,
				symbol: token.symbol ?? "",
				decimals: token.decimals,
				logo: token.logo ?? "",
			};
		}
		return assetMetadataMap;
	}

	async getTransactionsByBlockNumber(blockNumber: number): Promise<{
		block: Block;
		transactions: Transaction[];
	} | null> {
		const [txs, block] = await Promise.all([
			this.prisma.transaction.findMany({
				where: { block_number: blockNumber },
			}),
			this.prisma.block.findUnique({
				where: { number: blockNumber },
			}),
		]);
		if (!block || txs.length === 0) {
			return null;
		}
		const transactions = txs.map((transaction) => ({
			blockNumber: transaction.block_number,
			hash: transaction.hash,
			from: transaction.from,
			to: transaction.to ?? "",
			index: transaction.index,
			gasPrice: decimalToBigInt(transaction.gas_price),
			gasUsed: decimalToBigInt(transaction.gas_used),
			label: (transaction.label as MevType) ?? null,
			timestamp: transaction.timestamp,
		}));
		return {
			block: {
				hash: block.hash,
				number: block.number,
				timestamp: block.timestamp,
			},
			transactions,
		};
	}

	async getPoolsCache(): Promise<Record<string, Pool>> {
		const ret = await this.prisma.pool.findMany();
		const poolMap: Record<string, Pool> = {};
		ret.map((p) => {
			const pool = {
				address: p.address,
				protocol: p.protocol as unknown as Protocol,
				factory: {
					label: p.protocol,
					address: p.factory_address,
				},
				assets: p.assets,
			};
			// cache
			poolMap[p.address] = pool;
			return pool;
		});
		return poolMap;
	}

	async getTokenMetadataCache(priceToBlock?: number): Promise<Record<string, TokenMetadata>> {
		const tokenMetadata = await this.prisma.token.findMany();
		const tokenMetadataMap: Record<string, TokenMetadata> = {};
		for (const token of tokenMetadata) {
			tokenMetadataMap[token.address] = {
				address: token.address,
				symbol: token.symbol ?? "",
				decimals: token.decimals,
			};
		}

		const tokenPrice = await this.prisma.erc20_historical_price.findMany({
			where: {
				to_block: priceToBlock,
			},
		});
		for (const price of tokenPrice) {
			const token = tokenMetadataMap[price.token_address];
			if (token) {
				tokenMetadataMap[price.token_address] = {
					...token,
					price: {
						rate: Number(price.price),
						currency: "usd",
						toBlock: price.to_block,
					},
				};
			}
		}
		return tokenMetadataMap;
	}

	async getLatestBlock(): Promise<Block | null> {
		const block = await this.prisma.block.findFirst({
			orderBy: { number: "desc" },
		});
		if (!block) {
			return null;
		}
		return {
			hash: block.hash,
			number: block.number,
			timestamp: block.timestamp,
		};
	}
}

export class RepositoryWriteInTransaction extends Repository {
	async writeBlock(block: Block): Promise<void> {
		await this.prisma.block.upsert({
			where: { number: block.number },
			create: {
				hash: block.hash,
				number: block.number,
				timestamp: block.timestamp,
			},
			update: {},
		});
	}

	async writeTransactions(transactions: Transaction[]): Promise<void> {
		if (transactions.length === 0) {
			return;
		}
		const prismaTransactions = transactions.map((transaction) => ({
			block_number: transaction.blockNumber,
			from: transaction.from,
			hash: transaction.hash,
			index: transaction.index,
			gas_used: bigintToDecimal(transaction.gasUsed),
			gas_price: bigintToDecimal(transaction.gasPrice),
			to: transaction.to,
			label: null,
			timestamp: transaction.timestamp,
		}));
		await this.prisma.transaction.createMany({
			data: prismaTransactions,
			skipDuplicates: true,
		});
	}

	async writePools(pools: Pool[]): Promise<void> {
		if (pools.length === 0) {
			return;
		}
		const prismaPools = pools.map((pool) => ({
			address: pool.address,
			protocol: pool.factory.label,
			assets: pool.assets,
			factory_address: pool.factory.address,
		}));
		await this.prisma.pool.createMany({
			data: prismaPools,
			skipDuplicates: true,
		});
	}

	async writeTransfers(transfers: Transfer[]): Promise<void> {
		const prismaSwaps = transfers.map((t) => ({
			block_number: t.blockNumber,
			transaction_hash: t.transaction.hash,
			event_log_index: t.event.logIndex,
			from: t.from,
			to: t.to,
			asset_id: t.asset,
			amount: bigintToDecimal(t.value),
		}));
		await this.prisma.transfer.createMany({
			data: prismaSwaps,
			skipDuplicates: true,
		});
	}

	async writeArbitrage(arbitrages: PrismaArbitrage[]): Promise<void> {
		const prismaArb = [];
		const arbitrageHashes: string[] = [];
		if (arbitrages.length === 0) {
			return;
		}

		for (const a of arbitrages) {
			const flashLoan = a.flashLoan;
			if (flashLoan) {
				prismaArb.push({
					block_number: a.blockNumber,
					transaction_hash: a.transactionHash,
					arbitrager: a.arbitrager,
					protocols: a.protocols,
					flash_loan_asset: flashLoan.flashLoanAsset,
					flash_loan_amount: flashLoan.flashLoanAmount,
					flash_loan_in_usd: flashLoan.flashLoanInUsd,
					profit_raw: JSONBig.parse(a.profit),
					profit_amount_in_usd: a.profitInUsd,
					cost_in_usd: Decimal(a.costInUsd),
				});
			} else {
				prismaArb.push({
					block_number: a.blockNumber,
					transaction_hash: a.transactionHash,
					arbitrager: a.arbitrager,
					protocols: a.protocols,
					profit_raw: JSONBig.parse(a.profit),
					profit_amount_in_usd: a.profitInUsd,
					cost_in_usd: a.costInUsd,
				});
			}
			arbitrageHashes.push(a.transactionHash);
		}
		try {
			await this.prisma.arbitrage.createMany({
				data: prismaArb,
				skipDuplicates: true,
			});
			await this.prisma.transaction.updateMany({
				where: { hash: { in: arbitrageHashes } },
				data: { label: MevType.Arbitrage },
			});
		} catch (err) {
			throw new Error(`Cannot parse arbitrage, tx: ${arbitrages[0].transactionHash}, error: ${err}`);
		}
	}

	async writeTokenMetadata(tokenMetadata: TokenMetadata[]): Promise<void> {
		const prismaTokens = [];
		const prismaPrice = [];
		if (tokenMetadata.length === 0) {
			return;
		}
		for (const metadata of tokenMetadata) {
			prismaTokens.push({
				address: metadata.address,
				symbol: metadata.symbol,
				decimals: metadata.decimals,
				logo: metadata.logo,
			});
			if (metadata.price) {
				prismaPrice.push({
					token_address: metadata.address,
					currency: metadata.price?.currency,
					price: Decimal(metadata.price?.rate),
					to_block: Number(metadata.price?.toBlock),
					timestamp: metadata.price.timestamp,
				});
			}
		}

		await this.prisma.token.createMany({
			data: prismaTokens,
			skipDuplicates: true,
		});
		if (prismaPrice.length > 0) {
			await this.prisma.erc20_historical_price.createMany({
				data: prismaPrice,
				skipDuplicates: true,
			});
		}
	}

	async writeSandwich(sandwiches: PrismaSandwich[]): Promise<void> {
		if (sandwiches.length === 0) {
			return;
		}
		const prismaSandwiches = [];
		const prismaSwaps = [];
		const sandwichHashes: string[] = [];
		for (const sandwich of sandwiches) {
			for (const s of sandwiches) {
				const swaps = [...s.frontSwap, ...s.victimSwap, ...s.backSwap];
				const hashes = swaps.map((swap) => {
					sandwichHashes.push(swap.hash);
					return swap.hash;
				});
				const sandwichId = sha3(hashes.join(""));
				for (const swap of swaps) {
					prismaSandwiches.push({
						block_number: sandwich.blockNumber,
						transaction_hash: swap.hash,
						type: swap.type,
						sandwicher: sandwich.sandwicher,
						victim: swap.type === "victim" ? swap.from : null,
						sandwich_id: sandwichId,
						protocols: sandwich.protocols,
						profit_raw: JSONBig.parse(sandwich.profit),
						profit_amount_in_usd: sandwich.profitInUsd,
						cost_in_usd: sandwich.costInUsd,
						transaction_log_index: swap.transactionLogIndex,
					});
					prismaSwaps.push({
						event_log_index: swap.eventLogIndex,
						block_number: swap.blockNumber,
						transaction_hash: swap.hash,
						asset_in: swap.assetIn,
						asset_out: swap.assetOut,
						from: swap.from,
						to: swap.to,
						amount_in: bigintToDecimal(swap.amountIn),
						amount_out: bigintToDecimal(swap.amountOut),
						protocol: swap.protocol,
						metadata: swap.metadata ? JSONBig.parse(JSONBig.stringify(swap.metadata)) : null,
					});
				}
			}
		}
		await Promise.all([
			this.prisma.sandwich.createMany({
				data: prismaSandwiches,
				skipDuplicates: true,
			}),
			this.prisma.transaction.updateMany({
				where: { hash: { in: sandwichHashes } },
				data: { label: MevType.Sandwich },
			}),
			this.prisma.swap.createMany({
				data: prismaSwaps,
				skipDuplicates: true,
			}),
		]);
	}

	async writeLiquidation(liquidations: PrismaLiquidation[]): Promise<void> {
		if (liquidations.length === 0) {
			return;
		}
		const prismaLiquidations = [];
		const repaymentEvents = [];
		const liquidationHashes: string[] = [];
		for (const liquidation of liquidations) {
			liquidationHashes.push(liquidation.transactionHash);
			prismaLiquidations.push({
				block_number: liquidation.blockNumber,
				transaction_hash: liquidation.transactionHash,
				liquidator: liquidation.liquidator,
				protocols: liquidation.protocols,
				profit_amount_in_usd: liquidation.profitInUsd,
				cost_in_usd: liquidation.costInUsd,
				revenue_in_usd: liquidation.revenueInUsd,
			});
			for (const repayment of liquidation.repaymentEvents) {
				repaymentEvents.push({
					transaction_hash: liquidation.transactionHash,
					block_number: liquidation.blockNumber,
					payer: repayment.payer,
					borrower: repayment.borrower,
					asset_in_debt: repayment.assetInDebt,
					debt_to_cover: repayment.debtAmount,
					liquidated_amount: repayment.liquidatedAmount,
					asset_liquidated: repayment.liquidatedAsset,
					repayment_amount_in_usd: repayment.repaymentAmountInUsd,
					liquidated_amount_in_usd: repayment.liquidatedAmountInUsd,
					seizure_event_log_index: repayment.seizureEventLogIndex,
					repayment_event_log_index: repayment.repaymentEventLogIndex,
				});
			}
		}

		Promise.all([
			this.prisma.liquidation.createMany({
				data: prismaLiquidations,
				skipDuplicates: true,
			}),
			this.prisma.repayment_event.createMany({
				data: repaymentEvents,
				skipDuplicates: true,
			}),
			this.prisma.transaction.updateMany({
				where: { hash: { in: liquidationHashes } },
				data: { label: MevType.Liquidation },
			}),
		]);
	}

	async deleteCascade(rollBackBlockNumber: number): Promise<void> {
		const deleteQueryFilter = {
			block_number: {
				gte: rollBackBlockNumber,
			},
		};
		await Promise.all([
			this.prisma.block.deleteMany({
				where: {
					number: {
						gte: rollBackBlockNumber,
					},
				},
			}),
			this.prisma.arbitrage.deleteMany({
				where: deleteQueryFilter,
			}),
			this.prisma.erc20_historical_price.deleteMany({
				where: {
					to_block: {
						gte: rollBackBlockNumber,
					},
				},
			}),
			this.prisma.liquidation.deleteMany({
				where: deleteQueryFilter,
			}),
			this.prisma.repayment_event.deleteMany({
				where: deleteQueryFilter,
			}),
			this.prisma.sandwich.deleteMany({
				where: deleteQueryFilter,
			}),
			this.prisma.swap.deleteMany({
				where: deleteQueryFilter,
			}),
			this.prisma.transaction.deleteMany({
				where: deleteQueryFilter,
			}),
			this.prisma.transfer.deleteMany({
				where: deleteQueryFilter,
			}),
		]);
	}
}

export class RepositoryWrite extends RepositoryWriteInTransaction {
	private readonly fullPrisma: PrismaClient;

	constructor(prisma: PrismaClient) {
		super(prisma);
		this.fullPrisma = prisma;
	}

	async transaction(
		fn: (repo: RepositoryWriteInTransaction) => Promise<void>,
		options?: { timeout?: number; maxWait?: number },
	): Promise<void> {
		const { timeout, maxWait } = options ?? {};
		return this.fullPrisma.$transaction((txPrisma: PrismaClientTx) => fn(new RepositoryWriteInTransaction(txPrisma)), {
			timeout: timeout ?? DEFAULT_TIMEOUT,
			maxWait: maxWait ?? DEFAULT_MAX_WAIT,
		});
	}
}

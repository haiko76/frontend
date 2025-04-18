import type { Call } from "ethcall";
import type { LogEvent } from "../../utils/coder";

import poolAbi from "../../abi/curveV2";
import { type ChainId, type LiquidityWithdrawal, type Pool, type PoolData, Protocol, SwapProtocol } from "../../types";
import { getProtocolContractAddress } from "../dex-classifiers/classifiers";
import { type ClassifiedEvent, ClassifierType, type Classifiers } from "../swap-classifiers-types";
import type { LiquidityDeposit, Swap } from "../types";

interface CurvePool {
	address: string;
	assets: string[];
	underlyingAssets?: string[];
	metapoolAssets?: string[];
	chainId: ChainId;
}

function isValidSwap(event: LogEvent, address: string, chain: ChainId): boolean {
	return isValidPool(address, chain) && (event.name === "TokenExchange" || event.name === "TokenExchangeUnderlying");
}

function isValidDeposit(event: LogEvent, address: string, chain: ChainId): boolean {
	return isValidPool(address, chain) && event.name === "AddLiquidity";
}

function isValidWithdrawal(event: LogEvent, address: string, chain: ChainId): boolean {
	return (
		isValidPool(address, chain) &&
		(event.name === "RemoveLiquidity" ||
			event.name === "RemoveLiquidityImbalance" ||
			event.name === "RemoveLiquidityOne")
	);
}

function getPoolCalls(): Call[] {
	return [];
}

function processPoolCalls(_results: unknown[], address: string): PoolData | null {
	const pool = pools.find((pool) => pool.address === address.toLowerCase());
	if (!pool) {
		return null;
	}
	const factory = getProtocolContractAddress(pool.chainId, SwapProtocol.CurveV2, "factory");
	if (!factory) {
		return null;
	}
	return {
		factoryAddress: factory.address,
		assets: pool.assets,
	};
}

function parseSwap(pool: Pool, event: ClassifiedEvent): Swap | null {
	const {
		values,
		transactionHash: hash,
		transactionIndex,
		logIndex,
		address,
		blockNumber,
		transactionFrom,
		transactionTo,
		gasPrice,
		gasUsed,
	} = event;

	const buyer = (values.buyer as string).toLowerCase();
	const sold_id = values.sold_id as number;
	const tokens_sold = values.tokens_sold as bigint;
	const bought_id = values.bought_id as number;
	const tokens_bought = values.tokens_bought as bigint;

	const curvePool = pools.find((curvePool) => curvePool.address === pool.address);
	if (!curvePool) {
		return null;
	}

	const assets =
		event.name === "TokenExchange"
			? pool.assets
			: curvePool.metapoolAssets || curvePool.underlyingAssets || curvePool.assets;

	const from = buyer;
	const to = buyer;
	const assetOut = assets[bought_id];
	const amountOut = tokens_bought;
	const assetIn = assets[sold_id];
	const amountIn = tokens_sold;

	return {
		contract: {
			address,
			protocol: {
				abi: Protocol.CurveV2,
				factory: pool.factory.address,
			},
		},
		blockNumber: blockNumber,
		transaction: {
			hash: hash,
			index: transactionIndex,
			from: transactionFrom,
			to: transactionTo,
			gasPrice: gasPrice,
			gasUsed: gasUsed,
		},
		event: {
			address: address.toLowerCase(),
			logIndex,
		},
		from,
		to,
		assetIn: assetIn,
		amountIn,
		assetOut: assetOut,
		amountOut,
	};
}

function parseDeposit(pool: Pool, event: ClassifiedEvent): LiquidityDeposit | null {
	const {
		values,
		transactionHash: hash,
		transactionIndex,
		logIndex,
		address,
		blockNumber,
		transactionFrom,
		transactionTo,
		gasPrice,
		gasUsed,
	} = event;
	const { assets } = pool;

	const depositor = (values.provider as string).toLowerCase();
	const amounts = values.token_amounts as bigint[];

	return {
		contract: {
			address,
			protocol: {
				abi: Protocol.CurveV2,
				factory: pool.factory.address,
			},
		},
		blockNumber: blockNumber,
		transaction: {
			hash: hash,
			index: transactionIndex,
			from: transactionFrom,
			to: transactionTo,
			gasPrice: gasPrice,
			gasUsed: gasUsed,
		},
		event: {
			address: address.toLowerCase(),
			logIndex,
		},
		depositor,
		assets: assets,
		amounts,
	};
}

function parseWithdrawal(pool: Pool, event: ClassifiedEvent): LiquidityWithdrawal | null {
	const {
		values,
		transactionHash: hash,
		transactionIndex,
		logIndex,
		address,
		blockNumber,
		transactionFrom,
		transactionTo,
		gasPrice,
		gasUsed,
	} = event;
	const withdrawer = (values.provider as string).toLowerCase();
	const assets: string[] =
		event.name === "RemoveLiquidityOne" ? [pool.assets[Number((values.coin_index as bigint).toString())]] : pool.assets;
	const amounts: bigint[] =
		event.name === "RemoveLiquidityOne" ? [values.coin_amount as bigint] : (values.token_amounts as bigint[]);

	return {
		contract: {
			address,
			protocol: {
				abi: Protocol.CurveV2,
				factory: pool.factory.address,
			},
		},
		blockNumber: blockNumber,
		transaction: {
			hash: hash,
			index: transactionIndex,
			from: transactionFrom,
			to: transactionTo,
			gasPrice: gasPrice,
			gasUsed: gasUsed,
		},
		event: {
			address: address.toLowerCase(),
			logIndex,
		},
		withdrawer,
		assets: assets,
		amounts,
	};
}

function isValidPool(address: string, chain: ChainId): boolean {
	return pools.some((pool) => pool.chainId === chain && pool.address === address.toLowerCase());
}

const pools: CurvePool[] = [
	// Ethereum
	{
		chainId: 1,
		address: "0x80466c64868e1ab14a1ddf27a676c3fcbe638fe5",
		assets: [
			"0xdac17f958d2ee523a2206206994597c13d831ec7",
			"0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
			"0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
		],
	},
	{
		chainId: 1,
		address: "0xd51a44d3fae010294c616388b506acda1bfaae46",
		assets: [
			"0xdac17f958d2ee523a2206206994597c13d831ec7",
			"0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
			"0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
		],
	},
	{
		chainId: 1,
		address: "0x9838eccc42659fa8aa7daf2ad134b53984c9427b",
		assets: ["0xc581b735a1688071a1746c968e0798d642ede491", "0x6c3f90f043a72fa612cbac8115ee7e52bde6e490"],
	},
	{
		chainId: 1,
		address: "0x98a7f18d4e56cfe84e3d081b40001b3d5bd3eb8b",
		assets: ["0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", "0xdb25f211ab05b1c97d595516f45794528a807ad8"],
	},
	{
		chainId: 1,
		address: "0x8301ae4fc9c624d1d396cbdaa1ed877821d7c511",
		assets: ["0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", "0xd533a949740bb3306d119cc777fa900ba034cd52"],
	},
	{
		chainId: 1,
		address: "0xb576491f1e6e5e62f1d8f26062ee822b40b0e0d4",
		assets: ["0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", "0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b"],
	},
	{
		chainId: 1,
		address: "0xadcfcf9894335dc340f6cd182afa45999f45fc44",
		assets: ["0x68749665ff8d2d112fa859aa293f07a622782f38", "0x6c3f90f043a72fa612cbac8115ee7e52bde6e490"],
	},
	{
		chainId: 1,
		address: "0x98638facf9a3865cd033f36548713183f6996122",
		assets: ["0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", "0x090185f2135308bad17527004364ebcc2d37e5f6"],
	},
	{
		chainId: 1,
		address: "0x752ebeb79963cf0732e9c0fec72a49fd1defaeac",
		assets: ["0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", "0xcdf7028ceab81fa0c6971208e83fa7872994bee5"],
	},
];

export const CurveV2Classifier: Classifiers = {
	swap: {
		type: ClassifierType.SWAP,
		protocol: Protocol.CurveV2,
		abi: poolAbi,
		isValid: isValidSwap,
		parse: parseSwap,
		pool: {
			getCalls: getPoolCalls,
			processCalls: processPoolCalls,
		},
	},
	liquidityDeposit: {
		type: ClassifierType.LIQUIDITY_DEPOSIT,
		protocol: Protocol.CurveV2,
		abi: poolAbi,
		isValid: isValidDeposit,
		parse: parseDeposit,
		pool: {
			getCalls: getPoolCalls,
			processCalls: processPoolCalls,
		},
	},
	liquidityWithdrawal: {
		type: ClassifierType.LIQUIDITY_WITHDRAWAL,
		protocol: Protocol.CurveV2,
		abi: poolAbi,
		isValid: isValidWithdrawal,
		parse: parseWithdrawal,
		pool: {
			getCalls: getPoolCalls,
			processCalls: processPoolCalls,
		},
	},
};

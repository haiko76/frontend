import type { Call } from "ethcall";
import { Contract } from "ethcall";
import type { LogEvent } from "../../utils/coder";

import factoryAbi from "../../abi/balancerV1Factory";
import poolAbi from "../../abi/balancerV1Pool";
import { type LiquidityWithdrawal, type Pool, type PoolData, Protocol, SwapProtocol } from "../../types";
import { getProtocolContractAddress } from "../dex-classifiers/classifiers";
import { type ClassifiedEvent, ClassifierType, type Classifiers } from "../swap-classifiers-types";
import type { LiquidityDeposit, Swap } from "../types";

function isValidSwap(event: LogEvent): boolean {
	return event.name === "LOG_SWAP";
}

function isValidDeposit(event: LogEvent): boolean {
	return event.name === "LOG_JOIN";
}

function isValidWithdrawal(event: LogEvent): boolean {
	return event.name === "LOG_EXIT";
}

function getPoolCalls(address: string): Call[] {
	const factoryAddress = getProtocolContractAddress(1, SwapProtocol.BalancerV1, "factory")?.address;
	if (!factoryAddress) {
		throw new Error(`Cannot find BalancerV1 factory address.`);
	}
	const factoryContract = new Contract(factoryAddress, factoryAbi);
	const isPoolCall = factoryContract.isBPool(address);
	const poolContract = new Contract(address, poolAbi);
	const assetsCall = poolContract.getCurrentTokens();
	return [isPoolCall, assetsCall];
}

function processPoolCalls(result: unknown[]): PoolData | null {
	const [isPool, tokensRes] = result;
	if (!isPool || !tokensRes) {
		return null;
	}
	const factoryAddress = getProtocolContractAddress(1, SwapProtocol.BalancerV1, "factory")?.address;
	if (!factoryAddress) {
		throw new Error(`Cannot find BalancerV1 factory address.`);
	}
	const tokens = tokensRes as string[];
	if (!Array.isArray(tokens) || tokens.length === 0) {
		return null;
	}
	const assets = (tokens as string[]).map((token) => token.toLowerCase());
	return {
		factoryAddress: factoryAddress,
		assets,
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

	const sender = (values.caller as string).toLowerCase();
	const assetIn = (values.tokenIn as string).toLowerCase();
	const assetOut = (values.tokenOut as string).toLowerCase();
	const amountIn = values.tokenAmountIn as bigint;
	const amountOut = values.tokenAmountOut as bigint;

	return {
		contract: {
			address: pool.address,
			protocol: {
				abi: Protocol.BalancerV1,
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
			logIndex,
			address: address.toLowerCase(),
		},
		from: sender,
		to: sender,
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
	const depositor = (values.caller as string).toLowerCase();
	const asset = (values.tokenIn as string).toLowerCase();
	const amount = values.tokenAmountIn as bigint;

	return {
		contract: {
			address: pool.address,
			protocol: {
				abi: Protocol.BalancerV1,
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
		assets: [asset],
		amounts: [amount],
		metadata: {},
	};
}

function parseWithdrawal(pool: Pool, event: ClassifiedEvent): LiquidityWithdrawal | null {
	const {
		values,
		transactionHash: hash,
		transactionIndex,
		transactionTo,
		logIndex,
		address,
		transactionFrom,
		blockNumber,
		gasPrice,
		gasUsed,
	} = event;
	const withdrawer = (values.caller as string).toLowerCase();
	const asset = (values.tokenOut as string).toLowerCase();
	const amount = values.tokenAmountOut as bigint;

	return {
		contract: {
			address: pool.address,
			protocol: {
				abi: Protocol.BalancerV1,
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
		assets: [asset],
		amounts: [amount],
	};
}

export const BalancerV1Classifier: Classifiers = {
	swap: {
		type: ClassifierType.SWAP,
		protocol: Protocol.BalancerV1,
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
		protocol: Protocol.BalancerV1,
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
		protocol: Protocol.BalancerV1,
		abi: poolAbi,
		isValid: isValidWithdrawal,
		parse: parseWithdrawal,
		pool: {
			getCalls: getPoolCalls,
			processCalls: processPoolCalls,
		},
	},
};

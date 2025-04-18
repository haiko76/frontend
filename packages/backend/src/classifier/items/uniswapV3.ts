import type { Call } from "ethcall";
import { Contract } from "ethcall";
import type { LogEvent } from "../../utils/coder";

import poolAbi from "../../abi/uniswapV3Pool";
import { type LiquidityWithdrawal, type Pool, type PoolData, Protocol, type Transfer } from "../../types";
import { type ClassifiedEvent, ClassifierType, type Classifiers } from "../swap-classifiers-types";
import type { LiquidityDeposit, Swap } from "../types";

function isSwapValid(event: LogEvent): boolean {
	return event.name === "Swap";
}

function isLiquidityDepositValid(event: LogEvent): boolean {
	return event.name === "Mint";
}

function isLiquidityWithdrawalValid(event: LogEvent): boolean {
	return event.name === "Collect";
}

function getPoolCalls(address: string): Call[] {
	const poolContract = new Contract(address, poolAbi);
	const factoryCall = poolContract.factory();
	const asset0Call = poolContract.token0();
	const asset1Call = poolContract.token1();
	return [factoryCall, asset0Call, asset1Call];
}

function processPoolCalls(result: unknown[]): PoolData | null {
	const factory = result[0] as string | null;
	const asset0 = result[1] as string | null;
	const asset1 = result[2] as string | null;
	if (!factory || !asset0 || !asset1) {
		return null;
	}
	if (!(typeof factory === "string") || !(typeof asset0 === "string") || !(typeof asset1 === "string")) {
		return null;
	}
	const assets = [asset0.toLowerCase(), asset1.toLowerCase()];
	return {
		factoryAddress: factory.toLowerCase(),
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
	const { assets } = pool;

	const from = (values.sender as string).toLowerCase();
	const to = (values.recipient as string).toLowerCase();
	const amount0 = values.amount0 as bigint;
	const amount1 = values.amount1 as bigint;
	const liquidity = values.liquidity as bigint;
	const squareRootPriceX96 = values.sqrtPriceX96 as bigint;
	const tick = values.tick as number;

	const assetOut = amount0 < 0 ? assets[0] : assets[1];
	const amountOut = amount0 < 0 ? amount0 * -1n : amount1 * -1n;

	const assetIn = amount0 > 0 ? assets[0] : assets[1];
	const amountIn = amount0 > 0 ? amount0 : amount1;

	return {
		contract: {
			address: pool.address,
			protocol: {
				abi: Protocol.UniswapV2,
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
		metadata: {
			tick,
			liquidity,
			squareRootPriceX96,
		},
	};
}

function parseLiquidityDeposit(pool: Pool, event: ClassifiedEvent, transfers: Transfer[]): LiquidityDeposit | null {
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

	const amount0 = values.amount0 as bigint;
	const amount1 = values.amount1 as bigint;
	const tickLower = values.tickLower;
	const tickUpper = values.tickUpper;

	const amounts = [amount0, amount1];

	const depositor = getDepositor(assets, amounts, logIndex, address, transfers);

	if (!depositor) {
		return null;
	}

	return {
		contract: {
			address: pool.address,
			protocol: {
				abi: Protocol.UniswapV3,
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
		metadata: {
			tickLower,
			tickUpper,
		},
	};
}

function parseLiquidityWithdrawal(
	pool: Pool,
	event: ClassifiedEvent,
	transfers: Transfer[],
): LiquidityWithdrawal | null {
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

	const amount0 = values.amount0 as bigint;
	const amount1 = values.amount1 as bigint;
	const tickLower = values.tickLower as number;
	const tickUpper = values.tickUpper as number;

	const amounts = [amount0, amount1];

	const withdrawer = getWithdrawer(assets, amounts, logIndex, address, transfers);

	if (!withdrawer) {
		return null;
	}

	return {
		contract: {
			address: pool.address,
			protocol: {
				abi: Protocol.UniswapV3,
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
		metadata: {
			tickLower,
			tickUpper,
		},
	};
}

function getDepositor(
	assets: string[],
	amounts: bigint[],
	logIndex: number,
	address: string,
	transfers: Transfer[],
): string | null {
	const transferA = transfers.find((transfer) => transfer.event.logIndex === logIndex - 2);
	const transferB = transfers.find((transfer) => transfer.event.logIndex === logIndex - 1);
	if (!transferA || !transferB) {
		return null;
	}
	if (transferA.to !== address || transferB.to !== address) {
		return null;
	}
	if (transferA.asset !== assets[0] || transferB.asset !== assets[1]) {
		return null;
	}
	if (transferA.value !== amounts[0] || transferB.value !== amounts[1]) {
		return null;
	}
	if (transferA.from !== transferB.from) {
		return null;
	}
	return transferA.from;
}

function getWithdrawer(
	assets: string[],
	amounts: bigint[],
	logIndex: number,
	address: string,
	transfers: Transfer[],
): string | null {
	const transferA = transfers.find((transfer) => transfer.event.logIndex === logIndex - 2);
	const transferB = transfers.find((transfer) => transfer.event.logIndex === logIndex - 1);
	if (!transferA || !transferB) {
		return null;
	}
	if (transferA.from !== address || transferB.from !== address) {
		return null;
	}
	if (transferA.asset !== assets[0] || transferB.asset !== assets[1]) {
		return null;
	}
	if (transferA.value !== amounts[0] || transferB.value !== amounts[1]) {
		return null;
	}
	if (transferA.to !== transferB.to) {
		return null;
	}
	return transferA.to;
}

export const UniswapV3Classifier: Classifiers = {
	swap: {
		type: ClassifierType.SWAP,
		protocol: Protocol.UniswapV3,
		abi: poolAbi,
		isValid: isSwapValid,
		parse: parseSwap,
		pool: {
			getCalls: getPoolCalls,
			processCalls: processPoolCalls,
		},
	},
	liquidityDeposit: {
		type: ClassifierType.LIQUIDITY_DEPOSIT,
		protocol: Protocol.UniswapV3,
		abi: poolAbi,
		isValid: isLiquidityDepositValid,
		parse: parseLiquidityDeposit,
		pool: {
			getCalls: getPoolCalls,
			processCalls: processPoolCalls,
		},
	},
	liquidityWithdrawal: {
		type: ClassifierType.LIQUIDITY_WITHDRAWAL,
		protocol: Protocol.UniswapV3,
		abi: poolAbi,
		isValid: isLiquidityWithdrawalValid,
		parse: parseLiquidityWithdrawal,
		pool: {
			getCalls: getPoolCalls,
			processCalls: processPoolCalls,
		},
	},
};

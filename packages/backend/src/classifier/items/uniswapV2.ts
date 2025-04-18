import type { Call } from "ethcall";
import { Contract } from "ethcall";
import pairAbi from "../../abi/uniswapV2Pair";
import { type Pool, type PoolData, Protocol, type Swap } from "../../types";
import type { LogEvent } from "../../utils/coder";
import { type ClassifiedEvent, ClassifierType, type Classifiers } from "../swap-classifiers-types";

function isValid(event: LogEvent): boolean {
	return event.name === "Swap";
}

function getPoolCalls(address: string): Call[] {
	const pairContract = new Contract(address, pairAbi);
	const factoryCall = pairContract.factory();
	const asset0Call = pairContract.token0();
	const asset1Call = pairContract.token1();
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

function parse(pool: Pool, event: ClassifiedEvent): Swap | null {
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
	const to = (values.to as string).toLowerCase();
	const amount0In = values.amount0In as bigint;
	const amount1In = values.amount1In as bigint;
	const amount0Out = values.amount0Out as bigint;
	const amount1Out = values.amount1Out as bigint;

	const assetOut = amount0In === 0n ? assets[0] : assets[1];
	const amountOut = amount0In === 0n ? amount0Out : amount1Out;

	const assetIn = amount0In === 0n ? assets[1] : assets[0];
	const amountIn = amount0In === 0n ? amount1In : amount0In;

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
	};
}

export const UniswapV2Classifier: Classifiers = {
	swap: {
		type: ClassifierType.SWAP,
		protocol: Protocol.UniswapV2,
		abi: pairAbi,
		isValid,
		parse,
		pool: {
			getCalls: getPoolCalls,
			processCalls: processPoolCalls,
		},
	},
};

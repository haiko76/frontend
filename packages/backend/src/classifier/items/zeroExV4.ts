import type { Call } from "ethcall";
import type { LogEvent } from "../../utils/coder.js";

import exchangeAbi from "../../abi/zeroExV4.js";
import { type Pool, Protocol } from "../../types.js";
import { type ClassifiedEvent, ClassifierType, type Classifiers } from "../swap-classifiers-types.js";
import type { PoolData, Swap } from "../types.js";

function isValid(event: LogEvent): boolean {
	return event.name === "RfqOrderFilled" || event.name === "LimitOrderFilled";
}

function getPoolCalls(): Call[] {
	return [];
}

function processPoolCalls(_results: unknown[], address: string): PoolData | null {
	return {
		factoryAddress: address.toLowerCase(),
		assets: [],
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

	const makerToken = (values.makerToken as string).toLowerCase();
	const takerToken = (values.takerToken as string).toLowerCase();
	const taker = (values.taker as string).toLowerCase();
	const makerTokenFilledAmount = values.makerTokenFilledAmount as bigint;
	const takerTokenFilledAmount = values.takerTokenFilledAmount as bigint;

	const from = taker;
	const to = taker;

	const assetIn = takerToken;
	const amountIn = takerTokenFilledAmount;
	const assetOut = makerToken;
	const amountOut = makerTokenFilledAmount;

	return {
		contract: {
			address,
			protocol: {
				abi: Protocol.ZeroExV4,
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

export const ZeroExV4Classifier: Classifiers = {
	swap: {
		type: ClassifierType.SWAP,
		protocol: Protocol.ZeroExV4,
		abi: exchangeAbi,
		isValid,
		parse,
		pool: {
			getCalls: getPoolCalls,
			processCalls: processPoolCalls,
		},
	},
};

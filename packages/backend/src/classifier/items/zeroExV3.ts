import type { Call } from "ethcall";
import type { LogEvent } from "../../utils/coder";

import exchangeAbi from "../../abi/zeroExV3";
import { type Pool, type PoolData, Protocol } from "../../types";
import { type ClassifiedEvent, ClassifierType, type Classifiers } from "../swap-classifiers-types";
import type { Swap } from "../types";

function isValid(event: LogEvent): boolean {
	return event.name === "Fill";
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

	const makerAssetData = values.makerAssetData as string;
	const takerAssetData = values.takerAssetData as string;
	const takerAddress = (values.takerAddress as string).toLowerCase();
	const makerAssetFilledAmount = values.makerAssetFilledAmount as bigint;
	const takerAssetFilledAmount = values.takerAssetFilledAmount as bigint;

	const from = takerAddress;
	const to = takerAddress;

	const assetIn = getAsset(takerAssetData);
	const assetOut = getAsset(makerAssetData);
	const amountIn = takerAssetFilledAmount;
	const amountOut = makerAssetFilledAmount;

	if (!assetIn || !assetOut) {
		return null;
	}

	return {
		contract: {
			address,
			protocol: {
				abi: Protocol.ZeroExV3,
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

function getAsset(assetData: string): string | null {
	if (assetData.length === 74 && assetData.startsWith("0xf47261b")) {
		return `0x${assetData.substring(34).toLowerCase()}`;
	} else {
		return null;
	}
}

export const ZeroExV3Classifier: Classifiers = {
	swap: {
		type: ClassifierType.SWAP,
		protocol: Protocol.ZeroExV3,
		abi: exchangeAbi,
		isValid,
		parse,
		pool: {
			getCalls: getPoolCalls,
			processCalls: processPoolCalls,
		},
	},
};

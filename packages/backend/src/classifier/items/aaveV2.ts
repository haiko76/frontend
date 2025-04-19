import type { Call } from "ethcall";
import poolAbi from "../../abi/aaveV2Pool";
import type { LogEvent } from "../../parser";
import { type ChainId, Protocol, type Repayment, type Seizure } from "../../types";
import { getLendingPoolByAddress } from "../dex-classifiers/classifiers";
import { type ClassifiedEvent, ClassifierType, type Classifiers, type Market } from "../types";
import type { MarketData } from "../types";

function isValid(event: LogEvent, address: string, chainId: ChainId): boolean {
	if (!getLendingPoolByAddress(chainId, Protocol.AaveV2, address.toLowerCase())) {
		return false;
	}
	return event.name === "LiquidationCall";
}

function getMarketCalls(): Call[] {
	return [];
}

function processMarketCalls(_chainId: ChainId, address: string): MarketData {
	return {
		poolAddress: address.toLowerCase(),
	};
}

function parseRepayment(market: Market, event: ClassifiedEvent): Repayment {
	const {
		values,
		transactionFrom,
		transactionTo,
		transactionHash: hash,
		transactionIndex,
		gasUsed,
		logIndex,
		address,
		blockNumber,
		gasPrice,
	} = event;

	const borrowedAsset = (values.debtAsset as string).toLowerCase();
	const borrower = (values.user as string).toLowerCase();
	const debtAmount = values.debtToCover as bigint;
	const liquidator = (values.liquidator as string).toLowerCase();
	const payer = transactionFrom.toLowerCase();

	return {
		contract: {
			address: market.address,
			protocol: {
				abi: Protocol.AaveV2,
				pool: market.pool.address,
			},
		},
		event: {
			address: address.toLowerCase(),
			logIndex: logIndex,
		},
		blockNumber: blockNumber,
		transaction: {
			hash: hash,
			index: transactionIndex,
			from: transactionFrom.toLowerCase(),
			to: transactionTo.toLowerCase(),
			gasPrice: gasPrice,
			gasUsed: gasUsed,
		},
		payer,
		borrower,
		liquidator,
		borrowedAsset: borrowedAsset,
		debtAmount: debtAmount,
	};
}

function parseLiquidate(market: Market, event: ClassifiedEvent): Seizure {
	const {
		values,
		transactionFrom,
		transactionTo,
		transactionHash: hash,
		transactionIndex,
		gasUsed,
		logIndex,
		address,
		blockNumber,
		gasPrice,
	} = event;

	const borrower = (values.user as string).toLowerCase();
	const liquidator = (values.liquidator as string).toLowerCase();
	const payer = transactionFrom.toLowerCase();
	const liquidatedAsset = (values.collateralAsset as string).toLowerCase();
	const liquidatedCollateralAmount = values.liquidatedCollateralAmount as bigint;

	return {
		contract: {
			address: market.address,
			protocol: {
				abi: Protocol.AaveV2,
				pool: market.pool.address,
			},
		},
		event: {
			address: address.toLowerCase(),
			logIndex: logIndex,
		},
		blockNumber: blockNumber,
		transaction: {
			hash: hash,
			index: transactionIndex,
			from: transactionFrom.toLowerCase(),
			to: transactionTo.toLowerCase(),
			gasPrice: gasPrice,
			gasUsed: gasUsed,
		},
		payer,
		borrower,
		liquidator,
		liquidatedAsset: liquidatedAsset,
		liquidatedCollateralAmount: liquidatedCollateralAmount,
	};
}

export const AaveV2Classifier: Classifiers = {
	repayment: {
		type: ClassifierType.REPAYMENT,
		protocol: Protocol.AaveV2,
		abi: poolAbi,
		isValid,
		parse: parseRepayment,
		market: {
			getCalls: getMarketCalls,
			processCalls: processMarketCalls,
		},
	},
	liquidate: {
		type: ClassifierType.LIQUIDATE,
		protocol: Protocol.AaveV2,
		abi: poolAbi,
		isValid,
		parse: parseLiquidate,
		market: {
			getCalls: getMarketCalls,
			processCalls: processMarketCalls,
		},
	},
};

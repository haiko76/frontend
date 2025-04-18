import type { Call } from "ethcall";
import { Contract } from "ethcall";

import marketAbi from "../../abi/compoundV2Market.js";
import { type ChainId, type Liquidate, Protocol, type Repayment, nativeAsset } from "../../types.js";
import type { LogEvent } from "../../utils/coder.js";
import type { Market, MarketData } from "../lending-classifier-types.js";
import { type ClassifiedEvent, ClassifierType, type Classifiers } from "../swap-classifiers-types.js";

const CETH_MARKET: Record<string, string> = {
	"0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b": "0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5",
};

function isValidRepayment(event: LogEvent): boolean {
	return event.name === "RepayBorrow";
}

function isValidLiquidate(event: LogEvent): boolean {
	return event.name === "LiquidateBorrow";
}

function getMarketCalls(address: string): Call[] {
	const marketContract = new Contract(address, marketAbi);
	const comptrollerCall = marketContract.comptroller();
	const underlyingCall = marketContract.underlying();
	return [comptrollerCall, underlyingCall];
}

function processMarketCalls(chainId: ChainId, address: string, result: unknown[]): MarketData | null {
	const comptroller = result[0] as string | undefined;
	const underlying = result[1] as string | undefined;
	if (!comptroller || !underlying) {
		return null;
	}
	const cethMarket = CETH_MARKET[comptroller];
	const native = nativeAsset[chainId];
	const asset = address === cethMarket ? native : underlying.toLowerCase();
	return {
		poolAddress: comptroller.toLowerCase(),
		asset,
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

	const liquidator = (values.payer as string).toLowerCase();
	const borrower = (values.borrower as string).toLowerCase();
	const amount = values.repayAmount as bigint;
	const payer = transactionFrom.toLowerCase();
	const asset = market.asset;

	return {
		contract: {
			address: market.address,
			protocol: {
				abi: Protocol.CompoundV2,
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
		borrowedAsset: asset,
		debtAmount: amount,
	};
}

function parseLiquidate(market: Market, event: ClassifiedEvent): Liquidate {
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

	const liquidator = (values.liquidator as string).toLowerCase();
	const borrower = (values.borrower as string).toLowerCase();
	const collateralAsset = (values.cTokenCollateral as string).toLowerCase();
	const liquidatedCollateralAmount = values.seizeTokens as bigint;

	return {
		contract: {
			address: market.address,
			protocol: {
				abi: Protocol.CompoundV2,
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
		payer: liquidator,
		borrower,
		liquidator,
		liquidatedAsset: collateralAsset,
		liquidatedCollateralAmount: liquidatedCollateralAmount,
	};
}

export const CompoundV2Classifier: Classifiers = {
	repayment: {
		type: ClassifierType.REPAYMENT,
		protocol: Protocol.CompoundV2,
		abi: marketAbi,
		isValid: isValidRepayment,
		parse: parseRepayment,
		market: {
			getCalls: getMarketCalls,
			processCalls: processMarketCalls,
		},
	},
	liquidate: {
		type: ClassifierType.LIQUIDATE,
		protocol: Protocol.CompoundV2,
		abi: marketAbi,
		isValid: isValidLiquidate,
		parse: parseLiquidate,
		market: {
			getCalls: getMarketCalls,
			processCalls: processMarketCalls,
		},
	},
};

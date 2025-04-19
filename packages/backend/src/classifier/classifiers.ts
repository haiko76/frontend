import { Coder } from "../parser";
import type {
	ChainId,
	FlashLoan,
	LendingProtocol,
	LiquidityWithdrawal,
	Log,
	Pool,
	Repayment,
	Seizure,
	SwapProtocol,
	Transfer,
} from "../types";
import { getLendingPoolByAddress } from "./dex-classifiers/classifiers";
import { SWAP_PROTOCOL_ADDRESS } from "./dex-classifiers/const";
import {
	AaveV1Classifier,
	AaveV2Classifier,
	AaveV3Classifier,
	BalancerV1Classifier,
	BalancerV2Classifier,
	CompoundV2Classifier,
	CurveV1Classifier,
	CurveV2Classifier,
	Erc20Classifier,
	UniswapV2Classifier,
	UniswapV3Classifier,
	ZeroExV3Classifier,
	ZeroExV4Classifier,
} from "./items/index";
import { SushiSwapClassifier } from "./items/sushiswap";
import {
	type ClassifiedEvent,
	type Classifier,
	ClassifierType,
	type LiquidityDeposit,
	type Swap,
} from "./swap-classifiers-types";
import type { Market } from "./types";

export function getTransfers(logs: ClassifiedEvent[]): Transfer[] {
	return logs
		.map((log) => {
			if (log.classifier.type !== "transfer") {
				return null;
			}
			return log.classifier.parse(log);
		})
		.filter((transfer: Transfer | null): transfer is Transfer => !!transfer);
}

export function getFlashLoans(logs: ClassifiedEvent[]): FlashLoan[] {
	return logs
		.map((log) => {
			if (log.classifier.type !== ClassifierType.FLASH_LOAN) {
				return null;
			}
			return log.classifier.parse(log);
		})
		.filter((flashLoan: FlashLoan | null): flashLoan is FlashLoan => !!flashLoan);
}

export function getPoolAddress(log: ClassifiedEvent): string {
	const type = log.classifier.type;
	if (type !== "swap" && type !== "liquidity_deposit" && type !== "liquidity_withdrawal") {
		return "";
	}
	if (log.classifier.protocol === "BalancerV2") {
		const poolId = log.values.poolId as string;
		return poolId.substring(0, 42);
	}
	return log.address.toLowerCase();
}

function isValidFactory(chainId: ChainId, swapProtocol: SwapProtocol, address: string) {
	const allowedFactories = SWAP_PROTOCOL_ADDRESS[chainId][swapProtocol];
	if (!allowedFactories) {
		return false;
	}
	if (allowedFactories["factory"][0].toLowerCase() !== address.toLowerCase()) {
		return false;
	}
	return true;
}

export function getSwaps(chainId: ChainId, pools: Pool[], transfers: Transfer[], logs: ClassifiedEvent[]): Swap[] {
	return logs
		.map((log) => {
			if (log.classifier.type !== "swap") {
				return null;
			}
			const poolAddress = getPoolAddress(log);
			const pool = pools.find((pool) => pool.address === poolAddress);
			if (!pool) {
				return null;
			}
			const protocol = log.classifier.protocol;
			if (!protocol) {
				return null;
			}
			const swapProtocol = protocol as SwapProtocol;

			if (!isValidFactory(chainId, swapProtocol, pool.factory.address)) {
				return null;
			}
			return log.classifier.parse(pool, log, transfers, logs);
		})
		.filter((swap: Swap | null): swap is Swap => !!swap);
}

function getMarketAddress(log: ClassifiedEvent): string {
	return log.address.toLowerCase();
}

export function getRepayments(chainId: ChainId, markets: Market[], logs: ClassifiedEvent[]): Repayment[] {
	return logs
		.map((log) => {
			if (log.classifier.type !== ClassifierType.REPAYMENT) {
				return null;
			}
			const marketAddress = getMarketAddress(log);
			const market = markets.find((pool) => pool.address === marketAddress);
			if (!market) {
				return null;
			}
			const protocol = log.classifier.protocol;
			if (!protocol) {
				return null;
			}
			const lendingProtocol = protocol as LendingProtocol;
			if (!getLendingPoolByAddress(chainId, lendingProtocol, market.pool.address)) {
				return null;
			}
			return log.classifier.parse(market, log);
		})
		.filter((repayment: Repayment | null): repayment is Repayment => !!repayment);
}

export function getLiquidation(chainId: ChainId, markets: Market[], logs: ClassifiedEvent[]): Seizure[] {
	return logs
		.map((log) => {
			if (log.classifier.type !== "liquidate") {
				return null;
			}
			const marketAddress = getMarketAddress(log);
			const market = markets.find((pool) => pool.address === marketAddress);
			if (!market) {
				return null;
			}
			const protocol = log.classifier.protocol;
			if (!protocol) {
				return null;
			}
			const lendingProtocol = protocol as LendingProtocol;
			if (!getLendingPoolByAddress(chainId, lendingProtocol, market.pool.address)) {
				return null;
			}
			return log.classifier.parse(market, log);
		})
		.filter((seizure: Seizure | null): seizure is Seizure => !!seizure);
}

export function getClassifiers(): Classifier[] {
	return [
		...Object.values(BalancerV1Classifier),
		...Object.values(BalancerV2Classifier),
		...Object.values(CurveV1Classifier),
		...Object.values(CurveV2Classifier),
		Erc20Classifier.transfer,
		UniswapV2Classifier.swap,
		SushiSwapClassifier.swap,
		...Object.values(UniswapV3Classifier),
		ZeroExV3Classifier.swap,
		ZeroExV4Classifier.swap,
		...Object.values(CompoundV2Classifier),
		...Object.values(AaveV1Classifier),
		...Object.values(AaveV2Classifier),
		...Object.values(AaveV3Classifier),
	].filter((classifier): classifier is Classifier => classifier !== undefined);
}

export function classify(chainId: ChainId, logs: Log[]): ClassifiedEvent[] {
	return logs.flatMap((log) => classifyLog(chainId, log));
}

export function classifyLog(chainId: ChainId, log: Log): ClassifiedEvent[] {
	const events: ClassifiedEvent[] = [];
	const classifiers = getClassifiers();

	for (const classifier of classifiers) {
		const coder = new Coder(classifier.abi);
		try {
			const {
				topics,
				data,
				address,
				transactionFrom,
				transactionTo,
				gasPrice,
				transactionHash,
				transactionIndex,
				gasUsed,
				logIndex,
				blockHash,
				blockNumber,
			} = log;
			const event = coder.decodeEvent(topics as string[], data);
			if (!classifier.isValid(event, address, chainId)) {
				continue;
			}
			const classifiedEvent: ClassifiedEvent = {
				address,
				blockHash,
				blockNumber,
				transactionFrom,
				transactionTo,
				gasPrice,
				transactionHash,
				transactionIndex: Number(transactionIndex),
				gasUsed,
				logIndex: Number(logIndex),
				classifier,
				...event,
			};
			events.push(classifiedEvent);
		} catch {
			continue;
		}
	}
	return events;
}

export function isSwap(event: Swap | LiquidityDeposit | LiquidityWithdrawal): event is Swap {
	return "from" in event;
}

export function isDeposit(event: Swap | LiquidityDeposit | LiquidityWithdrawal): event is LiquidityDeposit {
	return "depositor" in event;
}

export function isWithdrawal(event: Swap | LiquidityDeposit | LiquidityWithdrawal): event is LiquidityWithdrawal {
	return "withdrawer" in event;
}

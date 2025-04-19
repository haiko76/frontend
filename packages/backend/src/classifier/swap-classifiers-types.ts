import type { Call } from "ethcall";
import type { JsonFragment } from "ethers";
import type {
	ChainId,
	FlashLoan,
	LendingProtocol,
	LiquidityDeposit,
	LiquidityWithdrawal,
	Pool,
	PoolData,
	Repayment,
	Seizure,
	Swap,
	SwapProtocol,
	Transfer,
} from "../types";
import type { LogEvent } from "../utils/coder";
import type { Market, MarketData } from "./lending-classifier-types";

interface BaseClassifier {
	abi: JsonFragment[];
}

declare type ValueMap = Record<string, unknown>;

export enum ClassifierType {
	SWAP = "swap",
	FLASH_LOAN = "flash_loan",
	LIQUIDITY_DEPOSIT = "liquidity_deposit",
	LIQUIDITY_WITHDRAWAL = "liquidity_withdrawal",
	REPAYMENT = "payment",
	TRANSFER = "transfer",
	LIQUIDATE = "liquidate",
}

type Classifiers = {
	swap?: SwapClassifier;
	transfer?: TransferClassifier;
	liquidityDeposit?: LiquidityDepositClassifier;
	liquidityWithdrawal?: LiquidityWithdrawalClassifier;
	repayment?: RepaymentClassifier;
	liquidate?: LiquidateClassifier;
	flashLoan?: FlashLoanClassifier;
};

type Classifier =
	| SwapClassifier
	| TransferClassifier
	| LiquidityDepositClassifier
	| LiquidityWithdrawalClassifier
	| RepaymentClassifier
	| LiquidateClassifier
	| FlashLoanClassifier;

type ClassifiedEvent = {
	address: string;
	blockHash: string | null;
	blockNumber: number;
	transactionFrom: string;
	transactionTo: string;
	transactionHash: string;
	transactionIndex: number;
	gasUsed: bigint;
	gasPrice: bigint;
	logIndex: number;
	classifier: Classifier;
	name: string;
	values: ValueMap;
};
interface SwapClassifier extends BaseClassifier {
	protocol: SwapProtocol;
	type: ClassifierType.SWAP;
	isValid: (event: LogEvent, address: string, chainId: ChainId) => boolean;
	parse: (pool: Pool, event: ClassifiedEvent, transfers: Transfer[], allEvents: ClassifiedEvent[]) => Swap | null;
	pool: {
		getCalls: (id: string) => Call[];
		processCalls: (result: unknown[], address: string) => PoolData | null;
	};
}

interface FlashLoanClassifier extends BaseClassifier {
	protocol: LendingProtocol | SwapProtocol;
	type: ClassifierType.FLASH_LOAN;
	isValid: (event: LogEvent, address: string, chainId: ChainId) => boolean;
	parse: (event: ClassifiedEvent) => FlashLoan | null;
	pool: {
		getCalls: (id: string) => Call[];
		processCalls: (result: unknown[], address: string) => PoolData | null;
	};
}
interface LiquidityDepositClassifier extends BaseClassifier {
	protocol: SwapProtocol;
	type: ClassifierType.LIQUIDITY_DEPOSIT;
	isValid: (event: LogEvent, address: string, chainId: ChainId) => boolean;
	parse: (pool: Pool, event: ClassifiedEvent, transfers: Transfer[]) => LiquidityDeposit | null;
	pool: {
		getCalls: (id: string) => Call[];
		processCalls: (result: unknown[], address: string) => PoolData | null;
	};
}

interface TransferClassifier extends BaseClassifier {
	type: ClassifierType.TRANSFER;
	isValid: (event: LogEvent, address: string, chainId: ChainId) => boolean;
	parse: (event: ClassifiedEvent) => Transfer;
}

interface LiquidityWithdrawalClassifier extends BaseClassifier {
	protocol: SwapProtocol;
	type: ClassifierType.LIQUIDITY_WITHDRAWAL;
	isValid: (event: LogEvent, address: string, chainId: ChainId) => boolean;
	parse: (pool: Pool, event: ClassifiedEvent, transfers: Transfer[]) => LiquidityWithdrawal | null;
	pool: {
		getCalls: (id: string) => Call[];
		processCalls: (result: unknown[], address: string) => PoolData | null;
	};
}

interface RepaymentClassifier extends BaseClassifier {
	protocol: LendingProtocol;
	type: ClassifierType.REPAYMENT;
	isValid: (event: LogEvent, address: string, chainId: ChainId) => boolean;
	parse: (market: Market, event: ClassifiedEvent) => Repayment | null;
	market: {
		getCalls: (address: string) => Call[];
		processCalls: (chainId: ChainId, address: string, result: unknown[]) => MarketData | null;
	};
}

interface LiquidateClassifier extends BaseClassifier {
	protocol: LendingProtocol;
	type: ClassifierType.LIQUIDATE;
	isValid: (event: LogEvent, address: string, chainId: ChainId) => boolean;
	parse: (market: Market, event: ClassifiedEvent) => Seizure | null;
	market: {
		getCalls: (address: string) => Call[];
		processCalls: (chainId: ChainId, address: string, result: unknown[]) => MarketData | null;
	};
}

export type {
	LiquidityWithdrawalClassifier,
	LiquidityDeposit,
	LiquidityDepositClassifier,
	TransferClassifier,
	Swap,
	SwapClassifier,
	Classifiers,
	ClassifiedEvent,
	Classifier,
	FlashLoanClassifier,
};

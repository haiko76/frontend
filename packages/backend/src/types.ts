import type { Decimal } from "@prisma/client/runtime/library";

type Address = string;
type Asset = string;
export enum MevType {
	Arbitrage = "ARBITRAGE",
	Liquidation = "LIQUIDATION",
	Sandwich = "SANDWICH",
}

export enum SwapProtocol {
	BalancerV1 = "BalancerV1",
	BalancerV2 = "BalancerV2",
	UniswapV2 = "UniswapV2",
	UniswapV3 = "UniswapV3",
	UniswapV4 = "UniswapV4",
	ZeroExV3 = "ZeroExV3",
	ZeroExV4 = "ZeroExV4",
	OneInch = "1inch",
	CurveV1 = "CurveV1",
	CurveV2 = "CurveV2",
	BancorV2 = "BancorV2",
	BancorV3 = "BancorV3",
	SushiSwapV2 = "SushiSwapV2",
	SushiSwapV3 = "SushiSwapV3",
	PancakeSwapV2 = "PancakeSwapV2",
	PancakeSwapV3 = "PancakeSwapV3",
	KyberSwap = "KyberSwap",
	TransitSwap = "TransitSwap",
	Shibaswap = "Shibaswap",
	SushiSwap = "SushiSwap",
}

export enum LendingProtocol {
	CompoundV2 = "CompoundV2",
	AaveV1 = "AaveV1",
	AaveV2 = "AaveV2",
	AaveV3 = "AaveV3",
}

const ETHEREUM = 1;
const OPTIMISM = 10;
const POLYGON = 137;
const ARBITRUM = 42161;
const AVALANCHE = 43114;

export const nativeAsset: Record<ChainId, string> = {
	[ETHEREUM]: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
	[OPTIMISM]: "0x4200000000000000000000000000000000000006",
	[POLYGON]: "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
	[ARBITRUM]: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
	[AVALANCHE]: "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
};

type ChainId = typeof ETHEREUM | typeof OPTIMISM | typeof POLYGON | typeof ARBITRUM | typeof AVALANCHE;

type Block = {
	hash: string;
	number: number;
	timestamp: Date;
};

export type Transaction = {
	blockNumber: number;
	hash: string;
	from: string;
	to: string;
	index: number;
	gasPrice: bigint;
	gasUsed: bigint;
	label?: MevType;
	timestamp: Date;
};

export const Protocol = { ...SwapProtocol, ...LendingProtocol };
export type Protocol = typeof Protocol;

type Factory = {
	label: string;
	address: string;
};

type Router = {
	label: string;
	address: string;
};

type Pool = {
	address: string;
	factory: Factory;
	assets: string[];
};

type LendingPool = {
	label: LendingProtocol;
	addresses: string[];
};

interface TokenAmount {
	address: string;
	amount: bigint;
	additionalAmount?: bigint;
	additionalAmountInUsd?: number;
}

type TokenMetadata = {
	address: string;
	decimals: number;
	price?: {
		rate: number;
		currency: string;
		toBlock?: number;
		timestamp?: Date;
	};
	symbol: string;
	logo?: string;
};

type Profit = {
	txHash: string;
	mevType: MevType;
	extractor: string;
	profitTokenId: Address;
	profitAmount: bigint;
	profitInUsd?: number;
};

type Arbitrage = {
	blockNumber: number;
	transactionHash: string;
	arbitrager: Address;
	profit: TokenAmount[];
	cost: {
		gasUsed: bigint;
		gasPrice: bigint;
	};
	traces: BaseTransfer[];
	protocols: string[];
	flashLoan?: {
		flashLoanAsset: string;
		flashLoanAmount: bigint;
		flashLoanInUsd?: number;
	};
	profitInUsd?: number;
	costInUsd?: number;
};

export type FullTxResponseCommon = {
	blockNumber: number;
	transactionLogIndex: number;
	timestamp: Date;
};

export type FullArbitrage = FullTxResponseCommon & {
	arbitrager: Address;
	from: string;
	to: string;
	transactionHash: string;
	profit: TokenAmount[];
	traces: BaseTransfer[];
	protocols: string[];
	flashLoan?: {
		flashLoanAsset: string;
		flashLoanAmount: bigint;
		flashLoanInUsd?: number;
	};
	assetMetadata: Record<string, Omit<TokenMetadata, "price">>;
	profitInUsd?: number;
	costInUsd?: number;
};

export type PrismaArbitrage = {
	blockNumber: number;
	transactionHash: string;
	arbitrager: Address;
	profit: string;
	profitInUsd: Decimal;
	costInUsd: Decimal;
	protocols: string[];
	traces: BaseTransfer[];
	flashLoan?: {
		flashLoanAsset: string;
		flashLoanAmount: Decimal;
		flashLoanInUsd?: Decimal;
	};
};

type Log = {
	blockHash: string;
	blockNumber: number;
	transactionFrom: string;
	transactionTo: string;
	gasPrice: bigint;
	transactionHash: string;
	transactionIndex: number;
	logIndex: number;
	gasUsed: bigint;
	address: string;
	topics: readonly string[];
	data: string;
};

type Sandwich = {
	blockNumber: number;
	sandwicher: {
		sender: Address;
		beneficiary: Address;
	};
	sandwich: {
		frontSwap: Swap;
		backSwap: Swap;
		victimSwap: Swap[];
	};
	profit: TokenAmount[];
	profitInUsd: number;
	costInUsd: number;
	protocols: string[];
};

export type SandwichTx = Omit<Swap, "contract" | "transaction" | "event"> & {
	hash: string;
	transactionLogIndex: number;
	eventLogIndex: number;
	protocol: SwapProtocol;
	type: "front" | "back" | "victim";
};

export type PrismaSandwich = {
	blockNumber: number;
	sandwicher: Address;
	frontSwap: SandwichTx[];
	backSwap: SandwichTx[];
	victimSwap: SandwichTx[];
	profit: string; // JSON stringify
	profitInUsd: Decimal;
	costInUsd: Decimal;
	protocols: string[];
};

export type BaseTxWithTraces = {
	txHash: string;
	transactionLogIndex: number;
	traces: BaseTransfer[];
};

export type FullSandwich = FullTxResponseCommon & {
	sandwicher: string;
	sandwichId: string;
	frontSwap: BaseTxWithTraces[];
	backSwap: BaseTxWithTraces[];
	victimSwap: BaseTxWithTraces[];
	profitInUsd: number;
	costInUsd: number;
	assetMetadata: Record<string, Omit<TokenMetadata, "price">>;
	protocols: string[];
};

export type LiquidationEvent = {
	repayment: Repayment;
	seizure: Seizure;
	collateral: TokenAmount;
	debt: TokenAmount;
	repaymentAmountInUsd?: number;
	liquidatedAmountInUsd?: number;
	seizureEventLogIndex: number;
	repaymentEventLogIndex: number;
};

type Liquidation = {
	blockNumber: number;
	transactionHash: string;
	liquidator: string;
	protocols: string[];
	flashLoan?: {
		flashLoanAsset: string;
		flashLoanAmount: bigint;
		flashLoanInUsd?: number;
	};
	liquidationEvents: LiquidationEvent[];
	revenueInUsd?: number;
	profitInUsd?: number;
	costInUsd?: number;
};

export type PrismaLiquidationEvent = {
	transactionHash: string;
	payer: string;
	borrower: string;
	assetInDebt: string;
	debtAmount: Decimal;
	liquidatedAmount: Decimal;
	liquidatedAsset: string;
	repaymentAmountInUsd: Decimal;
	liquidatedAmountInUsd: Decimal;
	seizureEventLogIndex: number;
	repaymentEventLogIndex: number;
};

export type PrismaLiquidation = {
	blockNumber: number;
	transactionHash: string;
	liquidator: string;
	repaymentEvents: PrismaLiquidationEvent[];
	revenueInUsd: Decimal;
	profitInUsd: Decimal;
	costInUsd: Decimal;
	flashLoan?: {
		flashLoanAsset: string;
		flashLoanAmount: Decimal;
		flashLoanInUsd?: Decimal;
	};
	protocols: string[];
};

export type FullLiquidation = FullTxResponseCommon &
	PrismaLiquidation & {
		traces: BaseTransfer[];
		from: string;
		to: string;
		assetMetadata: Record<string, Omit<TokenMetadata, "price">>;
	};

type Event = {
	blockNumber: number;
	transaction: {
		hash: string;
		index: number;
		from: string;
		to: string;
		gasUsed: bigint;
		gasPrice: bigint;
	};
	event: {
		address: string;
		logIndex: number;
	};
};

type Transfer = Event & BaseTransfer;

type BaseTransfer = {
	eventLogIndex: number;
	asset: string;
	from: string;
	to: string;
	value: bigint;
};

type AlchemyInternalTransfer = {
	txHash: string;
	asset: string;
	from: string;
	to: string;
	value: number; // Amount with decimals
};

type Swap = Event & {
	contract: {
		address: string;
		protocol: {
			abi: SwapProtocol;
			factory: Address;
		};
	};
	from: string;
	to: string;
	assetIn: Address;
	amountIn: bigint;
	assetOut: Address;
	amountOut: bigint;
	metadata?: Record<string, unknown>;
};

type FlashLoan = Event & {
	recipient: string;
	token: string;
	amount: bigint;
	feeAmount: bigint;
};

type Repayment = Event & {
	contract: {
		address: string;
		protocol: {
			abi: LendingProtocol;
			pool: Address;
		};
	};
	payer: string;
	liquidator: string;
	borrower: string;
	borrowedAsset: string;
	debtAmount: bigint;
};

type Seizure = Event & {
	contract: {
		address: string;
		protocol: {
			abi: LendingProtocol;
			pool: Address;
		};
	};
	payer: string;
	liquidator: string;
	borrower: string;
	liquidatedAsset: string;
	liquidatedCollateralAmount: bigint;
};

type LiquidityWithdrawal = Event & {
	contract: {
		address: string;
		protocol: {
			abi: SwapProtocol;
			factory: Address;
		};
	};
	withdrawer: string;
	assets: Address[];
	amounts: bigint[];
	metadata?: Record<string, unknown>;
};

type LiquidityDeposit = Event & {
	contract: {
		address: string;
		protocol: {
			abi: SwapProtocol;
			factory: Address;
		};
	};
	depositor: string;
	assets: Address[];
	amounts: bigint[];
	metadata?: Record<string, unknown>;
};

type PoolData = {
	factoryAddress: string;
	assets: string[];
};

type Mev = Sandwich | Liquidation | Arbitrage;

export type {
	Transfer,
	TokenAmount,
	Arbitrage,
	Asset,
	Address,
	Block,
	Profit,
	TokenMetadata,
	Pool,
	Factory,
	ChainId,
	Router,
	Log,
	LendingPool,
	Sandwich,
	PoolData,
	Swap,
	LiquidityDeposit,
	LiquidityWithdrawal,
	Repayment,
	Seizure,
	Liquidation,
	Mev,
	AlchemyInternalTransfer,
	FlashLoan,
	BaseTransfer,
};

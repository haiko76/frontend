import type { Address, MevType, Protocol } from "../../types";

type Address = string;
type Asset = string;
export enum MevType {
	Arbitrage = "ARBITRAGE",
	Liquidation = "LIQUIDATION",
	Sandwich = "SANDWICH",
}

export const Protocol = { ...SwapProtocol, ...LendingProtocol };
export type Protocol = typeof Protocol;

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


export type BlockRequest = {
	blockNumber: number;
};

export type BlockResponse = {
	blockNumber: number;
	transactions: TxResponse[];
};

export type TxRequest = {
	hash: string;
};

export type ProfitChartByTime =
	| {
			totalProfit24h: number;
			profitDistribution: Record<string, number>; // map hour with profit
	  }
	| {
			totalProfit7D: number;
			profitDistribution: Record<string, number>; // map day with profit
	  }
	| {
			totalProfit30D: number;
			profitDistribution: Record<string, number>; // map week with profit
	  };

export type TokenFlowChart = Record<Address, Record<Address, number>>;

export type TxResponse = {
	hash: string;
	blockNumber: number;
	from: string;
	to: string;
	gasPrice: bigint;
	gasLimit: bigint;
	index: number;
	label: MevType | null;
};

export type ArbitrageMevTx = {
	label: MevType.Arbitrage;
	time: Date;
	hash: string;
	from: string;
	to: string;
	profit: number;
	cost: number;
	revenue: number;
	blockNumber: number;
	index: number;
	tokenFlowChart: TokenFlowChart;
};

export type LiquidationMevTx = {
	label: MevType.Liquidation;
	time: Date;
	hash: string;
	from: string;
	to: string;
	profit: number;
	cost: number;
	revenue: number;
	blockNumber: number;
	protocol: Protocol;
	borrower: string;
	liquidator: string;
	debtToken: string;
	debtToCover: number;
	liquidatedToken: string;
	liquidatedAmount: number;
};

export type SandwichMevTx = {
	label: MevType.Sandwich;
	time: Date;
	id: string;
	tokenFlowChart: TokenFlowChart;
	profit: number;
	cost: number;
	revenue: number;
	blockNumber: number;
};

export type OverviewResponse = {
	highestProfitMEV: {
		arbitrageMevTx: {
			hash: string;
			profit: number;
			cost: number;
		};
		liquidationMevTx: {
			hash: string;
			profit: number;
			cost: number;
		};
		sandwichMevTx: {
			hash: string;
			profit: number;
			cost: number;
		};
	};
	performance: ProfitChartByTime;
};

export type MevByAddressRequest = {
	address: string;
};

export type MevByAddressResponse = {
	address: string;
	totalProfit: number;
	totalCost: number;
	totalRevenue: number;
	totalTxs: number;
	mevTxs: (ArbitrageMevTx | LiquidationMevTx | SandwichMevTx)[];
};

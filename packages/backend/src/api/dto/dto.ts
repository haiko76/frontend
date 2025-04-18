import type { BaseTransfer, MevType } from "../../types";

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

export type TxResponse = {
	hash: string;
	blockNumber: number;
	from: string;
	to: string;
	gasPrice: string;
	gasUsed: string;
	index: number;
	timestamp: Date;
	label: MevType | null;
};

export type SafeBaseTransfer = Omit<BaseTransfer, "value"> & {
	value: string;
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
	traces: SafeBaseTransfer[];
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
	borrower: string;
	liquidator: string;
	debtToken: string;
	debtToCover: number;
	liquidatedToken: string;
	liquidatedAmount: number;
	traces: SafeBaseTransfer[];
};

export enum SandwichType {
	FrontRun = "FrontRun",
	Victim = "Victim",
	BackRun = "BackRun",
}

export type SandwichMevTx = {
	label: MevType.Sandwich;
	time: Date;
	id: string;
	frontRun: {
		type: SandwichType.FrontRun;
		traces: SafeBaseTransfer[];
	};
	backRun: {
		type: SandwichType.BackRun;
		traces: SafeBaseTransfer[];
	};
	victim: {
		type: SandwichType.Victim;
		traces: SafeBaseTransfer[];
	};
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

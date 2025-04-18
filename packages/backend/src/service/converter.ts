import {
	type ArbitrageMevTx,
	type LiquidationMevTx,
	type SafeBaseTransfer,
	type SandwichMevTx,
	SandwichType,
	type TxResponse,
} from "../api/dto/dto";
import {
	type BaseTransfer,
	type FullArbitrage,
	type FullLiquidation,
	type FullSandwich,
	MevType,
	type Transaction,
} from "../types";

export const ServiceConverter = {
	convertTransaction(transaction: Transaction): TxResponse {
		return {
			hash: transaction.hash,
			blockNumber: transaction.blockNumber,
			from: transaction.from,
			to: transaction.to,
			gasPrice: transaction.gasPrice.toString(),
			gasUsed: transaction.gasUsed.toString(),
			timestamp: transaction.timestamp,
			label: transaction.label ?? null,
			index: transaction.index,
		};
	},

	convertArbitrage(transaction: Omit<FullArbitrage, "cost">): ArbitrageMevTx {
		return {
			label: MevType.Arbitrage,
			time: transaction.timestamp,
			hash: transaction.transactionHash,
			from: transaction.from,
			to: transaction.to,
			profit: transaction.profitInUsd ?? 0,
			cost: transaction.costInUsd ?? 0,
			revenue: (transaction.profitInUsd ?? 0) + (transaction.costInUsd ?? 0),
			blockNumber: transaction.blockNumber,
			index: transaction.transactionLogIndex,
			traces: this.toSafeTransfer(transaction.traces),
		};
	},

	convertSandwich(transaction: FullSandwich): SandwichMevTx {
		return {
			label: MevType.Sandwich,
			id: transaction.sandwichId,
			blockNumber: transaction.blockNumber,
			profit: transaction.profitInUsd,
			cost: transaction.costInUsd,
			revenue: transaction.profitInUsd + transaction.costInUsd,
			time: transaction.timestamp,
			frontRun: {
				type: SandwichType.FrontRun,
				traces: [],
			},
			victim: {
				type: SandwichType.Victim,
				traces: [],
			},
			backRun: {
				type: SandwichType.BackRun,
				traces: [],
			},
		};
	},

	convertLiquidation(transaction: FullLiquidation): LiquidationMevTx {
		return {
			label: MevType.Liquidation,
			time: transaction.timestamp,
			hash: transaction.transactionHash,
			from: transaction.from,
			to: transaction.to,
			profit: Number(transaction.profitInUsd),
			cost: Number(transaction.costInUsd),
			revenue: Number(transaction.profitInUsd) + Number(transaction.costInUsd),
			blockNumber: transaction.blockNumber,
			borrower: transaction.borrower,
			liquidator: transaction.liquidator,
			debtToken: transaction.assetInDebt,
			debtToCover: Number(transaction.repaymentAmountInUsd),
			liquidatedToken: transaction.liquidatedAsset,
			liquidatedAmount: Number(transaction.liquidatedAmountInUsd),
			traces: this.toSafeTransfer(transaction.traces),
		};
	},

	toSafeTransfer(transfers: BaseTransfer[]): SafeBaseTransfer[] {
		return transfers.map((transfer) => ({
			from: transfer.from,
			to: transfer.to,
			asset: transfer.asset,
			value: transfer.value.toString(),
			eventLogIndex: transfer.eventLogIndex,
		}));
	},
};

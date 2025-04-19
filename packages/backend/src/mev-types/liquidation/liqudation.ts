import type { FlashLoan, Liquidation, LiquidationEvent, Repayment, Seizure } from "../arb";

export class LiquidationDetector {
	getLiquidations(
		repayments: Repayment[],
		seizures: Seizure[],
		flashLoanMap: Record<string, FlashLoan>,
	): Liquidation[] {
		const ret: Liquidation[] = [];
		const groupLiquidationEventByHash: Record<string, LiquidationEvent[]> = {};

		for (const seizure of seizures) {
			const repayment = this.getRepayment(seizure, repayments);
			if (!repayment) {
				continue;
			}
			const hash = seizure.transaction.hash;
			if (!groupLiquidationEventByHash[hash]) {
				groupLiquidationEventByHash[hash] = [];
			}
			const event: LiquidationEvent = {
				repayment,
				seizure,
				collateral: {
					address: seizure.liquidatedAsset,
					amount: seizure.liquidatedCollateralAmount,
				},
				debt: {
					address: repayment.borrowedAsset,
					amount: repayment.debtAmount,
				},
				seizureEventLogIndex: seizure.event.logIndex,
				repaymentEventLogIndex: repayment.event.logIndex,
			};
			groupLiquidationEventByHash[hash].push(event);
		}
		for (const [hash, events] of Object.entries(groupLiquidationEventByHash)) {
			let flashLoan;
			if (flashLoanMap[hash]) {
				flashLoan = {
					flashLoanAsset: flashLoanMap[hash].token,
					flashLoanAmount: flashLoanMap[hash].amount,
				};
			}
			ret.push({
				blockNumber: events[0].seizure.blockNumber,
				transactionHash: hash,
				liquidator: events[0].seizure.liquidator,
				protocols: [events[0].seizure.contract.protocol.abi],
				liquidationEvents: events,
				flashLoan,
			});
		}
		return ret;
	}

	private getRepayment(liquidations: Seizure, repayments: Repayment[]): Repayment | null {
		const repayment = repayments.reverse().find((repayment) => {
			if (liquidations.contract.protocol.abi === "CompoundV2") {
				return (
					repayment.event.logIndex < liquidations.event.logIndex &&
					repayment.event.address === liquidations.event.address &&
					repayment.payer === liquidations.liquidator &&
					repayment.borrower === liquidations.borrower
				);
			}
			return repayment.event.logIndex === liquidations.event.logIndex;
		});
		return repayment ? repayment : null;
	}
}

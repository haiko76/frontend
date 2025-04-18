import type { FlashLoan, Liquidate, Liquidation, Repayment } from "../arb";

export class LiquidationDetector {
	getLiquidations(
		repayments: Repayment[],
		liquidations: Liquidate[],
		flashLoanMap: Record<string, FlashLoan>,
	): Liquidation[] {
		const ret: Liquidation[] = [];
		for (const liquidation of liquidations) {
			const sender = liquidation.transaction.from;
			const repayment = this.getRepayment(liquidation, repayments);
			if (!repayment) {
				continue;
			}
			const flashLoan = flashLoanMap[liquidation.transaction.hash] ?? undefined;
			ret.push({
				blockNumber: liquidation.blockNumber,
				transactionHash: liquidation.transaction.hash,
				repayment,
				liquidate: liquidation,
				liquidator: { sender, beneficiary: liquidation.liquidator },
				borrower: liquidation.borrower,
				collateral: {
					address: liquidation.liquidatedAsset,
					amount: liquidation.liquidatedCollateralAmount,
				},
				debt: {
					address: repayment.borrowedAsset,
					amount: repayment.debtAmount,
				},
				protocols: [liquidation.contract.protocol.abi],
				flashLoan: flashLoan
					? {
							flashLoanAsset: flashLoan.token,
							flashLoanAmount: flashLoan.amount,
						}
					: undefined,
			});
		}
		return ret;
	}

	private getRepayment(liquidations: Liquidate, repayments: Repayment[]): Repayment | null {
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

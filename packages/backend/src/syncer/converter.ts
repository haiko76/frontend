import { Decimal } from "@prisma/client/runtime/library";
import JSONBig from "json-bigint";
import type { Arbitrage, Liquidation, PrismaArbitrage, PrismaLiquidation, PrismaSandwich, Sandwich } from "../types";
import { bigintToDecimal } from "../utils/utils";

export const PrismaConverter = {
	convertLiquidation(liquidations: Liquidation[]): PrismaLiquidation[] {
		const prismaLiquidations: PrismaLiquidation[] = [];
		for (const liq of liquidations) {
			const {
				blockNumber,
				transactionHash,
				liquidator,
				liquidate,
				repayment,
				borrower,
				protocols,
				flashLoan,
				profitInUsd,
				costInUsd,
				repaymentAmountInUsd,
				liquidatedAmountInUsd,
			} = liq;
			const prismaLiq: PrismaLiquidation = {
				blockNumber: blockNumber,
				transactionHash: transactionHash,
				liquidator: liquidator.sender,
				payer: repayment.payer,
				assetInDebt: repayment.borrowedAsset,
				debtAmount: bigintToDecimal(repayment.debtAmount),
				liquidatedAmount: bigintToDecimal(liquidate.liquidatedCollateralAmount),
				liquidatedAsset: liquidate.liquidatedAsset,
				profitInUsd: Decimal(profitInUsd ?? 0),
				costInUsd: Decimal(costInUsd ?? 0),
				repaymentAmountInUsd: Decimal(repaymentAmountInUsd ?? 0),
				liquidatedAmountInUsd: Decimal(liquidatedAmountInUsd ?? 0),
				borrower: borrower,
				protocols: protocols,
				flashLoan: flashLoan
					? {
							flashLoanAsset: flashLoan.flashLoanAsset,
							flashLoanAmount: bigintToDecimal(flashLoan.flashLoanAmount),
							flashLoanInUsd: Decimal(flashLoan.flashLoanInUsd ?? 0),
						}
					: undefined,
			};
			prismaLiquidations.push(prismaLiq);
		}
		return prismaLiquidations;
	},

	convertSandwich(sandwiches: Sandwich[]): PrismaSandwich[] {
		const prismaSandwiches: PrismaSandwich[] = [];
		for (const s of sandwiches) {
			const { blockNumber, sandwich, sandwicher, profitInUsd, costInUsd, protocols } = s;
			const { frontSwap, victimSwap, backSwap } = sandwich;
			const prismaSandwich: PrismaSandwich = {
				blockNumber: blockNumber,
				sandwicher: sandwicher.sender,
				frontSwap: [
					{
						...frontSwap,
						hash: frontSwap.transaction.hash,
						transactionLogIndex: frontSwap.transaction.index,
						eventLogIndex: frontSwap.event.logIndex,
						protocol: frontSwap.contract.protocol.abi,
						type: "front",
					},
				],
				victimSwap: victimSwap.map((v) => ({
					...frontSwap,
					hash: v.transaction.hash,
					transactionLogIndex: v.transaction.index,
					eventLogIndex: v.event.logIndex,
					protocol: v.contract.protocol.abi,
					type: "victim",
				})),
				backSwap: [
					{
						...backSwap,
						hash: backSwap.transaction.hash,
						transactionLogIndex: backSwap.transaction.index,
						eventLogIndex: backSwap.event.logIndex,
						protocol: backSwap.contract.protocol.abi,
						type: "back",
					},
				],
				profitInUsd: Decimal(profitInUsd),
				costInUsd: Decimal(costInUsd),
				protocols: protocols,
				profit: JSONBig.stringify(s.profit),
			};
			prismaSandwiches.push(prismaSandwich);
		}
		return prismaSandwiches;
	},

	convertArbitrage(arbitrages: Arbitrage[]): PrismaArbitrage[] {
		const prismaArbitrages: PrismaArbitrage[] = [];
		for (const arb of arbitrages) {
			const { blockNumber, transactionHash, arbitrager, profitInUsd, costInUsd, protocols, traces } = arb;
			const prismaArb: PrismaArbitrage = {
				blockNumber: blockNumber,
				transactionHash: transactionHash,
				arbitrager: arbitrager,
				profitInUsd: Decimal(profitInUsd ?? 0),
				costInUsd: Decimal(costInUsd ?? 0),
				protocols: protocols,
				traces: traces,
				profit: JSONBig.stringify(arb.profit),
				flashLoan: arb.flashLoan
					? {
							flashLoanAsset: arb.flashLoan.flashLoanAsset,
							flashLoanAmount: bigintToDecimal(arb.flashLoan.flashLoanAmount),
							flashLoanInUsd: Decimal(arb.flashLoan.flashLoanInUsd ?? 0),
						}
					: undefined,
			};
			prismaArbitrages.push(prismaArb);
		}
		return prismaArbitrages;
	},
};

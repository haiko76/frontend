import { BigNumber } from "alchemy-sdk";
import type { Sandwich } from "../../types";

// biome-ignore lint/complexity/noStaticOnlyClass: <explanation>
export class SandwichProfitCalculation {
	static calculateSandwichProfit(sandwiches: Sandwich[]): Sandwich[] {
		for (const sandwich of sandwiches) {
			const { frontSwap, backSwap } = sandwich.sandwich;
			if (frontSwap.amountOut === backSwap.amountIn) {
				const profit = backSwap.amountOut - frontSwap.amountIn;
				if (profit < 0) {
					continue;
				}
				sandwich.profit.push({
					address: frontSwap.assetIn, // front swap asset in OR back swap asset out
					amount: profit,
				});
			} else if (frontSwap.amountOut > backSwap.amountIn) {
				// In front-heavy situation, we need to recalculate the amount out of the front swap that gave the exact amount in of the back swap. For entire off-chain calculation and non-dex-specific, the approach of using the event log output is decided.
				const exchangeRate = BigNumber.from(frontSwap.amountIn).div(BigNumber.from(frontSwap.amountOut));
				const actualFrontIn = BigNumber.from(backSwap.amountIn).mul(exchangeRate).toBigInt();
				const remainingFrontIn = actualFrontIn - frontSwap.amountIn;
				const profit = backSwap.amountOut - actualFrontIn;
				if (profit < 0) {
					continue;
				}
				sandwich.profit.push({
					address: frontSwap.assetIn, // front swap asset in OR back swap asset out
					amount: profit,
					additionalAmount: remainingFrontIn,
				});
			} else {
				// In back-heavy situation, we need to recalculate the amount in of the back swap that was given by the exact amount out of the front swap. For entire off-chain calculation and non-dex-specific, the approach of using the event log output is decided.
				const exchangeRate = BigNumber.from(backSwap.amountOut).div(BigNumber.from(backSwap.amountIn));
				const actualBackOut = BigNumber.from(frontSwap.amountOut).mul(exchangeRate).toBigInt();
				const remainingBackOut = actualBackOut - backSwap.amountIn;
				const profit = actualBackOut - frontSwap.amountIn;
				if (profit < 0) {
					continue;
				}
				sandwich.profit.push({
					address: frontSwap.assetIn, // front swap asset in OR back swap asset out
					amount: profit,
					additionalAmount: remainingBackOut,
				});
			}
		}
		return sandwiches;
	}
}

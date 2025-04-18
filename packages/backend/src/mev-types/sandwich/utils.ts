import type { Swap } from "../../types";

export function coalesceSwap(swaps: Swap[]): Swap[] {
	const coalescedSwaps: Swap[] = [];
	const checkedTransactions: Record<string, string[]> = {}; // value is the assetIn-assetOut to check if a pair of a transaction has been checked
	for (let i = 0; i < swaps.length; i++) {
		const swap = swaps[i];
		let sumIn = swap.amountIn;
		let sumOut = swap.amountOut;
		for (let j = i + 1; j < swaps.length; j++) {
			const otherSwap = swaps[j];
			if (
				swap.transaction.hash === otherSwap.transaction.hash &&
				swap.assetIn === otherSwap.assetIn &&
				swap.assetOut === otherSwap.assetOut
			) {
				sumIn += otherSwap.amountIn;
				sumOut += otherSwap.amountOut;
			}
		}
		const ifChecked = checkedTransactions[swap.transaction.hash];
		if (ifChecked && ifChecked.includes(`${swap.assetIn}-${swap.assetOut}`)) {
			continue;
		}
		if (!ifChecked) {
			checkedTransactions[swap.transaction.hash] = [];
		} else {
			checkedTransactions[swap.transaction.hash].push(`${swap.assetIn}-${swap.assetOut}`);
		}
		// This prevents duplicates in the coalescedSwaps array and ensures that we only coalesce swaps with the same transaction hash and assetIn/assetOut pair
		coalescedSwaps.push({
			...swap,
			amountIn: sumIn,
			amountOut: sumOut,
		});
	}
	return coalescedSwaps;
}

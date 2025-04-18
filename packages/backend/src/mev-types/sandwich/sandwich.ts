import { isSwap } from "../../classifier/classifiers";
import { dexClassifier } from "../../classifier/dex-classifiers/classifiers";
import type { ChainId, Sandwich, Swap } from "../../types";
import { SandwichProfitCalculation } from "./calculate-profit";
import { coalesceSwap } from "./utils";

export class SandwichDetection {
	getSandwiches(chainId: ChainId, swaps: Swap[]): Sandwich[] {
		if (swaps.length === 0) {
			return [];
		}
		const coalescedSwaps = coalesceSwap(swaps);
		const orderedEvents = coalescedSwaps.sort((a, b) => {
			if (a.transaction.index === b.transaction.index) {
				return a.event.logIndex - b.event.logIndex;
			}
			return a.transaction.index - b.transaction.index;
		});
		const sandwiches: Sandwich[] = [];
		// rule 1: transactions in a sandwich should be executed in chronological order
		for (const i in orderedEvents) {
			const swap = orderedEvents[i];
			if (!isSwap(swap)) {
				continue;
			}
			const restEvents = orderedEvents.slice(Number.parseInt(i) + 1);
			const sandwich = this.getSandwich(chainId, swap, restEvents);
			if (sandwich) {
				sandwiches.push(...sandwich);
			}
		}
		const ret = SandwichProfitCalculation.calculateSandwichProfit(sandwiches);
		return ret;
	}

	getSandwich(chainId: ChainId, frontSwap: Swap, restEvents: Swap[]): Sandwich[] {
		const caller = frontSwap.from;
		const beneficiary = frontSwap.to;
		const sandwiched: Swap[] = [];
		const sandwiches: Sandwich[] = [];

		for (const event of restEvents) {
			// sandwich attack is execute in block-level, i.e. cannot be executed in one transaction
			if (event.transaction.hash === frontSwap.transaction.hash) {
				continue;
			}

			// in a sandwich, the attack and victim transactions are executed on the same protocol
			if (event.contract.address === frontSwap.contract.address) {
				// rule 2: the front-run transaction has the same swap direction with the victim transaction
				if (
					isSwap(event) &&
					event.assetIn === frontSwap.assetIn &&
					event.assetOut === frontSwap.assetOut &&
					event.from !== beneficiary
				) {
					sandwiched.push(event);
				}
				// rule 3: the back-run transaction has the inverted swap direction
				else if (
					isSwap(event) &&
					event.assetOut === frontSwap.assetIn &&
					event.assetIn === frontSwap.assetOut &&
					(event.from === beneficiary || event.to === caller)
				) {
					if (sandwiched.length > 0) {
						const protocol = dexClassifier(chainId, [event.contract.protocol.factory]);
						sandwiches.push({
							blockNumber: event.blockNumber,
							sandwicher: {
								sender: event.from,
								beneficiary: event.to,
							},
							sandwich: {
								frontSwap: frontSwap,
								backSwap: event,
								victimSwap: sandwiched,
							},
							profit: [],
							protocols: protocol.map((p) => p.dexName),
							profitInUsd: 0,
							costInUsd: 0,
						});
					}
				}
			}
		}

		return sandwiches;
	}
}

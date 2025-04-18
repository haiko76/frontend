import { dexClassifier } from "../../classifier/dex-classifiers/classifiers";
import { CHAIN_ID } from "../../classifier/dex-classifiers/const";
import type { Address, Arbitrage, Asset, FlashLoan, TokenAmount, Transaction, Transfer } from "../../types";
import { DirectedGraph } from "./graph";
export type ArbitrageOptions = {
	block: number; // block hex-coded
	transactionMap: Record<string, Transaction>;
};

export class ArbitrageDetector {
	isArbitrage(
		graph: DirectedGraph,
		transactionFrom: Address,
		transactionTo: Address | null,
	): {
		isArbitrage: boolean;
		profit: TokenAmount[];
		extractor: Address;
	} {
		const sccs = graph.findSCCs();
		// find closest point to from/to address
		let relevantSCC: Address[] = [];
		for (const scc of sccs) {
			if (scc.includes(transactionFrom) || (transactionTo && scc.includes(transactionTo))) {
				relevantSCC = scc;
				break;
			}
		}

		// TODO: update this
		if (relevantSCC.length <= 2) {
			return {
				isArbitrage: false,
				profit: [
					{
						address: "",
						amount: 0n,
					},
				],
				extractor: "",
			};
		}
		let closestPoint: Address;

		if (transactionTo && relevantSCC.includes(transactionTo)) {
			closestPoint = transactionTo;
		} else if (relevantSCC.includes(transactionFrom)) {
			closestPoint = transactionFrom;
		} else {
			closestPoint = graph.findClosestPointInSCC(transactionTo ?? transactionFrom, relevantSCC);
		}

		const transferMap = graph.getTransferData(closestPoint);
		if (!transferMap) {
			throw new Error("Cannot find profit address from graph.");
		}

		const profitMap: Record<Asset, bigint> = {};
		for (const [asset, value] of transferMap.entries()) {
			if (!profitMap[asset]) {
				profitMap[asset] = value;
				continue;
			}
			profitMap[asset] += value;
		}

		const profit: TokenAmount[] = [];

		for (const [asset, value] of Object.entries(profitMap)) {
			if (value > 0) {
				profit.push({
					address: asset.toLowerCase(),
					amount: value,
				});
				break;
			}
		}

		return {
			isArbitrage: profit.length > 0,
			profit: profit,
			extractor: closestPoint,
		};
	}

	detectArbitrage(transfers: Transfer[], flashLoanMap: Record<string, FlashLoan>): Arbitrage[] {
		const transferMap = groupTransferByTransactionHash(transfers);
		const arb: Arbitrage[] = [];
		for (const [tx, transfers] of Object.entries(transferMap)) {
			if (transfers.length === 0) {
				continue;
			}
			const graph = new DirectedGraph();
			const transactionFrom = transfers[0].transaction.from.toLowerCase();
			const transactionTo = transfers[0].transaction.to;
			const blockNumber = transfers[0].blockNumber;

			// Exclude simple swaps
			// TODO: can do better?
			if (dexClassifier(CHAIN_ID.ETHEREUM, [transactionTo]).length > 0) {
				continue;
			}

			const traces: Transfer[] = [];
			const addresses: Address[] = [];
			for (const transfer of transfers) {
				graph.addTransfer(transfer);
				traces.push(transfer);
				addresses.push(transfer.from);
				if (transfer.to) {
					addresses.push(transfer.to);
				}
			}
			const arbData = this.isArbitrage(graph, transactionFrom, transactionTo);

			const protocols: string[] = dexClassifier(1, addresses).map((d) => d.dexName);

			if (arbData.isArbitrage) {
				const flashLoan = flashLoanMap[tx];
				arb.push({
					blockNumber: blockNumber,
					transactionHash: tx,
					arbitrager: arbData.extractor,
					profit: arbData.profit,
					traces: traces,
					cost: {
						gasUsed: transfers[0].transaction.gasUsed,
						gasPrice: transfers[0].transaction.gasPrice,
					},
					protocols: protocols,
					flashLoan: flashLoan
						? {
								flashLoanAmount: flashLoan.amount,
								flashLoanAsset: flashLoan.token,
							}
						: undefined,
				});
			}
		}
		return arb;
	}
}

function groupTransferByTransactionHash(transfersWithMetadata: Transfer[]): Record<string, Transfer[]> {
	const ret: Record<string, Transfer[]> = {};
	for (const transfer of transfersWithMetadata) {
		if (!ret[transfer.transaction.hash]) {
			ret[transfer.transaction.hash] = [transfer];
		} else {
			ret[transfer.transaction.hash].push(transfer);
		}
	}
	return ret;
}

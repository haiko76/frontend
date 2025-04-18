import type { TransactionReceipt } from "alchemy-sdk";
import type { Block as RawBlock } from "ethers";
import type { Block, Transaction } from "../../types";

export const Converter = {
	toBlockHex(blockNumer: number): string {
		return `0x${blockNumer.toString(16)}`;
	},

	toBlock(rawBlock: RawBlock): Block {
		return {
			hash: rawBlock.hash || "",
			number: Number(rawBlock.number),
			timestamp: new Date(rawBlock.timestamp * 1000),
		};
	},

	toTransaction(receipt: TransactionReceipt, timestamp: Date): Transaction {
		return {
			hash: receipt.transactionHash,
			blockNumber: Number(receipt.blockNumber),
			from: receipt.from,
			to: receipt.to,
			index: Number(receipt.transactionIndex.toString()),
			gasPrice: BigInt(receipt.effectiveGasPrice.toString()),
			gasUsed: BigInt(receipt.gasUsed.toString()),
			timestamp: timestamp,
		};
	},
};

import erc20Abi from "../../abi/erc20";
import type { Transfer } from "../../types";
import type { LogEvent } from "../../utils/coder";
import { type ClassifiedEvent, ClassifierType, type Classifiers } from "../swap-classifiers-types";

function isValid(event: LogEvent): boolean {
	return event.name === "Transfer";
}

function parse(event: ClassifiedEvent): Transfer {
	const {
		values,
		transactionHash: hash,
		transactionIndex,
		logIndex,
		address,
		blockNumber,
		transactionFrom,
		transactionTo,
		gasPrice,
		gasUsed,
	} = event;

	const from = (values.from as string).toLowerCase();
	const to = (values.to as string).toLowerCase();
	const value = values.value as bigint;

	return {
		asset: address.toLowerCase(),
		blockNumber: blockNumber,
		transaction: {
			hash: hash,
			index: transactionIndex,
			from: transactionFrom,
			to: transactionTo,
			gasPrice: gasPrice,
			gasUsed: gasUsed,
		},
		eventLogIndex: logIndex,
		event: {
			logIndex,
			address: address.toLowerCase(),
		},
		from,
		to,
		value,
	};
}

export const Erc20Classifier: Classifiers = {
	transfer: {
		type: ClassifierType.TRANSFER,
		abi: erc20Abi,
		isValid,
		parse,
	},
};

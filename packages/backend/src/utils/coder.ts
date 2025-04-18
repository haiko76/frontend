import { AbiCoder, type JsonFragment, ParamType, Result, keccak256, toUtf8Bytes } from "ethers";

interface LogEvent {
	name: string;
	inputs: ParamType[];
	values: ValueMap;
}

interface EventEncoding {
	topics: string[];
	data: string;
}

type ValueMap = Record<string, unknown>;

class Coder {
	private abi: JsonFragment[];

	constructor(abi: JsonFragment[]) {
		this.abi = abi;
	}

	decodeEvent(topics: string[], data: string): LogEvent {
		const event = this.getEventByTopic(topics[0]);
		const [, ...dataTopics] = topics;
		const jsonInputs = event?.inputs;
		if (!jsonInputs) {
			throw Error;
		}
		const inputs = jsonInputs.map((input) => ParamType.from(input, true));
		// Decode topics
		const topicInputs = inputs.filter((input) => input.indexed);
		const topicResult = topicInputs.map((input, index) => {
			const topic = dataTopics[index];
			const params = AbiCoder.defaultAbiCoder().decode([input], topic);
			const [param] = params;
			return param;
		});
		// Decode data
		const dataInputs = inputs.filter((input) => !input.indexed);
		const dataResult = AbiCoder.defaultAbiCoder().decode(dataInputs, data);
		// Concat
		if (!event.name) {
			throw Error;
		}
		let topicIndex = 0;
		let dataIndex = 0;
		const result: Result = new Result();
		for (const input of inputs) {
			if (input.indexed) {
				result.push(topicResult[topicIndex]);
				topicIndex++;
			} else {
				result.push(dataResult[dataIndex]);
				dataIndex++;
			}
		}
		const values = toValueMap(result, inputs);
		return {
			name: event.name,
			inputs,
			values,
		};
	}

	private getEventByTopic(topic: string): JsonFragment {
		const events = this.abi.filter((item) => item.type === "event");
		const event = events.find((event) => {
			const name = event.name;
			const jsonInputs = event.inputs;
			if (!name || !jsonInputs) {
				return false;
			}
			const inputs = jsonInputs.map((input) => ParamType.from(input, true));
			const signature = Coder.getSignature(name, inputs);
			const eventTopic = sha3(signature);
			return eventTopic === topic;
		});
		if (!event) {
			throw Error;
		}
		return event;
	}

	private static getSignature(name: string, inputs: readonly ParamType[]): string {
		const inputSignatures: string[] = [];
		for (const input of inputs) {
			const inputSignature = Coder.getInputSignature(input);
			inputSignatures.push(inputSignature);
		}
		const inputString = inputSignatures.join(",");
		const functionSignature = `${name}(${inputString})`;
		return functionSignature;
	}

	private static getInputSignature(input: ParamType): string {
		if (input.baseType === "array") {
			const arityString = input.arrayLength && input.arrayLength >= 0 ? `[${input.arrayLength}]` : "[]";
			if (!input.arrayChildren) {
				throw Error;
			}
			return `${Coder.getInputSignature(input.arrayChildren)}${arityString}`;
		}
		if (input.baseType === "tuple") {
			if (!input.components) {
				throw Error;
			}
			return `(${input.components.map((childInput) => Coder.getInputSignature(childInput)).join(",")})`;
		}
		return input.type;
	}
}

function sha3(input: string): string {
	return keccak256(toUtf8Bytes(input));
}

function toValueMap(values: Result, inputs: ParamType[]): ValueMap {
	return Object.fromEntries(
		values.toArray().map((value, index) => {
			const input: ParamType = inputs[index];
			return [input.name, value];
		}),
	);
}

export { Coder, type LogEvent, type EventEncoding, type ValueMap, sha3 };

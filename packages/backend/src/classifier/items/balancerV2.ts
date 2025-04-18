import type { Call } from "ethcall";
import { Contract } from "ethcall";
import { ZeroAddress } from "ethers";
import vaultAbi from "../../abi/balancerV2Vault";
import {
	type FlashLoan,
	type LiquidityWithdrawal,
	type Pool,
	type PoolData,
	Protocol,
	SwapProtocol,
	type Transfer,
} from "../../types";
import type { LogEvent } from "../../utils/coder";
import { getProtocolContractAddress } from "../dex-classifiers/classifiers";
import {
	type ClassifiedEvent,
	ClassifierType,
	type Classifiers,
	type LiquidityDeposit,
	type Swap,
} from "../swap-classifiers-types";

interface PoolTokens {
	tokens: string[];
}

function isValidSwap(event: LogEvent): boolean {
	return event.name === "Swap";
}

function isValidFlashLoan(event: LogEvent): boolean {
	return event.name === "FlashLoan";
}

function isValidDeposit(event: LogEvent): boolean {
	const deltas = event.values.deltas as bigint[] | null;
	if (!deltas) {
		return false;
	}
	return event.name === "PoolBalanceChanged" && deltas.every((delta) => delta >= 0);
}

function isValidWithdrawal(event: LogEvent): boolean {
	const deltas = event.values.deltas as bigint[] | null;
	if (!deltas) {
		return false;
	}
	return event.name === "PoolBalanceChanged" && deltas.every((delta) => delta <= 0);
}

function isValidTransfer(event: LogEvent): boolean {
	return event.name === "InternalBalanceChanged";
}

function getPoolCalls(id: string): Call[] {
	const vaultAddress = getProtocolContractAddress(1, SwapProtocol.BalancerV2, "vault")?.address;
	if (!vaultAddress) {
		throw new Error(`Cannot find BalancerV2 factory address.`);
	}
	const contract = new Contract(vaultAddress, vaultAbi);
	return [contract.getPoolTokens(id)];
}

function processPoolCalls(result: unknown[]): PoolData | null {
	const vaultAddress = getProtocolContractAddress(1, SwapProtocol.BalancerV2, "vault")?.address;
	if (!vaultAddress) {
		throw new Error(`Cannot find BalancerV2 factory address.`);
	}
	const [poolTokens] = result as [PoolTokens | null];
	if (!poolTokens) {
		return null;
	}
	const tokens = poolTokens.tokens;
	if (!tokens || tokens.length === 0) {
		return null;
	}
	const assets = tokens.map((token) => token.toLowerCase());
	return {
		assets,
		factoryAddress: vaultAddress,
	};
}

function parseSwap(
	pool: Pool,
	event: ClassifiedEvent,
	transfers: Transfer[],
	allEvents: ClassifiedEvent[],
): Swap | null {
	const {
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
	const { assetIn, assetOut, amountIn, amountOut } = getSwapValues(event);
	const vault = event.address.toLowerCase();

	const { from, to } = getClusterInputOutput(vault, logIndex, allEvents, transfers);
	return {
		contract: {
			address: pool.address,
			protocol: {
				abi: Protocol.BalancerV2,
				factory: pool.factory.address,
			},
		},
		blockNumber: blockNumber,
		transaction: {
			hash: hash,
			index: transactionIndex,
			from: transactionFrom,
			to: transactionTo,
			gasPrice: gasPrice,
			gasUsed: gasUsed,
		},
		event: {
			logIndex,
			address: address.toLowerCase(),
		},
		from,
		to,
		assetIn: assetIn,
		amountIn,
		assetOut: assetOut,
		amountOut,
	};
}

function parseDeposit(pool: Pool, event: ClassifiedEvent): LiquidityDeposit | null {
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
	const depositor = (values.liquidityProvider as string).toLowerCase();
	const assets = (values.tokens as string[]).map((token) => token.toLowerCase());
	const amounts = values.deltas as bigint[];

	return {
		contract: {
			address: pool.address,
			protocol: {
				abi: Protocol.BalancerV2,
				factory: pool.factory.address,
			},
		},
		blockNumber: blockNumber,
		transaction: {
			hash: hash,
			index: transactionIndex,
			from: transactionFrom,
			to: transactionTo,
			gasPrice: gasPrice,
			gasUsed: gasUsed,
		},
		event: {
			address: address.toLowerCase(),
			logIndex,
		},
		depositor,
		assets: assets,
		amounts,
		metadata: {},
	};
}

function parseWithdrawal(pool: Pool, event: ClassifiedEvent): LiquidityWithdrawal | null {
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
	const withdrawer = (values.liquidityProvider as string).toLowerCase();
	const assets = (values.tokens as string[]).map((token) => token.toLowerCase());
	const amounts = (values.deltas as bigint[]).map((value) => -value);

	return {
		contract: {
			address: pool.address,
			protocol: {
				abi: Protocol.BalancerV2,
				factory: pool.factory.address,
			},
		},
		blockNumber: blockNumber,
		transaction: {
			hash: hash,
			index: transactionIndex,
			from: transactionFrom,
			to: transactionTo,
			gasPrice: gasPrice,
			gasUsed: gasUsed,
		},
		event: {
			address: address.toLowerCase(),
			logIndex,
		},
		withdrawer,
		assets: assets,
		amounts,
	};
}

function parseTransfer(event: ClassifiedEvent): Transfer {
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

	const user = (values.user as string).toLowerCase();
	const token = (values.token as string).toLowerCase();
	const delta = values.delta as bigint;

	const vault = event.address.toLowerCase();

	const from = delta > 0 ? vault : user;
	const to = delta > 0 ? user : vault;
	const value = delta > 0 ? delta : -delta;

	return {
		blockNumber: blockNumber,
		transaction: {
			hash: hash,
			index: transactionIndex,
			from: transactionFrom,
			to: transactionTo,
			gasPrice: gasPrice,
			gasUsed: gasUsed,
		},
		event: {
			logIndex,
			address: address.toLowerCase(),
		},
		asset: token,
		from,
		to,
		value,
	};
}

function getClusterInputOutput(
	vault: string,
	logIndex: number,
	allEvents: ClassifiedEvent[],
	transfers: Transfer[],
): {
	from: string;
	to: string;
} {
	function isVaultSwap(event: ClassifiedEvent): boolean {
		return event.classifier.type === "swap" && event.classifier.protocol === "BalancerV2";
	}

	const emptyInputOutput = {
		from: ZeroAddress,
		to: ZeroAddress,
	};

	const sortedEvents = [...allEvents];
	sortedEvents.sort((a, b) => a.logIndex - b.logIndex);
	// Go back from current event until not a Balancer V2 swap found
	let startIndex = allEvents.findIndex((event) => event.logIndex === logIndex);
	while (startIndex > 0 && isVaultSwap(allEvents[startIndex - 1])) {
		startIndex--;
	}
	const startSwap = allEvents[startIndex];
	// Go forward from current event until not a Balancer V2 swap found
	let endIndex = allEvents.findIndex((event) => event.logIndex === logIndex);
	while (endIndex < allEvents.length - 1 && isVaultSwap(allEvents[endIndex + 1])) {
		endIndex++;
	}
	const endSwap = allEvents[endIndex];
	// Go forward from there until a swap found
	let endTransferIndex = endIndex;
	while (endTransferIndex < allEvents.length - 1 && allEvents[endTransferIndex + 1].classifier.type === "transfer") {
		endTransferIndex++;
	}
	// Make sure there is at least one transfer
	if (endIndex === endTransferIndex) {
		// Theoretically possible, but not economically viable
		// Either way, w/o transfers, we can't deduct the sender
		return emptyInputOutput;
	}
	const endTransfer = allEvents[endTransferIndex];
	// Make sure all swaps in cluster form a valid chain
	for (let i = startIndex; i < endIndex; i++) {
		const swap = allEvents[i];
		const nextSwap = allEvents[i + 1];
		if (swap.classifier.type !== "swap" || nextSwap.classifier.type !== "swap") {
			return emptyInputOutput;
		}

		const { assetOut: swapAssetOut, amountOut: swapAmountOut } = getSwapValues(swap);
		const { assetIn: nextSwapAssetIn, amountIn: nextSwapAmountIn } = getSwapValues(nextSwap);

		if (swapAssetOut !== nextSwapAssetIn) {
			return emptyInputOutput;
		}
		if (swapAmountOut !== nextSwapAmountIn) {
			return emptyInputOutput;
		}
	}
	// Get cluster transfers, inflows, outflows
	const clusterTransfers = transfers.filter(
		(transfer) => transfer.event.logIndex > endSwap.logIndex && transfer.event.logIndex <= endTransfer.logIndex,
	);
	const clusterInflows = clusterTransfers.filter((transfer) => transfer.to === vault);
	const clusterOutflows = clusterTransfers.filter((transfer) => transfer.from === vault);
	// Get first inflow, last outflow
	const firstInflow = clusterInflows[0];
	const lastOutflow = clusterOutflows[clusterOutflows.length - 1];
	// Make sure first inflow matches first swap in a cluster
	if (clusterInflows.length > 0) {
		const { assetIn, amountIn } = getSwapValues(startSwap);
		if (
			firstInflow.asset !== assetIn ||
			(firstInflow.value !== amountIn && firstInflow.event.address !== vault) ||
			firstInflow.to !== vault
		) {
			return emptyInputOutput;
		}
	}
	// Make sure last outflow matches last swap in a cluster
	if (clusterOutflows.length > 0) {
		const { assetOut, amountOut } = getSwapValues(endSwap);
		if (
			lastOutflow.asset !== assetOut ||
			(lastOutflow.value !== amountOut && lastOutflow.event.address !== vault) ||
			lastOutflow.from !== vault
		) {
			return emptyInputOutput;
		}
	}
	// Get input/output
	const clusterFrom =
		clusterInflows.length === 0 ? (clusterOutflows.length === 0 ? ZeroAddress : lastOutflow.to) : firstInflow.from;
	const clusterTo =
		clusterOutflows.length === 0 ? (clusterInflows.length === 0 ? ZeroAddress : firstInflow.from) : lastOutflow.to;
	const from = logIndex === startSwap.logIndex ? clusterFrom : vault;
	const to = logIndex === endSwap.logIndex ? clusterTo : vault;
	return {
		from,
		to,
	};
}

function getSwapValues(swap: ClassifiedEvent): {
	assetIn: string;
	assetOut: string;
	amountIn: bigint;
	amountOut: bigint;
} {
	const assetIn = (swap.values.tokenIn as string).toLowerCase();
	const assetOut = (swap.values.tokenOut as string).toLowerCase();
	const amountIn = swap.values.amountIn as bigint;
	const amountOut = swap.values.amountOut as bigint;

	return {
		assetIn,
		assetOut,
		amountIn,
		amountOut,
	};
}

function parseFlashLoan(event: ClassifiedEvent): FlashLoan | null {
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

	const recipient = (values.recipient as string).toLowerCase();
	const token = (values.token as string).toLowerCase();
	const amount = values.amount as bigint;
	const feeAmount = values.feeAmount as bigint;

	return {
		blockNumber: blockNumber,
		transaction: {
			hash: hash,
			index: transactionIndex,
			from: transactionFrom,
			to: transactionTo,
			gasPrice: gasPrice,
			gasUsed: gasUsed,
		},
		event: {
			logIndex,
			address: address.toLowerCase(),
		},
		recipient,
		token,
		amount,
		feeAmount,
	};
}

export const BalancerV2Classifier: Classifiers = {
	swap: {
		type: ClassifierType.SWAP,
		protocol: Protocol.BalancerV2,
		abi: vaultAbi,
		isValid: isValidSwap,
		parse: parseSwap,
		pool: {
			getCalls: getPoolCalls,
			processCalls: processPoolCalls,
		},
	},
	liquidityDeposit: {
		type: ClassifierType.LIQUIDITY_DEPOSIT,
		protocol: Protocol.BalancerV2,
		abi: vaultAbi,
		isValid: isValidDeposit,
		parse: parseDeposit,
		pool: {
			getCalls: getPoolCalls,
			processCalls: processPoolCalls,
		},
	},
	liquidityWithdrawal: {
		type: ClassifierType.LIQUIDITY_WITHDRAWAL,
		protocol: Protocol.BalancerV2,
		abi: vaultAbi,
		isValid: isValidWithdrawal,
		parse: parseWithdrawal,
		pool: {
			getCalls: getPoolCalls,
			processCalls: processPoolCalls,
		},
	},
	transfer: {
		type: ClassifierType.TRANSFER,
		abi: vaultAbi,
		isValid: isValidTransfer,
		parse: parseTransfer,
	},
	flashLoan: {
		type: ClassifierType.FLASH_LOAN,
		protocol: Protocol.BalancerV2,
		abi: vaultAbi,
		isValid: isValidFlashLoan,
		parse: parseFlashLoan,
		pool: {
			getCalls: getPoolCalls,
			processCalls: processPoolCalls,
		},
	},
};

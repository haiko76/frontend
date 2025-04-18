import { Decimal } from "@prisma/client/runtime/library";
import { Alchemy, type Network } from "alchemy-sdk";
import { AlchemyProvider, type JsonRpcProvider } from "ethers";
import { getAlchemyConfig } from "../configs/config";
import type { ChainId } from "../types";

function calculateTxGasCost(gasUsed: bigint, effectiveGasPrice: bigint, wethPrice: number): number {
	return calculateTokenValueInUSD(gasUsed * effectiveGasPrice, wethPrice, 18);
}

async function sleep(durationInMs: number): Promise<unknown> {
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve({ error: false, message: `Slept for ${durationInMs} ms` });
		}, durationInMs);
	});
}

function getEnv(key: string): string {
	const val = process.env[key];
	if (!val) {
		console.error(`Require environment variable ${key}`);
		throw new Error("Server init error");
	}
	return val;
}

function getAlchemyProvider(chainId: ChainId): JsonRpcProvider {
	const key = "W_WcrKxHTKNMw7fJEvpfpPIEhi_2d6Jx";
	// return new AlchemyProvider(chainId, getEnv("ALCHEMY_API_KEY"));
	return new AlchemyProvider(chainId, key);
}

function getAlchemy(network: Network): Alchemy {
	const config = getAlchemyConfig(network);
	return new Alchemy(config);
}

export function uniq<T>(arr: T[]): T[] {
	const seen = new Set<T>();
	const result: T[] = [];

	for (const item of arr) {
		if (!seen.has(item)) {
			seen.add(item);
			result.push(item);
		}
	}

	return result;
}
function uniqBy<T, Key>(arr: T[], keySelector: ((item: T) => Key) | keyof T): T[] {
	const seen = new Set<Key>();
	const result: T[] = [];

	let selector: (item: T) => Key;
	if (typeof keySelector === "function") {
		selector = keySelector;
	} else {
		selector = (v: T): Key => v[keySelector] as Key;
	}

	for (const item of arr) {
		const key = selector(item);

		if (!seen.has(key)) {
			seen.add(key);
			result.push(item);
		}
	}

	return result;
}

function deduplicate<T extends { transaction: { hash: string } }>(arr: T[]): T[] {
	const seen = new Set<string>();
	return arr.filter((item) => {
		if (seen.has(item.transaction.hash)) {
			return false;
		}
		seen.add(item.transaction.hash);
		return true;
	});
}

function bigintToDecimal(x: bigint): Decimal {
	return new Decimal(x.toString());
}

function decimalToBigInt(x: Decimal): bigint {
	return BigInt(x.toFixed(0));
}

function calculateTokenValueInUSD(tokenAmountWei: string | bigint, tokenRate: number, tokenDecimals: number): number {
	const amountBigInt = typeof tokenAmountWei === "string" ? BigInt(tokenAmountWei) : tokenAmountWei;
	const divisor = BigInt(10) ** BigInt(tokenDecimals);
	const wholePart = amountBigInt / divisor;
	const fractionalPart = amountBigInt % divisor;
	const tokenAmountDecimal = Number(wholePart) + Number(fractionalPart) / Number(divisor);
	const usdValue = tokenAmountDecimal * tokenRate;
	return usdValue;
}

function convertToRoundDay(date: Date): Date {
	const roundedDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
	return roundedDate;
}

export {
	bigintToDecimal,
	calculateTxGasCost,
	sleep,
	uniqBy,
	getEnv,
	getAlchemyProvider,
	deduplicate,
	getAlchemy,
	convertToRoundDay,
	decimalToBigInt,
	calculateTokenValueInUSD,
};

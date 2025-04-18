import type Redis from "ioredis";
import JSONBig from "json-bigint";
import type { FullSandwich, PrismaArbitrage, PrismaLiquidation, TokenMetadata, Transaction } from "../types";
import { uniqBy } from "../utils/utils";

enum RedisKey {
	TOKEN_METADATA = "api:token-metadata",
	TOKEN_PRICE = "api:token-price",
	ARBITRAGE = "arbitrage",
	SANDWICH = "sandwich",
	LIQUIDATION = "liquidation",
	TRANSACTIONS = "transaction",
	BLOCK = "block",
}

// expired time in seconds
enum ExpiredTime {
	ONE_DAY = 24 * 60 * 60,
}

export class RedisRepository {
	protected readonly redis: Redis;

	constructor(redis: Redis) {
		this.redis = redis;
	}

	async getTokenMetadataByAddress(addresses: string[]): Promise<TokenMetadata[]> {
		const uniqueAddresses = uniqBy(addresses, (a) => a);
		const tokenMetadata = await this.redis.hmget(RedisKey.TOKEN_METADATA, ...uniqueAddresses);
		if (tokenMetadata.length === 0) {
			return [];
		}
		const ret: TokenMetadata[] = [];
		for (const metadata of tokenMetadata) {
			if (metadata) {
				ret.push(JSON.parse(metadata));
			}
		}
		return ret;
	}

	async getTokenPriceByAddress(address: string): Promise<number | null> {
		const price = await this.redis.hmget(RedisKey.TOKEN_PRICE, address);
		if (price.length === 0) {
			return null;
		}
		return Number(price[0]);
	}

	async getTokenPriceMapByAddresses(addresses: string[]): Promise<Record<string, number>> {
		const uniqueAddresses = uniqBy(addresses, (a) => a);
		const prices = await this.redis.hmget(RedisKey.TOKEN_PRICE, ...uniqueAddresses);
		if (prices.length === 0) {
			return {};
		}
		const ret: Record<string, number> = {};
		for (let i = 0; i < uniqueAddresses.length; i++) {
			const val = prices[i];
			if (val) {
				ret[uniqueAddresses[i].toString()] = JSON.parse(val) as number;
			}
		}
		return ret;
	}

	async setTokenMetadata(tokenMetadata: TokenMetadata[]): Promise<void> {
		const data: string[] = [];
		for (const metadata of tokenMetadata) {
			data.push(
				metadata.address,
				JSON.stringify({
					address: metadata.address,
					decimals: metadata.decimals,
					symbol: metadata.symbol,
				}),
			);
		}
		try {
			await this.redis.multi().hset(RedisKey.TOKEN_METADATA, data).exec();
		} catch (error) {
			console.error(`RedisRepository: Cannot cache token metadata, error: ${error}`);
		}
	}

	async setTokenPriceInUsd(tokenPriceMap: Record<string, number>): Promise<void> {
		try {
			await this.redis
				.multi()
				.hset(RedisKey.TOKEN_PRICE, tokenPriceMap)
				.expire(RedisKey.TOKEN_PRICE, ExpiredTime.ONE_DAY)
				.exec();
		} catch (error) {
			console.error(`RedisRepository: Cannot cache token price, error: ${error}`);
		}
	}

	async cacheArbitrage(arbitrages: PrismaArbitrage[]): Promise<void> {
		try {
			const arbitrageMap: Record<string, string> = {};
			for (const arb of arbitrages) {
				arbitrageMap[arb.transactionHash] = JSONBig.stringify(arb);
			}
			await this.redis.multi().hset(RedisKey.ARBITRAGE, arbitrageMap).exec();
		} catch (error) {
			console.error(`RedisRepository: Cannot cache arbitrages, error: ${error}`);
		}
	}

	async cacheSandwich(sandwiches: FullSandwich[]): Promise<void> {
		try {
			const sandwichMap: Record<string, string> = {};
			for (const sandwich of sandwiches) {
				sandwichMap[sandwich.sandwichId] = JSONBig.stringify(sandwich);
			}
			await this.redis.multi().hset(RedisKey.SANDWICH, sandwichMap).exec();
		} catch (error) {
			console.error(`RedisRepository: Cannot cache arbitrages, error: ${error}`);
		}
	}

	async cacheLiquidation(liquidations: PrismaLiquidation[]): Promise<void> {
		try {
			const liquidationMap: Record<string, string> = {};
			for (const liquidation of liquidations) {
				liquidationMap[liquidation.transactionHash] = JSONBig.stringify(liquidation);
			}
			await this.redis.multi().hset(RedisKey.LIQUIDATION, liquidationMap).exec();
		} catch (error) {
			console.error(`RedisRepository: Cannot cache arbitrages, error: ${error}`);
		}
	}

	async cacheTransaction(txs: Transaction[]): Promise<void> {
		try {
			const txMap: Record<string, string> = {};
			for (const tx of txs) {
				txMap[tx.hash] = JSONBig.stringify(tx);
			}
			await this.redis.multi().hset(RedisKey.TRANSACTIONS, txMap).exec();
		} catch (error) {
			console.error(`RedisRepository: Cannot cache arbitrages, error: ${error}`);
		}
	}
}

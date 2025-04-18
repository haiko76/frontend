import { PrismaClient } from "@prisma/client";
import { Network } from "alchemy-sdk";
import { CHAIN_ID } from "../classifier/dex-classifiers/const";
import { Inspector } from "../mev-types/inspector";
import Fetcher from "../parser/fetcher";
import { RepositoryWrite } from "../repository/repository";
import type { Pool } from "../types";
import { getAlchemy, getAlchemyProvider } from "../utils/utils";
import { PrismaConverter } from "./converter";

const START_SYNC_BLOCK = 22285339n;
const END_SYNC_BLOCK = 22286320n; // TODO: update this to always take the latest block
const DEFAULT_DATABASE_TIMEOUT = 30_000; // milliseconds

async function main() {
	const provider = getAlchemyProvider(CHAIN_ID.ETHEREUM);
	const alchemyProvider = getAlchemy(Network.ETH_MAINNET);
	const prisma = new PrismaClient();
	const repository = new RepositoryWrite(prisma);
	const poolsInCache: Record<string, Pool> = await repository.getPoolsCache();
	const fetcher = new Fetcher(provider, alchemyProvider, poolsInCache, repository);
	// const redis = new Redis();
	// const redisRepository = new RedisRepository(redis);
	const inspector = new Inspector({
		fetcher: fetcher,
		network: Network.ETH_MAINNET,
		// redisRepository,
		repository,
	});
	for (let i = START_SYNC_BLOCK; i < END_SYNC_BLOCK; i++) {
		console.log("Syncing block", i.toString());
		const { mev, block, transactions } = await inspector.inspectMevBlock(i);
		if (!block) {
			continue;
		}
		try {
			await repository.transaction(
				async (repo) => {
					await repo.writeBlock(block);
					await repo.writeTransactions(transactions);
					await repo.writeLiquidation(PrismaConverter.convertLiquidation(mev.liquidation));
					await repo.writeSandwich(PrismaConverter.convertSandwich(mev.sandwich));
					await repo.writeArbitrage(PrismaConverter.convertArbitrage(mev.arbitrage));
					await repo.writeTransfers(mev.transfers);
				},
				{
					timeout: DEFAULT_DATABASE_TIMEOUT,
					maxWait: DEFAULT_DATABASE_TIMEOUT,
				},
			);
		} catch (err) {
			console.error("Error writing to database:", err);
		}
	}
}

void main();

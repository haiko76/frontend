import { PrismaClient } from "@prisma/client";
import { type Alchemy, Network } from "alchemy-sdk";
import type { JsonRpcProvider } from "ethers";
import { CHAIN_ID } from "../classifier/dex-classifiers/const";
import { Inspector } from "../mev-types/inspector";
import Fetcher from "../parser/fetcher";
import { RepositoryWrite } from "../repository/repository";
import type { Pool } from "../types";
import { getAlchemy, getAlchemyProvider, sleep } from "../utils/utils";
import { PrismaConverter } from "./converter";

const START_SYNC_BLOCK = 21521890;
const DEFAULT_DATABASE_TIMEOUT = 30_000; // 30 seconds

export class Syncer {
	private readonly alchemy: Alchemy;
	private repository: RepositoryWrite;
	private fetcher: Fetcher;
	private rpcProvider: JsonRpcProvider;
	// private redisRepository: RedisRepository;

	constructor(provider: Alchemy, repository: RepositoryWrite, fetcher: Fetcher, rpcProvider: JsonRpcProvider) {
		this.alchemy = provider;
		this.repository = repository;
		this.fetcher = fetcher;
		this.rpcProvider = rpcProvider;
	}

	async getRollBackPoint(targetBlockNumber: number): Promise<number> {
		const latestBlockSynced = await this.repository.getLatestBlock();
		if (!latestBlockSynced) {
			return targetBlockNumber;
		}
		if (latestBlockSynced.number > targetBlockNumber) {
			await this.repository.transaction(async (repo) => {
				await repo.deleteCascade(targetBlockNumber);
			});
			return targetBlockNumber;
		}
		return latestBlockSynced.number;
	}

	async start(fromBlock: number) {
		const inspector = new Inspector({
			fetcher: this.fetcher,
			network: Network.ETH_MAINNET,
			// redisRepository,
			repository: this.repository,
		});
		let startSyncPoint = await this.getRollBackPoint(fromBlock);

		while (true) {
			console.log("Syncing block", startSyncPoint);
			const latestBlock = (await this.alchemy.core.getBlockNumber()) - 10; // ensure syncing high confidence block
			if (startSyncPoint >= latestBlock) {
				console.log("Latest block reached", latestBlock);
				sleep(100_000 * 15 * 60); // sleep for 15 minutes
				continue;
			}
			const { mev, block, transactions } = await inspector.inspectMevBlock(startSyncPoint);
			if (!block) {
				continue;
			}
			try {
				await this.repository.transaction(
					async (repo) => {
						await repo.writeBlock(block);
						await repo.writeTransactions(transactions);
						await repo.writeSandwich(PrismaConverter.convertSandwich(mev.sandwich));
						await repo.writeArbitrage(PrismaConverter.convertArbitrage(mev.arbitrage));
						await repo.writeLiquidation(PrismaConverter.convertLiquidation(mev.liquidation));
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
			startSyncPoint++;
		}
	}
}

async function main() {
	const prisma = new PrismaClient();
	const repository = new RepositoryWrite(prisma);
	const rpcProvider = getAlchemyProvider(CHAIN_ID.ETHEREUM);
	const alchemyProvider = getAlchemy(Network.ETH_MAINNET);
	const poolsInCache: Record<string, Pool> = await repository.getPoolsCache();
	const fetcher = new Fetcher(rpcProvider, alchemyProvider, poolsInCache, repository);
	const syncer = new Syncer(alchemyProvider, repository, fetcher, rpcProvider);
	await syncer.start(START_SYNC_BLOCK);
}

void main();

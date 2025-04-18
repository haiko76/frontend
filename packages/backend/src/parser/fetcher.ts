import {
	type Alchemy,
	AssetTransfersCategory,
	type AssetTransfersWithMetadataResponse,
	type AssetTransfersWithMetadataResult,
	type TransactionReceipt,
} from "alchemy-sdk";
import { type Call, Provider as EthcallProvider } from "ethcall";
import type { Provider, Block as RawBlock } from "ethers";
import { getPoolAddress } from "../classifier/classifiers";
import { getFactoryByAddress, getLendingPoolByAddress } from "../classifier/dex-classifiers/classifiers";
import { type ClassifiedEvent, ClassifierType, type Market } from "../classifier/types";
import { Converter } from "../mev-types/arb/converter";
import type { RepositoryWrite } from "../repository/repository";
import type { AlchemyInternalTransfer, ChainId, Log, Pool, Transaction, Transfer } from "../types";

class Fetcher {
	private readonly provider: Provider;
	private readonly alchemyProvider: Alchemy;
	private readonly pools: Record<string, Pool> = {};
	private readonly repository: RepositoryWrite;

	constructor(provider: Provider, alchemyProvider: Alchemy, pools: Record<string, Pool>, repository: RepositoryWrite) {
		this.pools = pools;
		this.provider = provider;
		this.alchemyProvider = alchemyProvider;
		this.repository = repository;
	}

	async getTransactionLogs(hash: string): Promise<Log[]> {
		const receipt = await this.getReceipt(hash);
		if (!receipt) {
			return [];
		}
		return this.parseSingleTransactionLogs(receipt);
	}

	async getBlockLogs(blockNumber: number): Promise<{
		block: RawBlock;
		transactions: Transaction[];
		logs: Log[];
	} | null> {
		const [block, receipts] = await Promise.all([this.getRawBlock(blockNumber), this.getBlockReceipts(blockNumber)]);
		if (!receipts) {
			return null;
		}
		const logs = this.parseTransactionsLogs(receipts);
		return {
			block: block,
			logs: logs,
			transactions: receipts.map((r) => Converter.toTransaction(r, new Date(block.timestamp * 1000))),
		};
	}

	async getReceipt(hash: string): Promise<TransactionReceipt | null> {
		let receipt: TransactionReceipt | null | undefined = undefined;
		while (receipt === undefined) {
			try {
				receipt = await this.alchemyProvider.core.getTransactionReceipt(hash);
			} catch (err) {
				throw new Error(`Failed to fetch receipts, reason: ${err}.`);
			}
		}
		return receipt;
	}

	async getBlockReceipts(blockNumber: number): Promise<TransactionReceipt[] | null> {
		let receipts: TransactionReceipt[] | null;
		try {
			const response = await this.alchemyProvider.core.getTransactionReceipts({
				blockNumber: Converter.toBlockHex(blockNumber),
			});
			receipts = response.receipts;
		} catch (err) {
			throw new Error(`Failed to fetch receipts, reason: ${err}.`);
		}
		return receipts;
	}

	getTransfers(logs: ClassifiedEvent[]): Transfer[] {
		return logs
			.map((log) => {
				if (log.classifier.type !== "transfer") {
					return null;
				}
				return log.classifier.parse(log);
			})
			.filter((transfer: Transfer | null): transfer is Transfer => !!transfer);
	}

	async getBlockInternalTransfers({
		fromBlock,
		toBlock,
	}: {
		fromBlock: number;
		toBlock: number;
	}): Promise<AssetTransfersWithMetadataResult[]> {
		let pageKey: string | undefined = undefined;
		const transfers: AssetTransfersWithMetadataResult[] = [];
		do {
			const assetTransferResult: AssetTransfersWithMetadataResponse = await this.alchemyProvider.core.getAssetTransfers(
				{
					fromBlock: Converter.toBlockHex(fromBlock),
					toBlock: Converter.toBlockHex(toBlock),
					category: [AssetTransfersCategory.INTERNAL],
					withMetadata: true,
					excludeZeroValue: false,
					pageKey,
				},
			);
			pageKey = assetTransferResult.pageKey;
			transfers.push(...assetTransferResult.transfers);
		} while (pageKey);
		return transfers;
	}

	async getTxMapInternalTransfer(block: number): Promise<Record<string, AlchemyInternalTransfer[]>> {
		const transfers = await this.getBlockInternalTransfers({
			fromBlock: block,
			toBlock: block,
		});
		const map: Record<string, AlchemyInternalTransfer[]> = {};
		for (const t of transfers) {
			if (!map[t.hash]) {
				map[t.hash] = [];
				continue;
			}
			map[t.hash].push({
				txHash: t.hash,
				asset: t.asset ?? "",
				from: t.from,
				to: t.to ?? "",
				value: t.value ?? 0,
			});
		}
		return map;
	}

	async getMarkets(chainId: ChainId, logs: ClassifiedEvent[]): Promise<Market[]> {
		const markets: Market[] = [];
		const marketAddresses = new Set<string>();
		const callMap: Record<number, Call[]> = {};
		for (const log of logs) {
			if (log.classifier.type !== ClassifierType.REPAYMENT) {
				continue;
			}
			const address = this.getMarketAddress(log);
			if (marketAddresses.has(address)) {
				continue;
			}
			marketAddresses.add(address);
			const logCalls = log.classifier.market.getCalls(address);
			callMap[log.logIndex] = logCalls;
		}
		const ethcallProvider = new EthcallProvider(chainId, this.provider);
		const calls = Object.values(callMap).flat();
		const results = await ethcallProvider.tryAll(calls);
		let i = 0;
		for (const log of logs) {
			if (log.classifier.type !== ClassifierType.REPAYMENT) {
				continue;
			}
			const logCalls = callMap[log.logIndex];
			if (!logCalls) {
				continue;
			}
			const result = [];
			for (let j = 0; j < logCalls.length; j++) {
				result.push(results[i + j]);
			}
			i += logCalls.length;
			const address = this.getMarketAddress(log);
			const marketData = log.classifier.market.processCalls(chainId, address, result);
			if (!marketData) {
				continue;
			}
			const pool = getLendingPoolByAddress(chainId, log.classifier.protocol, marketData.poolAddress);
			if (!pool) {
				continue;
			}
			const market = {
				address: address.toLowerCase(),
				asset: marketData.asset || address,
				pool: {
					label: pool.label,
					address: marketData.poolAddress,
				},
			};
			markets.push(market);
		}
		return markets;
	}

	parseReceipts(receipts: TransactionReceipt[]): Log[] {
		return receipts.flatMap((receipt) => this.parseSingleTransactionLogs(receipt));
	}

	async getRawBlock(number: number): Promise<RawBlock> {
		let rawBlock: RawBlock | null = null;
		while (!rawBlock) {
			try {
				rawBlock = await this.provider.getBlock(number, true);
			} catch (err) {
				throw new Error(`Fetcher: Failed to get Block, error: ${err}`);
			}
		}
		return rawBlock;
	}

	private parseSingleTransactionLogs(receipt: TransactionReceipt): Log[] {
		const { from, logs, gasUsed, effectiveGasPrice, to } = receipt;
		return logs.map((log) => {
			const { transactionHash, transactionIndex, address, topics, logIndex, data, blockNumber, blockHash } = log;
			return {
				blockHash,
				blockNumber: Number(blockNumber),
				transactionFrom: from,
				transactionTo: to ?? "",
				transactionHash,
				transactionIndex,
				logIndex: Number(logIndex),
				gasUsed: BigInt(gasUsed.toString()),
				gasPrice: BigInt(effectiveGasPrice.toString()),
				address: address.toLowerCase(),
				topics,
				data,
			};
		});
	}

	private parseTransactionsLogs(receipts: TransactionReceipt[]): Log[] {
		const ret: Log[] = [];
		for (const receipt of receipts) {
			const logs = this.parseSingleTransactionLogs(receipt);
			ret.push(...logs);
		}
		return ret;
	}

	async getPools(chainId: ChainId, logs: ClassifiedEvent[]): Promise<Pool[]> {
		const pools: Pool[] = [];
		const poolIds = new Set<string>();
		const callMap: Record<number, Call[]> = {};
		for (const log of logs) {
			if (log.classifier.type !== "swap") {
				continue;
			}
			const id = this.getPoolId(log);
			if (poolIds.has(id)) {
				continue;
			}
			if (this.pools[id]) {
				const pool = this.pools[id];
				if (pool) {
					pools.push(pool);
					continue;
				}
			}
			poolIds.add(id);
			const logCalls = log.classifier.pool.getCalls(id);
			callMap[log.logIndex] = logCalls;
		}

		if (Object.keys(callMap).length === 0) {
			return pools;
		}
		const ethcallProvider = new EthcallProvider(chainId, this.provider);
		const calls = Object.values(callMap).flat();
		const results = await ethcallProvider.tryAll(calls);
		let i = 0;
		for (const log of logs) {
			if (log.classifier.type !== "swap") {
				continue;
			}
			const logCalls = callMap[log.logIndex];
			if (!logCalls) {
				continue;
			}
			const result = [];
			for (let j = 0; j < logCalls.length; j++) {
				result.push(results[i + j]);
			}
			i += logCalls.length;
			const poolData = log.classifier.pool.processCalls(result, log.address);
			if (!poolData) {
				continue;
			}
			const factory = getFactoryByAddress(chainId, log.classifier.protocol, poolData.factoryAddress);
			if (!factory) {
				continue;
			}
			const pool = {
				address: getPoolAddress(log).toLowerCase(),
				assets: poolData.assets,
				factory,
			};
			pools.push(pool);
			// add to cache
			const id = this.getPoolId(log);
			this.pools[id] = pool;
		}

		await this.repository.writePools(pools);

		return pools;
	}

	private getMarketAddress(log: ClassifiedEvent): string {
		return log.address;
	}

	private getPoolId(log: ClassifiedEvent): string {
		const type = log.classifier.type;
		if (type !== "swap" && type !== "liquidity_deposit" && type !== "liquidity_withdrawal") {
			return "";
		}
		if (log.classifier.protocol === "BalancerV2") {
			return log.values.poolId as string;
		}
		return log.address;
	}
}

export default Fetcher;

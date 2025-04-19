import { PrismaClient } from "@prisma/client";
import type { ArbitrageMevTx, LiquidationMevTx, SandwichMevTx, TxResponse } from "../api/dto/dto";
import { PrismaTxType, Repository } from "../repository/repository";
import type { Block } from "../types";
import { ServiceConverter } from "./converter";

export class MainService {
	private readonly repository: Repository;
	constructor(repository: Repository) {
		this.repository = repository;
	}

	async getTransaction(hash: string): Promise<TxResponse | ArbitrageMevTx | LiquidationMevTx | SandwichMevTx | null> {
		const transaction = await this.repository.getTransaction(hash);
		if (!transaction) {
			return null;
		}
		switch (transaction.type) {
			case PrismaTxType.Normal: {
				return ServiceConverter.convertTransaction(transaction.tx);
			}
			case PrismaTxType.Arbitrage: {
				return ServiceConverter.convertArbitrage(transaction.tx);
			}
			case PrismaTxType.Sandwich: {
				return ServiceConverter.convertSandwich(transaction.tx);
			}
			case PrismaTxType.Liquidation: {
				console.log(transaction.tx.assetMetadata);
				return ServiceConverter.convertLiquidation(transaction.tx);
			}
			default: {
				return null;
			}
		}
	}

	async getBlockWithTransactions(blockNumber: number): Promise<{
		block: Block;
		transactions: TxResponse[];
	} | null> {
		const response = await this.repository.getBlockWithTransactions(Number(blockNumber));
		if (!response) {
			return null;
		}
		return {
			block: response.block,
			transactions: response.transactions.map(ServiceConverter.convertTransaction),
		};
	}

	// async getOverview(): Promise<> {

	// }
}

async function main() {
	const prisma = new PrismaClient();
	const repository = new Repository(prisma);
	const service = new MainService(repository);
	await service.getTransaction("0x75199638833f25330e97a8dde49c9781921a002c391683ba3b05b69b74cb1a87");
}

main();

import type { ArbitrageMevTx, LiquidationMevTx, SandwichMevTx, TxResponse } from "../api/dto/dto";
import { PrismaTxType, type Repository } from "../repository/repository";
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
				return ServiceConverter.convertLiquidation(transaction.tx);
			}
			default: {
				return null;
			}
		}
	}
}

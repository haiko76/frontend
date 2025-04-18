import type { PrismaClient, sandwich, transfer } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import JSONBig from "json-bigint";
import { sha3 } from "../parser";
import {
	type Arbitrage,
	type BaseTxWithTraces,
	type Block,
	type FullArbitrage,
	type FullLiquidation,
	type FullSandwich,
	MevType,
	type Pool,
	type PrismaArbitrage,
	type PrismaLiquidation,
	type PrismaSandwich,
	type Protocol,
	type TokenMetadata,
	type Transaction,
	type Transfer,
} from "../types";
import { bigintToDecimal, decimalToBigInt } from "../utils/utils";

export type PrismaClientTx = Omit<
	PrismaClient,
	"$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

const DEFAULT_TIMEOUT = 10000;
const DEFAULT_MAX_WAIT = 5000;

export enum PrismaTxType {
	Normal = 0,
	Arbitrage = 1,
	Liquidation = 2,
	Sandwich = 3,
}
export type PrismaTxResponse =
	| {
			type: PrismaTxType.Normal;
			tx: Transaction;
	  }
	| {
			type: PrismaTxType.Arbitrage;
			tx: FullArbitrage;
	  }
	| {
			type: PrismaTxType.Sandwich;
			tx: FullSandwich;
	  }
	| {
			type: PrismaTxType.Liquidation;
			tx: FullLiquidation;
	  }
	| null;
export class Repository {
	protected readonly prisma: PrismaClient | PrismaClientTx;

	constructor(prisma: PrismaClient | PrismaClientTx) {
		this.prisma = prisma;
	}

	async getBlockWithTransactions(blockNumber: number): Promise<{
		block: Block;
		transactions: Transaction[];
	} | null> {
		const block = await this.prisma.block.findUnique({
			where: { number: blockNumber },
		});
		if (!block) {
			return null;
		}
		const transactions = await this.prisma.transaction.findMany({
			where: { block_number: blockNumber },
		});

		return {
			block: {
				hash: block.hash,
				number: block.number,
				timestamp: block.timestamp,
			},
			transactions: transactions.map((transaction) => ({
				blockNumber: transaction.block_number,
				hash: transaction.hash,
				from: transaction.from,
				to: transaction.to ?? "",
				index: transaction.index,
				gasPrice: decimalToBigInt(transaction.gas_price),
				gasUsed: decimalToBigInt(transaction.gas_used),
				label: (transaction.label as MevType) ?? null,
				timestamp: transaction.timestamp,
			})),
		};
	}

	async getTransaction(hash: string): Promise<PrismaTxResponse> {
		const res = await this.prisma.transaction.findUnique({
			where: { hash },
		});
		if (!res) {
			return null;
		}
		if (!res.label) {
			return {
				type: PrismaTxType.Normal,
				tx: {
					blockNumber: res.block_number,
					hash: res.hash,
					from: res.from,
					to: res.to ?? "",
					index: res.index,
					gasPrice: decimalToBigInt(res.gas_price),
					gasUsed: decimalToBigInt(res.gas_used),
					timestamp: res.timestamp,
				},
			};
		}
		const commonData = {
			timestamp: res.timestamp,
			from: res.from,
			to: res.to ?? "",
			transactionLogIndex: res.index,
		};
		switch (res.label as MevType) {
			case MevType.Arbitrage: {
				const arbTx: {
					transaction_hash: string;
					block_number: number;
					arbitrager: string;
					protocols: string[];
					profit_raw: string;
					cost_in_usd: number;
					profit_amount_in_usd: number;
					flash_loan_asset: string | null;
					flash_loan_amount: Decimal | null;
					flash_loan_in_usd: number | null;
					transfer_asset_id: string;
					transfer_sender: string;
					transfer_receiver: string;
					transfer_amount: Decimal;
					event_log_index: number;
				}[] = await this.prisma.$queryRaw`
					SELECT 
						a.transaction_hash,
						a.block_number,
						a.arbitrager,
						a.protocols,
						a.profit_raw,
						a.cost_in_usd,
						a.profit_amount_in_usd,
						a.flash_loan_asset,
						a.flash_loan_amount,
						a.flash_loan_in_usd,
						t.asset_id AS transfer_asset_id,
						t.from AS transfer_sender,
						t.to AS transfer_receiver,
						t.amount AS transfer_amount,
						t.event_log_index 
					FROM 
						mev_inspect.arbitrage a
					JOIN 
						mev_inspect.transfer t ON a.transaction_hash = t.transaction_hash
					WHERE 
						a.transaction_hash = ${hash}
					ORDER BY 
						t.event_log_index
				`;
				if (arbTx.length === 0) {
					return null;
				}
				let flashLoan = undefined;
				const tx = arbTx[0];
				if (tx.flash_loan_asset && tx.flash_loan_amount) {
					flashLoan = {
						flashLoanAsset: tx.flash_loan_asset,
						flashLoanAmount: decimalToBigInt(tx.flash_loan_amount),
						flashLoanInUsd: Number(tx.flash_loan_in_usd ?? 0),
					};
				}
				const arbRes: Omit<Arbitrage, "traces" | "cost"> = {
					blockNumber: tx.block_number,
					transactionHash: tx.transaction_hash,
					arbitrager: tx.arbitrager,
					profit: tx.profit_raw,
					profitInUsd: tx.profit_amount_in_usd,
					costInUsd: tx.cost_in_usd,
					protocols: tx.protocols,
					flashLoan: flashLoan,
				};
				return {
					type: PrismaTxType.Arbitrage,
					tx: {
						...arbRes,
						traces: arbTx.map((t) => ({
							eventLogIndex: t.event_log_index,
							from: t.transfer_sender,
							to: t.transfer_receiver,
							asset: t.transfer_asset_id,
							value: decimalToBigInt(t.transfer_amount),
						})),
						...commonData,
					},
				};
			}
			case MevType.Sandwich: {
				const sandwichTxs: sandwich[] = await this.prisma.$queryRaw`
					SELECT 
						block_number,
						sandwich_id,
						transaction_hash,
						transaction_log_index,
						type,
						sandwicher,
						profit_raw,
						profit_amount_in_usd,
						cost_in_usd,
						protocols
					FROM 
						mev_inspect.sandwich
					WHERE transaction_hash = ${hash}`;
				if (sandwichTxs.length === 0) {
					return null;
				}
				const { block_number, profit_amount_in_usd, cost_in_usd, sandwich_id, sandwicher, protocols } = sandwichTxs[0];
				console.log(sandwichTxs);
				const sandwichId = sandwich_id;
				console.log(sandwichId);
				const traces: transfer[] = await this.prisma.$queryRaw`
					SELECT * FROM mev_inspect.transfer 
					WHERE transaction_hash IN (
						SELECT transaction_hash 
						FROM mev_inspect.sandwich 
						WHERE sandwich_id=${sandwichId}
					)`;

				const tracesGroupedByTxHash: Record<string, transfer[]> = {};
				for (const t of traces) {
					if (!tracesGroupedByTxHash[t.transaction_hash]) {
						tracesGroupedByTxHash[t.transaction_hash] = [];
					}
					tracesGroupedByTxHash[t.transaction_hash].push(t);
				}
				console.log(tracesGroupedByTxHash);
				const frontTxs: BaseTxWithTraces[] = [];
				const backTxs: BaseTxWithTraces[] = [];
				const victimTxs: BaseTxWithTraces[] = [];
				for (const sandwich of sandwichTxs) {
					const sandwichType = sandwich.type;
					switch (sandwichType) {
						case "front": {
							frontTxs.push({
								txHash: sandwich.transaction_hash,
								transactionLogIndex: sandwich.transaction_log_index,
								traces: tracesGroupedByTxHash[sandwich.transaction_hash].map((t) => ({
									eventLogIndex: t.event_log_index,
									from: t.from,
									to: t.to ?? "",
									asset: t.asset_id,
									value: decimalToBigInt(t.amount ?? Decimal(0)),
								})),
							});
							break;
						}
						case "back": {
							backTxs.push({
								txHash: sandwich.transaction_hash,
								transactionLogIndex: sandwich.transaction_log_index,
								traces: tracesGroupedByTxHash[sandwich.transaction_hash].map((t) => ({
									eventLogIndex: t.event_log_index,
									from: t.from,
									to: t.to ?? "",
									asset: t.asset_id,
									value: decimalToBigInt(t.amount ?? Decimal(0)),
								})),
							});
							break;
						}
						case "victim": {
							victimTxs.push({
								txHash: sandwich.transaction_hash,
								transactionLogIndex: sandwich.transaction_log_index,
								traces: tracesGroupedByTxHash[sandwich.transaction_hash].map((t) => ({
									eventLogIndex: t.event_log_index,
									from: t.from,
									to: t.to ?? "",
									asset: t.asset_id,
									value: decimalToBigInt(t.amount ?? Decimal(0)),
								})),
							});
							break;
						}
					}
				}

				return {
					type: PrismaTxType.Sandwich,
					tx: {
						blockNumber: block_number,
						sandwicher: sandwicher,
						protocols: protocols,
						profitInUsd: Number(profit_amount_in_usd),
						costInUsd: Number(cost_in_usd),
						sandwichId: sandwichId,
						frontSwap: frontTxs,
						backSwap: backTxs,
						victimSwap: victimTxs,
						...commonData,
					},
				};
			}
			case MevType.Liquidation: {
				const liquidationTxs: {
					transaction_hash: string;
					block_number: number;
					payer: string;
					borrower: string;
					liquidator: string | null;
					asset_in_debt: string;
					debt_to_cover: Decimal;
					liquidation_amount: Decimal;
					asset_liquidated: string;
					protocols: string[];
					profit_amount_in_usd: number;
					cost_in_usd: number;
					repayment_amount_in_usd: Decimal;
					liquidated_amount_in_usd: Decimal;
					event_log_index: number;
					transfer_asset_id: string;
					transfer_sender: string;
					transfer_receiver: string;
					transfer_amount: Decimal;
				}[] = await this.prisma.$queryRaw`
					SELECT 
						l.transaction_hash,
						l.block_number,
						l.payer,
						l.borrower,
						l.liquidator,
						l.asset_in_debt,
						l.debt_to_cover,
						l.liquidation_amount,
						l.asset_liquidated,
						l.protocols,
						l.profit_amount_in_usd,
						l.cost_in_usd,
						l.repayment_amount_in_usd,
						l.liquidated_amount_in_usd,
						t.event_log_index,
						t.asset_id AS transfer_asset_id,
						t.from AS transfer_sender,
						t.to AS transfer_receiver,
						t.amount AS transfer_amount
					FROM 
						mev_inspect.liquidation l
					JOIN 
						mev_inspect.transfer t ON l.transaction_hash = t.transaction_hash
					WHERE 
						l.transaction_hash = ${hash}
					ORDER BY 
						t.event_log_index
				`;
				if (liquidationTxs.length === 0) {
					return null;
				}
				return {
					type: PrismaTxType.Liquidation,
					tx: {
						blockNumber: liquidationTxs[0].block_number,
						transactionHash: liquidationTxs[0].transaction_hash,
						payer: liquidationTxs[0].payer,
						borrower: liquidationTxs[0].borrower,
						liquidator: liquidationTxs[0].liquidator ?? "",
						protocols: liquidationTxs[0].protocols,
						assetInDebt: liquidationTxs[0].asset_in_debt,
						debtAmount: liquidationTxs[0].debt_to_cover,
						liquidatedAmount: liquidationTxs[0].liquidation_amount,
						liquidatedAsset: liquidationTxs[0].asset_liquidated,
						profitInUsd: Decimal(liquidationTxs[0].profit_amount_in_usd),
						costInUsd: Decimal(liquidationTxs[0].cost_in_usd),
						repaymentAmountInUsd: liquidationTxs[0].repayment_amount_in_usd,
						liquidatedAmountInUsd: liquidationTxs[0].liquidated_amount_in_usd,
						traces: liquidationTxs.map((t) => ({
							from: t.transfer_sender,
							to: t.transfer_receiver,
							asset: t.transfer_asset_id,
							value: decimalToBigInt(t.transfer_amount),
							eventLogIndex: t.event_log_index,
						})),
						...commonData,
					},
				};
			}
		}
	}

	async getTransactionsByBlockNumber(blockNumber: number): Promise<{
		block: Block;
		transactions: Transaction[];
	} | null> {
		const [txs, block] = await Promise.all([
			this.prisma.transaction.findMany({
				where: { block_number: blockNumber },
			}),
			this.prisma.block.findUnique({
				where: { number: blockNumber },
			}),
		]);
		if (!block || txs.length === 0) {
			return null;
		}
		const transactions = txs.map((transaction) => ({
			blockNumber: transaction.block_number,
			hash: transaction.hash,
			from: transaction.from,
			to: transaction.to ?? "",
			index: transaction.index,
			gasPrice: decimalToBigInt(transaction.gas_price),
			gasUsed: decimalToBigInt(transaction.gas_used),
			label: (transaction.label as MevType) ?? null,
			timestamp: transaction.timestamp,
		}));
		return {
			block: {
				hash: block.hash,
				number: block.number,
				timestamp: block.timestamp,
			},
			transactions,
		};
	}

	async getPoolsCache(): Promise<Record<string, Pool>> {
		const ret = await this.prisma.pool.findMany();
		const poolMap: Record<string, Pool> = {};
		ret.map((p) => {
			const pool = {
				address: p.address,
				protocol: p.protocol as unknown as Protocol,
				factory: {
					label: p.protocol,
					address: p.factory_address,
				},
				assets: p.assets,
			};
			// cache
			poolMap[p.address] = pool;
			return pool;
		});
		return poolMap;
	}

	async getTokenMetadataCache(priceToBlock?: number): Promise<Record<string, TokenMetadata>> {
		const tokenMetadata = await this.prisma.token.findMany();
		const tokenMetadataMap: Record<string, TokenMetadata> = {};
		for (const token of tokenMetadata) {
			tokenMetadataMap[token.address] = {
				address: token.address,
				symbol: token.symbol ?? "",
				decimals: token.decimals,
			};
		}

		const tokenPrice = await this.prisma.erc20_historical_price.findMany({
			where: {
				to_block: priceToBlock,
			},
		});
		for (const price of tokenPrice) {
			const token = tokenMetadataMap[price.token_address];
			if (token) {
				tokenMetadataMap[price.token_address] = {
					...token,
					price: {
						rate: Number(price.price),
						currency: "usd",
						toBlock: price.to_block,
					},
				};
			}
		}
		return tokenMetadataMap;
	}
}

export class RepositoryWriteInTransaction extends Repository {
	async writeBlock(block: Block): Promise<void> {
		await this.prisma.block.create({
			data: {
				number: block.number,
				hash: block.hash,
				timestamp: block.timestamp,
			},
		});
	}

	async writeTransactions(transactions: Transaction[]): Promise<void> {
		if (transactions.length === 0) {
			return;
		}
		const prismaTransactions = transactions.map((transaction) => ({
			block_number: transaction.blockNumber,
			from: transaction.from,
			hash: transaction.hash,
			index: transaction.index,
			gas_used: bigintToDecimal(transaction.gasUsed),
			gas_price: bigintToDecimal(transaction.gasPrice),
			to: transaction.to,
			label: null,
			timestamp: transaction.timestamp,
		}));
		await this.prisma.transaction.createMany({
			data: prismaTransactions,
			skipDuplicates: true,
		});
	}

	async writePools(pools: Pool[]): Promise<void> {
		if (pools.length === 0) {
			return;
		}
		const prismaPools = pools.map((pool) => ({
			address: pool.address,
			protocol: pool.factory.label,
			assets: pool.assets,
			factory_address: pool.factory.address,
		}));
		await this.prisma.pool.createMany({
			data: prismaPools,
			skipDuplicates: true,
		});
	}

	async writeTransfers(transfers: Transfer[]): Promise<void> {
		const prismaSwaps = transfers.map((t) => ({
			block_number: t.blockNumber,
			transaction_hash: t.transaction.hash,
			event_log_index: t.event.logIndex,
			from: t.from,
			to: t.to,
			asset_id: t.asset,
			amount: bigintToDecimal(t.value),
		}));
		await this.prisma.transfer.createMany({
			data: prismaSwaps,
			skipDuplicates: true,
		});
	}

	async writeArbitrage(arbitrages: PrismaArbitrage[]): Promise<void> {
		const prismaArb = [];
		const arbitrageHashes: string[] = [];
		if (arbitrages.length === 0) {
			return;
		}

		for (const a of arbitrages) {
			const flashLoan = a.flashLoan;
			if (flashLoan) {
				prismaArb.push({
					block_number: a.blockNumber,
					transaction_hash: a.transactionHash,
					arbitrager: a.arbitrager,
					protocols: a.protocols,
					flash_loan_asset: flashLoan.flashLoanAsset,
					flash_loan_amount: flashLoan.flashLoanAmount,
					flash_loan_in_usd: flashLoan.flashLoanInUsd,
					profit_raw: JSONBig.parse(a.profit),
					profit_amount_in_usd: a.profitInUsd,
					cost_in_usd: Decimal(a.costInUsd),
				});
			} else {
				prismaArb.push({
					block_number: a.blockNumber,
					transaction_hash: a.transactionHash,
					arbitrager: a.arbitrager,
					protocols: a.protocols,
					profit_raw: JSONBig.parse(a.profit),
					profit_amount_in_usd: a.profitInUsd,
					cost_in_usd: a.costInUsd,
				});
			}
			arbitrageHashes.push(a.transactionHash);
		}
		try {
			await this.prisma.arbitrage.createMany({
				data: prismaArb,
				skipDuplicates: true,
			});
			await this.prisma.transaction.updateMany({
				where: { hash: { in: arbitrageHashes } },
				data: { label: MevType.Arbitrage },
			});
		} catch (err) {
			throw new Error(`Cannot parse arbitrage, tx: ${arbitrages[0].transactionHash}, error: ${err}`);
		}
	}

	async writeTokenMetadata(tokenMetadata: TokenMetadata[]): Promise<void> {
		const prismaTokens = [];
		const prismaPrice = [];
		if (tokenMetadata.length === 0) {
			return;
		}
		for (const metadata of tokenMetadata) {
			prismaTokens.push({
				address: metadata.address,
				symbol: metadata.symbol,
				decimals: metadata.decimals,
			});
			if (metadata.price) {
				prismaPrice.push({
					token_address: metadata.address,
					currency: metadata.price?.currency,
					price: Decimal(metadata.price?.rate),
					to_block: Number(metadata.price?.toBlock),
					timestamp: metadata.price.timestamp,
				});
			}
		}

		await this.prisma.token.createMany({
			data: prismaTokens,
			skipDuplicates: true,
		});
		if (prismaPrice.length > 0) {
			await this.prisma.erc20_historical_price.createMany({
				data: prismaPrice,
				skipDuplicates: true,
			});
		}
	}

	async writeSandwich(sandwiches: PrismaSandwich[]): Promise<void> {
		if (sandwiches.length === 0) {
			return;
		}
		const prismaSandwiches = [];
		const prismaSwaps = [];
		const sandwichHashes: string[] = [];
		for (const sandwich of sandwiches) {
			for (const s of sandwiches) {
				const swaps = [...s.frontSwap, ...s.victimSwap, ...s.backSwap];
				const hashes = swaps.map((swap) => {
					sandwichHashes.push(swap.hash);
					return swap.hash;
				});
				const sandwichId = sha3(hashes.join(""));
				for (const swap of swaps) {
					prismaSandwiches.push({
						block_number: sandwich.blockNumber,
						transaction_hash: swap.hash,
						type: swap.type,
						sandwicher: sandwich.sandwicher,
						victim: swap.type === "victim" ? swap.from : null,
						sandwich_id: sandwichId,
						protocols: sandwich.protocols,
						profit_raw: JSONBig.parse(sandwich.profit),
						profit_amount_in_usd: sandwich.profitInUsd,
						cost_in_usd: sandwich.costInUsd,
						transaction_log_index: swap.transactionLogIndex,
					});
					prismaSwaps.push({
						event_log_index: swap.eventLogIndex,
						block_number: swap.blockNumber,
						transaction_hash: swap.hash,
						asset_in: swap.assetIn,
						asset_out: swap.assetOut,
						from: swap.from,
						to: swap.to,
						amount_in: bigintToDecimal(swap.amountIn),
						amount_out: bigintToDecimal(swap.amountOut),
						protocol: swap.protocol,
						metadata: swap.metadata ? JSONBig.parse(JSONBig.stringify(swap.metadata)) : null,
					});
				}
			}
		}
		await Promise.all([
			this.prisma.sandwich.createMany({
				data: prismaSandwiches,
				skipDuplicates: true,
			}),
			this.prisma.transaction.updateMany({
				where: { hash: { in: sandwichHashes } },
				data: { label: MevType.Sandwich },
			}),
			this.prisma.swap.createMany({
				data: prismaSwaps,
				skipDuplicates: true,
			}),
		]);
	}

	async writeLiquidation(liquidations: PrismaLiquidation[]): Promise<void> {
		if (liquidations.length === 0) {
			return;
		}
		const prismaLiquidations = [];
		const liquidationHashes: string[] = [];
		for (const liquidation of liquidations) {
			liquidationHashes.push(liquidation.transactionHash);
			prismaLiquidations.push({
				block_number: liquidation.blockNumber,
				transaction_hash: liquidation.transactionHash,
				payer: liquidation.payer,
				borrower: liquidation.borrower,
				liquidator: liquidation.liquidator,
				asset_in_debt: liquidation.assetInDebt,
				debt_to_cover: liquidation.debtAmount,
				liquidated_amount: liquidation.liquidatedAmount,
				asset_liquidated: liquidation.liquidatedAsset,
				protocols: liquidation.protocols,
				profit_amount_in_usd: liquidation.profitInUsd,
				repayment_amount_in_usd: liquidation.repaymentAmountInUsd,
				liquidated_amount_in_usd: liquidation.liquidatedAmountInUsd,
				cost_in_usd: liquidation.costInUsd,
			});
		}

		Promise.all([
			this.prisma.liquidation.createMany({
				data: prismaLiquidations,
				skipDuplicates: true,
			}),
			this.prisma.transaction.updateMany({
				where: { hash: { in: liquidationHashes } },
				data: { label: MevType.Liquidation },
			}),
		]);
	}
}

export class RepositoryWrite extends RepositoryWriteInTransaction {
	private readonly fullPrisma: PrismaClient;

	constructor(prisma: PrismaClient) {
		super(prisma);
		this.fullPrisma = prisma;
	}

	async transaction(
		fn: (repo: RepositoryWriteInTransaction) => Promise<void>,
		options?: { timeout?: number; maxWait?: number },
	): Promise<void> {
		const { timeout, maxWait } = options ?? {};
		return this.fullPrisma.$transaction((txPrisma: PrismaClientTx) => fn(new RepositoryWriteInTransaction(txPrisma)), {
			timeout: timeout ?? DEFAULT_TIMEOUT,
			maxWait: maxWait ?? DEFAULT_MAX_WAIT,
		});
	}
}

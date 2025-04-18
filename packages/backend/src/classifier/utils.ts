import type { Transfer } from "../types";

export function getLatestPoolTransfer(pool: string, logIndex: number, transfers: Transfer[]): Transfer | null {
	const allTransfersToPool = transfers.filter((transfer) => transfer.to === pool);
	const previousTransfers = allTransfersToPool.filter((transfer) => transfer.event.logIndex < logIndex);
	previousTransfers.sort((a, b) => b.event.logIndex - a.event.logIndex);
	return previousTransfers[0];
}

import { PrismaClient } from "@prisma/client";
import { RepositoryWrite } from "../repository/repository";
type Result = {
	block_number: number;
	tx_index: number;
	mev_type: string;
	protocol: string;
	user_loss_usd: null | number;
	extractor_profit_usd: null | number;
	user_swap_volume_usd: number;
	user_swap_count: number;
	extractor_swap_volume_usd: null | number;
	extractor_swap_count: null | number;
	imbalance: null | number;
	address_from: string;
	address_to: string;
	arrival_time_us: string | null;
	arrival_time_eu: string | null;
	arrival_time_as: string | null;
};
// Define the function to get MEV block data using fetch
async function getMevBlockData(blockNumber: number, count: number = 1): Promise<Result[]> {
	const url = `https://data.zeromev.org/v1/mevBlock?block_number=${blockNumber}&count=${count}`;

	try {
		// Make the GET request using fetch
		const response = await fetch(url, {
			method: "GET",
			headers: {
				accept: "application/json",
			},
		});

		// Check if the response status is OK (200)
		if (!response.ok) {
			throw new Error(`Error: ${response.status} - ${response.statusText}`);
		}

		// Parse the JSON response
		const data = await response.json();
		return data;
	} catch (error) {
		// Handle any errors
		throw new Error(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
	}
}
export type TestSandwich = {
	block_number: bigint;
	mev_type: string;
	protocol: string;
	address_from: string;
	address_to: string;
	tx_index: number;
};
async function main() {
	const prisma = new PrismaClient();
	// biome-ignore lint/correctness/noUnusedVariables: <explanation>
	const repository = new RepositoryWrite(prisma);
	for (let i = 16317864; i < 16320291; i += 100) {
		const mev = await getMevBlockData(i, 100);
		const res: TestSandwich[] = [];
		const filteredRes = mev.filter(
			(m) => m.mev_type === "backrun" || m.mev_type === "sandwich" || m.mev_type === "frontrun",
		);
		for (const m of filteredRes) {
			res.push({
				block_number: BigInt(m.block_number),
				mev_type: m.mev_type,
				protocol: m.protocol,
				address_from: m.address_from,
				address_to: m.address_to,
				tx_index: m.tx_index,
			});
		}
		// await repository.writeTestSandwich(res);
	}
}

main();

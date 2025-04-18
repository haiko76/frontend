import { PrismaClient } from "@prisma/client";
import { onShutdown } from "../src/utils/shutdown";

export async function newPostgres(url: string): Promise<PrismaClient> {
	const client = new PrismaClient({
		datasources: {
			db: {
				url,
			},
		},
		log: [
			{ emit: "stdout", level: "error" },
			{ emit: "stdout", level: "warn" },
			{ emit: "stdout", level: "info" },
			{ emit: "event", level: "query" },
		],
	});
	// make sure db is connectable
	await client.$connect();

	onShutdown(() => client.$disconnect());

	return client;
}

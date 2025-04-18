import cors from "@fastify/cors";
import fastifyRateLimit from "@fastify/rate-limit";
import { PrismaClient } from "@prisma/client";
import fastify from "fastify";
import { Repository } from "../repository/repository";
import { MainService } from "../service/main.service";

const API_PREFIX = "/api/v1";
const ROUTES = {
	MEV: {
		TRANSACTION: "/mev/tx/:hash",
		BLOCK: "/mev/block/:block",
		OVERVIEW: "/mev/overview/",
		TYPES: {
			SANDWICH: "/mev/sandwich/",
			LIQUIDATION: "/mev/liquidation/",
			ARBITRAGE: "/mev/arbitrage/",
		},
	},
	ADDRESS: "/address/:address",
};

const app = fastify({
	logger: {
		transport: {
			target: "pino-pretty",
			options: {
				translateTime: "SYS:standard",
				ignore: "pid,hostname",
				colorize: true,
			},
		},
	},
});

app.register(cors);

app.register(fastifyRateLimit, {
	max: 100,
	timeWindow: "1 minute",
	cache: 1000 * 60 * 15,
});

async function main() {
	const prisma = new PrismaClient();
	const repository = new Repository(prisma);
	const service = new MainService(repository);

	app.get(`${API_PREFIX}${ROUTES.MEV.BLOCK}`, async (request, response) => {
		if (!request.params) {
			return response.status(400).send({ error: "Invalid query parameters" });
		}
		const param = request.params as { block: number };
		const block = await repository.getBlockWithTransactions(param.block);
		response.status(200).send(block);
	});

	app.get(`${API_PREFIX}${ROUTES.MEV.TRANSACTION}`, async (request, response) => {
		if (!request.params) {
			return response.status(400).send({ error: "Invalid query parameters" });
		}
		const param = request.params as { hash: string };
		const transaction = await service.getTransaction(param.hash);
		if (transaction) {
			return response.status(200).send(transaction);
		}
	});

	await app.listen({ port: 8080 });
	app.log.info(`Server listening on ${app.server.address()}`);
}

void main();

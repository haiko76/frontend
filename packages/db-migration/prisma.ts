import fs from "node:fs/promises";
import path from "node:path";

const PRISMA_SCHEMA = path.resolve(__dirname, "../prisma/schema.prisma");
const PRISMA_PART_FILES = [path.resolve(__dirname, "../prisma/mev_inspect.prisma")];

const PRISMA_CLIENT = `generator client {
  provider = "prisma-client-js"
  previewFeatures = ["multiSchema"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  schemas  = ["public"]
}
`;

const REGEX_MODEL = /model\s\w+\b(?<!\bschema_migrations).*(\n\s.*)*\n}/gm;

async function main(): Promise<void> {
	await fs.writeFile(PRISMA_SCHEMA, PRISMA_CLIENT + "\n");

	for (const file of PRISMA_PART_FILES) {
		const content = await fs.readFile(file, "utf-8");
		const models = content.match(REGEX_MODEL);

		if (models) {
			for (const model of models) {
				await fs.appendFile(PRISMA_SCHEMA, model + "\n\n");
			}

			console.log(`${file} "prisma generate" ${models.length} "models"`);
		}
	}
}

void main();

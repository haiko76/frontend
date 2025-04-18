import { Network } from "alchemy-sdk";
import type { RepositoryWrite } from "../../repository/repository";
import type { TokenMetadata } from "../../types";
import { convertToRoundDay } from "../../utils/utils";

const apiKey = "W_WcrKxHTKNMw7fJEvpfpPIEhi_2d6Jx";

export class AlchemyAPI {
	private readonly priceUrl = `https://api.g.alchemy.com/prices/v1/${apiKey}/tokens/historical`;
	private readonly tokenMetadataUrl = `https://${Network.ETH_MAINNET}.g.alchemy.com/v2/${apiKey}`;
	private readonly repository: RepositoryWrite;

	constructor(repository: RepositoryWrite) {
		this.repository = repository;
	}

	async getTokenMetadata(addresses: string[], timestamp: Date, block: number): Promise<Record<string, TokenMetadata>> {
		const tokensMetadata: TokenMetadata[] = [];
		const startTime = convertToRoundDay(timestamp);
		const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
		for (const addr of addresses) {
			const priceOptions = {
				method: "POST",
				headers: { accept: "application/json", "content-type": "application/json" },
				body: JSON.stringify({
					network: Network.ETH_MAINNET,
					address: addr.toLowerCase(),
					startTime: startTime.toISOString(),
					endTime: endTime.toISOString(),
					withMarketData: false,
					interval: "1d",
				}),
			};

			const metadataOptions = {
				method: "POST",
				headers: { accept: "application/json", "content-type": "application/json" },
				body: JSON.stringify({
					id: 1,
					jsonrpc: "2.0",
					method: "alchemy_getTokenMetadata",
					params: [addr],
				}),
			};
			const priceRes = await fetch(this.priceUrl, priceOptions);
			if (!priceRes.ok) {
				console.log(`Error fetching price for ${addr}: ${priceRes.statusText}`);
				continue;
			}
			const metadataRes = await fetch(this.tokenMetadataUrl, metadataOptions);
			if (!metadataRes.ok) {
				console.log(`Error fetching metadata for ${addr}: ${metadataRes.statusText}`);
				continue;
			}

			const price = await priceRes.json();
			const metadata = (await metadataRes.json()).result;
			if (!price.data[0] || !metadata.decimals) {
				continue;
			}
			const rate = Number(price.data[0].value);
			const latestUpdateAt = new Date(price.data[0].timestamp);
			tokensMetadata.push({
				symbol: metadata.symbol,
				decimals: metadata.decimals,
				address: price.address,
				price: {
					rate,
					currency: price.currency,
					timestamp: latestUpdateAt,
					toBlock: block,
				},
				logo: metadata.logo,
			});
		}
		await this.repository.transaction(async (repo) => {
			await repo.writeTokenMetadata(tokensMetadata);
		});
		const ret: Record<string, TokenMetadata> = {};
		for (const token of tokensMetadata) {
			ret[token.address] = token;
		}
		return ret;
	}
}

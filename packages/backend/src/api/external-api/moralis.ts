import type { RepositoryWrite } from "../../repository/repository";
import type { ChainId, TokenMetadata } from "../../types";

const MORALIS_API_KEY = "";
const PATH = {
	TOKEN_PRICE: "erc20/prices",
};

const chainMap: Record<number, string> = {
	1: "eth",
};

type MoralisTokenPriceResponse = {
	tokenName: string;
	tokenSymbol: string;
	tokenDecimals: string;
	usdPrice: number;
	tokenAddress: string;
	toBlock: number;
};

export class MoralisAPI {
	private readonly urlPrefix = "https://deep-index.moralis.io/api/v2.2/";
	private readonly repository: RepositoryWrite;

	constructor(repository: RepositoryWrite) {
		this.repository = repository;
	}

	async fetchTokenMetadata(options: {
		chainId: ChainId;
		tokenAddresses: string[];
		toBlock?: number;
		abortSignal?: AbortSignal;
	}): Promise<Record<string, TokenMetadata>> {
		const { chainId, tokenAddresses, toBlock, abortSignal } = options;
		const params: URLSearchParams = new URLSearchParams();
		params.set("chain", chainMap[chainId]);
		const url = `${this.urlPrefix}${PATH.TOKEN_PRICE}/?${params.toString()}`;

		const tokenPrices: MoralisTokenPriceResponse[] = [];
		try {
			for (let i = 0; i < tokenAddresses.length; i += 10) {
				const tokenAddressesBatch = tokenAddresses.slice(i, i + 10);
				const reqBodyBatch = {
					tokens: tokenAddressesBatch.map((addr) => {
						return {
							token_address: addr.toLowerCase(),
							to_block: toBlock,
						};
					}),
				};

				const response = await fetch(url, {
					method: "POST",
					headers: {
						"X-API-Key": MORALIS_API_KEY,
						"Content-Type": "application/json",
					},
					body: JSON.stringify(reqBodyBatch),
					signal: abortSignal,
				});
				if (!response.ok) {
					throw new Error(`Error fetching token prices: ${response.statusText}`);
				}
				const data = await response.json();
				tokenPrices.push(...data);
			}
		} catch (error) {
			console.error(`MoralisAPI: Error fetching token prices, error ${error}`);
		}
		const tokenMetadata: TokenMetadata[] = tokenPrices.map((tokenPrice) => ({
			address: tokenPrice.tokenAddress.toLowerCase(),
			symbol: tokenPrice.tokenSymbol,
			decimals: Number(tokenPrice.tokenDecimals),
			price: {
				rate: tokenPrice.usdPrice,
				currency: "usd",
				toBlock: tokenPrice.toBlock,
			},
		}));
		await this.repository.transaction(async (repo) => {
			await repo.writeTokenMetadata(tokenMetadata);
		});

		const ret: Record<string, TokenMetadata> = {};
		for (const token of tokenMetadata) {
			ret[token.address] = token;
		}
		return ret;
	}
}

import type { AlchemySettings, Network } from "alchemy-sdk";

export function getAlchemyConfig(networkId: Network): AlchemySettings {
	return {
		apiKey: process.env.ALCHEMY_API_KEY || "W_WcrKxHTKNMw7fJEvpfpPIEhi_2d6Jx",
		network: networkId,
	};
}

import type { ChainId, Factory, LendingPool, LendingProtocol, Router, SwapProtocol } from "../../types";
import { LENDING_PROTOCOL_ADDRESS, SWAP_PROTOCOL_ADDRESS } from "./const";

export type DexType = {
	chainId: ChainId;
	dexName: string;
};

export function dexClassifier(chainId: ChainId, address: string[]): DexType[] {
	const normalizeAddresses = address.map((a) => a.toLowerCase());

	const dexes = SWAP_PROTOCOL_ADDRESS[chainId];
	const lendingProtocol = LENDING_PROTOCOL_ADDRESS[chainId];

	if (!dexes && !lendingProtocol) {
		return [];
	}

	const result: DexType[] = [];

	for (const [dexName, contracts] of Object.entries(dexes)) {
		for (const contractAddress of Object.values(contracts)) {
			contractAddress.map((addr) => {
				if (normalizeAddresses.includes(addr.toLowerCase())) {
					result.push({
						chainId: chainId,
						dexName,
					});
				}
			});
		}
	}
	for (const [lendingProtocolName, contracts] of Object.entries(lendingProtocol)) {
		for (const contractAddress of Object.values(contracts)) {
			contractAddress.map((addr) => {
				if (normalizeAddresses.includes(addr.toLowerCase())) {
					result.push({
						chainId: chainId,
						dexName: lendingProtocolName,
					});
				}
			});
		}
	}

	return result;
}

export function getFactoryByAddress(chainId: ChainId, protocol: SwapProtocol, address: string): Factory | undefined {
	const protocolFactories = SWAP_PROTOCOL_ADDRESS[chainId][protocol];
	if (!protocolFactories) {
		return undefined;
	}
	if (protocolFactories["factory"]) {
		const normalizedFactoryAddress = protocolFactories["factory"];
		const normalizedAddress = address.toLowerCase();
		for (const addr of normalizedFactoryAddress) {
			if (addr.toLowerCase() === normalizedAddress) {
				return {
					label: protocol,
					address: addr.toLowerCase(),
				};
			}
		}
	}
	return undefined;
}

export function getProtocolContractAddress(
	chainId: ChainId,
	protocolName: SwapProtocol,
	type: string,
): Factory | undefined {
	const protocolFactories = SWAP_PROTOCOL_ADDRESS[chainId][protocolName];
	if (protocolFactories[type]) {
		if (type === "factory") {
			return {
				label: protocolName,
				address: protocolFactories[type][0].toLowerCase(),
			};
		} else if (type === "vault") {
			return {
				label: protocolName,
				address: protocolFactories[type][0].toLowerCase(),
			};
		}
	}
	return undefined;
}

export function isKnownRouter(chainId: ChainId, address: string): Router | undefined {
	const protocols = SWAP_PROTOCOL_ADDRESS[chainId];
	for (const [protocol, addresses] of Object.entries(protocols)) {
		for (const [type, addrs] of Object.entries(addresses)) {
			if (type === "router" && addrs.includes(address.toLowerCase())) {
				return {
					label: protocol,
					address: address,
				};
			}
		}
	}
	return undefined;
}

export function getAllDexAddresses(): string[] {
	const addresses: string[] = [];

	for (const chainId in SWAP_PROTOCOL_ADDRESS) {
		const dexes = SWAP_PROTOCOL_ADDRESS[Number(chainId)];

		for (const dex in dexes) {
			const components = dexes[dex];
			for (const component in components) {
				const componentAddresses = components[component];
				addresses.push(...componentAddresses);
			}
		}
	}
	return addresses;
}

export function getLendingPoolByAddress(
	chainId: ChainId,
	protocol: LendingProtocol,
	poolAddress: string,
): LendingPool | null {
	const dexes = LENDING_PROTOCOL_ADDRESS[chainId][protocol];
	if (!dexes) {
		return null;
	}
	const pools = dexes.pool;
	for (const component of pools) {
		if (component === poolAddress.toLowerCase()) {
			return {
				addresses: pools,
				label: protocol,
			};
		}
	}
	return null;
}

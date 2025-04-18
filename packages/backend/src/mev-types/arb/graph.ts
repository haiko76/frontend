import type { Address, Asset, Transfer } from "../../types";

/**
 * The directed graph based on the transfers with edges are the transfers and nodes are the direction addresses.
 */
export class DirectedGraph {
	private adjacencyList: Map<Address, Set<Address>>;
	private nodes: Set<Address>;
	private transferTable: Map<Address, Map<Asset, bigint>>;
	public transfers: Transfer[];

	constructor() {
		this.adjacencyList = new Map();
		this.nodes = new Set();
		this.transfers = [];
		this.transferTable = new Map();
	}

	getTransferData(address: Address): Map<Asset, bigint> | undefined {
		return this.transferTable.get(address);
	}

	addNode(address: Address): void {
		if (!this.nodes.has(address)) {
			this.nodes.add(address);
			this.adjacencyList.set(address, new Set());
			this.transferTable.set(address, new Map());
		}
	}

	addEdge(from: Address, to: Address): void {
		this.addNode(from);
		this.addNode(to);
		this.adjacencyList.get(from)!.add(to);
	}

	addTransfer(transfer: Transfer): void {
		this.transfers.push(transfer);
		this.addNode(transfer.from);
		this.addNode(transfer.to);
		this.addEdge(transfer.from, transfer.to);

		const fromBalances = this.transferTable.get(transfer.from)!;
		const currentFromBalance = fromBalances.get(transfer.asset) || 0n;
		fromBalances.set(transfer.asset, currentFromBalance - transfer.value);

		const toBalances = this.transferTable.get(transfer.to)!;
		const currentToBalance = toBalances.get(transfer.asset) || 0n;

		toBalances.set(transfer.asset, currentToBalance + transfer.value);
	}

	/**
	 * Reference: https://en.wikipedia.org/wiki/Kosaraju%27s_algorithm
	 * @returns The strongly connected components in the graph.
	 */
	findSCCs(): Address[][] {
		const visited = new Set<Address>();
		const stack: Address[] = [];
		const sccs: Address[][] = [];

		for (const node of this.nodes) {
			if (!visited.has(node)) {
				this.fillOrder(node, visited, stack);
			}
		}

		// Create a transposed graph (reverse all edges)
		const transposed = this.getTranspose();

		// Reset visited set for second DFS
		visited.clear();

		// Second DFS on transposed graph in order of finish times
		while (stack.length > 0) {
			const node = stack.pop()!;
			if (!visited.has(node)) {
				const scc: Address[] = [];
				transposed.dfsUtil(node, visited, scc);
				if (scc.length > 1) {
					sccs.push(scc);
				}
			}
		}

		return sccs;
	}

	private fillOrder(node: Address, visited: Set<Address>, stack: Address[]): void {
		visited.add(node);

		const neighbors = this.adjacencyList.get(node) || new Set();
		for (const neighbor of neighbors) {
			if (!visited.has(neighbor)) {
				this.fillOrder(neighbor, visited, stack);
			}
		}

		stack.push(node);
	}

	private getTranspose(): DirectedGraph {
		const transposed = new DirectedGraph();

		for (const node of this.nodes) {
			transposed.addNode(node);
		}

		for (const [node, neighbors] of this.adjacencyList.entries()) {
			for (const neighbor of neighbors) {
				transposed.addEdge(neighbor, node);
			}
		}

		return transposed;
	}

	private dfsUtil(node: Address, visited: Set<Address>, component: Address[]): void {
		visited.add(node);
		component.push(node);

		const neighbors = this.adjacencyList.get(node) || new Set();
		for (const neighbor of neighbors) {
			if (!visited.has(neighbor)) {
				this.dfsUtil(neighbor, visited, component);
			}
		}
	}

	findShortestPath(from: Address, to: Address): Address[] {
		if (!this.nodes.has(from) || !this.nodes.has(to)) {
			return [];
		}

		const visited = new Set<Address>();
		const queue: { node: Address; path: Address[] }[] = [];

		queue.push({ node: from, path: [from] });
		visited.add(from);

		while (queue.length > 0) {
			const { node, path } = queue.shift()!;

			if (node === to) {
				return path;
			}

			for (const neighbor of this.adjacencyList.get(node)!) {
				if (!visited.has(neighbor)) {
					visited.add(neighbor);
					queue.push({ node: neighbor, path: [...path, neighbor] });
				}
			}
		}

		return [];
	}

	findClosestPointInSCC(address: Address, scc: Address[]): Address {
		if (scc.includes(address)) {
			return address;
		}

		let closestNode = scc[0];
		let shortestDistance = Number.POSITIVE_INFINITY;

		for (const node of scc) {
			const path = this.findShortestPath(address, node);
			if (path.length > 0 && path.length < shortestDistance) {
				shortestDistance = path.length;
				closestNode = node;
			}
		}

		return closestNode;
	}
}

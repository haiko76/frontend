"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
	BarElement,
	CategoryScale,
	Chart as ChartJS,
	Legend,
	LineElement,
	LinearScale,
	PointElement,
	Title,
	Tooltip,
} from "chart.js";
import Link from "next/link";

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, Title, Tooltip, Legend, PointElement);

// Mock data
const addressSummary = {
	type: "Arbitrage",
	timestamp: "2024-02-21 10:30:15",
	from: "0xae2Fc483527B8EF99EB5D9B44875F005ba1FaE13",
	to: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
	address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
	profit: 0.5,
	cost: 0.2,
	revenue: 0.3,
	blockNumber: 12345678,
	index: 1,
};

const transactionDetails = [
	{
		address: "0x1f2F10D1C40777AE1Da742455c65828FF36Df387",
		asset1: "0.0001",
		asset2: "0.02",
		protocol: "Uniswap",
		sender: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
	},
	{
		address: "0x2a3F10D1C40777AE1Da742455c65828FF36Df388",
		asset1: "0.0002",
		asset2: "0.03",
		protocol: "SushiSwap",
		sender: "0x852d35Cc6634C0532925a3b844Bc454e4438f44f",
	},
	{
		address: "0x3b4F10D1C40777AE1Da742455c65828FF36Df389",
		asset1: "0.0003",
		asset2: "0.04",
		protocol: "Balancer",
		sender: "0x962d35Cc6634C0532925a3b844Bc454e4438f450",
	},
	{
		address: "0x4c5F10D1C40777AE1Da742455c65828FF36Df390",
		asset1: "0.0004",
		asset2: "0.05",
		protocol: "Curve",
		sender: "0xa62d35Cc6634C0532925a3b844Bc454e4438f451",
	},
	{
		address: "0x5d6F10D1C40777AE1Da742455c65828FF36Df391",
		asset1: "0.0005",
		asset2: "0.06",
		protocol: "Uniswap",
		sender: "0xb72d35Cc6634C0532925a3b844Bc454e4438f452",
	},
	{
		address: "0x6e7F10D1C40777AE1Da742455c65828FF36Df392",
		asset1: "0.0006",
		asset2: "0.07",
		protocol: "SushiSwap",
		sender: "0xc82d35Cc6634C0532925a3b844Bc454e4438f453",
	},
	{
		address: "0x7f8F10D1C40777AE1Da742455c65828FF36Df393",
		asset1: "0.0007",
		asset2: "0.08",
		protocol: "Balancer",
		sender: "0xd92d35Cc6634C0532925a3b844Bc454e4438f454",
	},
	{
		address: "0x8g9F10D1C40777AE1Da742455c65828FF36Df394",
		asset1: "0.0008",
		asset2: "0.09",
		protocol: "Curve",
		sender: "0xeA2d35Cc6634C0532925a3b844Bc454e4438f455",
	},
	{
		address: "0x9h0F10D1C40777AE1Da742455c65828FF36Df395",
		asset1: "0.0009",
		asset2: "0.10",
		protocol: "Uniswap",
		sender: "0xfB2d35Cc6634C0532925a3b844Bc454e4438f456",
	},
	{
		address: "0x0i1F10D1C40777AE1Da742455c65828FF36Df396",
		asset1: "0.0010",
		asset2: "0.11",
		protocol: "SushiSwap",
		sender: "0x0C2d35Cc6634C0532925a3b844Bc454e4438f457",
	},
	{
		address: "0x1j2F10D1C40777AE1Da742455c65828FF36Df397",
		asset1: "0.0011",
		asset2: "0.12",
		protocol: "Balancer",
		sender: "0x1D2d35Cc6634C0532925a3b844Bc454e4438f458",
	},
];

export default function AddressStatistics() {
	return (
		<div className="p-6 space-y-6">
			<h1 className="text-3xl font-bold">Transaction Details</h1>

			<Card>
				<CardHeader>
					<CardTitle>Summary</CardTitle>
				</CardHeader>
				<CardContent>
					<Table>
						<TableBody>
							<TableRow>
								<TableCell className="font-medium">MEV Type</TableCell>
								<TableCell>{addressSummary.type}</TableCell>
							</TableRow>
							<TableRow>
								<TableCell className="font-medium">Address</TableCell>
								<TableCell>
									<Link
										href={`https://etherscan.io/address/${addressSummary.address}`}
										className="text-blue-600 hover:underline"
										target="_blank"
									>
										{addressSummary.address}
									</Link>
								</TableCell>
							</TableRow>
							<TableRow>
								<TableCell className="font-medium">Timestamp</TableCell>
								<TableCell>{addressSummary.timestamp}</TableCell>
							</TableRow>
							<TableRow>
								<TableCell className="font-medium">From</TableCell>
								<TableCell>{addressSummary.from}</TableCell>
							</TableRow>
							<TableRow>
								<TableCell className="font-medium">To</TableCell>
								<TableCell>{addressSummary.to}</TableCell>
							</TableRow>
							<TableRow>
								<TableCell className="font-medium">Profit</TableCell>
								<TableCell>{addressSummary.profit}</TableCell>
							</TableRow>
							<TableRow>
								<TableCell className="font-medium">Cost</TableCell>
								<TableCell>{addressSummary.cost}</TableCell>
							</TableRow>
							<TableRow>
								<TableCell className="font-medium">Revenue</TableCell>
								<TableCell>{addressSummary.revenue}</TableCell>
							</TableRow>
							<TableRow>
								<TableCell className="font-medium">Block Number</TableCell>
								<TableCell>{addressSummary.blockNumber}</TableCell>
							</TableRow>
							<TableRow>
								<TableCell className="font-medium">Index</TableCell>
								<TableCell>{addressSummary.index}</TableCell>
							</TableRow>
						</TableBody>
					</Table>
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle>Swaps</CardTitle>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Address</TableHead>
								<TableHead>Protocol</TableHead>
								<TableHead>Asset 1</TableHead>
								<TableHead>Asset 2</TableHead>
								<TableHead>Sender</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{transactionDetails.map((tx, i) => (
								<TableRow key={i}>
									<TableCell>
										<Link
											href={`https://etherscan.io/tx/${tx.address}`}
											className="text-blue-600 hover:underline"
											target="_blank"
										>
											{tx.address}
										</Link>
									</TableCell>
									<TableCell>{tx.protocol}</TableCell>
									<TableCell>{tx.asset1}</TableCell>
									<TableCell>{tx.asset2}</TableCell>
									<TableCell>{tx.sender}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	);
}

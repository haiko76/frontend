"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArcElement, BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Title, Tooltip } from "chart.js";
import Link from "next/link";
import { Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Mock data
const arbitrageSummary = {
	totalTransactions: 1500,
	totalBots: 45,
	totalCost: 125.5,
	totalProfit: 180.2,
};

const transactionDetails = [
	{
		time: "2024-02-21 10:30:15",
		txHash: "0x1234...abcd",
		profit: 0.5,
		cost: 0.2,
		loss: 0.3,
	},
	{
		time: "2024-02-21 11:45:22",
		txHash: "0x5678...efgh",
		profit: 0.8,
		cost: 0.3,
		loss: 0.5,
	},
	{
		time: "2024-02-21 12:15:30",
		txHash: "0x9abc...def0",
		profit: 1.2,
		cost: 0.4,
		loss: 0.8,
	},
	{
		time: "2024-02-21 13:05:45",
		txHash: "0x3456...789a",
		profit: 0.6,
		cost: 0.2,
		loss: 0.4,
	},
	{
		time: "2024-02-21 14:20:10",
		txHash: "0xbcde...f123",
		profit: 0.9,
		cost: 0.3,
		loss: 0.6,
	},
	{
		time: "2024-02-21 15:35:25",
		txHash: "0x7890...abcd",
		profit: 1.5,
		cost: 0.5,
		loss: 1.0,
	},
	{
		time: "2024-02-21 16:50:40",
		txHash: "0xef12...3456",
		profit: 0.7,
		cost: 0.2,
		loss: 0.5,
	},
	{
		time: "2024-02-21 17:25:55",
		txHash: "0x4567...89ab",
		profit: 1.0,
		cost: 0.3,
		loss: 0.7,
	},
	{
		time: "2024-02-21 18:40:20",
		txHash: "0x1234...5678",
		profit: 0.4,
		cost: 0.1,
		loss: 0.3,
	},
	{
		time: "2024-02-21 19:55:35",
		txHash: "0x9abc...def0",
		profit: 1.3,
		cost: 0.4,
		loss: 0.9,
	},
	{
		time: "2024-02-21 20:10:50",
		txHash: "0x3456...789a",
		profit: 0.6,
		cost: 0.2,
		loss: 0.4,
	},
	{
		time: "2024-02-21 21:25:05",
		txHash: "0xbcde...f123",
		profit: 0.8,
		cost: 0.3,
		loss: 0.5,
	},
];

const contractExploits = {
	labels: ["Uniswap V3", "Curve", "Balancer", "SushiSwap", "Others"],
	data: [40, 25, 15, 12, 8],
};

const profitDistribution = {
	labels: ["$0-5", "$5-10", "$10-20", "$20-50", "$50-100", "$100+"],
	data: [250, 420, 380, 280, 120, 50],
};

export default function ArbitrageStatistics() {
	const donutData = {
		labels: contractExploits.labels,
		datasets: [
			{
				data: contractExploits.data,
				backgroundColor: [
					"rgba(255, 99, 132, 0.5)",
					"rgba(54, 162, 235, 0.5)",
					"rgba(255, 206, 86, 0.5)",
					"rgba(75, 192, 192, 0.5)",
					"rgba(153, 102, 255, 0.5)",
				],
				borderColor: [
					"rgba(255, 99, 132, 1)",
					"rgba(54, 162, 235, 1)",
					"rgba(255, 206, 86, 1)",
					"rgba(75, 192, 192, 1)",
					"rgba(153, 102, 255, 1)",
				],
				borderWidth: 1,
			},
		],
	};

	const barData = {
		labels: profitDistribution.labels,
		datasets: [
			{
				label: "Number of Transactions",
				data: profitDistribution.data,
				backgroundColor: "rgba(75, 192, 192, 0.5)",
				borderColor: "rgb(75, 192, 192)",
				borderWidth: 1,
			},
		],
	};

	return (
		<div className="p-6 space-y-6">
			<h1 className="text-3xl font-bold">Arbitrage Statistics</h1>

			<Card>
				<CardHeader>
					<CardTitle>Summary</CardTitle>
				</CardHeader>
				<CardContent>
					<Table>
						<TableBody>
							<TableRow>
								<TableCell className="font-medium">Total Transactions</TableCell>
								<TableCell>{arbitrageSummary.totalTransactions}</TableCell>
							</TableRow>
							<TableRow>
								<TableCell className="font-medium">MEV Bots</TableCell>
								<TableCell>{arbitrageSummary.totalBots}</TableCell>
							</TableRow>
							<TableRow>
								<TableCell className="font-medium">Total Cost (ETH)</TableCell>
								<TableCell>{arbitrageSummary.totalCost}</TableCell>
							</TableRow>
							<TableRow>
								<TableCell className="font-medium">Total Profit (ETH)</TableCell>
								<TableCell>{arbitrageSummary.totalProfit}</TableCell>
							</TableRow>
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<Card>
					<CardHeader>
						<CardTitle>Contract Exploitation Distribution</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="h-[400px] flex items-center justify-center">
							<Doughnut
								data={donutData}
								options={{
									responsive: true,
									maintainAspectRatio: false,
								}}
							/>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Profit Distribution</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="h-[400px]">
							<Bar
								data={barData}
								options={{
									responsive: true,
									maintainAspectRatio: false,
									scales: {
										y: {
											beginAtZero: true,
											title: {
												display: true,
												text: "Number of Transactions",
											},
										},
										x: {
											title: {
												display: true,
												text: "Profit Range (USD)",
											},
										},
									},
								}}
							/>
						</div>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Recent Attacks</CardTitle>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Time</TableHead>
								<TableHead>Transaction</TableHead>
								<TableHead>Profit</TableHead>
								<TableHead>Cost</TableHead>
								<TableHead>Loss</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{transactionDetails.map((tx, i) => (
								<TableRow key={i}>
									<TableCell>{tx.time}</TableCell>
									<TableCell>
										<Link
											href={`https://etherscan.io/tx/${tx.txHash}`}
											className="text-blue-600 hover:underline"
											target="_blank"
										>
											{tx.txHash}
										</Link>
									</TableCell>
									<TableCell>{tx.profit} ETH</TableCell>
									<TableCell>{tx.cost} ETH</TableCell>
									<TableCell>{tx.loss} ETH</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	);
}

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
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, Title, Tooltip, Legend, PointElement);

// Mock data
const addressSummary = {
	address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
	attackCount: 15,
	totalLoss: 25.5,
};

const weeklyData = {
	labels: ["16 Feb", "17 Feb", "18 Feb", "19 Feb", "20 Feb", "21 Feb", "22 Feb"],
	attacks: [2, 3, 1, 4, 2, 1, 2],
	losses: [3.2, 4.5, 1.8, 6.2, 3.5, 2.1, 4.2],
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

export default function AddressStatistics() {
	const chartData = {
		labels: weeklyData.labels,
		datasets: [
			{
				type: "bar",
				label: "Losses (ETH)",
				data: weeklyData.losses,
				backgroundColor: "rgba(255, 99, 132, 0.5)",
				borderColor: "rgb(255, 99, 132)",
				borderWidth: 1,
				yAxisID: "y",
			},
			{
				type: "line",
				label: "Number of Attacks",
				data: weeklyData.attacks,
				borderColor: "rgb(54, 162, 235)",
				borderWidth: 2,
				yAxisID: "y1",
			},
		],
	};

	const chartOptions = {
		responsive: true,
		interaction: {
			mode: "index",
			intersect: false,
		},
		scales: {
			y: {
				type: "linear",
				display: true,
				position: "left",
				title: {
					display: true,
					text: "Loss (ETH)",
				},
			},
			y1: {
				type: "linear",
				display: true,
				position: "right",
				title: {
					display: true,
					text: "Number of Attacks",
				},
				grid: {
					drawOnChartArea: false,
				},
			},
		},
	};

	return (
		<div className="p-6 space-y-6">
			<h1 className="text-3xl font-bold">Address Statistics</h1>

			<Card>
				<CardHeader>
					<CardTitle>Address Summary</CardTitle>
				</CardHeader>
				<CardContent>
					<Table>
						<TableBody>
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
								<TableCell className="font-medium">Attack Transactions</TableCell>
								<TableCell>{addressSummary.attackCount}</TableCell>
							</TableRow>
							<TableRow>
								<TableCell className="font-medium">Total Loss (ETH)</TableCell>
								<TableCell>{addressSummary.totalLoss}</TableCell>
							</TableRow>
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<Card>
					<CardHeader>
						<CardTitle>Weekly Attack Statistics</CardTitle>
					</CardHeader>
					<CardContent>
						<Bar data={chartData} options={chartOptions} />
					</CardContent>
				</Card>

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
		</div>
	);
}

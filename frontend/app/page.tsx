"use client";

import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArcElement, BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip } from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import "./globals.css";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

export default function Home() {
	const donutData = {
		labels: ["Arbitrage", "Sandwich", "Liquidity"],
		datasets: [
			{
				data: [300, 50, 100],
				backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56"],
				hoverBackgroundColor: ["#FF6384", "#36A2EB", "#FFCE56"],
			},
		],
	};

	const barData = {
		labels: ["January", "February", "March", "April", "May", "June"],
		datasets: [
			{
				label: "Total",
				data: [12, 19, 3, 5, 2, 3],
				backgroundColor: "#36A2EB",
			},
		],
	};

	const tableData = [
		{ id: 1, type: "Arbitrage", contract: "0x1234...abcd", profit: 1.5, timestamp: "2023-10-01T12:00:00Z" },
		{ id: 2, type: "Sandwich", contract: "0x5678...efgh", profit: 2.3, timestamp: "2023-10-02T14:30:00Z" },
		{ id: 3, type: "Liquidation", contract: "0x9abc...ijkl", profit: 0.8, timestamp: "2023-10-03T16:45:00Z" },
		{ id: 4, type: "Arbitrage", contract: "0xdef0...mnop", profit: 1.2, timestamp: "2023-10-04T18:20:00Z" },
	];

	return (
		<div className="min-h-screen flex flex-col">
			<div className="flex flex-1">
				<main className="flex-1 p-6">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
						<Card className="p-4">
							<h2 className="text-lg font-semibold mb-4">Distribution</h2>
							<div className="h-64">
								<Doughnut data={donutData} />
							</div>
						</Card>
						<Card className="p-4">
							<h2 className="text-lg font-semibold mb-4">MEV Transaction Profit Distribution</h2>
							<div className="h-64">
								<Bar data={barData} />
							</div>
						</Card>
					</div>
					<Card className="p-4">
						<h2 className="text-lg font-semibold mb-4">Latest MEVs</h2>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>ID</TableHead>
									<TableHead>Mev Type</TableHead>
									<TableHead>Contract</TableHead>
									<TableHead>Profit</TableHead>
									<TableHead>Timestamp</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{tableData.map((row) => (
									<TableRow key={row.id}>
										<TableCell>{row.id}</TableCell>
										<TableCell>{row.type}</TableCell>
										<TableCell>{row.contract}</TableCell>
										<TableCell>{row.profit}</TableCell>
										<TableCell>{row.timestamp}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</Card>
				</main>
			</div>
		</div>
	);
}

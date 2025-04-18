export type MarketData = {
	poolAddress: string;
	asset?: string;
};

export type Market = {
	address: string;
	pool: {
		address: string;
		label: string;
	};
	asset: string;
};

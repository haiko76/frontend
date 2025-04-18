export enum CHAIN_ID {
	ETHEREUM = 1,
	ARBITRUM = 42161,
	OPTIMISM = 10,
	POLYGON = 137,
}

export const SWAP_PROTOCOL_ADDRESS: Record<number, Record<string, Record<string, string[]>>> = {
	[CHAIN_ID.ETHEREUM]: {
		UniswapV2: {
			router: ["0xf164fc0ec4e93095b804a4795bbe1e041497b92a", "0x7a250d5630b4cf539739df2c5dacb4c659f2488d"],
			factory: ["0x5c69bee701ef814a2b6a3edd4b1652cb9cc5aa6f"],
		},
		UniswapV3: {
			router: ["0xe592427a0aece92de3edee1f18e0157c05861564", "0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45"],
			quoter: ["0xb27308f9f90d607463bb33ea1bebb41c27ce5ab6"],
			factory: ["0x1f98431c8ad98523631ae4a59f267346ea31f984"],
			nftPositionManager: ["0xc36442b4a4522e871399cd717abdd847ab11fe88"],
		},
		UniswapV4: {
			router: ["0x3bfa4769fb09eefc5a80d6e87c3b9c650f7ae48e", "0x66a9893cc07d91d95644aedd05d03f95e1dba8af"],
			factory: ["0x8118ec0baea2af13146a5df0badcefcdb4c55ba9"],
			singleton: ["0x4f30f08242b9da4cfe43ef48cba223e8e2ee83a1"],
		},
		SushiSwap: {
			router: ["0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f"],
			factory: ["0xc0aee478e3658e2610c5f7a4a2e1777ce9e4f2ac"],
		},
		SushiSwapV3: {
			router: ["0x50d30bca3177b03f550d32e4c96345ff0926e40f"],
			factory: ["0xbaceb8ec6b9355dfc0269c18bac9d6e2bdc29c4f"],
		},
		PancakeSwapV2: {
			router: ["0xeff92a263d31888d860bd50809a8d171709b7b1c"],
			factory: ["0x1097053fd2ea711dad45caccc45eff7548fcb362"],
		},
		PancakeSwapV3: {
			router: ["0x13f4ea83d0bd40e75c8222255bc855a974568dd4"],
			factory: ["0x0bfbcf9fa4f9c56b0f40a671ad40e0805a091865"],
		},
		CurveV1: {
			router: ["0x99a58482bd75cbab83b27ec03ca68ff489b5788f"],
			factory: ["0xb9fc157394af804a3578134a6585c0dc9cc990d4"],
			registry: ["0x90e00ace148ca3b23ac1bc8c240c2a7dd9c2d7f5"],
			addressProvider: ["0x0000000022d53366457f9d5e68ec105046fc4383"],
			metaRegistry: ["0xf98b45fa17de75fb1ad0e7afd971b0ca00e379fc"],
		},
		CurveV2: {
			router: ["0x99a58482bd75cbab83b27ec03ca68ff489b5788f"],
			factory: ["0xb9fc157394af804a3578134a6585c0dc9cc990d4"],
			registry: ["0x90e00ace148ca3b23ac1bc8c240c2a7dd9c2d7f5"],
			addressProvider: ["0x0000000022d53366457f9d5e68ec105046fc4383"],
		},
		BalancerV1: {
			vault: ["0xba12222222228d8ba445958a75a0704d566bf2c8"],
			factory: ["0x9424b1412450d0f8fc2255faf6046b98213b76bd"],
		},
		BalancerV2: {
			router: ["0xba12222222228d8ba445958a75a0704d566bf2c8"],
			vault: ["0xba12222222228d8ba445958a75a0704d566bf2c8"],
			factory: ["0xa5bf2ddf098bb0ef6d120c98217dd6b141c74ee0"],
		},
		BalancerStable: {
			factory: ["0xf9ac7b9df2b3454e841110cce5550bd5ac6f875f", "0x8e9aa87e45e92bad84d5f8dd1bff34fb92637de9"],
		},
		ZeroExV3: {
			exchange: ["0xdef1c0ded9bec7f1a1670819833240f027b25eff"],
			proxy: ["0xe66b31678d6c16e9ebf358268a790b763c133750"],
		},
		ZeroExV4: {
			exchange: ["0xdef1c0ded9bec7f1a1670819833240f027b25eff"],
			proxy: ["0xe66b31678d6c16e9ebf358268a790b763c133750"],
		},
		"1inch": {
			router: ["0x1111111254eeb25477b68fb85ed929f73a960582", "0x1111111254fb6c44bac0bed2854e76f90643097d"],
			factory: ["0x5ae3142a20c879e10ea3c71fba385fe68950fe7e"],
		},
		KyberSwap: {
			router: ["0x6131b5fae19ea4f9d964eac0408e4408b66337b5"],
			factory: ["0xc7a590291e07b9fe9e64b86c58fd8fc764308c4a"],
		},
		TransitSwap: {
			router: ["0xb45a2dda996c32e93b8c47098e90ed0e7ab18e39"],
		},
		Frax: {
			router: ["0xc14d550632db8592d1243edc8b95b0ad06703867"],
			factory: ["0x54f454d747e037da288db568d4121117eab34e79"],
		},
		Dodo: {
			router: ["0xa356867fdcea8e71aeaf87805808803806231fdc", "0x72d220ce168c4f361dd4dee5d826a01ad8598f6c"],
		},
		Clipper: {
			exchange: ["0xbebe2f89825abf172af741a738a9d58fccd73561"],
		},
		ShibaSwap: {
			router: ["0x03f7724180aa6b939894b5ca4314783b0b36b329"],
			factory: ["0x115934131916c8b277dd010ee02de363c09d037c"],
		},
		Bancor: {
			network: ["0xeef417e1d5cc832e619ae18d2f140de2999dd4fb"],
			router: ["0x8e303d296851b320e6a697bacb979d13c9d6e760"],
		},
		Saddle: {
			swap: ["0x3c1f53fed2238176419f8f897aec8791c499e3a8"],
			factory: ["0x927fd3aff8a9c33a75665a29b65ecfe36e4bcee9"],
		},
		Synapse: {
			router: ["0x2796317b0ff8538f253012862c06787adfb8ceb6"],
		},
		Velodrome: {
			router: ["0xa062ae8a9c5e11aaa026fc2670b0d65ccc8b2858"],
			factory: ["0x25cbddb98b35ab1ff77413456b31ec81a6b6b746"],
		},
		Maverick: {
			router: ["0x75f922d2952041f25951a64594c6c1ee4536b983"],
			factory: ["0xeb18564bf5bf01d5bc1be2050e9095b5407cd8a3"],
		},
		Metamask: {
			router: ["0x881d40237659c251811cec9c364ef91dc08d300c"],
		},
		CoWProtocol: {
			router: ["0x9008d19f58aabd9ed0d60971565aa8510560ab41"],
		},
		Mooniswap: {
			factory: ["0x71cd6666064c3a1354a3b4dca5fa1e2d3ee7d303"],
		},
		SakeSwap: {
			factory: ["0x75e48c954594d64ef9613aeef97ad85370f13807"],
		},
		DeFiSwap: {
			factory: ["0x9deb29c9a4c7a88a3c0257393b7f3335338d9a9d"],
		},
		SashimiSwap: {
			factory: ["0xf028f723ed1d0fe01cc59973c49298aa95c57472"],
		},
		LuaSwap: {
			factory: ["0x0388c1e0f210abae597b7de712b9510c6c36c857"],
		},
		Captain: {
			router: ["0xDc6844cED486Ec04803f02F2Ee40BBDBEf615f21"],
		},
		Okx: {
			router: ["0x3b3ae790Df4F312e745D270119c6052904FB6790"],
		},
	},
};

export const LENDING_PROTOCOL_ADDRESS: Record<number, Record<string, Record<string, string[]>>> = {
	[CHAIN_ID.ETHEREUM]: {
		AaveV1: {
			pool: ["0x398ec7346dcd622edc5ae82352f02be94c62d119"],
			staking: ["0xd01607c3C5eCABa394D8be377a08590149325722"],
		},
		AaveV2: {
			pool: ["0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9", "0x7937d4799803fbbe595ed57278bc4ca21f3bffcb"],
		},
		CompoundV2: {
			pool: ["0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b", "0x3d5bc3c8d13dcb8bf317092d84783c2697ae9258"],
		},
	},
};

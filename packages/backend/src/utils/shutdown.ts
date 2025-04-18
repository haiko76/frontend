export type GracefulShutdownHandler = () => void;

const handlers: GracefulShutdownHandler[] = [];
let lock = false;

export function onShutdown(f: GracefulShutdownHandler): void {
	handlers.push(f);
}

function signalHandler(signal: string): void {
	if (lock) {
		return;
	} else {
		lock = true;
	}

	console.warn(`${signal} received, graceful shutdown...`);
	for (const handler of handlers) {
		handler();
	}
}

process.on("SIGINT", signalHandler);
process.on("SIGTERM", signalHandler);
process.on("SIGQUIT", signalHandler);

process.on("uncaughtException", (error, origin) => {
	signalHandler("uncaughtException");
	console.error("uncaughtException", { origin, error });
	process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
	signalHandler("unhandledRejection");
	console.error("unhandledRejection", { promise, reason });
	process.exit(1);
});

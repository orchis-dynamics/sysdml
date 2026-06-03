import type { EventEmitter } from "node:events";
import { readFileSync } from "node:fs";

import { compileAST } from "@sysdml/ir";
import type { IR } from "@sysdml/contracts";
import { parseSource } from "@sysdml/parser";
import chokidar from "chokidar";
import type { Plugin, ViteDevServer } from "vite";
import { WebSocketServer, WebSocket } from "ws";

import type { InboundMessage } from "../src/transport/types.js";

export const SYSDML_WS_PATH = "/__sysdml_ws__";

interface SysdmlDevOptions {
	file: string | undefined;
}

export function sysdmlDev(options: SysdmlDevOptions): Plugin {
	if (!options.file) {
		return {
			name: "sysdml-dev",
			apply: "serve",
			configResolved() {
				console.warn(
					"[sysdml-dev] No SYSDML_FILE set — renderer will show empty canvas.",
				);
			},
		};
	}

	const filePath = options.file;
	let currentIR: IR | null = null;
	const clients = new Set<WebSocket>();

	function compileFile(): InboundMessage {
		try {
			const source = readFileSync(filePath, "utf-8");
			const { ast, diagnostics: parseDiagnostics } = parseSource(source);
			if (ast === null || parseDiagnostics.length > 0) {
				const message = parseDiagnostics.map((d) => d.message).join("; ");
				return { type: "error", message };
			}
			const { ir, diagnostics: compileDiagnostics } = compileAST(ast);
			if (compileDiagnostics.length > 0) {
				const message = compileDiagnostics.map((d) => d.message).join("; ");
				return { type: "error", message };
			}
			if (ir === null) {
				return { type: "error", message: "Compilation produced no IR" };
			}
			return { type: "update", ir };
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return { type: "error", message };
		}
	}

	function broadcast(message: InboundMessage): void {
		const payload = JSON.stringify(message);
		for (const client of clients) {
			if (client.readyState === WebSocket.OPEN) {
				client.send(payload);
			}
		}
	}

	return {
		name: "sysdml-dev",
		apply: "serve",

		transformIndexHtml() {
			return [
				{
					tag: "script",
					injectTo: "head-prepend",
					children: `window.SYSDML_WS_URL = (location.protocol === "https:" ? "wss:" : "ws:") + "//" + location.host + ${JSON.stringify(SYSDML_WS_PATH)};`,
				},
			];
		},

		configureServer(server: ViteDevServer) {
			const wss = new WebSocketServer({ noServer: true });

			wss.on("error", (error: Error) => {
				console.error("[sysdml-dev] WebSocket server error:", error);
			});

			if (!server.httpServer) {
				console.warn(
					"[sysdml-dev] Middleware mode — WebSocket upgrade unavailable.",
				);
				return;
			}

			const httpServer: EventEmitter = server.httpServer;
			const handleUpgrade = (
				request: import("node:http").IncomingMessage,
				socket: import("node:stream").Duplex,
				head: Buffer,
			) => {
				if (request.url === SYSDML_WS_PATH) {
					wss.handleUpgrade(request, socket, head, (ws) => {
						wss.emit("connection", ws, request);
					});
				}
			};

			wss.on("connection", (ws: WebSocket) => {
				clients.add(ws);
				ws.on("error", (error: Error) => {
					console.error("[sysdml-dev] client error:", error);
				});
				ws.on("close", () => clients.delete(ws));
				const message =
					currentIR !== null
						? ({ type: "update", ir: currentIR } satisfies InboundMessage)
						: compileFile();
				if (message.type === "update") currentIR = message.ir;
				ws.send(JSON.stringify(message));
			});

			const watcher = chokidar.watch(filePath, { ignoreInitial: false });
			watcher.on("change", () => {
				const message = compileFile();
				currentIR = message.type === "update" ? message.ir : null;
				broadcast(message);
			});
			watcher.on("add", () => {
				const message = compileFile();
				currentIR = message.type === "update" ? message.ir : null;
			});

			httpServer.once("listening", () => {
				httpServer.on("upgrade", handleUpgrade);
			});

			httpServer.on("close", () => {
				httpServer.off("upgrade", handleUpgrade);
				void watcher.close();
				wss.close();
				clients.clear();
			});
		},
	};
}

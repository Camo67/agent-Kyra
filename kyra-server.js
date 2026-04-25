import { readFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { pathToFileURL } from "node:url";

import InferenceBridge from "./inference-bridge.js";
import MXitBuffer from "./mxit-buffer.js";
import { linkKyraBufferMemory, resolveVaultPath } from "./obsidian-memory.js";
import { runPlaywrightTask } from "./playwright-tool.js";

function applyJsonHeaders(response) {
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
}

function sendJson(response, statusCode, payload) {
  applyJsonHeaders(response);
  response.writeHead(statusCode);
  response.end(JSON.stringify(payload));
}

function sendHtml(response, statusCode, html) {
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.writeHead(statusCode);
  response.end(html);
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;

      if (body.length > 1024 * 1024) {
        reject(new Error("Request body exceeds 1MB"));
        request.destroy();
      }
    });

    request.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });

    request.on("error", reject);
  });
}

function statusCodeForError(error) {
  const message = error instanceof Error ? error.message : String(error);

  if (/Invalid JSON body|exceeds 1MB|No live memory events/i.test(message)) {
    return 400;
  }

  if (/No supported local backend detected|not reachable/i.test(message)) {
    return 503;
  }

  return 502;
}

function createDefaultBridge(options) {
  return new InferenceBridge({
    backend: options.backend ?? "auto",
    model: options.model ?? "qwen3:0.6b",
    agentPort: options.agentPort ?? 8788,
    buffer: options.buffer
  });
}

export function createKyraServer(options = {}) {
  const bridge = options.bridge ?? createDefaultBridge(options);
  const buffer = options.buffer ?? new MXitBuffer({ maxEvents: options.maxEvents ?? 12 });
  const vaultPath = resolveVaultPath(options.vaultPath);
  const playwrightTool = options.playwrightTool ?? { runTask: runPlaywrightTask };
  const consolePath = options.consolePath ?? path.resolve("web", "kyra-console.html");

  const server = http.createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url ?? "/", "http://localhost");

      if (request.method === "OPTIONS") {
        applyJsonHeaders(response);
        response.writeHead(204);
        response.end();
        return;
      }

      if (request.method === "GET" && (requestUrl.pathname === "/" || requestUrl.pathname === "/ui")) {
        sendHtml(response, 200, await readFile(consolePath, "utf8"));
        return;
      }

      if (request.method === "GET" && requestUrl.pathname === "/health") {
        const status = await bridge.getStatus();
        sendJson(response, status.ok ? 200 : 503, {
          ...status,
          obsidian: {
            vaultPath,
            memoryPath: "Kyra/Memory",
            conversationsPath: "Kyra/Conversations"
          }
        });
        return;
      }

      if (request.method === "POST" && requestUrl.pathname === "/kyra/memory/link") {
        const payload = await readJsonBody(request);
        const context = buffer.toContext();
        const stats = buffer.stats();
        const memory = await linkKyraBufferMemory({
          context,
          events: buffer.getLog(),
          stats,
          source: payload.source ?? "kyra-server",
          tags: payload.tags
        }, { vaultPath });

        sendJson(response, 201, {
          ok: true,
          stats,
          memory
        });
        return;
      }

      if (request.method === "POST" && requestUrl.pathname === "/kyra/tools/playwright") {
        const payload = await readJsonBody(request);
        const result = await playwrightTool.runTask(payload);
        sendJson(response, 200, result);
        return;
      }

      sendJson(response, 404, {
        error: "Not found"
      });
    } catch (error) {
      sendJson(response, statusCodeForError(error), {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  server.on("clientError", (_error, socket) => {
    socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
  });

  return server;
}

async function startServer() {
  const host = process.env.HOST ?? "0.0.0.0";
  const port = Number(process.env.PORT ?? 8790);
  const server = createKyraServer({
    backend: process.env.BACKEND ?? "auto",
    model: process.env.MODEL ?? "qwen3:0.6b",
    agentPort: Number(process.env.AGENT_PORT ?? 8788),
    vaultPath: process.env.OBSIDIAN_VAULT_PATH
  });

  await new Promise((resolve) => {
    server.listen(port, host, resolve);
  });

  console.log(`Kyra server listening on http://${host}:${port}`);
}

const isDirectRun = Boolean(process.argv[1]) &&
  pathToFileURL(process.argv[1]).href === import.meta.url;

if (isDirectRun) {
  startServer().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

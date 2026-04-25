import http from "node:http";
import process from "node:process";
import { pathToFileURL } from "node:url";

import InferenceBridge from "./inference-bridge.js";
import MXitBuffer from "./mxit-buffer.js";
import {
  appendKyraConversation,
  readKyraMemory,
  resolveVaultPath,
  writeKyraMemory
} from "./obsidian-memory.js";

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

function validateChatPayload(payload) {
  const context = typeof payload.context === "string" ? payload.context.trim() : "";
  const userText = typeof payload.userText === "string" ? payload.userText.trim() : "";
  const systemPrompt = typeof payload.systemPrompt === "string"
    ? payload.systemPrompt.trim()
    : undefined;

  if (!context) {
    throw new Error("Field 'context' is required");
  }

  if (!userText) {
    throw new Error("Field 'userText' is required");
  }

  return {
    context,
    userText,
    systemPrompt
  };
}

function validateKyraChatPayload(payload) {
  const message = typeof payload.message === "string"
    ? payload.message.trim()
    : typeof payload.userText === "string"
      ? payload.userText.trim()
      : "";
  const context = typeof payload.context === "string" ? payload.context.trim() : "";
  const systemPrompt = typeof payload.systemPrompt === "string"
    ? payload.systemPrompt.trim()
    : undefined;

  if (!message) {
    throw new Error("Field 'message' is required");
  }

  return {
    message,
    context,
    systemPrompt
  };
}

function validateMemoryPayload(payload) {
  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const content = typeof payload.content === "string" ? payload.content.trim() : "";

  if (!title) {
    throw new Error("Field 'title' is required");
  }

  if (!content) {
    throw new Error("Field 'content' is required");
  }

  return {
    title,
    content,
    tags: Array.isArray(payload.tags) ? payload.tags : [],
    source: payload.source,
    ts: payload.ts
  };
}

function statusCodeForError(error) {
  const message = error instanceof Error ? error.message : String(error);

  if (
    /Field 'context' is required|Field 'userText' is required|Field 'message' is required|Field 'title' is required|Field 'content' is required|Invalid JSON body|exceeds 1MB/.test(message)
  ) {
    return 400;
  }

  if (/No supported local backend detected|not reachable/i.test(message)) {
    return 503;
  }

  return 502;
}

async function defaultHealthStatus(bridge) {
  return bridge.getStatus();
}

function buildContext(obsidianContext, requestContext) {
  return [
    obsidianContext,
    requestContext
  ].filter(Boolean).join("\n\n").trim();
}

export function createMobileBridgeServer(options = {}) {
  const bridge = options.bridge ?? new InferenceBridge({
    backend: options.backend ?? "auto",
    model: options.model ?? "qwen3:0.6b",
    // The mobile bridge itself listens on 8787 by default, so keep the
    // upstream custom-agent port separate unless the caller overrides it.
    agentPort: options.agentPort ?? 8788,
    buffer: options.buffer ?? new MXitBuffer({ maxEvents: options.maxEvents ?? 12 })
  });

  const resolveHealthStatus = options.resolveHealthStatus ?? (() => defaultHealthStatus(bridge));
  const vaultPath = resolveVaultPath(options.vaultPath);

  const server = http.createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url ?? "/", "http://localhost");

      if (request.method === "OPTIONS") {
        applyJsonHeaders(response);
        response.writeHead(204);
        response.end();
        return;
      }

      if (request.method === "GET" && requestUrl.pathname === "/health") {
        const status = await resolveHealthStatus();
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

      if (request.method === "GET" && requestUrl.pathname === "/kyra/memory") {
        sendJson(response, 200, {
          vaultPath,
          context: await readKyraMemory({ vaultPath })
        });
        return;
      }

      if (request.method === "POST" && requestUrl.pathname === "/kyra/memory") {
        const payload = validateMemoryPayload(await readJsonBody(request));
        const memory = await writeKyraMemory(payload, { vaultPath });

        sendJson(response, 201, {
          ok: true,
          memory
        });
        return;
      }

      if (request.method === "POST" && requestUrl.pathname === "/chat") {
        const payload = validateChatPayload(await readJsonBody(request));
        const obsidianContext = await readKyraMemory({ vaultPath });
        const result = await bridge.completeFromContext(
          buildContext(obsidianContext, payload.context),
          payload.userText,
          {
            systemPrompt: payload.systemPrompt
          }
        );
        const conversation = await appendKyraConversation({
          userText: payload.userText,
          reply: result.reply,
          ts: result.ts
        }, { vaultPath });

        sendJson(response, 200, {
          ...result,
          obsidian: conversation
        });
        return;
      }

      if (request.method === "POST" && requestUrl.pathname === "/kyra/chat") {
        const payload = validateKyraChatPayload(await readJsonBody(request));
        const obsidianContext = await readKyraMemory({ vaultPath });
        const result = await bridge.completeFromContext(
          buildContext(obsidianContext, payload.context),
          payload.message,
          {
            systemPrompt: payload.systemPrompt
          }
        );
        const conversation = await appendKyraConversation({
          userText: payload.message,
          reply: result.reply,
          ts: result.ts
        }, { vaultPath });

        sendJson(response, 200, {
          ...result,
          obsidian: conversation
        });
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
  const port = Number(process.env.PORT ?? 8787);
  const server = createMobileBridgeServer({
    backend: process.env.BACKEND ?? "auto",
    model: process.env.MODEL ?? "qwen3:0.6b",
    agentPort: Number(process.env.AGENT_PORT ?? 8788),
    vaultPath: process.env.OBSIDIAN_VAULT_PATH
  });

  await new Promise((resolve) => {
    server.listen(port, host, resolve);
  });

  console.log(`MIDI×MXIT mobile bridge listening on http://${host}:${port}`);
}

const isDirectRun = Boolean(process.argv[1]) &&
  pathToFileURL(process.argv[1]).href === import.meta.url;

if (isDirectRun) {
  startServer().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

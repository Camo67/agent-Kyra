import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { createMobileBridgeServer } from "../mobile-bridge-server.js";
import { writeKyraMemory } from "../obsidian-memory.js";

async function listen(server) {
  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  return `http://127.0.0.1:${address.port}`;
}

test("health reports backend availability", async () => {
  const vaultPath = await mkdtemp(path.join(tmpdir(), "kyra-mobile-health-"));
  const server = createMobileBridgeServer({
    vaultPath,
    bridge: {
      model: "qwen3:0.6b",
      async getStatus() {
        return {
          ok: true,
          backend: "ollama",
          model: "qwen3:0.6b"
        };
      },
      async completeFromContext() {
        throw new Error("not used");
      }
    }
  });

  const baseUrl = await listen(server);

  try {
    const response = await fetch(`${baseUrl}/health`);
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.ok, true);
    assert.equal(payload.backend, "ollama");
    assert.equal(payload.model, "qwen3:0.6b");
    assert.equal(payload.obsidian.vaultPath, vaultPath);
    assert.equal(payload.obsidian.memoryPath, "Kyra/Memory");
    assert.equal(payload.obsidian.conversationsPath, "Kyra/Conversations");
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
    await rm(vaultPath, { recursive: true, force: true });
  }
});

test("chat forwards stateless context and user text", async () => {
  const vaultPath = await mkdtemp(path.join(tmpdir(), "kyra-mobile-chat-"));
  const calls = [];
  const server = createMobileBridgeServer({
    vaultPath,
    bridge: {
      model: "qwen3:0.6b",
      async getStatus() {
        return {
          ok: true,
          backend: "ollama",
          model: "qwen3:0.6b"
        };
      },
      async completeFromContext(context, userText, options = {}) {
        calls.push({ context, userText, options });
        return {
          reply: "stub reply",
          backend: "ollama",
          model: "qwen3:0.6b",
          ts: 123
        };
      }
    }
  });

  const baseUrl = await listen(server);

  try {
    const response = await fetch(`${baseUrl}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        context: "=MIDI×MXIT MEMORY LOG [1/12]=\n[U ch:0 pit:63 dom:BUILD vel:64 dur:800ms] bld da sys",
        userText: "build the system",
        systemPrompt: "reply short"
      })
    });
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.reply, "stub reply");
    assert.equal(payload.backend, "ollama");
    assert.equal(payload.model, "qwen3:0.6b");
    assert.equal(payload.ts, 123);
    assert.equal(payload.obsidian.relativePath, path.join("Kyra", "Conversations", "1970-01-01.md"));
    assert.equal(calls.length, 1);
    assert.equal(calls[0].userText, "build the system");
    assert.deepEqual(calls[0].options, { systemPrompt: "reply short" });
    assert.match(calls[0].context, /=OBSIDIAN KYRA MEMORY=/);
    assert.match(calls[0].context, /Kyra Profile/);
    assert.match(calls[0].context, /Cameron De Vries/);
    assert.match(calls[0].context, /OpenClaw/);
    assert.match(calls[0].context, /=MIDI×MXIT MEMORY LOG \[1\/12\]=/);
    assert.match(calls[0].context, /\[U ch:0 pit:63 dom:BUILD vel:64 dur:800ms\] bld da sys/);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
    await rm(vaultPath, { recursive: true, force: true });
  }
});

test("chat surfaces backend-unavailable errors", async () => {
  const vaultPath = await mkdtemp(path.join(tmpdir(), "kyra-mobile-errors-"));
  const server = createMobileBridgeServer({
    vaultPath,
    bridge: {
      model: "qwen3:0.6b",
      async getStatus() {
        return {
          ok: false,
          backend: null,
          model: "qwen3:0.6b",
          error: "No supported local backend detected"
        };
      },
      async completeFromContext() {
        throw new Error("No supported local backend detected");
      }
    }
  });

  const baseUrl = await listen(server);

  try {
    const healthResponse = await fetch(`${baseUrl}/health`);
    const healthPayload = await healthResponse.json();

    assert.equal(healthResponse.status, 503);
    assert.equal(healthPayload.ok, false);
    assert.equal(healthPayload.obsidian.vaultPath, vaultPath);

    const chatResponse = await fetch(`${baseUrl}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        context: "=MIDI×MXIT MEMORY LOG [0/12]=",
        userText: "hello"
      })
    });
    const chatPayload = await chatResponse.json();

    assert.equal(chatResponse.status, 503);
    assert.equal(chatPayload.error, "No supported local backend detected");
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
    await rm(vaultPath, { recursive: true, force: true });
  }
});

test("chat merges Obsidian notes into context and logs the conversation", async () => {
  const vaultPath = await mkdtemp(path.join(tmpdir(), "kyra-mobile-obsidian-"));
  const calls = [];

  await writeKyraMemory({
    title: "Tone Preference",
    content: "Keep Kyra warm and direct.",
    tags: ["memory", "style"],
    source: "test"
  }, { vaultPath });

  const server = createMobileBridgeServer({
    vaultPath,
    bridge: {
      model: "qwen3:0.6b",
      async getStatus() {
        return {
          ok: true,
          backend: "ollama",
          model: "qwen3:0.6b"
        };
      },
      async completeFromContext(context, userText, options = {}) {
        calls.push({ context, userText, options });
        return {
          reply: "Logged in the vault.",
          backend: "ollama",
          model: "qwen3:0.6b",
          ts: 1776300000000
        };
      }
    }
  });

  const baseUrl = await listen(server);

  try {
    const response = await fetch(`${baseUrl}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        context: "=MIDI×MXIT MEMORY LOG [1/12]=\n[U ch:0 pit:65 dom:STYLE vel:70 dur:900ms] keep da tone warm",
        userText: "remember the vibe",
        systemPrompt: "reply short"
      })
    });
    const payload = await response.json();
    const conversationText = await readFile(payload.obsidian.fullPath, "utf8");

    assert.equal(response.status, 200);
    assert.equal(calls.length, 1);
    assert.match(calls[0].context, /=OBSIDIAN KYRA MEMORY=/);
    assert.match(calls[0].context, /Tone Preference/);
    assert.match(calls[0].context, /=MIDI×MXIT MEMORY LOG \[1\/12\]=/);
    assert.equal(calls[0].userText, "remember the vibe");
    assert.deepEqual(calls[0].options, { systemPrompt: "reply short" });
    assert.match(conversationText, /\*\*User:\*\* remember the vibe/);
    assert.match(conversationText, /\*\*Kyra:\*\* Logged in the vault\./);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
    await rm(vaultPath, { recursive: true, force: true });
  }
});

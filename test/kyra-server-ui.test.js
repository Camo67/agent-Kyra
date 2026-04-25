import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { createKyraServer } from "../kyra-server.js";
import MXitBuffer from "../mxit-buffer.js";

async function listen(server) {
  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  return `http://127.0.0.1:${address.port}`;
}

async function close(server) {
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

test("kyra server serves the local web console", async () => {
  const server = createKyraServer({
    bridge: {
      async getStatus() {
        return {
          ok: true,
          backend: "stub",
          model: "stub-model"
        };
      },
      async completeFromContext() {
        return {
          reply: "stub reply",
          backend: "stub",
          model: "stub-model",
          ts: 123
        };
      }
    }
  });

  const baseUrl = await listen(server);

  try {
    const response = await fetch(`${baseUrl}/`);
    const html = await response.text();

    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /text\/html/);
    assert.match(html, /<title>KYRA SWARM KIT/);
    assert.match(html, /KYRA SWARM/);
    assert.match(html, /OBSIDIAN \+ N8N \+ OLLAMA/);
    assert.match(html, /KYRA-CODE/);
  } finally {
    await close(server);
  }
});

test("kyra server exposes the ui alias", async () => {
  const server = createKyraServer({
    bridge: {
      async getStatus() {
        return {
          ok: true,
          backend: "stub",
          model: "stub-model"
        };
      },
      async completeFromContext() {
        return {
          reply: "stub reply",
          backend: "stub",
          model: "stub-model",
          ts: 123
        };
      }
    }
  });

  const baseUrl = await listen(server);

  try {
    const response = await fetch(`${baseUrl}/ui`);
    const html = await response.text();

    assert.equal(response.status, 200);
    assert.match(html, /KYRA SWARM/);
  } finally {
    await close(server);
  }
});

test("kyra server can link the live buffer into obsidian memory", async () => {
  const vaultPath = await mkdtemp(path.join(tmpdir(), "kyra-ui-link-"));
  const buffer = new MXitBuffer({ maxEvents: 12, persist: false });
  buffer.push("build the local ui", "user");
  buffer.push("ui linked to obsidian", "assistant");

  const server = createKyraServer({
    vaultPath,
    buffer,
    bridge: {
      async getStatus() {
        return {
          ok: true,
          backend: "stub",
          model: "stub-model"
        };
      },
      async completeFromContext() {
        return {
          reply: "stub reply",
          backend: "stub",
          model: "stub-model",
          ts: 123
        };
      }
    }
  });

  const baseUrl = await listen(server);

  try {
    const response = await fetch(`${baseUrl}/kyra/memory/link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "test-suite"
      })
    });
    const payload = await response.json();
    const written = await readFile(payload.memory.fullPath, "utf8");

    assert.equal(response.status, 201);
    assert.equal(payload.ok, true);
    assert.equal(payload.stats.count, 2);
    assert.match(payload.memory.relativePath, /^Kyra[\/\\]Memory[\/\\].+\.md$/);
    assert.match(written, /build the local ui/);
    assert.match(written, /=MIDI×MXIT MEMORY LOG \[2\/12\]=/);
  } finally {
    await close(server);
    await rm(vaultPath, { recursive: true, force: true });
  }
});

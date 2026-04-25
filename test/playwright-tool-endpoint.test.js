import test from "node:test";
import assert from "node:assert/strict";

import { createKyraServer } from "../kyra-server.js";

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

test("kyra server forwards playwright tool requests", async () => {
  let receivedPayload = null;
  const server = createKyraServer({
    playwrightTool: {
      async runTask(payload) {
        receivedPayload = payload;
        return {
          ok: true,
          url: payload.url,
          title: "Example Domain",
          screenshotPath: null
        };
      }
    }
  });

  const baseUrl = await listen(server);

  try {
    const response = await fetch(`${baseUrl}/kyra/tools/playwright`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        url: "https://example.com",
        selector: "body"
      })
    });
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(receivedPayload, {
      url: "https://example.com",
      selector: "body"
    });
    assert.equal(payload.ok, true);
    assert.equal(payload.url, "https://example.com");
    assert.equal(payload.title, "Example Domain");
  } finally {
    await close(server);
  }
});

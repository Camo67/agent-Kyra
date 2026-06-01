import test from "node:test";
import assert from "node:assert";
import InferenceBridge from "../lib/ai-router.js";

test("InferenceBridge can be instantiated", () => {
  const bridge = new InferenceBridge();
  assert.ok(bridge instanceof InferenceBridge);
});

test("InferenceBridge has required methods", () => {
  const bridge = new InferenceBridge();
  assert.strictEqual(typeof bridge.detectBackend, "function");
  assert.strictEqual(typeof bridge.sendCompletion, "function");
  assert.strictEqual(typeof bridge.sendToLightRAG, "function");
  assert.strictEqual(typeof bridge.detect, "function");
  assert.strictEqual(typeof bridge.chat, "function");
  assert.strictEqual(typeof bridge.reset, "function");
});

test("InferenceBridge static MXitBuffer is available", () => {
  assert.ok(InferenceBridge.MXitBuffer);
});

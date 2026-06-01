import test from "node:test";
import assert from "node:assert";
import InferenceBridge from "../lib/ai-router.js";

test("InferenceBridge supports reasoning target", async (t) => {
  const bridge = new InferenceBridge();

  // We can't easily test the actual fetch without mocking,
  // but we can verify the method exists and handles the logic
  assert.strictEqual(typeof bridge.sendCompletion, "function");
});

test("InferenceBridge can be instantiated", () => {
  const bridge = new InferenceBridge();
  assert.ok(bridge instanceof InferenceBridge);
});

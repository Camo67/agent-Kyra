import test from "node:test";
import assert from "node:assert/strict";

import { KYRA_SYSTEM_PROMPT } from "../kyra-system-prompt.js";

test("default Kyra system prompt includes persona and memory decode rules", () => {
  assert.match(KYRA_SYSTEM_PROMPT, /You are Kyra, the personal AI agent of Cameron De Vries/);
  assert.match(KYRA_SYSTEM_PROMPT, /OpenClaw/);
  assert.match(KYRA_SYSTEM_PROMPT, /Zero-cost first/);
  assert.match(KYRA_SYSTEM_PROMPT, /MIDI-event encoded MXit-compressed memory/);
  assert.match(KYRA_SYSTEM_PROMPT, /Legacy format: \[Role ch:N n:Note v:Velocity d:Dms\] compressed_message/);
});

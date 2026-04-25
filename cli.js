import process from "node:process";
import { createInterface } from "node:readline";

import { grammarSummary } from "./midi-grammar.js";
import { decode, toPianoRoll } from "./midi-encoder.js";
import MXitBuffer from "./mxit-buffer.js";
import InferenceBridge from "./inference-bridge.js";

const buffer = new MXitBuffer({
  maxEvents: 12,
  persist: true,
  persistPath: "./mxit-memory.json"
});

const bridge = new InferenceBridge({
  backend: process.env.BACKEND ?? "auto",
  model: process.env.MODEL ?? "qwen3:0.6b",
  buffer
});

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "YOU> "
});

let shuttingDown = false;
let readlineClosed = false;

function printBanner() {
  console.log("MIDI×MXIT AI — LOCAL INFERENCE ENGINE v0.1");
}

function printGrammar() {
  const summary = grammarSummary();
  console.log(
    `Grammar: ${summary.channels} channels · ${summary.pitchDomains} pitch domains · ${summary.tokenFormat}`
  );
}

function frameLine(content, innerWidth = 36) {
  const text = content.length > innerWidth
    ? content.slice(0, innerWidth)
    : content.padEnd(innerWidth, " ");

  return `│ ${text} │`;
}

function printEventSummary(userEvent, assistantEvent) {
  if (!userEvent || !assistantEvent) {
    return;
  }

  const userSummary = decode(userEvent);
  const assistantSummary = decode(assistantEvent);

  const userLine = `${"YOU".padEnd(4, " ")}: [${userEvent.noteName}] ${userSummary.meaning.replace(/ request$/, "")} · vel:${userEvent.velocity} · ${userEvent.duration}ms`;
  const assistantLine = `${"AI".padEnd(4, " ")}: [${assistantEvent.noteName}] ${assistantSummary.meaning.replace(/ response$/, "")} · vel:${assistantEvent.velocity} · ${assistantEvent.duration}ms`;

  console.log("┌─ EVENT ──────────────────────────────┐");
  console.log(frameLine(userLine));
  console.log(frameLine(assistantLine));
  console.log("└──────────────────────────────────────┘");
}

async function detectBackend() {
  try {
    const backend = await bridge.detect();
    console.log(`Backend: ${backend}`);
  } catch (error) {
    console.log(`Backend: offline (${error.message})`);
  }
}

async function shutdown() {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  if (buffer.persist) {
    buffer.save();
    console.log("Memory saved.");
  }

  rl.close();
}

function safePrompt() {
  if (shuttingDown || readlineClosed) {
    return;
  }

  try {
    rl.prompt();
  } catch {
    readlineClosed = true;
  }
}

async function handleCommand(command) {
  switch (command) {
    case "/mem":
      console.log(buffer.toContext());
      return true;
    case "/stats":
      console.log(JSON.stringify(buffer.stats(), null, 2));
      return true;
    case "/clear":
      bridge.reset();
      console.log("Memory cleared.");
      return true;
    case "/roll":
      console.log(toPianoRoll(buffer.getLog()));
      return true;
    case "/save":
      buffer.save();
      console.log(`Saved memory to ${buffer.persistPath}`);
      return true;
    case "/load":
      buffer.load();
      console.log(`Loaded ${buffer.getLog().length} events from ${buffer.persistPath}`);
      return true;
    case "/backend":
      console.log(`Active backend: ${bridge.activeBackend ?? "not detected"}`);
      return true;
    case "/exit":
      await shutdown();
      return false;
    default:
      console.log("Unknown command. Try /mem /stats /clear /roll /save /load /backend /exit");
      return true;
  }
}

async function main() {
  printBanner();
  await detectBackend();
  printGrammar();

  rl.on("SIGINT", () => {
    void shutdown();
  });
  rl.on("close", () => {
    readlineClosed = true;
  });

  safePrompt();

  for await (const line of rl) {
    const input = line.trim();

    if (shuttingDown) {
      break;
    }

    if (!input) {
      safePrompt();
      continue;
    }

    if (input.startsWith("/")) {
      const shouldContinue = await handleCommand(input);
      if (!shouldContinue) {
        break;
      }

      safePrompt();
      continue;
    }

    try {
      const reply = await bridge.chat(input);
      const log = buffer.getLog();
      const userEvent = log.at(-2);
      const assistantEvent = log.at(-1);

      console.log(`AI> ${reply}`);
      printEventSummary(userEvent, assistantEvent);
    } catch (error) {
      console.log(`ERR: ${error.message}`);
    }

    safePrompt();
  }

  await shutdown();
}

void main();

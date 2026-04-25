import { useState } from "react";

const CONTEXT = `
PROJECT: MIDI×MXit AI — a small, fast, local mobile AI model.
CORE CONCEPT: No floating-point weight matrices. Instead:
  - MIDI event structure encodes memory (pitch=topic, velocity=intensity, duration=importance, channel=speaker layer)
  - MXit-style compression shrinks context (like SA feature-phone shorthand: u=you, r=are, 2=to, 4=for, n=and)
  - Rolling chat log IS the memory — no weights file
GRAMMAR SPEC (already built — midi-grammar.js):
  - CHANNEL: USER=0, ASSISTANT=1, SYSTEM=2, EMOTION=3, ENTITY=4, INTENT=5
  - PITCH: 72 semantic slots (36–107), classified by domain (QUESTION=48, BUILD=63, FIX=64, etc.)
  - VELOCITY: 0–127, derived from punctuation energy (!, ?, CAPS)
  - DURATION: 100–5000ms, importance weight (COMMAND stays longer than GREETING)
  - buildEvent(rawText, compressedText, role) → event object
  - serialiseEvent(event) → "[U ch:0 pit:63 dom:BUILD vel:82 dur:1600ms] bld da sys"
STACK: Node.js / JavaScript (later: Dart/Flutter for mobile)
STYLE: Clean modules, ES6 exports, JSDoc comments, no external dependencies unless essential.
`.trim();

const STEPS = [
  {
    num: "01",
    title: "MXit Compressor Module",
    domain: "COMPRESSION",
    color: "#7ec832",
    prompt: `${CONTEXT}

TASK: Build the MXit Compressor as a standalone, exportable JS module.

FILE: mxit-compressor.js

REQUIREMENTS:
1. Export a function: mxitCompress(rawText) → compressedString
2. Export a function: mxitDecompress(compressedText) → approximateOriginal (best-effort reverse)
3. Abbreviation table must cover at minimum:
   - Pronouns: you→u, are→r, your→ur, they→dey, we→we, them→dem
   - Common verbs: going→goin, know→knw, think→thnk, want→wnt, have→hv, make→mk, build→bld, create→crt, need→nd
   - Conjunctions: and→n, that→dat, this→dis, because→coz, with→w/
   - Questions: what→wt, where→whr, when→wen, why→y, how→hw
   - Time: tonight→2nyt, tomorrow→2moro, later→l8r, before→b4, today→2day
   - Social: please→plz, thanks→thx, thank you→ty, sorry→sry, okay→k, great→gr8
   - Tech: system→sys, memory→mem, model→mdl, local→lcl, message→msg, information→info
   - Numbers-as-words: to→2, for→4, too→2also, ate→8, are→r
4. Multi-word phrases compressed before single-word (sort by length descending)
5. Preserve punctuation and spacing logic
6. Add compression ratio as metadata: mxitCompress returns { text, ratio, originalLength, compressedLength }
7. Unit test block at bottom (plain console.assert, no test framework needed)

EXAMPLE INPUT: "I am going to build the system tomorrow because I need to know how it works"
EXAMPLE OUTPUT: "i m goin 2 bld da sys 2moro coz i nd 2 knw hw it works"

Do not use any npm packages. Pure JS only.`,
  },
  {
    num: "02",
    title: "MIDI Encoder / Decoder",
    domain: "ENCODING",
    color: "#5ab0d0",
    prompt: `${CONTEXT}

TASK: Build the MIDI Encoder and Decoder as a standalone JS module.

FILE: midi-encoder.js

REQUIREMENTS:
1. Import buildEvent, serialiseEvent, CHANNEL, PITCH_DOMAIN, VELOCITY, DURATION from midi-grammar.js
2. Import mxitCompress from mxit-compressor.js

ENCODER:
- Export: encode(rawText, role) → MIDIEvent object
  - Calls mxitCompress internally
  - Calls buildEvent from grammar
  - Returns full event: { channel, pitch, velocity, duration, noteName, domain, role, raw, compressed, ts }

DECODER:
- Export: decode(event) → { role, meaning, intensity, importance, text }
  - Reconstructs human-readable summary from event fields
  - e.g. { role: 'user', meaning: 'BUILD request', intensity: 'EMPHASIS (82)', importance: '1600ms', text: 'bld da sys' }

BATCH:
- Export: encodeLog(messages) → MIDIEvent[]
  - messages = [{ text, role }]
  - Returns array of encoded events

SERIALISER:
- Export: logToContext(events) → string
  - Calls serialiseEvent on each
  - Returns newline-joined context string ready for LLM injection

PIANO ROLL:
- Export: toPianoRoll(events, width=32) → string (ASCII art)
  - Renders a simple ASCII piano roll showing which pitches fired
  - Each event = one column, pitch = row marker
  - Example output:
    C5 |   *       |
    B4 |     *   * |
    A4 | *         |

Unit test block at bottom. No npm packages.`,
  },
  {
    num: "03",
    title: "Memory Buffer Engine",
    domain: "MEMORY",
    color: "#d0a030",
    prompt: `${CONTEXT}

TASK: Build the Memory Buffer — the rolling log that IS the model's memory.

FILE: mxit-buffer.js

REQUIREMENTS:
Import encode, logToContext from midi-encoder.js

CLASS: MXitBuffer
  constructor(options = {})
    - options.maxEvents (default: 10) — rolling window size
    - options.persist (default: false) — if true, save/load from JSON file (Node.js fs)
    - options.persistPath (default: './mxit-memory.json')

  METHODS:
  push(rawText, role) → MIDIEvent
    - Encodes, appends to log, trims oldest if over maxEvents
    - Returns the new event

  toContext() → string
    - Serialises current log for LLM injection
    - Includes a header: "=MIDI×MXIT MEMORY LOG [N/MAX]="

  getLog() → MIDIEvent[]
    - Returns copy of current log

  clear() → void
    - Empties the log

  stats() → object
    - Returns { count, maxEvents, oldestTs, newestTs, dominantDomain, avgVelocity }
    - dominantDomain = most frequent pitch domain in current log

  save() → void (only if persist=true)
    - Writes log to JSON file

  load() → void (only if persist=true)
    - Reads log from JSON file on startup

MEMORY PRESSURE STRATEGY:
  When log is full and new event arrives:
  - Drop lowest-duration event first (least important), not necessarily oldest
  - If all durations equal, drop oldest

Export default MXitBuffer
Export named: createBuffer(options) factory function

Unit test block. No npm packages (use built-in fs only if persist=true).`,
  },
  {
    num: "04",
    title: "Local Inference Bridge",
    domain: "INFERENCE",
    color: "#d05050",
    prompt: `${CONTEXT}

TASK: Build the inference bridge that connects the memory buffer to a local LLM.

FILE: inference-bridge.js

REQUIREMENTS:
Import MXitBuffer from mxit-buffer.js

SUPPORTED BACKENDS (detect which is running, fallback in order):
1. Ollama (http://localhost:11434/api/generate)
2. LM Studio (http://localhost:1234/v1/chat/completions — OpenAI-compatible)
3. Custom agent on configurable port (default http://localhost:8787) — this is Agent Kyra

CLASS: InferenceBridge
  constructor(options = {})
    - options.backend: 'ollama' | 'lmstudio' | 'agent' | 'auto' (default: 'auto')
    - options.model: model name string (default: 'qwen3:0.6b' for ollama)
    - options.agentPort: number (default: 8787)
    - options.systemPrompt: string (default: see below)
    - options.buffer: MXitBuffer instance (required)

  DEFAULT SYSTEM PROMPT:
  See `KYRA_SYSTEM_PROMPT` in `./kyra-system-prompt.js`.
  It defines Kyra's operating persona for Cameron plus the MXit/MIDI memory decode rules.

  METHODS:
  detect() → Promise<string>
    - Pings each backend, returns name of first responding one
    - Logs result to console

  chat(userText) → Promise<string>
    - Pushes userText to buffer (role='user')
    - Builds context via buffer.toContext()
    - Sends to detected backend with system prompt + context
    - Pushes response to buffer (role='assistant')
    - Returns response string

  stream(userText, onChunk) → Promise<void>
    - Same as chat but streams tokens, calls onChunk(token) for each

  reset() → void
    - Calls buffer.clear()

Export default InferenceBridge

EXAMPLE USAGE (in comments at bottom of file):
  const bridge = new InferenceBridge({ buffer: new MXitBuffer({ maxEvents: 12 }) });
  await bridge.detect();
  const reply = await bridge.chat("how do I build the encoder?");
  console.log(reply);

No npm packages. Use built-in fetch (Node 18+).`,
  },
  {
    num: "05",
    title: "CLI Test Loop",
    domain: "TESTING",
    color: "#a050d0",
    prompt: `${CONTEXT}

TASK: Build a CLI test loop to run the full pipeline end-to-end in terminal.

FILE: cli.js (Node.js, run with: node cli.js)

REQUIREMENTS:
Import MXitBuffer from mxit-buffer.js
Import InferenceBridge from inference-bridge.js
Import { decode } from midi-encoder.js

FEATURES:
1. Interactive readline loop (Node built-in readline module)
2. User types → bridge.chat() → prints response
3. After each exchange, print a compact event summary:
   ┌─ EVENT ──────────────────────────────┐
   │ YOU  : [G4] BUILD · vel:82 · 1600ms  │
   │ AI   : [F4] ANSWER · vel:64 · 800ms  │
   └──────────────────────────────────────┘
4. Special commands:
   /mem     → print full buffer log (all events)
   /stats   → print buffer.stats()
   /clear   → clear buffer
   /roll    → print ASCII piano roll of current buffer
   /save    → save buffer to file
   /load    → load buffer from file
   /backend → show which backend is active
   /exit    → quit

5. On startup:
   - Print banner: "MIDI×MXIT AI — LOCAL INFERENCE ENGINE v0.1"
   - Auto-detect backend and print result
   - Print grammar summary

6. Handle Ctrl+C gracefully (save buffer before exit if persist=true)

No npm packages. readline, fs, fetch built-in only.`,
  },
  {
    num: "06",
    title: "Flutter Mobile Wrapper",
    domain: "MOBILE",
    color: "#30c0a0",
    prompt: `${CONTEXT}

TASK: Build the Flutter/Dart mobile wrapper for Android.

STACK: Flutter 3.x, Dart, no external state management (built-in setState only for now)

FILES TO CREATE:
  lib/
    main.dart
    midi_grammar.dart         ← port of midi-grammar.js
    mxit_compressor.dart      ← port of mxit-compressor.js  
    midi_encoder.dart         ← port of midi-encoder.js
    mxit_buffer.dart          ← port of mxit-buffer.js
    inference_client.dart     ← HTTP client to hit local inference bridge
    widgets/
      chat_screen.dart
      message_bubble.dart
      midi_visualizer.dart    ← piano roll widget
      memory_panel.dart

DESIGN:
  - Dark theme: background #080d08, accent #7ec832, secondary #5ab090
  - Font: monospace (use GoogleFonts.sharetech or fallback to RobotoMono)
  - Mobile-first: single column, bottom input bar, scrollable chat
  - Show MIDI event metadata below each bubble (note · velocity · duration)
  - Piano roll widget: 24-key horizontal bar at top, lights up on new event
  - Collapsible memory panel (swipe up from bottom)

INFERENCE CLIENT:
  - Connects to configurable IP:port (for when phone and PC are on same WiFi)
  - Default: http://192.168.x.x:8787 (Agent Kyra)
  - Settings screen to change IP/port
  - Shows connection status indicator (green dot = connected)

PERSISTENCE:
  - Use shared_preferences to store buffer as JSON
  - Auto-save on every message
  - Load on app startup

OFFLINE FIRST:
  - If inference server unreachable, show "OFFLINE — server not reachable" 
  - Queue messages, retry when reconnected

pubspec.yaml dependencies: only http, shared_preferences, google_fonts
No Firebase. No analytics. No ads.`,
  },
  {
    num: "07",
    title: "Fine-Tune Prompt Dataset",
    domain: "TRAINING",
    color: "#c07030",
    prompt: `${CONTEXT}

TASK: Generate a fine-tuning dataset that teaches a small model to natively read MIDI×MXit context.

FILE: generate-dataset.js (Node.js script, outputs dataset.jsonl)

DATASET FORMAT (JSONL — one JSON object per line):
{ "prompt": "...", "completion": "..." }

GENERATE 200 EXAMPLES covering:

1. MXIT DECODING (50 examples)
   Prompt: "Decode this MXit message: [U ch:0 pit:63 dom:BUILD vel:82 dur:1600ms] hw do i bld da mdl"
   Completion: "User is asking how to build the model. HIGH intensity (82). Important context (1600ms)."

2. MIDI CONTEXT READING (50 examples)
   Prompt: Full 5-event MIDI×MXit memory log
   Completion: Summary of what the conversation was about + appropriate response

3. COMPRESSION AWARENESS (30 examples)
   Prompt: MXit compressed sentence
   Completion: Full English reconstruction

4. DOMAIN CLASSIFICATION (30 examples)
   Prompt: Raw sentence
   Completion: Predicted MIDI event { domain, velocity, duration } with explanation

5. RESPONSE GENERATION (40 examples)
   Prompt: MIDI context log ending in a user question
   Completion: Short, direct, mobile-appropriate answer

VARIETY:
  - Mix SA English, informal English, MXit slang
  - Mix domains: tech, community, creative, finance, general
  - Mix intensity levels: calm questions, urgent requests, excited announcements
  - Include Cameron's project names naturally: Buddies Worldwide, OCIU, OpenClaw, Agent Kyra

OUTPUT:
  - dataset.jsonl (200 lines)
  - dataset-stats.json (counts per category, vocabulary stats)

Script must be runnable: node generate-dataset.js
No npm packages needed.`,
  },
];

export default function VibePrompts() {
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(STEPS[active].prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const step = STEPS[active];

  return (
    <div style={{
      fontFamily: "'Share Tech Mono', 'Courier New', monospace",
      background: '#080d08',
      color: '#7ec832',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      maxWidth: 520,
      margin: '0 auto',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: #050905; }
        ::-webkit-scrollbar-thumb { background: #1e3a1e; }
        @keyframes flash { 0%{opacity:1} 50%{opacity:0.3} 100%{opacity:1} }
      `}</style>

      {/* HEADER */}
      <div style={{
        padding: '12px 16px 10px',
        borderBottom: '1px solid #1a2a1a',
        background: '#0b100b',
      }}>
        <div style={{ fontSize: 13, letterSpacing: 3, color: '#8ab960' }}>◈ VIBE CODE PACK</div>
        <div style={{ fontSize: 8, color: '#2a4a2a', letterSpacing: 2 }}>
          MIDI×MXIT AI — {STEPS.length} PROMPTS · PASTE INTO ANY AI CODER
        </div>
      </div>

      {/* STEP SELECTOR */}
      <div style={{
        display: 'flex',
        overflowX: 'auto',
        borderBottom: '1px solid #1a2a1a',
        background: '#070c07',
        padding: '8px 10px',
        gap: 6,
      }}>
        {STEPS.map((s, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            style={{
              background: active === i ? '#0f1f0f' : 'none',
              border: `1px solid ${active === i ? s.color + '88' : '#1a2a1a'}`,
              color: active === i ? s.color : '#2a4a2a',
              padding: '5px 10px',
              fontSize: 9,
              fontFamily: 'inherit',
              cursor: 'pointer',
              borderRadius: 2,
              whiteSpace: 'nowrap',
              letterSpacing: 1,
              transition: 'all 0.15s',
              flexShrink: 0,
            }}
          >
            {s.num}
          </button>
        ))}
      </div>

      {/* ACTIVE STEP */}
      <div style={{ padding: '14px 16px 8px', borderBottom: '1px solid #1a2a1a' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 11, color: step.color, letterSpacing: 2, marginBottom: 3 }}>
              STEP {step.num} — {step.title}
            </div>
            <div style={{
              display: 'inline-block',
              fontSize: 8,
              background: step.color + '18',
              border: `1px solid ${step.color}44`,
              color: step.color + 'aa',
              padding: '2px 7px',
              letterSpacing: 2,
            }}>
              {step.domain}
            </div>
          </div>
          <button
            onClick={copy}
            style={{
              background: copied ? '#1a3a1a' : '#0f1f0f',
              border: `1px solid ${copied ? step.color : '#2a4a1a'}`,
              color: copied ? step.color : '#4a7a3a',
              padding: '6px 14px',
              fontSize: 10,
              fontFamily: 'inherit',
              cursor: 'pointer',
              letterSpacing: 1,
              borderRadius: 2,
              transition: 'all 0.15s',
            }}
          >
            {copied ? '✓ COPIED' : 'COPY'}
          </button>
        </div>
      </div>

      {/* PROMPT DISPLAY */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '14px 16px',
        background: '#060b06',
        fontSize: 10,
        lineHeight: 1.9,
        color: '#5a8a4a',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        minHeight: 400,
      }}>
        {step.prompt}
      </div>

      {/* NAV */}
      <div style={{
        padding: '10px 16px',
        borderTop: '1px solid #1a2a1a',
        background: '#0b100b',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <button
          onClick={() => setActive(a => Math.max(0, a - 1))}
          disabled={active === 0}
          style={{
            background: 'none', border: '1px solid #1a2a1a',
            color: active === 0 ? '#1a2a1a' : '#4a7a3a',
            padding: '5px 12px', fontSize: 10,
            fontFamily: 'inherit', cursor: active === 0 ? 'default' : 'pointer',
            letterSpacing: 1,
          }}
        >← PREV</button>

        <div style={{ fontSize: 9, color: '#2a4a2a', letterSpacing: 1 }}>
          {active + 1} / {STEPS.length}
        </div>

        <button
          onClick={() => setActive(a => Math.min(STEPS.length - 1, a + 1))}
          disabled={active === STEPS.length - 1}
          style={{
            background: 'none', border: '1px solid #1a2a1a',
            color: active === STEPS.length - 1 ? '#1a2a1a' : '#4a7a3a',
            padding: '5px 12px', fontSize: 10,
            fontFamily: 'inherit', cursor: active === STEPS.length - 1 ? 'default' : 'pointer',
            letterSpacing: 1,
          }}
        >NEXT →</button>
      </div>
    </div>
  );
}

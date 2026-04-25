import { pathToFileURL } from "node:url";

import {
  buildEvent,
  serialiseEvent,
  CHANNEL,
  PITCH_DOMAIN,
  VELOCITY,
  DURATION,
  pitchToNoteName
} from "./midi-grammar.js";
import { mxitCompress } from "./mxit-compressor.js";

const ACTION_DOMAINS = new Set([
  PITCH_DOMAIN.REQUEST,
  PITCH_DOMAIN.COMMAND,
  PITCH_DOMAIN.BUILD,
  PITCH_DOMAIN.FIX,
  PITCH_DOMAIN.SEARCH,
  PITCH_DOMAIN.SEND,
  PITCH_DOMAIN.SAVE
]);

function normaliseRole(event) {
  if (event.role) {
    return String(event.role).toLowerCase();
  }

  const matchedEntry = Object.entries(CHANNEL).find(([, value]) => {
    return value === event.channel;
  });

  return matchedEntry ? matchedEntry[0].toLowerCase() : "user";
}

function describeMeaning(event, role) {
  const domain = event.domain ?? "UNKNOWN";

  if (role === "user" && ACTION_DOMAINS.has(event.pitch)) {
    return `${domain} request`;
  }

  if (role === "assistant") {
    return `${domain} response`;
  }

  if (event.pitch === PITCH_DOMAIN.QUESTION) {
    return "QUESTION prompt";
  }

  return `${domain} message`;
}

function describeIntensity(velocity) {
  if (velocity >= VELOCITY.URGENT) {
    return `URGENT (${velocity})`;
  }
  if (velocity >= VELOCITY.EMPHASIS) {
    return `EMPHASIS (${velocity})`;
  }
  if (velocity >= VELOCITY.NORMAL) {
    return `NORMAL (${velocity})`;
  }
  if (velocity >= VELOCITY.SOFT) {
    return `SOFT (${velocity})`;
  }
  if (velocity >= VELOCITY.WHISPER) {
    return `WHISPER (${velocity})`;
  }
  return `SILENT (${velocity})`;
}

function describeImportance(duration) {
  if (duration >= DURATION.ANCHOR) {
    return `${DURATION.ANCHOR}ms`;
  }
  return `${duration}ms`;
}

export function encode(rawText, role = "user") {
  const compressed = mxitCompress(rawText);
  return buildEvent(rawText, compressed.text, role);
}

export function decode(event) {
  const role = normaliseRole(event);

  return {
    role,
    meaning: describeMeaning(event, role),
    intensity: describeIntensity(event.velocity ?? VELOCITY.NORMAL),
    importance: describeImportance(event.duration ?? DURATION.NORMAL),
    text: event.compressed ?? mxitCompress(event.raw ?? "").text
  };
}

export function encodeLog(messages = []) {
  return messages.map(({ text, role = "user" }) => encode(text, role));
}

export function logToContext(events = []) {
  return events.map((event) => serialiseEvent(event)).join("\n");
}

export function toPianoRoll(events = [], width = 32) {
  if (events.length === 0) {
    return "(empty piano roll)";
  }

  const columnCount = Math.max(1, Number(width) || 32);
  const visibleEvents = events.slice(-columnCount);
  const pitches = [...new Set(visibleEvents.map((event) => event.pitch))].sort((a, b) => b - a);

  return pitches.map((pitch) => {
    const label = pitchToNoteName(pitch).padEnd(3, " ");
    const columns = visibleEvents
      .map((event) => (event.pitch === pitch ? "*" : " "))
      .join("")
      .padEnd(columnCount, " ");

    return `${label} | ${columns} |`;
  }).join("\n");
}

const isDirectRun = Boolean(process.argv[1]) &&
  pathToFileURL(process.argv[1]).href === import.meta.url;

if (isDirectRun) {
  const event = encode(
    "I am going to build the system tomorrow because I need to know how it works",
    "user"
  );

  console.assert(event.role === "user", "Role should be preserved");
  console.assert(event.domain === "BUILD", `Expected BUILD domain, received ${event.domain}`);

  const decoded = decode(event);
  console.assert(decoded.meaning === "BUILD request", `Unexpected meaning: ${decoded.meaning}`);
  console.assert(decoded.text === "i m goin 2 bld da sys 2moro coz i nd 2 knw hw it works");

  const log = encodeLog([
    { text: "please build the model", role: "user" },
    { text: "I can help with that", role: "assistant" }
  ]);
  console.assert(log.length === 2, "encodeLog should encode all messages");

  const context = logToContext(log);
  console.assert(context.includes("[U ch:0"), "Context should serialise user events");

  const pianoRoll = toPianoRoll(log, 4);
  console.assert(pianoRoll.includes("*"), "Piano roll should include event markers");

  console.log("midi-encoder.js tests passed");
}

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { encode, logToContext } from "./midi-encoder.js";

function cloneEvent(event) {
  return {
    ...event
  };
}

function sanitiseEvent(event) {
  return {
    channel: Number(event.channel ?? 0),
    pitch: Number(event.pitch ?? 0),
    velocity: Number(event.velocity ?? 0),
    duration: Number(event.duration ?? 0),
    noteName: String(event.noteName ?? ""),
    domain: String(event.domain ?? "UNKNOWN"),
    role: String(event.role ?? "user"),
    raw: String(event.raw ?? ""),
    compressed: String(event.compressed ?? ""),
    ts: Number(event.ts ?? Date.now())
  };
}

export default class MXitBuffer {
  constructor(options = {}) {
    this.maxEvents = Number.isInteger(options.maxEvents) && options.maxEvents > 0
      ? options.maxEvents
      : 10;
    this.persist = Boolean(options.persist);
    this.persistPath = options.persistPath ?? "./mxit-memory.json";
    this.log = [];

    if (this.persist) {
      this.load();
    }
  }

  push(rawText, role = "user") {
    const event = encode(rawText, role);
    this.log.push(event);

    if (this.log.length > this.maxEvents) {
      this.pruneToFit();
    }

    if (this.persist) {
      this.save();
    }

    return cloneEvent(event);
  }

  toContext() {
    const header = `=MIDI×MXIT MEMORY LOG [${this.log.length}/${this.maxEvents}]=`;
    const body = logToContext(this.log);
    return body ? `${header}\n${body}` : header;
  }

  getLog() {
    return this.log.map(cloneEvent);
  }

  clear() {
    this.log = [];

    if (this.persist) {
      this.save();
    }
  }

  stats() {
    if (this.log.length === 0) {
      return {
        count: 0,
        maxEvents: this.maxEvents,
        oldestTs: null,
        newestTs: null,
        dominantDomain: null,
        avgVelocity: 0
      };
    }

    const domainCounts = new Map();
    let velocityTotal = 0;

    for (const event of this.log) {
      velocityTotal += event.velocity;
      domainCounts.set(event.domain, (domainCounts.get(event.domain) ?? 0) + 1);
    }

    let dominantDomain = null;
    let dominantCount = -1;

    for (const [domain, count] of domainCounts.entries()) {
      if (count > dominantCount) {
        dominantDomain = domain;
        dominantCount = count;
      }
    }

    return {
      count: this.log.length,
      maxEvents: this.maxEvents,
      oldestTs: this.log[0]?.ts ?? null,
      newestTs: this.log[this.log.length - 1]?.ts ?? null,
      dominantDomain,
      avgVelocity: Number((velocityTotal / this.log.length).toFixed(2))
    };
  }

  save() {
    if (!this.persist) {
      return;
    }

    writeFileSync(this.persistPath, JSON.stringify(this.log, null, 2), "utf8");
  }

  load() {
    if (!this.persist || !existsSync(this.persistPath)) {
      return;
    }

    try {
      const parsed = JSON.parse(readFileSync(this.persistPath, "utf8"));
      this.log = Array.isArray(parsed)
        ? parsed.map(sanitiseEvent)
        : [];
      this.pruneToFit();
    } catch {
      this.log = [];
    }
  }

  pruneToFit() {
    while (this.log.length > this.maxEvents) {
      let dropIndex = 0;

      for (let index = 1; index < this.log.length; index += 1) {
        const current = this.log[index];
        const candidate = this.log[dropIndex];

        if (current.duration < candidate.duration) {
          dropIndex = index;
          continue;
        }

        if (current.duration === candidate.duration && current.ts < candidate.ts) {
          dropIndex = index;
        }
      }

      this.log.splice(dropIndex, 1);
    }
  }
}

export function createBuffer(options) {
  return new MXitBuffer(options);
}

const isDirectRun = Boolean(process.argv[1]) &&
  pathToFileURL(process.argv[1]).href === import.meta.url;

if (isDirectRun) {
  const buffer = new MXitBuffer({ maxEvents: 2 });

  buffer.push("Please build the system tomorrow because we need the full memory log", "user");
  buffer.push("I can help build the model right now", "assistant");
  buffer.push("hi", "user");

  const log = buffer.getLog();

  console.assert(log.length === 2, "Buffer should respect maxEvents");
  console.assert(
    !log.some((event) => event.raw === "hi"),
    "Lowest-duration event should be dropped under memory pressure"
  );
  console.assert(
    buffer.toContext().startsWith("=MIDI×MXIT MEMORY LOG [2/2]="),
    "Context output should include the memory header"
  );

  const stats = buffer.stats();
  console.assert(stats.count === 2, "Stats should report current event count");

  buffer.clear();
  console.assert(buffer.getLog().length === 0, "clear() should empty the buffer");

  console.log("mxit-buffer.js tests passed");
}

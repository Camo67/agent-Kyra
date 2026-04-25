import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  appendKyraConversation,
  ensureObsidianVault,
  linkKyraBufferMemory,
  readKyraMemory,
  writeKyraMemory
} from "../obsidian-memory.js";
import { createVoiceReply } from "../voice-adapter.js";

test("obsidian vault is created and can store a conversation", async () => {
  const vaultPath = await mkdtemp(path.join(tmpdir(), "kyra-vault-"));

  try {
    await ensureObsidianVault({ vaultPath });
    const context = await readKyraMemory({ vaultPath });
    assert.match(context, /Kyra Profile/);
    assert.match(context, /Cameron De Vries/);
    assert.match(context, /OpenClaw/);
    assert.match(context, /Kyra Memory Index/);

    const conversation = await appendKyraConversation({
      userText: "hello kyra",
      reply: "hello camo",
      ts: 1776300000000,
      voice: {
        jobPath: "/tmp/voice-job.json"
      }
    }, { vaultPath });

    const written = await readFile(conversation.fullPath, "utf8");
    assert.match(written, /hello kyra/);
    assert.match(written, /hello camo/);
    assert.match(written, /voice-job\.json/);
  } finally {
    await rm(vaultPath, { recursive: true, force: true });
  }
});

test("obsidian memory writer creates readable Kyra memory notes", async () => {
  const vaultPath = await mkdtemp(path.join(tmpdir(), "kyra-memory-"));

  try {
    const memory = await writeKyraMemory({
      title: "Tone Preference",
      content: "Keep the vibe informal and clear.",
      tags: ["style", "memory"],
      source: "test"
    }, { vaultPath });
    const written = await readFile(memory.fullPath, "utf8");
    const context = await readKyraMemory({ vaultPath });

    assert.equal(memory.relativePath, path.join("Kyra", "Memory", "tone-preference.md"));
    assert.match(written, /Tone Preference/);
    assert.match(written, /Keep the vibe informal and clear/);
    assert.match(context, /Tone Preference/);
  } finally {
    await rm(vaultPath, { recursive: true, force: true });
  }
});

test("live mxit memory can be linked into obsidian", async () => {
  const vaultPath = await mkdtemp(path.join(tmpdir(), "kyra-linked-memory-"));

  try {
    const memory = await linkKyraBufferMemory({
      context: [
        "=MIDI×MXIT MEMORY LOG [2/12]=",
        "[U ch:0 pit:60 dom:BUILD vel:72 dur:1100ms] bld kyra ui",
        "[A ch:1 pit:67 dom:STATUS vel:64 dur:920ms] ui online"
      ].join("\n"),
      events: [
        {
          role: "user",
          noteName: "C4",
          domain: "BUILD",
          velocity: 72,
          duration: 1100,
          raw: "build kyra ui",
          compressed: "bld kyra ui"
        },
        {
          role: "assistant",
          noteName: "G4",
          domain: "STATUS",
          velocity: 64,
          duration: 920,
          raw: "ui online",
          compressed: "ui online"
        }
      ],
      stats: {
        count: 2,
        maxEvents: 12,
        dominantDomain: "BUILD",
        avgVelocity: 68,
        oldestTs: 1776300000000,
        newestTs: 1776300060000
      },
      source: "test"
    }, { vaultPath });
    const written = await readFile(memory.fullPath, "utf8");

    assert.match(written, /Live MXit buffer snapshot linked into Obsidian/);
    assert.match(written, /Snapshot Summary/);
    assert.match(written, /Dominant domain: BUILD/);
    assert.match(written, /=MIDI×MXIT MEMORY LOG \[2\/12\]=/);
    assert.match(written, /### USER · C4 · BUILD/);
    assert.match(written, /### ASSISTANT · G4 · STATUS/);
  } finally {
    await rm(vaultPath, { recursive: true, force: true });
  }
});

test("voice adapter queues a job with approved reference metadata", async () => {
  const outputDir = await mkdtemp(path.join(tmpdir(), "kyra-voice-"));

  try {
    const voice = await createVoiceReply("Kyra is online.", {
      outputDir,
      provider: "queue",
      voiceId: "cameron-approved-voice",
      referenceAudioPath: "/tmp/cameron.wav"
    });
    const payload = JSON.parse(await readFile(voice.jobPath, "utf8"));

    assert.equal(voice.status, "queued");
    assert.equal(payload.voiceId, "cameron-approved-voice");
    assert.equal(payload.referenceAudioPath, "/tmp/cameron.wav");
    assert.equal(payload.text, "Kyra is online.");
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});

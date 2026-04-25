import { appendFile, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_VAULT_PATH = path.resolve("obsidian-vault");
const KYRA_DIRS = [
  ".obsidian",
  "Kyra",
  "Kyra/Memory",
  "Kyra/Conversations",
  "Kyra/Voice"
];

function resolveVaultPath(vaultPath = process.env.OBSIDIAN_VAULT_PATH) {
  return path.resolve(vaultPath || DEFAULT_VAULT_PATH);
}

function assertSafeRelativePath(relativePath) {
  if (!relativePath || path.isAbsolute(relativePath)) {
    throw new Error("Expected a relative vault path");
  }

  const normalized = path.normalize(relativePath);
  if (normalized.startsWith("..") || normalized.includes(`${path.sep}..${path.sep}`)) {
    throw new Error(`Unsafe vault path: ${relativePath}`);
  }

  return normalized;
}

function formatDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function formatTimestamp(date = new Date()) {
  return date.toISOString();
}

function slugify(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80) || `memory-${Date.now()}`;
}

async function writeIfMissing(filePath, content) {
  try {
    await stat(filePath);
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }

    await writeFile(filePath, content);
  }
}

async function collectMarkdownFiles(rootDir, limit = 20) {
  const entries = await readdir(rootDir, { withFileTypes: true }).catch((error) => {
    if (error?.code === "ENOENT") {
      return [];
    }

    throw error;
  });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);

    if (entry.isDirectory()) {
      files.push(...await collectMarkdownFiles(fullPath, limit));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }

    if (files.length >= limit) {
      break;
    }
  }

  return files.slice(0, limit);
}

async function readMarkdownSection(vaultPath, relativePath) {
  const safePath = assertSafeRelativePath(relativePath);
  const fullPath = path.join(vaultPath, safePath);
  const text = await readFile(fullPath, "utf8").catch((error) => {
    if (error?.code === "ENOENT") {
      return "";
    }

    throw error;
  });

  if (!text.trim()) {
    return "";
  }

  return `# ${safePath}\n${text.trim()}`;
}

export async function ensureObsidianVault(options = {}) {
  const vaultPath = resolveVaultPath(options.vaultPath);

  for (const relativeDir of KYRA_DIRS) {
    await mkdir(path.join(vaultPath, relativeDir), { recursive: true });
  }

  await writeIfMissing(
    path.join(vaultPath, ".obsidian", "app.json"),
    JSON.stringify({ alwaysUpdateLinks: true }, null, 2)
  );
  await writeIfMissing(
    path.join(vaultPath, "Kyra", "profile.md"),
    [
      "# Kyra Profile",
      "",
      "Kyra is the personal AI agent of Cameron De Vries, built under CamodevOps in Bonteheuwel, Cape Town.",
      "",
      "Core role:",
      "- Personal assistant for tasks, drafts, reminders, research, and decisions.",
      "- Automation agent for workflow design, triggering, and debugging.",
      "- Task executor that breaks goals into concrete next actions.",
      "",
      "Operating tone:",
      "- Direct, technical, no fluff.",
      "- Lead with the answer, then the reasoning.",
      "- Flag blockers and weak plans fast.",
      "",
      "Ventures in scope: OpenClaw, Buddies Worldwide, 79Ratio, OCIU, and Unspoken Truths.",
      "",
      "Principles: zero-cost first, resilience under weak bandwidth and load-shedding, ship fast, community-first, no vendor lock-in.",
      "",
      "Voice rule: Kyra may use Cameron's own approved reference voice only for local assistant replies. Do not imitate third parties."
    ].join("\n")
  );
  await writeIfMissing(
    path.join(vaultPath, "Kyra", "Memory", "index.md"),
    [
      "# Kyra Memory Index",
      "",
      "- Store durable preferences, project facts, and decisions here.",
      "- Keep private voice samples opt-in and clearly labeled."
    ].join("\n")
  );
  await writeIfMissing(
    path.join(vaultPath, "Kyra", "Voice", "voice-consent.md"),
    [
      "# Voice Consent",
      "",
      "Approved voice identity: Cameron's own voice.",
      "",
      "Kyra may generate local assistant speech with Cameron-approved reference audio. Do not use WhatsApp or third-party voice notes unless Cameron explicitly marks the clip as their own voice."
    ].join("\n")
  );

  return vaultPath;
}

export async function readKyraMemory(options = {}) {
  const vaultPath = await ensureObsidianVault(options);
  const limit = Number(options.limit ?? process.env.OBSIDIAN_MEMORY_LIMIT ?? 20);
  const sections = [
    await readMarkdownSection(vaultPath, "Kyra/profile.md"),
    await readMarkdownSection(vaultPath, "Kyra/Memory/index.md")
  ];

  const memoryFiles = await collectMarkdownFiles(path.join(vaultPath, "Kyra", "Memory"), limit);
  for (const filePath of memoryFiles) {
    const relativePath = path.relative(vaultPath, filePath);
    if (relativePath === path.join("Kyra", "Memory", "index.md")) {
      continue;
    }

    sections.push(await readMarkdownSection(vaultPath, relativePath));
  }

  return [
    "=OBSIDIAN KYRA MEMORY=",
    ...sections.filter(Boolean)
  ].join("\n\n");
}

export async function appendKyraConversation(entry, options = {}) {
  const vaultPath = await ensureObsidianVault(options);
  const now = entry.ts ? new Date(entry.ts) : new Date();
  const relativePath = path.join("Kyra", "Conversations", `${formatDate(now)}.md`);
  const fullPath = path.join(vaultPath, relativePath);
  const lines = [
    "",
    `## ${formatTimestamp(now)}`,
    "",
    `**User:** ${String(entry.userText ?? "").trim()}`,
    "",
    `**Kyra:** ${String(entry.reply ?? "").trim()}`
  ];

  if (entry.voice?.jobPath || entry.voice?.audioPath) {
    lines.push("", `**Voice:** ${entry.voice.audioPath ?? entry.voice.jobPath}`);
  }

  await appendFile(fullPath, `${lines.join("\n")}\n`);
  return {
    vaultPath,
    relativePath,
    fullPath
  };
}

export async function writeKyraMemory(entry, options = {}) {
  const vaultPath = await ensureObsidianVault(options);
  const title = String(entry.title ?? "").trim();
  const content = String(entry.content ?? "").trim();

  if (!title) {
    throw new Error("Field 'title' is required");
  }

  if (!content) {
    throw new Error("Field 'content' is required");
  }

  const tags = Array.isArray(entry.tags)
    ? entry.tags.map((tag) => String(tag).trim()).filter(Boolean)
    : [];
  const now = entry.ts ? new Date(entry.ts) : new Date();
  const fileName = `${slugify(title)}.md`;
  const relativePath = path.join("Kyra", "Memory", fileName);
  const fullPath = path.join(vaultPath, relativePath);
  const body = [
    "---",
    `title: ${JSON.stringify(title)}`,
    `created: ${formatTimestamp(now)}`,
    `source: ${JSON.stringify(String(entry.source ?? "kyra-memory-api"))}`,
    tags.length ? `tags: [${tags.map((tag) => JSON.stringify(tag)).join(", ")}]` : "tags: []",
    "---",
    "",
    `# ${title}`,
    "",
    content
  ].join("\n");

  await writeFile(fullPath, `${body}\n`);

  return {
    vaultPath,
    relativePath,
    fullPath
  };
}

export async function linkKyraBufferMemory(entry, options = {}) {
  const events = Array.isArray(entry.events) ? entry.events : [];
  const context = String(entry.context ?? "").trim();
  const stats = entry.stats ?? {};

  if (!events.length || !context) {
    throw new Error("No live memory events to link");
  }

  const now = entry.ts ? new Date(entry.ts) : new Date();
  const summaryLines = [
    "## Snapshot Summary",
    "",
    `- Events: ${Number(stats.count ?? events.length)}/${Number(stats.maxEvents ?? events.length)}`,
    `- Dominant domain: ${stats.dominantDomain ?? "unknown"}`,
    `- Average velocity: ${stats.avgVelocity ?? "unknown"}`,
    `- Oldest event: ${stats.oldestTs ? formatTimestamp(new Date(stats.oldestTs)) : "unknown"}`,
    `- Newest event: ${stats.newestTs ? formatTimestamp(new Date(stats.newestTs)) : "unknown"}`
  ];

  const eventLines = events.map((event) => {
    const role = String(event.role ?? "user");
    const noteName = String(event.noteName ?? "");
    const domain = String(event.domain ?? "UNKNOWN");
    const velocity = Number(event.velocity ?? 0);
    const duration = Number(event.duration ?? 0);
    const raw = String(event.raw ?? "").trim();
    const compressed = String(event.compressed ?? "").trim();

    return [
      `### ${role.toUpperCase()} · ${noteName} · ${domain}`,
      "",
      `- Velocity: ${velocity}`,
      `- Duration: ${duration}ms`,
      raw ? `- Raw: ${raw}` : "- Raw: (empty)",
      compressed ? `- Compressed: ${compressed}` : "- Compressed: (empty)"
    ].join("\n");
  });

  const content = [
    "Live MXit buffer snapshot linked into Obsidian for Kyra.",
    "",
    ...summaryLines,
    "",
    "## Buffer Context",
    "",
    "```text",
    context,
    "```",
    "",
    "## Event Log",
    "",
    ...eventLines
  ].join("\n");

  return writeKyraMemory({
    title: entry.title ?? `Live Memory Link ${formatTimestamp(now)}`,
    content,
    tags: Array.isArray(entry.tags) && entry.tags.length
      ? entry.tags
      : ["memory", "midi", "mxit", "obsidian-link"],
    source: entry.source ?? "kyra-memory-link-api",
    ts: now
  }, options);
}

export { resolveVaultPath };

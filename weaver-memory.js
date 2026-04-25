import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  ensureObsidianVault,
  resolveVaultPath,
  writeKyraMemory
} from "./obsidian-memory.js";

const DEFAULT_INDEX_PATH = path.join(".weaver", "kyra-memory-index.json");

function slugify(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80) || `node-${Date.now()}`;
}

function tokenize(value) {
  return Array.from(new Set(
    String(value ?? "")
      .toLowerCase()
      .match(/[a-z0-9]{3,}/g) ?? []
  ));
}

function nowIso() {
  return new Date().toISOString();
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") {
      return fallback;
    }

    throw error;
  }
}

function normalizeNode(node) {
  const label = String(node.label ?? node.title ?? "Untitled Memory").trim();
  const content = String(node.content ?? node.data?.content ?? "").trim();
  const type = String(node.type ?? "memory").trim() || "memory";
  const id = String(node.id ?? `${type}-${slugify(label)}-${Date.now()}`);
  const createdAt = node.createdAt ?? node.metadata?.createdAt ?? nowIso();
  const updatedAt = nowIso();

  return {
    id,
    type,
    label,
    content,
    tokens: tokenize(`${label} ${content}`),
    metadata: {
      ...(node.metadata ?? {}),
      createdAt,
      updatedAt,
      obsidianPath: node.obsidianPath ?? node.metadata?.obsidianPath ?? null
    }
  };
}

export class WeaverMemory {
  constructor(options = {}) {
    this.vaultPath = resolveVaultPath(options.vaultPath);
    this.indexPath = path.resolve(options.indexPath || process.env.WEAVER_INDEX_PATH || DEFAULT_INDEX_PATH);
  }

  async ensure() {
    await ensureObsidianVault({ vaultPath: this.vaultPath });
    await mkdir(path.dirname(this.indexPath), { recursive: true });
    const index = await readJson(this.indexPath, null);

    if (!index) {
      await this.writeIndex({
        version: 1,
        name: "kyra-weaver-memory",
        storage: {
          durable: "obsidian",
          index: "weaver",
          vaultPath: this.vaultPath
        },
        nodes: []
      });
    }

    return {
      vaultPath: this.vaultPath,
      indexPath: this.indexPath
    };
  }

  async readIndex() {
    await this.ensure();
    return readJson(this.indexPath, {
      version: 1,
      name: "kyra-weaver-memory",
      storage: {
        durable: "obsidian",
        index: "weaver",
        vaultPath: this.vaultPath
      },
      nodes: []
    });
  }

  async writeIndex(index) {
    await mkdir(path.dirname(this.indexPath), { recursive: true });
    await writeFile(this.indexPath, `${JSON.stringify(index, null, 2)}\n`);
    return index;
  }

  async createNode(type, label, data = {}) {
    const node = normalizeNode({
      type,
      label,
      content: data.content,
      metadata: data.metadata
    });
    const index = await this.readIndex();
    index.nodes = [
      ...index.nodes.filter((existing) => existing.id !== node.id),
      node
    ];
    await this.writeIndex(index);
    return node;
  }

  async getNodeById(id) {
    const index = await this.readIndex();
    return index.nodes.find((node) => node.id === id) ?? null;
  }

  async search(query, limit = 8) {
    const queryTokens = tokenize(query);
    const index = await this.readIndex();

    return index.nodes
      .map((node) => {
        const overlap = node.tokens.filter((token) => queryTokens.includes(token)).length;
        const haystack = `${node.label}\n${node.content}`.toLowerCase();
        const exact = String(query ?? "").trim() && haystack.includes(String(query).toLowerCase()) ? 3 : 0;
        return {
          ...node,
          score: overlap + exact
        };
      })
      .filter((node) => node.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  async weaverToObsidian(node, notePath) {
    const normalized = normalizeNode(node);
    const memory = await writeKyraMemory({
      title: normalized.label,
      content: normalized.content || "(empty)",
      tags: ["memory", "weaver", normalized.type].filter(Boolean),
      source: "kyra-weaver",
      ts: normalized.metadata.createdAt
    }, { vaultPath: this.vaultPath });

    const index = await this.readIndex();
    const nextNode = {
      ...normalized,
      metadata: {
        ...normalized.metadata,
        obsidianPath: notePath || memory.relativePath
      }
    };
    index.nodes = [
      ...index.nodes.filter((existing) => existing.id !== nextNode.id),
      nextNode
    ];
    await this.writeIndex(index);

    return notePath || memory.relativePath;
  }

  async obsidianToWeaver(notePath) {
    await this.ensure();
    const relativePath = path.normalize(notePath);
    if (path.isAbsolute(relativePath) || relativePath.startsWith("..")) {
      throw new Error(`Unsafe Obsidian note path: ${notePath}`);
    }

    const fullPath = path.join(this.vaultPath, relativePath);
    const content = await readFile(fullPath, "utf8");
    const label = path.basename(relativePath, path.extname(relativePath));
    const node = normalizeNode({
      type: "obsidian-note",
      label,
      content,
      metadata: {
        source: "obsidian",
        obsidianPath: relativePath
      }
    });

    const index = await this.readIndex();
    index.nodes = [
      ...index.nodes.filter((existing) => existing.metadata?.obsidianPath !== relativePath),
      node
    ];
    await this.writeIndex(index);
    return node;
  }

  async syncMemory(direction = "bidirectional") {
    await this.ensure();
    const index = await this.readIndex();
    return {
      direction,
      vaultPath: this.vaultPath,
      indexPath: this.indexPath,
      nodes: index.nodes
    };
  }
}

export default WeaverMemory;

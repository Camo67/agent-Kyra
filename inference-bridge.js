import { pathToFileURL } from "node:url";

import MXitBuffer from "./mxit-buffer.js";
import KYRA_SYSTEM_PROMPT from "./kyra-system-prompt.js";

const DEFAULT_SYSTEM_PROMPT = KYRA_SYSTEM_PROMPT;

const DETECTION_ORDER = ["ollama", "lmstudio", "agent"];

function hasBufferShape(buffer) {
  return buffer &&
    typeof buffer.push === "function" &&
    typeof buffer.toContext === "function" &&
    typeof buffer.clear === "function";
}

function withTimeout(options = {}, timeoutMs = 3000) {
  return {
    ...options,
    signal: options.signal ?? AbortSignal.timeout(timeoutMs)
  };
}

async function readErrorBody(response) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

function buildPrompt(context, userText) {
  return [
    context,
    "",
    `Last user message: ${userText}`,
    "Reply to the last user message in plain English."
  ].join("\n");
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function extractOpenAiText(payload) {
  const choice = payload?.choices?.[0];
  return cleanText(choice?.message?.content ?? choice?.delta?.content ?? "");
}

function extractAgentText(payload) {
  return cleanText(
    payload?.reply ??
    payload?.response ??
    payload?.text ??
    extractOpenAiText(payload)
  );
}

function resolveSystemPrompt(systemPrompt, fallbackPrompt) {
  return cleanText(systemPrompt) || fallbackPrompt;
}

async function consumeLineStream(response, onChunk, lineParser) {
  const reader = response.body?.getReader();
  if (!reader) {
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });

    let newlineIndex = buffer.indexOf("\n");
    while (newlineIndex !== -1) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);

      if (line) {
        const chunk = lineParser(line);
        if (chunk) {
          onChunk(chunk);
        }
      }

      newlineIndex = buffer.indexOf("\n");
    }
  }

  const trailing = buffer.trim();
  if (trailing) {
    const chunk = lineParser(trailing);
    if (chunk) {
      onChunk(chunk);
    }
  }
}

async function pingOllama() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch("http://localhost:11434/api/tags", {
      method: "GET",
      signal: controller.signal
    });

    clearTimeout(timeout);
    return response.ok;
  } catch (error) {
    clearTimeout(timeout);
    return false;
  }
}

async function pingLMStudio() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch("http://localhost:1234/v1/models", {
      method: "GET",
      signal: controller.signal
    });

    clearTimeout(timeout);
    return response.ok;
  } catch (error) {
    clearTimeout(timeout);
    return false;
  }
}

async function pingAgent(baseURL) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${baseURL}/v1/models`, {
      method: "GET",
      signal: controller.signal
    });

    clearTimeout(timeout);
    return response.ok;
  } catch (error) {
    clearTimeout(timeout);
    return false;
  }
}

async function detectBackend() {
  for (const backend of DETECTION_ORDER) {
    if (backend === "ollama" && await pingOllama()) {
      return { backend, baseURL: "http://localhost:11434" };
    }

    if (backend === "lmstudio" && await pingLMStudio()) {
      return { backend, baseURL: "http://localhost:1234" };
    }

    if (backend === "agent") {
      const agentBaseURL = process.env.AGENT_BASE_URL;
      if (agentBaseURL && await pingAgent(agentBaseURL)) {
        return { backend, baseURL: agentBaseURL };
      }
    }
  }

  return null;
}

async function sendToOllama(payload, options = {}) {
  const resolvedOptions = withTimeout(options, 30000);
  const backend = await detectBackend();

  if (!backend) {
    throw new Error("No backend available");
  }

  const response = await fetch(`${backend.baseURL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: payload.model || "qwen3:0.6b",
      prompt: payload.prompt || buildPrompt(
        payload.context || DEFAULT_SYSTEM_PROMPT,
        payload.userText
      ),
      stream: false,
      options: {
        temperature: payload.temperature ?? 0.7
      }
    }),
    signal: resolvedOptions.signal
  });

  if (!response.ok) {
    const errorBody = await readErrorBody(response);
    throw new Error(`HTTP ${response.status} ${response.statusText}: ${errorBody}`);
  }

  const result = await response.json();
  return {
    choices: [{
      message: {
        role: "assistant",
        content: result.response
      }
    }]
  };
}

async function sendToGroq(payload, options = {}) {
  const resolvedOptions = withTimeout(options, 30000);
  
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY environment variable is required");
  }

  const messages = payload.messages || [
    { role: "system", content: DEFAULT_SYSTEM_PROMPT },
    { role: "user", content: payload.prompt || buildPrompt(
      payload.context || DEFAULT_SYSTEM_PROMPT,
      payload.userText
    )}
  ];

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: payload.model || "llama3-70b-8192",
      messages: messages,
      stream: false,
      temperature: payload.temperature ?? 0.7,
      max_tokens: payload.max_tokens || 1024
    }),
    signal: resolvedOptions.signal
  });

  if (!response.ok) {
    const errorBody = await readErrorBody(response);
    throw new Error(`HTTP ${response.status} ${response.statusText}: ${errorBody}`);
  }

  return await response.json();
}

async function sendCompletion(payload, options = {}) {
  // Determine target based on payload or environment setting
  const target = payload.target || process.env.DEFAULT_TARGET || "local";
  
  if (target === "groq") {
    return await sendToGroq(payload, options);
  } else {
    return await sendToOllama(payload, options);
  }
}

class InferenceBridge {
  static MXitBuffer = MXitBuffer;

  constructor(options = {}) {
    this.options = options;
  }

  detectBackend() {
    return detectBackend();
  }

  sendCompletion(payload, options = {}) {
    return sendCompletion(payload, options);
  }

  sendToOllama(payload, options = {}) {
    return sendToOllama(payload, options);
  }

  sendToGroq(payload, options = {}) {
    return sendToGroq(payload, options);
  }

  // Additional utility methods
  async getModels() {
    const backend = await this.detectBackend();
    if (!backend) {
      throw new Error("No backend available");
    }

    const response = await fetch(`${backend.baseURL}/v1/models`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }
}

export default InferenceBridge;
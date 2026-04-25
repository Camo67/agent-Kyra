import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_OUTPUT_DIR = path.resolve("output", "voice");

function cleanText(value) {
  return String(value ?? "").trim();
}

function slugify(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48) || "kyra-reply";
}

function resolveOutputDir(outputDir = process.env.VOICE_OUTPUT_DIR) {
  return path.resolve(outputDir || DEFAULT_OUTPUT_DIR);
}

function voiceConfigFromEnv(options = {}) {
  return {
    provider: options.provider ?? process.env.VOICE_PROVIDER ?? "queue",
    referenceAudioPath: options.referenceAudioPath ?? process.env.VOICE_REFERENCE_AUDIO ?? "",
    voiceId: options.voiceId ?? process.env.MINIMAX_VOICE_ID ?? process.env.VOICE_ID ?? "cameron-approved-voice",
    endpoint: options.endpoint ?? process.env.VOICE_TTS_URL ?? "",
    outputDir: resolveOutputDir(options.outputDir),
    minimaxApiBase: options.minimaxApiBase ?? process.env.MINIMAX_API_BASE ?? "https://api.minimax.io/v1",
    minimaxApiKey: options.minimaxApiKey ?? process.env.MINIMAX_API_KEY ?? "",
    minimaxModel: options.minimaxModel ?? process.env.MINIMAX_SPEECH_MODEL ?? "speech-2.8-hd",
    languageBoost: options.languageBoost ?? process.env.MINIMAX_LANGUAGE_BOOST ?? "auto"
  };
}

async function writeQueuedVoiceJob(text, config) {
  await mkdir(config.outputDir, { recursive: true });

  const ts = new Date().toISOString();
  const fileName = `${ts.replace(/[:.]/g, "-")}-${slugify(text)}.json`;
  const jobPath = path.join(config.outputDir, fileName);
  const payload = {
    status: "queued",
    provider: config.provider,
    voiceId: config.voiceId,
    referenceAudioPath: config.referenceAudioPath,
    text,
    disclosure: "AI-generated speech using Cameron-approved reference voice only.",
    createdAt: ts
  };

  await writeFile(jobPath, JSON.stringify(payload, null, 2));
  return {
    status: "queued",
    provider: config.provider,
    voiceId: config.voiceId,
    referenceAudioPath: config.referenceAudioPath,
    jobPath
  };
}

async function requestHttpVoice(text, config) {
  if (!config.endpoint) {
    return writeQueuedVoiceJob(text, {
      ...config,
      provider: "queue",
    });
  }

  const response = await fetch(config.endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      voiceId: config.voiceId,
      referenceAudioPath: config.referenceAudioPath
    }),
    signal: AbortSignal.timeout(60000)
  });

  if (!response.ok) {
    throw new Error(`Voice endpoint failed: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return {
      status: "generated",
      provider: config.provider,
      voiceId: config.voiceId,
      referenceAudioPath: config.referenceAudioPath,
      ...await response.json()
    };
  }

  await mkdir(config.outputDir, { recursive: true });
  const extension = contentType.includes("wav") ? "wav" : "mp3";
  const audioPath = path.join(
    config.outputDir,
    `${new Date().toISOString().replace(/[:.]/g, "-")}-${slugify(text)}.${extension}`
  );
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(audioPath, bytes);

  return {
    status: "generated",
    provider: config.provider,
    voiceId: config.voiceId,
    referenceAudioPath: config.referenceAudioPath,
    audioPath
  };
}

async function requestMiniMaxVoice(text, config) {
  if (!config.minimaxApiKey) {
    return writeQueuedVoiceJob(text, {
      ...config,
      provider: "minimax-missing-api-key"
    });
  }

  await mkdir(config.outputDir, { recursive: true });

  const response = await fetch(`${config.minimaxApiBase}/t2a_v2`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.minimaxApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.minimaxModel,
      text,
      stream: false,
      language_boost: config.languageBoost,
      output_format: "hex",
      voice_setting: {
        voice_id: config.voiceId,
        speed: 1,
        vol: 1,
        pitch: 0
      },
      audio_setting: {
        sample_rate: 32000,
        bitrate: 128000,
        format: "mp3",
        channel: 1
      }
    }),
    signal: AbortSignal.timeout(60000)
  });

  if (!response.ok) {
    throw new Error(`MiniMax T2A failed: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  if (payload.base_resp?.status_code && payload.base_resp.status_code !== 0) {
    throw new Error(`MiniMax T2A failed: ${payload.base_resp.status_msg ?? payload.base_resp.status_code}`);
  }

  const audioHex = payload.data?.audio;
  if (!audioHex) {
    return {
      status: "generated",
      provider: "minimax",
      voiceId: config.voiceId,
      referenceAudioPath: config.referenceAudioPath,
      payload
    };
  }

  const audioPath = path.join(
    config.outputDir,
    `${new Date().toISOString().replace(/[:.]/g, "-")}-${slugify(text)}.mp3`
  );
  await writeFile(audioPath, Buffer.from(audioHex, "hex"));

  return {
    status: "generated",
    provider: "minimax",
    voiceId: config.voiceId,
    referenceAudioPath: config.referenceAudioPath,
    audioPath,
    traceId: payload.trace_id ?? null,
    extraInfo: payload.extra_info ?? null
  };
}

export async function createVoiceReply(text, options = {}) {
  const spokenText = cleanText(text);
  if (!spokenText) {
    return null;
  }

  const config = voiceConfigFromEnv(options);

  if (config.provider === "off" || config.provider === "none") {
    return null;
  }

  if (config.provider === "http" || config.provider === "xtts-http") {
    return requestHttpVoice(spokenText, config);
  }

  if (config.provider === "minimax") {
    return requestMiniMaxVoice(spokenText, config);
  }

  return writeQueuedVoiceJob(spokenText, config);
}

export { voiceConfigFromEnv };

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name}`);
  }

  return value;
}

function optionalEnv(name, fallback) {
  return process.env[name]?.trim() || fallback;
}

async function uploadVoiceSample({ apiBase, apiKey, audioPath }) {
  const bytes = await readFile(audioPath);
  const form = new FormData();
  form.append("purpose", "voice_clone");
  form.append("file", new Blob([bytes]), path.basename(audioPath));

  const response = await fetch(`${apiBase}/files/upload`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`
    },
    body: form,
    signal: AbortSignal.timeout(120000)
  });

  if (!response.ok) {
    throw new Error(`MiniMax upload failed: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  if (payload.base_resp?.status_code && payload.base_resp.status_code !== 0) {
    throw new Error(`MiniMax upload failed: ${payload.base_resp.status_msg ?? payload.base_resp.status_code}`);
  }

  return payload.file;
}

async function cloneVoice({ apiBase, apiKey, fileId, voiceId, previewText, model }) {
  const body = {
    file_id: Number(fileId),
    voice_id: voiceId,
    need_noise_reduction: true,
    need_volume_normalization: true
  };

  if (previewText) {
    body.text = previewText;
    body.model = model;
    body.language_boost = optionalEnv("MINIMAX_LANGUAGE_BOOST", "auto");
  }

  const response = await fetch(`${apiBase}/voice_clone`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120000)
  });

  if (!response.ok) {
    throw new Error(`MiniMax voice_clone failed: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  if (payload.base_resp?.status_code && payload.base_resp.status_code !== 0) {
    throw new Error(`MiniMax voice_clone failed: ${payload.base_resp.status_msg ?? payload.base_resp.status_code}`);
  }

  return payload;
}

async function main() {
  const apiKey = requiredEnv("MINIMAX_API_KEY");
  const audioPath = requiredEnv("VOICE_REFERENCE_AUDIO");
  const apiBase = optionalEnv("MINIMAX_API_BASE", "https://api.minimax.io/v1");
  const voiceId = optionalEnv("MINIMAX_VOICE_ID", "cameron_kyra_voice");
  const model = optionalEnv("MINIMAX_SPEECH_MODEL", "speech-2.8-hd");
  const outputDir = path.resolve(optionalEnv("VOICE_OUTPUT_DIR", "output/voice"));
  const previewText = optionalEnv(
    "MINIMAX_CLONE_PREVIEW_TEXT",
    "Kyra is online. This is Cameron's approved local assistant voice."
  );

  await mkdir(outputDir, { recursive: true });
  const file = await uploadVoiceSample({ apiBase, apiKey, audioPath });
  const clone = await cloneVoice({
    apiBase,
    apiKey,
    fileId: file.file_id,
    voiceId,
    previewText,
    model
  });
  const result = {
    voiceId,
    fileId: file.file_id,
    referenceAudioPath: audioPath,
    demoAudio: clone.demo_audio || null,
    createdAt: new Date().toISOString(),
    baseResp: clone.base_resp
  };
  const outPath = path.join(outputDir, "minimax-voice-clone-result.json");

  await writeFile(outPath, JSON.stringify(result, null, 2));

  console.log(`MiniMax voice clone ready: ${voiceId}`);
  console.log(`Result written to ${outPath}`);
  console.log("Set VOICE_PROVIDER=minimax to synthesize Kyra replies with this voice.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

# Open Source Voice Cloning & TTS Integration Guide

This guide explains how to integrate open-source voice cloning and expressive TTS solutions into the KYRA AI stack as alternatives to commercial APIs like MiniMax.

## Overview

The KYRA stack currently uses MiniMax for voice cloning and TTS (see [voice-adapter.js](file:///home/camo/Documents/kyra%20ai%20stack/voice-adapter.js) and [scripts/minimax-voice-clone.js](file:///home/camo/Documents/kyra%20ai%20stack/scripts/minimax-voice-clone.js)), but can be extended to support open-source alternatives.

## Recommended Open Source Solutions

### 1. Coqui TTS

Coqui TTS is a powerful open-source text-to-speech library with voice cloning capabilities.

#### Installation

```bash
pip install coqui-tts
# Or for development:
git clone https://github.com/coqui-ai/TTS.git
cd TTS
pip install -e .
```

#### Voice Cloning Setup

1. Prepare training audio (30 seconds to several minutes of high-quality audio)
2. Fine-tune a model or use zero-shot cloning:

```python
from TTS.api import TTS

# Initialize TTS with voice cloning model
tts = TTS(model_name="coqui/XTTS-v2", gpu=False)

# Clone voice from sample and generate speech
tts.tts_to_file(
    text="Hello, this is a cloned voice example.",
    speaker_wav="path/to/reference/audio.wav",
    file_path="output.wav"
)
```

#### Integration with KYRA

Create a Coqui voice adapter similar to the existing [voice-adapter.js](file:///home/camo/Documents/kyra%20ai%20stack/voice-adapter.js):

```javascript
// voice-adapters/coqui-adapter.js
import { spawn } from 'child_process';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

const DEFAULT_OUTPUT_DIR = './output/voice';

async function resolveOutputDir(outputDir = process.env.VOICE_OUTPUT_DIR) {
  const resolved = path.resolve(outputDir || DEFAULT_OUTPUT_DIR);
  await mkdir(resolved, { recursive: true });
  return resolved;
}

async function requestCoquiVoice(text, config) {
  const outputDir = await resolveOutputDir(config.outputDir);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = path.join(outputDir, `${timestamp}-${slugify(text)}.wav`);

  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python3', [
      '-c',
      `
import sys
sys.path.append('.')
from TTS.api import TTS

# Initialize the TTS model
tts = TTS(model_name="${config.model || "coqui/XTTS-v2"}", gpu=False)

# Generate speech with voice cloning
tts.tts_to_file(
    text="${text}",
    speaker_wav="${config.referenceAudioPath}",
    file_path="${outputPath}"
)

print("SUCCESS: Audio generated at ${outputPath}")
      `
    ]);

    let output = '';
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error(`Python stderr: ${data}`);
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        resolve({
          status: "generated",
          provider: "coqui",
          voiceId: config.voiceId,
          referenceAudioPath: config.referenceAudioPath,
          audioPath: outputPath
        });
      } else {
        reject(new Error(`Python process exited with code ${code}. Output: ${output}`));
      }
    });
  });
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48) || "kyra-reply";
}

export async function createCoquiVoice(text, options = {}) {
  const config = {
    referenceAudioPath: options.referenceAudioPath || process.env.VOICE_REFERENCE_AUDIO || "",
    voiceId: options.voiceId || process.env.COQUI_VOICE_ID || "coqui-cloned-voice",
    model: options.model || process.env.COQUI_MODEL || "coqui/XTTS-v2",
    outputDir: options.outputDir
  };

  if (!config.referenceAudioPath) {
    throw new Error("Reference audio path required for voice cloning");
  }

  return requestCoquiVoice(text, config);
}
```

### 2. YourTTS

YourTTS is another option that enables zero-shot multi-speaker voice cloning.

#### Installation

```bash
pip install coqui-tts
```

#### Usage

```python
from TTS.api import TTS

# Load YourTTS model
tts = TTS(model_name="tts_models/multilingual/multi-dataset/your_tts", gpu=False)

# Generate speech with voice cloning
tts.tts_to_file(
    text="This is using YourTTS voice cloning.",
    speaker_wav="path/to/reference.wav",
    language="en",
    file_path="output.wav"
)
```

### 3. Respeecher API Alternative (Self-hosted)

For more advanced voice cloning, consider using a self-hosted solution based on Respeecher-like technologies:

- **So-VITS-SVC**: A robust voice conversion framework
- **DiffSVC**: Diffusion-based singing voice conversion
- **VITS**: Variational Inference with adversarial learning for TTS

## Integration Steps

1. Add the new adapter to the voice adapter system
2. Update environment variables to support the new provider
3. Create a setup script for installing the required dependencies

### Adding the Adapter

Update [voice-adapter.js](file:///home/camo/Documents/kyra%20ai%20stack/voice-adapter.js) to include the new provider:

```javascript

if (config.provider === "coqui") {
  return requestCoquiVoice(spokenText, config);
}

// ... rest of the code ...
```

### Environment Variables

Add these to your `.env` file:

```bash
# Coqui TTS Configuration
VOICE_PROVIDER=coqui
COQUI_VOICE_ID=your-coqui-voice-id
COQUI_MODEL=coqui/XTTS-v2
VOICE_REFERENCE_AUDIO=path/to/your/reference/audio.wav
```

## Benefits of Open Source Solutions

1. **Privacy**: Keep voice data on your own servers
2. **Cost**: No recurring API fees after initial setup
3. **Control**: Full control over voice models and customization
4. **Customization**: Ability to fine-tune models with your specific data
5. **Reliability**: Not dependent on external API availability

## Performance Considerations

- Voice cloning models can be computationally intensive
- GPU acceleration recommended for real-time performance
- Consider implementing a queuing system for batch processing
- Plan for adequate storage for model files and generated audio

## Security Considerations

- Validate reference audio files to prevent malicious uploads
- Implement rate limiting for voice generation
- Ensure proper access controls on voice models and reference audio
- Sanitize text inputs to prevent prompt injection attacks

## Next Steps

1. Set up the development environment for the chosen TTS solution
2. Integrate with the existing voice adapter system
3. Test with various reference audio qualities
4. Optimize for the target hardware (HP ProDesk i5-6500 16GB)
5. Add to the n8n workflows for automated processing
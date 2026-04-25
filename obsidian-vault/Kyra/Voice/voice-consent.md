# Voice Consent

Approved voice identity: Cameron's own voice.

Kyra may generate local assistant speech with Cameron-approved reference audio. Do not use WhatsApp or third-party voice notes unless Cameron explicitly marks the clip as their own voice.

MiniMax setup:

- Reference candidate: none approved yet.
- Do not use `/home/camo/.var/app/io.github.qwersyk.Newelle/cache/recording.wav`; Cameron confirmed it is not his voice.
- Clone command: `npm run voice:clone`
- Runtime provider after cloning: set `VOICE_PROVIDER=minimax`
- Default voice ID: `cameron_kyra_voice`

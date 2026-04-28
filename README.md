# Agent Kyra

Agent Kyra is a personal AI agent and automation platform built for continuous local operation. Kyra integrates multiple tools and systems, including Obsidian and MemPalace, to provide a flexible long-term memory layer while keeping Kyra as the core focus.

## Core focus

- **Kyra is the project**: the agent, the workflow engine, the integrations, and the automation.
- **MemPalace is a memory tool**: used alongside Obsidian for long-term memory storage, not the primary project identity.
- **Obsidian is a storage layer**: Kyra uses it for local knowledge and persistent context.

## Highlights

- Multi-channel communication support: Telegram, WhatsApp, Discord, web UI
- Local-first AI integration with fallback chains and multiple service options
- Memory systems built around Obsidian and MemPalace for long-term knowledge
- Automation via n8n, Playwright, and system scripting
- Mobile interface, voice processing, and business tooling included

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create environment config:

```bash
cp local.env .env
# edit .env with your settings
```

3. Start Kyra:

```bash
npm run start
```

## Notes

- If you want the legacy MemPalace documentation, see `README-MEMPALACE-LEGACY.md`.
- Build and environment details are captured in `BUILD_NOTES.md`.
- The actual Kyra-specific overview is also available in `KYRA_README.md`.

## Project structure

- `app.js`, `kyra-server.js`: Kyra core services
- `obsidian-memory.js`: Obsidian memory integration
- `mempalace/`: MemPalace memory tool code used by Kyra
- `mobile/`, `web/`, `n8n/`, `scripts/`: Kyra platform integrations

## License

MIT

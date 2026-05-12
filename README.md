# Kyra AI Stack: CamoFlow Automation & Lead Generation

**Kyra** is a polyglot AI agent ecosystem designed for 24/7 autonomous operations, business lead generation, and seamless automation via n8n. It features a local-first memory system (MemPalace) and an AI-powered bridge (CamoFlow) that connects your favorite assistants (Claude, Cursor) directly to your automation workflows.

---

## 🌟 Core Components

- **Kyra Core (Node.js)**: The central nervous system handling real-time communication, tool execution, and local AI failover.
- **CamoFlow (n8n-MCP)**: An AI bridge giving Claude Code and Cursor direct power to design, build, and debug n8n workflows.
- **Global Business Lead Scanner**: A specialized application (`app.js`) for finding businesses without websites worldwide and automating outreach.
- **MemPalace (Python)**: A high-precision, local-first memory system that treats your data as sacred—verbatim storage with 100% recall.
- **n8n Automation**: A suite of pre-built workflows for Telegram, Obsidian, and browser automation.
- **Kyra Mobile**: A Flutter-based Android interface for interacting with your stack on the go.

## 🚀 Quick Start

### 1. Docker Compose (Full Stack)
The recommended way to run the entire CamoFlow stack (n8n + MCP Bridge + Kyra + Dashboard) is via Docker Compose:

```bash
./start-platform.sh --docker
```

- **n8n**: [http://localhost:5678](http://localhost:5678)
- **Kyra Server**: [http://localhost:8790](http://localhost:8790)
- **Lead Scanner Dashboard**: [http://localhost:3001](http://localhost:3001)

### 2. Local Setup (Native)
If you prefer running components directly on your host machine:

```bash
# Install dependencies
npm install
pip install -e ".[dev]"

# Start Kyra with the MCP bridge
./start-platform.sh --with-mcp
```

## 🔌 AI Integration (CamoFlow)

Connect your AI assistants directly to your n8n instance to automate workflow creation.

### Claude Code
```bash
claude mcp add n8n -- npx n8n-mcp
```

### Cursor / Windsurf
Add a new MCP server with the command: `npx n8n-mcp`.

For more details, see [docs/N8N_MCP_INTEGRATION.md](docs/N8N_MCP_INTEGRATION.md).

## 🧠 Memory Protocol

Kyra uses **MemPalace** for long-term memory. It operates on the "Palace" architecture:
- **Wings**: Categories (People, Projects)
- **Rooms**: Sessions/Days
- **Drawers**: Verbatim text storage

To use MemPalace in your AI assistant:
```bash
claude mcp add mempalace -- python -m mempalace.mcp_server
```

## 📂 Documentation

- **[N8N MCP Integration](docs/N8N_MCP_INTEGRATION.md)**: Detailed guide for CamoFlow.
- **[KYRA_README.md](KYRA_README.md)**: Architecture and polyglot language support.
- **[MemPalace AGENTS.md](AGENTS.md)**: Design principles and memory architecture.
- **[Workflow Guide](n8n/README.md)**: How to use the pre-built n8n automations.

## 🛠 Tech Stack

- **Backend**: Node.js, Python, Go, Rust
- **Frontend**: HTML5/JS (Dashboard), Flutter (Mobile)
- **Automation**: n8n, Playwright
- **Database**: SQLite (Knowledge Graph), ChromaDB (Vector Memory)

---

**Built with ❤️ by Cameron "Camo" de Vries** - Cape Town, South Africa.

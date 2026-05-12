# CamoFlow: n8n-MCP Integration

CamoFlow is the integration of the **n8n-MCP server** into the Kyra AI Stack. This bridge allows Claude Code, Cursor, Windsurf, and other MCP-compatible AI assistants to directly interact with your n8n instance to design, build, and validate workflows.

## Features

- **Comprehensive Access**: Direct access to over 1,650 n8n nodes.
- **Workflow Automation**: Build and modify workflows using natural language.
- **Template Library**: Access to 2,352 workflow templates.
- **Multi-Level Validation**: AI-powered validation of your automation logic.

## Setup

### 1. Docker Compose (Recommended)

The easiest way to run the entire stack is using Docker Compose:

```bash
./start-platform.sh --docker
```

This starts:
- **n8n**: The workflow engine (Port 5678)
- **n8n-mcp**: The MCP bridge (Connecting Claude to n8n)
- **Kyra Server**: The core AI server (Port 8790)
- **Dashboard**: The lead scanner UI (Port 3001)

### 2. Local Setup (via npx)

If you prefer running components locally:

```bash
# Start Kyra with the MCP bridge in the background
./start-platform.sh --with-mcp
```

Or manually start the bridge:

```bash
npm run mcp:n8n
```

## Connecting to AI Assistants

### Claude Code

Add the MCP server to your Claude configuration:

```bash
claude mcp add n8n -- npx n8n-mcp
```

### Cursor / Windsurf

1. Open Settings -> MCP.
2. Add a new MCP server.
3. Type: `command`
4. Command: `npx n8n-mcp`

## Environment Variables

- `N8N_URL`: The URL of your n8n instance (default: http://localhost:5678).
- `N8N_API_KEY`: Your n8n API key (required if authentication is enabled).

## Usage Examples

Once connected, you can ask your AI:

- *"Create a new workflow that triggers on a Telegram message and saves the content to Obsidian."*
- *"Help me debug the 'Kyra Memory Writer' workflow."*
- *"List all my active workflows in n8n."*
- *"Find a template for Slack to Discord sync."*

---

**Built by Cameron "Camo" de Vries** - Part of the Kyra AI Stack.

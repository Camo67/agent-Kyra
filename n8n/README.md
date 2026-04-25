# n8n Workflows for Kyra

These files are ready to import into n8n:

- `kyra-telegram-bridge.workflow.json`
- `kyra-memory-writer.workflow.json`
- `kyra-obsidian-voice-bridge.workflow.json`
- `kyra-playwright-tool.workflow.json`
- `kyra-weft-bridge.workflow.json` (Weaver/Obsidian memory sync)

## Prerequisites

1. Install project dependencies from the repo root:
   ```bash
   npm install
   ```

2. Start the local Kyra bridge from the repo root:
   ```bash
   npm run kyra
   ```

3. Make sure Chrome or Chromium is installed locally. If it is not in a standard path, set:
   ```bash
   export PLAYWRIGHT_BROWSER_PATH=/full/path/to/chrome
   ```

## Quick Setup (Automated)

1. **Start n8n:**
   ```bash
   ./start-n8n.sh
   ```
   This starts n8n on port `9090` by default and will move to the next free port if needed.

2. **Import workflows:**
   Since API authentication is still required, import manually:
   - Open the URL printed by `./start-n8n.sh` in your browser
   - Go to Workflows -> Import from File
   - Import each .json file from the n8n/ directory

3. **Activate workflows:**
   - For each workflow, click the toggle in the top-right to activate it

## Manual Setup

1. Start n8n from the project root:
   ```bash
   ./start-n8n.sh
   ```

2. Open n8n at the URL printed by the script, usually `http://localhost:9090`

3. Import any workflow JSON file via `Workflows -> Import from File`

4. Activate the workflow using the top-right toggle

## Notes

- `kyra-telegram-bridge.workflow.json` uses `{{$env.TELEGRAM_BOT_TOKEN}}`
- `kyra-memory-writer.workflow.json` routes webhook data into Kyra memory storage
- `kyra-obsidian-voice-bridge.workflow.json` sends task payloads to the Kyra chat endpoint
- `kyra-playwright-tool.workflow.json` runs local browser capture/extraction through `POST /kyra/tools/playwright`
- `kyra-weft-bridge.workflow.json` uses `weft-integration.js` as a compatibility wrapper for Kyra's Weaver memory index and Obsidian vault
- Playwright output screenshots are written to `output/playwright/` unless you pass `screenshotPath`

## Example: Playwright Tool Payload

POST to the Playwright webhook with a body like:

```json
{
  "url": "https://example.com",
  "selector": "body",
  "extractSelector": "body",
  "screenshot": true,
  "fullPage": true,
  "afterLoadWaitMs": 1000
}
```

## Troubleshooting

- If workflows don't import, check that n8n is running and accessible
- If Telegram bot doesn't respond, ensure the workflow is activated
- If the Playwright workflow fails, confirm `npm run kyra` is running and `PLAYWRIGHT_BROWSER_PATH` points to a valid Chrome/Chromium executable when needed
- Check n8n logs for any error messages

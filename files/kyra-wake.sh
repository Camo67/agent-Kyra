#!/bin/bash
# ============================================================
# kyra-wake.sh
# Wakes Kyra (Ollama/Qwen3) and verifies she's online
# Usage: bash kyra-wake.sh [--silent]
# ============================================================

KYRA_PORT=8787
OLLAMA_PORT=11434
MODEL="qwen3:0.6b"
LOG_FILE="$HOME/kyra-wake.log"
SILENT=false
[[ "$1" == "--silent" ]] && SILENT=true

log() {
  echo "[$(date '+%H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

notify() {
  $SILENT && return
  # Desktop notification if available
  command -v notify-send &>/dev/null && notify-send "Kyra" "$1" --icon=dialog-information 2>/dev/null
  log "$1"
}

# ── 1. CHECK IF OLLAMA IS RUNNING ─────────────────────────
if ! pgrep -x "ollama" > /dev/null; then
  log "Ollama not running — starting..."
  nohup ollama serve >> "$LOG_FILE" 2>&1 &
  sleep 3
fi

# ── 2. WAIT FOR OLLAMA TO BE READY ────────────────────────
log "Waiting for Ollama on :$OLLAMA_PORT..."
for i in {1..15}; do
  if curl -sf "http://localhost:$OLLAMA_PORT/api/tags" > /dev/null; then
    log "Ollama ready ✓"
    break
  fi
  sleep 2
  if [ $i -eq 15 ]; then
    log "ERROR: Ollama failed to start"
    exit 1
  fi
done

# ── 3. PULL MODEL IF NOT PRESENT ──────────────────────────
if ! ollama list | grep -q "$MODEL"; then
  log "Model $MODEL not found — pulling..."
  ollama pull "$MODEL"
fi

# ── 4. WARM UP KYRA (pre-load model into memory) ──────────
log "Loading $MODEL into memory..."
curl -sf http://localhost:$OLLAMA_PORT/api/generate \
  -d "{\"model\":\"$MODEL\",\"prompt\":\"ping\",\"stream\":false}" \
  > /dev/null

# ── 5. CHECK CUSTOM PORT :8787 (if using proxy/bridge) ────
if ! curl -sf "http://localhost:$KYRA_PORT/health" > /dev/null 2>&1; then
  log "Bridge not detected on :$KYRA_PORT — checking if ollama-mcp-bridge is running..."

  # Start bridge if script exists
  BRIDGE="$HOME/ollama-mcp-bridge/index.js"
  if [ -f "$BRIDGE" ]; then
    log "Starting ollama-mcp-bridge..."
    nohup node "$BRIDGE" >> "$LOG_FILE" 2>&1 &
    sleep 3
  else
    log "NOTE: Bridge not found at $BRIDGE — Kyra will respond on :$OLLAMA_PORT directly"
  fi
fi

# ── 6. FINAL HEALTH PING ──────────────────────────────────
KYRA_UP=false
for port in $KYRA_PORT $OLLAMA_PORT; do
  RESPONSE=$(curl -sf -X POST "http://localhost:$port/v1/chat/completions" \
    -H "Content-Type: application/json" \
    -d "{\"model\":\"$MODEL\",\"messages\":[{\"role\":\"user\",\"content\":\"status\"}],\"max_tokens\":20}" 2>/dev/null)

  if echo "$RESPONSE" | grep -q "choices"; then
    notify "✅ Kyra online at :$port"
    echo "KYRA_PORT=$port" > "$HOME/.kyra-env"
    KYRA_UP=true
    break
  fi
done

if ! $KYRA_UP; then
  notify "❌ Kyra failed to come online"
  exit 1
fi

# ── 7. TRIGGER HEALTH CHECK ───────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/kyra-healthcheck.sh" ]; then
  log "Running health check..."
  bash "$SCRIPT_DIR/kyra-healthcheck.sh" $([[ "$SILENT" == "true" ]] && echo "--silent")
fi

log "Kyra wake complete ✓"

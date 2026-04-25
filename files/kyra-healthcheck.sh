#!/bin/bash
# ============================================================
# kyra-healthcheck.sh
# Event-driven health monitoring for Kyra architecture
# Checks services and triggers actions based on results
# ============================================================

SILENT=false
[[ "$1" == "--silent" ]] && SILENT=true

# Load Kyra port from wake script env
source "$HOME/.kyra-env" 2>/dev/null || KYRA_PORT=3000
MODEL="qwen3:0.6b"
REPORT_FILE="$HOME/kyra-health-report.md"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
VAULT_LOG="${VAULT_PATH:-$HOME/ObsidianVault}/kyra-health.md"

# ── SERVICES TO CHECK ───────────────────────────────────────
declare -A SERVICES=(
  ["Kyra Core"]="http://localhost:$KYRA_PORT/health"
  ["Ollama"]="http://localhost:11434/api/tags"
  ["Groq API"]="https://api.groq.com/openai/v1/models"  # Just checking if accessible
)

# ── FUNCTION DEFINITIONS ────────────────────────────────────
log() { 
  echo "[$(date '+%H:%M:%S')] $1"
  [[ "$SILENT" == "false" ]] && echo "[$(date '+%H:%M:%S')] $1" >> "$HOME/kyra-events.log"
}

# ── TRIGGER ACTIONS BASED ON HEALTH STATUS ──────────────────
trigger_action() {
  local service="$1"
  local status="$2"
  local response_time="$3"
  
  case "$status" in
    "DOWN"|"TIMEOUT")
      log "🚨 CRITICAL: $service is DOWN - triggering immediate alert"
      # Send notification if available
      command -v notify-send &>/dev/null && notify-send "🚨 Kyra Alert" "$service is DOWN!" --icon=dialog-error 2>/dev/null
      
      # Trigger restart for Ollama specifically
      if [[ "$service" == *"Ollama"* ]]; then
        log "🔄 Attempting to restart Ollama service..."
        pkill -f "ollama" 2>/dev/null
        sleep 3
        nohup ollama serve >> "$HOME/ollama-restart.log" 2>&1 &
        sleep 10  # Give it time to restart
      fi
      ;;
    "SLOW")
      log "⚠️  WARNING: $service is responding SLOWLY ($response_time ms) - rerouting to Groq"
      # In a real system, this would update routing decisions
      echo "ROUTE_OVERRIDE=groq" > "$HOME/.kyra-routing-override"
      ;;
    "OK")
      # Reset routing override if it exists
      if [[ -f "$HOME/.kyra-routing-override" ]]; then
        rm "$HOME/.kyra-routing-override"
        log "✅ $service recovered - routing restored to normal"
      fi
      ;;
  esac
}

# ── CHECK INDIVIDUAL SERVICE ────────────────────────────────
check_service() {
  local name="$1"
  local url="$2"
  local start=$(date +%s%3N)
  
  # Special handling for Groq since it requires auth header
  if [[ "$name" == "Groq API" ]]; then
    if [[ -n "$GROQ_API_KEY" ]]; then
      HTTP_CODE=$(curl -o /dev/null -sf -w "%{http_code}" \
        --connect-timeout 6 --max-time 10 \
        -H "Authorization: Bearer $GROQ_API_KEY" \
        "$url" 2>/dev/null)
    else
      # Skip Groq check if no API key
      echo "SKIPPED|Groq API|API key not available||0ms"
      return
    fi
  else
    HTTP_CODE=$(curl -o /dev/null -sf -w "%{http_code}" \
      --connect-timeout 6 --max-time 10 "$url" 2>/dev/null)
  fi
  
  local end=$(date +%s%3N)
  local ms=$((end - start))

  if [[ "$HTTP_CODE" =~ ^[23] ]]; then
    # Check if response is too slow (more than 5 seconds)
    if (( ms > 5000 )); then
      echo "SLOW|$name|$url|$HTTP_CODE|${ms}ms"
      trigger_action "$name" "SLOW" "$ms"
    else
      echo "OK|$name|$url|$HTTP_CODE|${ms}ms"
      trigger_action "$name" "OK" "$ms"
    fi
  elif [[ -z "$HTTP_CODE" ]]; then
    echo "DOWN|$name|$url|TIMEOUT|${ms}ms"
    trigger_action "$name" "DOWN" "$ms"
  else
    echo "ERROR|$name|$url|$HTTP_CODE|${ms}ms"
    trigger_action "$name" "ERROR" "$ms"
  fi
}

# ── PARSE LOGS AND TRACK PATTERNS ───────────────────────────
analyze_logs() {
  log "🔍 Analyzing recent patterns..."
  
  # Count recent issues
  RECENT_ISSUES=$(tail -n 50 "$HOME/kyra-events.log" 2>/dev/null | grep -c "ALERT\|WARNING\|CRITICAL" || echo "0")
  
  if (( RECENT_ISSUES > 5 )); then
    log "📈 Pattern detected: High error frequency recently ($RECENT_ISSUES in last 50 events)"
    echo "HIGH_ERROR_FREQ=true" >> "$HOME/.kyra-state"
  fi
  
  # Check for slow responses
  RECENT_SLOW=$(tail -n 20 "$HOME/kyra-events.log" 2>/dev/null | grep -c "SLOW\|slow response" || echo "0")
  if (( RECENT_SLOW > 3 )); then
    log "🐌 Pattern detected: Consistent slow responses ($RECENT_SLOW in last 20 events)"
    echo "SHIFT_TO_GROQ=true" >> "$HOME/.kyra-state"
  fi
}

# ── GENERATE DAILY RECOMMENDATION ───────────────────────────
generate_recommendation() {
  local today_date=$(date '+%Y-%m-%d')
  local recommendation_file="$HOME/kyra-recommendations-$today_date.md"
  
  # Create header if file doesn't exist
  if [[ ! -f "$recommendation_file" ]]; then
    cat > "$recommendation_file" << EOF
# Kyra System Recommendations - $today_date

Auto-generated based on system health patterns.

EOF
  fi
  
  # Add daily summary
  echo "" >> "$recommendation_file"
  echo "## $(date '+%H:%M') Summary" >> "$recommendation_file"
  echo "- Ollama average response: $(awk -F'|' '/Ollama.*ms/ && /OK/ {sum+=$NF; count++} END {if(count>0) print int(sum/count)"ms"; else print "N/A"}' <<< "${RESULTS[*]}")"
  echo "- Groq availability: $(echo "$RESULTS" | grep "Groq API" | grep -c "OK" || echo "0")/$(echo "$RESULTS" | grep -c "Groq API" || echo "0")"
  echo "- System stability: $(if (( RECENT_ISSUES < 3 )); then echo "Good"; else echo "Needs attention"; fi)"
  
  # Add specific recommendations
  if [[ -f "$HOME/.kyra-state" ]]; then
    if grep -q "SHIFT_TO_GROQ=true" "$HOME/.kyra-state"; then
      echo "" >> "$recommendation_file"
      echo "### 🔄 Recommended Action" >> "$recommendation_file"
      echo "- Consider shifting more load to Groq temporarily due to Ollama performance issues" >> "$recommendation_file"
    fi
  fi
}

# ── MAIN EXECUTION ──────────────────────────────────────────
log "🔍 Starting health check for Kyra services..."

# Check all services
RESULTS=()
for service in "${!SERVICES[@]}"; do
  result=$(check_service "$service" "${SERVICES[$service]}")
  RESULTS+=("$result")
  echo "$result" | awk -F'|' '{ printf "  %-10s | %-15s | %-6s | %-4s | %-8s\n", $1, $2, $3, $4, $5 }'
done

# Analyze logs for patterns
analyze_logs

# Generate recommendation
generate_recommendation

log "✅ Health check completed"

# Clean up temporary state if needed
if [[ $(find "$HOME/.kyra-state" -mmin +60 2>/dev/null) ]]; then
  rm "$HOME/.kyra-state" 2>/dev/null
fi
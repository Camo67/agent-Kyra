#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/local.env"
N8N_SESSION="kyra-n8n"
TUNNEL_SESSION="kyra-tunnel"
TUNNEL_LOG="/tmp/kyra-tunnel.log"
N8N_PORT="${N8N_PORT:-9090}"
WEBHOOK_PATH="${WEBHOOK_PATH:-/webhook/telegram-kyra}"

if [[ -f "${ENV_FILE}" ]]; then
  while IFS='=' read -r key value; do
    [[ -z "${key}" || "${key}" =~ ^[[:space:]]*# ]] && continue
    export "${key}=${value}"
  done < "${ENV_FILE}"
fi

if [[ -z "${TELEGRAM_BOT_TOKEN:-}" ]]; then
  echo "TELEGRAM_BOT_TOKEN is missing."
  exit 1
fi

if ! command -v tmux >/dev/null 2>&1; then
  echo "tmux is required."
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required."
  exit 1
fi

if ! command -v n8n >/dev/null 2>&1; then
  echo "n8n is required."
  exit 1
fi

echo "Checking Kyra bridge..."
if ! curl -fsS "http://127.0.0.1:8790/health" >/dev/null; then
  echo "Kyra bridge is not reachable on 127.0.0.1:8790."
  exit 1
fi

echo "Checking n8n..."
if ! curl -fsS "http://127.0.0.1:${N8N_PORT}/" >/dev/null; then
  echo "Starting n8n in tmux session ${N8N_SESSION}..."
  tmux has-session -t "${N8N_SESSION}" 2>/dev/null && tmux kill-session -t "${N8N_SESSION}"
  tmux new-session -d -s "${N8N_SESSION}" "bash -lc 'cd \"${ROOT_DIR}\"; while IFS='\\''='\\'' read -r key value; do [[ -z \"\$key\" || \"\$key\" =~ ^[[:space:]]*# ]] && continue; export \"\$key=\$value\"; done < \"${ENV_FILE}\"; export N8N_BLOCK_ENV_ACCESS_IN_NODE=false; n8n start'"
  sleep 8
  curl -fsS "http://127.0.0.1:${N8N_PORT}/" >/dev/null
fi

echo "Starting localtunnel in tmux session ${TUNNEL_SESSION}..."
tmux has-session -t "${TUNNEL_SESSION}" 2>/dev/null && tmux kill-session -t "${TUNNEL_SESSION}"
: > "${TUNNEL_LOG}"
tmux new-session -d -s "${TUNNEL_SESSION}" "bash -lc 'cd \"${ROOT_DIR}\"; npx --yes localtunnel --port ${N8N_PORT} > \"${TUNNEL_LOG}\" 2>&1'"

PUBLIC_URL=""
for _ in $(seq 1 20); do
  sleep 2
  if ! tmux has-session -t "${TUNNEL_SESSION}" 2>/dev/null; then
    echo "localtunnel exited early:"
    cat "${TUNNEL_LOG}"
    exit 1
  fi
  PUBLIC_URL="$(sed -n 's/^your url is: //p' "${TUNNEL_LOG}" | tail -n 1)"
  if [[ -n "${PUBLIC_URL}" ]]; then
    break
  fi
done

if [[ -z "${PUBLIC_URL}" ]]; then
  echo "Could not determine localtunnel URL."
  cat "${TUNNEL_LOG}"
  exit 1
fi

WEBHOOK_URL="${PUBLIC_URL}${WEBHOOK_PATH}"

echo "Setting Telegram webhook to ${WEBHOOK_URL}"
curl -fsS -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"${WEBHOOK_URL}\",\"drop_pending_updates\":true}" >/dev/null

echo "Webhook info:"
curl -fsS "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo" | jq -c \
  '{ok, result: {url: .result.url, pending_update_count: .result.pending_update_count, last_error_date: .result.last_error_date, last_error_message: .result.last_error_message}}'

echo "n8n session: ${N8N_SESSION}"
echo "tunnel session: ${TUNNEL_SESSION}"

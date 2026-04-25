# ============================================================
# KYRA AUTO-WAKE SETUP GUIDE
# Two options: systemd service OR cron
# ============================================================


# ── OPTION A: SYSTEMD SERVICE (recommended) ───────────────
# Kyra wakes on boot and stays alive

# 1. Create the service file:
sudo nano /etc/systemd/system/kyra.service

# Paste this:
# -----------------------------------------------------------
[Unit]
Description=Kyra Agent (Ollama + MCP Bridge)
After=network.target
Wants=network-online.target

[Service]
Type=forking
User=YOUR_USERNAME
ExecStart=/home/YOUR_USERNAME/scripts/kyra-wake.sh --silent
ExecReload=/home/YOUR_USERNAME/scripts/kyra-healthcheck.sh --silent
Restart=on-failure
RestartSec=30
StandardOutput=append:/home/YOUR_USERNAME/kyra-wake.log
StandardError=append:/home/YOUR_USERNAME/kyra-wake.log

[Install]
WantedBy=multi-user.target
# -----------------------------------------------------------

# 2. Enable and start:
sudo systemctl daemon-reload
sudo systemctl enable kyra
sudo systemctl start kyra

# 3. Check status:
sudo systemctl status kyra


# ── OPTION B: CRON JOBS ───────────────────────────────────
# Open crontab:
crontab -e

# Add these lines:
# -----------------------------------------------------------

# Wake Kyra on boot
@reboot sleep 30 && /home/YOUR_USERNAME/scripts/kyra-wake.sh --silent

# Health check every 30 minutes
*/30 * * * * /home/YOUR_USERNAME/scripts/kyra-healthcheck.sh --silent

# Full wake + health check at 6am daily
0 6 * * * /home/YOUR_USERNAME/scripts/kyra-wake.sh

# Re-wake if Kyra goes offline (checks every 5 mins)
*/5 * * * * pgrep ollama > /dev/null || /home/YOUR_USERNAME/scripts/kyra-wake.sh --silent

# -----------------------------------------------------------


# ── SCRIPTS FOLDER SETUP ──────────────────────────────────
mkdir -p ~/scripts
cp kyra-wake.sh ~/scripts/
cp kyra-healthcheck.sh ~/scripts/
cp kyra-commit.sh ~/scripts/
chmod +x ~/scripts/kyra-wake.sh
chmod +x ~/scripts/kyra-healthcheck.sh
chmod +x ~/scripts/kyra-commit.sh

# Install jq if not present (used by healthcheck):
sudo apt install jq -y


# ── OBSIDIAN SHELL COMMANDS INTEGRATION ───────────────────
# Add these commands in Obsidian → Shell Commands settings:

# Command: kyra-wake
# Shell: bash ~/scripts/kyra-wake.sh

# Command: kyra-healthcheck  
# Shell: bash ~/scripts/kyra-healthcheck.sh

# Command: kyra-commit
# Shell: bash ~/scripts/kyra-commit.sh "{{vault_path}}"

# Assign hotkeys:
# Ctrl+Shift+K → kyra-wake
# Ctrl+Shift+H → kyra-healthcheck

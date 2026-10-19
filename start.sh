#!/usr/bin/env bash
# ============================================================================
#  SMTH Music launcher (Linux / macOS)
#  [1] Local   - run on http://localhost:5000
#  [2] Tunnel  - expose through cloudflared (auto-installs / auto-logins)
# ============================================================================
set -u

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

GREEN='\033[1;32m'
CYAN='\033[1;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

banner() {
  echo
  echo "  ====================================================="
  echo "   S M T H   M U S I C  -  local music platform"
  echo "  ====================================================="
  echo
}

progress_bar() {  # progress_bar <seconds> <label>
  local secs="$1" label="$2" steps=$(( secs * 10 )) i pct filled bar
  for ((i = 1; i <= steps; i++)); do
    pct=$(( i * 100 / steps ))
    filled=$(( i * 50 / steps ))
    bar=$(printf '%*s' "$filled" | tr ' ' '#')
    printf '\r  [%-50s] %3d%%  %s' "$bar" "$pct" "$label"
    sleep "$(awk "BEGIN{print $secs/$steps}")"
  done
  echo
}

command_exists() { command -v "$1" >/dev/null 2>&1; }

check_python() {
  if command_exists python3; then PY=python3; return; fi
  if command_exists python; then PY=python; return; fi
  echo -e "${YELLOW}[!] Python not found.${NC}"
  if command_exists apt-get; then
    progress_bar 8 "Installing Python"
    sudo apt-get update && sudo apt-get install -y python3 python3-pip
  elif command_exists brew; then
    progress_bar 8 "Installing Python"
    brew install python
  else
    echo "[x] Install Python from https://python.org and re-run."; exit 1
  fi
  PY=python3
}

install_deps() {
  if "$PY" -c "import flask" >/dev/null 2>&1; then return; fi
  echo "[*] Installing Python dependencies..."
  progress_bar 3 "pip install"
  "$PY" -m pip install -r requirements.txt
}

check_cloudflared() {
  if command_exists cloudflared; then return; fi
  echo "[*] cloudflared not found - downloading..."
  mkdir -p tools/bin
  if command_exists curl; then
    curl -L --progress-bar -o tools/bin/cloudflared \
      https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
  else
    wget -q --show-progress -O tools/bin/cloudflared \
      https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
  fi
  chmod +x tools/bin/cloudflared
  export PATH="$ROOT/tools/bin:$PATH"
}

ensure_login() {
  if cloudflared tunnel list >/dev/null 2>&1; then
    echo "[OK] Logged in to Cloudflare."
    return
  fi
  echo "[!] Not logged in to Cloudflare - opening the login page..."
  cloudflared tunnel login || true
  if ! cloudflared tunnel list >/dev/null 2>&1; then
    echo "[!] Login did not complete. Using a temporary quick tunnel."
    QUICK_TUNNEL=1
  fi
}

run_server() {
  echo "[*] Starting SMTH Music on http://localhost:5000 ..."
  "$PY" run.py &
  SERVER_PID=$!
  sleep 2
}

run_tunnel() {
  echo "[*] Opening secure tunnel to your server..."
  if [ "${QUICK_TUNNEL:-0}" = "1" ]; then
    cloudflared tunnel --url http://localhost:5000
  else
    cloudflared tunnel run smth-music --url http://localhost:5000 || \
      cloudflared tunnel --url http://localhost:5000
  fi
  kill "$SERVER_PID" 2>/dev/null || true
}

banner
check_python
install_deps

while true; do
  clear
  banner
  echo "  Choose how to run SMTH Music:"
  echo
  echo "    [1]  Local     -  http://localhost:5000"
  echo "    [2]  Tunnel    -  public URL via cloudflared"
  echo "    [3]  Tools     -  admin / seed / backup helpers"
  echo "    [4]  Exit"
  echo
  read -rp "Select an option [1-4]: " pick
  case "$pick" in
    1) run_server; wait $SERVER_PID ;;
    2) check_cloudflared; ensure_login; run_server; run_tunnel ;;
    3)
      echo "  Tools:"
      echo "    [1] Promote a user to admin"
      echo "    [2] Seed demo tracks"
      echo "    [3] Database console"
      echo "    [4] Backup database + music"
      echo "    [5] Environment self-test"
      read -rp "Select [1-5]: " tool
      case "$tool" in
        1) "$PY" tools/make-admin.py ;;
        2) "$PY" tools/seed-demo.py ;;
        3) "$PY" tools/db-console.py ;;
        4) "$PY" tools/backup.py ;;
        5) "$PY" tools/check-env.py ;;
      esac
      ;;
    4) echo; echo "  See you later. >_<"; exit 0 ;;
    *) echo "Invalid option."; sleep 1 ;;
  esac
done

#!/bin/bash
# Hardened trivia server with auto-restart tunnel
set -euo pipefail

TRIVIA_DIR="/home/openclaw/agents/jassu/nerdearla-trivia"
PORT=4173
LOGDIR="$TRIVIA_DIR/logs"
mkdir -p "$LOGDIR"

# Kill any existing instances
pkill -f "serve.*dist.*$PORT" 2>/dev/null || true
pkill -f "cloudflared.*tunnel.*$PORT" 2>/dev/null || true
sleep 1

# Start static file server (production build)
cd "$TRIVIA_DIR"
nohup serve -s dist -l $PORT --single 2>&1 | tee "$LOGDIR/serve.log" &
SERVE_PID=$!
echo "Static server PID: $SERVE_PID (port $PORT)"

sleep 2

# Verify server is up
if ! curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/" | grep -q "200"; then
  echo "ERROR: Static server failed to start"
  exit 1
fi

echo "Static server OK"

# Tunnel with auto-restart loop
TUNNEL_URL=""
while true; do
  echo "[$(date -u)] Starting Cloudflare tunnel..."
  
  # Capture tunnel URL from output
  npx cloudflared tunnel --url "http://localhost:$PORT" 2>&1 | while IFS= read -r line; do
    echo "$line" >> "$LOGDIR/tunnel.log"
    if echo "$line" | grep -q "trycloudflare.com"; then
      URL=$(echo "$line" | grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com')
      if [ -n "$URL" ]; then
        echo "$URL" > "$LOGDIR/tunnel-url.txt"
        echo "[$(date -u)] TUNNEL LIVE: $URL/trivia/"
      fi
    fi
  done
  
  echo "[$(date -u)] Tunnel died, restarting in 5s..."
  sleep 5
done

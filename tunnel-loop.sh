#!/bin/bash
# Auto-restarting Cloudflare tunnel
while true; do
  echo "[$(date -u)] Starting tunnel..."
  npx cloudflared tunnel --url http://localhost:4173 2>&1 | tee -a /home/openclaw/agents/jassu/nerdearla-trivia/logs/tunnel.log | grep --line-buffered "trycloudflare.com" | while read -r line; do
    URL=$(echo "$line" | grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' || true)
    [ -n "$URL" ] && echo "$URL" > /home/openclaw/agents/jassu/nerdearla-trivia/logs/tunnel-url.txt && echo "LIVE: $URL/trivia/"
  done
  echo "[$(date -u)] Tunnel died, restarting in 3s..."
  sleep 3
done

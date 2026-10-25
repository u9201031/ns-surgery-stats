#!/bin/zsh
cd "$(dirname "$0")"
PORT="${1:-8765}"
echo "NS 手術統計 App → http://127.0.0.1:${PORT}"
echo "按 Ctrl+C 結束"
python3 -m http.server "$PORT"

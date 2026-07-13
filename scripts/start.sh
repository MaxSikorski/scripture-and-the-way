#!/bin/bash
# Start the Scripture & The Way website (default port 3001; pass another as $1)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
cd "$(dirname "$SCRIPT_DIR")"
node server.js "${1:-3001}"

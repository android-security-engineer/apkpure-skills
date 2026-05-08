#!/bin/bash
# APKPure SDK CLI wrapper
# Usage: ./apkpure.sh <command> [args...]
# Commands: search <query>, info <package>, download <package> [-o dir] [-v version], versions <package>, trending

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

exec node "$PROJECT_DIR/dist/cli.js" "$@"

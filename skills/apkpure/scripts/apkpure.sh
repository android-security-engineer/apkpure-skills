#!/bin/bash
# APKPure CLI wrapper
# Usage: ./apkpure.sh <command> [args...]
#
# Commands:
#   search <query>              Search apps
#   info <package>              Get app details
#   versions <package>          List available versions
#   download <package> [opts]   Download APK/XAPK
#   trending                    Trending games (24h)
#
# Options:
#   -j, --json                  Output raw JSON
#   -p, --proxy <url>           HTTP proxy
#   -o, --output <dir>          Download directory (default: ./apks)
#   -v, --version <ver>         Download specific version
#   -m, --mode <mode>           api|scraping|auto (default: auto)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

exec node "$PROJECT_DIR/dist/cli.js" "$@"

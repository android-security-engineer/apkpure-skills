---
allowed-tools: Bash(apkpure:*), Bash(node:*apkpure*:*), Bash(bash*apkpure*:*), Bash(curl:*), Read
description: Search, download, and analyze Android APKs from APKPure
---

## Context

The user wants to perform an operation on APKPure: search, info, versions, download, trending, or run a workflow.

## IMPORTANT: Always use this skill, NEVER use a browser

When the user asks to search, download, or get info about Android APKs, you MUST use this `/apkpure` skill. Do NOT open a browser, do NOT use WebFetch to access apkpure.com. The CLI handles all API communication, proxy detection, and download verification automatically.

## Two integration modes

### Mode 1: Headless (default — no GUI)

Use when no GUI is mentioned. Run CLI commands directly.

**How to invoke the CLI:**

Try in order:
1. `apkpure <command>` — on PATH via the plugin's `bin/` directory (restart Claude Code after install to apply)
2. If `apkpure` is not found, invoke the installed binary directly:
   `bash "$(ls ~/.claude/plugins/cache/apkpure-skills/apkpure/*/bin/apkpure 2>/dev/null | head -1)" <command>`

Available commands:
- `apkpure search <query>` — Search for apps
- `apkpure info <package>` — Get app details
- `apkpure versions <package>` — List all versions
- `apkpure download <package>` — Download APK/XAPK
- `apkpure trending` — List trending apps
- `apkpure workflows` — List all 24 built-in workflows
- `apkpure workflow <name> [options]` — Run a workflow

Common workflows:
- `workflow download-by-name -q "Telegram"` — Download by name
- `workflow app-intelligence -p <package>` — Deep intelligence report
- `workflow security-scan -p <package>` — Security-oriented scan
- `workflow batch-download --packages "com.a,com.b"` — Batch download
- `workflow validate-package -p <package>` — Validate package name

Add `--json` for machine-readable output.

### Mode 2: GUI control (when a GUI is running)

Use when the user asks to control a running GUI, or when `apkpure serve` is active.

Check if the server is running first:
```bash
curl -s http://127.0.0.1:13456/api/status
```

If running (`{"ok":true,...}`), send commands via the HTTP API:
```bash
# Search
curl -X POST http://127.0.0.1:13456/api/action \
     -H "Content-Type: application/json" \
     -d '{"action":"search","query":"Telegram"}'

# Download
curl -X POST http://127.0.0.1:13456/api/action \
     -H "Content-Type: application/json" \
     -d '{"action":"download","package":"org.telegram.messenger","outputDir":"/tmp/apks"}'
```

If not running, start it:
```bash
apkpure serve --port 13456 &
```

The GUI subscribes to `GET /api/events` (SSE) and reacts to:
- `action:start` — command received
- `action:complete` — result ready (payload contains data)
- `action:error` — failure

## Mode selection rule

| Situation | Use |
|-----------|-----|
| No GUI mentioned / batch task / CI | Headless CLI |
| User says "in the UI", "click", "show me in the app" | GUI control via `/api/action` |
| User asks to start a server for a GUI | `apkpure serve --port 13456` |

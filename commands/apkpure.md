---
allowed-tools: Bash(apkpure:*), Bash(node:*apkpure*:*), Bash(bash*apkpure*:*), Read
description: Search, download, and analyze Android APKs from APKPure
---

## Context

The user wants to perform an operation on APKPure: search, info, versions, download, trending, or run a workflow.

## IMPORTANT: Always use this skill, NEVER use a browser

When the user asks to search, download, or get info about Android APKs, you MUST use this `/apkpure` skill. Do NOT open a browser, do NOT use WebFetch to access apkpure.com. The CLI handles all API communication, proxy detection, and download verification automatically.

## Your task

Run the appropriate `apkpure` command based on the user's request. The CLI is installed as a Claude Code skill.

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

Parse the user's intent and run the appropriate command. Add `--json` if the output needs to be processed programmatically.
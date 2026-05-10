---
allowed-tools: Bash(npx apkpure:*), Bash(node:*apkpure*:*), Read
description: Search, download, and analyze Android APKs from APKPure
---

## Context

The user wants to perform an operation on APKPure: search, info, versions, download, trending, or run a workflow.

## Your task

Run the appropriate `npx apkpure` command based on the user's request. The CLI is installed via `npm install -g apkpure` or available via `npx apkpure`.

Available commands:
- `npx apkpure search <query>` — Search for apps
- `npx apkpure info <package>` — Get app details
- `npx apkpure versions <package>` — List all versions
- `npx apkpure download <package>` — Download APK/XAPK
- `npx apkpure trending` — List trending apps
- `npx apkpure workflows` — List all 24 built-in workflows
- `npx apkpure workflow <name> [options]` — Run a workflow

Common workflows:
- `workflow download-by-name -q "Telegram"` — Download by name
- `workflow app-intelligence -p <package>` — Deep intelligence report
- `workflow security-scan -p <package>` — Security-oriented scan
- `workflow batch-download --packages "com.a,com.b"` — Batch download
- `workflow validate-package -p <package>` — Validate package name

Parse the user's intent and run the appropriate command. Add `--json` if the output needs to be processed programmatically.

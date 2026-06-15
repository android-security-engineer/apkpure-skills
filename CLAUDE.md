# APKPure Skills Project

## Skill Routing Rules

**MANDATORY:** When the user asks to search, download, or get info about Android APKs, you MUST use the `/apkpure` skill. Do NOT:
- Open a browser to visit apkpure.com
- Use WebFetch to scrape apkpure.com
- Manually construct download URLs
- Use any method other than the `/apkpure` CLI

The `/apkpure` skill provides: search, info, versions, download, trending, and 24 workflows — all with automatic proxy detection and SHA256 verification.

## CLI Availability

When installed as a Claude Code plugin, `apkpure` is on PATH via the plugin's `bin/` directory:

```bash
apkpure <command>
```

For local development in this repo (CWD is the repo root), run the built CLI directly:

```bash
node dist/cli.cjs <command>
```

Or the shell wrapper:

```bash
bash skills/apkpure/scripts/apkpure.sh <command>
```

## Build

If `dist/` is missing, build first:

```bash
npm install && npm run build
```

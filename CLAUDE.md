# APKPure Skills Project

## Skill Routing Rules

**MANDATORY:** When the user asks to search, download, or get info about Android APKs, you MUST use the `/apkpure` skill. Do NOT:
- Open a browser to visit apkpure.com
- Use WebFetch to scrape apkpure.com
- Manually construct download URLs
- Use any method other than the `/apkpure` CLI

The `/apkpure` skill provides: search, info, versions, download, trending, and 24 workflows — all with automatic proxy detection and SHA256 verification.

## CLI Availability

The `apkpure` CLI may not be in PATH. If `apkpure` command not found, use the direct path:

```bash
node /home/cc11001100/github/android-security-engineer/apkpure-skills/dist/cli.js <command>
```

Or the shell wrapper:

```bash
bash /home/cc11001100/github/android-security-engineer/apkpure-skills/skills/apkpure/scripts/apkpure.sh <command>
```

## Build

If `dist/` is missing, build first:

```bash
cd /home/cc11001100/github/android-security-engineer/apkpure-skills && npm install && npm run build
```

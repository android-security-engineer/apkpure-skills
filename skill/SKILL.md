---
name: apkpure
description: Search, get info, list versions, and download Android APK files from APKPure. Use when the user asks to: (1) search for Android apps by name or keyword, (2) get detailed app information (version, developer, description, download URL), (3) list all available versions of an app, (4) download APK/XAPK files to local disk, (5) find trending apps, (6) run composable workflows for one-step operations. Supports auto-detection of local Clash proxy for GFW environments. Complete workflow: search → info → versions → download.
---

# APKPure — Android APK Search & Download

Complete workflow for finding and downloading Android APK files.

## Install

```bash
# Claude Code marketplace (recommended)
claude plugin marketplace add android-security-engineer/apkpure-skills
claude plugin install apkpure@apkpure-skills
```

> **Note:** The npm package name `apkpure` is taken by an unrelated project. Do not use `npm install -g apkpure` or `npx apkpure` — those will install a different package.

## Quick Start

```bash
apkpure search telegram
apkpure info org.telegram.messenger
apkpure versions org.telegram.messenger
apkpure download org.telegram.messenger
```

## Workflow: Search → Info → Versions → Download

### Step 1: Search

Find apps by name or keyword. Returns package name, version, developer, category.

```bash
apkpure search "whatsapp"
apkpure search "微信"
```

Default output is human-readable. Add `--json` for machine-readable output.

Output fields: package name (needed for subsequent commands), app name, version, developer, category, rating.

### Step 2: Get Info

Use the package name from search results to get full details.

```bash
apkpure info com.whatsapp
```

Returns: name, version, version code, developer, category, rating, update date, description, download availability (APK/XAPK/APKS), screenshots.

### Step 3: List Versions

See all available versions before downloading.

```bash
apkpure versions org.telegram.messenger
```

Returns: version name, version code, file type (APK/XAPK/APKS). Latest version is marked.

### Step 4: Download

Download latest version or a specific version.

```bash
# Latest version
apkpure download com.whatsapp

# Specific version
apkpure download org.telegram.messenger -v 10.5.1

# Custom output directory
apkpure download com.whatsapp -o ~/Downloads
```

Returns: file path, file size, file type, SHA256 hash.

### Extra: Trending

```bash
apkpure trending
```

Lists trending games in the last 24 hours.

## Workflows (24 Built-in)

High-level operations that compose multiple steps into one call. Perfect for AI agents and automation — no need to chain individual commands.

```bash
# List all available workflows
apkpure workflows

# Run a workflow
apkpure workflow <name> [options]
```

### Search-based Workflows (input app name, no package name needed)

| Workflow | Command | What it does |
|----------|---------|-------------|
| `download-by-name` | `-q "Telegram"` | Search by name → download best match |
| `search-and-download` | `-q "WhatsApp"` | Search → download, return composed result |
| `search-and-info` | `-q "Signal"` | Search → get detailed info |
| `search-and-report` | `-q "Telegram"` | Search → info + all versions |
| `search-intelligence` | `-q "WeChat"` | Search → deep intelligence report |
| `quick-lookup` | `-q "VPN"` | Search → return key metadata only |
| `explore-category` | `-q "games"` | Search → structured app listing |

### Package-based Workflows (input package name)

| Workflow | Command | What it does |
|----------|---------|-------------|
| `download-latest` | `-p org.telegram.messenger` | Download latest with metadata |
| `download-version` | `-p <pkg> -v 10.5.1` | Download a specific version |
| `download-oldest` | `-p com.whatsapp` | Download oldest version (vuln research) |
| `verify-and-download` | `-p com.whatsapp` | Verify exists → download |
| `download-and-verify` | `-p com.whatsapp` | Download → return SHA256 for verification |
| `app-report` | `-p org.telegram.messenger` | Full info + all versions |
| `info-and-versions` | `-p com.whatsapp` | Info + versions (alias for app-report) |
| `validate-package` | `-p com.whatsapp` | Check if package exists on APKPure |

### Intelligence & Analysis Workflows

| Workflow | Command | What it does |
|----------|---------|-------------|
| `app-intelligence` | `-p com.whatsapp` | Deep report: info + versions + file types + range |
| `version-audit` | `-p com.whatsapp` | Version comparison table |
| `compare-versions` | `-p com.whatsapp` | Version jump analysis for diff targeting |
| `check-update` | `-p <pkg> --current-version 2.25` | Check if update available |
| `security-scan` | `-p com.whatsapp` | Download + version analysis for vuln research |

### Batch & Discovery Workflows

| Workflow | Command | What it does |
|----------|---------|-------------|
| `batch-download` | `--packages "com.a,com.b"` | Download multiple apps at once |
| `batch-info` | `--packages "com.a,com.b"` | Get info for multiple apps |
| `batch-validate` | `--packages "com.a,com.b"` | Validate multiple package names |
| `trending-and-info` | — | List trending apps |

### Workflow Examples

```bash
# One-step: download by name
apkpure workflow download-by-name -q "Telegram"

# Deep intelligence report for reverse engineering
apkpure workflow app-intelligence -p org.telegram.messenger

# Security scan: download + analyze versions
apkpure workflow security-scan -p com.whatsapp

# Download oldest version for vulnerability research
apkpure workflow download-oldest -p com.whatsapp

# Check if an update is available
apkpure workflow check-update -p com.whatsapp --current-version 2.25.1

# Validate multiple package names
apkpure workflow batch-validate --packages "com.whatsapp,org.telegram.messenger,com.fake.app"

# Explore apps in a category
apkpure workflow explore-category -q "VPN"
```

### Programmatic Workflows

```typescript
import { runWorkflow, listWorkflows } from "apkpure";

// List available workflows
const workflows = listWorkflows();

// Run a workflow
const result = await runWorkflow("download-by-name", {
  query: "Telegram",
}, { outputDir: "/tmp/apks" });

if (result.success) {
  const output = result.output as {
    app: string;
    packageName: string;
    version: string;
    filePath: string;
    sha256: string;
  };
  console.log(`Downloaded ${output.app} to ${output.filePath}`);
}
```

### AI Agent Workflows

```typescript
import { handleSkillRequest } from "apkpure";

// One-step: download by name
const result = await handleSkillRequest({
  action: "workflow",
  workflow: "download-by-name",
  params: { query: "Telegram" },
});

// Security scan
const scan = await handleSkillRequest({
  action: "workflow",
  workflow: "security-scan",
  params: { package: "com.whatsapp" },
});

// List workflows
const workflows = await handleSkillRequest({
  action: "list-workflows",
});
```

## Common Options

| Flag | Description |
|------|-------------|
| `-p, --proxy <url>` | Override auto-detected proxy |
| `-m, --mode <mode>` | `api` (fast), `scraping` (reliable), `auto` (default) |
| `-o, --output <dir>` | Download output directory (default: `~/.apkpure/downloads/`) |
| `-v, --version <ver>` | Download specific version |
| `-j, --json` | Output raw JSON instead of formatted text |

## Proxy

Auto-detected in order: environment variables (`HTTPS_PROXY`, `HTTP_PROXY`, `ALL_PROXY`, case-insensitive including lowercase) → Clash/Mihomo config files → port scan (7897, 7890, 1080, 1087, 10809...). Works behind GFW without any manual config.

Override if needed:

```bash
apkpure search telegram --proxy http://127.0.0.1:7897
```

## Typical Session

```bash
# 1. Find the app
apkpure search "signal messenger"
# → Found: org.thoughtcrime.securesms

# 2. Check details
apkpure info org.thoughtcrime.securesms
# → Version 7.0.0, 80MB, APK

# 3. Check available versions
apkpure versions org.thoughtcrime.securesms
# → 7.0.0 (latest), 6.48.2, 6.47.2, ...

# 4. Download
apkpure download org.thoughtcrime.securesms -o ./apks
# → Saved: ./apks/org.thoughtcrime.securesms-7.0.0.apk (SHA256: abc...)
```

Or use a workflow to do it all in one step:

```bash
apkpure workflow download-by-name -q "Signal"
# → Downloads Signal and returns file path + SHA256
```

## Troubleshooting

- **No results / connection error**: Proxy not detected. Pass `--proxy http://127.0.0.1:7897` or set `HTTPS_PROXY`.
- **Search works but info fails**: Some apps have restricted access. Try `--mode scraping`.
- **Download fails**: CDN URLs expire. Re-run `info` first, then download immediately.
- **Version not found**: Run `versions` command to see what's available.

For architecture, API protocol, CSS selectors, and TypeScript types, see [references/advanced.md](references/advanced.md).

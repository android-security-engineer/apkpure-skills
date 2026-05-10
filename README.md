# apkpure

CLI & SDK to search, inspect, and download Android APKs/XAPKs from [APKPure](https://apkpure.com) — zero config, proxy auto-detected.

[![npm version](https://img.shields.io/npm/v/apkpure.svg)](https://www.npmjs.com/package/apkpure)
[![Node.js >=20](https://img.shields.io/node/v/apkpure.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

```bash
npx apkpure search telegram
```

No install, no setup. Works behind GFW out of the box.

## Install

### Claude Code (Marketplace)

```bash
# Add the marketplace
claude plugin marketplace add android-security-engineer/apkpure-skills

# Install the plugin
claude plugin install apkpure@apkpure-skills
```

This installs the `apkpure` skill with 24 built-in workflows, slash commands, and auto-detection — directly inside Claude Code.

### npm

```bash
npm install -g apkpure
# or use without installing:
npx apkpure search telegram
```

## Features

- **Search** — find apps by keyword with pagination
- **Info** — get detailed app metadata (version, size, developer, etc.)
- **Download** — grab APK/XAPK files with SHA-256 verification
- **Versions** — list all available versions of an app
- **Trending** — discover trending apps
- **Dual-mode** — mobile API + web scraping with automatic fallback
- **Proxy auto-detection** — env vars, Clash config, port scan
- **AI-ready** — programmatic SDK and skill handler for AI agents

## Quick Start

```bash
# Search
npx apkpure search "whatsapp"
npx apkpure search "微信" --page 2

# Get app details
npx apkpure info com.whatsapp

# List all versions
npx apkpure versions org.telegram.messenger

# Download latest APK/XAPK
npx apkpure download com.whatsapp

# Download a specific version
npx apkpure download org.telegram.messenger -v 10.5.1

# Download to a custom directory
npx apkpure download com.whatsapp -o ~/Downloads

# Output as JSON (for scripting)
npx apkpure search telegram --json
npx apkpure info com.whatsapp --json
```

## CLI Reference

### Global Options

| Option | Description | Default |
|--------|-------------|---------|
| `-m, --mode <mode>` | API mode: `api`, `scraping`, or `auto` | `auto` |
| `-p, --proxy <url>` | HTTP proxy URL | auto-detected |
| `-j, --json` | Output raw JSON | — |

### Commands

#### `search <query>`

Search for apps on APKPure.

```bash
npx apkpure search "telegram"
npx apkpure search "微信" --page 2 --json
```

| Option | Description | Default |
|--------|-------------|---------|
| `--page <num>` | Page number | `1` |

#### `info <package>`

Get detailed information about an app.

```bash
npx apkpure info com.whatsapp
npx apkpure info org.telegram.messenger --json
```

#### `download <package>`

Download an APK or XAPK file.

```bash
npx apkpure download com.whatsapp
npx apkpure download org.telegram.messenger -v 10.5.1 -o ~/Downloads
```

| Option | Description | Default |
|--------|-------------|---------|
| `-o, --output <dir>` | Output directory | `~/.apkpure/downloads` |
| `-v, --version <ver>` | Specific version to download | latest |

#### `versions <package>`

List all available versions of an app.

```bash
npx apkpure versions org.telegram.messenger
```

#### `trending`

List trending apps.

```bash
npx apkpure trending
```

## Workflows

High-level operations that compose multiple skills into one step. Perfect for AI agents and automation.

```bash
# List available workflows
npx apkpure workflows

# Download by app name — just say the name, get the APK
npx apkpure workflow download-by-name -q "Telegram"

# Search and download in one step
npx apkpure workflow search-and-download -q "WhatsApp" -o ~/Downloads

# Search and get info in one step
npx apkpure workflow search-and-info -q "Signal"

# Full report by name (no package name needed)
npx apkpure workflow search-and-report -q "Telegram"

# Download latest with full metadata
npx apkpure workflow download-latest -p org.telegram.messenger

# Download a specific version
npx apkpure workflow download-version -p org.telegram.messenger -v 10.5.1

# Verify app exists, then download
npx apkpure workflow verify-and-download -p com.whatsapp

# Full app report (info + all versions)
npx apkpure workflow app-report -p org.telegram.messenger

# Deep intelligence report for reverse engineering
npx apkpure workflow app-intelligence -p org.telegram.messenger

# Security scan: download + version analysis
npx apkpure workflow security-scan -p com.whatsapp

# Download with SHA256 integrity verification
npx apkpure workflow download-and-verify -p com.whatsapp

# Version jump analysis for diff targeting
npx apkpure workflow compare-versions -p com.whatsapp

# Version audit — all versions with codes and types
npx apkpure workflow version-audit -p com.whatsapp

# Download oldest version for vulnerability research
npx apkpure workflow download-oldest -p com.whatsapp

# Quick lookup — just the key metadata
npx apkpure workflow quick-lookup -q "Signal"

# Check if an update is available
npx apkpure workflow check-update -p com.whatsapp --current-version 2.25.1

# Explore apps in a category
npx apkpure workflow explore-category -q "VPN"

# Validate a package name
npx apkpure workflow validate-package -p com.whatsapp

# Batch validate multiple packages
npx apkpure workflow batch-validate --packages "com.whatsapp,org.telegram.messenger"

# Batch info for multiple apps (no download)
npx apkpure workflow batch-info --packages "com.whatsapp,org.telegram.messenger"

# Batch download multiple apps
npx apkpure workflow batch-download --packages "com.whatsapp,org.telegram.messenger"
```

### Built-in Workflows (24)

#### Search-based (input app name, no package name needed)

| Workflow | Input | Description |
|----------|-------|-------------|
| `download-by-name` | `-q <name>` | Search by name, download best match |
| `search-and-download` | `-q <query>` | Search and download, return composed result |
| `search-and-info` | `-q <query>` | Search and get detailed info in one call |
| `search-and-report` | `-q <query>` | Search + info + versions without package name |
| `search-intelligence` | `-q <query>` | Search + deep intelligence report |
| `quick-lookup` | `-q <query>` | Search + return key metadata only |
| `explore-category` | `-q <query>` | Search + structured app listing |

#### Package-based (input package name)

| Workflow | Input | Description |
|----------|-------|-------------|
| `app-report` | `-p <package>` | Full info + all available versions |
| `download-latest` | `-p <package>` | Download latest with app metadata in result |
| `download-version` | `-p <pkg> -v <ver>` | Download a specific version |
| `download-oldest` | `-p <package>` | Download oldest version for vuln research |
| `verify-and-download` | `-p <package>` | Verify app exists before downloading |
| `download-and-verify` | `-p <package>` | Download + return SHA256 for integrity check |
| `info-and-versions` | `-p <package>` | Get info + all versions |
| `validate-package` | `-p <package>` | Check if package exists on APKPure |

#### Intelligence & Analysis

| Workflow | Input | Description |
|----------|-------|-------------|
| `app-intelligence` | `-p <package>` | Deep report: info + versions + file types + range |
| `version-audit` | `-p <package>` | Version comparison table for diff analysis |
| `compare-versions` | `-p <package>` | Version jump analysis for diff targeting |
| `check-update` | `-p <pkg> --current-version` | Check if update available |
| `security-scan` | `-p <package>` | Download + version analysis for vuln research |

#### Batch & Discovery

| Workflow | Input | Description |
|----------|-------|-------------|
| `batch-download` | `--packages <csv>` | Download multiple apps at once |
| `batch-info` | `--packages <csv>` | Get info for multiple apps |
| `batch-validate` | `--packages <csv>` | Validate multiple package names |
| `trending-and-info` | — | List trending apps |

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

// List workflows
const workflows = await handleSkillRequest({
  action: "list-workflows",
});
```

## Proxy Auto-Detection

Works behind firewalls and GFW without manual configuration. Detection order:

1. **Environment variables** — `HTTPS_PROXY`, `HTTP_PROXY`, `ALL_PROXY`
2. **Clash config files** — reads `mixed-port` / `port` from Clash config
3. **Port scanning** — probes common proxy ports (7897, 7890, 1080, etc.)

Override if needed:

```bash
npx apkpure search telegram --proxy http://127.0.0.1:7897
```

## Programmatic SDK

Use as a Node.js library:

```typescript
import { ApkPure } from "apkpure";

const sdk = new ApkPure({ mode: "auto" });

// Search
const { apps } = await sdk.search("telegram");

// Get app details
const detail = await sdk.getInfo("org.telegram.messenger");

// Download
const result = await sdk.download("com.whatsapp", {
  outputDir: "/path/to/downloads",
  version: "2.24.5",  // optional, defaults to latest
  onProgress: (downloaded, total) => {
    console.log(`${(downloaded / total * 100).toFixed(1)}%`);
  },
});
console.log(`Downloaded: ${result.filePath}`);
console.log(`SHA-256: ${result.sha256}`);

// List versions
const versions = await sdk.getVersions("org.telegram.messenger");
```

### SDK Types

```typescript
interface AppInfo {
  packageName: string;
  name: string;
  version?: string;
  versionCode?: number;
  iconUrl?: string;
  developer?: string;
  category?: string;
  rating?: string;
  description?: string;
  size?: number;
  fileType?: "apk" | "xapk" | "apks";
}

interface AppDetail extends AppInfo {
  downloadUrl: string;
  updateDate?: string;
  requiresAndroid?: string;
  screenshots?: string[];
}

interface DownloadResult {
  filePath: string;
  packageName: string;
  version: string;
  fileType: string;
  fileSize: number;
  sha256: string;
}
```

## AI Agent Integration

Built-in skill handler for AI agents (Claude, GPT, etc.):

```typescript
import { handleSkillRequest } from "apkpure";

const result = await handleSkillRequest({
  action: "download",
  package: "com.whatsapp",
  outputDir: "/tmp/apks",  // optional, defaults to ~/.apkpure/downloads
});
```

Supported actions: `search`, `info`, `download`, `versions`, `trending`.

## Install Globally

```bash
npm install -g apkpure
apkpure search telegram
```

## Architecture

```
src/
├── cli.ts                  # Commander CLI entry point
├── skill-handler.ts        # AI agent skill handler
├── config.ts               # Constants and defaults
├── core/
│   ├── apkpure.ts          # Main SDK class (dual-mode orchestration)
│   └── downloader.ts       # File download with SHA-256 verification
├── client/
│   ├── mobile-client.ts    # APKPure mobile API client (signed requests)
│   └── scraping-client.ts  # Web scraping client (Cheerio-based)
├── types/
│   ├── index.ts            # Public SDK types
│   └── api.ts              # Mobile API response types
└── utils/
    ├── crypto.ts           # HMAC signing for mobile API
    ├── headers.ts          # Default HTTP headers
    ├── http.ts             # HTTP client (fetch + proxy support)
    └── proxy.ts            # Proxy auto-detection
```

**Dual-mode strategy:** In `auto` mode, the mobile API is tried first for speed and structured data. If it fails, the scraping client falls back automatically. You can force a specific mode with `--mode api` or `--mode scraping`.

## Test Coverage

172 tests with 96%+ line coverage across all core modules.

```bash
npm test
```

## License

MIT

# apkpure

CLI & SDK to search, inspect, and download Android APKs/XAPKs from [APKPure](https://apkpure.com) — zero config, proxy auto-detected.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js >=20](https://img.shields.io/node/v/apkpure.svg)](https://nodejs.org/)

```bash
apkpure search telegram
```

No install, no setup. Works behind GFW out of the box.

---

## Install

### Claude Code (Recommended)

```bash
# Add the marketplace
claude plugin marketplace add android-security-engineer/apkpure-skills

# Install the plugin
claude plugin install apkpure@apkpure-skills
```

This installs the `apkpure` skill with 24 built-in workflows, slash commands, and auto-detection — directly inside Claude Code.

### From Source

```bash
git clone https://github.com/android-security-engineer/apkpure-skills.git
cd apkpure-skills
npm install && npm run build

# Use the CLI directly
node dist/cli.js search telegram
```

> **Note:** The npm package name `apkpure` is already taken by another project. `npm install -g apkpure` and `npx apkpure` will install a different, unrelated package. Use the Claude Code skill installation or build from source instead.

---

## Quick Start

After installing as a Claude Code skill, use the `/apkpure` command:

```
/apkpure search telegram
```

Or use the CLI directly if building from source:

```bash
# Search
node dist/cli.js search "whatsapp"
node dist/cli.js search "微信" --page 2

# Get app details
node dist/cli.js info com.whatsapp

# List all versions
node dist/cli.js versions org.telegram.messenger

# Download latest APK/XAPK
node dist/cli.js download com.whatsapp

# Download a specific version
node dist/cli.js download org.telegram.messenger -v 10.5.1

# Download to a custom directory
node dist/cli.js download com.whatsapp -o ~/Downloads

# Output as JSON (for scripting)
node dist/cli.js search telegram --json
node dist/cli.js info com.whatsapp --json
```

---

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
apkpure search "telegram"
apkpure search "微信" --page 2 --json
```

| Option | Description | Default |
|--------|-------------|---------|
| `--page <num>` | Page number | `1` |

#### `info <package>`

Get detailed information about an app.

```bash
apkpure info com.whatsapp
apkpure info org.telegram.messenger --json
```

#### `download <package>`

Download an APK or XAPK file.

```bash
apkpure download com.whatsapp
apkpure download org.telegram.messenger -v 10.5.1 -o ~/Downloads
```

| Option | Description | Default |
|--------|-------------|---------|
| `-o, --output <dir>` | Output directory | `~/.apkpure/downloads` |
| `-v, --version <ver>` | Specific version to download | latest |

#### `versions <package>`

List all available versions of an app.

```bash
apkpure versions org.telegram.messenger
```

#### `trending`

List trending apps.

```bash
apkpure trending
```

---

## Workflows

24 built-in workflows for common multi-step operations. Each workflow chains multiple SDK calls into a single command.

### Listing Workflows

```bash
apkpure workflows
```

### Running a Workflow

```bash
apkpure workflow download-by-name --query "Telegram"
```

### Available Workflows

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

> **Note:** Programmatic import (`import from "apkpure"`) requires building from source and referencing the local package. It is not available via the npm registry.

---

## Proxy Auto-Detection

Works behind GFW without any configuration. The SDK auto-detects proxy settings in this order:

1. **Environment variables:** `HTTPS_PROXY`, `HTTP_PROXY`, `ALL_PROXY` (case-insensitive, including lowercase variants)
2. **Clash config:** Reads `mixed-port` from Clash/Mihomo config directories
3. **Port scan:** Checks common proxy ports (7897, 7890, 1080, 1087, 10809, etc.) on localhost

Override with `--proxy` flag if auto-detection fails:

```bash
apkpure search telegram --proxy http://127.0.0.1:7890
```

---

## Programmatic SDK

Use as a Node.js library (requires building from source):

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

> **Note:** Programmatic import requires building from source and referencing the local package. The `apkpure` name on npm is an unrelated package.

---

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

Supported actions: `search`, `info`, `download`, `versions`, `trending`, `workflow`, `list-workflows`.

---

### SDK Types

```typescript
interface AppInfo {
  packageName: string;
  name: string;
  version: string;
  versionCode?: number;
  size?: number;
  iconUrl?: string;
  description?: string;
  developer?: string;
  rating?: string;
  category?: string;
}

interface AppDetail extends AppInfo {
  downloadUrl: string;
  fileType: "apk" | "xapk" | "apks";
  screenshots?: string[];
  updateDate?: string;
  requiresAndroid?: string;
  olderVersions?: AppVersion[];
}

interface AppVersion {
  version: string;
  versionCode: number;
  downloadUrl: string;
  fileSize?: string;
  type: "apk" | "xapk" | "apks";
}

interface DownloadOptions {
  outputDir: string;
  version?: string;
  fileName?: string;
  onProgress?: (downloaded: number, total: number) => void;
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

---

## License

MIT

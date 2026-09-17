# apkpure

CLI & SDK to search, inspect, and download Android APKs/XAPKs from [APKPure](https://apkpure.com) — zero config, no proxy needed.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js >=20](https://img.shields.io/node/v/apkpure.svg)](https://nodejs.org/)

```bash
apkpure search telegram
```

No install, no setup, no VPN. The default Android mobile-API path talks to
APKPure's app backend directly — verified working over a plain connection.

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
node dist/cli.cjs search telegram
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
node dist/cli.cjs search "whatsapp"
node dist/cli.cjs search "微信" --page 2

# Get app details (includes supported CPU architectures)
node dist/cli.cjs info com.whatsapp

# List all versions
node dist/cli.cjs versions org.telegram.messenger

# Download latest APK/XAPK
node dist/cli.cjs download com.whatsapp

# Download a specific version
node dist/cli.cjs download org.telegram.messenger -v 10.5.1

# Download to a custom directory
node dist/cli.cjs download com.whatsapp -o ~/Downloads

# Output as JSON (for scripting)
node dist/cli.cjs search telegram --json
node dist/cli.cjs info com.whatsapp --json
```

---

## CLI Reference

### Global Options

| Option | Description | Default |
|--------|-------------|---------|
| `-m, --mode <mode>` | Data source: `android` (default), `web`, or `auto` (Android first, web fallback). Legacy `api`/`scraping` aliases still work | `android` |
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

#### `doctor`

Diagnose the anti-scraping setup: TLS-impersonation backend, proxy, and a live
connectivity test against apkpure.com. Run it first when search/download fails.

```bash
apkpure doctor
```

---

## Data Sources: Android (default) · Web · iOS (not available)

All commands default to the **Android mobile API** (`tapi.pureapk.com/v3`,
same backend the APKPure Android app uses) — no login, no proxy needed:

- `search`, `info`, `download` work out of the box, including a supported-CPU
  architecture list (`Architectures: arm64-v8a, armeabi-v7a, …`) on `info`.
- Each version ships **one** file: either a universal APK covering every listed
  architecture, or an XAPK bundle containing the matching native libraries —
  there is no separate per-architecture download to choose from.
- `versions` and `trending` have no mobile-API equivalent and always use the
  website channel.

Use `-m web` to force the website channel, or `-m auto` for Android-first with
web fallback. The website (`apkpure.com`) sits behind Cloudflare — when it is
unreachable in your network, Android-default commands still work; only
`versions`/`trending`/`-m web` are affected. Install `pip install curl_cffi`
for the best website-channel reliability.

**iOS:** not available — APKPure has no iOS store protocol to implement against.

## Anti-Scraping / Cloudflare Bypass

APKPure has two front doors with different protection:

- **Android mobile API** (`tapi.pureapk.com`, the default) is protected by
  Cloudflare **plus** a signed-header protocol (`Ual-Access-*`, MD5 of
  body + timestamp + secret + nonce). The SDK passes both: requests go out
  with a real browser TLS fingerprint (`curl_cffi`, Chrome 136) pinned to the
  genuine Cloudflare IPs (resolved via Cloudflare DoH to bypass polluted local
  DNS), with full Android device/signature headers. No proxy needed.
- **Website** (`apkpure.com`, used by `versions`/`trending`/`-m web`) is behind
  **Cloudflare** TLS-fingerprinting (JA3/JA4) — plain Node/OpenSSL requests are
  blocked regardless of the HTTP headers they send. The tool solves this in
  layers:

- **Search & info** default to the mobile API (`tapi.pureapk.com`), which the
  SDK reaches with browser-TLS impersonation + genuine-IP resolution (see
  above), so they work with zero setup.
- **Web-scraping fallback & downloads** use a real browser TLS fingerprint via an
  external impersonation backend when one is installed, and fall back to Node
  (with a full Chrome header set) otherwise. If Cloudflare blocks the fallback,
  you get an actionable error instead of silent junk HTML.

Install **one** backend for maximum reliability — it's auto-detected, no config:

```bash
pip install curl_cffi          # recommended, cross-platform
# or curl-impersonate: https://github.com/lwthiker/curl-impersonate
```

Verify with `apkpure doctor`. Optional overrides: `APKPURE_IMPERSONATE`
(`auto`|`node`|`curl_cffi`|`curl-impersonate`|`<path>`) and
`APKPURE_IMPERSONATE_TARGET` (`chrome`, `chrome131`, …). Full details in
[skills/apkpure/references/advanced.md](skills/apkpure/references/advanced.md#anti-scraping--cloudflare-bypass).

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

const sdk = new ApkPure({ mode: "android" }); // or "web", or "auto" (Android first, web fallback)

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
  /** CPU ABIs the file supports (universal APK covers all; XAPK bundles them) */
  nativeCode?: string[];
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

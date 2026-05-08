---
name: apkpure
description: Search, get info, and download Android APK files from APKPure. Use when the user asks to: (1) search for Android apps by name or keyword, (2) get detailed app information (version, developer, description, download URL), (3) download APK/XAPK files, (4) list app versions, (5) find trending apps. Supports auto-detection of local Clash proxy for GFW environments.
---

# APKPure — Android APK Search & Download

Search, inspect, and download Android APK files from APKPure via CLI or Node.js SDK.

## Commands

Run via wrapper script (auto-detects proxy, no configuration needed):

```
./skill/scripts/apkpure.sh <command> [options]
```

### search — Find apps by name or keyword

```bash
./skill/scripts/apkpure.sh search "telegram"
```

Returns JSON: `{ "apps": [{ "packageName": "...", "name": "...", "version": "..." }] }`

### info — Get full app details

```bash
./skill/scripts/apkpure.sh info com.whatsapp
```

Returns: name, version, download URL, description, developer, file type (apk/xapk/apks), screenshots, update date.

### download — Download APK/XAPK to local disk

```bash
./skill/scripts/apkpure.sh download com.whatsapp -o ./apks
./skill/scripts/apkpure.sh download org.telegram.messenger -v 10.5.1 -o ./apks
```

Shows progress bar. Outputs: file path, SHA256, file size.

### versions — List all available versions

```bash
./skill/scripts/apkpure.sh versions org.telegram.messenger
```

### trending — Trending games (24h)

```bash
./skill/scripts/apkpure.sh trending
```

### Common options

| Flag | Description |
|------|-------------|
| `-p, --proxy <url>` | Override auto-detected proxy |
| `-m, --mode <mode>` | `api` (fast), `scraping` (HTML), `auto` (default) |
| `-o, --output <dir>` | Download output directory (default: `./apks`) |
| `-v, --version <ver>` | Download specific version |

## Programmatic Usage (Node.js)

```javascript
const { ApkPure } = require("/Users/cc11001100/github/android-reverse-hub/apkpure-skills/dist/index.cjs");

const sdk = new ApkPure(); // auto-detects proxy
const results = await sdk.search("telegram");
const detail = await sdk.getInfo("org.telegram.messenger");
const versions = await sdk.getVersions("org.telegram.messenger");
const downloadResult = await sdk.download("com.whatsapp", { outputDir: "./apks" });
```

## Troubleshooting

- **No results / connection error**: Proxy not detected. Pass `--proxy http://127.0.0.1:7897` or set `HTTPS_PROXY`.
- **Search works but detail fails**: Some apps have restricted detail access. Try `--mode scraping`.
- **Download fails**: CDN URLs expire. Fetch fresh detail first, then download immediately.

For architecture, API protocol, CSS selectors, and full TypeScript types, see [references/advanced.md](references/advanced.md).

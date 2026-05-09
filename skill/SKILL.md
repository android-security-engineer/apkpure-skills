---
name: apkpure
description: Search, get info, list versions, and download Android APK files from APKPure. Use when the user asks to: (1) search for Android apps by name or keyword, (2) get detailed app information (version, developer, description, download URL), (3) list all available versions of an app, (4) download APK/XAPK files to local disk, (5) find trending apps. Supports auto-detection of local Clash proxy for GFW environments. Complete workflow: search → info → versions → download.
---

# APKPure — Android APK Search & Download

Complete workflow for finding and downloading Android APK files.

## Quick Start

```bash
npx apkpure search telegram
npx apkpure info org.telegram.messenger
npx apkpure versions org.telegram.messenger
npx apkpure download org.telegram.messenger
```

## Workflow: Search → Info → Versions → Download

### Step 1: Search

Find apps by name or keyword. Returns package name, version, developer, category.

```bash
npx apkpure search "whatsapp"
npx apkpure search "微信"
```

Default output is human-readable. Add `--json` for machine-readable output.

Output fields: package name (needed for subsequent commands), app name, version, developer, category, rating.

### Step 2: Get Info

Use the package name from search results to get full details.

```bash
npx apkpure info com.whatsapp
```

Returns: name, version, version code, developer, category, rating, update date, description, download availability (APK/XAPK/APKS), screenshots.

### Step 3: List Versions

See all available versions before downloading.

```bash
npx apkpure versions org.telegram.messenger
```

Returns: version name, version code, file type (APK/XAPK/APKS). Latest version is marked.

### Step 4: Download

Download latest version or a specific version.

```bash
# Latest version
npx apkpure download com.whatsapp

# Specific version
npx apkpure download org.telegram.messenger -v 10.5.1

# Custom output directory
npx apkpure download com.whatsapp -o ~/Downloads
```

Returns: file path, file size, file type, SHA256 hash.

### Extra: Trending

```bash
npx apkpure trending
```

Lists trending games in the last 24 hours.

## Common Options

| Flag | Description |
|------|-------------|
| `-p, --proxy <url>` | Override auto-detected proxy |
| `-m, --mode <mode>` | `api` (fast), `scraping` (reliable), `auto` (default) |
| `-o, --output <dir>` | Download output directory (default: `./apks`) |
| `-v, --version <ver>` | Download specific version |
| `-j, --json` | Output raw JSON instead of formatted text |

## Proxy

Auto-detected in order: `HTTPS_PROXY` env var → Clash config → port scan (7897, 7890, 1080...). Works behind GFW without any manual config.

Override if needed:

```bash
npx apkpure search telegram --proxy http://127.0.0.1:7897
```

## Typical Session

```bash
# 1. Find the app
npx apkpure search "signal messenger"
# → Found: org.thoughtcrime.securesms

# 2. Check details
npx apkpure info org.thoughtcrime.securesms
# → Version 7.0.0, 80MB, APK

# 3. Check available versions
npx apkpure versions org.thoughtcrime.securesms
# → 7.0.0 (latest), 6.48.2, 6.47.2, ...

# 4. Download
npx apkpure download org.thoughtcrime.securesms -o ./apks
# → Saved: ./apks/org.thoughtcrime.securesms-7.0.0.apk (SHA256: abc...)
```

## Troubleshooting

- **No results / connection error**: Proxy not detected. Pass `--proxy http://127.0.0.1:7897` or set `HTTPS_PROXY`.
- **Search works but info fails**: Some apps have restricted access. Try `--mode scraping`.
- **Download fails**: CDN URLs expire. Re-run `info` first, then download immediately.
- **Version not found**: Run `versions` command to see what's available.

For architecture, API protocol, CSS selectors, and TypeScript types, see [references/advanced.md](references/advanced.md).

# apkpure

Search, get info, list versions, and download Android APKs from APKPure — one command, zero config.

```bash
npx apkpure search telegram
```

That's it. No install, no setup. Proxy auto-detected.

## Complete Workflow

```bash
# 1. Search
npx apkpure search "whatsapp"
npx apkpure search "微信"

# 2. Get info
npx apkpure info com.whatsapp

# 3. List versions
npx apkpure versions org.telegram.messenger

# 4. Download
npx apkpure download com.whatsapp
npx apkpure download org.telegram.messenger -v 10.5.1
npx apkpure download com.whatsapp -o ~/Downloads
```

## Options

```
-p, --proxy <url>      HTTP proxy (auto-detected if omitted)
-o, --output <dir>     Download directory (default: ./apks)
-v, --version <ver>    Download specific version
-j, --json             Output raw JSON
-m, --mode <mode>      api|scraping|auto (default: auto)
```

## Proxy

Auto-detected in order: `HTTPS_PROXY` env var → Clash config → port scan (7897, 7890, 1080...). Works behind GFW without any manual config.

Override if needed:

```bash
npx apkpure search telegram --proxy http://127.011.1:7897
```

## Install globally

```bash
npm install -g apkpure
apkpure search telegram
```

## License

MIT

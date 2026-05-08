# APKPure TypeScript SDK

TypeScript SDK for APKPure — search, get info, and download Android APKs via reverse-engineered mobile API.

## Features

- **Search** — Find apps by name or keyword
- **App Detail** — Version, download URL, description, screenshots, developer info
- **Download** — Stream APK/XAPK files with SHA256 verification
- **Version History** — List all available versions of an app
- **Trending** — 24h trending games
- **Auto Proxy Detection** — Auto-discovers local Clash/V2Ray proxy for GFW environments

## Quick Start

```bash
# Build
npm install && npm run build

# Search (proxy auto-detected)
node dist/cli.js search "telegram"

# App detail
node dist/cli.js info org.telegram.messenger

# Download APK
node dist/cli.js download com.whatsapp -o ./apks

# Download specific version
node dist/cli.js download org.telegram.messenger -v 10.5.1 -o ./apks

# List versions
node dist/cli.js versions org.telegram.messenger

# Trending games
node dist/cli.js trending
```

## Programmatic Usage

```typescript
import { ApkPure } from "apkpure-sdk";

const sdk = new ApkPure(); // auto-detects proxy

const results = await sdk.search("whatsapp");
const detail = await sdk.getInfo("com.whatsapp");
const versions = await sdk.getVersions("org.telegram.messenger");
const downloaded = await sdk.download("com.whatsapp", {
  outputDir: "./apks",
  onProgress: (downloaded, total) => {
    console.log(`${((downloaded / total) * 100).toFixed(1)}%`);
  },
});
```

### Configuration

```typescript
const sdk = new ApkPure({
  mode: "auto",      // "api" | "scraping" | "auto"
  proxy: "http://127.0.0.1:7897",  // or omit for auto-detection
  timeout: 30000,
});
```

| Option | Default | Description |
|--------|---------|-------------|
| `mode` | `"auto"` | `"api"` uses mobile API (fast, JSON), `"scraping"` uses HTML parsing, `"auto"` tries API then falls back to scraping |
| `proxy` | auto | HTTP proxy URL. Auto-detected from Clash config, env vars (`HTTPS_PROXY`), or port scan if omitted |
| `timeout` | `30000` | Request timeout in ms |

## CLI Reference

```
Usage: apkpure <command> [options]

Commands:
  search <query>     Search for apps
  info <package>     Get app details
  download <package> Download APK
  versions <package> List available versions
  trending           List trending games (24h)

Options:
  -p, --proxy <url>     Override auto-detected proxy
  -m, --mode <mode>     API mode: api|scraping|auto (default: auto)
  -o, --output <dir>    Download directory (default: ./apks)
  -v, --version <ver>   Download specific version
```

## Architecture

```
src/
├── client/
│   ├── mobile-client.ts    # Mobile API client (tapi.pureapk.com/v3)
│   └── scraping-client.ts  # Web scraping client (cheerio)
├── core/
│   ├── apkpure.ts          # Unified SDK class
│   └── downloader.ts       # Streaming download + SHA256
├── utils/
│   ├── crypto.ts           # MD5 signing, SHA256
│   ├── headers.ts          # APKPure mobile auth headers
│   ├── http.ts             # HTTP client with proxy (undici)
│   └── proxy.ts            # Auto proxy detection
├── types/
│   ├── index.ts            # Public types
│   └── api.ts              # Mobile API response types
├── config.ts               # SDK constants & defaults
├── index.ts                # Public API exports
├── cli.ts                  # CLI entry point
└── skill-handler.ts        # AI agent JSON handler
```

## Development

```bash
npm install          # Install dependencies
npm run build        # Build with tsup
npm test             # Run tests (vitest)
npm run lint         # Type check
npm run cli -- search telegram  # Run CLI locally
```

## Tech Stack

- **TypeScript 5.6** — Language
- **undici 7** — HTTP client with proxy support
- **cheerio 1.0** — HTML parsing (fallback mode)
- **commander 12** — CLI framework
- **tsup 8** — Build tool (ESM + CJS)
- **vitest 2** — Testing

## License

MIT

# APKPure SDK Advanced Reference

## Table of Contents

1. [Architecture](#architecture)
2. [Anti-Scraping / Cloudflare Bypass](#anti-scraping--cloudflare-bypass)
3. [Proxy Auto-Detection](#proxy-auto-detection)
4. [Mobile API Protocol](#mobile-api-protocol)
5. [Web Scraping Selectors](#web-scraping-selectors)
6. [TypeScript API](#typescript-api)

## Architecture

```
ApkPure (SDK entry, default mode: android)
├── MobileClient     — tapi.pureapk.com/v3 Android app backend (primary)
│   ├── GET /search_query_new    — search apps
│   └── GET /get_app_detail      — app detail (MD5-signed headers)
├── ScrapingClient   — apkpure.com HTML parsing (web channel)
│   ├── search page              — CSS selectors
│   ├── detail page              — data-* attributes
│   └── versions page            — ul.ver-wrap > li
└── Downloader       — streaming download + SHA256 verify
```

Mode `android` (default): MobileClient only, throws on failure.
Mode `auto`: tries MobileClient first, falls back to ScrapingClient on error.
Mode `web`: ScrapingClient only.
Legacy aliases still accepted: `api` → `android`, `scraping` → `web`.

`versions` and `trending` have no mobile-API equivalent and always use the web
channel. iOS: not available — APKPure exposes no iOS store protocol.

## Anti-Scraping / Cloudflare Bypass

apkpure.com's **website** sits behind **Cloudflare**, which fingerprints the TLS
`ClientHello` (JA3/JA4). Node's built-in TLS stack (OpenSSL) cannot reproduce a
real Chrome/BoringSSL handshake — no GREASE values, a different extension set and
order, HTTP/1.1 instead of forced HTTP/2 — so Cloudflare flags it as a bot and
either resets the connection or serves a "Just a moment…" JS challenge. Adding
browser-like HTTP headers does **not** help; the block happens at the TLS layer,
before any header is read.

> The **mobile API** (`tapi.pureapk.com`, the default channel) is protected by
> Cloudflare **plus** a signed-header protocol (see
> [Mobile API Protocol](#mobile-api-protocol)). The SDK passes both: browser
> TLS fingerprint (`curl_cffi`, Chrome 136) pinned to genuine Cloudflare IPs
> (via Cloudflare DoH, bypassing polluted local DNS) plus full Android
> device/signature headers. That's why the default `android` mode already
> works with zero setup and no proxy. The bypass below matters for the web
> channel (`versions` / `trending` / `-m web`).

### How the bypass works

The web transport (`src/utils/web.ts` + `src/utils/impersonate.ts`) is layered:

1. **TLS impersonation (preferred).** If a real impersonation backend is present
   on the machine, requests are shelled out to it, producing a byte-perfect
   Chrome ClientHello that passes Cloudflare's JA3/JA4 check. Two backends are
   supported, in priority order:
   - **curl-impersonate** — a patched `curl` linked against BoringSSL. Detected
     by looking for `curl_chrome131`, `curl_chrome124`, …, `curl-impersonate` on
     `PATH`. No interpreter startup cost, so it's tried first.
   - **curl_cffi** — Python bindings around curl-impersonate
     (`pip install curl_cffi`). Detected by `python3 -c "import curl_cffi"`.
2. **Node fallback.** If no backend is found, requests use Node `fetch` with a
   full Chrome header set. This works when the target is **not** in strict-JA3
   mode — e.g. behind a residential/mobile proxy, or for hosts that don't
   fingerprint. If Cloudflare blocks it, the caller gets an **actionable error**
   telling them to install a backend (rather than silently returning junk HTML).

Both paths retry with backoff and run every response through
`isCloudflareBlock()`, which detects challenge pages (`cf-ray`, `just a moment`,
`challenge-platform`, `cf_chl_opt`, HTTP 403/429/503) so a challenge shell is
never mistaken for real content.

### Installing a backend

```bash
# Recommended — cross-platform, one pip install:
pip install curl_cffi

# Or the standalone binary (faster, no Python):
#   https://github.com/lwthiker/curl-impersonate
```

Nothing else is required — the CLI auto-detects whatever is installed.

### Configuration (env vars)

| Variable | Values | Default | Effect |
|----------|--------|---------|--------|
| `APKPURE_IMPERSONATE` | `auto` \| `node` \| `curl_cffi` \| `curl-impersonate` \| `<path-to-binary>` | `auto` | Force a backend. `node` disables impersonation; a path pins a specific binary. |
| `APKPURE_IMPERSONATE_TARGET` | `chrome`, `chrome131`, `chrome124`, `edge101`, … | `chrome` | Which browser profile to impersonate. |

Backend detection is cached for the process lifetime.

### `doctor` — verify the setup

```bash
apkpure doctor
```

Reports three things:
1. **TLS impersonation backend** — which one was detected (or a warning + install
   hint if none), and the impersonation target.
2. **Proxy** — the auto-detected proxy (or `--proxy` override), or direct.
3. **Live connectivity** — actually fetches `apkpure.com/search?q=whatsapp`
   through the full transport and reports `OK` / `FAILED` with the reason.

Run it first whenever search/download starts failing — it distinguishes a
missing-backend problem (fixable with `pip install curl_cffi`) from a
network/proxy problem.

## Proxy Auto-Detection

Detection order (first match wins):

1. **Environment variables**: `HTTPS_PROXY`, `https_proxy`, `HTTP_PROXY`, `http_proxy`, `ALL_PROXY`, `all_proxy`
2. **Clash config files**: reads `mixed-port` from:
   - `~/Library/Application Support/io.github.clash-verge-rev.clash-verge-rev/config.yaml`
   - `~/.config/clash-verge/`, `~/.config/clash/`, `~/.config/mihomo/`
3. **Port scan**: tries common proxy ports (7897, 7890, 1080, 1087, etc.) with TCP connect + HTTP validation

Result is cached for the process lifetime. Use `--proxy` to override.

## Mobile API Protocol

Base URL: `https://tapi.pureapk.com/v3` (same backend the APKPure Android app uses)

Authentication: custom headers `Ual-Access-*` containing device info, app info, and user auth key.

Transport requirements (both must hold, otherwise Cloudflare rejects the request):

1. **Browser TLS fingerprint** — requests go out via `curl_cffi` low-level `Curl`
   with `IMPERSONATE=chrome136` (`src/client/mobile-transport.ts`), not Node's
   native TLS stack.
2. **Genuine Cloudflare IP** — `tapi.pureapk.com` is resolved via Cloudflare DoH
   (`1.1.1.1/dns-query`, `src/utils/resolve.ts`) and pinned with curl `RESOLVE`,
   bypassing polluted local DNS. Override with `APKPURE_MOBILE_RESOLVE`
   (comma-separated IPs) if DoH is unreachable in your network.

### Signature (GET requests carry the signed body too)

```
body = JSON.stringify({ package_name: "com.whatsapp", hl: "en-US" })
timestamp = Date.now().toString()
nonce = random 8-digit string
signature = MD5(body + timestamp + SIGN_SECRET + nonce)
```

Headers for signed requests:
- `Ual-Access-Signature`: the MD5 signature
- `Ual-Access-Timestamp`: millisecond timestamp
- `Ual-Access-Nonce`: random nonce
- `Content-Type`: `application/json; charset=utf-8`

### Search endpoint

```
GET /search_query_new?key=telegram&hl=en-US&page=1&search_type=active_search
```

Response structure:
```json
{
  "data": {
    "data": [
      {
        "type": "search_result_common_app_bar",
        "data": [
          { "app_info": { "package_name": "...", "title": "...", "version_name": "..." } }
        ]
      }
    ]
  }
}
```

### Detail endpoint

```
GET /get_app_detail?package_name=com.whatsapp&hl=en-US
(signed Ual-Access-* headers, same signature scheme as above)
```

Response: `app_detail` object with title, version, description, `asset`
(download URL + sha1 + size + type), `native_code` (supported CPU ABIs, e.g.
`["arm64-v8a","armeabi-v7a","x86","x86_64"]`), screenshots.

Each version ships **one** file: a universal APK covering every ABI in
`native_code`, or an XAPK bundle containing the matching native libraries —
there is no per-architecture download to choose from (`asset.urls` carries the
same single link).

## Web Scraping Selectors

### Search page (`/search?q=...`)

| Data | Selector |
|------|----------|
| First result | `div.first` |
| Result list | `ul#search-res > li` |
| App name | `p.p1` |
| Developer | `p.p2` |
| Package name | `a.first-info[href]` → last path segment |
| Icon | `img` first `src` |
| Version | `a.is-download[data-dt-version]` |
| Version code | `a.is-download[data-dt-versioncode]` |
| File size | `a.is-download[data-dt-filesize]` |

### Detail page (`/package-name`)

| Data | Selector |
|------|----------|
| Title | `div.detail_banner div.title_link` |
| Rating | `div.detail_banner span.rating` |
| Update date | `div.detail_banner p.date` |
| Icon | `div.detail_banner div.icon img[src]` |
| Download button | `a.download_apk_news[href]` |
| Version code | `a.download_apk_news[data-dt-version_code]` |
| Description | `div.translate-content` |

### Versions page (`/package-name/versions`)

| Data | Selector |
|------|----------|
| Version items | `ul.ver-wrap > li` (skip last item — "show more") |
| Version name | `a.ver_download_link[data-dt-version]` |
| Version code | `a.ver_download_link[data-dt-versioncode]` |
| Download URL | `a.ver_download_link[href]` |

## TypeScript API

### All types

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

interface SearchResult {
  apps: AppInfo[];
  total?: number;
  page?: number;
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

interface TrendingApp {
  title: string;
  iconUrl: string;
  detailUrl: string;
}
```

### ApkPure class methods

```typescript
class ApkPure {
  constructor(config?: Partial<SdkConfig>);
  search(query: string, page?: number): Promise<SearchResult>;
  getInfo(packageName: string): Promise<AppDetail | null>;
  getVersions(packageName: string): Promise<AppVersion[]>;
  download(packageName: string, options: DownloadOptions): Promise<DownloadResult>;
  trending(): Promise<TrendingApp[]>;
}
```

## CLI Output Modes

All commands support two output modes:

- **Human-readable** (default): formatted text with labels
- **JSON** (`--json` flag): raw JSON for programmatic consumption

### Search output (default)

```
Telegram
  Package:  org.telegram.messenger
  Version:  10.5.2
  Developer: Telegram LLC
  Category:  Communication
  Rating:    4.8

Found 19 apps.
```

### Info output (default)

```
  WhatsApp Messenger
  Package:      com.whatsapp
  Version:      2.24.5.14
  Version Code: 2240514
  Developer:    WhatsApp LLC
  Category:     Communication
  Rating:       4.5
  Updated:      Jan 15, 2025
  Requires:     Android 5.0+
  Download:     APK available

  Meta-owned messaging app with end-to-end encryption...
```

### Versions output (default)

```
Versions for org.telegram.messenger:

  10.5.2 (latest)  [APK]  code=10520
  10.5.1           [APK]  code=10510
  10.4.3           [APK]  code=10430

Total: 15 versions.

Download a specific version:
  apkpure download org.telegram.messenger -v 10.5.2
```

### Download output (default)

```
Downloading: Telegram (org.telegram.messenger)
Version:     10.5.2 (latest)
Output:      /Users/user/apks

  Progress: 45.2/60.1 MB (75.2%)

Download complete!
  File:   /Users/user/apks/org.telegram.messenger-10.5.2.apk
  Size:   60.1 MB
  Type:   APK
  SHA256: a1b2c3d4e5f6...
```

# APKPure SDK Advanced Reference

## Table of Contents

1. [Architecture](#architecture)
2. [Proxy Auto-Detection](#proxy-auto-detection)
3. [Mobile API Protocol](#mobile-api-protocol)
4. [Web Scraping Selectors](#web-scraping-selectors)
5. [TypeScript API](#typescript-api)

## Architecture

```
ApkPure (SDK entry)
├── MobileClient     — tapi.pureapk.com/v3 REST API (primary)
│   ├── GET /search_query_new    — search apps
│   └── POST /get_app_detail     — app detail (MD5 signed)
├── ScrapingClient   — apkpure.com HTML parsing (fallback)
│   ├── search page              — CSS selectors
│   ├── detail page              — data-* attributes
│   └── versions page            — ul.ver-wrap > li
└── Downloader       — streaming download + SHA256 verify
```

Mode `auto`: tries MobileClient first, falls back to ScrapingClient on error.
Mode `api`: MobileClient only, throws on failure.
Mode `scraping`: ScrapingClient only.

## Proxy Auto-Detection

Detection order (first match wins):

1. **Environment variables**: `HTTPS_PROXY`, `https_proxy`, `HTTP_PROXY`, `http_proxy`, `ALL_PROXY`, `all_proxy`
2. **Clash config files**: reads `mixed-port` from:
   - `~/Library/Application Support/io.github.clash-verge-rev.clash-verge-rev/config.yaml`
   - `~/.config/clash-verge/`, `~/.config/clash/`, `~/.config/mihomo/`
3. **Port scan**: tries common proxy ports (7897, 7890, 1080, 1087, etc.) with TCP connect + HTTP validation

Result is cached for the process lifetime. Use `--proxy` to override.

## Mobile API Protocol

Base URL: `https://tapi.pureapk.com/v3`

Authentication: custom headers `Ual-Access-*` containing device info, app info, and user auth key.

### Signature (POST requests only)

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
POST /get_app_detail
Body: { "package_name": "com.whatsapp", "hl": "en-US" }
```

Response: `app_detail` object with title, version, description, asset download URL, screenshots.

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
  search(query: string): Promise<SearchResult>;
  getInfo(packageName: string): Promise<AppDetail | null>;
  getVersions(packageName: string): Promise<AppVersion[]>;
  download(packageName: string, options: DownloadOptions): Promise<DownloadResult>;
  trending(): Promise<TrendingApp[]>;
}
```

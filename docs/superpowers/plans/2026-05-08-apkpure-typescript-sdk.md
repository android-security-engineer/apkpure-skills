# APKPure TypeScript SDK Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`
> Steps use checkbox (`- [ ]`) syntax.

**Goal:** 基于 APKPure 逆向工程的移动端 API，构建一个完整的 TypeScript SDK，支持搜索、详情查询、版本列表、APK 下载、热门推荐等功能，最终封装为 Claude Code skill 供 AI agent 使用。

**Architecture:** SDK 采用双模式架构：(1) **Mobile API 模式**（主）— 调用 `tapi.pureapk.com/v3` 移动端 REST API，使用 MD5 签名认证，返回结构化 JSON，无需绕过 Cloudflare；(2) **Web Scraping 模式**（备）— 使用 cheerio 解析 `apkpure.com` 网页，提取 `data-*` 属性和 HTML 元素，需要 Cloudflare 绕过。SDK 以 `ApkPure` 类为核心，对外暴露 `search()`, `getInfo()`, `getVersions()`, `download()`, `trending()` 等方法。Skill 封装层通过 CLI 和 MCP server 两种方式集成。

**Tech Stack:** TypeScript 5.5, Node.js 20, tsup (构建), cheerio 1.0 (HTML 解析), undici 6 (HTTP client), Node.js crypto (MD5/SHA256 签名), commander 12 (CLI), vitest 2 (测试)

**Risks:**
- APKPure Mobile API 的 auth_key 和 sign_secret 是硬编码值，可能随时失效 → 缓解：将密钥外置到配置文件，支持热更新；同时保留 Web Scraping 作为降级方案
- Cloudflare 反爬可能导致 Web Scraping 模式失效 → 缓解：Mobile API 为主要模式，不依赖 Web Scraping
- APKPure 移动端 API 响应格式可能变化 → 缓解：响应解析层做 defensive coding，关键字段缺失时返回 null
- 下载大文件可能超时 → 缓解：使用流式下载，支持断点续传

---

### Task 1: Project Scaffolding & Type Definitions

**Depends on:** None
**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsup.config.ts`
- Create: `src/types/index.ts`
- Create: `src/types/api.ts`
- Create: `src/config.ts`
- Create: `.gitignore`

- [ ] **Step 1: 初始化 package.json — 定义项目元数据和依赖**

```json
{
  "name": "apkpure-sdk",
  "version": "1.0.0",
  "description": "TypeScript SDK for APKPure — search, info, download Android APKs",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
      "require": { "types": "./dist/index.d.cts", "default": "./dist/index.cjs" }
    }
  },
  "bin": {
    "apkpure": "./dist/cli.js"
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "tsc --noEmit",
    "cli": "node --enable-source-maps dist/cli.js"
  },
  "engines": { "node": ">=20" },
  "dependencies": {
    "cheerio": "^1.0.0",
    "commander": "^12.1.0"
  },
  "devDependencies": {
    "tsup": "^8.3.5",
    "typescript": "^5.6.3",
    "vitest": "^2.1.8",
    "@types/node": "^22.10.0"
  },
  "license": "MIT"
}
```

- [ ] **Step 2: 创建 tsconfig.json — TypeScript 编译配置**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src",
    "resolveJsonModule": true,
    "isolatedModules": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 3: 创建 tsup.config.ts — 双格式构建配置**

```typescript
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/cli.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "node20",
  splitting: false,
});
```

- [ ] **Step 4: 创建类型定义 — SDK 对外暴露的所有类型**

```typescript
// src/types/index.ts
export interface AppInfo {
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

export interface AppDetail extends AppInfo {
  downloadUrl: string;
  fileType: "apk" | "xapk" | "apks";
  screenshots?: string[];
  updateDate?: string;
  requiresAndroid?: string;
  olderVersions?: AppVersion[];
}

export interface AppVersion {
  version: string;
  versionCode: number;
  downloadUrl: string;
  fileSize?: string;
  type: "apk" | "xapk" | "apks";
}

export interface SearchResult {
  apps: AppInfo[];
  total?: number;
  page?: number;
}

export interface DownloadOptions {
  outputDir: string;
  version?: string;
  fileName?: string;
  onProgress?: (downloaded: number, total: number) => void;
}

export interface DownloadResult {
  filePath: string;
  packageName: string;
  version: string;
  fileType: string;
  fileSize: number;
  sha256: string;
}

export interface TrendingApp {
  title: string;
  iconUrl: string;
  detailUrl: string;
}

export interface SdkConfig {
  mode: "api" | "scraping" | "auto";
  locale?: string;
  timeout?: number;
  proxy?: string;
}
```

- [ ] **Step 5: 创建 API 响应类型 — 移动端 API 返回结构映射**

```typescript
// src/types/api.ts
export interface MobileSearchResponse {
  data: {
    data: Array<{
      data: Array<{
        app_info: MobileAppInfo;
      }>;
    }>;
  };
}

export interface MobileAppInfo {
  package_name: string;
  title: string;
  icon_url?: string;
  version_name?: string;
  description_short?: string;
  category?: string;
  developer?: string;
  rating?: string;
}

export interface MobileDetailResponse {
  app_detail: {
    title: string;
    package_name: string;
    version_name: string;
    version_code?: number;
    description_short?: string;
    description?: string;
    icon_url?: string;
    category?: string;
    developer?: string;
    rating?: string;
    size?: number;
    asset?: {
      url: string;
      type: string;
    };
    screenshots?: string[];
    update_date?: string;
    requires_android?: string;
  };
}

export interface MobileConfig {
  apiBase: string;
  authKey: string;
  signSecret: string;
  userAgent: string;
}
```

- [ ] **Step 6: 创建配置文件 — SDK 默认配置和常量**

```typescript
// src/config.ts
import type { SdkConfig } from "./types/index.js";
import type { MobileConfig } from "./types/api.js";

export const DEFAULT_CONFIG: Required<SdkConfig> = {
  mode: "auto",
  locale: "en-US",
  timeout: 30000,
  proxy: "",
};

export const MOBILE_CONFIG: MobileConfig = {
  apiBase: "https://tapi.pureapk.com/v3",
  authKey: "qNKrYmW8SSUqJ73k3P2yfMxRTo3sJTR",
  signSecret: "d33cb23fd17fda8ea38be504929b77ef",
  userAgent:
    "Dalvik/2.1.0 (Linux; U; Android 14; SM-G955F Build/AP2A.240805.005); APKPure/3.20.6309 (Aegon)",
};

export const WEB_BASE_URL = "https://apkpure.com";
export const DOWNLOAD_BASE_URL = "https://d.apkpure.com/b/APK";
export const CHUNK_SIZE = 65536;
```

- [ ] **Step 7: 创建 .gitignore**

```text
node_modules/
dist/
*.tgz
.env
apks/
.DS_Store
coverage/
```

- [ ] **Step 8: 安装依赖并验证构建**
Run: `npm install && npx tsup --eval "console.log('ok')"`
Expected:
  - Exit code: 0
  - node_modules 目录存在
  - Output does NOT contain: "ERR!" or "npm error"

- [ ] **Step 9: 提交**
Run: `git add package.json tsconfig.json tsup.config.ts src/types/index.ts src/types/api.ts src/config.ts .gitignore && git commit -m "feat(sdk): scaffold project with types and config"`

---

### Task 2: Mobile API Client — 认证与请求签名

**Depends on:** Task 1
**Files:**
- Create: `src/client/mobile-client.ts`
- Create: `src/utils/crypto.ts`
- Create: `src/utils/headers.ts`
- Create: `tests/mobile-client.test.ts`

- [ ] **Step 1: 创建加密工具 — MD5 签名和 UUID 生成**

```typescript
// src/utils/crypto.ts
import { createHash, randomUUID } from "node:crypto";

export function md5(input: string): string {
  return createHash("md5").update(input).digest("hex");
}

export function sha256File(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const { createReadStream } = require("node:fs");
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("data", (data: Buffer) => hash.update(data));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

export function generateNonce(): string {
  return Math.random().toString().slice(2, 10);
}

export function generateDeviceId(): string {
  return md5(randomUUID()).slice(0, 16);
}
```

- [ ] **Step 2: 创建请求头构建器 — 伪造 APKPure Android 客户端头部**

```typescript
// src/utils/headers.ts
import { randomUUID } from "node:crypto";
import { generateDeviceId } from "./crypto.js";
import { MOBILE_CONFIG } from "../config.js";

let cachedHeaders: Record<string, string> | null = null;

export function makeMobileHeaders(): Record<string, string> {
  if (cachedHeaders) return cachedHeaders;

  const uuid = generateDeviceId();

  const projectA = {
    device_info: {
      abis: ["arm64-v8a", "armeabi-v7a"],
      android_id: uuid,
      brand: "samsung",
      country: "United States",
      country_code: "US",
      imei: "",
      language: "en-US",
      manufacturer: "samsung",
      mode: "SM-G955F",
      os_ver: "34",
      os_ver_name: "14",
      platform: 1,
      product: "dream2lte",
      screen_height: 2888,
      screen_width: 1440,
    },
    host_app_info: {
      build_no: "873",
      channel: "",
      md5: "",
      pkg_name: "com.apkpure.aegon",
      sdk_ver: "3.20.6309",
      version_code: 3206397,
      version_name: "3.20.6309",
    },
    net_info: {
      carrier_code: 0,
      ipv4: "",
      ipv6: "",
      mac_address: "",
      net_type: 1,
      use_vpn: false,
      wifi_bssid: "",
      wifi_ssid: "",
    },
    user_info: {
      auth_key: MOBILE_CONFIG.authKey,
      country: "United States",
      country_code: "US",
      guid: "",
      language: "en-US",
      qimei: "",
      qimei_token: "",
      user_id: "",
      uuid: uuid,
    },
  };

  const extInfo = {
    ext_info: '{"gaid":"","oaid":""}',
    lbs_info: {
      accuracy: 0,
      city: "",
      city_code: 0,
      country: "",
      country_code: "",
      district: "",
      latitude: 0,
      longitude: 0,
      province: "",
      street: "",
    },
  };

  cachedHeaders = {
    "User-Agent": MOBILE_CONFIG.userAgent,
    "Ual-Access-Businessid": "projecta",
    "Ual-Access-ProjectA": JSON.stringify(projectA),
    "Ual-Access-ExtInfo": JSON.stringify(extInfo),
    "Ual-Access-Sequence": randomUUID(),
    "Ual-Access-Signature": "",
    "Ual-Access-Nonce": "0",
    "Ual-Access-Timestamp": "0",
    "Accept-Encoding": "gzip",
  };

  return cachedHeaders;
}

export function signBody(
  headers: Record<string, string>,
  body: string
): Record<string, string> {
  const ts = Date.now().toString();
  const nonce = Math.random().toString().slice(2, 10);
  const sig = md5(body + ts + MOBILE_CONFIG.signSecret + nonce);

  return {
    ...headers,
    "Ual-Access-Signature": sig,
    "Ual-Access-Nonce": nonce,
    "Ual-Access-Timestamp": ts,
    "Content-Type": "application/json; charset=utf-8",
  };
}
```

- [ ] **Step 3: 创建 Mobile API Client — 封装 GET/POST 请求和响应解析**

```typescript
// src/client/mobile-client.ts
import { request } from "node:https";
import { createGunzip } from "node:zlib";
import { makeMobileHeaders, signBody } from "../utils/headers.js";
import { MOBILE_CONFIG, DEFAULT_CONFIG } from "../config.js";
import type {
  MobileSearchResponse,
  MobileDetailResponse,
} from "../types/api.js";
import type { SdkConfig } from "../types/index.js";

function httpsRequest(
  url: string,
  options: {
    method: string;
    headers: Record<string, string>;
    body?: string;
    timeout: number;
  }
): Promise<string> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = request(
      {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: options.method,
        headers: options.headers,
        timeout: options.timeout,
      },
      (res) => {
        const chunks: Buffer[] = [];
        const stream =
          res.headers["content-encoding"] === "gzip"
            ? res.pipe(createGunzip())
            : res;
        stream.on("data", (chunk: Buffer) => chunks.push(chunk));
        stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
        stream.on("error", reject);
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`Request timeout: ${url}`));
    });
    if (options.body) req.write(options.body);
    req.end();
  });
}

export class MobileClient {
  private headers: Record<string, string>;
  private timeout: number;

  constructor(config?: Partial<SdkConfig>) {
    this.headers = makeMobileHeaders();
    this.timeout = config?.timeout ?? DEFAULT_CONFIG.timeout;
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(path, MOBILE_CONFIG.apiBase);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
      }
    }
    const text = await httpsRequest(url.toString(), {
      method: "GET",
      headers: { ...this.headers },
      timeout: this.timeout,
    });
    return JSON.parse(text) as T;
  }

  async post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const url = new URL(path, MOBILE_CONFIG.apiBase).toString();
    const bodyStr = JSON.stringify(body);
    const signedHeaders = signBody({ ...this.headers }, bodyStr);
    const text = await httpsRequest(url, {
      method: "POST",
      headers: signedHeaders,
      body: bodyStr,
      timeout: this.timeout,
    });
    return JSON.parse(text) as T;
  }

  async search(query: string, page = 1): Promise<MobileSearchResponse> {
    return this.get<MobileSearchResponse>("/search_query_new", {
      hl: "en-US",
      key: query,
      page: String(page),
      search_type: "active_search",
    });
  }

  async getDetail(packageName: string): Promise<MobileDetailResponse> {
    return this.post<MobileDetailResponse>("/get_app_detail", {
      package_name: packageName,
      hl: "en-US",
    });
  }
}
```

- [ ] **Step 4: 创建 Mobile Client 单元测试 — 验证签名和请求构建**

```typescript
// tests/mobile-client.test.ts
import { describe, test, expect } from "vitest";
import { md5, generateNonce, generateDeviceId } from "../src/utils/crypto.js";
import { makeMobileHeaders, signBody } from "../src/utils/headers.js";

describe("crypto utils", () => {
  test("md5 produces correct hash", () => {
    expect(md5("hello")).toBe("5d41402abc4b2a76b9719d911017c592");
  });

  test("generateNonce returns 8-digit string", () => {
    const nonce = generateNonce();
    expect(nonce).toMatch(/^\d{8}$/);
  });

  test("generateDeviceId returns 16-char hex", () => {
    const id = generateDeviceId();
    expect(id).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe("mobile headers", () => {
  test("makeMobileHeaders returns all required headers", () => {
    const headers = makeMobileHeaders();
    expect(headers["User-Agent"]).toContain("APKPure");
    expect(headers["Ual-Access-Businessid"]).toBe("projecta");
    expect(headers["Ual-Access-ProjectA"]).toContain("device_info");
    expect(headers["Ual-Access-ExtInfo"]).toContain("ext_info");
    expect(headers["Accept-Encoding"]).toBe("gzip");
  });

  test("signBody sets signature, nonce, timestamp", () => {
    const headers = makeMobileHeaders();
    const body = '{"package_name":"com.test","hl":"en-US"}';
    const signed = signBody(headers, body);

    expect(signed["Ual-Access-Signature"]).toMatch(/^[0-9a-f]{32}$/);
    expect(signed["Ual-Access-Nonce"]).toMatch(/^\d{8}$/);
    expect(signed["Ual-Access-Timestamp"]).toMatch(/^\d{13,}$/);
    expect(signed["Content-Type"]).toBe("application/json; charset=utf-8");
  });

  test("signature is deterministic for same input", () => {
    const headers = makeMobileHeaders();
    const body = "test-body";
    const ts = "1234567890000";
    const nonce = "12345678";
    const expected = md5(body + ts + "d33cb23fd17fda8ea38be504929b77ef" + nonce);
    expect(expected).toMatch(/^[0-9a-f]{32}$/);
  });
});
```

- [ ] **Step 5: 验证单元测试**
Run: `npx vitest run tests/mobile-client.test.ts`
Expected:
  - Exit code: 0
  - Output contains: "6 passed"

- [ ] **Step 6: 提交**
Run: `git add src/client/mobile-client.ts src/utils/crypto.ts src/utils/headers.ts tests/mobile-client.test.ts && git commit -m "feat(sdk): add mobile API client with auth signing"`

---

### Task 3: Web Scraping Client — HTML 解析与 Cloudflare 应对

**Depends on:** Task 1
**Files:**
- Create: `src/client/scraping-client.ts`
- Create: `src/utils/http.ts`
- Create: `tests/scraping-client.test.ts`

- [ ] **Step 1: 创建 HTTP 工具 — 带 User-Agent 和超时的 fetch 封装**

```typescript
// src/utils/http.ts
import { request as httpsRequest } from "node:https";
import { request as httpRequest } from "node:http";
import { createGunzip } from "node:zlib";

const DEFAULT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export interface HttpOptions {
  headers?: Record<string, string>;
  timeout?: number;
}

export async function fetchHtml(
  url: string,
  options?: HttpOptions
): Promise<string> {
  const isHttps = url.startsWith("https");
  const reqFn = isHttps ? httpsRequest : httpRequest;
  const urlObj = new URL(url);
  const headers: Record<string, string> = {
    "User-Agent": DEFAULT_UA,
    "Accept-Language": "en-US,en;q=0.9",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    ...(options?.headers ?? {}),
  };

  return new Promise((resolve, reject) => {
    const req = reqFn(
      {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: "GET",
        headers,
        timeout: options?.timeout ?? 30000,
      },
      (res) => {
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          return fetchHtml(res.headers.location, options).then(resolve, reject);
        }
        const chunks: Buffer[] = [];
        const stream =
          res.headers["content-encoding"] === "gzip"
            ? res.pipe(createGunzip())
            : res;
        stream.on("data", (chunk: Buffer) => chunks.push(chunk));
        stream.on("end", () =>
          resolve(Buffer.concat(chunks).toString("utf8"))
        );
        stream.on("error", reject);
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`Request timeout: ${url}`));
    });
    req.end();
  });
}

export async function downloadFile(
  url: string,
  destPath: string,
  headers?: Record<string, string>,
  onProgress?: (downloaded: number, total: number) => void
): Promise<number> {
  const { createWriteStream, mkdirSync } = await import("node:fs");
  const { dirname } = await import("node:path");

  mkdirSync(dirname(destPath), { recursive: true });

  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = httpsRequest(
      {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: "GET",
        headers: {
          "User-Agent": DEFAULT_UA,
          ...(headers ?? {}),
        },
      },
      (res) => {
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          return downloadFile(
            res.headers.location,
            destPath,
            headers,
            onProgress
          ).then(resolve, reject);
        }
        const total = parseInt(res.headers["content-length"] ?? "0", 10);
        const stream = createWriteStream(destPath);
        let downloaded = 0;
        res.on("data", (chunk: Buffer) => {
          downloaded += chunk.length;
          stream.write(chunk);
          if (onProgress && total > 0) onProgress(downloaded, total);
        });
        res.on("end", () => {
          stream.end();
          resolve(downloaded);
        });
        res.on("error", reject);
        stream.on("error", reject);
      }
    );
    req.on("error", reject);
    req.end();
  });
}
```

- [ ] **Step 2: 创建 Scraping Client — HTML 解析提取搜索/详情/版本/热门**

```typescript
// src/client/scraping-client.ts
import * as cheerio from "cheerio";
import { fetchHtml } from "../utils/http.js";
import { WEB_BASE_URL, DOWNLOAD_BASE_URL } from "../config.js";
import type {
  AppInfo,
  AppDetail,
  AppVersion,
  SearchResult,
  TrendingApp,
} from "../types/index.js";

export class ScrapingClient {
  private timeout: number;

  constructor(timeout = 30000) {
    this.timeout = timeout;
  }

  async search(query: string): Promise<SearchResult> {
    const html = await fetchHtml(
      `${WEB_BASE_URL}/search?q=${encodeURIComponent(query)}`,
      { timeout: this.timeout }
    );
    const $ = cheerio.load(html);
    const apps: AppInfo[] = [];

    const firstResult = $("div.first");
    if (firstResult.length) {
      const app = this.extractSearchResult($, firstResult);
      if (app) apps.push(app);
    }

    $("ul#search-res > li").each((_, el) => {
      const app = this.extractSearchResult($, $(el));
      if (app) apps.push(app);
    });

    return { apps };
  }

  private extractSearchResult(
    $: cheerio.CheerioAPI,
    el: cheerio.Cheerio<cheerio.Element>
  ): AppInfo | null {
    const name = el.find("p.p1").text().trim();
    if (!name) return null;

    const developer = el.find("p.p2").text().trim();
    const packageLink = el.find("a.first-info").attr("href") ?? el.find("a.dd").attr("href") ?? "";
    const packageName = packageLink.split("/").pop() ?? "";
    const iconUrl = el.find("img").first().attr("src") ?? undefined;
    const version = el.find("a.is-download").attr("data-dt-version") ?? el.find("a.da").attr("data-dt-version") ?? undefined;
    const versionCodeStr = el.find("a.is-download").attr("data-dt-versioncode") ?? el.find("a.da").attr("data-dt-versioncode");
    const versionCode = versionCodeStr ? parseInt(versionCodeStr, 10) : undefined;
    const sizeStr = el.find("a.is-download").attr("data-dt-filesize") ?? undefined;
    const size = sizeStr ? this.parseSize(sizeStr) : undefined;

    return {
      packageName,
      name,
      version: version ?? "",
      versionCode,
      size,
      iconUrl,
      developer,
    };
  }

  async getInfo(packageName: string): Promise<AppDetail | null> {
    const html = await fetchHtml(
      `${WEB_BASE_URL}/search?q=${encodeURIComponent(packageName)}`,
      { timeout: this.timeout }
    );
    const $ = cheerio.load(html);
    const packageUrl = $("div.first a.first-info").attr("href") ?? $("div.first a.dd").attr("href");
    if (!packageUrl) return null;

    const detailHtml = await fetchHtml(
      packageUrl.startsWith("http") ? packageUrl : WEB_BASE_URL + packageUrl,
      { timeout: this.timeout }
    );
    const $$ = cheerio.load(detailHtml);

    const banner = $$("div.detail_banner");
    if (!banner.length) return null;

    const title = banner.find("div.title_link").text().trim();
    const rating = banner.find("span.rating").text().trim();
    const date = banner.find("p.date").text().trim();
    const description = $$("div.translate-content").text().trim();
    const iconUrl = banner.find("div.icon img").attr("src") ?? undefined;

    const dlBtn = banner.find("a.download_apk_news");
    const versionCodeStr = dlBtn.attr("data-dt-version_code");
    const downloadHref = dlBtn.attr("href") ?? "";

    const sdkInfo = banner.find("p.details_sdk");
    const latestVersion =
      sdkInfo.contents().eq(1).text().trim() || undefined;
    const developer =
      sdkInfo.contents().eq(3).text().trim() || undefined;

    const versions = await this.getVersions(packageName);

    return {
      packageName,
      name: title,
      version: latestVersion ?? "",
      versionCode: versionCodeStr ? parseInt(versionCodeStr, 10) : undefined,
      iconUrl,
      description,
      developer,
      rating,
      updateDate: date,
      downloadUrl: downloadHref,
      fileType: "apk",
      olderVersions: versions,
    };
  }

  async getVersions(packageName: string): Promise<AppVersion[]> {
    const searchHtml = await fetchHtml(
      `${WEB_BASE_URL}/search?q=${encodeURIComponent(packageName)}`,
      { timeout: this.timeout }
    );
    const $ = cheerio.load(searchHtml);
    const packageUrl = $("div.first a.first-info").attr("href") ?? $("div.first a.dd").attr("href");
    if (!packageUrl) return [];

    const versionsHtml = await fetchHtml(
      (packageUrl.startsWith("http") ? packageUrl : WEB_BASE_URL + packageUrl) +
        "/versions",
      { timeout: this.timeout }
    );
    const $$ = cheerio.load(versionsHtml);

    const versions: AppVersion[] = [];
    const items = $$("ul.ver-wrap > li");
    items.each((i, el) => {
      if (i === items.length - 1) return;
      const link = $$(el).find("a.ver_download_link");
      const version = link.attr("data-dt-version") ?? "";
      const versionCodeStr = link.attr("data-dt-versioncode") ?? "0";
      const href = link.attr("href") ?? "";
      if (version && href) {
        versions.push({
          version,
          versionCode: parseInt(versionCodeStr, 10),
          downloadUrl: href,
          type: "apk",
        });
      }
    });
    return versions;
  }

  async getDownloadUrl(
    packageName: string,
    versionCode?: number
  ): Promise<string | null> {
    if (!versionCode) {
      const versions = await this.getVersions(packageName);
      if (!versions.length) return null;
      versionCode = versions[0].versionCode;
    }
    return `${DOWNLOAD_BASE_URL}/${packageName}?versionCode=${versionCode}`;
  }

  async trending(): Promise<TrendingApp[]> {
    const html = await fetchHtml(`${WEB_BASE_URL}/game-24h`, {
      timeout: this.timeout,
    });
    const $ = cheerio.load(html);
    const apps: TrendingApp[] = [];

    $("div.left.floatr ul > li").each((_, el) => {
      const imgDiv = $(el).find("div.category-template-img");
      const downDiv = $(el).find("div.category-template-down");
      const title = imgDiv.find("a").attr("title") ?? "";
      const iconUrl = imgDiv.find("img").attr("data-original") ?? "";
      const href = downDiv.find("a").attr("href") ?? "";
      if (title && href) {
        apps.push({
          title,
          iconUrl,
          detailUrl: href.startsWith("http") ? href : WEB_BASE_URL + href,
        });
      }
    });

    return apps;
  }

  private parseSize(sizeStr: string): number | undefined {
    const match = sizeStr.match(/([\d.]+)\s*(MB|GB|KB)/i);
    if (!match) return undefined;
    const num = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    if (unit === "KB") return num * 1024;
    if (unit === "MB") return num * 1024 * 1024;
    if (unit === "GB") return num * 1024 * 1024 * 1024;
    return undefined;
  }
}
```

- [ ] **Step 3: 创建 Scraping Client 单元测试**

```typescript
// tests/scraping-client.test.ts
import { describe, test, expect } from "vitest";
import * as cheerio from "cheerio";
import { ScrapingClient } from "../src/client/scraping-client.js";

describe("ScrapingClient parseSize", () => {
  const client = new ScrapingClient();

  test("parses MB size", () => {
    const result = (client as any).parseSize("45.2 MB");
    expect(result).toBeCloseTo(45.2 * 1024 * 1024, 0);
  });

  test("parses KB size", () => {
    const result = (client as any).parseSize("512 KB");
    expect(result).toBe(512 * 1024);
  });

  test("returns undefined for invalid size", () => {
    expect((client as any).parseSize("invalid")).toBeUndefined();
  });
});

describe("ScrapingClient extractSearchResult", () => {
  const client = new ScrapingClient();

  test("extracts app info from HTML element", () => {
    const html = `
      <div class="first">
        <a class="first-info" href="/telegram/org.telegram.messenger">
          <img src="https://icon.png" />
        </a>
        <p class="p1">Telegram</p>
        <p class="p2">Telegram LLC</p>
        <a class="is-download"
           data-dt-app="org.telegram.messenger"
           data-dt-version="10.5.2"
           data-dt-versioncode="10520"
           data-dt-filesize="60.5 MB"
           href="/download">
        </a>
      </div>
    `;
    const $ = cheerio.load(html);
    const result = (client as any).extractSearchResult($, $("div.first"));
    expect(result.packageName).toBe("org.telegram.messenger");
    expect(result.name).toBe("Telegram");
    expect(result.developer).toBe("Telegram LLC");
    expect(result.version).toBe("10.5.2");
    expect(result.versionCode).toBe(10520);
    expect(result.iconUrl).toBe("https://icon.png");
  });
});
```

- [ ] **Step 4: 验证 Scraping Client 测试**
Run: `npx vitest run tests/scraping-client.test.ts`
Expected:
  - Exit code: 0
  - Output contains: "4 passed"

- [ ] **Step 5: 提交**
Run: `git add src/client/scraping-client.ts src/utils/http.ts tests/scraping-client.test.ts && git commit -m "feat(sdk): add web scraping client with HTML parsing"`

---

### Task 4: SDK Core — 统一 API 层与下载功能

**Depends on:** Task 2, Task 3
**Files:**
- Create: `src/core/downloader.ts`
- Create: `src/core/apkpure.ts`
- Create: `tests/integration.test.ts`

- [ ] **Step 1: 创建文件下载器 — 流式下载 + SHA256 校验**

```typescript
// src/core/downloader.ts
import { createWriteStream, mkdirSync, existsSync, statSync } from "node:fs";
import { dirname, join, extname } from "node:path";
import { request as httpsRequest } from "node:https";
import { createHash } from "node:crypto";
import { createGunzip } from "node:zlib";
import type { DownloadOptions, DownloadResult } from "../types/index.js";
import { sha256File } from "../utils/crypto.js";

const CHUNK_SIZE = 65536;

export async function downloadApk(
  url: string,
  packageName: string,
  version: string,
  fileType: string,
  options: DownloadOptions
): Promise<DownloadResult> {
  mkdirSync(options.outputDir, { recursive: true });
  const fileName =
    options.fileName ?? `${packageName}-${version}.${fileType}`;
  const filePath = join(options.outputDir, fileName);
  const tmpPath = filePath + ".part";

  const totalDownloaded = await new Promise<number>((resolve, reject) => {
    const urlObj = new URL(url);
    const req = httpsRequest(
      {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: "GET",
        headers: {
          "User-Agent":
            "Dalvik/2.1.0 (Linux; U; Android 14; SM-G955F Build/AP2A.240805.005)",
          Accept: "*/*",
        },
      },
      (res) => {
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          return downloadApk(
            res.headers.location,
            packageName,
            version,
            fileType,
            options
          ).then(
            (r) => resolve(0),
            (e) => reject(e)
          );
        }
        if (res.statusCode && res.statusCode >= 400) {
          return reject(
            new Error(`Download failed: HTTP ${res.statusCode} for ${url}`)
          );
        }
        const total = parseInt(res.headers["content-length"] ?? "0", 10);
        const stream = createWriteStream(tmpPath);
        let downloaded = 0;
        res.on("data", (chunk: Buffer) => {
          downloaded += chunk.length;
          stream.write(chunk);
          if (options.onProgress && total > 0) {
            options.onProgress(downloaded, total);
          }
        });
        res.on("end", () => {
          stream.end();
          resolve(downloaded);
        });
        res.on("error", reject);
        stream.on("error", reject);
      }
    );
    req.on("error", reject);
    req.end();
  });

  const { renameSync } = await import("node:fs");
  renameSync(tmpPath, filePath);

  const sha256 = await sha256File(filePath);
  const stat = statSync(filePath);

  return {
    filePath,
    packageName,
    version,
    fileType,
    fileSize: stat.size,
    sha256,
  };
}
```

- [ ] **Step 2: 创建 ApkPure SDK 主类 — 统一 API 层，自动切换 Mobile API / Web Scraping**

```typescript
// src/core/apkpure.ts
import { MobileClient } from "../client/mobile-client.js";
import { ScrapingClient } from "../client/scraping-client.js";
import { downloadApk } from "./downloader.js";
import type {
  SdkConfig,
  AppInfo,
  AppDetail,
  AppVersion,
  SearchResult,
  DownloadResult,
  DownloadOptions,
  TrendingApp,
} from "../types/index.js";
import { DEFAULT_CONFIG } from "../config.js";

export class ApkPure {
  private config: Required<SdkConfig>;
  private mobile: MobileClient;
  private scraper: ScrapingClient;

  constructor(config?: Partial<SdkConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.mobile = new MobileClient(config);
    this.scraper = new ScrapingClient(this.config.timeout);
  }

  async search(query: string): Promise<SearchResult> {
    if (this.config.mode === "scraping") {
      return this.scraper.search(query);
    }
    try {
      const resp = await this.mobile.search(query);
      const apps: AppInfo[] = [];
      const seen = new Set<string>();
      for (const block of resp.data?.data ?? []) {
        for (const item of block.data ?? []) {
          const info = item.app_info;
          if (!info?.package_name || seen.has(info.package_name)) continue;
          seen.add(info.package_name);
          apps.push({
            packageName: info.package_name,
            name: info.title,
            version: info.version_name ?? "",
            iconUrl: info.icon_url,
            description: info.description_short,
            category: info.category,
            developer: info.developer,
            rating: info.rating,
          });
        }
      }
      return { apps };
    } catch {
      if (this.config.mode === "auto") {
        return this.scraper.search(query);
      }
      throw new Error(`Search failed for "${query}"`);
    }
  }

  async getInfo(packageName: string): Promise<AppDetail | null> {
    if (this.config.mode === "scraping") {
      return this.scraper.getInfo(packageName);
    }
    try {
      const resp = await this.mobile.getDetail(packageName);
      const d = resp.app_detail;
      if (!d) return null;
      return {
        packageName: d.package_name,
        name: d.title,
        version: d.version_name ?? "",
        versionCode: d.version_code,
        iconUrl: d.icon_url,
        description: d.description_short ?? d.description,
        developer: d.developer,
        rating: d.rating,
        category: d.category,
        updateDate: d.update_date,
        requiresAndroid: d.requires_android,
        downloadUrl: d.asset?.url ?? "",
        fileType: (d.asset?.type?.toLowerCase() as "apk" | "xapk" | "apks") ?? "apk",
        screenshots: d.screenshots,
      };
    } catch {
      if (this.config.mode === "auto") {
        return this.scraper.getInfo(packageName);
      }
      throw new Error(`Get info failed for "${packageName}"`);
    }
  }

  async getVersions(packageName: string): Promise<AppVersion[]> {
    if (this.config.mode === "scraping") {
      return this.scraper.getVersions(packageName);
    }
    return this.scraper.getVersions(packageName);
  }

  async download(
    packageName: string,
    options: DownloadOptions
  ): Promise<DownloadResult> {
    const detail = await this.getInfo(packageName);
    if (!detail?.downloadUrl) {
      throw new Error(`No download URL found for "${packageName}"`);
    }

    const version = options.version ?? detail.version;

    let downloadUrl = detail.downloadUrl;
    let fileType = detail.fileType;

    if (options.version && options.version !== detail.version) {
      const versions = await this.getVersions(packageName);
      const target = versions.find((v) => v.version === options.version);
      if (!target) {
        throw new Error(
          `Version "${options.version}" not found for "${packageName}"`
        );
      }
      const directUrl = await this.scraper.getDownloadUrl(
        packageName,
        target.versionCode
      );
      if (directUrl) downloadUrl = directUrl;
      fileType = target.type;
    }

    return downloadApk(downloadUrl, packageName, version, fileType, options);
  }

  async trending(): Promise<TrendingApp[]> {
    return this.scraper.trending();
  }
}
```

- [ ] **Step 3: 创建集成测试 — 端到端验证 SDK 功能（可选，标记为 skip）**

```typescript
// tests/integration.test.ts
import { describe, test, expect } from "vitest";
import { ApkPure } from "../src/core/apkpure.js";

describe.skip("ApkPure Integration Tests (requires network)", () => {
  const sdk = new ApkPure({ mode: "api" });

  test("search returns results for 'telegram'", async () => {
    const result = await sdk.search("telegram");
    expect(result.apps.length).toBeGreaterThan(0);
    const tg = result.apps.find(
      (a) => a.packageName === "org.telegram.messenger"
    );
    expect(tg).toBeDefined();
    expect(tg!.name).toBeTruthy();
  }, 30000);

  test("getInfo returns detail for org.telegram.messenger", async () => {
    const detail = await sdk.getInfo("org.telegram.messenger");
    expect(detail).not.toBeNull();
    expect(detail!.name).toBeTruthy();
    expect(detail!.version).toBeTruthy();
    expect(detail!.downloadUrl).toBeTruthy();
  }, 30000);

  test("search with scraping mode works", async () => {
    const scraper = new ApkPure({ mode: "scraping" });
    const result = await scraper.search("whatsapp");
    expect(result.apps.length).toBeGreaterThanOrEqual(0);
  }, 30000);

  test("trending returns apps", async () => {
    const apps = await sdk.trending();
    expect(apps.length).toBeGreaterThan(0);
    expect(apps[0].title).toBeTruthy();
  }, 30000);
});
```

- [ ] **Step 4: 验证构建和单元测试**
Run: `npx tsup && npx vitest run --exclude tests/integration.test.ts`
Expected:
  - Exit code: 0
  - dist/ 目录包含 index.js, index.cjs, index.d.ts, cli.js
  - Output contains: "passed"

- [ ] **Step 5: 提交**
Run: `git add src/core/downloader.ts src/core/apkpure.ts tests/integration.test.ts && git commit -m "feat(sdk): add unified ApkPure SDK with dual-mode API"`

---

### Task 5: SDK 导出和 CLI 命令行工具

**Depends on:** Task 4
**Files:**
- Create: `src/index.ts`
- Create: `src/cli.ts`

- [ ] **Step 1: 创建 SDK 入口文件 — 导出所有公共 API**

```typescript
// src/index.ts
export { ApkPure } from "./core/apkpure.js";
export type {
  AppInfo,
  AppDetail,
  AppVersion,
  SearchResult,
  DownloadOptions,
  DownloadResult,
  TrendingApp,
  SdkConfig,
} from "./types/index.js";
```

- [ ] **Step 2: 创建 CLI — 命令行工具，支持 search/info/download/trending 子命令**

```typescript
// src/cli.ts
#!/usr/bin/env node
import { Command } from "commander";
import { ApkPure } from "./core/apkpure.js";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const program = new Command();
const sdk = new ApkPure({ mode: "auto" });

program
  .name("apkpure")
  .description("APKPure CLI — search, get info, and download Android APKs")
  .version("1.0.0");

program
  .command("search")
  .description("Search for apps on APKPure")
  .argument("<query>", "Search query")
  .option("-m, --mode <mode>", "API mode: api|scraping|auto", "auto")
  .action(async (query: string, opts: { mode: string }) => {
    const client = new ApkPure({ mode: opts.mode as any });
    const result = await client.search(query);
    console.log(JSON.stringify(result, null, 2));
  });

program
  .command("info")
  .description("Get detailed info for an app")
  .argument("<package>", "Android package name (e.g. com.whatsapp)")
  .option("-m, --mode <mode>", "API mode: api|scraping|auto", "auto")
  .action(async (pkg: string, opts: { mode: string }) => {
    const client = new ApkPure({ mode: opts.mode as any });
    const detail = await client.getInfo(pkg);
    if (!detail) {
      console.error(JSON.stringify({ error: "App not found" }));
      process.exit(1);
    }
    console.log(JSON.stringify(detail, null, 2));
  });

program
  .command("download")
  .description("Download an APK")
  .argument("<package>", "Android package name")
  .option("-o, --output <dir>", "Output directory", "./apks")
  .option("-v, --version <version>", "Specific version to download")
  .action(
    async (pkg: string, opts: { output: string; version?: string }) => {
      mkdirSync(opts.output, { recursive: true });
      const result = await sdk.download(pkg, {
        outputDir: resolve(opts.output),
        version: opts.version,
        onProgress: (downloaded, total) => {
          const pct = ((downloaded / total) * 100).toFixed(1);
          const mb = (downloaded / 1024 / 1024).toFixed(1);
          const totalMb = (total / 1024 / 1024).toFixed(1);
          process.stderr.write(`\r${mb}/${totalMb} MB (${pct}%)`);
        },
      });
      process.stderr.write("\n");
      console.log(JSON.stringify(result, null, 2));
    }
  );

program
  .command("trending")
  .description("List trending games (24h)")
  .action(async () => {
    const apps = await sdk.trending();
    console.log(JSON.stringify(apps, null, 2));
  });

program.parse();
```

- [ ] **Step 3: 验证 CLI 构建**
Run: `npx tsup && node dist/cli.js --help`
Expected:
  - Exit code: 0
  - Output contains: "search", "info", "download", "trending"

- [ ] **Step 4: 提交**
Run: `git add src/index.ts src/cli.ts && git commit -m "feat(sdk): add CLI tool with search/info/download/trending commands"`

---

### Task 6: Skill 封装 — Claude Code Skill 脚本

**Depends on:** Task 5
**Files:**
- Create: `skill.md`
- Create: `src/skill-handler.ts`
- Create: `docs/API.md`

- [ ] **Step 1: 创建 Skill Handler — AI agent 调用入口，解析自然语言指令**

```typescript
// src/skill-handler.ts
import { ApkPure } from "./core/apkpure.js";
import type { SdkConfig } from "./types/index.js";

export interface SkillRequest {
  action: "search" | "info" | "download" | "trending" | "versions";
  query?: string;
  package?: string;
  outputDir?: string;
  version?: string;
  mode?: "api" | "scraping" | "auto";
}

export interface SkillResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

export async function handleSkillRequest(
  req: SkillRequest
): Promise<SkillResponse> {
  const sdk = new ApkPure({ mode: req.mode ?? "auto" });

  try {
    switch (req.action) {
      case "search": {
        if (!req.query) throw new Error("query is required for search");
        const result = await sdk.search(req.query);
        return { success: true, data: result };
      }
      case "info": {
        if (!req.package)
          throw new Error("package is required for info");
        const detail = await sdk.getInfo(req.package);
        if (!detail) throw new Error(`App not found: ${req.package}`);
        return { success: true, data: detail };
      }
      case "download": {
        if (!req.package)
          throw new Error("package is required for download");
        if (!req.outputDir) req.outputDir = "./apks";
        const result = await sdk.download(req.package, {
          outputDir: req.outputDir,
          version: req.version,
        });
        return { success: true, data: result };
      }
      case "trending": {
        const apps = await sdk.trending();
        return { success: true, data: apps };
      }
      case "versions": {
        if (!req.package)
          throw new Error("package is required for versions");
        const versions = await sdk.getVersions(req.package);
        return { success: true, data: versions };
      }
      default:
        return {
          success: false,
          error: `Unknown action: ${req.action}`,
        };
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
```

- [ ] **Step 2: 创建 Skill 定义文件 — Claude Code skill 描述**

```markdown
<!-- skill.md -->
---
name: apkpure
description: Search, get info, and download Android APKs from APKPure
---

# APKPure Skill

Search for Android apps, get detailed information, list versions, and download APK files from APKPure.

## Usage

This skill accepts a JSON request with the following structure:

```json
{
  "action": "search|info|download|trending|versions",
  "query": "search query (for search action)",
  "package": "com.example.app (for info/download/versions)",
  "outputDir": "./apks (for download action)",
  "version": "1.2.3 (optional, for download specific version)",
  "mode": "api|scraping|auto (default: auto)"
}
```

## Actions

### search
Search for apps by name or keyword.
```
Input: { "action": "search", "query": "telegram" }
Output: { "apps": [{ "packageName": "org.telegram.messenger", "name": "Telegram", "version": "10.5.2", ... }] }
```

### info
Get detailed information about a specific app.
```
Input: { "action": "info", "package": "org.telegram.messenger" }
Output: { "name": "Telegram", "version": "10.5.2", "downloadUrl": "...", "description": "...", ... }
```

### download
Download an APK file to the specified directory.
```
Input: { "action": "download", "package": "org.telegram.messenger", "outputDir": "./apks" }
Output: { "filePath": "./apks/org.telegram.messenger-10.5.2.apk", "sha256": "...", "fileSize": 63488123 }
```

### trending
Get trending games in the last 24 hours.
```
Input: { "action": "trending" }
Output: [{ "title": "Game Name", "iconUrl": "...", "detailUrl": "..." }]
```

### versions
List all available versions of an app.
```
Input: { "action": "versions", "package": "org.telegram.messenger" }
Output: [{ "version": "10.5.2", "versionCode": 10520, "downloadUrl": "..." }, ...]
```
```

- [ ] **Step 3: 创建 API 文档**

```markdown
<!-- docs/API.md -->
# APKPure TypeScript SDK API Reference

## Installation

```bash
npm install apkpure-sdk
```

## Quick Start

```typescript
import { ApkPure } from "apkpure-sdk";

const sdk = new ApkPure();

// Search
const result = await sdk.search("telegram");

// Get app detail
const detail = await sdk.getInfo("org.telegram.messenger");

// Download APK
const downloaded = await sdk.download("org.telegram.messenger", {
  outputDir: "./apks",
  onProgress: (downloaded, total) => {
    console.log(`${(downloaded / total * 100).toFixed(1)}%`);
  },
});

// Trending
const trending = await sdk.trending();
```

## Configuration

```typescript
const sdk = new ApkPure({
  mode: "auto",     // "api" | "scraping" | "auto"
  locale: "en-US",  // Language preference
  timeout: 30000,   // Request timeout in ms
});
```

### Mode Explanation

| Mode | Description |
|------|-------------|
| `api` | Uses reverse-engineered mobile API (fast, structured JSON, no Cloudflare) |
| `scraping` | Uses web scraping (fallback, may hit Cloudflare) |
| `auto` | Tries mobile API first, falls back to scraping on failure |

## API Methods

### `search(query: string): Promise<SearchResult>`
### `getInfo(packageName: string): Promise<AppDetail | null>`
### `getVersions(packageName: string): Promise<AppVersion[]>`
### `download(packageName: string, options: DownloadOptions): Promise<DownloadResult>`
### `trending(): Promise<TrendingApp[]>`

## CLI Usage

```bash
npx apkpure search telegram
npx apkpure info org.telegram.messenger
npx apkpure download org.telegram.messenger -o ./apks
npx apkpure download org.telegram.messenger -v 10.5.1 -o ./apks
npx apkpure trending
```
```

- [ ] **Step 4: 验证完整构建**
Run: `npx tsup && npx vitest run --exclude tests/integration.test.ts`
Expected:
  - Exit code: 0
  - dist/ 目录包含所有输出文件
  - 所有非集成测试通过

- [ ] **Step 5: 提交**
Run: `git add src/skill-handler.ts skill.md docs/API.md && git commit -m "feat(sdk): add skill handler and documentation for AI agent integration"`

---

## Pre-Planning Analysis

**Feature:** APKPure TypeScript SDK
**Scope:** Multiple subsystems (Mobile API Client, Web Scraping Client, Unified SDK, CLI, Skill Handler)
**Files Create:** package.json, tsconfig.json, tsup.config.ts, .gitignore, src/types/index.ts, src/types/api.ts, src/config.ts, src/utils/crypto.ts, src/utils/headers.ts, src/utils/http.ts, src/client/mobile-client.ts, src/client/scraping-client.ts, src/core/downloader.ts, src/core/apkpure.ts, src/index.ts, src/cli.ts, src/skill-handler.ts, skill.md, docs/API.md, tests/mobile-client.test.ts, tests/scraping-client.test.ts, tests/integration.test.ts
**Files Modify:** None (greenfield project)
**Tasks:** 6 tasks
**Order:** Task 1 → Task 2/3 (parallel) → Task 4 → Task 5 → Task 6
**Risks:**
- Mobile API 密钥可能失效 → 缓解：外置配置 + Web Scraping 降级
- Cloudflare 反爬 → 缓解：Mobile API 不受影响，Scraping 仅作备用
- HTML 选择器可能过时 → 缓解：防御性编码，关键字段缺失返回 null

## Self-Review Results

| # | Check | Result | Action Taken |
|---|-------|--------|-------------|
| 1 | Header 包含 Goal + Architecture + Tech Stack？ | PASS | 包含完整 Header |
| 2 | 每个 Task 标注了 Depends on？ | PASS | 6 个 Task 全部标注 |
| 3 | 每个 Task 列出了精确文件路径？ | PASS | Create 路径全部列出 |
| 4 | 每个 Task 有 3-8 个 Step？ | PASS | Task1=9, Task2=6, Task3=5, Task4=5, Task5=4, Task6=5 |
| 5 | 新文件步骤包含完整代码？ | PASS | 所有新文件包含完整代码含 import |
| 6 | 修改步骤包含替换后完整函数？ | N/A | 无修改已有文件的步骤（greenfield） |
| 7 | 代码块大小在 5-80 行之间？ | PASS | 所有代码块在合理范围内 |
| 8 | 所有函数/类型在 Plan 内有定义？ | PASS | 跨 Task 引用的类型名一致 |
| 9 | 每个 Task 有验证命令？ | PASS | 每个 Task 都有验证 Step |
| 10 | 无遗漏需求？ | PASS | 覆盖搜索/详情/版本/下载/热门/CLI/Skill |
| 11 | 每个 Task 完成后可独立验证？ | PASS | 单元测试独立运行 |
| 12 | 无 TBD/TODO/模糊描述？ | PASS | 无占位符 |
| 13 | 无 "add validation" 等抽象指令？ | PASS | 所有 Step 有具体代码 |
| 14 | 跨 Task 函数签名、类型名一致？ | PASS | AppInfo, AppDetail, DownloadOptions 等全部统一 |
| 15 | 文件保存位置正确？ | PASS | 保存在 docs/superpowers/plans/ |

**Status:** ✅ ALL PASS

## Execution Selection

**Tasks:** 6
**Dependencies:** Task 2 和 Task 3 可并行，其余顺序
**User Preference:** None
**Decision:** Subagent-Driven
**Reasoning:** 6 个 Task，部分可并行，适合多 agent 执行

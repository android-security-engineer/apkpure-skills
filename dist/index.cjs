"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  ApkPure: () => ApkPure,
  handleSkillRequest: () => handleSkillRequest,
  listWorkflows: () => listWorkflows,
  runWorkflow: () => runWorkflow
});
module.exports = __toCommonJS(index_exports);

// src/utils/http.ts
var import_undici = require("undici");
var import_undici2 = require("undici");
var import_node_fs = require("fs");
var import_node_path = require("path");
var DEFAULT_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
var globalProxy = "";
function getDispatcher(proxy) {
  const p = proxy || globalProxy;
  if (!p) return void 0;
  return new import_undici.ProxyAgent(p);
}
async function fetchText(url, options) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options?.timeout ?? 3e4
  );
  try {
    const resp = await (0, import_undici2.fetch)(url, {
      method: options?.method ?? "GET",
      headers: {
        "User-Agent": DEFAULT_UA,
        ...options?.headers ?? {}
      },
      body: options?.body,
      dispatcher: getDispatcher(options?.proxy),
      signal: controller.signal
    });
    return await resp.text();
  } finally {
    clearTimeout(timeout);
  }
}
async function fetchHtml(url, options) {
  const text = await fetchText(url, {
    headers: {
      "Accept-Language": "en-US,en;q=0.9",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      ...options?.headers ?? {}
    },
    timeout: options?.timeout,
    proxy: options?.proxy
  });
  return text;
}
async function downloadFile(url, destPath, options) {
  (0, import_node_fs.mkdirSync)((0, import_node_path.dirname)(destPath), { recursive: true });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3e5);
  try {
    const resp = await (0, import_undici2.fetch)(url, {
      headers: {
        "User-Agent": DEFAULT_UA,
        ...options?.headers ?? {}
      },
      dispatcher: getDispatcher(options?.proxy),
      signal: controller.signal,
      redirect: "follow"
    });
    if (!resp.ok) {
      throw new Error(`Download failed: HTTP ${resp.status} for ${url}`);
    }
    const total = parseInt(resp.headers.get("content-length") ?? "0", 10);
    const stream = (0, import_node_fs.createWriteStream)(destPath);
    let downloaded = 0;
    if (resp.body) {
      for await (const chunk of resp.body) {
        stream.write(chunk);
        downloaded += chunk.length;
        if (options?.onProgress && total > 0) {
          options.onProgress(downloaded, total);
        }
      }
    }
    stream.end();
    return downloaded;
  } finally {
    clearTimeout(timeout);
  }
}

// src/utils/headers.ts
var import_node_crypto2 = require("crypto");

// src/utils/crypto.ts
var import_node_crypto = require("crypto");
var import_node_fs2 = require("fs");
function md5(input) {
  return (0, import_node_crypto.createHash)("md5").update(input).digest("hex");
}
function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = (0, import_node_crypto.createHash)("sha256");
    const stream = (0, import_node_fs2.createReadStream)(filePath);
    stream.on("data", (data) => hash.update(data));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}
function generateDeviceId() {
  return md5((0, import_node_crypto.randomUUID)()).slice(0, 16);
}

// src/config.ts
var import_node_os = require("os");
var import_node_path2 = require("path");
var DEFAULT_DOWNLOAD_DIR = (0, import_node_path2.join)((0, import_node_os.homedir)(), ".apkpure", "downloads");
var DEFAULT_CONFIG = {
  mode: "auto",
  locale: "en-US",
  timeout: 3e4,
  proxy: ""
};
var MOBILE_CONFIG = {
  apiBase: "https://tapi.pureapk.com/v3",
  authKey: "qNKrYmW8SSUqJ73k3P2yfMxRTo3sJTR",
  signSecret: "d33cb23fd17fda8ea38be504929b77ef",
  userAgent: "Dalvik/2.1.0 (Linux; U; Android 14; SM-G955F Build/AP2A.240805.005); APKPure/3.20.6309 (Aegon)"
};
var WEB_BASE_URL = "https://apkpure.com";
var DOWNLOAD_BASE_URL = "https://d.apkpure.com/b/APK";

// src/utils/headers.ts
var cachedHeaders = null;
function makeMobileHeaders() {
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
      screen_width: 1440
    },
    host_app_info: {
      build_no: "873",
      channel: "",
      md5: "",
      pkg_name: "com.apkpure.aegon",
      sdk_ver: "3.20.6309",
      version_code: 3206397,
      version_name: "3.20.6309"
    },
    net_info: {
      carrier_code: 0,
      ipv4: "",
      ipv6: "",
      mac_address: "",
      net_type: 1,
      use_vpn: false,
      wifi_bssid: "",
      wifi_ssid: ""
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
      uuid
    }
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
      street: ""
    }
  };
  cachedHeaders = {
    "User-Agent": MOBILE_CONFIG.userAgent,
    "Ual-Access-Businessid": "projecta",
    "Ual-Access-ProjectA": JSON.stringify(projectA),
    "Ual-Access-ExtInfo": JSON.stringify(extInfo),
    "Ual-Access-Sequence": (0, import_node_crypto2.randomUUID)(),
    "Ual-Access-Signature": "",
    "Ual-Access-Nonce": "0",
    "Ual-Access-Timestamp": "0",
    "Accept-Encoding": "gzip"
  };
  return cachedHeaders;
}
function signBody(headers, body) {
  const ts = Date.now().toString();
  const nonce = Math.random().toString().slice(2, 10);
  const sig = md5(body + ts + MOBILE_CONFIG.signSecret + nonce);
  return {
    ...headers,
    "Ual-Access-Signature": sig,
    "Ual-Access-Nonce": nonce,
    "Ual-Access-Timestamp": ts,
    "Content-Type": "application/json; charset=utf-8"
  };
}

// src/client/mobile-client.ts
var MobileClient = class {
  headers;
  timeout;
  proxy;
  constructor(config) {
    this.headers = makeMobileHeaders();
    this.timeout = config?.timeout ?? DEFAULT_CONFIG.timeout;
    this.proxy = config?.proxy ?? DEFAULT_CONFIG.proxy;
  }
  async get(path, params) {
    const url = `${MOBILE_CONFIG.apiBase}/${path.replace(/^\//, "")}`;
    const qs = params ? "?" + Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&") : "";
    const text = await fetchText(url + qs, {
      method: "GET",
      headers: { ...this.headers },
      timeout: this.timeout,
      proxy: this.proxy
    });
    return JSON.parse(text);
  }
  async post(path, body) {
    const url = `${MOBILE_CONFIG.apiBase}/${path.replace(/^\//, "")}`;
    const bodyStr = JSON.stringify(body);
    const signedHeaders = signBody({ ...this.headers }, bodyStr);
    const text = await fetchText(url, {
      method: "POST",
      headers: signedHeaders,
      body: bodyStr,
      timeout: this.timeout,
      proxy: this.proxy
    });
    return JSON.parse(text);
  }
  async search(query, page = 1) {
    return this.get("/search_query_new", {
      hl: "en-US",
      key: query,
      page: String(page),
      search_type: "active_search"
    });
  }
  async getDetail(packageName) {
    return this.post("/get_app_detail", {
      package_name: packageName,
      hl: "en-US"
    });
  }
};

// src/client/scraping-client.ts
var cheerio = __toESM(require("cheerio"), 1);
var ScrapingClient = class {
  timeout;
  proxy;
  constructor(timeout = 3e4, proxy = "") {
    this.timeout = timeout;
    this.proxy = proxy;
  }
  async search(query) {
    const html = await fetchHtml(
      `${WEB_BASE_URL}/search?q=${encodeURIComponent(query)}`,
      { timeout: this.timeout, proxy: this.proxy }
    );
    const $ = cheerio.load(html);
    const apps = [];
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
  extractSearchResult($, el) {
    const name = el.find("p.p1").text().trim();
    if (!name) return null;
    const developer = el.find("p.p2").text().trim();
    const packageLink = el.find("a.first-info").attr("href") ?? el.find("a.dd").attr("href") ?? "";
    const packageName = packageLink.split("/").pop() ?? "";
    const iconUrl = el.find("img").first().attr("src") ?? void 0;
    const version = el.find("a.is-download").attr("data-dt-version") ?? el.find("a.da").attr("data-dt-version") ?? void 0;
    const versionCodeStr = el.find("a.is-download").attr("data-dt-versioncode") ?? el.find("a.da").attr("data-dt-versioncode");
    const versionCode = versionCodeStr ? parseInt(versionCodeStr, 10) : void 0;
    const sizeStr = el.find("a.is-download").attr("data-dt-filesize") ?? void 0;
    const size = sizeStr ? this.parseSize(sizeStr) : void 0;
    return {
      packageName,
      name,
      version: version ?? "",
      versionCode,
      size,
      iconUrl,
      developer
    };
  }
  async getInfo(packageName) {
    const html = await fetchHtml(
      `${WEB_BASE_URL}/${packageName}`,
      { timeout: this.timeout, proxy: this.proxy }
    );
    const $ = cheerio.load(html);
    const banner = $("div.detail_banner");
    if (!banner.length) return null;
    const title = banner.find("div.title_link").text().trim();
    const rating = banner.find("span.rating").text().trim();
    const date = banner.find("p.date").text().trim();
    const description = $("div.translate-content").text().trim();
    const iconUrl = banner.find("div.icon img").attr("src") ?? void 0;
    const dlBtn = banner.find("a.download_apk_news");
    const versionCodeStr = dlBtn.attr("data-dt-version_code");
    const downloadHref = dlBtn.attr("href") ?? "";
    const fileTypeStr = dlBtn.attr("data-dt-filetype") ?? "apk";
    const fileType = ["apk", "xapk", "apks"].includes(fileTypeStr.toLowerCase()) ? fileTypeStr.toLowerCase() : "apk";
    const sdkInfo = banner.find("p.details_sdk");
    const latestVersion = sdkInfo.contents().eq(1).text().trim() || void 0;
    const developer = sdkInfo.contents().eq(3).text().trim() || void 0;
    const versions = await this.getVersions(packageName);
    return {
      packageName,
      name: title,
      version: latestVersion ?? "",
      versionCode: versionCodeStr ? parseInt(versionCodeStr, 10) : void 0,
      iconUrl,
      description,
      developer,
      rating,
      updateDate: date,
      downloadUrl: downloadHref,
      fileType,
      olderVersions: versions
    };
  }
  async getVersions(packageName) {
    const html = await fetchHtml(
      `${WEB_BASE_URL}/${packageName}/versions`,
      { timeout: this.timeout, proxy: this.proxy }
    );
    const $$ = cheerio.load(html);
    const versions = [];
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
          type: "apk"
        });
      }
    });
    return versions;
  }
  async getDownloadUrl(packageName, versionCode) {
    if (!versionCode) {
      const versions = await this.getVersions(packageName);
      if (!versions.length) return null;
      versionCode = versions[0].versionCode;
    }
    return `${DOWNLOAD_BASE_URL}/${packageName}?versionCode=${versionCode}`;
  }
  async trending() {
    const html = await fetchHtml(`${WEB_BASE_URL}/game-24h`, {
      timeout: this.timeout,
      proxy: this.proxy
    });
    const $ = cheerio.load(html);
    const apps = [];
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
          detailUrl: href.startsWith("http") ? href : WEB_BASE_URL + href
        });
      }
    });
    return apps;
  }
  parseSize(sizeStr) {
    const match = sizeStr.match(/([\d.]+)\s*(MB|GB|KB)/i);
    if (!match) return void 0;
    const num = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    if (unit === "KB") return num * 1024;
    if (unit === "MB") return num * 1024 * 1024;
    if (unit === "GB") return num * 1024 * 1024 * 1024;
    return void 0;
  }
};

// src/core/downloader.ts
var import_node_fs3 = require("fs");
var import_node_path3 = require("path");
async function downloadApk(url, packageName, version, fileType, options, proxy = "") {
  (0, import_node_fs3.mkdirSync)(options.outputDir, { recursive: true });
  const fileName = options.fileName ?? `${packageName}-${version}.${fileType}`;
  const filePath = (0, import_node_path3.join)(options.outputDir, fileName);
  const tmpPath = filePath + ".part";
  await downloadFile(url, tmpPath, {
    headers: {
      "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 14; SM-G955F Build/AP2A.240805.005)",
      Accept: "*/*"
    },
    proxy,
    onProgress: options.onProgress
  });
  (0, import_node_fs3.renameSync)(tmpPath, filePath);
  const sha256 = await sha256File(filePath);
  const stat = (0, import_node_fs3.statSync)(filePath);
  return {
    filePath,
    packageName,
    version,
    fileType,
    fileSize: stat.size,
    sha256
  };
}

// src/utils/proxy.ts
var import_node_fs4 = require("fs");
var import_node_os2 = require("os");
var import_node_path4 = require("path");
var import_node_net = require("net");
var PROBE_HOST = "tapi.pureapk.com";
var PROBE_TIMEOUT = 3e3;
var CLASH_CONFIG_PATHS = [
  (0, import_node_path4.join)(
    (0, import_node_os2.homedir)(),
    "Library/Application Support/io.github.clash-verge-rev.clash-verge-rev"
  ),
  (0, import_node_path4.join)((0, import_node_os2.homedir)(), ".config/clash-verge"),
  (0, import_node_path4.join)((0, import_node_os2.homedir)(), ".config/clash"),
  (0, import_node_path4.join)((0, import_node_os2.homedir)(), ".config/mihomo")
];
var COMMON_PROXY_PORTS = [
  { port: 7897, name: "Clash Verge Rev mixed-port" },
  { port: 7890, name: "Clash default mixed-port" },
  { port: 7891, name: "Clash HTTP port" },
  { port: 1080, name: "SOCKS5 common port" },
  { port: 1087, name: "ClashX HTTP port" },
  { port: 1086, name: "ClashX SOCKS5 port" },
  { port: 2080, name: "V2RayN HTTP port" },
  { port: 10808, name: "V2RayN SOCKS port" },
  { port: 10809, name: "V2RayN HTTP port" },
  { port: 1081, name: "Quantumult port" },
  { port: 8888, name: "Surge HTTP port" },
  { port: 9090, name: "Clash API port (unlikely proxy)" }
];
var cachedProxy = void 0;
function extractPortFromClashConfig(configDir) {
  const configFiles = [
    "config.yaml",
    "clash-verge.yaml",
    "verge.yaml"
  ];
  for (const file of configFiles) {
    const filePath = (0, import_node_path4.join)(configDir, file);
    if (!(0, import_node_fs4.existsSync)(filePath)) continue;
    try {
      const content = (0, import_node_fs4.readFileSync)(filePath, "utf-8");
      const mixedMatch = content.match(/mixed-port:\s*(\d+)/);
      if (mixedMatch) return parseInt(mixedMatch[1], 10);
      const portMatch = content.match(/(?:^|\n)port:\s*(\d+)/);
      if (portMatch) return parseInt(portMatch[1], 10);
    } catch {
    }
  }
  return null;
}
function checkPortOpen(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const socket = (0, import_node_net.createConnection)({ host, port, timeout: PROBE_TIMEOUT });
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
  });
}
async function testProxyWorks(proxyUrl) {
  try {
    const { fetch: fetch2, ProxyAgent: ProxyAgent2 } = await import("undici");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT);
    const resp = await fetch2(`https://${PROBE_HOST}`, {
      method: "HEAD",
      dispatcher: new ProxyAgent2(proxyUrl),
      signal: controller.signal
    });
    clearTimeout(timeout);
    return resp.status > 0;
  } catch {
    return false;
  }
}
async function detectProxy() {
  if (cachedProxy !== void 0) return cachedProxy;
  const envProxy = process.env.HTTPS_PROXY ?? process.env.https_proxy ?? process.env.HTTP_PROXY ?? process.env.http_proxy ?? process.env.ALL_PROXY ?? process.env.all_proxy;
  if (envProxy) {
    cachedProxy = { url: envProxy, source: "environment variable" };
    return cachedProxy;
  }
  for (const configDir of CLASH_CONFIG_PATHS) {
    if (!(0, import_node_fs4.existsSync)(configDir)) continue;
    const port = extractPortFromClashConfig(configDir);
    if (!port) continue;
    const isOpen = await checkPortOpen(port);
    if (!isOpen) continue;
    const proxyUrl = `http://127.0.0.1:${port}`;
    const works = await testProxyWorks(proxyUrl);
    if (works) {
      cachedProxy = { url: proxyUrl, source: `Clash config (port ${port})` };
      return cachedProxy;
    }
  }
  for (const { port, name } of COMMON_PROXY_PORTS) {
    const isOpen = await checkPortOpen(port);
    if (!isOpen) continue;
    const proxyUrl = `http://127.0.0.1:${port}`;
    const works = await testProxyWorks(proxyUrl);
    if (works) {
      cachedProxy = { url: proxyUrl, source: name };
      return cachedProxy;
    }
  }
  cachedProxy = null;
  return null;
}

// src/core/apkpure.ts
var ApkPure = class {
  config;
  mobile;
  scraper;
  _initPromise;
  constructor(config) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this._initPromise = this._init(config);
    this.mobile = new MobileClient({ ...config, proxy: this.config.proxy });
    this.scraper = new ScrapingClient(this.config.timeout, this.config.proxy);
  }
  async _init(config) {
    if (!this.config.proxy) {
      const detected = await detectProxy();
      if (detected) {
        this.config.proxy = detected.url;
        this.mobile = new MobileClient({ ...config, proxy: detected.url });
        this.scraper = new ScrapingClient(this.config.timeout, detected.url);
      }
    }
  }
  async ensureReady() {
    await this._initPromise;
  }
  async search(query, page = 1) {
    await this.ensureReady();
    if (this.config.mode === "scraping") {
      return this.scraper.search(query);
    }
    try {
      const resp = await this.mobile.search(query, page);
      const apps = [];
      const seen = /* @__PURE__ */ new Set();
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
            rating: info.rating
          });
        }
      }
      return { apps, page };
    } catch {
      if (this.config.mode === "auto") {
        return this.scraper.search(query);
      }
      throw new Error(`Search failed for "${query}"`);
    }
  }
  async getInfo(packageName) {
    await this.ensureReady();
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
        fileType: d.asset?.type?.toLowerCase() ?? "apk",
        screenshots: d.screenshots
      };
    } catch {
      if (this.config.mode === "auto") {
        return this.scraper.getInfo(packageName);
      }
      throw new Error(`Get info failed for "${packageName}"`);
    }
  }
  async getVersions(packageName) {
    await this.ensureReady();
    return this.scraper.getVersions(packageName);
  }
  async download(packageName, options) {
    await this.ensureReady();
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
    return downloadApk(downloadUrl, packageName, version, fileType, options, this.config.proxy);
  }
  async trending() {
    await this.ensureReady();
    return this.scraper.trending();
  }
};

// src/workflows.ts
var BUILT_IN_WORKFLOWS = {
  // ---- Search-based workflows ----
  "search-and-download": {
    name: "search-and-download",
    description: "Search for an app by name, pick the best match, and download its APK/XAPK",
    steps: [
      { action: "search", input: { query: "{{query}}" }, outputKey: "searchResult" },
      { action: "download", input: { package: "{{searchResult.packageName}}" }, outputKey: "downloadResult" }
    ]
  },
  "download-by-name": {
    name: "download-by-name",
    description: "Download an app by its human-readable name (e.g. 'WeChat', 'Telegram') to the default directory",
    steps: [
      { action: "search", input: { query: "{{query}}" }, outputKey: "searchResult" },
      { action: "download", input: { package: "{{searchResult.packageName}}" }, outputKey: "downloadResult" }
    ]
  },
  "search-and-info": {
    name: "search-and-info",
    description: "Search for an app by name and get its detailed info in one step",
    steps: [
      { action: "search", input: { query: "{{query}}" }, outputKey: "searchResult" },
      { action: "info", input: { package: "{{searchResult.packageName}}" }, outputKey: "appInfo" }
    ]
  },
  "search-and-report": {
    name: "search-and-report",
    description: "Search for an app, then get full report (info + all versions) without needing the package name",
    steps: [
      { action: "search", input: { query: "{{query}}" }, outputKey: "searchResult" },
      { action: "info", input: { package: "{{searchResult.packageName}}" }, outputKey: "appInfo" },
      { action: "versions", input: { package: "{{searchResult.packageName}}" }, outputKey: "versions" }
    ]
  },
  // ---- Package-based workflows ----
  "app-report": {
    name: "app-report",
    description: "Get a full report for an app: info + all available versions",
    steps: [
      { action: "info", input: { package: "{{package}}" }, outputKey: "appInfo" },
      { action: "versions", input: { package: "{{package}}" }, outputKey: "versions" }
    ]
  },
  "download-latest": {
    name: "download-latest",
    description: "Download the latest version of an app by package name, with app info included in the result",
    steps: [
      { action: "info", input: { package: "{{package}}" }, outputKey: "appInfo" },
      { action: "download", input: { package: "{{package}}" }, outputKey: "downloadResult" }
    ]
  },
  "download-version": {
    name: "download-version",
    description: "Download a specific version of an app by package name and version string",
    steps: [
      { action: "info", input: { package: "{{package}}" }, outputKey: "appInfo" },
      { action: "download", input: { package: "{{package}}", version: "{{version}}" }, outputKey: "downloadResult" }
    ]
  },
  "verify-and-download": {
    name: "verify-and-download",
    description: "Verify an app exists and get its info before downloading \u2014 ensures the package name is valid",
    steps: [
      { action: "info", input: { package: "{{package}}" }, outputKey: "appInfo" },
      { action: "download", input: { package: "{{package}}" }, outputKey: "downloadResult" }
    ]
  },
  "info-and-versions": {
    name: "info-and-versions",
    description: "Get app info and all available versions (alias for app-report)",
    steps: [
      { action: "info", input: { package: "{{package}}" }, outputKey: "appInfo" },
      { action: "versions", input: { package: "{{package}}" }, outputKey: "versions" }
    ]
  },
  // ---- Discovery workflows ----
  "trending-and-info": {
    name: "trending-and-info",
    description: "List trending apps (first page of trending results)",
    steps: [
      { action: "trending", input: {}, outputKey: "trendingResult" }
    ]
  },
  // ---- Batch / Multi-app workflows ----
  "batch-download": {
    name: "batch-download",
    description: "Download multiple apps by package names (comma-separated). Get info for each, then download all.",
    steps: [
      { action: "batch-info", input: { packages: "{{packages}}" }, outputKey: "batchInfo" },
      { action: "batch-download", input: { packages: "{{packages}}" }, outputKey: "batchResults" }
    ]
  },
  // ---- Intelligence / Analysis workflows ----
  "app-intelligence": {
    name: "app-intelligence",
    description: "Deep intelligence report: full info + all versions + file type analysis \u2014 everything a reverse engineer needs",
    steps: [
      { action: "info", input: { package: "{{package}}" }, outputKey: "appInfo" },
      { action: "versions", input: { package: "{{package}}" }, outputKey: "versions" }
    ]
  },
  "search-intelligence": {
    name: "search-intelligence",
    description: "Search by name and get a deep intelligence report \u2014 no package name needed",
    steps: [
      { action: "search", input: { query: "{{query}}" }, outputKey: "searchResult" },
      { action: "info", input: { package: "{{searchResult.packageName}}" }, outputKey: "appInfo" },
      { action: "versions", input: { package: "{{searchResult.packageName}}" }, outputKey: "versions" }
    ]
  },
  // ---- Version analysis workflows ----
  "version-audit": {
    name: "version-audit",
    description: "Audit all versions of an app \u2014 list versions with version codes, file types, and sizes for diff analysis",
    steps: [
      { action: "info", input: { package: "{{package}}" }, outputKey: "appInfo" },
      { action: "versions", input: { package: "{{package}}" }, outputKey: "versions" }
    ]
  },
  "download-oldest": {
    name: "download-oldest",
    description: "Download the oldest available version of an app \u2014 useful for finding vulnerabilities in early releases",
    steps: [
      { action: "info", input: { package: "{{package}}" }, outputKey: "appInfo" },
      { action: "versions", input: { package: "{{package}}" }, outputKey: "versions" },
      { action: "download", input: { package: "{{package}}", version: "{{oldestVersion}}" }, outputKey: "downloadResult" }
    ]
  },
  // ---- Quick lookup workflows ----
  "quick-lookup": {
    name: "quick-lookup",
    description: "Quick lookup: search by name and return key metadata (name, package, version, developer, category)",
    steps: [
      { action: "search", input: { query: "{{query}}" }, outputKey: "searchResult" },
      { action: "info", input: { package: "{{searchResult.packageName}}" }, outputKey: "appInfo" }
    ]
  },
  "check-update": {
    name: "check-update",
    description: "Check if an app has a newer version available \u2014 compare current version against latest",
    steps: [
      { action: "info", input: { package: "{{package}}" }, outputKey: "appInfo" },
      { action: "versions", input: { package: "{{package}}" }, outputKey: "versions" }
    ]
  },
  // ---- Security & RE workflows ----
  "security-scan": {
    name: "security-scan",
    description: "Security-oriented scan: download latest + get all versions for vulnerability analysis",
    steps: [
      { action: "info", input: { package: "{{package}}" }, outputKey: "appInfo" },
      { action: "versions", input: { package: "{{package}}" }, outputKey: "versions" },
      { action: "download", input: { package: "{{package}}" }, outputKey: "downloadResult" }
    ]
  },
  "download-and-verify": {
    name: "download-and-verify",
    description: "Download an APK and return its SHA256 hash with file metadata for integrity verification",
    steps: [
      { action: "download", input: { package: "{{package}}", version: "{{version}}" }, outputKey: "downloadResult" }
    ]
  },
  // ---- Comparison workflows ----
  "compare-versions": {
    name: "compare-versions",
    description: "Get version history with version codes to identify major/minor/patch jumps for diff targeting",
    steps: [
      { action: "info", input: { package: "{{package}}" }, outputKey: "appInfo" },
      { action: "versions", input: { package: "{{package}}" }, outputKey: "versions" }
    ]
  },
  // ---- Discovery & exploration workflows ----
  "explore-category": {
    name: "explore-category",
    description: "Search for apps in a specific category and return structured info for the top results",
    steps: [
      { action: "search", input: { query: "{{query}}" }, outputKey: "searchData" }
    ]
  },
  "batch-info": {
    name: "batch-info",
    description: "Get detailed info for multiple apps by package names (comma-separated) without downloading",
    steps: [
      { action: "batch-info", input: { packages: "{{packages}}" }, outputKey: "batchInfo" }
    ]
  },
  // ---- Package validation workflows ----
  "validate-package": {
    name: "validate-package",
    description: "Check if a package name is valid and the app exists on APKPure \u2014 returns app name and basic metadata",
    steps: [
      { action: "info", input: { package: "{{package}}" }, outputKey: "appInfo" }
    ]
  },
  "batch-validate": {
    name: "batch-validate",
    description: "Validate multiple package names at once \u2014 returns which exist and which don't",
    steps: [
      { action: "batch-info", input: { packages: "{{packages}}" }, outputKey: "batchInfo" }
    ]
  }
};
function resolveTemplate(template, ctx) {
  if (typeof template === "string") {
    const match = template.match(/^\{\{(\w+(?:\.\w+)*)\}\}$/);
    if (match) {
      const keys = match[1].split(".");
      let val = ctx;
      for (const k of keys) {
        if (val && typeof val === "object") val = val[k];
        else return template;
      }
      return val ?? template;
    }
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, path) => {
      const keys = path.split(".");
      let val = ctx;
      for (const k of keys) {
        if (val && typeof val === "object") val = val[k];
        else return "";
      }
      return String(val ?? "");
    });
  }
  if (Array.isArray(template)) return template.map((v) => resolveTemplate(v, ctx));
  if (template && typeof template === "object") {
    const result = {};
    for (const [k, v] of Object.entries(template)) {
      result[k] = resolveTemplate(v, ctx);
    }
    return result;
  }
  return template;
}
async function executeStep(sdk, step, ctx, outputDir) {
  const resolved = resolveTemplate(step.input, ctx);
  try {
    switch (step.action) {
      case "search": {
        const query = resolved.query;
        if (!query) return { success: false, error: "query is required" };
        const result = await sdk.search(query);
        if (result.apps.length === 0) {
          return { success: false, error: `No apps found for "${query}"` };
        }
        return { success: true, data: result };
      }
      case "info": {
        const pkg = resolved.package;
        if (!pkg) return { success: false, error: "package is required" };
        const detail = await sdk.getInfo(pkg);
        if (!detail) return { success: false, error: `App not found: ${pkg}` };
        return { success: true, data: detail };
      }
      case "download": {
        const pkg = resolved.package;
        if (!pkg) return { success: false, error: "package is required" };
        const result = await sdk.download(pkg, {
          outputDir: resolved.outputDir ?? outputDir,
          version: resolved.version
        });
        return { success: true, data: result };
      }
      case "versions": {
        const pkg = resolved.package;
        if (!pkg) return { success: false, error: "package is required" };
        const versions = await sdk.getVersions(pkg);
        return { success: true, data: versions };
      }
      case "trending": {
        const apps = await sdk.trending();
        return { success: true, data: apps };
      }
      case "batch-info": {
        const packagesRaw = resolved.packages;
        if (!packagesRaw) return { success: false, error: "packages is required" };
        const packages = packagesRaw.split(",").map((p) => p.trim()).filter(Boolean);
        if (packages.length === 0) return { success: false, error: "no valid package names" };
        const results = [];
        for (const pkg of packages) {
          try {
            const detail = await sdk.getInfo(pkg);
            results.push({ package: pkg, info: detail ?? void 0 });
          } catch (err) {
            results.push({ package: pkg, error: err instanceof Error ? err.message : String(err) });
          }
        }
        return { success: true, data: results };
      }
      case "batch-download": {
        const packagesRaw = resolved.packages;
        if (!packagesRaw) return { success: false, error: "packages is required" };
        const packages = packagesRaw.split(",").map((p) => p.trim()).filter(Boolean);
        if (packages.length === 0) return { success: false, error: "no valid package names" };
        const results = [];
        for (const pkg of packages) {
          try {
            const result = await sdk.download(pkg, { outputDir });
            results.push({ package: pkg, result });
          } catch (err) {
            results.push({ package: pkg, error: err instanceof Error ? err.message : String(err) });
          }
        }
        const allSuccess = results.every((r) => r.result);
        return { success: allSuccess, data: results };
      }
      default:
        return { success: false, error: `Unknown action: ${step.action}` };
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}
async function runWorkflow(workflowName, params, options) {
  const definition = BUILT_IN_WORKFLOWS[workflowName];
  if (!definition) {
    return {
      workflow: workflowName,
      success: false,
      steps: [],
      error: `Unknown workflow: ${workflowName}. Available: ${Object.keys(BUILT_IN_WORKFLOWS).join(", ")}`
    };
  }
  const sdk = new ApkPure({
    mode: options?.mode ?? "auto",
    proxy: options?.proxy
  });
  const outputDir = options?.outputDir ?? DEFAULT_DOWNLOAD_DIR;
  const ctx = { ...params };
  const stepResults = [];
  for (const step of definition.steps) {
    const result = await executeStep(sdk, step, ctx, outputDir);
    stepResults.push({ action: step.action, ...result });
    if (!result.success) {
      return {
        workflow: workflowName,
        success: false,
        steps: stepResults,
        error: `Step "${step.action}" failed: ${result.error}`
      };
    }
    if (step.outputKey && result.data) {
      ctx[step.outputKey] = result.data;
      if (step.action === "search" && step.outputKey === "searchResult") {
        const searchResult = result.data;
        if (searchResult.apps.length > 0) {
          ctx.searchResult = searchResult.apps[0];
        }
      }
      if (step.action === "versions" && Array.isArray(result.data) && result.data.length > 0) {
        const versions = result.data;
        ctx.oldestVersion = versions[versions.length - 1].version;
        ctx.latestVersion = versions[0].version;
        ctx.versionCount = versions.length;
      }
    }
  }
  const lastData = stepResults[stepResults.length - 1]?.data;
  let output = lastData;
  switch (workflowName) {
    case "search-and-download":
    case "download-by-name": {
      const dl = ctx.downloadResult;
      const sr = ctx.searchResult;
      if (dl && sr) {
        output = {
          app: sr.name,
          packageName: dl.packageName,
          version: dl.version,
          fileType: dl.fileType,
          filePath: dl.filePath,
          fileSize: dl.fileSize,
          sha256: dl.sha256
        };
      }
      break;
    }
    case "search-and-info": {
      const sr = ctx.searchResult;
      const info = ctx.appInfo;
      if (sr && info) {
        output = {
          searchMatch: sr.name,
          packageName: sr.packageName,
          ...info
        };
      }
      break;
    }
    case "search-and-report": {
      const sr = ctx.searchResult;
      if (sr) {
        output = {
          searchMatch: sr.name,
          packageName: sr.packageName,
          appInfo: ctx.appInfo,
          versions: ctx.versions
        };
      }
      break;
    }
    case "app-report":
    case "info-and-versions": {
      output = { appInfo: ctx.appInfo, versions: ctx.versions };
      break;
    }
    case "download-latest":
    case "verify-and-download": {
      const info = ctx.appInfo;
      const dl = ctx.downloadResult;
      if (info && dl) {
        output = {
          app: info.name,
          packageName: dl.packageName,
          version: dl.version,
          fileType: dl.fileType,
          filePath: dl.filePath,
          fileSize: dl.fileSize,
          sha256: dl.sha256,
          developer: info.developer,
          updateDate: info.updateDate
        };
      }
      break;
    }
    case "download-version": {
      const info = ctx.appInfo;
      const dl = ctx.downloadResult;
      if (info && dl) {
        output = {
          app: info.name,
          packageName: dl.packageName,
          requestedVersion: params.version,
          actualVersion: dl.version,
          filePath: dl.filePath,
          fileSize: dl.fileSize,
          sha256: dl.sha256
        };
      }
      break;
    }
    case "trending-and-info": {
      output = ctx.trendingResult;
      break;
    }
    case "batch-download": {
      output = { results: ctx.batchResults };
      break;
    }
    case "app-intelligence": {
      const info = ctx.appInfo;
      const versions = ctx.versions;
      output = {
        appInfo: ctx.appInfo,
        versions,
        versionCount: ctx.versionCount,
        latestVersion: ctx.latestVersion,
        oldestVersion: ctx.oldestVersion,
        fileTypes: versions ? [...new Set(versions.map((v) => v.type))] : []
      };
      break;
    }
    case "search-intelligence": {
      const sr = ctx.searchResult;
      const versions = ctx.versions;
      output = {
        searchMatch: sr?.name,
        packageName: sr?.packageName,
        appInfo: ctx.appInfo,
        versions,
        versionCount: ctx.versionCount,
        latestVersion: ctx.latestVersion,
        oldestVersion: ctx.oldestVersion,
        fileTypes: versions ? [...new Set(versions.map((v) => v.type))] : []
      };
      break;
    }
    case "version-audit": {
      const info = ctx.appInfo;
      const versions = ctx.versions;
      output = {
        packageName: info?.packageName,
        currentVersion: info?.version,
        versionCount: ctx.versionCount,
        latestVersion: ctx.latestVersion,
        oldestVersion: ctx.oldestVersion,
        versions: versions?.map((v) => ({
          version: v.version,
          versionCode: v.versionCode,
          type: v.type
        }))
      };
      break;
    }
    case "download-oldest": {
      const info = ctx.appInfo;
      const dl = ctx.downloadResult;
      if (info && dl) {
        output = {
          app: info.name,
          packageName: dl.packageName,
          version: dl.version,
          fileType: dl.fileType,
          filePath: dl.filePath,
          fileSize: dl.fileSize,
          sha256: dl.sha256,
          note: "Oldest available version downloaded"
        };
      }
      break;
    }
    case "quick-lookup": {
      const sr = ctx.searchResult;
      const info = ctx.appInfo;
      if (sr && info) {
        output = {
          name: info.name,
          packageName: info.packageName,
          version: info.version,
          developer: info.developer,
          category: info.category,
          rating: info.rating,
          updateDate: info.updateDate,
          fileType: info.fileType
        };
      }
      break;
    }
    case "check-update": {
      const info = ctx.appInfo;
      const versions = ctx.versions;
      const currentVersion = params.currentVersion;
      const latestAvailable = ctx.latestVersion;
      output = {
        packageName: info?.packageName,
        currentVersion: currentVersion ?? info?.version,
        latestAvailable,
        updateAvailable: latestAvailable !== void 0 && latestAvailable !== (currentVersion ?? info?.version),
        versionCount: ctx.versionCount
      };
      break;
    }
    case "security-scan": {
      const info = ctx.appInfo;
      const versions = ctx.versions;
      const dl = ctx.downloadResult;
      output = {
        packageName: info?.packageName,
        app: info?.name,
        currentVersion: info?.version,
        developer: info?.developer,
        versionCount: ctx.versionCount,
        latestVersion: ctx.latestVersion,
        oldestVersion: ctx.oldestVersion,
        fileTypes: versions ? [...new Set(versions.map((v) => v.type))] : [],
        downloadedFile: dl ? {
          filePath: dl.filePath,
          fileSize: dl.fileSize,
          fileType: dl.fileType,
          sha256: dl.sha256
        } : void 0
      };
      break;
    }
    case "download-and-verify": {
      const dl = ctx.downloadResult;
      if (dl) {
        output = {
          packageName: dl.packageName,
          version: dl.version,
          fileType: dl.fileType,
          filePath: dl.filePath,
          fileSize: dl.fileSize,
          sha256: dl.sha256,
          verified: true
        };
      }
      break;
    }
    case "compare-versions": {
      const info = ctx.appInfo;
      const versions = ctx.versions;
      const versionJumps = [];
      if (versions && versions.length > 1) {
        for (let i = 0; i < versions.length - 1; i++) {
          versionJumps.push({
            from: versions[i + 1].version,
            to: versions[i].version,
            codeDelta: versions[i].versionCode - versions[i + 1].versionCode
          });
        }
      }
      output = {
        packageName: info?.packageName,
        currentVersion: info?.version,
        versionCount: ctx.versionCount,
        latestVersion: ctx.latestVersion,
        oldestVersion: ctx.oldestVersion,
        versionJumps,
        versions: versions?.map((v) => ({
          version: v.version,
          versionCode: v.versionCode,
          type: v.type
        }))
      };
      break;
    }
    case "explore-category": {
      const searchData = ctx.searchData;
      const apps = searchData?.apps ?? [];
      output = {
        query: params.query,
        totalResults: apps.length,
        apps: apps.map((a) => ({
          name: a.name,
          packageName: a.packageName,
          version: a.version,
          developer: a.developer,
          category: a.category,
          rating: a.rating
        }))
      };
      break;
    }
    case "batch-info": {
      output = { results: ctx.batchInfo };
      break;
    }
    case "validate-package": {
      const info = ctx.appInfo;
      output = {
        packageName: info?.packageName,
        valid: !!info,
        name: info?.name,
        version: info?.version,
        developer: info?.developer
      };
      break;
    }
    case "batch-validate": {
      const batchInfo = ctx.batchInfo;
      output = {
        results: batchInfo?.map((r) => ({
          package: r.package,
          valid: !!r.info,
          name: r.info?.name
        })),
        total: batchInfo?.length ?? 0,
        valid: batchInfo?.filter((r) => r.info).length ?? 0,
        invalid: batchInfo?.filter((r) => !r.info).length ?? 0
      };
      break;
    }
  }
  return {
    workflow: workflowName,
    success: true,
    steps: stepResults,
    output
  };
}
function listWorkflows() {
  return Object.values(BUILT_IN_WORKFLOWS);
}

// src/skill-handler.ts
async function handleSkillRequest(req) {
  try {
    switch (req.action) {
      case "workflow": {
        if (!req.workflow) return { success: false, error: "workflow name is required" };
        const result = await runWorkflow(req.workflow, req.params ?? {}, {
          mode: req.mode ?? "auto",
          proxy: req.proxy,
          outputDir: req.outputDir
        });
        return { success: result.success, data: result.output, error: result.error };
      }
      case "list-workflows": {
        const workflows = listWorkflows();
        return { success: true, data: workflows };
      }
      default: {
        const sdk = new ApkPure({
          mode: req.mode ?? "auto",
          proxy: req.proxy
        });
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
            if (!req.outputDir) req.outputDir = DEFAULT_DOWNLOAD_DIR;
            const result = await sdk.download(req.package, {
              outputDir: req.outputDir,
              version: req.version
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
              error: `Unknown action: ${req.action}`
            };
        }
      }
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ApkPure,
  handleSkillRequest,
  listWorkflows,
  runWorkflow
});

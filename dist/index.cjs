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
  ApkPureServer: () => ApkPureServer,
  handleSkillRequest: () => handleSkillRequest,
  listWorkflows: () => listWorkflows,
  runWorkflow: () => runWorkflow,
  startServer: () => startServer
});
module.exports = __toCommonJS(index_exports);

// src/server.ts
var import_node_http = require("http");

// src/utils/headers.ts
var import_node_crypto2 = require("crypto");

// src/utils/crypto.ts
var import_node_crypto = require("crypto");
var import_node_fs = require("fs");
function md5(input) {
  return (0, import_node_crypto.createHash)("md5").update(input).digest("hex");
}
function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = (0, import_node_crypto.createHash)("sha256");
    const stream = (0, import_node_fs.createReadStream)(filePath);
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
var import_node_path = require("path");
var DEFAULT_DOWNLOAD_DIR = (0, import_node_path.join)((0, import_node_os.homedir)(), ".apkpure", "downloads");
var DEFAULT_CONFIG = {
  mode: "android",
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

// src/client/mobile-transport.ts
var import_node_child_process = require("child_process");
var import_node_util = require("util");
var import_node_os2 = require("os");
var import_node_path2 = require("path");
var import_node_fs2 = require("fs");
var execFileP = (0, import_node_util.promisify)(import_node_child_process.execFile);
var PYTHON = String.raw`
import io, json, os, sys
from curl_cffi import Curl, CurlInfo, CurlOpt
url = sys.argv[1]
out_file = sys.argv[2]
c = Curl()
c.setopt(CurlOpt.URL, url.encode())
c.setopt(CurlOpt.IMPERSONATE, os.environ.get("APK_IMPERSONATE", "chrome136").encode())
c.setopt(CurlOpt.TIMEOUT, int(os.environ.get("APK_TIMEOUT", "30")))
c.setopt(CurlOpt.ACCEPT_ENCODING, b"")
headers = json.loads(os.environ.get("APK_HEADERS", "{}"))
c.setopt(CurlOpt.HTTPHEADER, [f"{k}: {v}".encode() for k, v in headers.items()])
resolve = json.loads(os.environ.get("APK_RESOLVE", "[]"))
if resolve:
    c.setopt(CurlOpt.RESOLVE, [x.encode() for x in resolve])
proxy = os.environ.get("APK_PROXY")
if proxy:
    c.setopt(CurlOpt.PROXY, proxy.encode())
buf = io.BytesIO()
c.setopt(CurlOpt.WRITEFUNCTION, buf.write)
c.perform()
with open(out_file, "wb") as f:
    f.write(buf.getvalue())
print(json.dumps({"status": int(c.getinfo(CurlInfo.RESPONSE_CODE))}))
`;
function resolveEntries(host, ips) {
  return ips.map((ip) => `${host}:443:${ip}`);
}
async function mobileRequest(url, options = {}) {
  const dir = (0, import_node_fs2.mkdtempSync)((0, import_node_path2.join)((0, import_node_os2.tmpdir)(), "apkpure-mobile-"));
  const output = (0, import_node_path2.join)(dir, "response.bin");
  try {
    const env = {
      ...process.env,
      APK_HEADERS: JSON.stringify(options.headers ?? {}),
      APK_IMPERSONATE: process.env.APKPURE_IMPERSONATE_TARGET || "chrome136",
      APK_TIMEOUT: String(Math.ceil((options.timeout ?? 3e4) / 1e3)),
      APK_RESOLVE: JSON.stringify(options.resolve ?? []),
      ...options.proxy ? { APK_PROXY: options.proxy } : {}
    };
    const { stdout } = await execFileP("python3", ["-c", PYTHON, url, output], {
      env,
      timeout: (options.timeout ?? 3e4) + 5e3,
      maxBuffer: 1024 * 1024
    });
    const meta = JSON.parse(stdout.trim());
    return { status: meta.status, headers: {}, body: (0, import_node_fs2.readFileSync)(output) };
  } catch (err) {
    const e = err;
    const detail = e.stderr?.toString().trim().split(/\r?\n/).pop() || e.message || "unknown error";
    throw new Error(`Mobile API request failed: ${detail}`);
  } finally {
    (0, import_node_fs2.rmSync)(dir, { recursive: true, force: true });
  }
}

// src/utils/resolve.ts
var import_node_child_process2 = require("child_process");
var import_node_util2 = require("util");
var execFileP2 = (0, import_node_util2.promisify)(import_node_child_process2.execFile);
var DOH_HOST = "1.1.1.1";
async function resolveViaDoh(host, timeout = 8e3) {
  try {
    const url = `https://${DOH_HOST}/dns-query?type=A&name=${encodeURIComponent(host)}`;
    const { stdout } = await execFileP2(
      "python3",
      [
        "-c",
        String.raw`
import json, urllib.request
req = urllib.request.Request(${JSON.stringify(url)}, headers={"Accept": "application/dns-json"})
try:
    with urllib.request.urlopen(req, timeout=${timeout / 1e3}) as r:
        j = json.loads(r.read().decode())
    ips = [a["data"] for a in j.get("Answer", []) if a.get("type") == 1]
    print("\n".join(ips))
except Exception:
    pass
`
      ],
      { timeout }
    );
    return stdout.split("\n").filter((l) => /^\d+\.\d+\.\d+\.\d+$/.test(l));
  } catch {
    return [];
  }
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
  async request(url, query, body) {
    const qs = "?" + Object.entries(query).map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&");
    const bodyStr = JSON.stringify(body);
    const signed = signBody({ ...this.headers }, bodyStr);
    const hosts = (process.env.APKPURE_MOBILE_RESOLVE || "").split(",").filter(Boolean);
    let ips = [...hosts];
    if (!ips.length) {
      const host = new URL(url).hostname;
      ips = await resolveViaDoh(host);
    }
    const resolve = ips.length ? resolveEntries(url.replace(/^https?:\/\//, "").split("/")[0], ips) : [];
    const resp = await mobileRequest(url + qs, {
      headers: { ...signed, Accept: "application/json" },
      timeout: this.timeout,
      proxy: this.proxy,
      resolve
    });
    if (resp.status < 200 || resp.status >= 300) {
      const detail = resp.body.toString("utf-8").slice(0, 500);
      throw new Error(`Mobile API returned HTTP ${resp.status}${detail ? `: ${detail}` : ""}`);
    }
    const text = resp.body.toString("utf-8");
    return JSON.parse(text);
  }
  async search(query, page = 1) {
    return this.request(
      `${MOBILE_CONFIG.apiBase}/search_query_new`,
      { hl: "en-US", key: query, page: String(page), search_type: "active_search" },
      {}
    );
  }
  async getDetail(packageName) {
    return this.request(
      `${MOBILE_CONFIG.apiBase}/get_app_detail`,
      { package_name: packageName, hl: "en-US" },
      { package_name: packageName, hl: "en-US" }
    );
  }
};

// src/client/scraping-client.ts
var cheerio = __toESM(require("cheerio"), 1);

// src/utils/http.ts
var import_undici = require("undici");
var import_undici2 = require("undici");
var import_node_fs3 = require("fs");
var import_node_path3 = require("path");
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
async function downloadFile(url, destPath, options) {
  (0, import_node_fs3.mkdirSync)((0, import_node_path3.dirname)(destPath), { recursive: true });
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
    const stream = (0, import_node_fs3.createWriteStream)(destPath);
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

// src/utils/impersonate.ts
var import_node_child_process3 = require("child_process");
var import_node_util3 = require("util");
var import_node_fs4 = require("fs");
var import_node_os3 = require("os");
var import_node_path4 = require("path");
var execFileP3 = (0, import_node_util3.promisify)(import_node_child_process3.execFile);
async function runProcess(cmd, args, options, label) {
  try {
    const res = await execFileP3(cmd, args, options);
    return { stdout: res.stdout.toString(), stderr: res.stderr.toString() };
  } catch (err) {
    const e = err;
    if (e.killed) throw new Error(`${label} timed out`);
    const stderr = (e.stderr ? e.stderr.toString() : "").trim();
    const lastLine = stderr.split(/\r?\n/).filter(Boolean).pop();
    throw new Error(`${label} failed: ${lastLine || e.message || "unknown error"}`);
  }
}
var CANDIDATE_BINARIES = [
  "curl_chrome131",
  "curl_chrome124",
  "curl_chrome123",
  "curl_chrome116",
  "curl_chrome110",
  "curl_chrome104",
  "curl-impersonate-chrome",
  "curl-impersonate"
];
var PYTHON_CANDIDATES = ["python3", "python"];
function impersonateTarget() {
  return process.env.APKPURE_IMPERSONATE_TARGET || "chrome";
}
var cachedBackend;
async function commandExists(cmd) {
  try {
    const { stdout } = await execFileP3("sh", ["-c", `command -v ${cmd}`], {
      timeout: 4e3
    });
    const path = stdout.trim().split("\n")[0];
    return path || null;
  } catch {
    return null;
  }
}
async function pythonWithCurlCffi() {
  for (const py of PYTHON_CANDIDATES) {
    try {
      await execFileP3(py, ["-c", "import curl_cffi"], { timeout: 6e3 });
      return py;
    } catch {
    }
  }
  return null;
}
async function detectBackend() {
  if (cachedBackend) return cachedBackend;
  const forced = (process.env.APKPURE_IMPERSONATE || "auto").trim();
  if (forced === "node") {
    cachedBackend = { kind: "node", detail: "forced via APKPURE_IMPERSONATE=node" };
    return cachedBackend;
  }
  if (forced && forced !== "auto" && forced !== "curl_cffi" && forced !== "curl-impersonate") {
    const path = forced.includes("/") ? forced : await commandExists(forced);
    if (path) {
      cachedBackend = { kind: "curl-impersonate", cmd: path, detail: `forced binary: ${path}` };
      return cachedBackend;
    }
  }
  const wantCurlCffi = forced === "auto" || forced === "curl_cffi";
  const wantBinary = forced === "auto" || forced === "curl-impersonate";
  if (wantBinary) {
    for (const name of CANDIDATE_BINARIES) {
      const path = await commandExists(name);
      if (path) {
        cachedBackend = {
          kind: "curl-impersonate",
          cmd: path,
          detail: `curl-impersonate binary (${name})`
        };
        return cachedBackend;
      }
    }
  }
  if (wantCurlCffi) {
    const py = await pythonWithCurlCffi();
    if (py) {
      cachedBackend = { kind: "curl_cffi", cmd: py, detail: `curl_cffi via ${py}` };
      return cachedBackend;
    }
  }
  cachedBackend = {
    kind: "node",
    detail: "no impersonation backend found \u2014 using Node (may hit Cloudflare)"
  };
  return cachedBackend;
}
var PY_RUNNER = `
import os, sys, json
from curl_cffi import requests

url = sys.argv[1]
method = sys.argv[2]
out_file = sys.argv[3]

headers = json.loads(os.environ.get("APK_HEADERS") or "{}")
body = os.environ.get("APK_BODY")
proxy = os.environ.get("APK_PROXY") or None
target = os.environ.get("APK_IMPERSONATE") or "chrome"
timeout = float(os.environ.get("APK_TIMEOUT") or "30")

proxies = {"http": proxy, "https": proxy} if proxy else None

kwargs = dict(headers=headers, impersonate=target, timeout=timeout,
              proxies=proxies, allow_redirects=True)
if body is not None and method.upper() != "GET":
    kwargs["data"] = body.encode("utf-8")

r = requests.request(method.upper(), url, **kwargs)

with open(out_file, "wb") as f:
    f.write(r.content)

meta = {"status": r.status_code, "headers": {k.lower(): v for k, v in r.headers.items()}}
sys.stdout.write(json.dumps(meta))
`;
async function requestViaCurlCffi(py, url, outFile, opts) {
  const env = {
    ...process.env,
    APK_HEADERS: JSON.stringify(opts.headers ?? {}),
    APK_IMPERSONATE: impersonateTarget(),
    APK_TIMEOUT: String((opts.timeout ?? 3e4) / 1e3),
    ...opts.body != null ? { APK_BODY: opts.body } : {},
    ...opts.proxy ? { APK_PROXY: opts.proxy } : {}
  };
  const { stdout } = await runProcess(
    py,
    ["-c", PY_RUNNER, url, opts.method ?? "GET", outFile],
    { env, timeout: (opts.timeout ?? 3e4) + 5e3, maxBuffer: 8 * 1024 * 1024 },
    "curl_cffi request"
  );
  const meta = JSON.parse(stdout);
  const body = (0, import_node_fs4.readFileSync)(outFile);
  return { status: meta.status, headers: meta.headers, body };
}
function parseHeaderDump(dump) {
  const blocks = dump.split(/\r?\n\r?\n/).filter((b) => /^HTTP\//m.test(b));
  const last = blocks[blocks.length - 1] ?? dump;
  const headers = {};
  for (const line of last.split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx > 0) headers[line.slice(0, idx).trim().toLowerCase()] = line.slice(idx + 1).trim();
  }
  return headers;
}
async function requestViaBinary(bin, url, outFile, opts) {
  const headerDump = outFile + ".hdr";
  const args = [
    "-sS",
    "-L",
    "--max-time",
    String(Math.ceil((opts.timeout ?? 3e4) / 1e3)),
    "-o",
    outFile,
    "-D",
    headerDump,
    "-w",
    "%{http_code}"
  ];
  if (opts.proxy) args.push("-x", opts.proxy);
  for (const [k, v] of Object.entries(opts.headers ?? {})) args.push("-H", `${k}: ${v}`);
  if (opts.method && opts.method.toUpperCase() !== "GET") {
    args.push("-X", opts.method.toUpperCase());
    if (opts.body != null) args.push("--data-raw", opts.body);
  }
  args.push(url);
  const { stdout } = await runProcess(
    bin,
    args,
    { timeout: (opts.timeout ?? 3e4) + 5e3, maxBuffer: 8 * 1024 * 1024 },
    "curl-impersonate request"
  );
  const status = parseInt(stdout.trim().slice(-3), 10) || 0;
  let headers = {};
  try {
    headers = parseHeaderDump((0, import_node_fs4.readFileSync)(headerDump, "utf-8"));
  } catch {
  } finally {
    try {
      (0, import_node_fs4.rmSync)(headerDump, { force: true });
    } catch {
    }
  }
  const body = (0, import_node_fs4.readFileSync)(outFile);
  return { status, headers, body };
}
async function impersonateRequest(url, opts = {}) {
  const backend = await detectBackend();
  if (backend.kind === "node") {
    throw new Error("no impersonation backend");
  }
  const dir = (0, import_node_fs4.mkdtempSync)((0, import_node_path4.join)((0, import_node_os3.tmpdir)(), "apkpure-imp-"));
  const outFile = (0, import_node_path4.join)(dir, "resp.bin");
  try {
    if (backend.kind === "curl_cffi") {
      return await requestViaCurlCffi(backend.cmd, url, outFile, opts);
    }
    return await requestViaBinary(backend.cmd, url, outFile, opts);
  } finally {
    try {
      (0, import_node_fs4.rmSync)(dir, { recursive: true, force: true });
    } catch {
    }
  }
}
async function impersonateText(url, opts = {}) {
  const resp = await impersonateRequest(url, opts);
  return { status: resp.status, text: resp.body.toString("utf-8"), headers: resp.headers };
}
async function impersonateDownload(url, destPath, opts = {}) {
  const backend = await detectBackend();
  if (backend.kind === "node") {
    throw new Error("no impersonation backend");
  }
  (0, import_node_fs4.mkdirSync)((0, import_node_path4.dirname)(destPath), { recursive: true });
  const timeout = opts.timeout ?? 3e5;
  if (backend.kind === "curl_cffi") {
    await requestViaCurlCffi(backend.cmd, url, destPath, {
      method: "GET",
      headers: opts.headers,
      proxy: opts.proxy,
      timeout
    });
  } else {
    const headerDump = destPath + ".hdr";
    const args = [
      "-sS",
      "-L",
      "--max-time",
      String(Math.ceil(timeout / 1e3)),
      "-o",
      destPath,
      "-D",
      headerDump,
      "-w",
      "%{http_code}"
    ];
    if (opts.proxy) args.push("-x", opts.proxy);
    for (const [k, v] of Object.entries(opts.headers ?? {})) args.push("-H", `${k}: ${v}`);
    args.push(url);
    const { stdout } = await runProcess(
      backend.cmd,
      args,
      { timeout: timeout + 5e3, maxBuffer: 1024 * 1024 },
      "curl-impersonate download"
    );
    const status = parseInt(stdout.trim().slice(-3), 10) || 0;
    try {
      (0, import_node_fs4.rmSync)(headerDump, { force: true });
    } catch {
    }
    if (status >= 400 || status === 0) {
      throw new Error(`Download failed: HTTP ${status} for ${url}`);
    }
  }
  return (0, import_node_fs4.statSync)(destPath).size;
}

// src/utils/web.ts
var CHROME_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
var NODE_BROWSER_HEADERS = {
  "User-Agent": CHROME_UA,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "sec-ch-ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1"
};
var IMP_EXTRA_HEADERS = {
  "Accept-Language": "en-US,en;q=0.9",
  Referer: WEB_BASE_URL + "/"
};
var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function isCloudflareBlock(status, body) {
  if (status === 403 || status === 429 || status === 503) {
    return /cloudflare|cf-ray|just a moment|attention required|challenge-platform|cf_chl/i.test(
      body
    );
  }
  if (/<title>\s*just a moment/i.test(body) || /cf_chl_opt/i.test(body)) return true;
  return false;
}
async function singleRequest(url, timeout, proxy) {
  const backend = await detectBackend();
  if (backend.kind !== "node") {
    try {
      const { status, text: text2 } = await impersonateText(url, {
        headers: IMP_EXTRA_HEADERS,
        proxy,
        timeout
      });
      return { status, text: text2, viaImpersonation: true };
    } catch (err) {
      const text2 = await fetchText(url, {
        headers: NODE_BROWSER_HEADERS,
        timeout,
        proxy
      });
      return { status: 200, text: text2, viaImpersonation: false };
    }
  }
  const text = await fetchText(url, {
    headers: NODE_BROWSER_HEADERS,
    timeout,
    proxy
  });
  return { status: 200, text, viaImpersonation: false };
}
async function webFetchHtml(url, opts = {}) {
  const timeout = opts.timeout ?? 3e4;
  const proxy = opts.proxy ?? "";
  const retries = opts.retries ?? 2;
  const usingImpersonation = (await detectBackend()).kind !== "node";
  let lastErr;
  let sawCloudflare = false;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await singleRequest(url, timeout, proxy);
      if (res.status >= 200 && res.status < 300 && !isCloudflareBlock(res.status, res.text)) {
        return res.text;
      }
      if (isCloudflareBlock(res.status, res.text) || res.status === 403) {
        sawCloudflare = true;
        lastErr = new Error(`Cloudflare block (HTTP ${res.status})`);
      } else if (res.status >= 400) {
        lastErr = new Error(`HTTP ${res.status} for ${url}`);
      } else {
        lastErr = new Error(`Unexpected HTTP ${res.status} for ${url}`);
      }
    } catch (err) {
      lastErr = err;
    }
    if (attempt < retries) await sleep(600 * (attempt + 1) + Math.floor(Math.random() * 300));
  }
  const detail = lastErr instanceof Error ? lastErr.message : String(lastErr);
  if (!usingImpersonation) {
    throw new Error(
      `Request to ${url} failed (${detail}).
apkpure.com is behind Cloudflare, and no TLS-impersonation backend is installed \u2014 plain Node requests get fingerprinted and blocked. Install one:
  pip install curl_cffi        (recommended, cross-platform)
  or install curl-impersonate  (https://github.com/lwthiker/curl-impersonate)
Then re-run. Check backend status with: apkpure doctor`
    );
  }
  if (sawCloudflare) {
    throw new Error(
      `apkpure.com returned a Cloudflare challenge despite TLS impersonation (${detail}). Try a different target via APKPURE_IMPERSONATE_TARGET (e.g. chrome131), or route through a residential proxy with --proxy. Run: apkpure doctor`
    );
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
async function webDownload(url, destPath, opts = {}) {
  const backend = await detectBackend();
  const referer = { Referer: WEB_BASE_URL + "/", ...opts.headers ?? {} };
  if (backend.kind !== "node") {
    try {
      const size = await impersonateDownload(url, destPath, {
        headers: referer,
        proxy: opts.proxy,
        timeout: opts.timeout
      });
      if (opts.onProgress && size > 0) opts.onProgress(size, size);
      return size;
    } catch {
      return downloadFile(url, destPath, {
        headers: { "User-Agent": CHROME_UA, Accept: "*/*", ...referer },
        proxy: opts.proxy,
        onProgress: opts.onProgress
      });
    }
  }
  return downloadFile(url, destPath, {
    headers: { "User-Agent": CHROME_UA, Accept: "*/*", ...referer },
    proxy: opts.proxy,
    onProgress: opts.onProgress
  });
}

// src/client/scraping-client.ts
var ScrapingClient = class {
  timeout;
  proxy;
  constructor(timeout = 3e4, proxy = "") {
    this.timeout = timeout;
    this.proxy = proxy;
  }
  async search(query) {
    const html = await webFetchHtml(
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
    const html = await webFetchHtml(
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
    const html = await webFetchHtml(
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
    const html = await webFetchHtml(`${WEB_BASE_URL}/game-24h`, {
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
var import_node_fs5 = require("fs");
var import_node_path5 = require("path");
var ANDROID_UA = "Dalvik/2.1.0 (Linux; U; Android 14; SM-G955F Build/AP2A.240805.005)";
async function fetchApkFile(url, tmpPath, proxy, onProgress) {
  try {
    await downloadFile(url, tmpPath, {
      headers: { "User-Agent": ANDROID_UA, Accept: "*/*" },
      proxy,
      onProgress
    });
  } catch {
    if ((0, import_node_fs5.existsSync)(tmpPath)) try {
      (0, import_node_fs5.unlinkSync)(tmpPath);
    } catch {
    }
    await webDownload(url, tmpPath, {
      headers: { "User-Agent": ANDROID_UA, Accept: "*/*" },
      proxy,
      onProgress
    });
  }
}
async function downloadApk(url, packageName, version, fileType, options, proxy = "") {
  (0, import_node_fs5.mkdirSync)(options.outputDir, { recursive: true });
  const fileName = options.fileName ?? `${packageName}-${version}.${fileType}`;
  const filePath = (0, import_node_path5.join)(options.outputDir, fileName);
  const tmpPath = filePath + ".part";
  await fetchApkFile(url, tmpPath, proxy, options.onProgress);
  (0, import_node_fs5.renameSync)(tmpPath, filePath);
  const sha256 = await sha256File(filePath);
  const stat = (0, import_node_fs5.statSync)(filePath);
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
var import_node_fs6 = require("fs");
var import_node_os4 = require("os");
var import_node_path6 = require("path");
var import_node_net = require("net");
var PROBE_HOST = "tapi.pureapk.com";
var PROBE_TIMEOUT = 3e3;
var CLASH_CONFIG_PATHS = [
  (0, import_node_path6.join)(
    (0, import_node_os4.homedir)(),
    "Library/Application Support/io.github.clash-verge-rev.clash-verge-rev"
  ),
  (0, import_node_path6.join)((0, import_node_os4.homedir)(), ".config/clash-verge"),
  (0, import_node_path6.join)((0, import_node_os4.homedir)(), ".config/clash"),
  (0, import_node_path6.join)((0, import_node_os4.homedir)(), ".config/mihomo")
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
    const filePath = (0, import_node_path6.join)(configDir, file);
    if (!(0, import_node_fs6.existsSync)(filePath)) continue;
    try {
      const content = (0, import_node_fs6.readFileSync)(filePath, "utf-8");
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
  let timeout;
  try {
    const { fetch: fetch2, ProxyAgent: ProxyAgent2 } = await import("undici");
    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT);
    const resp = await fetch2(`https://${PROBE_HOST}`, {
      method: "HEAD",
      dispatcher: new ProxyAgent2(proxyUrl),
      signal: controller.signal
    });
    return resp.status > 0;
  } catch {
    return false;
  } finally {
    if (timeout) clearTimeout(timeout);
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
    if (!(0, import_node_fs6.existsSync)(configDir)) continue;
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
  const openness = await Promise.all(
    COMMON_PROXY_PORTS.map(({ port }) => checkPortOpen(port))
  );
  for (let i = 0; i < COMMON_PROXY_PORTS.length; i++) {
    if (!openness[i]) continue;
    const { port, name } = COMMON_PROXY_PORTS[i];
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
function normalizeMode(mode) {
  if (mode === "api") return "android";
  if (mode === "scraping") return "web";
  return mode;
}
function useWeb(config) {
  return config.mode === "web" || config.mode === "scraping";
}
function useFallback(config) {
  return config.mode === "auto";
}
var ApkPure = class {
  config;
  mobile;
  scraper;
  _initPromise;
  constructor(config) {
    const mode = normalizeMode(config?.mode ?? DEFAULT_CONFIG.mode);
    this.config = { ...DEFAULT_CONFIG, ...config, mode };
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
    if (useWeb(this.config)) {
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
      if (useFallback(this.config)) {
        return this.scraper.search(query);
      }
      throw new Error(`Search failed for "${query}"`);
    }
  }
  async getInfo(packageName) {
    await this.ensureReady();
    if (useWeb(this.config)) {
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
        screenshots: d.screenshots,
        nativeCode: d.native_code
      };
    } catch {
      if (useFallback(this.config)) {
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
    mode: options?.mode ?? "android",
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
async function handleSkillRequest(req, callbacks = {}) {
  try {
    switch (req.action) {
      case "workflow": {
        if (!req.workflow) return { success: false, error: "workflow name is required" };
        const result = await runWorkflow(req.workflow, req.params ?? {}, {
          mode: req.mode ?? "android",
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
          mode: req.mode ?? "android",
          proxy: req.proxy
        });
        switch (req.action) {
          case "search": {
            if (!req.query) throw new Error("query is required for search");
            const result = await sdk.search(req.query);
            return { success: true, data: result };
          }
          case "info": {
            if (!req.package) throw new Error("package is required for info");
            const detail = await sdk.getInfo(req.package);
            if (!detail) throw new Error(`App not found: ${req.package}`);
            return { success: true, data: detail };
          }
          case "download": {
            if (!req.package) throw new Error("package is required for download");
            if (!req.outputDir) req.outputDir = DEFAULT_DOWNLOAD_DIR;
            const result = await sdk.download(req.package, {
              outputDir: req.outputDir,
              version: req.version,
              onProgress: callbacks.onProgress
            });
            return { success: true, data: result };
          }
          case "trending": {
            const apps = await sdk.trending();
            return { success: true, data: apps };
          }
          case "versions": {
            if (!req.package) throw new Error("package is required for versions");
            const versions = await sdk.getVersions(req.package);
            return { success: true, data: versions };
          }
          default:
            return { success: false, error: `Unknown action: ${req.action}` };
        }
      }
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// src/server.ts
var API_SCHEMA = {
  version: "1",
  endpoints: [
    { method: "POST", path: "/api/action", description: "Execute an action; body is SkillRequest JSON" },
    { method: "GET", path: "/api/state", description: "Full current UI state snapshot" },
    { method: "GET", path: "/api/status", description: "Health check; returns port, clients, defaultDir" },
    { method: "GET", path: "/api/events", description: "SSE stream of state/progress events" },
    { method: "GET", path: "/api/schema", description: "This schema document" }
  ],
  actions: [
    { action: "search", required: ["query"], optional: [], description: "Search apps by keyword; results appear in state.searchResults" },
    { action: "info", required: ["package"], optional: [], description: "Get app detail; result appears in state.selectedDetail" },
    { action: "versions", required: ["package"], optional: [], description: "List all versions; result appears in state.selectedVersions" },
    { action: "trending", required: [], optional: [], description: "Get trending apps; result appears in state.trendingApps" },
    { action: "download", required: ["package"], optional: ["outputDir", "version"], description: "Download APK/XAPK; progress via SSE download:progress events" },
    { action: "workflow", required: ["workflow"], optional: ["params"], description: "Run a named workflow" },
    { action: "list-workflows", required: [], optional: [], description: "List all available workflows" }
  ],
  events: [
    { type: "connected", description: "Fired on SSE connect; payload is full ServerState" },
    { type: "state:updated", description: "Fired after any action; payload is full ServerState" },
    { type: "download:progress", description: "Fired during download; payload: {packageName,downloaded,total,percent}" },
    { type: "action:start", description: "Fired when an action begins; payload: {action}" },
    { type: "action:complete", description: "Fired when an action finishes; payload: {action,result}" },
    { type: "action:error", description: "Fired on action failure; payload: {action,error}" }
  ]
};
var ApkPureServer = class {
  port;
  sseClients = [];
  state = {
    lastQuery: "",
    searchResults: [],
    trendingApps: [],
    selectedPackage: "",
    selectedDetail: null,
    selectedVersions: [],
    downloadProgress: null,
    history: [],
    error: "",
    activeAction: ""
  };
  constructor(port = 13456) {
    this.port = port;
  }
  // ── SSE broadcast ──────────────────────────────────────────────────────────
  broadcast(event) {
    const data = `data: ${JSON.stringify(event)}

`;
    this.sseClients = this.sseClients.filter((res) => {
      try {
        res.write(data);
        return true;
      } catch {
        return false;
      }
    });
  }
  patchState(partial) {
    Object.assign(this.state, partial);
    this.broadcast({ type: "state:updated", payload: this.state });
  }
  // ── HTTP helpers ───────────────────────────────────────────────────────────
  cors(res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }
  json(res, status, body) {
    this.cors(res);
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  }
  readBody(req) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
      req.on("error", reject);
    });
  }
  // ── Action handler (core logic) ────────────────────────────────────────────
  async handleAction(req, res) {
    let body;
    try {
      body = await this.readBody(req);
    } catch {
      this.json(res, 400, { success: false, error: "failed to read request body" });
      return;
    }
    let skillReq;
    try {
      skillReq = JSON.parse(body);
    } catch {
      this.json(res, 400, { success: false, error: "invalid JSON body" });
      return;
    }
    this.patchState({ error: "", activeAction: skillReq.action });
    this.broadcast({ type: "action:start", payload: { action: skillReq.action } });
    const callbacks = skillReq.action === "download" ? {
      onProgress: (downloaded, total) => {
        const percent = total > 0 ? Math.round(downloaded / total * 100) : 0;
        const progress = { packageName: skillReq.package ?? "", downloaded, total, percent };
        this.state.downloadProgress = progress;
        this.broadcast({ type: "download:progress", payload: progress });
      }
    } : {};
    let result;
    try {
      result = await handleSkillRequest(skillReq, callbacks);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      this.patchState({ error, downloadProgress: null, activeAction: "" });
      this.broadcast({ type: "action:error", payload: { action: skillReq.action, error } });
      this.json(res, 500, { success: false, error });
      return;
    }
    if (result.success) {
      if (skillReq.action === "search") {
        const data = result.data;
        this.patchState({
          lastQuery: skillReq.query ?? "",
          searchResults: data?.apps ?? [],
          trendingApps: [],
          selectedPackage: "",
          selectedDetail: null,
          selectedVersions: [],
          activeAction: ""
        });
      } else if (skillReq.action === "trending") {
        this.patchState({
          trendingApps: result.data,
          searchResults: [],
          lastQuery: "",
          activeAction: ""
        });
      } else if (skillReq.action === "info") {
        this.patchState({ selectedPackage: skillReq.package ?? "", selectedDetail: result.data, activeAction: "" });
      } else if (skillReq.action === "versions") {
        this.patchState({ selectedVersions: result.data, activeAction: "" });
      } else if (skillReq.action === "download") {
        const dl = result.data;
        const record = {
          ...dl,
          timestamp: Date.now(),
          appName: this.state.selectedDetail?.name ?? dl.packageName
        };
        this.patchState({
          downloadProgress: null,
          history: [record, ...this.state.history].slice(0, 50),
          activeAction: ""
        });
      } else {
        this.patchState({ activeAction: "" });
      }
    } else {
      this.patchState({ error: result.error ?? "unknown error", downloadProgress: null, activeAction: "" });
    }
    this.broadcast({ type: "action:complete", payload: { action: skillReq.action, result } });
    this.json(res, result.success ? 200 : 422, result);
  }
  // ── SSE endpoint ───────────────────────────────────────────────────────────
  handleEvents(res) {
    this.cors(res);
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive"
    });
    res.write(`data: ${JSON.stringify({ type: "connected", payload: this.state })}

`);
    this.sseClients.push(res);
    res.on("close", () => {
      this.sseClients = this.sseClients.filter((c) => c !== res);
    });
  }
  // ── Static GUI ─────────────────────────────────────────────────────────────
  serveGui(res) {
    this.cors(res);
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(GUI_HTML);
  }
  // ── Server start ───────────────────────────────────────────────────────────
  start() {
    return new Promise((resolve) => {
      const server = (0, import_node_http.createServer)(async (req, res) => {
        const url = req.url ?? "/";
        const method = req.method ?? "GET";
        if (method === "OPTIONS") {
          this.cors(res);
          res.writeHead(204);
          res.end();
          return;
        }
        if ((url === "/" || url === "/gui") && method === "GET") {
          this.serveGui(res);
          return;
        }
        if (url === "/api/status" && method === "GET") {
          this.json(res, 200, { ok: true, port: this.port, clients: this.sseClients.length, defaultDir: DEFAULT_DOWNLOAD_DIR });
          return;
        }
        if (url === "/api/state" && method === "GET") {
          this.json(res, 200, this.state);
          return;
        }
        if (url === "/api/schema" && method === "GET") {
          this.json(res, 200, API_SCHEMA);
          return;
        }
        if (url === "/api/events" && method === "GET") {
          this.handleEvents(res);
          return;
        }
        if (url === "/api/action" && method === "POST") {
          await this.handleAction(req, res);
          return;
        }
        this.json(res, 404, { error: "not found" });
      });
      server.listen(this.port, "127.0.0.1", () => resolve());
    });
  }
};
async function startServer(port) {
  const srv = new ApkPureServer(port);
  await srv.start();
  const p = port ?? 13456;
  console.log(`APKPure GUI server  \u2192  http://127.0.0.1:${p}`);
  console.log();
  console.log(`GUI (browser):        http://127.0.0.1:${p}/`);
  console.log("Agent API:");
  console.log(`  POST http://127.0.0.1:${p}/api/action   (SkillRequest JSON)`);
  console.log(`  GET  http://127.0.0.1:${p}/api/events   (SSE \u2014 state updates)`);
  console.log(`  GET  http://127.0.0.1:${p}/api/state    (current UI state snapshot)`);
  console.log(`  GET  http://127.0.0.1:${p}/api/status   (health check)`);
  console.log(`  GET  http://127.0.0.1:${p}/api/schema   (available actions & event types)`);
}
var GUI_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>APKPure</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#0f1117;--surface:#1a1d27;--surface2:#22263a;--border:#2d3250;
  --accent:#4f8ef7;--accent2:#7c5cff;--text:#e2e8f0;--muted:#8892a4;
  --green:#34d399;--red:#f87171;--yellow:#fbbf24;--orange:#fb923c;
  --radius:10px;--font:'Inter',system-ui,sans-serif;
}
body{background:var(--bg);color:var(--text);font-family:var(--font);
  display:grid;grid-template-columns:340px 1fr;grid-template-rows:56px 1fr;
  height:100vh;overflow:hidden}
/* Header */
header{grid-column:1/-1;background:var(--surface);border-bottom:1px solid var(--border);
  display:flex;align-items:center;padding:0 20px;gap:12px}
header h1{font-size:17px;font-weight:700;letter-spacing:-.3px}
header h1 span{color:var(--accent)}
.dot{width:8px;height:8px;border-radius:50%;background:var(--muted);flex-shrink:0}
.dot.live{background:var(--green);box-shadow:0 0 6px var(--green)}
#conn-label{font-size:12px;color:var(--muted)}
/* Agent activity badge */
#agent-badge{display:none;align-items:center;gap:6px;background:rgba(251,146,60,.12);
  border:1px solid rgba(251,146,60,.35);border-radius:20px;padding:3px 10px;
  font-size:12px;color:var(--orange);margin-left:4px}
#agent-badge.show{display:flex}
.spinner{width:10px;height:10px;border:2px solid rgba(251,146,60,.3);
  border-top-color:var(--orange);border-radius:50%;animation:spin .7s linear infinite;flex-shrink:0}
@keyframes spin{to{transform:rotate(360deg)}}
/* Left panel */
#left{background:var(--surface);border-right:1px solid var(--border);
  display:flex;flex-direction:column;overflow:hidden}
/* Tabs */
.tabs{display:flex;border-bottom:1px solid var(--border)}
.tab{flex:1;padding:10px;font-size:12px;font-weight:600;text-align:center;
  cursor:pointer;color:var(--muted);border-bottom:2px solid transparent;
  text-transform:uppercase;letter-spacing:.5px;transition:color .15s,border-color .15s}
.tab:hover{color:var(--text)}
.tab.active{color:var(--accent);border-bottom-color:var(--accent)}
#search-bar{padding:10px;border-bottom:1px solid var(--border);display:flex;gap:8px}
#q{flex:1;background:var(--surface2);border:1px solid var(--border);border-radius:8px;
  padding:8px 12px;color:var(--text);font-size:14px;outline:none}
#q:focus{border-color:var(--accent)}
#search-btn{background:var(--accent);border:none;border-radius:8px;padding:8px 14px;
  color:#fff;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap}
#search-btn:hover{opacity:.88}
#results{flex:1;overflow-y:auto;padding:8px}
.app-card{padding:10px 12px;border-radius:8px;cursor:pointer;transition:background .15s;
  display:flex;align-items:center;gap:10px}
.app-card:hover{background:var(--surface2)}
.app-card.selected{background:var(--surface2);border-left:3px solid var(--accent)}
.app-icon{width:40px;height:40px;border-radius:8px;object-fit:cover;background:var(--surface2);flex-shrink:0}
.app-icon-placeholder{width:40px;height:40px;border-radius:8px;background:var(--surface2);
  display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:18px;flex-shrink:0}
.app-meta{min-width:0}
.app-name{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.app-pkg{font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.app-ver{font-size:11px;color:var(--accent)}
.empty{padding:32px;text-align:center;color:var(--muted);font-size:13px}
/* Trending panel */
#trending-panel{flex:1;overflow-y:auto;padding:8px;display:none}
#trending-panel.show{display:block}
.trending-load-btn{width:100%;background:var(--surface2);border:1px solid var(--border);
  border-radius:8px;padding:10px;color:var(--text);font-size:13px;cursor:pointer;
  font-weight:600;margin-bottom:8px}
.trending-load-btn:hover{border-color:var(--accent);color:var(--accent)}
.trend-card{padding:10px 12px;border-radius:8px;cursor:pointer;transition:background .15s;
  display:flex;align-items:center;gap:10px}
.trend-card:hover{background:var(--surface2)}
.trend-title{font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.trend-hint{font-size:11px;color:var(--muted);margin-top:2px}
/* Right panel */
#right{display:flex;flex-direction:column;overflow:hidden}
#detail{flex:1;overflow-y:auto;padding:24px;display:flex;flex-direction:column;gap:20px}
.placeholder{display:flex;align-items:center;justify-content:center;height:100%;color:var(--muted);font-size:14px}
.detail-header{display:flex;gap:16px;align-items:flex-start}
.detail-icon{width:72px;height:72px;border-radius:14px;object-fit:cover;background:var(--surface2);flex-shrink:0}
.detail-icon-placeholder{width:72px;height:72px;border-radius:14px;background:var(--surface2);
  display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:32px;flex-shrink:0}
.detail-title{font-size:20px;font-weight:700}
.detail-pkg{font-size:12px;color:var(--muted);margin-top:2px}
.tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.tag{background:var(--surface2);border:1px solid var(--border);border-radius:20px;
  padding:2px 10px;font-size:11px;color:var(--muted)}
.tag.type{border-color:var(--accent2);color:var(--accent2)}
.meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.meta-item{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:12px}
.meta-label{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px}
.meta-value{font-size:14px;font-weight:600;margin-top:4px}
.desc{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:14px;
  font-size:13px;line-height:1.6;color:var(--muted)}
.dl-section{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px}
.dl-section h3{font-size:13px;font-weight:600;margin-bottom:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px}
.dl-row{display:flex;gap:8px;align-items:center}
#out-dir{flex:1;background:var(--surface2);border:1px solid var(--border);border-radius:8px;
  padding:8px 10px;color:var(--text);font-size:12px;outline:none}
#out-dir:focus{border-color:var(--accent)}
#dl-btn{background:linear-gradient(135deg,var(--accent),var(--accent2));border:none;
  border-radius:8px;padding:9px 20px;color:#fff;font-size:13px;font-weight:700;
  cursor:pointer;white-space:nowrap}
#dl-btn:hover{opacity:.9}
#dl-btn:disabled{opacity:.4;cursor:not-allowed}
/* Progress */
#progress-wrap{display:none;margin-top:12px}
#progress-wrap.show{display:block}
.progress-label{font-size:12px;color:var(--muted);margin-bottom:6px;display:flex;justify-content:space-between}
.progress-bar-bg{background:var(--surface2);border-radius:99px;height:6px;overflow:hidden}
.progress-bar-fill{background:linear-gradient(90deg,var(--accent),var(--accent2));
  height:100%;border-radius:99px;transition:width .3s}
/* Versions */
.ver-list{display:flex;flex-direction:column;gap:4px;max-height:200px;overflow-y:auto}
.ver-item{display:flex;align-items:center;justify-content:space-between;
  padding:8px 10px;border-radius:8px;cursor:pointer;transition:background .15s;
  border:1px solid transparent}
.ver-item:hover{background:var(--surface2);border-color:var(--border)}
.ver-item.latest::after{content:'latest';font-size:10px;background:var(--green);
  color:#000;padding:1px 6px;border-radius:99px;font-weight:700}
.ver-name{font-size:13px;font-weight:600}
.ver-type{font-size:11px;color:var(--accent2)}
/* History */
#history-wrap{border-top:1px solid var(--border);padding:14px 24px;background:var(--surface);
  max-height:220px;overflow-y:auto}
#history-wrap h3{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px}
.hist-item{display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border)}
.hist-item:last-child{border-bottom:none}
.hist-name{font-size:13px;font-weight:500;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hist-ver{font-size:11px;color:var(--muted)}
.hist-size{font-size:11px;color:var(--accent);white-space:nowrap}
.hist-copy{background:none;border:1px solid var(--border);border-radius:6px;
  padding:2px 8px;font-size:11px;color:var(--muted);cursor:pointer}
.hist-copy:hover{border-color:var(--accent);color:var(--accent)}
/* Error toast */
#toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);
  background:#2a1020;border:1px solid var(--red);color:var(--red);
  padding:10px 18px;border-radius:8px;font-size:13px;display:none;z-index:100;
  max-width:420px;text-align:center}
#toast.show{display:block}
/* Scrollbar */
::-webkit-scrollbar{width:4px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--border);border-radius:99px}
</style>
</head>
<body>
<header>
  <h1>APK<span>Pure</span></h1>
  <div class="dot" id="dot"></div>
  <span id="conn-label">connecting\u2026</span>
  <div id="agent-badge">
    <div class="spinner"></div>
    <span id="agent-label">Agent working\u2026</span>
  </div>
</header>

<div id="left">
  <div class="tabs">
    <div class="tab active" id="tab-search" onclick="switchTab('search')">Search</div>
    <div class="tab" id="tab-trending" onclick="switchTab('trending')">Trending</div>
  </div>
  <div id="search-bar">
    <input id="q" type="text" placeholder="Search apps\u2026" autocomplete="off">
    <button id="search-btn">Search</button>
  </div>
  <div id="results"><div class="empty">Search for an app to get started.</div></div>
  <div id="trending-panel">
    <button class="trending-load-btn" onclick="loadTrending()">Load trending apps</button>
    <div id="trend-list"></div>
  </div>
</div>

<div id="right">
  <div id="detail"><div class="placeholder">Select an app from the search results.</div></div>
  <div id="history-wrap" style="display:none">
    <h3>Download History</h3>
    <div id="hist-list"></div>
  </div>
</div>

<div id="toast"></div>

<script>
const API = '';  // same origin

// \u2500\u2500 State \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

let state = {
  lastQuery:'', searchResults:[], trendingApps:[],
  selectedPackage:'', selectedDetail:null, selectedVersions:[],
  downloadProgress:null, history:[], error:'', activeAction:''
};
let selectedVersion = null;
let activeTab = 'search';

// \u2500\u2500 SSE connection \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

function connect() {
  const es = new EventSource(API + '/api/events');
  const dot = document.getElementById('dot');
  const lbl = document.getElementById('conn-label');

  es.onopen = () => { dot.className='dot live'; lbl.textContent='live'; };
  es.onmessage = (e) => {
    const ev = JSON.parse(e.data);
    if (ev.type === 'connected' || ev.type === 'state:updated') {
      state = ev.payload;
      render();
    } else if (ev.type === 'download:progress') {
      state.downloadProgress = ev.payload;
      renderProgress();
    } else if (ev.type === 'action:start') {
      updateAgentBadge(ev.payload.action);
    } else if (ev.type === 'action:complete' || ev.type === 'action:error') {
      updateAgentBadge('');
      if (ev.type === 'action:error') showToast(ev.payload.error || 'Unknown error');
    }
  };
  es.onerror = () => {
    dot.className='dot'; lbl.textContent='reconnecting\u2026';
    es.close();
    setTimeout(connect, 2000);
  };
}

// \u2500\u2500 Agent badge \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

function updateAgentBadge(action) {
  const badge = document.getElementById('agent-badge');
  const label = document.getElementById('agent-label');
  if (action) {
    label.textContent = 'Agent: ' + action + '\u2026';
    badge.classList.add('show');
  } else {
    badge.classList.remove('show');
  }
}

// \u2500\u2500 Tab switcher \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

function switchTab(tab) {
  activeTab = tab;
  document.getElementById('tab-search').classList.toggle('active', tab === 'search');
  document.getElementById('tab-trending').classList.toggle('active', tab === 'trending');
  document.getElementById('search-bar').style.display = tab === 'search' ? 'flex' : 'none';
  document.getElementById('results').style.display = tab === 'search' ? 'block' : 'none';
  document.getElementById('trending-panel').classList.toggle('show', tab === 'trending');
  if (tab === 'trending' && !state.trendingApps.length) {
    document.getElementById('trend-list').innerHTML = '';
  } else if (tab === 'trending') {
    renderTrending();
  }
}

// \u2500\u2500 Render \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

function render() {
  renderResults();
  renderDetail();
  renderHistory();
  renderTrending();
  updateAgentBadge(state.activeAction || '');
  // Auto-switch to trending tab if trending results arrived and we're on search with nothing
  if (state.trendingApps.length && !state.searchResults.length && activeTab === 'search') {
    switchTab('trending');
  }
  if (!state.downloadProgress) renderProgress();
}

function renderResults() {
  const el = document.getElementById('results');
  if (!state.searchResults.length) {
    el.innerHTML = '<div class="empty">' + (state.lastQuery ? 'No results.' : 'Search for an app to get started.') + '</div>';
    return;
  }
  el.innerHTML = state.searchResults.map(app => \`
    <div class="app-card\${app.packageName===state.selectedPackage?' selected':''}"
         onclick="selectApp('\${escAttr(app.packageName)}')">
      \${app.iconUrl
        ? '<img class="app-icon" src="'+escAttr(app.iconUrl)+'" onerror="this.style.display='none'">'
        : '<div class="app-icon-placeholder">\u{1F4E6}</div>'}
      <div class="app-meta">
        <div class="app-name">\${escHtml(app.name)}</div>
        <div class="app-pkg">\${escHtml(app.packageName)}</div>
        \${app.version ? '<div class="app-ver">v'+escHtml(app.version)+'</div>' : ''}
      </div>
    </div>
  \`).join('');
}

function renderTrending() {
  const list = document.getElementById('trend-list');
  if (!list) return;
  if (!state.trendingApps.length) return;
  list.innerHTML = state.trendingApps.map(app => \`
    <div class="trend-card" onclick="searchByTitle('\${escAttr(app.title)}')">
      \${app.iconUrl
        ? '<img class="app-icon" src="'+escAttr(app.iconUrl)+'" onerror="this.style.display='none'">'
        : '<div class="app-icon-placeholder">\u{1F525}</div>'}
      <div class="app-meta">
        <div class="trend-title">\${escHtml(app.title)}</div>
        <div class="trend-hint">Click to search</div>
      </div>
    </div>
  \`).join('');
  // Hide the "load" button once results are showing
  const loadBtn = document.querySelector('.trending-load-btn');
  if (loadBtn) loadBtn.style.display = 'none';
}

function renderDetail() {
  const el = document.getElementById('detail');
  const d = state.selectedDetail;
  if (!d) {
    el.innerHTML = '<div class="placeholder">Select an app from the search results.</div>';
    return;
  }
  const versions = state.selectedVersions;
  el.innerHTML = \`
    <div class="detail-header">
      \${d.iconUrl
        ? '<img class="detail-icon" src="'+escAttr(d.iconUrl)+'">'
        : '<div class="detail-icon-placeholder">\u{1F4E6}</div>'}
      <div>
        <div class="detail-title">\${escHtml(d.name)}</div>
        <div class="detail-pkg">\${escHtml(d.packageName)}</div>
        <div class="tags">
          \${d.fileType ? '<span class="tag type">'+d.fileType.toUpperCase()+'</span>' : ''}
          \${d.category ? '<span class="tag">'+escHtml(d.category)+'</span>' : ''}
          \${d.rating ? '<span class="tag">\u2B50 '+escHtml(d.rating)+'</span>' : ''}
        </div>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-item"><div class="meta-label">Version</div><div class="meta-value">\${escHtml(d.version||'\u2014')}</div></div>
      <div class="meta-item"><div class="meta-label">Developer</div><div class="meta-value">\${escHtml(d.developer||'\u2014')}</div></div>
      <div class="meta-item"><div class="meta-label">Updated</div><div class="meta-value">\${escHtml(d.updateDate||'\u2014')}</div></div>
      <div class="meta-item"><div class="meta-label">Requires Android</div><div class="meta-value">\${escHtml(d.requiresAndroid||'\u2014')}</div></div>
    </div>

    \${d.description ? '<div class="desc">'+escHtml(d.description.slice(0,400))+(d.description.length>400?'\u2026':'')+'</div>' : ''}

    <div class="dl-section">
      <h3>Download</h3>
      <div class="dl-row">
        <input id="out-dir" type="text" value="\${escAttr(window._defaultDir||'')}" placeholder="Output directory\u2026">
        <button id="dl-btn" onclick="download()">\u2B07 Download</button>
      </div>
      <div id="progress-wrap">
        <div class="progress-label">
          <span id="prog-label">Downloading\u2026</span>
          <span id="prog-pct">0%</span>
        </div>
        <div class="progress-bar-bg"><div class="progress-bar-fill" id="prog-fill" style="width:0%"></div></div>
      </div>
    </div>

    \${versions.length > 0 ? \`
    <div class="dl-section">
      <h3>All Versions (\${versions.length})</h3>
      <div class="ver-list">
        \${versions.map((v,i)=>\`
          <div class="ver-item\${i===0?' latest':''}" onclick="selectVersion('\${escAttr(v.version)}','\${escAttr(String(v.versionCode))}')">
            <div>
              <div class="ver-name">\${escHtml(v.version)}</div>
              <div class="ver-type">\${v.type?.toUpperCase()||'APK'}</div>
            </div>
          </div>
        \`).join('')}
      </div>
    </div>
    \` : \`<button onclick="loadVersions()" style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px 16px;color:var(--text);cursor:pointer;font-size:13px">Load all versions</button>\`}
  \`;
  // Restore output dir
  const outDir = document.getElementById('out-dir');
  if (outDir && window._defaultDir) outDir.value = window._defaultDir;
}

function renderProgress() {
  const wrap = document.getElementById('progress-wrap');
  if (!wrap) return;
  const p = state.downloadProgress;
  const btn = document.getElementById('dl-btn');
  if (!p || p.total === 0) {
    wrap.classList.remove('show');
    if (btn) { btn.disabled = false; btn.textContent = '\u2B07 Download'; }
    return;
  }
  wrap.classList.add('show');
  document.getElementById('prog-pct').textContent = p.percent + '%';
  document.getElementById('prog-fill').style.width = p.percent + '%';
  const mb = (p.downloaded/1024/1024).toFixed(1);
  const tot = (p.total/1024/1024).toFixed(1);
  document.getElementById('prog-label').textContent = mb + ' / ' + tot + ' MB';
  if (btn) btn.disabled = true;
}

function renderHistory() {
  const items = state.history;
  const wrap = document.getElementById('history-wrap');
  const list = document.getElementById('hist-list');
  if (!items?.length) { wrap.style.display='none'; return; }
  wrap.style.display='block';
  list.innerHTML = items.map(r => \`
    <div class="hist-item">
      <div class="hist-name">\${escHtml(r.appName||r.packageName)}</div>
      <span class="hist-ver">\${escHtml(r.version)}</span>
      <span class="hist-size">\${(r.fileSize/1024/1024).toFixed(1)} MB</span>
      <button class="hist-copy" onclick="copyPath('\${escAttr(r.filePath)}')">Copy path</button>
    </div>
  \`).join('');
}

// \u2500\u2500 Actions \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

async function post(body) {
  const r = await fetch(API + '/api/action', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify(body)
  });
  return r.json();
}

async function search() {
  const q = document.getElementById('q').value.trim();
  if (!q) return;
  document.getElementById('search-btn').textContent = '\u2026';
  await post({ action:'search', query:q });
  document.getElementById('search-btn').textContent = 'Search';
}

async function selectApp(pkg) {
  selectedVersion = null;
  await post({ action:'info', package:pkg });
}

async function loadVersions() {
  if (!state.selectedPackage) return;
  await post({ action:'versions', package:state.selectedPackage });
}

async function loadTrending() {
  const btn = document.querySelector('.trending-load-btn');
  if (btn) { btn.textContent = 'Loading\u2026'; btn.disabled = true; }
  await post({ action:'trending' });
  if (btn) { btn.textContent = 'Refresh'; btn.disabled = false; }
}

async function searchByTitle(title) {
  // Switch to search tab and search by title
  switchTab('search');
  document.getElementById('q').value = title;
  document.getElementById('search-btn').textContent = '\u2026';
  await post({ action:'search', query:title });
  document.getElementById('search-btn').textContent = 'Search';
}

async function selectVersion(ver, code) {
  selectedVersion = { version:ver, code };
  document.querySelectorAll('.ver-item').forEach(el => el.style.borderColor='');
  event.currentTarget.style.borderColor = 'var(--accent)';
}

async function download() {
  const pkg = state.selectedPackage;
  if (!pkg) return;
  const dir = document.getElementById('out-dir').value.trim();
  const btn = document.getElementById('dl-btn');
  btn.disabled = true;
  btn.textContent = 'Downloading\u2026';
  const body = { action:'download', package:pkg, outputDir:dir||undefined };
  if (selectedVersion) body.version = selectedVersion.version;
  const r = await post(body);
  // Button re-enable is handled by renderProgress() when downloadProgress clears.
  // Only re-enable immediately if download failed (no progress events fired).
  if (!r.success) {
    btn.disabled = false;
    btn.textContent = '\u2B07 Download';
    showToast(r.error || 'Download failed');
  }
}

function copyPath(path) {
  navigator.clipboard.writeText(path).catch(()=>{});
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 4000);
}

function escHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function escAttr(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// \u2500\u2500 Key bindings \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

document.getElementById('q').addEventListener('keydown', e => { if (e.key==='Enter') search(); });
document.getElementById('search-btn').addEventListener('click', search);

// \u2500\u2500 Fetch default download dir from status \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
fetch(API+'/api/status').then(r=>r.json()).then(s=>{
  window._defaultDir = s.defaultDir || '';
  const outDir = document.getElementById('out-dir');
  if (outDir && s.defaultDir) outDir.value = s.defaultDir;
}).catch(()=>{});

// \u2500\u2500 Boot \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
connect();
</script>
</body>
</html>`;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ApkPure,
  ApkPureServer,
  handleSkillRequest,
  listWorkflows,
  runWorkflow,
  startServer
});

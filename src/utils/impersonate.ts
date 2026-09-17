/**
 * TLS-fingerprint impersonation transport.
 *
 * APKPure's website (apkpure.com) sits behind Cloudflare, which fingerprints the
 * TLS ClientHello (JA3/JA4). Node's built-in TLS stack (OpenSSL) cannot reproduce
 * a real Chrome/BoringSSL ClientHello — no GREASE, wrong extension set/order — so
 * Cloudflare flags it as a bot and resets the connection or serves a JS challenge.
 *
 * To actually pass the fingerprint check we shell out to a real impersonation
 * backend when one is available on the machine:
 *
 *   1. curl-impersonate  — a patched curl linked against BoringSSL (browser JA3/JA4).
 *   2. curl_cffi         — Python bindings around curl-impersonate (pip install curl_cffi).
 *
 * Both produce a byte-perfect Chrome ClientHello. When neither is present we fall
 * back to Node (see http.ts), which works when the target is NOT in strict-JA3 mode
 * (e.g. the mobile API, or apkpure behind a residential proxy).
 *
 * Backend selection can be forced with the APKPURE_IMPERSONATE env var:
 *   auto (default) | node | curl_cffi | curl-impersonate | <path-to-binary>
 * The impersonation target defaults to "chrome" and can be set with
 * APKPURE_IMPERSONATE_TARGET (e.g. chrome131, chrome124, edge101).
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtempSync, readFileSync, rmSync, statSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";

const execFileP = promisify(execFile);

/**
 * Run a subprocess and, on failure, throw a *concise* error. execFile's default
 * error stringifies the entire command (including our embedded Python script),
 * which is unreadable — extract just the last meaningful stderr line instead.
 */
async function runProcess(
  cmd: string,
  args: string[],
  options: Parameters<typeof execFileP>[2],
  label: string
): Promise<{ stdout: string; stderr: string }> {
  try {
    const res = await execFileP(cmd, args, options);
    return { stdout: res.stdout.toString(), stderr: res.stderr.toString() };
  } catch (err) {
    const e = err as { stderr?: string | Buffer; message?: string; killed?: boolean };
    if (e.killed) throw new Error(`${label} timed out`);
    const stderr = (e.stderr ? e.stderr.toString() : "").trim();
    const lastLine = stderr.split(/\r?\n/).filter(Boolean).pop();
    throw new Error(`${label} failed: ${lastLine || e.message || "unknown error"}`);
  }
}

export type BackendKind = "curl-impersonate" | "curl_cffi" | "node";

export interface Backend {
  kind: BackendKind;
  /** binary path (curl-impersonate) or python executable (curl_cffi) */
  cmd?: string;
  /** human description for `doctor` */
  detail: string;
}

export interface ImpersonateResponse {
  status: number;
  headers: Record<string, string>;
  body: Buffer;
}

export interface ImpersonateOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  proxy?: string;
  timeout?: number;
}

const CANDIDATE_BINARIES = [
  "curl_chrome131",
  "curl_chrome124",
  "curl_chrome123",
  "curl_chrome116",
  "curl_chrome110",
  "curl_chrome104",
  "curl-impersonate-chrome",
  "curl-impersonate",
];

const PYTHON_CANDIDATES = ["python3", "python"];

function impersonateTarget(): string {
  return process.env.APKPURE_IMPERSONATE_TARGET || "chrome";
}

let cachedBackend: Backend | undefined;

async function commandExists(cmd: string): Promise<string | null> {
  try {
    // `which`/`command -v` returns the resolved path on success.
    const { stdout } = await execFileP("sh", ["-c", `command -v ${cmd}`], {
      timeout: 4000,
    });
    const path = stdout.trim().split("\n")[0];
    return path || null;
  } catch {
    return null;
  }
}

async function pythonWithCurlCffi(): Promise<string | null> {
  for (const py of PYTHON_CANDIDATES) {
    try {
      await execFileP(py, ["-c", "import curl_cffi"], { timeout: 6000 });
      return py;
    } catch {
      // try next
    }
  }
  return null;
}

/** Detect the best available impersonation backend (cached for the process). */
export async function detectBackend(): Promise<Backend> {
  if (cachedBackend) return cachedBackend;

  const forced = (process.env.APKPURE_IMPERSONATE || "auto").trim();

  if (forced === "node") {
    cachedBackend = { kind: "node", detail: "forced via APKPURE_IMPERSONATE=node" };
    return cachedBackend;
  }

  // Explicit binary path or name.
  if (forced && forced !== "auto" && forced !== "curl_cffi" && forced !== "curl-impersonate") {
    const path = forced.includes("/") ? forced : await commandExists(forced);
    if (path) {
      cachedBackend = { kind: "curl-impersonate", cmd: path, detail: `forced binary: ${path}` };
      return cachedBackend;
    }
  }

  const wantCurlCffi = forced === "auto" || forced === "curl_cffi";
  const wantBinary = forced === "auto" || forced === "curl-impersonate";

  // Prefer the standalone binary — no interpreter startup cost per request.
  if (wantBinary) {
    for (const name of CANDIDATE_BINARIES) {
      const path = await commandExists(name);
      if (path) {
        cachedBackend = {
          kind: "curl-impersonate",
          cmd: path,
          detail: `curl-impersonate binary (${name})`,
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
    detail: "no impersonation backend found — using Node (may hit Cloudflare)",
  };
  return cachedBackend;
}

/** Reset detection cache (used by tests). */
export function resetBackendCache(): void {
  cachedBackend = undefined;
}

/** True when a real TLS-impersonation backend is available. */
export async function hasImpersonation(): Promise<boolean> {
  const b = await detectBackend();
  return b.kind !== "node";
}

const PY_RUNNER = `
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

async function requestViaCurlCffi(
  py: string,
  url: string,
  outFile: string,
  opts: ImpersonateOptions
): Promise<ImpersonateResponse> {
  const env = {
    ...process.env,
    APK_HEADERS: JSON.stringify(opts.headers ?? {}),
    APK_IMPERSONATE: impersonateTarget(),
    APK_TIMEOUT: String((opts.timeout ?? 30000) / 1000),
    ...(opts.body != null ? { APK_BODY: opts.body } : {}),
    ...(opts.proxy ? { APK_PROXY: opts.proxy } : {}),
  };
  const { stdout } = await runProcess(
    py,
    ["-c", PY_RUNNER, url, opts.method ?? "GET", outFile],
    { env, timeout: (opts.timeout ?? 30000) + 5000, maxBuffer: 8 * 1024 * 1024 },
    "curl_cffi request"
  );
  const meta = JSON.parse(stdout) as { status: number; headers: Record<string, string> };
  const body = readFileSync(outFile);
  return { status: meta.status, headers: meta.headers, body };
}

function parseHeaderDump(dump: string): Record<string, string> {
  // Keep only the final response block (after the last blank-line separator),
  // so redirect hops don't clobber the real headers.
  const blocks = dump.split(/\r?\n\r?\n/).filter((b) => /^HTTP\//m.test(b));
  const last = blocks[blocks.length - 1] ?? dump;
  const headers: Record<string, string> = {};
  for (const line of last.split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx > 0) headers[line.slice(0, idx).trim().toLowerCase()] = line.slice(idx + 1).trim();
  }
  return headers;
}

async function requestViaBinary(
  bin: string,
  url: string,
  outFile: string,
  opts: ImpersonateOptions
): Promise<ImpersonateResponse> {
  const headerDump = outFile + ".hdr";
  const args = [
    "-sS",
    "-L",
    "--max-time",
    String(Math.ceil((opts.timeout ?? 30000) / 1000)),
    "-o",
    outFile,
    "-D",
    headerDump,
    "-w",
    "%{http_code}",
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
    { timeout: (opts.timeout ?? 30000) + 5000, maxBuffer: 8 * 1024 * 1024 },
    "curl-impersonate request"
  );
  const status = parseInt(stdout.trim().slice(-3), 10) || 0;
  let headers: Record<string, string> = {};
  try {
    headers = parseHeaderDump(readFileSync(headerDump, "utf-8"));
  } catch {
    /* header dump optional */
  } finally {
    try {
      rmSync(headerDump, { force: true });
    } catch {
      /* ignore */
    }
  }
  const body = readFileSync(outFile);
  return { status, headers, body };
}

/**
 * Perform an HTTP request through the impersonation backend.
 * Throws if the detected backend is "node" (caller should fall back).
 */
export async function impersonateRequest(
  url: string,
  opts: ImpersonateOptions = {}
): Promise<ImpersonateResponse> {
  const backend = await detectBackend();
  if (backend.kind === "node") {
    throw new Error("no impersonation backend");
  }
  const dir = mkdtempSync(join(tmpdir(), "apkpure-imp-"));
  const outFile = join(dir, "resp.bin");
  try {
    if (backend.kind === "curl_cffi") {
      return await requestViaCurlCffi(backend.cmd!, url, outFile, opts);
    }
    return await requestViaBinary(backend.cmd!, url, outFile, opts);
  } finally {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

/** Convenience: return the response body as text. */
export async function impersonateText(
  url: string,
  opts: ImpersonateOptions = {}
): Promise<{ status: number; text: string; headers: Record<string, string> }> {
  const resp = await impersonateRequest(url, opts);
  return { status: resp.status, text: resp.body.toString("utf-8"), headers: resp.headers };
}

/**
 * Download a URL to a file through the impersonation backend.
 * Returns the number of bytes written. Progress is reported once on completion
 * (byte-level streaming isn't available across the subprocess boundary).
 */
export async function impersonateDownload(
  url: string,
  destPath: string,
  opts: { headers?: Record<string, string>; proxy?: string; timeout?: number } = {}
): Promise<number> {
  const backend = await detectBackend();
  if (backend.kind === "node") {
    throw new Error("no impersonation backend");
  }
  mkdirSync(dirname(destPath), { recursive: true });
  const timeout = opts.timeout ?? 300000;

  if (backend.kind === "curl_cffi") {
    await requestViaCurlCffi(backend.cmd!, url, destPath, {
      method: "GET",
      headers: opts.headers,
      proxy: opts.proxy,
      timeout,
    });
  } else {
    const headerDump = destPath + ".hdr";
    const args = [
      "-sS",
      "-L",
      "--max-time",
      String(Math.ceil(timeout / 1000)),
      "-o",
      destPath,
      "-D",
      headerDump,
      "-w",
      "%{http_code}",
    ];
    if (opts.proxy) args.push("-x", opts.proxy);
    for (const [k, v] of Object.entries(opts.headers ?? {})) args.push("-H", `${k}: ${v}`);
    args.push(url);
    const { stdout } = await runProcess(
      backend.cmd!,
      args,
      { timeout: timeout + 5000, maxBuffer: 1024 * 1024 },
      "curl-impersonate download"
    );
    const status = parseInt(stdout.trim().slice(-3), 10) || 0;
    try {
      rmSync(headerDump, { force: true });
    } catch {
      /* ignore */
    }
    if (status >= 400 || status === 0) {
      throw new Error(`Download failed: HTTP ${status} for ${url}`);
    }
  }

  return statSync(destPath).size;
}

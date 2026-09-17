/**
 * Robust web transport for apkpure.com (Cloudflare-protected).
 *
 * Strategy: try a real TLS-impersonation backend first (curl-impersonate /
 * curl_cffi — see impersonate.ts) which passes Cloudflare's JA3/JA4 fingerprint
 * check; fall back to Node fetch with a full browser header set (works when the
 * target isn't in strict-JA3 mode, e.g. behind a residential proxy). Both paths
 * retry with backoff and detect Cloudflare challenge pages so failures are
 * reported with an actionable message instead of silently returning junk HTML.
 */
import { fetchText, downloadFile } from "./http.js";
import {
  impersonateText,
  impersonateDownload,
  detectBackend,
} from "./impersonate.js";
import { WEB_BASE_URL } from "../config.js";

const CHROME_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/** Full header set for the Node fallback (impersonation backends set their own). */
export const NODE_BROWSER_HEADERS: Record<string, string> = {
  "User-Agent": CHROME_UA,
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "sec-ch-ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
};

/** Minimal extras for the impersonation path (backend already sets UA + sec-ch-*). */
const IMP_EXTRA_HEADERS: Record<string, string> = {
  "Accept-Language": "en-US,en;q=0.9",
  Referer: WEB_BASE_URL + "/",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Heuristic: does this look like a Cloudflare interstitial rather than real content? */
export function isCloudflareBlock(status: number, body: string): boolean {
  if (status === 403 || status === 429 || status === 503) {
    return /cloudflare|cf-ray|just a moment|attention required|challenge-platform|cf_chl/i.test(
      body
    );
  }
  // Occasionally CF returns 200 with a challenge shell.
  if (/<title>\s*just a moment/i.test(body) || /cf_chl_opt/i.test(body)) return true;
  return false;
}

interface WebResult {
  status: number;
  text: string;
  viaImpersonation: boolean;
}

async function singleRequest(
  url: string,
  timeout: number,
  proxy: string
): Promise<WebResult> {
  const backend = await detectBackend();
  if (backend.kind !== "node") {
    try {
      const { status, text } = await impersonateText(url, {
        headers: IMP_EXTRA_HEADERS,
        proxy,
        timeout,
      });
      return { status, text, viaImpersonation: true };
    } catch (err) {
      // If the preferred impersonation backend fails (TLS/connection error),
      // fall back to plain Node fetch for this attempt instead of hard-failing.
      const text = await fetchText(url, {
        headers: NODE_BROWSER_HEADERS,
        timeout,
        proxy,
      });
      return { status: 200, text, viaImpersonation: false };
    }
  }
  // Node fallback — no reliable status code from fetchText, treat as 200 and
  // let the Cloudflare heuristic catch challenge bodies.
  const text = await fetchText(url, {
    headers: NODE_BROWSER_HEADERS,
    timeout,
    proxy,
  });
  return { status: 200, text, viaImpersonation: false };
}

export interface WebFetchOptions {
  timeout?: number;
  proxy?: string;
  retries?: number;
}

/** Fetch an apkpure.com HTML page, defeating Cloudflare where possible. */
export async function webFetchHtml(
  url: string,
  opts: WebFetchOptions = {}
): Promise<string> {
  const timeout = opts.timeout ?? 30000;
  const proxy = opts.proxy ?? "";
  const retries = opts.retries ?? 2;

  const usingImpersonation = (await detectBackend()).kind !== "node";
  let lastErr: unknown;
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
        // 3xx without redirect resolution or empty — retry.
        lastErr = new Error(`Unexpected HTTP ${res.status} for ${url}`);
      }
    } catch (err) {
      lastErr = err;
    }
    if (attempt < retries) await sleep(600 * (attempt + 1) + Math.floor(Math.random() * 300));
  }

  // Without an impersonation backend, a Cloudflare-fronted host fails either as a
  // 403/challenge OR as a TLS reset ("fetch failed") — both mean the same fix.
  // Only suppress the hint when we clearly reached a non-CF HTTP error.
  const detail = lastErr instanceof Error ? lastErr.message : String(lastErr);
  if (!usingImpersonation) {
    throw new Error(
      `Request to ${url} failed (${detail}).\n` +
        `apkpure.com is behind Cloudflare, and no TLS-impersonation backend is ` +
        `installed — plain Node requests get fingerprinted and blocked. Install one:\n` +
        `  pip install curl_cffi        (recommended, cross-platform)\n` +
        `  or install curl-impersonate  (https://github.com/lwthiker/curl-impersonate)\n` +
        `Then re-run. Check backend status with: apkpure doctor`
    );
  }
  if (sawCloudflare) {
    throw new Error(
      `apkpure.com returned a Cloudflare challenge despite TLS impersonation (${detail}). ` +
        `Try a different target via APKPURE_IMPERSONATE_TARGET (e.g. chrome131), or route ` +
        `through a residential proxy with --proxy. Run: apkpure doctor`
    );
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

/** Download a file from apkpure/d.apkpure, impersonation-first with Node fallback. */
export async function webDownload(
  url: string,
  destPath: string,
  opts: {
    headers?: Record<string, string>;
    proxy?: string;
    timeout?: number;
    onProgress?: (downloaded: number, total: number) => void;
  } = {}
): Promise<number> {
  const backend = await detectBackend();
  const referer = { Referer: WEB_BASE_URL + "/", ...(opts.headers ?? {}) };

  if (backend.kind !== "node") {
    try {
      const size = await impersonateDownload(url, destPath, {
        headers: referer,
        proxy: opts.proxy,
        timeout: opts.timeout,
      });
      if (opts.onProgress && size > 0) opts.onProgress(size, size);
      return size;
    } catch {
      // Fallback to Node download if impersonation backend fails.
      return downloadFile(url, destPath, {
        headers: { "User-Agent": CHROME_UA, Accept: "*/*", ...referer },
        proxy: opts.proxy,
        onProgress: opts.onProgress,
      });
    }
  }

  return downloadFile(url, destPath, {
    headers: { "User-Agent": CHROME_UA, Accept: "*/*", ...referer },
    proxy: opts.proxy,
    onProgress: opts.onProgress,
  });
}

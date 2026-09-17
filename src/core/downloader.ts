import { mkdirSync, renameSync, statSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";
import { downloadFile } from "../utils/http.js";
import { webDownload } from "../utils/web.js";
import { sha256File } from "../utils/crypto.js";
import type { DownloadOptions, DownloadResult } from "../types/index.js";

const ANDROID_UA =
  "Dalvik/2.1.0 (Linux; U; Android 14; SM-G955F Build/AP2A.240805.005)";

/**
 * d.apkpure.com is a plain CDN (no Cloudflare JA3 gate) — plain Node fetch
 * works. Only fall back to webDownload (TLS impersonation) if the direct
 * attempt fails, so the mobile-API path works without curl_cffi/curl-impersonate.
 */
async function fetchApkFile(
  url: string,
  tmpPath: string,
  proxy: string,
  onProgress?: (d: number, t: number) => void
): Promise<void> {
  try {
    await downloadFile(url, tmpPath, {
      headers: { "User-Agent": ANDROID_UA, Accept: "*/*" },
      proxy,
      onProgress,
    });
  } catch {
    if (existsSync(tmpPath)) try { unlinkSync(tmpPath); } catch { /* ignore */ }
    await webDownload(url, tmpPath, {
      headers: { "User-Agent": ANDROID_UA, Accept: "*/*" },
      proxy,
      onProgress,
    });
  }
}

export async function downloadApk(
  url: string,
  packageName: string,
  version: string,
  fileType: string,
  options: DownloadOptions,
  proxy = ""
): Promise<DownloadResult> {
  mkdirSync(options.outputDir, { recursive: true });
  const fileName =
    options.fileName ?? `${packageName}-${version}.${fileType}`;
  const filePath = join(options.outputDir, fileName);
  const tmpPath = filePath + ".part";

  await fetchApkFile(url, tmpPath, proxy, options.onProgress);

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

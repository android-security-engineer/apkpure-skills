import { mkdirSync, renameSync, statSync } from "node:fs";
import { join } from "node:path";
import { downloadFile } from "../utils/http.js";
import { sha256File } from "../utils/crypto.js";
import type { DownloadOptions, DownloadResult } from "../types/index.js";

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

  await downloadFile(url, tmpPath, {
    headers: {
      "User-Agent":
        "Dalvik/2.1.0 (Linux; U; Android 14; SM-G955F Build/AP2A.240805.005)",
      Accept: "*/*",
    },
    proxy,
    onProgress: options.onProgress,
  });

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

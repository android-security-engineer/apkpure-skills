import { ProxyAgent } from "undici";
import { fetch, FormData, File as UndiciFile } from "undici";
import { createWriteStream, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";

const DEFAULT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

let globalProxy: string = "";

export function setProxy(proxy: string) {
  globalProxy = proxy;
}

function getDispatcher(proxy?: string) {
  const p = proxy || globalProxy;
  if (!p) return undefined;
  return new ProxyAgent(p);
}

export async function fetchText(
  url: string,
  options?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    timeout?: number;
    proxy?: string;
  }
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options?.timeout ?? 30000
  );

  try {
    const resp = await fetch(url, {
      method: options?.method ?? "GET",
      headers: {
        "User-Agent": DEFAULT_UA,
        ...(options?.headers ?? {}),
      },
      body: options?.body,
      dispatcher: getDispatcher(options?.proxy),
      signal: controller.signal,
    });

    return await resp.text();
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchHtml(
  url: string,
  options?: {
    headers?: Record<string, string>;
    timeout?: number;
    proxy?: string;
  }
): Promise<string> {
  const text = await fetchText(url, {
    headers: {
      "Accept-Language": "en-US,en;q=0.9",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      ...(options?.headers ?? {}),
    },
    timeout: options?.timeout,
    proxy: options?.proxy,
  });
  return text;
}

export async function downloadFile(
  url: string,
  destPath: string,
  options?: {
    headers?: Record<string, string>;
    proxy?: string;
    onProgress?: (downloaded: number, total: number) => void;
  }
): Promise<number> {
  mkdirSync(dirname(destPath), { recursive: true });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 300000);

  try {
    const resp = await fetch(url, {
      headers: {
        "User-Agent": DEFAULT_UA,
        ...(options?.headers ?? {}),
      },
      dispatcher: getDispatcher(options?.proxy),
      signal: controller.signal,
      redirect: "follow",
    });

    if (!resp.ok) {
      throw new Error(`Download failed: HTTP ${resp.status} for ${url}`);
    }

    const total = parseInt(resp.headers.get("content-length") ?? "0", 10);
    const stream = createWriteStream(destPath);
    let downloaded = 0;

    if (resp.body) {
      for await (const chunk of resp.body as AsyncIterable<Buffer>) {
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

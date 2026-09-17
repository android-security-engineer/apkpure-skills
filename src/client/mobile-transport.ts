import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";

const execFileP = promisify(execFile);

export interface MobileTransportOptions {
  headers?: Record<string, string>;
  proxy?: string;
  timeout?: number;
  resolve?: string[];
}

export interface MobileTransportResponse {
  status: number;
  headers: Record<string, string>;
  body: Buffer;
}

const PYTHON = String.raw`
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

function resolveEntries(host: string, ips: string[]): string[] {
  return ips.map((ip) => `${host}:443:${ip}`);
}

export async function mobileRequest(
  url: string,
  options: MobileTransportOptions = {},
): Promise<MobileTransportResponse> {
  const dir = mkdtempSync(join(tmpdir(), "apkpure-mobile-"));
  const output = join(dir, "response.bin");
  try {
    const env = {
      ...process.env,
      APK_HEADERS: JSON.stringify(options.headers ?? {}),
      APK_IMPERSONATE: process.env.APKPURE_IMPERSONATE_TARGET || "chrome136",
      APK_TIMEOUT: String(Math.ceil((options.timeout ?? 30000) / 1000)),
      APK_RESOLVE: JSON.stringify(options.resolve ?? []),
      ...(options.proxy ? { APK_PROXY: options.proxy } : {}),
    };
    const { stdout } = await execFileP("python3", ["-c", PYTHON, url, output], {
      env,
      timeout: (options.timeout ?? 30000) + 5000,
      maxBuffer: 1024 * 1024,
    });
    const meta = JSON.parse(stdout.trim()) as { status: number };
    return { status: meta.status, headers: {}, body: readFileSync(output) };
  } catch (err) {
    const e = err as { stderr?: string | Buffer; message?: string };
    const detail = e.stderr?.toString().trim().split(/\r?\n/).pop() || e.message || "unknown error";
    throw new Error(`Mobile API request failed: ${detail}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export { resolveEntries };

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileP = promisify(execFile);
const DOH_HOST = "1.1.1.1";

/**
 * Resolve a hostname to its real A records via Cloudflare DoH (1.1.1.1),
 * bypassing any polluted local/recursive DNS. This lets the mobile API
 * (tapi.pureapk.com) reach its real Cloudflare front, instead of whatever
 * bogus IP (Facebook/Dropbox) the machine's DNS returns.
 *
 * Returns [] on any failure — callers should fall back to normal DNS.
 */
export async function resolveViaDoh(host: string, timeout = 8000): Promise<string[]> {
  try {
    const url = `https://${DOH_HOST}/dns-query?type=A&name=${encodeURIComponent(host)}`;
    const { stdout } = await execFileP(
      "python3",
      [
        "-c",
        String.raw`
import json, urllib.request
req = urllib.request.Request(${JSON.stringify(url)}, headers={"Accept": "application/dns-json"})
try:
    with urllib.request.urlopen(req, timeout=${timeout / 1000}) as r:
        j = json.loads(r.read().decode())
    ips = [a["data"] for a in j.get("Answer", []) if a.get("type") == 1]
    print("\n".join(ips))
except Exception:
    pass
`,
      ],
      { timeout }
    );
    return stdout.split("\n").filter((l) => /^\d+\.\d+\.\d+\.\d+$/.test(l));
  } catch {
    return [];
  }
}

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createConnection } from "node:net";

export interface ProxySource {
  url: string;
  source: string;
}

const PROBE_HOST = "tapi.pureapk.com";
const PROBE_PORT = 443;
const PROBE_TIMEOUT = 3000;

const CLASH_CONFIG_PATHS = [
  join(
    homedir(),
    "Library/Application Support/io.github.clash-verge-rev.clash-verge-rev"
  ),
  join(homedir(), ".config/clash-verge"),
  join(homedir(), ".config/clash"),
  join(homedir(), ".config/mihomo"),
];

const COMMON_PROXY_PORTS = [
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
  { port: 9090, name: "Clash API port (unlikely proxy)" },
];

let cachedProxy: ProxySource | null | undefined = undefined;

function extractPortFromClashConfig(configDir: string): number | null {
  const configFiles = [
    "config.yaml",
    "clash-verge.yaml",
    "verge.yaml",
  ];

  for (const file of configFiles) {
    const filePath = join(configDir, file);
    if (!existsSync(filePath)) continue;

    try {
      const content = readFileSync(filePath, "utf-8");
      const mixedMatch = content.match(/mixed-port:\s*(\d+)/);
      if (mixedMatch) return parseInt(mixedMatch[1], 10);

      const portMatch = content.match(/(?:^|\n)port:\s*(\d+)/);
      if (portMatch) return parseInt(portMatch[1], 10);
    } catch {
      // ignore read errors
    }
  }

  return null;
}

function checkPortOpen(port: number, host = "127.0.0.1"): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port, timeout: PROBE_TIMEOUT });
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

async function testProxyWorks(proxyUrl: string): Promise<boolean> {
  try {
    const { fetch, ProxyAgent } = await import("undici");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT);

    const resp = await fetch(`https://${PROBE_HOST}`, {
      method: "HEAD",
      dispatcher: new ProxyAgent(proxyUrl),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return resp.status > 0;
  } catch {
    return false;
  }
}

export async function detectProxy(): Promise<ProxySource | null> {
  if (cachedProxy !== undefined) return cachedProxy;

  // 1. Environment variables first
  const envProxy =
    process.env.HTTPS_PROXY ??
    process.env.https_proxy ??
    process.env.HTTP_PROXY ??
    process.env.http_proxy ??
    process.env.ALL_PROXY ??
    process.env.all_proxy;

  if (envProxy) {
    cachedProxy = { url: envProxy, source: "environment variable" };
    return cachedProxy;
  }

  // 2. Read Clash config files for port
  for (const configDir of CLASH_CONFIG_PATHS) {
    if (!existsSync(configDir)) continue;
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

  // 3. Brute-force scan common proxy ports
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

export function clearProxyCache(): void {
  cachedProxy = undefined;
}

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("node:fs", async () => {
  const actual = await vi.importActual("node:fs");
  return {
    ...actual,
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  };
});

vi.mock("node:net", () => ({
  createConnection: vi.fn(),
}));

vi.mock("undici", () => ({
  fetch: vi.fn(),
  ProxyAgent: vi.fn(),
}));

import { clearProxyCache, detectProxy } from "../src/utils/proxy.js";
import { existsSync, readFileSync } from "node:fs";
import { createConnection } from "node:net";
import { fetch as mockFetch, ProxyAgent as MockProxyAgent } from "undici";

describe("detectProxy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearProxyCache();
    delete process.env.HTTPS_PROXY;
    delete process.env.https_proxy;
    delete process.env.HTTP_PROXY;
    delete process.env.http_proxy;
    delete process.env.ALL_PROXY;
    delete process.env.all_proxy;
  });

  afterEach(() => {
    clearProxyCache();
    delete process.env.HTTPS_PROXY;
    delete process.env.https_proxy;
    delete process.env.HTTP_PROXY;
    delete process.env.http_proxy;
    delete process.env.ALL_PROXY;
    delete process.env.all_proxy;
  });

  test("returns null when no proxy available", async () => {
    (existsSync as ReturnType<typeof vi.fn>).mockReturnValue(false);
    (createConnection as ReturnType<typeof vi.fn>).mockImplementation(() => {
      const socket = {
        on: (event: string, cb: Function) => {
          if (event === "error") setTimeout(() => cb(new Error("refused")), 0);
          if (event === "timeout") setTimeout(() => cb(), 0);
          return socket;
        },
        destroy: vi.fn(),
      };
      return socket;
    });
    (MockProxyAgent as ReturnType<typeof vi.fn>).mockReturnValue({});
    (mockFetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("no proxy"));
    const result = await detectProxy();
    expect(result).toBeNull();
  });

  test("detects environment variable proxy from HTTPS_PROXY", async () => {
    process.env.HTTPS_PROXY = "http://test-proxy:8080";
    clearProxyCache();
    const result = await detectProxy();
    expect(result).not.toBeNull();
    expect(result!.url).toBe("http://test-proxy:8080");
    expect(result!.source).toContain("environment");
  });

  test("detects environment variable proxy from https_proxy", async () => {
    process.env.https_proxy = "http://lower-proxy:8080";
    clearProxyCache();
    const result = await detectProxy();
    expect(result).not.toBeNull();
    expect(result!.url).toBe("http://lower-proxy:8080");
  });

  test("detects environment variable proxy from HTTP_PROXY", async () => {
    process.env.HTTP_PROXY = "http://http-proxy:8080";
    clearProxyCache();
    const result = await detectProxy();
    expect(result).not.toBeNull();
    expect(result!.url).toBe("http://http-proxy:8080");
  });

  test("detects environment variable proxy from ALL_PROXY", async () => {
    process.env.ALL_PROXY = "http://all-proxy:8080";
    clearProxyCache();
    const result = await detectProxy();
    expect(result).not.toBeNull();
    expect(result!.url).toBe("http://all-proxy:8080");
  });

  test("prefers HTTPS_PROXY over other env vars", async () => {
    process.env.HTTPS_PROXY = "http://preferred:8080";
    process.env.HTTP_PROXY = "http://fallback:8080";
    clearProxyCache();
    const result = await detectProxy();
    expect(result!.url).toBe("http://preferred:8080");
  });

  test("caches detected proxy", async () => {
    process.env.HTTP_PROXY = "http://cached-proxy:9999";
    clearProxyCache();
    const r1 = await detectProxy();
    const r2 = await detectProxy();
    expect(r1).toEqual(r2);
  });

  test("clearProxyCache resets cache", async () => {
    process.env.HTTP_PROXY = "http://temp-proxy:7777";
    clearProxyCache();
    await detectProxy();
    clearProxyCache();
    delete process.env.HTTP_PROXY;
    (existsSync as ReturnType<typeof vi.fn>).mockReturnValue(false);
    (createConnection as ReturnType<typeof vi.fn>).mockImplementation(() => {
      const socket = {
        on: (event: string, cb: Function) => {
          if (event === "error") setTimeout(() => cb(new Error("refused")), 0);
          return socket;
        },
        destroy: vi.fn(),
      };
      return socket;
    });
    (MockProxyAgent as ReturnType<typeof vi.fn>).mockReturnValue({});
    (mockFetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("no proxy"));
    const result = await detectProxy();
    expect(result).toBeNull();
  });
});

describe("extractPortFromClashConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearProxyCache();
    delete process.env.HTTPS_PROXY;
    delete process.env.https_proxy;
    delete process.env.HTTP_PROXY;
    delete process.env.http_proxy;
    delete process.env.ALL_PROXY;
    delete process.env.all_proxy;
  });

  test("extracts mixed-port from Clash config", async () => {
    // Set up: config dir exists with a config file containing mixed-port
    const configContent = `
port: 7891
mixed-port: 7897
allow-lan: false
`;
    (existsSync as ReturnType<typeof vi.fn>).mockImplementation((p: string) => {
      // Return true only for config directories that contain config files
      if (typeof p === "string" && p.includes("clash")) return true;
      if (typeof p === "string" && (p.endsWith("config.yaml") || p.endsWith("clash-verge.yaml") || p.endsWith("verge.yaml"))) return true;
      return false;
    });
    (readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(configContent);

    // Mock checkPortOpen to return true
    (createConnection as ReturnType<typeof vi.fn>).mockImplementation((opts: any) => {
      const socket = {
        on: (event: string, cb: Function) => {
          if (event === "connect") setTimeout(() => cb(), 0);
          return socket;
        },
        destroy: vi.fn(),
      };
      return socket;
    });

    // Mock testProxyWorks to return true
    (MockProxyAgent as ReturnType<typeof vi.fn>).mockReturnValue({});
    (mockFetch as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 200 });

    const result = await detectProxy();
    expect(result).not.toBeNull();
    expect(result!.url).toBe("http://127.0.0.1:7897");
    expect(result!.source).toContain("Clash config");
    expect(result!.source).toContain("7897");
  });

  test("extracts port from Clash config when mixed-port not present", async () => {
    const configContent = `
port: 7890
allow-lan: false
`;
    (existsSync as ReturnType<typeof vi.fn>).mockImplementation((p: string) => {
      if (typeof p === "string" && p.includes("clash")) return true;
      if (typeof p === "string" && (p.endsWith("config.yaml") || p.endsWith("clash-verge.yaml") || p.endsWith("verge.yaml"))) return true;
      return false;
    });
    (readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(configContent);

    (createConnection as ReturnType<typeof vi.fn>).mockImplementation((opts: any) => {
      const socket = {
        on: (event: string, cb: Function) => {
          if (event === "connect") setTimeout(() => cb(), 0);
          return socket;
        },
        destroy: vi.fn(),
      };
      return socket;
    });

    (MockProxyAgent as ReturnType<typeof vi.fn>).mockReturnValue({});
    (mockFetch as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 200 });

    const result = await detectProxy();
    expect(result).not.toBeNull();
    expect(result!.url).toBe("http://127.0.0.1:7890");
  });

  test("skips Clash config dir when readFileSync throws", async () => {
    (existsSync as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (readFileSync as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error("permission denied");
    });
    // Also mock port scan to return nothing
    (createConnection as ReturnType<typeof vi.fn>).mockImplementation((opts: any) => {
      const socket = {
        on: (event: string, cb: Function) => {
          if (event === "error") setTimeout(() => cb(new Error("refused")), 0);
          return socket;
        },
        destroy: vi.fn(),
      };
      return socket;
    });

    const result = await detectProxy();
    // No proxy should be found since reading config failed and no ports are open
    expect(result).toBeNull();
  });
});

describe("port scanning", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearProxyCache();
    delete process.env.HTTPS_PROXY;
    delete process.env.https_proxy;
    delete process.env.HTTP_PROXY;
    delete process.env.http_proxy;
    delete process.env.ALL_PROXY;
    delete process.env.all_proxy;
  });

  test("finds open proxy via port scan when Clash config has no ports", async () => {
    // No env proxy, no Clash config dirs exist
    (existsSync as ReturnType<typeof vi.fn>).mockReturnValue(false);

    // Simulate port 7897 is open (first in COMMON_PROXY_PORTS)
    (createConnection as ReturnType<typeof vi.fn>).mockImplementation((opts: any) => {
      const socket = {
        on: (event: string, cb: Function) => {
          if (event === "connect") setTimeout(() => cb(), 0);
          if (event === "error") {} // no-op
          if (event === "timeout") {} // no-op
          return socket;
        },
        destroy: vi.fn(),
      };
      return socket;
    });

    // testProxyWorks returns true
    (MockProxyAgent as ReturnType<typeof vi.fn>).mockReturnValue({});
    (mockFetch as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 200 });

    const result = await detectProxy();
    expect(result).not.toBeNull();
    expect(result!.url).toBe("http://127.0.0.1:7897");
    expect(result!.source).toContain("Clash Verge Rev");
  });

  test("testProxyWorks returns false when fetch throws", async () => {
    (existsSync as ReturnType<typeof vi.fn>).mockReturnValue(false);

    // Port is open
    (createConnection as ReturnType<typeof vi.fn>).mockImplementation((opts: any) => {
      const socket = {
        on: (event: string, cb: Function) => {
          if (event === "connect") setTimeout(() => cb(), 0);
          return socket;
        },
        destroy: vi.fn(),
      };
      return socket;
    });

    // But proxy test fails
    (MockProxyAgent as ReturnType<typeof vi.fn>).mockReturnValue({});
    (mockFetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("connection refused"));

    const result = await detectProxy();
    expect(result).toBeNull();
  });

  test("testProxyWorks returns false when fetch returns status 0", async () => {
    (existsSync as ReturnType<typeof vi.fn>).mockReturnValue(false);

    (createConnection as ReturnType<typeof vi.fn>).mockImplementation((opts: any) => {
      const socket = {
        on: (event: string, cb: Function) => {
          if (event === "connect") setTimeout(() => cb(), 0);
          return socket;
        },
        destroy: vi.fn(),
      };
      return socket;
    });

    (MockProxyAgent as ReturnType<typeof vi.fn>).mockReturnValue({});
    // status of 0 means failure in the proxy check logic
    (mockFetch as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 0 });

    const result = await detectProxy();
    expect(result).toBeNull();
  });

  test("skips closed ports during scan", async () => {
    (existsSync as ReturnType<typeof vi.fn>).mockReturnValue(false);

    // All ports are closed
    (createConnection as ReturnType<typeof vi.fn>).mockImplementation((opts: any) => {
      const socket = {
        on: (event: string, cb: Function) => {
          if (event === "error") setTimeout(() => cb(new Error("refused")), 0);
          return socket;
        },
        destroy: vi.fn(),
      };
      return socket;
    });

    const result = await detectProxy();
    expect(result).toBeNull();
  });
});

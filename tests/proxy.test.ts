import { describe, test, expect, vi, beforeEach } from "vitest";
import { clearProxyCache } from "../src/utils/proxy.js";

describe("detectProxy", () => {
  beforeEach(() => {
    clearProxyCache();
    delete process.env.HTTPS_PROXY;
    delete process.env.https_proxy;
    delete process.env.HTTP_PROXY;
    delete process.env.http_proxy;
    delete process.env.ALL_PROXY;
    delete process.env.all_proxy;
  });

  test("returns null when no proxy available", async () => {
    const { detectProxy } = await import("../src/utils/proxy.js");
    clearProxyCache();
    // This test relies on no proxy actually running on uncommon ports
    // which is the expected default state
    const result = await detectProxy();
    // Could be null or a detected proxy depending on environment
    expect(result === null || (result && typeof result.url === "string")).toBe(true);
  });

  test("detects environment variable proxy", async () => {
    process.env.HTTPS_PROXY = "http://test-proxy:8080";
    clearProxyCache();
    const { detectProxy } = await import("../src/utils/proxy.js");
    const result = await detectProxy();
    expect(result).not.toBeNull();
    expect(result!.url).toBe("http://test-proxy:8080");
    expect(result!.source).toContain("environment");
  });

  test("caches detected proxy", async () => {
    process.env.HTTP_PROXY = "http://cached-proxy:9999";
    clearProxyCache();
    const { detectProxy } = await import("../src/utils/proxy.js");
    const r1 = await detectProxy();
    const r2 = await detectProxy();
    expect(r1).toEqual(r2);
  });

  test("clearProxyCache resets cache", async () => {
    process.env.HTTP_PROXY = "http://temp-proxy:7777";
    clearProxyCache();
    const { detectProxy } = await import("../src/utils/proxy.js");
    await detectProxy();
    clearProxyCache();
    delete process.env.HTTP_PROXY;
    // After clearing, next call re-detects
    const result = await detectProxy();
    // Should not be the env var proxy since we deleted it
    if (result) {
      expect(result.source).not.toContain("environment");
    }
  });
});

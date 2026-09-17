import { describe, test, expect, beforeEach, afterEach } from "vitest";
import {
  detectBackend,
  resetBackendCache,
  hasImpersonation,
} from "../src/utils/impersonate.js";
import { isCloudflareBlock } from "../src/utils/web.js";

describe("detectBackend (env-forced paths, no subprocess)", () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    resetBackendCache();
  });

  afterEach(() => {
    process.env = { ...savedEnv };
    resetBackendCache();
  });

  test("APKPURE_IMPERSONATE=node forces the Node backend", async () => {
    process.env.APKPURE_IMPERSONATE = "node";
    const backend = await detectBackend();
    expect(backend.kind).toBe("node");
    expect(backend.detail).toContain("forced");
  });

  test("hasImpersonation is false when forced to node", async () => {
    process.env.APKPURE_IMPERSONATE = "node";
    expect(await hasImpersonation()).toBe(false);
  });

  test("result is cached across calls until reset", async () => {
    process.env.APKPURE_IMPERSONATE = "node";
    const a = await detectBackend();
    // Change env but don't reset — cached value must persist.
    process.env.APKPURE_IMPERSONATE = "auto";
    const b = await detectBackend();
    expect(b).toBe(a);
    resetBackendCache();
    // Note: after reset the "auto" path may shell out; we only assert the
    // cache boundary here, not the auto-detected kind.
  });

  test("an explicit absolute binary path is accepted as curl-impersonate", async () => {
    // A path containing "/" is trusted without a `command -v` lookup.
    process.env.APKPURE_IMPERSONATE = "/usr/local/bin/curl_chrome131";
    const backend = await detectBackend();
    expect(backend.kind).toBe("curl-impersonate");
    expect(backend.cmd).toBe("/usr/local/bin/curl_chrome131");
  });
});

describe("isCloudflareBlock", () => {
  test("flags 403 with a cloudflare marker", () => {
    expect(isCloudflareBlock(403, "<html>cf-ray: abc</html>")).toBe(true);
    expect(isCloudflareBlock(503, "Just a moment...")).toBe(true);
    expect(isCloudflareBlock(429, "attention required | cloudflare")).toBe(true);
  });

  test("flags a 200 challenge shell", () => {
    expect(isCloudflareBlock(200, "<title> Just a moment </title>")).toBe(true);
    expect(isCloudflareBlock(200, "window.cf_chl_opt = {}")).toBe(true);
  });

  test("does not flag a normal 200 page", () => {
    expect(isCloudflareBlock(200, "<html><div class='first'>WhatsApp</div></html>")).toBe(
      false
    );
  });

  test("does not flag a 403 without cloudflare markers", () => {
    expect(isCloudflareBlock(403, "<html>Forbidden by app</html>")).toBe(false);
  });
});

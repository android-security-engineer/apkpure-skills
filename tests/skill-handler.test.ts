import { describe, test, expect, vi } from "vitest";

vi.mock("../src/core/apkpure.js", () => {
  const mockSdk = {
    search: vi.fn().mockResolvedValue({ apps: [{ packageName: "com.test", name: "Test" }] }),
    getInfo: vi.fn().mockResolvedValue({ packageName: "com.test", name: "Test", version: "1.0", downloadUrl: "https://a", fileType: "apk" }),
    getVersions: vi.fn().mockResolvedValue([{ version: "1.0", versionCode: 1, downloadUrl: "https://a", type: "apk" }]),
    download: vi.fn().mockResolvedValue({ filePath: "/tmp/test.apk", packageName: "com.test", version: "1.0", fileType: "apk", fileSize: 1000, sha256: "abc" }),
    trending: vi.fn().mockResolvedValue([{ title: "Game1", iconUrl: "", detailUrl: "https://a" }]),
  };
  return { ApkPure: vi.fn(() => mockSdk) };
});

import { handleSkillRequest } from "../src/skill-handler.js";
import { ApkPure } from "../src/core/apkpure.js";

function getMockSdk() {
  return new ApkPure() as any;
}

describe("handleSkillRequest", () => {
  test("search — returns search results", async () => {
    const res = await handleSkillRequest({ action: "search", query: "telegram" });
    expect(res.success).toBe(true);
    expect(res.data).toBeDefined();
  });

  test("search — missing query returns error", async () => {
    const res = await handleSkillRequest({ action: "search" });
    expect(res.success).toBe(false);
    expect(res.error).toContain("query is required");
  });

  test("info — returns app detail", async () => {
    const res = await handleSkillRequest({ action: "info", package: "com.test" });
    expect(res.success).toBe(true);
  });

  test("info — missing package returns error", async () => {
    const res = await handleSkillRequest({ action: "info" });
    expect(res.success).toBe(false);
    expect(res.error).toContain("package is required");
  });

  test("info — app not found returns error", async () => {
    const sdk = getMockSdk();
    sdk.getInfo = vi.fn().mockResolvedValue(null);
    const res = await handleSkillRequest({ action: "info", package: "com.nonexistent" });
    expect(res.success).toBe(false);
    expect(res.error).toContain("not found");
  });

  test("download — returns download result", async () => {
    const res = await handleSkillRequest({ action: "download", package: "com.test" });
    expect(res.success).toBe(true);
  });

  test("download — missing package returns error", async () => {
    const res = await handleSkillRequest({ action: "download" });
    expect(res.success).toBe(false);
    expect(res.error).toContain("package is required");
  });

  test("download — uses default outputDir", async () => {
    const sdk = getMockSdk();
    const req = { action: "download" as const, package: "com.test" };
    await handleSkillRequest(req);
    expect(sdk.download).toHaveBeenCalledWith("com.test", expect.objectContaining({ outputDir: "./apks" }));
  });

  test("versions — returns version list", async () => {
    const res = await handleSkillRequest({ action: "versions", package: "com.test" });
    expect(res.success).toBe(true);
  });

  test("versions — missing package returns error", async () => {
    const res = await handleSkillRequest({ action: "versions" });
    expect(res.success).toBe(false);
    expect(res.error).toContain("package is required");
  });

  test("trending — returns trending apps", async () => {
    const res = await handleSkillRequest({ action: "trending" });
    expect(res.success).toBe(true);
  });

  test("unknown action returns error", async () => {
    const res = await handleSkillRequest({ action: "unknown" as any });
    expect(res.success).toBe(false);
    expect(res.error).toContain("Unknown action");
  });

  test("sdk throws error — returns error response", async () => {
    const sdk = getMockSdk();
    sdk.search = vi.fn().mockRejectedValue(new Error("Network error"));
    const res = await handleSkillRequest({ action: "search", query: "test" });
    expect(res.success).toBe(false);
    expect(res.error).toContain("Network error");
  });

  test("sdk throws non-Error — returns stringified error", async () => {
    const sdk = getMockSdk();
    sdk.search = vi.fn().mockRejectedValue("string error");
    const res = await handleSkillRequest({ action: "search", query: "test" });
    expect(res.success).toBe(false);
    expect(res.error).toBe("string error");
  });

  test("passes mode and proxy to sdk", async () => {
    const res = await handleSkillRequest({ action: "search", query: "test", mode: "scraping", proxy: "http://proxy:8080" });
    expect(ApkPure).toHaveBeenCalledWith(expect.objectContaining({ mode: "scraping", proxy: "http://proxy:8080" }));
  });
});

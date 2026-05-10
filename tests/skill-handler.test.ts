import { describe, test, expect, vi, beforeEach } from "vitest";

const mockSearch = vi.fn().mockResolvedValue({
  apps: [{ packageName: "com.test", name: "Test" }],
});

const mockGetInfo = vi.fn().mockResolvedValue({
  packageName: "com.test",
  name: "Test",
  version: "1.0",
  downloadUrl: "https://a",
  fileType: "apk",
});

const mockGetVersions = vi.fn().mockResolvedValue([
  { version: "1.0", versionCode: 1, downloadUrl: "https://a", type: "apk" },
]);

const mockDownload = vi.fn().mockResolvedValue({
  filePath: "/tmp/test.apk",
  packageName: "com.test",
  version: "1.0",
  fileType: "apk",
  fileSize: 1000,
  sha256: "abc",
});

const mockTrending = vi.fn().mockResolvedValue([
  { title: "Game1", iconUrl: "", detailUrl: "https://a" },
]);

vi.mock("../src/core/apkpure.js", () => ({
  ApkPure: vi.fn().mockImplementation(() => ({
    search: mockSearch,
    getInfo: mockGetInfo,
    getVersions: mockGetVersions,
    download: mockDownload,
    trending: mockTrending,
  })),
}));

import { handleSkillRequest } from "../src/skill-handler.js";
import { ApkPure } from "../src/core/apkpure.js";
import type { SkillRequest } from "../src/skill-handler.js";

describe("handleSkillRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- Search Action ----

  describe("search action", () => {
    test("returns search results", async () => {
      const res = await handleSkillRequest({
        action: "search",
        query: "telegram",
      });
      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
      expect(mockSearch).toHaveBeenCalledWith("telegram");
    });

    test("missing query returns error", async () => {
      const res = await handleSkillRequest({ action: "search" });
      expect(res.success).toBe(false);
      expect(res.error).toBe("query is required for search");
    });

    test("empty string query returns error", async () => {
      const res = await handleSkillRequest({ action: "search", query: "" });
      expect(res.success).toBe(false);
      expect(res.error).toBe("query is required for search");
    });
  });

  // ---- Info Action ----

  describe("info action", () => {
    test("returns app detail", async () => {
      const res = await handleSkillRequest({
        action: "info",
        package: "com.test",
      });
      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
      expect(mockGetInfo).toHaveBeenCalledWith("com.test");
    });

    test("missing package returns error", async () => {
      const res = await handleSkillRequest({ action: "info" });
      expect(res.success).toBe(false);
      expect(res.error).toBe("package is required for info");
    });

    test("app not found returns error", async () => {
      mockGetInfo.mockResolvedValueOnce(null);
      const res = await handleSkillRequest({
        action: "info",
        package: "com.nonexistent",
      });
      expect(res.success).toBe(false);
      expect(res.error).toBe("App not found: com.nonexistent");
    });
  });

  // ---- Download Action ----

  describe("download action", () => {
    test("returns download result", async () => {
      const res = await handleSkillRequest({
        action: "download",
        package: "com.test",
      });
      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
    });

    test("missing package returns error", async () => {
      const res = await handleSkillRequest({ action: "download" });
      expect(res.success).toBe(false);
      expect(res.error).toBe("package is required for download");
    });

    test("uses default outputDir when not specified", async () => {
      await handleSkillRequest({
        action: "download",
        package: "com.test",
      });
      expect(mockDownload).toHaveBeenCalledWith(
        "com.test",
        expect.objectContaining({ outputDir: expect.stringContaining(".apkpure") })
      );
    });

    test("uses custom outputDir when specified", async () => {
      await handleSkillRequest({
        action: "download",
        package: "com.test",
        outputDir: "/custom/dir",
      });
      expect(mockDownload).toHaveBeenCalledWith(
        "com.test",
        expect.objectContaining({ outputDir: "/custom/dir" })
      );
    });

    test("passes version to download", async () => {
      await handleSkillRequest({
        action: "download",
        package: "com.test",
        outputDir: "/tmp",
        version: "2.0",
      });
      expect(mockDownload).toHaveBeenCalledWith(
        "com.test",
        expect.objectContaining({ version: "2.0" })
      );
    });

    test("passes undefined version when not specified", async () => {
      await handleSkillRequest({
        action: "download",
        package: "com.test",
        outputDir: "/tmp",
      });
      expect(mockDownload).toHaveBeenCalledWith(
        "com.test",
        expect.objectContaining({ version: undefined })
      );
    });
  });

  // ---- Versions Action ----

  describe("versions action", () => {
    test("returns version list", async () => {
      const res = await handleSkillRequest({
        action: "versions",
        package: "com.test",
      });
      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
      expect(mockGetVersions).toHaveBeenCalledWith("com.test");
    });

    test("missing package returns error", async () => {
      const res = await handleSkillRequest({ action: "versions" });
      expect(res.success).toBe(false);
      expect(res.error).toBe("package is required for versions");
    });
  });

  // ---- Trending Action ----

  describe("trending action", () => {
    test("returns trending apps", async () => {
      const res = await handleSkillRequest({ action: "trending" });
      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
      expect(mockTrending).toHaveBeenCalled();
    });
  });

  // ---- Unknown Action ----

  describe("unknown action", () => {
    test("returns error for unknown action", async () => {
      const res = await handleSkillRequest({ action: "unknown" as any });
      expect(res.success).toBe(false);
      expect(res.error).toBe("Unknown action: unknown");
    });
  });

  // ---- Error Handling ----

  describe("error handling", () => {
    test("sdk throws Error — returns error response with message", async () => {
      mockSearch.mockRejectedValueOnce(new Error("Network error"));
      const res = await handleSkillRequest({
        action: "search",
        query: "test",
      });
      expect(res.success).toBe(false);
      expect(res.error).toBe("Network error");
    });

    test("sdk throws non-Error — returns stringified error", async () => {
      mockSearch.mockRejectedValueOnce("string error");
      const res = await handleSkillRequest({
        action: "search",
        query: "test",
      });
      expect(res.success).toBe(false);
      expect(res.error).toBe("string error");
    });

    test("sdk throws number — returns stringified number", async () => {
      mockSearch.mockRejectedValueOnce(42);
      const res = await handleSkillRequest({
        action: "search",
        query: "test",
      });
      expect(res.success).toBe(false);
      expect(res.error).toBe("42");
    });
  });

  // ---- Constructor Configuration ----

  describe("constructor configuration", () => {
    test("passes mode to ApkPure constructor", async () => {
      await handleSkillRequest({
        action: "search",
        query: "test",
        mode: "scraping",
      });
      expect(ApkPure).toHaveBeenCalledWith(
        expect.objectContaining({ mode: "scraping" })
      );
    });

    test("defaults mode to auto when not specified", async () => {
      await handleSkillRequest({
        action: "search",
        query: "test",
      });
      expect(ApkPure).toHaveBeenCalledWith(
        expect.objectContaining({ mode: "auto" })
      );
    });

    test("passes proxy to ApkPure constructor", async () => {
      await handleSkillRequest({
        action: "search",
        query: "test",
        proxy: "http://proxy:8080",
      });
      expect(ApkPure).toHaveBeenCalledWith(
        expect.objectContaining({ proxy: "http://proxy:8080" })
      );
    });

    test("passes undefined proxy when not specified", async () => {
      await handleSkillRequest({
        action: "search",
        query: "test",
      });
      expect(ApkPure).toHaveBeenCalledWith(
        expect.objectContaining({ proxy: undefined })
      );
    });
  });
});

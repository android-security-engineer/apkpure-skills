import { describe, test, expect, vi, beforeEach } from "vitest";

const mockSearch = vi.fn().mockResolvedValue({
  apps: [{ packageName: "com.test", name: "TestApp", version: "1.0" }],
});

const mockGetInfo = vi.fn().mockResolvedValue({
  packageName: "com.test",
  name: "TestApp",
  version: "1.0",
  downloadUrl: "https://a",
  fileType: "apk",
  developer: "TestDev",
  updateDate: "2024-01-01",
});

const mockGetVersions = vi.fn().mockResolvedValue([
  { version: "2.0", versionCode: 2, downloadUrl: "https://a", type: "xapk" },
  { version: "1.0", versionCode: 1, downloadUrl: "https://b", type: "apk" },
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

import { runWorkflow, listWorkflows } from "../src/workflows.js";

describe("workflows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearch.mockResolvedValue({
      apps: [{ packageName: "com.test", name: "TestApp", version: "1.0" }],
    });
    mockGetInfo.mockResolvedValue({
      packageName: "com.test",
      name: "TestApp",
      version: "1.0",
      downloadUrl: "https://a",
      fileType: "apk",
      developer: "TestDev",
      updateDate: "2024-01-01",
    });
    mockGetVersions.mockResolvedValue([
      { version: "2.0", versionCode: 2, downloadUrl: "https://a", type: "xapk" },
      { version: "1.0", versionCode: 1, downloadUrl: "https://b", type: "apk" },
    ]);
    mockDownload.mockResolvedValue({
      filePath: "/tmp/test.apk",
      packageName: "com.test",
      version: "1.0",
      fileType: "apk",
      fileSize: 1000,
      sha256: "abc",
    });
    mockTrending.mockResolvedValue([
      { title: "Game1", iconUrl: "", detailUrl: "https://a" },
    ]);
  });

  describe("listWorkflows", () => {
    test("returns at least 24 built-in workflows", () => {
      const workflows = listWorkflows();
      expect(workflows.length).toBeGreaterThanOrEqual(24);
    });

    test("each workflow has name, description, and steps", () => {
      for (const wf of listWorkflows()) {
        expect(wf.name).toBeTruthy();
        expect(wf.description).toBeTruthy();
        expect(wf.steps.length).toBeGreaterThan(0);
      }
    });

    test("includes all expected workflow names", () => {
      const names = listWorkflows().map((w) => w.name);
      const expected = [
        "search-and-download",
        "download-by-name",
        "search-and-info",
        "search-and-report",
        "app-report",
        "download-latest",
        "download-version",
        "verify-and-download",
        "info-and-versions",
        "trending-and-info",
        "batch-download",
        "app-intelligence",
        "search-intelligence",
        "version-audit",
        "download-oldest",
        "quick-lookup",
        "check-update",
        "security-scan",
        "download-and-verify",
        "compare-versions",
        "explore-category",
        "batch-info",
        "validate-package",
        "batch-validate",
      ];
      for (const name of expected) {
        expect(names).toContain(name);
      }
    });
  });

  describe("runWorkflow", () => {
    test("returns error for unknown workflow", async () => {
      const result = await runWorkflow("nonexistent", {});
      expect(result.success).toBe(false);
      expect(result.error).toContain("Unknown workflow");
    });

    // ---- Search-based workflows ----

    test("search-and-download — searches and downloads first result", async () => {
      const result = await runWorkflow("search-and-download", { query: "test" });
      expect(result.success).toBe(true);
      expect(mockSearch).toHaveBeenCalledWith("test");
      expect(result.steps).toHaveLength(2);
    });

    test("search-and-download — returns composed output", async () => {
      const result = await runWorkflow("search-and-download", { query: "test" });
      const output = result.output as any;
      expect(output.app).toBe("TestApp");
      expect(output.sha256).toBe("abc");
    });

    test("download-by-name — searches and downloads", async () => {
      const result = await runWorkflow("download-by-name", { query: "telegram" });
      expect(result.success).toBe(true);
    });

    test("search-and-info — searches and gets info", async () => {
      const result = await runWorkflow("search-and-info", { query: "test" });
      expect(result.success).toBe(true);
      const output = result.output as any;
      expect(output.searchMatch).toBe("TestApp");
    });

    test("search-and-report — searches, gets info and versions", async () => {
      const result = await runWorkflow("search-and-report", { query: "test" });
      expect(result.success).toBe(true);
      const output = result.output as any;
      expect(output.searchMatch).toBe("TestApp");
      expect(output.appInfo).toBeDefined();
      expect(output.versions).toBeDefined();
    });

    test("search-and-report — fails when no results found", async () => {
      mockSearch.mockResolvedValueOnce({ apps: [] });
      const result = await runWorkflow("search-and-report", { query: "zzzzz" });
      expect(result.success).toBe(false);
    });

    // ---- Package-based workflows ----

    test("app-report — returns info and versions", async () => {
      const result = await runWorkflow("app-report", { package: "com.test" });
      expect(result.success).toBe(true);
      const output = result.output as any;
      expect(output.appInfo).toBeDefined();
      expect(output.versions).toBeDefined();
    });

    test("download-latest — gets info then downloads", async () => {
      const result = await runWorkflow("download-latest", { package: "com.test" });
      expect(result.success).toBe(true);
      const output = result.output as any;
      expect(output.developer).toBe("TestDev");
    });

    test("download-version — downloads specific version", async () => {
      const result = await runWorkflow("download-version", { package: "com.test", version: "0.9" });
      expect(result.success).toBe(true);
      const output = result.output as any;
      expect(output.requestedVersion).toBe("0.9");
    });

    test("verify-and-download — verifies then downloads", async () => {
      const result = await runWorkflow("verify-and-download", { package: "com.test" });
      expect(result.success).toBe(true);
    });

    test("verify-and-download — fails when app not found", async () => {
      mockGetInfo.mockResolvedValueOnce(null);
      const result = await runWorkflow("verify-and-download", { package: "com.nonexistent" });
      expect(result.success).toBe(false);
    });

    test("info-and-versions — returns info and versions", async () => {
      const result = await runWorkflow("info-and-versions", { package: "com.test" });
      expect(result.success).toBe(true);
    });

    // ---- Discovery workflows ----

    test("trending-and-info — returns trending apps", async () => {
      const result = await runWorkflow("trending-and-info", {});
      expect(result.success).toBe(true);
    });

    // ---- Batch workflows ----

    test("batch-download — downloads multiple apps", async () => {
      const result = await runWorkflow("batch-download", { packages: "com.test,com.other" });
      expect(result.success).toBe(true);
      const output = result.output as any;
      expect(output.results).toBeDefined();
      expect(mockGetInfo).toHaveBeenCalledTimes(2);
      expect(mockDownload).toHaveBeenCalledTimes(2);
    });

    test("batch-download — handles partial failures", async () => {
      mockGetInfo.mockResolvedValueOnce({ packageName: "com.a", name: "A", version: "1.0", downloadUrl: "https://a", fileType: "apk" });
      mockGetInfo.mockResolvedValueOnce({ packageName: "com.b", name: "B", version: "2.0", downloadUrl: "https://b", fileType: "apk" });
      mockDownload.mockResolvedValueOnce({ filePath: "/tmp/a.apk", packageName: "com.a", version: "1.0", fileType: "apk", fileSize: 100, sha256: "a" });
      mockDownload.mockRejectedValueOnce(new Error("Download failed"));
      const result = await runWorkflow("batch-download", { packages: "com.a,com.b" });
      expect(result.success).toBe(false);
    });

    // ---- Intelligence workflows ----

    test("app-intelligence — returns deep report with version analysis", async () => {
      const result = await runWorkflow("app-intelligence", { package: "com.test" });
      expect(result.success).toBe(true);
      const output = result.output as any;
      expect(output.versionCount).toBe(2);
      expect(output.latestVersion).toBe("2.0");
      expect(output.oldestVersion).toBe("1.0");
      expect(output.fileTypes).toContain("apk");
      expect(output.fileTypes).toContain("xapk");
    });

    test("search-intelligence — search + deep report", async () => {
      const result = await runWorkflow("search-intelligence", { query: "test" });
      expect(result.success).toBe(true);
      const output = result.output as any;
      expect(output.searchMatch).toBe("TestApp");
      expect(output.versionCount).toBe(2);
      expect(output.latestVersion).toBe("2.0");
    });

    // ---- Version analysis workflows ----

    test("version-audit — returns version audit report", async () => {
      const result = await runWorkflow("version-audit", { package: "com.test" });
      expect(result.success).toBe(true);
      const output = result.output as any;
      expect(output.packageName).toBe("com.test");
      expect(output.currentVersion).toBe("1.0");
      expect(output.latestVersion).toBe("2.0");
      expect(output.oldestVersion).toBe("1.0");
      expect(output.versionCount).toBe(2);
    });

    test("download-oldest — downloads the oldest version", async () => {
      const result = await runWorkflow("download-oldest", { package: "com.test" });
      expect(result.success).toBe(true);
      const output = result.output as any;
      expect(output.note).toBe("Oldest available version downloaded");
    });

    // ---- Quick lookup workflows ----

    test("quick-lookup — returns key metadata", async () => {
      const result = await runWorkflow("quick-lookup", { query: "test" });
      expect(result.success).toBe(true);
      const output = result.output as any;
      expect(output.name).toBe("TestApp");
      expect(output.packageName).toBe("com.test");
      expect(output.developer).toBe("TestDev");
    });

    test("check-update — detects update available", async () => {
      const result = await runWorkflow("check-update", { package: "com.test", currentVersion: "0.5" });
      expect(result.success).toBe(true);
      const output = result.output as any;
      expect(output.updateAvailable).toBe(true);
      expect(output.latestAvailable).toBe("2.0");
    });

    test("check-update — no update needed", async () => {
      const result = await runWorkflow("check-update", { package: "com.test", currentVersion: "2.0" });
      expect(result.success).toBe(true);
      const output = result.output as any;
      expect(output.updateAvailable).toBe(false);
    });

    // ---- Security & RE workflows ----

    test("security-scan — downloads and returns security report", async () => {
      const result = await runWorkflow("security-scan", { package: "com.test" });
      expect(result.success).toBe(true);
      const output = result.output as any;
      expect(output.packageName).toBe("com.test");
      expect(output.versionCount).toBe(2);
      expect(output.downloadedFile).toBeDefined();
      expect(output.downloadedFile.sha256).toBe("abc");
    });

    test("download-and-verify — returns SHA256 verification", async () => {
      const result = await runWorkflow("download-and-verify", { package: "com.test" });
      expect(result.success).toBe(true);
      const output = result.output as any;
      expect(output.sha256).toBe("abc");
      expect(output.verified).toBe(true);
    });

    // ---- Comparison workflows ----

    test("compare-versions — returns version jumps", async () => {
      const result = await runWorkflow("compare-versions", { package: "com.test" });
      expect(result.success).toBe(true);
      const output = result.output as any;
      expect(output.versionJumps).toBeDefined();
      expect(output.versionJumps.length).toBeGreaterThan(0);
      expect(output.versionJumps[0].codeDelta).toBe(1);
    });

    // ---- Discovery workflows ----

    test("explore-category — returns structured search results", async () => {
      const result = await runWorkflow("explore-category", { query: "games" });
      expect(result.success).toBe(true);
      const output = result.output as any;
      expect(output.totalResults).toBeGreaterThan(0);
      expect(output.apps).toBeDefined();
    });

    test("batch-info — gets info for multiple apps", async () => {
      const result = await runWorkflow("batch-info", { packages: "com.test,com.other" });
      expect(result.success).toBe(true);
      const output = result.output as any;
      expect(output.results).toBeDefined();
    });

    // ---- Validation workflows ----

    test("validate-package — returns valid for existing app", async () => {
      const result = await runWorkflow("validate-package", { package: "com.test" });
      expect(result.success).toBe(true);
      const output = result.output as any;
      expect(output.valid).toBe(true);
      expect(output.name).toBe("TestApp");
    });

    test("validate-package — returns invalid for non-existent app", async () => {
      mockGetInfo.mockResolvedValueOnce(null);
      const result = await runWorkflow("validate-package", { package: "com.nonexistent" });
      expect(result.success).toBe(false);
    });

    test("batch-validate — validates multiple packages", async () => {
      mockGetInfo
        .mockResolvedValueOnce({ packageName: "com.a", name: "A", version: "1.0" })
        .mockResolvedValueOnce(null);
      const result = await runWorkflow("batch-validate", { packages: "com.a,com.b" });
      expect(result.success).toBe(true);
      const output = result.output as any;
      expect(output.total).toBe(2);
      expect(output.valid).toBe(1);
      expect(output.invalid).toBe(1);
    });

    // ---- General error handling ----

    test("stops on first step failure", async () => {
      mockSearch.mockRejectedValueOnce(new Error("API down"));
      const result = await runWorkflow("search-and-download", { query: "nonexistent" });
      expect(result.success).toBe(false);
      expect(result.steps).toHaveLength(1);
    });

    test("passes outputDir option", async () => {
      const result = await runWorkflow("search-and-download", { query: "test" }, { outputDir: "/custom/dir" });
      expect(result.success).toBe(true);
    });

    test("download step failure propagates error", async () => {
      mockDownload.mockRejectedValueOnce(new Error("Network error"));
      const result = await runWorkflow("search-and-download", { query: "test" });
      expect(result.success).toBe(false);
      expect(result.error).toContain("Network error");
    });
  });
});

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
      { version: "1.0", versionCode: 1, downloadUrl: "https://a", type: "apk" },
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
    test("returns at least 10 built-in workflows", () => {
      const workflows = listWorkflows();
      expect(workflows.length).toBeGreaterThanOrEqual(10);
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
      expect(mockDownload).toHaveBeenCalledWith("com.test", expect.objectContaining({ outputDir: expect.any(String) }));
      expect(result.steps).toHaveLength(2);
    });

    test("search-and-download — returns composed output", async () => {
      const result = await runWorkflow("search-and-download", { query: "test" });
      const output = result.output as any;
      expect(output.app).toBe("TestApp");
      expect(output.packageName).toBe("com.test");
      expect(output.filePath).toBe("/tmp/test.apk");
      expect(output.sha256).toBe("abc");
    });

    test("download-by-name — searches and downloads", async () => {
      const result = await runWorkflow("download-by-name", { query: "telegram" });
      expect(result.success).toBe(true);
      expect(mockSearch).toHaveBeenCalledWith("telegram");
      expect(mockDownload).toHaveBeenCalled();
    });

    test("search-and-info — searches and gets info", async () => {
      const result = await runWorkflow("search-and-info", { query: "test" });
      expect(result.success).toBe(true);
      expect(mockSearch).toHaveBeenCalledWith("test");
      expect(mockGetInfo).toHaveBeenCalledWith("com.test");
      const output = result.output as any;
      expect(output.searchMatch).toBe("TestApp");
      expect(output.packageName).toBe("com.test");
    });

    test("search-and-report — searches, gets info and versions", async () => {
      const result = await runWorkflow("search-and-report", { query: "test" });
      expect(result.success).toBe(true);
      expect(mockSearch).toHaveBeenCalled();
      expect(mockGetInfo).toHaveBeenCalled();
      expect(mockGetVersions).toHaveBeenCalled();
      const output = result.output as any;
      expect(output.searchMatch).toBe("TestApp");
      expect(output.appInfo).toBeDefined();
      expect(output.versions).toBeDefined();
    });

    test("search-and-report — fails when no results found", async () => {
      mockSearch.mockResolvedValueOnce({ apps: [] });
      const result = await runWorkflow("search-and-report", { query: "zzzzz" });
      expect(result.success).toBe(false);
      expect(result.error).toContain("No apps found");
    });

    // ---- Package-based workflows ----

    test("app-report — returns info and versions", async () => {
      const result = await runWorkflow("app-report", { package: "com.test" });
      expect(result.success).toBe(true);
      expect(mockGetInfo).toHaveBeenCalledWith("com.test");
      expect(mockGetVersions).toHaveBeenCalledWith("com.test");
      const output = result.output as any;
      expect(output.appInfo).toBeDefined();
      expect(output.versions).toBeDefined();
    });

    test("download-latest — gets info then downloads", async () => {
      const result = await runWorkflow("download-latest", { package: "com.test" });
      expect(result.success).toBe(true);
      expect(mockGetInfo).toHaveBeenCalledWith("com.test");
      expect(mockDownload).toHaveBeenCalledWith("com.test", expect.objectContaining({ outputDir: expect.any(String) }));
      const output = result.output as any;
      expect(output.app).toBe("TestApp");
      expect(output.developer).toBe("TestDev");
      expect(output.updateDate).toBe("2024-01-01");
    });

    test("download-version — gets info then downloads specific version", async () => {
      const result = await runWorkflow("download-version", { package: "com.test", version: "0.9" });
      expect(result.success).toBe(true);
      expect(mockGetInfo).toHaveBeenCalledWith("com.test");
      expect(mockDownload).toHaveBeenCalledWith("com.test", expect.objectContaining({ version: "0.9" }));
      const output = result.output as any;
      expect(output.requestedVersion).toBe("0.9");
      expect(output.actualVersion).toBe("1.0");
    });

    test("verify-and-download — verifies then downloads", async () => {
      const result = await runWorkflow("verify-and-download", { package: "com.test" });
      expect(result.success).toBe(true);
      expect(mockGetInfo).toHaveBeenCalledWith("com.test");
      expect(mockDownload).toHaveBeenCalled();
    });

    test("verify-and-download — fails when app not found", async () => {
      mockGetInfo.mockResolvedValueOnce(null);
      const result = await runWorkflow("verify-and-download", { package: "com.nonexistent" });
      expect(result.success).toBe(false);
      expect(result.error).toContain("App not found");
    });

    test("info-and-versions — returns info and versions", async () => {
      const result = await runWorkflow("info-and-versions", { package: "com.test" });
      expect(result.success).toBe(true);
      const output = result.output as any;
      expect(output.appInfo).toBeDefined();
      expect(output.versions).toBeDefined();
    });

    // ---- Discovery workflows ----

    test("trending-and-info — returns trending apps", async () => {
      const result = await runWorkflow("trending-and-info", {});
      expect(result.success).toBe(true);
      expect(mockTrending).toHaveBeenCalled();
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
      expect(mockDownload).toHaveBeenCalledWith("com.test", expect.objectContaining({ outputDir: "/custom/dir" }));
    });

    test("download step failure propagates error", async () => {
      mockDownload.mockRejectedValueOnce(new Error("Network error"));
      const result = await runWorkflow("search-and-download", { query: "test" });
      expect(result.success).toBe(false);
      expect(result.error).toContain("Network error");
    });
  });
});

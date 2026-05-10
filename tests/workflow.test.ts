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

const mockTrending = vi.fn().mockResolvedValue([]);

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
  });

  describe("listWorkflows", () => {
    test("returns all built-in workflows", () => {
      const workflows = listWorkflows();
      expect(workflows.length).toBeGreaterThanOrEqual(3);
      const names = workflows.map((w) => w.name);
      expect(names).toContain("search-and-download");
      expect(names).toContain("download-by-name");
      expect(names).toContain("app-report");
    });

    test("each workflow has name, description, and steps", () => {
      for (const wf of listWorkflows()) {
        expect(wf.name).toBeTruthy();
        expect(wf.description).toBeTruthy();
        expect(wf.steps.length).toBeGreaterThan(0);
      }
    });
  });

  describe("runWorkflow", () => {
    test("returns error for unknown workflow", async () => {
      const result = await runWorkflow("nonexistent", {});
      expect(result.success).toBe(false);
      expect(result.error).toContain("Unknown workflow");
    });

    test("search-and-download — searches and downloads first result", async () => {
      const result = await runWorkflow("search-and-download", { query: "test" });
      expect(result.success).toBe(true);
      expect(mockSearch).toHaveBeenCalledWith("test");
      expect(mockDownload).toHaveBeenCalledWith("com.test", expect.objectContaining({ outputDir: expect.any(String) }));
      expect(result.steps).toHaveLength(2);
      expect(result.steps[0].action).toBe("search");
      expect(result.steps[1].action).toBe("download");
    });

    test("search-and-download — returns composed output", async () => {
      const result = await runWorkflow("search-and-download", { query: "test" });
      const output = result.output as any;
      expect(output.app).toBe("TestApp");
      expect(output.packageName).toBe("com.test");
      expect(output.filePath).toBe("/tmp/test.apk");
      expect(output.sha256).toBe("abc");
    });

    test("download-by-name — same as search-and-download", async () => {
      const result = await runWorkflow("download-by-name", { query: "telegram" });
      expect(result.success).toBe(true);
      expect(mockSearch).toHaveBeenCalledWith("telegram");
      expect(mockDownload).toHaveBeenCalled();
    });

    test("app-report — returns info and versions", async () => {
      const result = await runWorkflow("app-report", { package: "com.test" });
      expect(result.success).toBe(true);
      expect(mockGetInfo).toHaveBeenCalledWith("com.test");
      expect(mockGetVersions).toHaveBeenCalledWith("com.test");
      const output = result.output as any;
      expect(output.appInfo).toBeDefined();
      expect(output.versions).toBeDefined();
    });

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

    test("passes mode option", async () => {
      const result = await runWorkflow("search-and-download", { query: "test" }, { mode: "scraping" });
      expect(result.success).toBe(true);
    });

    test("search-and-download — fails when no results found", async () => {
      mockSearch.mockResolvedValueOnce({ apps: [] });
      const result = await runWorkflow("search-and-download", { query: "zzzzz" });
      expect(result.success).toBe(false);
      expect(result.error).toContain("No apps found");
    });

    test("download step failure propagates error", async () => {
      mockDownload.mockRejectedValueOnce(new Error("Network error"));
      const result = await runWorkflow("search-and-download", { query: "test" });
      expect(result.success).toBe(false);
      expect(result.error).toContain("Network error");
    });
  });
});

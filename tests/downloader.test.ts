import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("node:fs", () => ({
  mkdirSync: vi.fn(),
  renameSync: vi.fn(),
  statSync: vi.fn(),
}));

vi.mock("../src/utils/http.js", () => ({
  downloadFile: vi.fn().mockResolvedValue(1024000),
}));

vi.mock("../src/utils/crypto.js", () => ({
  sha256File: vi.fn().mockResolvedValue("abc123def456789"),
}));

import { mkdirSync, renameSync, statSync } from "node:fs";
import { downloadFile } from "../src/utils/http.js";
import { sha256File } from "../src/utils/crypto.js";
import { downloadApk } from "../src/core/downloader.js";
import type { DownloadOptions } from "../src/types/index.js";

const mockedDownloadFile = vi.mocked(downloadFile);
const mockedSha256File = vi.mocked(sha256File);
const mockedMkdirSync = vi.mocked(mkdirSync);
const mockedRenameSync = vi.mocked(renameSync);
const mockedStatSync = vi.mocked(statSync);

describe("downloadApk", () => {
  const defaultOptions: DownloadOptions = {
    outputDir: "/tmp/apks",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockedStatSync.mockReturnValue({ size: 1024000 } as any);
  });

  test("successful download with default fileName", async () => {
    const result = await downloadApk(
      "https://download.example.com/app.apk",
      "com.test.app",
      "1.0.0",
      "apk",
      defaultOptions
    );

    expect(mockedMkdirSync).toHaveBeenCalledWith("/tmp/apks", {
      recursive: true,
    });
    expect(mockedDownloadFile).toHaveBeenCalledTimes(1);
    const [url, tmpPath, options] = mockedDownloadFile.mock.calls[0] as [
      string,
      string,
      any,
    ];
    expect(url).toBe("https://download.example.com/app.apk");
    expect(tmpPath).toBe("/tmp/apks/com.test.app-1.0.0.apk.part");
    expect(options.headers["User-Agent"]).toContain("Dalvik");

    expect(mockedRenameSync).toHaveBeenCalledWith(
      "/tmp/apks/com.test.app-1.0.0.apk.part",
      "/tmp/apks/com.test.app-1.0.0.apk"
    );

    expect(mockedSha256File).toHaveBeenCalledWith(
      "/tmp/apks/com.test.app-1.0.0.apk"
    );

    expect(result).toEqual({
      filePath: "/tmp/apks/com.test.app-1.0.0.apk",
      packageName: "com.test.app",
      version: "1.0.0",
      fileType: "apk",
      fileSize: 1024000,
      sha256: "abc123def456789",
    });
  });

  test("download with custom fileName", async () => {
    const options: DownloadOptions = {
      outputDir: "/tmp/apks",
      fileName: "custom-file.apk",
    };

    const result = await downloadApk(
      "https://download.example.com/app.apk",
      "com.test.app",
      "1.0.0",
      "apk",
      options
    );

    const [_, tmpPath] = mockedDownloadFile.mock.calls[0] as [string, string, any];
    expect(tmpPath).toBe("/tmp/apks/custom-file.apk.part");

    expect(mockedRenameSync).toHaveBeenCalledWith(
      "/tmp/apks/custom-file.apk.part",
      "/tmp/apks/custom-file.apk"
    );

    expect(result.filePath).toBe("/tmp/apks/custom-file.apk");
  });

  test("download with xapk fileType", async () => {
    const result = await downloadApk(
      "https://download.example.com/app.xapk",
      "com.test.app",
      "2.0.0",
      "xapk",
      defaultOptions
    );

    const [_, tmpPath] = mockedDownloadFile.mock.calls[0] as [string, string, any];
    expect(tmpPath).toBe("/tmp/apks/com.test.app-2.0.0.xapk.part");
    expect(result.fileType).toBe("xapk");
  });

  test("download with proxy", async () => {
    const proxy = "http://127.0.0.1:7890";

    await downloadApk(
      "https://download.example.com/app.apk",
      "com.test.app",
      "1.0.0",
      "apk",
      defaultOptions,
      proxy
    );

    const [, , options] = mockedDownloadFile.mock.calls[0] as [
      string,
      string,
      any,
    ];
    expect(options.proxy).toBe("http://127.0.0.1:7890");
  });

  test("download without proxy passes empty string", async () => {
    await downloadApk(
      "https://download.example.com/app.apk",
      "com.test.app",
      "1.0.0",
      "apk",
      defaultOptions
    );

    const [, , options] = mockedDownloadFile.mock.calls[0] as [
      string,
      string,
      any,
    ];
    expect(options.proxy).toBe("");
  });

  test("download with onProgress callback passes it through", async () => {
    const onProgress = vi.fn();
    const options: DownloadOptions = {
      outputDir: "/tmp/apks",
      onProgress,
    };

    await downloadApk(
      "https://download.example.com/app.apk",
      "com.test.app",
      "1.0.0",
      "apk",
      options
    );

    const [, , dlOptions] = mockedDownloadFile.mock.calls[0] as [
      string,
      string,
      any,
    ];
    expect(dlOptions.onProgress).toBe(onProgress);
  });

  test("creates output directory before downloading", async () => {
    await downloadApk(
      "https://download.example.com/app.apk",
      "com.test.app",
      "1.0.0",
      "apk",
      defaultOptions
    );

    // mkdirSync should be called before downloadFile
    const mkdirCall = mockedMkdirSync.mock.invocationCallOrder[0];
    const downloadCall = mockedDownloadFile.mock.invocationCallOrder[0];
    expect(mkdirCall).toBeLessThan(downloadCall);
  });

  test("renames .part file to final file after download", async () => {
    await downloadApk(
      "https://download.example.com/app.apk",
      "com.test.app",
      "1.0.0",
      "apk",
      defaultOptions
    );

    // renameSync should be called after downloadFile
    const downloadCall = mockedDownloadFile.mock.invocationCallOrder[0];
    const renameCall = mockedRenameSync.mock.invocationCallOrder[0];
    const shaCall = mockedSha256File.mock.invocationCallOrder[0];
    expect(renameCall).toBeGreaterThan(downloadCall);
    expect(shaCall).toBeGreaterThan(renameCall);
  });

  test("returns correct sha256 from file hash", async () => {
    mockedSha256File.mockResolvedValueOnce("deadbeef12345678");

    const result = await downloadApk(
      "https://download.example.com/app.apk",
      "com.test.app",
      "1.0.0",
      "apk",
      defaultOptions
    );

    expect(result.sha256).toBe("deadbeef12345678");
  });

  test("returns correct file size from statSync", async () => {
    mockedStatSync.mockReturnValue({ size: 999999 } as any);

    const result = await downloadApk(
      "https://download.example.com/app.apk",
      "com.test.app",
      "1.0.0",
      "apk",
      defaultOptions
    );

    expect(result.fileSize).toBe(999999);
  });

  test("sends correct User-Agent header for Android Dalvik", async () => {
    await downloadApk(
      "https://download.example.com/app.apk",
      "com.test.app",
      "1.0.0",
      "apk",
      defaultOptions
    );

    const [, , options] = mockedDownloadFile.mock.calls[0] as [
      string,
      string,
      any,
    ];
    expect(options.headers["User-Agent"]).toContain("Dalvik/2.1.0");
    expect(options.headers["Accept"]).toBe("*/*");
  });
});

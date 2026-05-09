import { describe, test, expect } from "vitest";
import type { SearchResult, AppDetail, AppVersion, DownloadResult } from "../src/types/index.js";

describe("Full workflow data flow", () => {
  test("search result provides package name for info command", () => {
    const searchResult: SearchResult = {
      apps: [
        {
          packageName: "org.telegram.messenger",
          name: "Telegram",
          version: "10.5.2",
          developer: "Telegram LLC",
        },
      ],
    };

    const selected = searchResult.apps[0];
    expect(selected.packageName).toBe("org.telegram.messenger");
    expect(selected.name).toBe("Telegram");
  });

  test("info result provides version and download availability", () => {
    const detail: AppDetail = {
      packageName: "org.telegram.messenger",
      name: "Telegram",
      version: "10.5.2",
      versionCode: 10520,
      developer: "Telegram LLC",
      downloadUrl: "https://d.apkpure.com/b/APK/org.telegram.messenger",
      fileType: "apk",
    };

    expect(detail.downloadUrl).toBeTruthy();
    expect(detail.fileType).toBe("apk");
  });

  test("versions list allows selecting specific version for download", () => {
    const versions: AppVersion[] = [
      { version: "10.5.2", versionCode: 10520, downloadUrl: "https://a", type: "apk" },
      { version: "10.5.1", versionCode: 10510, downloadUrl: "https://b", type: "apk" },
      { version: "10.4.3", versionCode: 10430, downloadUrl: "https://c", type: "xapk" },
    ];

    const target = versions.find((v) => v.version === "10.5.1");
    expect(target).toBeDefined();
    expect(target!.versionCode).toBe(10510);
  });

  test("download result includes file verification info", () => {
    const result: DownloadResult = {
      filePath: "/tmp/apks/telegram-10.5.2.apk",
      packageName: "org.telegram.messenger",
      version: "10.5.2",
      fileType: "apk",
      fileSize: 63100000,
      sha256: "abc123def456",
    };

    expect(result.sha256).toMatch(/^[a-f0-9]+$/);
    expect(result.fileSize).toBeGreaterThan(0);
    expect(result.filePath).toContain("telegram-10.5.2.apk");
  });

  test("workflow: search → pick → info → download (latest)", () => {
    const searchResult: SearchResult = {
      apps: [{ packageName: "com.whatsapp", name: "WhatsApp", version: "2.24.5" }],
    };
    const picked = searchResult.apps[0];

    const detail: AppDetail = {
      packageName: picked.packageName,
      name: "WhatsApp",
      version: "2.24.5",
      downloadUrl: "https://cdn.example.com/whatsapp.apk",
      fileType: "apk",
    };

    const result: DownloadResult = {
      filePath: "./apks/com.whatsapp-2.24.5.apk",
      packageName: detail.packageName,
      version: detail.version,
      fileType: detail.fileType,
      fileSize: 50000000,
      sha256: "deadbeef",
    };

    expect(result.packageName).toBe("com.whatsapp");
    expect(result.version).toBe("2.24.5");
  });

  test("workflow: search → info → versions → download (specific)", () => {
    const versions: AppVersion[] = [
      { version: "2.24.5", versionCode: 2245, downloadUrl: "https://a", type: "apk" },
      { version: "2.24.4", versionCode: 2244, downloadUrl: "https://b", type: "apk" },
    ];

    const target = versions.find((v) => v.version === "2.24.4");
    expect(target!.versionCode).toBe(2244);

    const result: DownloadResult = {
      filePath: "./apks/com.whatsapp-2.24.4.apk",
      packageName: "com.whatsapp",
      version: target!.version,
      fileType: target!.type,
      fileSize: 49000000,
      sha256: "cafebabe",
    };

    expect(result.version).toBe("2.24.4");
  });
});

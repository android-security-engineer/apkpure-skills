import { describe, test, expect, vi, beforeEach } from "vitest";

const mockSearch = vi.fn().mockResolvedValue({
  data: {
    data: [
      {
        data: [
          {
            app_info: {
              package_name: "org.telegram.messenger",
              title: "Telegram",
              version_name: "10.5.2",
              icon_url: "https://icon.png",
              description_short: "Fast messaging",
              category: "Communication",
              developer: "Telegram LLC",
              rating: "4.8",
            },
          },
        ],
      },
    ],
  },
});

const mockGetDetail = vi.fn().mockResolvedValue({
  app_detail: {
    title: "Telegram",
    package_name: "org.telegram.messenger",
    version_name: "10.5.2",
    version_code: 10520,
    description_short: "Fast messaging",
    icon_url: "https://icon.png",
    category: "Communication",
    developer: "Telegram LLC",
    rating: "4.8",
    asset: { url: "https://download.example.com/telegram.apk", type: "apk" },
    screenshots: ["https://ss1.png"],
    update_date: "2024-01-01",
    requires_android: "6.0+",
  },
});

vi.mock("../src/client/mobile-client.js", () => ({
  MobileClient: vi.fn(() => ({
    search: mockSearch,
    getDetail: mockGetDetail,
  })),
}));

const mockScrapingSearch = vi.fn().mockResolvedValue({
  apps: [{ packageName: "com.scraped", name: "ScrapedApp", version: "1.0" }],
});

const mockScrapingGetInfo = vi.fn().mockResolvedValue({
  packageName: "com.scraped",
  name: "ScrapedApp",
  version: "1.0",
  downloadUrl: "https://download/scraped.apk",
  fileType: "apk",
});

const mockScrapingGetVersions = vi.fn().mockResolvedValue([
  { version: "1.0", versionCode: 1, downloadUrl: "https://a", type: "apk" },
]);

const mockScrapingGetDownloadUrl = vi.fn().mockResolvedValue(
  "https://download.example.com/v1.apk"
);

const mockScrapingTrending = vi.fn().mockResolvedValue([
  { title: "Game1", iconUrl: "", detailUrl: "https://a" },
]);

vi.mock("../src/client/scraping-client.js", () => ({
  ScrapingClient: vi.fn(() => ({
    search: mockScrapingSearch,
    getInfo: mockScrapingGetInfo,
    getVersions: mockScrapingGetVersions,
    getDownloadUrl: mockScrapingGetDownloadUrl,
    trending: mockScrapingTrending,
  })),
}));

vi.mock("../src/core/downloader.js", () => ({
  downloadApk: vi.fn().mockResolvedValue({
    filePath: "/tmp/test.apk",
    packageName: "org.telegram.messenger",
    version: "10.5.2",
    fileType: "apk",
    fileSize: 1000,
    sha256: "abc123",
  }),
}));

const mockDetectProxy = vi.fn().mockResolvedValue(null);

vi.mock("../src/utils/proxy.js", () => ({
  detectProxy: (...args: unknown[]) => mockDetectProxy(...args),
}));

import { ApkPure } from "../src/core/apkpure.js";
import { MobileClient } from "../src/client/mobile-client.js";
import { ScrapingClient } from "../src/client/scraping-client.js";
import { downloadApk } from "../src/core/downloader.js";
import type { AppDetail, AppVersion, DownloadResult, TrendingApp } from "../src/types/index.js";

const MockedMobileClient = vi.mocked(MobileClient);
const MockedScrapingClient = vi.mocked(ScrapingClient);
const mockedDownloadApk = vi.mocked(downloadApk);

describe("ApkPure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDetectProxy.mockResolvedValue(null);

    // Reset mobile mocks
    mockSearch.mockResolvedValue({
      data: {
        data: [
          {
            data: [
              {
                app_info: {
                  package_name: "org.telegram.messenger",
                  title: "Telegram",
                  version_name: "10.5.2",
                  icon_url: "https://icon.png",
                  description_short: "Fast messaging",
                  category: "Communication",
                  developer: "Telegram LLC",
                  rating: "4.8",
                },
              },
            ],
          },
        ],
      },
    });
    mockGetDetail.mockResolvedValue({
      app_detail: {
        title: "Telegram",
        package_name: "org.telegram.messenger",
        version_name: "10.5.2",
        version_code: 10520,
        description_short: "Fast messaging",
        icon_url: "https://icon.png",
        category: "Communication",
        developer: "Telegram LLC",
        rating: "4.8",
        asset: { url: "https://download.example.com/telegram.apk", type: "apk" },
        screenshots: ["https://ss1.png"],
        update_date: "2024-01-01",
        requires_android: "6.0+",
      },
    });

    // Reset scraping mocks
    mockScrapingSearch.mockResolvedValue({
      apps: [{ packageName: "com.scraped", name: "ScrapedApp", version: "1.0" }],
    });
    mockScrapingGetInfo.mockResolvedValue({
      packageName: "com.scraped",
      name: "ScrapedApp",
      version: "1.0",
      downloadUrl: "https://download/scraped.apk",
      fileType: "apk",
    });
    mockScrapingGetVersions.mockResolvedValue([
      { version: "1.0", versionCode: 1, downloadUrl: "https://a", type: "apk" },
    ]);
    mockScrapingGetDownloadUrl.mockResolvedValue(
      "https://download.example.com/v1.apk"
    );
    mockScrapingTrending.mockResolvedValue([
      { title: "Game1", iconUrl: "", detailUrl: "https://a" },
    ]);

    mockedDownloadApk.mockResolvedValue({
      filePath: "/tmp/test.apk",
      packageName: "org.telegram.messenger",
      version: "10.5.2",
      fileType: "apk",
      fileSize: 1000,
      sha256: "abc123",
    });
  });

  // ---- Constructor and Init ----

  describe("constructor and init", () => {
    test("creates MobileClient and ScrapingClient instances", () => {
      new ApkPure({ proxy: "http://proxy" });
      expect(MockedMobileClient).toHaveBeenCalled();
      expect(MockedScrapingClient).toHaveBeenCalled();
    });

    test("auto-detects proxy when no proxy is configured", async () => {
      mockDetectProxy.mockResolvedValueOnce({
        url: "http://127.0.0.1:7890",
        source: "test",
      });

      const sdk = new ApkPure();
      await (sdk as any).ensureReady();

      expect(mockDetectProxy).toHaveBeenCalledTimes(1);
      // After detection, MobileClient is re-created with proxy
      expect(MockedMobileClient.mock.calls.length).toBeGreaterThanOrEqual(2);
      const lastCall =
        MockedMobileClient.mock.calls[MockedMobileClient.mock.calls.length - 1];
      expect(lastCall[0].proxy).toBe("http://127.0.0.1:7890");
    });

    test("does not detect proxy when proxy is already configured", async () => {
      const sdk = new ApkPure({ proxy: "http://custom:8080" });
      await (sdk as any).ensureReady();

      expect(mockDetectProxy).not.toHaveBeenCalled();
    });

    test("does not re-create clients when detectProxy returns null", async () => {
      mockDetectProxy.mockResolvedValueOnce(null);
      const sdk = new ApkPure();
      await (sdk as any).ensureReady();

      // Only the constructor calls
      expect(MockedMobileClient).toHaveBeenCalledTimes(1);
      expect(MockedScrapingClient).toHaveBeenCalledTimes(1);
    });
  });

  // ---- Search ----

  describe("search()", () => {
    test("in auto mode: uses mobile API first", async () => {
      const sdk = new ApkPure({ mode: "auto", proxy: "http://proxy" });
      const result = await sdk.search("telegram");
      expect(result.apps[0].packageName).toBe("org.telegram.messenger");
      expect(result.page).toBe(1);
    });

    test("in api mode: throws on failure", async () => {
      mockSearch.mockRejectedValue(new Error("API down"));
      const sdk = new ApkPure({ mode: "api", proxy: "http://proxy" });
      await expect(sdk.search("test")).rejects.toThrow(
        'Search failed for "test"'
      );
    });

    test("in auto mode: falls back to scraping on API failure", async () => {
      mockSearch.mockRejectedValue(new Error("API down"));
      const sdk = new ApkPure({ mode: "auto", proxy: "http://proxy" });
      const result = await sdk.search("test");
      expect(result.apps[0].packageName).toBe("com.scraped");
    });

    test("in scraping mode: uses scraper directly", async () => {
      const sdk = new ApkPure({ mode: "scraping", proxy: "http://proxy" });
      const result = await sdk.search("test");
      expect(result.apps[0].packageName).toBe("com.scraped");
    });

    test("deduplicates apps by package_name", async () => {
      mockSearch.mockResolvedValueOnce({
        data: {
          data: [
            {
              data: [
                {
                  app_info: {
                    package_name: "org.telegram.messenger",
                    title: "Telegram",
                    version_name: "10.5.2",
                  },
                },
                {
                  app_info: {
                    package_name: "org.telegram.messenger",
                    title: "Telegram Duplicate",
                    version_name: "10.5.1",
                  },
                },
              ],
            },
          ],
        },
      });

      const sdk = new ApkPure({ mode: "api", proxy: "http://proxy" });
      const result = await sdk.search("telegram");
      expect(result.apps).toHaveLength(1);
      expect(result.apps[0].name).toBe("Telegram");
    });

    test("skips items without package_name", async () => {
      mockSearch.mockResolvedValueOnce({
        data: {
          data: [
            {
              data: [
                {
                  app_info: {
                    package_name: "com.valid",
                    title: "Valid",
                  },
                },
                {
                  app_info: {
                    title: "No Package",
                  },
                },
              ],
            },
          ],
        },
      });

      const sdk = new ApkPure({ mode: "api", proxy: "http://proxy" });
      const result = await sdk.search("test");
      expect(result.apps).toHaveLength(1);
      expect(result.apps[0].packageName).toBe("com.valid");
    });

    test("passes page parameter", async () => {
      const sdk = new ApkPure({ mode: "api", proxy: "http://proxy" });
      await sdk.search("test", 5);
      expect(mockSearch).toHaveBeenCalledWith("test", 5);
    });

    test("maps all AppInfo fields correctly", async () => {
      mockSearch.mockResolvedValueOnce({
        data: {
          data: [
            {
              data: [
                {
                  app_info: {
                    package_name: "com.test",
                    title: "Test App",
                    version_name: "2.0",
                    icon_url: "https://icon.png",
                    description_short: "A test app",
                    category: "Tools",
                    developer: "TestDev",
                    rating: "4.5",
                  },
                },
              ],
            },
          ],
        },
      });

      const sdk = new ApkPure({ mode: "api", proxy: "http://proxy" });
      const result = await sdk.search("test");
      const app = result.apps[0];
      expect(app.packageName).toBe("com.test");
      expect(app.name).toBe("Test App");
      expect(app.version).toBe("2.0");
      expect(app.iconUrl).toBe("https://icon.png");
      expect(app.description).toBe("A test app");
      expect(app.category).toBe("Tools");
      expect(app.developer).toBe("TestDev");
      expect(app.rating).toBe("4.5");
    });

    test("handles empty data gracefully", async () => {
      mockSearch.mockResolvedValueOnce({ data: {} });

      const sdk = new ApkPure({ mode: "api", proxy: "http://proxy" });
      const result = await sdk.search("test");
      expect(result.apps).toHaveLength(0);
    });

    test("defaults version to empty string when missing", async () => {
      mockSearch.mockResolvedValueOnce({
        data: {
          data: [
            {
              data: [
                {
                  app_info: {
                    package_name: "com.test",
                    title: "Test",
                  },
                },
              ],
            },
          ],
        },
      });

      const sdk = new ApkPure({ mode: "api", proxy: "http://proxy" });
      const result = await sdk.search("test");
      expect(result.apps[0].version).toBe("");
    });
  });

  // ---- GetInfo ----

  describe("getInfo()", () => {
    test("in auto mode: returns mobile API detail", async () => {
      const sdk = new ApkPure({ mode: "auto", proxy: "http://proxy" });
      const detail = await sdk.getInfo("org.telegram.messenger");
      expect(detail?.packageName).toBe("org.telegram.messenger");
      expect(detail?.downloadUrl).toBe(
        "https://download.example.com/telegram.apk"
      );
      expect(detail?.fileType).toBe("apk");
      expect(detail?.screenshots).toEqual(["https://ss1.png"]);
      expect(detail?.updateDate).toBe("2024-01-01");
      expect(detail?.requiresAndroid).toBe("6.0+");
    });

    test("in api mode: throws on failure", async () => {
      mockGetDetail.mockRejectedValue(new Error("API down"));
      const sdk = new ApkPure({ mode: "api", proxy: "http://proxy" });
      await expect(sdk.getInfo("com.test")).rejects.toThrow(
        'Get info failed for "com.test"'
      );
    });

    test("in auto mode: falls back to scraping on API failure", async () => {
      mockGetDetail.mockRejectedValue(new Error("API down"));
      const sdk = new ApkPure({ mode: "auto", proxy: "http://proxy" });
      const detail = await sdk.getInfo("com.test");
      expect(detail?.packageName).toBe("com.scraped");
    });

    test("in scraping mode: uses scraper directly", async () => {
      const sdk = new ApkPure({ mode: "scraping", proxy: "http://proxy" });
      const detail = await sdk.getInfo("com.test");
      expect(detail?.packageName).toBe("com.scraped");
    });

    test("returns null when app_detail is missing", async () => {
      mockGetDetail.mockResolvedValueOnce({});
      const sdk = new ApkPure({ mode: "api", proxy: "http://proxy" });
      const result = await sdk.getInfo("com.nonexistent");
      expect(result).toBeNull();
    });

    test("maps all AppDetail fields from mobile response", async () => {
      mockGetDetail.mockResolvedValueOnce({
        app_detail: {
          title: "TestApp",
          package_name: "com.test",
          version_name: "1.0",
          version_code: 100,
          description_short: "Short desc",
          description: "Full desc",
          icon_url: "https://icon.png",
          category: "Games",
          developer: "Dev",
          rating: "4.9",
          asset: { url: "https://dl.com/a.xapk", type: "XAPK" },
          screenshots: ["https://ss1.png", "https://ss2.png"],
          update_date: "2024-06-01",
          requires_android: "8.0+",
        },
      });

      const sdk = new ApkPure({ mode: "api", proxy: "http://proxy" });
      const detail = await sdk.getInfo("com.test");

      expect(detail?.name).toBe("TestApp");
      expect(detail?.version).toBe("1.0");
      expect(detail?.versionCode).toBe(100);
      expect(detail?.iconUrl).toBe("https://icon.png");
      expect(detail?.description).toBe("Short desc");
      expect(detail?.developer).toBe("Dev");
      expect(detail?.rating).toBe("4.9");
      expect(detail?.category).toBe("Games");
      expect(detail?.updateDate).toBe("2024-06-01");
      expect(detail?.requiresAndroid).toBe("8.0+");
      expect(detail?.downloadUrl).toBe("https://dl.com/a.xapk");
      expect(detail?.fileType).toBe("xapk");
      expect(detail?.screenshots).toHaveLength(2);
    });

    test("falls back to description when description_short is missing", async () => {
      mockGetDetail.mockResolvedValueOnce({
        app_detail: {
          title: "TestApp",
          package_name: "com.test",
          version_name: "1.0",
          description: "Full description fallback",
        },
      });

      const sdk = new ApkPure({ mode: "api", proxy: "http://proxy" });
      const detail = await sdk.getInfo("com.test");
      expect(detail?.description).toBe("Full description fallback");
    });

    test("defaults fileType to apk when asset is missing", async () => {
      mockGetDetail.mockResolvedValueOnce({
        app_detail: {
          title: "TestApp",
          package_name: "com.test",
          version_name: "1.0",
        },
      });

      const sdk = new ApkPure({ mode: "api", proxy: "http://proxy" });
      const detail = await sdk.getInfo("com.test");
      expect(detail?.fileType).toBe("apk");
      expect(detail?.downloadUrl).toBe("");
    });

    test("maps APKS fileType correctly", async () => {
      mockGetDetail.mockResolvedValueOnce({
        app_detail: {
          title: "TestApp",
          package_name: "com.test",
          version_name: "1.0",
          asset: { url: "https://dl.com/a.apks", type: "APKS" },
        },
      });

      const sdk = new ApkPure({ mode: "api", proxy: "http://proxy" });
      const detail = await sdk.getInfo("com.test");
      expect(detail?.fileType).toBe("apks");
    });

    test("defaults version to empty string when version_name is missing", async () => {
      mockGetDetail.mockResolvedValueOnce({
        app_detail: {
          title: "TestApp",
          package_name: "com.test",
          version_name: undefined,
        },
      });

      const sdk = new ApkPure({ mode: "api", proxy: "http://proxy" });
      const detail = await sdk.getInfo("com.test");
      expect(detail?.version).toBe("");
    });
  });

  // ---- GetVersions ----

  describe("getVersions()", () => {
    test("delegates to scraper", async () => {
      const sdk = new ApkPure({ proxy: "http://proxy" });
      const versions = await sdk.getVersions("com.test");
      expect(versions).toHaveLength(1);
      expect(versions[0].version).toBe("1.0");
    });

    test("returns empty array when no versions", async () => {
      mockScrapingGetVersions.mockResolvedValueOnce([]);
      const sdk = new ApkPure({ proxy: "http://proxy" });
      const versions = await sdk.getVersions("com.nonexistent");
      expect(versions).toEqual([]);
    });
  });

  // ---- Download ----

  describe("download()", () => {
    test("downloads latest version when no version specified", async () => {
      const sdk = new ApkPure({ mode: "auto", proxy: "http://proxy" });
      const result = await sdk.download("org.telegram.messenger", {
        outputDir: "/tmp",
      });
      expect(result.filePath).toBe("/tmp/test.apk");
      expect(mockedDownloadApk).toHaveBeenCalled();
    });

    test("downloads specific version different from latest", async () => {
      const sdk = new ApkPure({ mode: "auto", proxy: "http://proxy" });
      const result = await sdk.download("org.telegram.messenger", {
        outputDir: "/tmp",
        version: "1.0",
      });
      expect(result).toBeDefined();
      expect(mockScrapingGetVersions).toHaveBeenCalled();
      expect(mockScrapingGetDownloadUrl).toHaveBeenCalled();
    });

    test("throws when no download URL found (null detail)", async () => {
      mockGetDetail.mockResolvedValueOnce({});

      const sdk = new ApkPure({ mode: "api", proxy: "http://proxy" });
      await expect(
        sdk.download("com.test", { outputDir: "/tmp" })
      ).rejects.toThrow('No download URL found for "com.test"');
    });

    test("throws when download URL is empty string", async () => {
      mockGetDetail.mockResolvedValueOnce({
        app_detail: {
          package_name: "com.test",
          title: "Test",
          version_name: "1.0",
        },
      });

      const sdk = new ApkPure({ mode: "api", proxy: "http://proxy" });
      await expect(
        sdk.download("com.test", { outputDir: "/tmp" })
      ).rejects.toThrow('No download URL found for "com.test"');
    });

    test("throws when specific version not found in versions list", async () => {
      mockScrapingGetVersions.mockResolvedValueOnce([
        { version: "1.0", versionCode: 1, downloadUrl: "https://a", type: "apk" },
      ]);

      const sdk = new ApkPure({ mode: "scraping", proxy: "http://proxy" });
      await expect(
        sdk.download("com.test", { outputDir: "/tmp", version: "9.0.0" })
      ).rejects.toThrow('Version "9.0.0" not found for "com.test"');
    });

    test("does not fetch versions when version matches latest", async () => {
      // The mobile API returns version 10.5.2, and we request the same
      const sdk = new ApkPure({ mode: "api", proxy: "http://proxy" });
      await sdk.download("org.telegram.messenger", {
        outputDir: "/tmp",
        version: "10.5.2",
      });
      expect(mockScrapingGetVersions).not.toHaveBeenCalled();
    });

    test("uses direct URL from getDownloadUrl for specific version", async () => {
      mockScrapingGetVersions.mockResolvedValueOnce([
        { version: "10.5.2", versionCode: 10520, downloadUrl: "https://a", type: "apk" },
        { version: "10.5.1", versionCode: 10510, downloadUrl: "https://b", type: "xapk" },
      ]);
      mockScrapingGetDownloadUrl.mockResolvedValueOnce(
        "https://direct.example.com/v1.apk"
      );

      const sdk = new ApkPure({ mode: "scraping", proxy: "http://proxy" });
      await sdk.download("org.telegram.messenger", {
        outputDir: "/tmp",
        version: "10.5.1",
      });

      expect(mockScrapingGetDownloadUrl).toHaveBeenCalledWith(
        "org.telegram.messenger",
        10510
      );
      expect(mockedDownloadApk).toHaveBeenCalledWith(
        "https://direct.example.com/v1.apk",
        "org.telegram.messenger",
        "10.5.1",
        "xapk",
        expect.any(Object),
        "http://proxy"
      );
    });

    test("falls back to original URL when getDownloadUrl returns null", async () => {
      mockScrapingGetVersions.mockResolvedValueOnce([
        { version: "10.5.2", versionCode: 10520, downloadUrl: "https://a", type: "apk" },
        { version: "10.5.1", versionCode: 10510, downloadUrl: "https://b", type: "apk" },
      ]);
      mockScrapingGetDownloadUrl.mockResolvedValueOnce(null);

      const sdk = new ApkPure({ mode: "scraping", proxy: "http://proxy" });
      await sdk.download("org.telegram.messenger", {
        outputDir: "/tmp",
        version: "10.5.1",
      });

      // Uses the original detail downloadUrl as fallback
      expect(mockedDownloadApk).toHaveBeenCalledWith(
        "https://download/scraped.apk",
        expect.any(String),
        "10.5.1",
        "apk",
        expect.any(Object),
        "http://proxy"
      );
    });

    test("passes proxy to downloadApk", async () => {
      const sdk = new ApkPure({ mode: "scraping", proxy: "http://custom:9999" });
      await sdk.download("org.telegram.messenger", { outputDir: "/tmp" });

      expect(mockedDownloadApk).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(Object),
        "http://custom:9999"
      );
    });
  });

  // ---- Trending ----

  describe("trending()", () => {
    test("delegates to scraper", async () => {
      const sdk = new ApkPure({ proxy: "http://proxy" });
      const apps = await sdk.trending();
      expect(apps).toHaveLength(1);
      expect(apps[0].title).toBe("Game1");
    });

    test("returns empty array when no trending apps", async () => {
      mockScrapingTrending.mockResolvedValueOnce([]);
      const sdk = new ApkPure({ proxy: "http://proxy" });
      const apps = await sdk.trending();
      expect(apps).toEqual([]);
    });
  });
});

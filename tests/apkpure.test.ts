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

const mockScrapingGetDownloadUrl = vi.fn().mockResolvedValue("https://download.example.com/v1.apk");

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

vi.mock("../src/utils/proxy.js", () => ({
  detectProxy: vi.fn().mockResolvedValue(null),
}));

import { ApkPure } from "../src/core/apkpure.js";
import { downloadApk } from "../src/core/downloader.js";

describe("ApkPure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    mockScrapingGetDownloadUrl.mockResolvedValue("https://download.example.com/v1.apk");
  });

  test("search in auto mode — uses mobile API first", async () => {
    const sdk = new ApkPure({ mode: "auto", proxy: "http://proxy" });
    const result = await sdk.search("telegram");
    expect(result.apps[0].packageName).toBe("org.telegram.messenger");
    expect(result.page).toBe(1);
  });

  test("search in api mode — throws on failure", async () => {
    mockSearch.mockRejectedValue(new Error("API down"));
    const sdk = new ApkPure({ mode: "api", proxy: "http://proxy" });
    await expect(sdk.search("test")).rejects.toThrow('Search failed for "test"');
  });

  test("search in auto mode — falls back to scraping on API failure", async () => {
    mockSearch.mockRejectedValue(new Error("API down"));
    const sdk = new ApkPure({ mode: "auto", proxy: "http://proxy" });
    const result = await sdk.search("test");
    expect(result.apps[0].packageName).toBe("com.scraped");
  });

  test("search in scraping mode — uses scraper directly", async () => {
    const sdk = new ApkPure({ mode: "scraping", proxy: "http://proxy" });
    const result = await sdk.search("test");
    expect(result.apps[0].packageName).toBe("com.scraped");
  });

  test("getInfo in auto mode — returns mobile API detail", async () => {
    const sdk = new ApkPure({ mode: "auto", proxy: "http://proxy" });
    const detail = await sdk.getInfo("org.telegram.messenger");
    expect(detail?.packageName).toBe("org.telegram.messenger");
    expect(detail?.downloadUrl).toBe("https://download.example.com/telegram.apk");
    expect(detail?.fileType).toBe("apk");
  });

  test("getInfo in api mode — throws on failure", async () => {
    mockGetDetail.mockRejectedValue(new Error("API down"));
    const sdk = new ApkPure({ mode: "api", proxy: "http://proxy" });
    await expect(sdk.getInfo("com.test")).rejects.toThrow('Get info failed for "com.test"');
  });

  test("getInfo in auto mode — falls back to scraping", async () => {
    mockGetDetail.mockRejectedValue(new Error("API down"));
    const sdk = new ApkPure({ mode: "auto", proxy: "http://proxy" });
    const detail = await sdk.getInfo("com.test");
    expect(detail?.packageName).toBe("com.scraped");
  });

  test("getInfo in scraping mode — uses scraper", async () => {
    const sdk = new ApkPure({ mode: "scraping", proxy: "http://proxy" });
    const detail = await sdk.getInfo("com.test");
    expect(detail?.packageName).toBe("com.scraped");
  });

  test("getVersions — delegates to scraper", async () => {
    const sdk = new ApkPure({ proxy: "http://proxy" });
    const versions = await sdk.getVersions("com.test");
    expect(versions).toHaveLength(1);
    expect(versions[0].version).toBe("1.0");
  });

  test("download latest version — gets info and downloads", async () => {
    const sdk = new ApkPure({ mode: "auto", proxy: "http://proxy" });
    const result = await sdk.download("org.telegram.messenger", {
      outputDir: "/tmp",
    });
    expect(result.filePath).toBe("/tmp/test.apk");
    expect(downloadApk).toHaveBeenCalled();
  });

  test("download specific version — finds version and downloads", async () => {
    const sdk = new ApkPure({ mode: "auto", proxy: "http://proxy" });
    const result = await sdk.download("org.telegram.messenger", {
      outputDir: "/tmp",
      version: "1.0",
    });
    expect(result).toBeDefined();
  });

  test("download — throws when no download URL", async () => {
    mockGetDetail.mockResolvedValue({
      app_detail: { package_name: "com.test", title: "Test", version_name: "1.0" },
    });
    const sdk = new ApkPure({ mode: "api", proxy: "http://proxy" });
    await expect(sdk.download("com.test", { outputDir: "/tmp" })).rejects.toThrow(
      'No download URL found for "com.test"'
    );
  });

  test("trending — delegates to scraper", async () => {
    const sdk = new ApkPure({ proxy: "http://proxy" });
    const apps = await sdk.trending();
    expect(apps).toHaveLength(1);
    expect(apps[0].title).toBe("Game1");
  });
});

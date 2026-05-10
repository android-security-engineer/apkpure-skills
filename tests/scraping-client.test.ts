import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("../src/utils/http.js", () => ({
  fetchHtml: vi.fn(),
  downloadFile: vi.fn(),
}));

import { ScrapingClient } from "../src/client/scraping-client.js";
import { fetchHtml } from "../src/utils/http.js";

const INFO_HTML = `
<html>
<body>
<div class="detail_banner">
  <div class="title_link">Telegram</div>
  <span class="rating">4.8</span>
  <p class="date">2024-01-15</p>
  <div class="icon"><img src="https://icon.png" /></div>
  <a class="download_apk_news"
     data-dt-version_code="10520"
     data-dt-filetype="xapk"
     href="/download/telegram">
  </a>
  <p class="details_sdk">
    <span>SDK</span> 10.5.2
    <span>Dev</span> Telegram LLC
  </p>
</div>
<div class="translate-content">A fast messaging app</div>
</body>
</html>
`;

const VERSIONS_HTML = `
<html>
<body>
<ul class="ver-wrap">
  <li>
    <a class="ver_download_link"
       data-dt-version="10.5.2"
       data-dt-versioncode="10520"
       href="/download/v1">
    </a>
  </li>
  <li>
    <a class="ver_download_link"
       data-dt-version="10.5.1"
       data-dt-versioncode="10510"
       href="/download/v2">
    </a>
  </li>
  <li class="last"><!-- skip this --></li>
</ul>
</body>
</html>
`;

const TRENDING_HTML = `
<html>
<body>
<div class="left floatr">
  <ul>
    <li>
      <div class="category-template-img">
        <a title="WhatsApp"></a>
        <img data-original="https://wa-icon.png" />
      </div>
      <div class="category-template-down">
        <a href="/whatsapp"></a>
      </div>
    </li>
    <li>
      <div class="category-template-img">
        <a title="Telegram"></a>
        <img data-original="https://tg-icon.png" />
      </div>
      <div class="category-template-down">
        <a href="https://apkpure.com/telegram"></a>
      </div>
    </li>
  </ul>
</div>
</body>
</html>
`;

describe("ScrapingClient", () => {
  let client: ScrapingClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new ScrapingClient(5000, "http://proxy:8080");
  });

  // ---- parseSize ----

  describe("parseSize", () => {
    test("parses MB size", () => {
      const result = (client as any).parseSize("45.2 MB");
      expect(result).toBeCloseTo(45.2 * 1024 * 1024, 0);
    });

    test("parses KB size", () => {
      const result = (client as any).parseSize("512 KB");
      expect(result).toBe(512 * 1024);
    });

    test("parses GB size", () => {
      const result = (client as any).parseSize("1.5 GB");
      expect(result).toBeCloseTo(1.5 * 1024 * 1024 * 1024, 0);
    });

    test("returns undefined for invalid size", () => {
      expect((client as any).parseSize("invalid")).toBeUndefined();
    });
  });

  // ---- extractSearchResult ----

  describe("extractSearchResult", () => {
    test("extracts app info from HTML element", async () => {
      const cheerio = await import("cheerio");
      const html = `
        <div class="first">
          <a class="first-info" href="/telegram/org.telegram.messenger">
            <img src="https://icon.png" />
          </a>
          <p class="p1">Telegram</p>
          <p class="p2">Telegram LLC</p>
          <a class="is-download"
             data-dt-app="org.telegram.messenger"
             data-dt-version="10.5.2"
             data-dt-versioncode="10520"
             data-dt-filesize="60.5 MB"
             href="/download">
          </a>
        </div>
      `;
      const $ = cheerio.load(html);
      const result = (client as any).extractSearchResult($, $("div.first"));
      expect(result.packageName).toBe("org.telegram.messenger");
      expect(result.name).toBe("Telegram");
      expect(result.developer).toBe("Telegram LLC");
      expect(result.version).toBe("10.5.2");
      expect(result.versionCode).toBe(10520);
      expect(result.iconUrl).toBe("https://icon.png");
    });

    test("returns null when name is empty", async () => {
      const cheerio = await import("cheerio");
      const html = `<div class="first"><p class="p1"></p></div>`;
      const $ = cheerio.load(html);
      const result = (client as any).extractSearchResult($, $("div.first"));
      expect(result).toBeNull();
    });

    test("extracts data-dt-filetype from download link", async () => {
      const cheerio = await import("cheerio");
      const html = `
        <div class="first">
          <a class="first-info" href="/app/com.test">
            <img src="https://icon.png" />
          </a>
          <p class="p1">TestApp</p>
          <p class="p2">TestDev</p>
          <a class="is-download"
             data-dt-version="1.0"
             data-dt-versioncode="100"
             data-dt-filesize="10 MB"
             href="/dl">
          </a>
        </div>
      `;
      const $ = cheerio.load(html);
      const result = (client as any).extractSearchResult($, $("div.first"));
      expect(result.name).toBe("TestApp");
      expect(result.size).toBeDefined();
    });

    test("falls back to a.dd when a.first-info not present", async () => {
      const cheerio = await import("cheerio");
      const html = `
        <li>
          <a class="dd" href="/category/com.test">
            <img src="https://icon.png" />
          </a>
          <p class="p1">DDApp</p>
          <p class="p2">DDDev</p>
          <a class="da" data-dt-version="3.0" data-dt-versioncode="30" href="/dl"></a>
        </li>
      `;
      const $ = cheerio.load(html);
      const result = (client as any).extractSearchResult($, $("li"));
      expect(result.name).toBe("DDApp");
      expect(result.packageName).toBe("com.test");
      expect(result.version).toBe("3.0");
      expect(result.versionCode).toBe(30);
    });

    test("handles missing version and versionCode", async () => {
      const cheerio = await import("cheerio");
      const html = `
        <div class="first">
          <a class="first-info" href="/app/com.test"><img src="https://icon.png" /></a>
          <p class="p1">NoVerApp</p>
          <a class="is-download" href="/dl"></a>
        </div>
      `;
      const $ = cheerio.load(html);
      const result = (client as any).extractSearchResult($, $("div.first"));
      expect(result.name).toBe("NoVerApp");
      expect(result.version).toBe("");
      expect(result.versionCode).toBeUndefined();
    });
  });

  // ---- getInfo ----

  describe("getInfo", () => {
    test("returns AppDetail for valid HTML", async () => {
      (fetchHtml as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(INFO_HTML)   // getInfo page
        .mockResolvedValueOnce(VERSIONS_HTML); // getVersions page

      const result = await client.getInfo("org.telegram.messenger");

      expect(result).not.toBeNull();
      expect(result!.packageName).toBe("org.telegram.messenger");
      expect(result!.name).toBe("Telegram");
      expect(result!.rating).toBe("4.8");
      expect(result!.updateDate).toBe("2024-01-15");
      expect(result!.description).toBe("A fast messaging app");
      expect(result!.downloadUrl).toBe("/download/telegram");
      expect(result!.fileType).toBe("xapk");
      expect(result!.iconUrl).toBe("https://icon.png");
      expect(result!.olderVersions).toHaveLength(2);
    });

    test("returns null when no banner element", async () => {
      const noBannerHtml = `<html><body><p>No app here</p></body></html>`;
      (fetchHtml as ReturnType<typeof vi.fn>).mockResolvedValue(noBannerHtml);

      const result = await client.getInfo("nonexistent.app");
      expect(result).toBeNull();
    });

    test("defaults fileType to apk when data-dt-filetype is not recognized", async () => {
      const customHtml = INFO_HTML.replace(
        'data-dt-filetype="xapk"',
        'data-dt-filetype="unknown"'
      );
      (fetchHtml as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(customHtml)
        .mockResolvedValueOnce(VERSIONS_HTML);

      const result = await client.getInfo("org.telegram.messenger");
      expect(result).not.toBeNull();
      expect(result!.fileType).toBe("apk");
    });

    test("handles missing version_code attribute", async () => {
      const noVersionCode = INFO_HTML.replace('data-dt-version_code="10520"', "");
      (fetchHtml as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(noVersionCode)
        .mockResolvedValueOnce(VERSIONS_HTML);

      const result = await client.getInfo("org.telegram.messenger");
      expect(result).not.toBeNull();
      expect(result!.versionCode).toBeUndefined();
    });
  });

  // ---- getVersions ----

  describe("getVersions", () => {
    test("returns AppVersion array from valid HTML", async () => {
      (fetchHtml as ReturnType<typeof vi.fn>).mockResolvedValue(VERSIONS_HTML);

      const versions = await client.getVersions("org.telegram.messenger");

      expect(versions).toHaveLength(2);
      expect(versions[0].version).toBe("10.5.2");
      expect(versions[0].versionCode).toBe(10520);
      expect(versions[0].downloadUrl).toBe("/download/v1");
      expect(versions[0].type).toBe("apk");
      expect(versions[1].version).toBe("10.5.1");
    });

    test("skips last li element", async () => {
      (fetchHtml as ReturnType<typeof vi.fn>).mockResolvedValue(VERSIONS_HTML);
      const versions = await client.getVersions("org.telegram.messenger");
      // The 3rd li is the last one and should be skipped
      expect(versions).toHaveLength(2);
    });

    test("returns empty array when no versions found", async () => {
      const emptyHtml = `<html><body><ul class="ver-wrap"></ul></body></html>`;
      (fetchHtml as ReturnType<typeof vi.fn>).mockResolvedValue(emptyHtml);

      const versions = await client.getVersions("nonexistent.app");
      expect(versions).toHaveLength(0);
    });

    test("skips items with empty version or href", async () => {
      const sparseHtml = `
        <html><body>
        <ul class="ver-wrap">
          <li>
            <a class="ver_download_link" data-dt-version="" data-dt-versioncode="0" href="/dl"></a>
          </li>
          <li>
            <a class="ver_download_link" data-dt-version="1.0" data-dt-versioncode="10" href=""></a>
          </li>
          <li><!-- last --></li>
        </ul>
        </body></html>
      `;
      (fetchHtml as ReturnType<typeof vi.fn>).mockResolvedValue(sparseHtml);

      const versions = await client.getVersions("test.app");
      expect(versions).toHaveLength(0);
    });
  });

  // ---- getDownloadUrl ----

  describe("getDownloadUrl", () => {
    test("constructs correct URL with versionCode", async () => {
      const url = await client.getDownloadUrl("org.telegram.messenger", 10520);
      expect(url).toBe("https://d.apkpure.com/b/APK/org.telegram.messenger?versionCode=10520");
    });

    test("fetches versions when no versionCode provided", async () => {
      (fetchHtml as ReturnType<typeof vi.fn>).mockResolvedValue(VERSIONS_HTML);

      const url = await client.getDownloadUrl("org.telegram.messenger");
      expect(url).toBe("https://d.apkpure.com/b/APK/org.telegram.messenger?versionCode=10520");
    });

    test("returns null when no versions found and no versionCode", async () => {
      const emptyHtml = `<html><body><ul class="ver-wrap"></ul></body></html>`;
      (fetchHtml as ReturnType<typeof vi.fn>).mockResolvedValue(emptyHtml);

      const url = await client.getDownloadUrl("nonexistent.app");
      expect(url).toBeNull();
    });
  });

  // ---- trending ----

  describe("trending", () => {
    test("returns TrendingApp array from valid HTML", async () => {
      (fetchHtml as ReturnType<typeof vi.fn>).mockResolvedValue(TRENDING_HTML);

      const apps = await client.trending();

      expect(apps).toHaveLength(2);
      expect(apps[0].title).toBe("WhatsApp");
      expect(apps[0].iconUrl).toBe("https://wa-icon.png");
      expect(apps[0].detailUrl).toBe("https://apkpure.com/whatsapp");
      expect(apps[1].title).toBe("Telegram");
      expect(apps[1].detailUrl).toBe("https://apkpure.com/telegram");
    });

    test("prepends WEB_BASE_URL to relative href", async () => {
      (fetchHtml as ReturnType<typeof vi.fn>).mockResolvedValue(TRENDING_HTML);

      const apps = await client.trending();
      // WhatsApp href is relative "/whatsapp"
      expect(apps[0].detailUrl).toBe("https://apkpure.com/whatsapp");
    });

    test("keeps absolute href as-is", async () => {
      (fetchHtml as ReturnType<typeof vi.fn>).mockResolvedValue(TRENDING_HTML);

      const apps = await client.trending();
      // Telegram href is already absolute
      expect(apps[1].detailUrl).toBe("https://apkpure.com/telegram");
    });

    test("returns empty array when no trending items", async () => {
      const emptyHtml = `<html><body></body></html>`;
      (fetchHtml as ReturnType<typeof vi.fn>).mockResolvedValue(emptyHtml);

      const apps = await client.trending();
      expect(apps).toHaveLength(0);
    });

    test("skips items with empty title or href", async () => {
      const sparseHtml = `
        <html><body>
        <div class="left floatr">
          <ul>
            <li>
              <div class="category-template-img">
                <a title=""></a>
                <img data-original="https://icon.png" />
              </div>
              <div class="category-template-down">
                <a href="/some"></a>
              </div>
            </li>
          </ul>
        </div>
        </body></html>
      `;
      (fetchHtml as ReturnType<typeof vi.fn>).mockResolvedValue(sparseHtml);

      const apps = await client.trending();
      expect(apps).toHaveLength(0);
    });
  });
});

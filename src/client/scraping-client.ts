import * as cheerio from "cheerio";
import { fetchHtml, downloadFile } from "../utils/http.js";
import { WEB_BASE_URL, DOWNLOAD_BASE_URL } from "../config.js";
import type {
  AppInfo,
  AppDetail,
  AppVersion,
  SearchResult,
  TrendingApp,
} from "../types/index.js";

export class ScrapingClient {
  private timeout: number;
  private proxy: string;

  constructor(timeout = 30000, proxy = "") {
    this.timeout = timeout;
    this.proxy = proxy;
  }

  async search(query: string): Promise<SearchResult> {
    const html = await fetchHtml(
      `${WEB_BASE_URL}/search?q=${encodeURIComponent(query)}`,
      { timeout: this.timeout, proxy: this.proxy }
    );
    const $ = cheerio.load(html);
    const apps: AppInfo[] = [];

    const firstResult = $("div.first");
    if (firstResult.length) {
      const app = this.extractSearchResult($, firstResult);
      if (app) apps.push(app);
    }

    $("ul#search-res > li").each((_, el) => {
      const app = this.extractSearchResult($, $(el));
      if (app) apps.push(app);
    });

    return { apps };
  }

  private extractSearchResult(
    $: cheerio.CheerioAPI,
    el: cheerio.Cheerio<cheerio.Element>
  ): AppInfo | null {
    const name = el.find("p.p1").text().trim();
    if (!name) return null;

    const developer = el.find("p.p2").text().trim();
    const packageLink =
      el.find("a.first-info").attr("href") ??
      el.find("a.dd").attr("href") ??
      "";
    const packageName = packageLink.split("/").pop() ?? "";
    const iconUrl = el.find("img").first().attr("src") ?? undefined;
    const version =
      el.find("a.is-download").attr("data-dt-version") ??
      el.find("a.da").attr("data-dt-version") ??
      undefined;
    const versionCodeStr =
      el.find("a.is-download").attr("data-dt-versioncode") ??
      el.find("a.da").attr("data-dt-versioncode");
    const versionCode = versionCodeStr
      ? parseInt(versionCodeStr, 10)
      : undefined;
    const sizeStr =
      el.find("a.is-download").attr("data-dt-filesize") ?? undefined;
    const size = sizeStr ? this.parseSize(sizeStr) : undefined;

    return {
      packageName,
      name,
      version: version ?? "",
      versionCode,
      size,
      iconUrl,
      developer,
    };
  }

  async getInfo(packageName: string): Promise<AppDetail | null> {
    const html = await fetchHtml(
      `${WEB_BASE_URL}/${packageName}`,
      { timeout: this.timeout, proxy: this.proxy }
    );
    const $ = cheerio.load(html);

    const banner = $("div.detail_banner");
    if (!banner.length) return null;

    const title = banner.find("div.title_link").text().trim();
    const rating = banner.find("span.rating").text().trim();
    const date = banner.find("p.date").text().trim();
    const description = $("div.translate-content").text().trim();
    const iconUrl = banner.find("div.icon img").attr("src") ?? undefined;

    const dlBtn = banner.find("a.download_apk_news");
    const versionCodeStr = dlBtn.attr("data-dt-version_code");
    const downloadHref = dlBtn.attr("href") ?? "";

    const sdkInfo = banner.find("p.details_sdk");
    const latestVersion = sdkInfo.contents().eq(1).text().trim() || undefined;
    const developer = sdkInfo.contents().eq(3).text().trim() || undefined;

    const versions = await this.getVersions(packageName);

    return {
      packageName,
      name: title,
      version: latestVersion ?? "",
      versionCode: versionCodeStr ? parseInt(versionCodeStr, 10) : undefined,
      iconUrl,
      description,
      developer,
      rating,
      updateDate: date,
      downloadUrl: downloadHref,
      fileType: "apk",
      olderVersions: versions,
    };
  }

  async getVersions(packageName: string): Promise<AppVersion[]> {
    const html = await fetchHtml(
      `${WEB_BASE_URL}/${packageName}/versions`,
      { timeout: this.timeout, proxy: this.proxy }
    );
    const $$ = cheerio.load(html);

    const versions: AppVersion[] = [];
    const items = $$("ul.ver-wrap > li");
    items.each((i, el) => {
      if (i === items.length - 1) return;
      const link = $$(el).find("a.ver_download_link");
      const version = link.attr("data-dt-version") ?? "";
      const versionCodeStr = link.attr("data-dt-versioncode") ?? "0";
      const href = link.attr("href") ?? "";
      if (version && href) {
        versions.push({
          version,
          versionCode: parseInt(versionCodeStr, 10),
          downloadUrl: href,
          type: "apk",
        });
      }
    });
    return versions;
  }

  async getDownloadUrl(
    packageName: string,
    versionCode?: number
  ): Promise<string | null> {
    if (!versionCode) {
      const versions = await this.getVersions(packageName);
      if (!versions.length) return null;
      versionCode = versions[0].versionCode;
    }
    return `${DOWNLOAD_BASE_URL}/${packageName}?versionCode=${versionCode}`;
  }

  async trending(): Promise<TrendingApp[]> {
    const html = await fetchHtml(`${WEB_BASE_URL}/game-24h`, {
      timeout: this.timeout,
      proxy: this.proxy,
    });
    const $ = cheerio.load(html);
    const apps: TrendingApp[] = [];

    $("div.left.floatr ul > li").each((_, el) => {
      const imgDiv = $(el).find("div.category-template-img");
      const downDiv = $(el).find("div.category-template-down");
      const title = imgDiv.find("a").attr("title") ?? "";
      const iconUrl = imgDiv.find("img").attr("data-original") ?? "";
      const href = downDiv.find("a").attr("href") ?? "";
      if (title && href) {
        apps.push({
          title,
          iconUrl,
          detailUrl: href.startsWith("http") ? href : WEB_BASE_URL + href,
        });
      }
    });

    return apps;
  }

  private parseSize(sizeStr: string): number | undefined {
    const match = sizeStr.match(/([\d.]+)\s*(MB|GB|KB)/i);
    if (!match) return undefined;
    const num = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    if (unit === "KB") return num * 1024;
    if (unit === "MB") return num * 1024 * 1024;
    if (unit === "GB") return num * 1024 * 1024 * 1024;
    return undefined;
  }
}

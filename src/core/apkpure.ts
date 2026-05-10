import { MobileClient } from "../client/mobile-client.js";
import { ScrapingClient } from "../client/scraping-client.js";
import { downloadApk } from "./downloader.js";
import { detectProxy } from "../utils/proxy.js";
import type {
  SdkConfig,
  AppInfo,
  AppDetail,
  AppVersion,
  SearchResult,
  DownloadResult,
  DownloadOptions,
  TrendingApp,
} from "../types/index.js";
import { DEFAULT_CONFIG } from "../config.js";

export class ApkPure {
  private config: Required<SdkConfig>;
  private mobile: MobileClient;
  private scraper: ScrapingClient;
  private _initPromise: Promise<void>;

  constructor(config?: Partial<SdkConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this._initPromise = this._init(config);
    this.mobile = new MobileClient({ ...config, proxy: this.config.proxy });
    this.scraper = new ScrapingClient(this.config.timeout, this.config.proxy);
  }

  private async _init(config?: Partial<SdkConfig>) {
    if (!this.config.proxy) {
      const detected = await detectProxy();
      if (detected) {
        this.config.proxy = detected.url;
        this.mobile = new MobileClient({ ...config, proxy: detected.url });
        this.scraper = new ScrapingClient(this.config.timeout, detected.url);
      }
    }
  }

  private async ensureReady() {
    await this._initPromise;
  }

  async search(query: string, page = 1): Promise<SearchResult> {
    await this.ensureReady();
    if (this.config.mode === "scraping") {
      return this.scraper.search(query);
    }
    try {
      const resp = await this.mobile.search(query, page);
      const apps: AppInfo[] = [];
      const seen = new Set<string>();
      for (const block of resp.data?.data ?? []) {
        for (const item of block.data ?? []) {
          const info = item.app_info;
          if (!info?.package_name || seen.has(info.package_name)) continue;
          seen.add(info.package_name);
          apps.push({
            packageName: info.package_name,
            name: info.title,
            version: info.version_name ?? "",
            iconUrl: info.icon_url,
            description: info.description_short,
            category: info.category,
            developer: info.developer,
            rating: info.rating,
          });
        }
      }
      return { apps, page };
    } catch {
      if (this.config.mode === "auto") {
        return this.scraper.search(query);
      }
      throw new Error(`Search failed for "${query}"`);
    }
  }

  async getInfo(packageName: string): Promise<AppDetail | null> {
    await this.ensureReady();
    if (this.config.mode === "scraping") {
      return this.scraper.getInfo(packageName);
    }
    try {
      const resp = await this.mobile.getDetail(packageName);
      const d = resp.app_detail;
      if (!d) return null;
      return {
        packageName: d.package_name,
        name: d.title,
        version: d.version_name ?? "",
        versionCode: d.version_code,
        iconUrl: d.icon_url,
        description: d.description_short ?? d.description,
        developer: d.developer,
        rating: d.rating,
        category: d.category,
        updateDate: d.update_date,
        requiresAndroid: d.requires_android,
        downloadUrl: d.asset?.url ?? "",
        fileType:
          (d.asset?.type?.toLowerCase() as "apk" | "xapk" | "apks") ?? "apk",
        screenshots: d.screenshots,
      };
    } catch {
      if (this.config.mode === "auto") {
        return this.scraper.getInfo(packageName);
      }
      throw new Error(`Get info failed for "${packageName}"`);
    }
  }

  async getVersions(packageName: string): Promise<AppVersion[]> {
    await this.ensureReady();
    return this.scraper.getVersions(packageName);
  }

  async download(
    packageName: string,
    options: DownloadOptions
  ): Promise<DownloadResult> {
    await this.ensureReady();
    const detail = await this.getInfo(packageName);
    if (!detail?.downloadUrl) {
      throw new Error(`No download URL found for "${packageName}"`);
    }

    const version = options.version ?? detail.version;

    let downloadUrl = detail.downloadUrl;
    let fileType = detail.fileType;

    if (options.version && options.version !== detail.version) {
      const versions = await this.getVersions(packageName);
      const target = versions.find((v) => v.version === options.version);
      if (!target) {
        throw new Error(
          `Version "${options.version}" not found for "${packageName}"`
        );
      }
      const directUrl = await this.scraper.getDownloadUrl(
        packageName,
        target.versionCode
      );
      if (directUrl) downloadUrl = directUrl;
      fileType = target.type;
    }

    return downloadApk(downloadUrl, packageName, version, fileType, options, this.config.proxy);
  }

  async trending(): Promise<TrendingApp[]> {
    await this.ensureReady();
    return this.scraper.trending();
  }
}

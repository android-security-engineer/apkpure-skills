import { makeMobileHeaders, signBody } from "../utils/headers.js";
import { MOBILE_CONFIG, DEFAULT_CONFIG } from "../config.js";
import type { MobileSearchResponse, MobileDetailResponse } from "../types/api.js";
import type { SdkConfig } from "../types/index.js";
import { mobileRequest, resolveEntries } from "./mobile-transport.js";
import { resolveViaDoh } from "../utils/resolve.js";

export class MobileClient {
  private headers: Record<string, string>;
  private timeout: number;
  private proxy: string;

  constructor(config?: Partial<SdkConfig>) {
    this.headers = makeMobileHeaders();
    this.timeout = config?.timeout ?? DEFAULT_CONFIG.timeout;
    this.proxy = config?.proxy ?? DEFAULT_CONFIG.proxy;
  }

  private async request<T>(url: string, query: Record<string, unknown>, body: Record<string, unknown>): Promise<T> {
    const qs = '?' + Object.entries(query).map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
    const bodyStr = JSON.stringify(body);
    const signed = signBody({ ...this.headers }, bodyStr);

    // Resolve the real IP for the API host (bypass polluted local DNS), then
    // send via a browser-fingerprinted transport so Cloudflare lets us through.
    const hosts = (process.env.APKPURE_MOBILE_RESOLVE || "").split(",").filter(Boolean);
    let ips = [...hosts];
    if (!ips.length) {
      const host = new URL(url).hostname;
      ips = await resolveViaDoh(host);
    }
    const resolve = ips.length ? resolveEntries(url.replace(/^https?:\/\//, "").split("/")[0], ips) : [];

    const resp = await mobileRequest(url + qs, {
      headers: { ...signed, Accept: "application/json" },
      timeout: this.timeout,
      proxy: this.proxy,
      resolve,
    });
    if (resp.status < 200 || resp.status >= 300) {
      const detail = resp.body.toString("utf-8").slice(0, 500);
      throw new Error(`Mobile API returned HTTP ${resp.status}${detail ? `: ${detail}` : ""}`);
    }
    const text = resp.body.toString("utf-8");
    return JSON.parse(text) as T;
  }

  async search(query: string, page = 1): Promise<MobileSearchResponse> {
    return this.request<MobileSearchResponse>(
      `${MOBILE_CONFIG.apiBase}/search_query_new`,
      { hl: "en-US", key: query, page: String(page), search_type: "active_search" },
      {}
    );
  }

  async getDetail(packageName: string): Promise<MobileDetailResponse> {
    return this.request<MobileDetailResponse>(
      `${MOBILE_CONFIG.apiBase}/get_app_detail`,
      { package_name: packageName, hl: "en-US" },
      { package_name: packageName, hl: "en-US" }
    );
  }
}

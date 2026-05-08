import { fetchText } from "../utils/http.js";
import { makeMobileHeaders, signBody } from "../utils/headers.js";
import { MOBILE_CONFIG, DEFAULT_CONFIG } from "../config.js";
import type { MobileSearchResponse, MobileDetailResponse } from "../types/api.js";
import type { SdkConfig } from "../types/index.js";

export class MobileClient {
  private headers: Record<string, string>;
  private timeout: number;
  private proxy: string;

  constructor(config?: Partial<SdkConfig>) {
    this.headers = makeMobileHeaders();
    this.timeout = config?.timeout ?? DEFAULT_CONFIG.timeout;
    this.proxy = config?.proxy ?? DEFAULT_CONFIG.proxy;
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = `${MOBILE_CONFIG.apiBase}/${path.replace(/^\//, '')}`;
    const qs = params
      ? '?' + Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')
      : '';
    const text = await fetchText(url + qs, {
      method: "GET",
      headers: { ...this.headers },
      timeout: this.timeout,
      proxy: this.proxy,
    });
    return JSON.parse(text) as T;
  }

  async post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const url = `${MOBILE_CONFIG.apiBase}/${path.replace(/^\//, '')}`;
    const bodyStr = JSON.stringify(body);
    const signedHeaders = signBody({ ...this.headers }, bodyStr);
    const text = await fetchText(url, {
      method: "POST",
      headers: signedHeaders,
      body: bodyStr,
      timeout: this.timeout,
      proxy: this.proxy,
    });
    return JSON.parse(text) as T;
  }

  async search(query: string, page = 1): Promise<MobileSearchResponse> {
    return this.get<MobileSearchResponse>("/search_query_new", {
      hl: "en-US",
      key: query,
      page: String(page),
      search_type: "active_search",
    });
  }

  async getDetail(packageName: string): Promise<MobileDetailResponse> {
    return this.post<MobileDetailResponse>("/get_app_detail", {
      package_name: packageName,
      hl: "en-US",
    });
  }
}

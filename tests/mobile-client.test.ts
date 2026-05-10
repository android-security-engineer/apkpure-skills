import { describe, test, expect, vi, beforeEach } from "vitest";
import { MobileClient } from "../src/client/mobile-client.js";
import type { MobileSearchResponse, MobileDetailResponse } from "../src/types/api.js";

vi.mock("../src/utils/http.js", () => ({
  fetchText: vi.fn(),
}));

import { fetchText } from "../src/utils/http.js";

const mockedFetchText = vi.mocked(fetchText);

describe("MobileClient", () => {
  let client: MobileClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new MobileClient();
  });

  describe("search()", () => {
    test("builds correct URL and parses search response", async () => {
      const mockResponse: MobileSearchResponse = {
        data: {
          data: [
            {
              data: [
                {
                  app_info: {
                    package_name: "org.telegram.messenger",
                    title: "Telegram",
                    icon_url: "https://icon.png",
                    version_name: "10.5.2",
                    description_short: "Fast messaging app",
                    category: "Communication",
                    developer: "Telegram LLC",
                    rating: "4.8",
                  },
                },
              ],
            },
          ],
        },
      };
      mockedFetchText.mockResolvedValueOnce(JSON.stringify(mockResponse));

      const result = await client.search("telegram");

      expect(mockedFetchText).toHaveBeenCalledTimes(1);
      const [url, options] = mockedFetchText.mock.calls[0] as [string, any];
      expect(url).toContain("tapi.pureapk.com/v3/search_query_new");
      expect(url).toContain("key=telegram");
      expect(url).toContain("page=1");
      expect(url).toContain("hl=en-US");
      expect(url).toContain("search_type=active_search");
      expect(options.method).toBe("GET");
      expect(options.headers).toBeDefined();

      expect(result.data.data).toHaveLength(1);
      expect(result.data.data[0].data[0].app_info.package_name).toBe(
        "org.telegram.messenger"
      );
      expect(result.data.data[0].data[0].app_info.title).toBe("Telegram");
    });

    test("uses custom page number", async () => {
      mockedFetchText.mockResolvedValueOnce(
        JSON.stringify({ data: { data: [] } })
      );

      await client.search("whatsapp", 3);

      const [url] = mockedFetchText.mock.calls[0] as [string, any];
      expect(url).toContain("page=3");
    });

    test("handles empty search results", async () => {
      mockedFetchText.mockResolvedValueOnce(
        JSON.stringify({ data: { data: [] } })
      );

      const result = await client.search("nonexistent");

      expect(result.data.data).toHaveLength(0);
    });

    test("handles multiple data blocks in search response", async () => {
      const mockResponse: MobileSearchResponse = {
        data: {
          data: [
            {
              data: [
                {
                  app_info: {
                    package_name: "org.telegram.messenger",
                    title: "Telegram",
                  },
                },
              ],
            },
            {
              data: [
                {
                  app_info: {
                    package_name: "com.whatsapp",
                    title: "WhatsApp",
                  },
                },
              ],
            },
          ],
        },
      };
      mockedFetchText.mockResolvedValueOnce(JSON.stringify(mockResponse));

      const result = await client.search("messenger");

      expect(result.data.data).toHaveLength(2);
    });
  });

  describe("getDetail()", () => {
    test("signs body and sends POST for app detail", async () => {
      const mockResponse: MobileDetailResponse = {
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
          asset: {
            url: "https://download.example.com/telegram.apk",
            type: "apk",
          },
          screenshots: ["https://screenshot1.png"],
          update_date: "2024-01-01",
          requires_android: "6.0+",
        },
      };
      mockedFetchText.mockResolvedValueOnce(JSON.stringify(mockResponse));

      const result = await client.getDetail("org.telegram.messenger");

      expect(mockedFetchText).toHaveBeenCalledTimes(1);
      const [url, options] = mockedFetchText.mock.calls[0] as [string, any];
      expect(url).toContain("tapi.pureapk.com/v3/get_app_detail");
      expect(options.method).toBe("POST");
      expect(options.body).toContain("org.telegram.messenger");
      expect(options.body).toContain('"hl":"en-US"');
      expect(options.headers["Ual-Access-Signature"]).toBeTruthy();
      expect(options.headers["Ual-Access-Nonce"]).toBeTruthy();
      expect(options.headers["Ual-Access-Timestamp"]).toBeTruthy();
      expect(options.headers["Content-Type"]).toBe(
        "application/json; charset=utf-8"
      );

      expect(result.app_detail.package_name).toBe("org.telegram.messenger");
      expect(result.app_detail.title).toBe("Telegram");
      expect(result.app_detail.asset?.url).toBe(
        "https://download.example.com/telegram.apk"
      );
      expect(result.app_detail.asset?.type).toBe("apk");
    });

    test("handles detail response with minimal fields", async () => {
      const mockResponse: MobileDetailResponse = {
        app_detail: {
          title: "TestApp",
          package_name: "com.test.app",
          version_name: "1.0",
        },
      };
      mockedFetchText.mockResolvedValueOnce(JSON.stringify(mockResponse));

      const result = await client.getDetail("com.test.app");

      expect(result.app_detail.package_name).toBe("com.test.app");
      expect(result.app_detail.version_name).toBe("1.0");
      expect(result.app_detail.asset).toBeUndefined();
    });
  });

  describe("get() helper", () => {
    test("constructs URL with query parameters", async () => {
      mockedFetchText.mockResolvedValueOnce(
        JSON.stringify({ data: { data: [] } })
      );

      await client.search("test query");

      const [url] = mockedFetchText.mock.calls[0] as [string, any];
      expect(url).toContain("key=test%20query");
    });

    test("uses configured timeout", async () => {
      const customClient = new MobileClient({ timeout: 5000 });
      mockedFetchText.mockResolvedValueOnce(
        JSON.stringify({ data: { data: [] } })
      );

      await customClient.search("test");

      const [, options] = mockedFetchText.mock.calls[0] as [string, any];
      expect(options.timeout).toBe(5000);
    });

    test("uses configured proxy", async () => {
      const customClient = new MobileClient({ proxy: "http://127.0.0.1:7890" });
      mockedFetchText.mockResolvedValueOnce(
        JSON.stringify({ data: { data: [] } })
      );

      await customClient.search("test");

      const [, options] = mockedFetchText.mock.calls[0] as [string, any];
      expect(options.proxy).toBe("http://127.0.0.1:7890");
    });
  });

  describe("post() helper", () => {
    test("constructs URL without leading slash duplication", async () => {
      mockedFetchText.mockResolvedValueOnce(
        JSON.stringify({ app_detail: { title: "T", package_name: "c.t", version_name: "1" } })
      );

      await client.getDetail("com.test");

      const [url] = mockedFetchText.mock.calls[0] as [string, any];
      // Should not have double slashes in the path
      expect(url).not.toMatch(/\/\/get_app_detail/);
      expect(url).toContain("/v3/get_app_detail");
    });
  });
});

import { describe, test, expect, vi, beforeEach } from "vitest";
import { MobileClient } from "../src/client/mobile-client.js";
import { mobileRequest, resolveEntries } from "../src/client/mobile-transport.js";
import { resolveViaDoh } from "../src/utils/resolve.js";
import type { MobileSearchResponse, MobileDetailResponse } from "../src/types/api.js";

vi.mock("../src/client/mobile-transport.js", () => ({
  mobileRequest: vi.fn(),
  resolveEntries: vi.fn((host, ips) => ips.map((ip) => `${host}:443:${ip}`)),
}));
vi.mock("../src/utils/resolve.js", () => ({
  resolveViaDoh: vi.fn().mockResolvedValue([]),
}));

const mockedMobileRequest = vi.mocked(mobileRequest);
const mockedResolveViaDoh = vi.mocked(resolveViaDoh);

function mockBody(obj: unknown): void {
  mockedMobileRequest.mockResolvedValueOnce({
    status: 200,
    headers: {},
    body: Buffer.from(JSON.stringify(obj)),
  });
}

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
      mockBody(mockResponse);

      const result = await client.search("telegram");

      expect(mockedMobileRequest).toHaveBeenCalledTimes(1);
      const [url, options] = mockedMobileRequest.mock.calls[0] as [string, any];
      expect(url).toContain("tapi.pureapk.com/v3/search_query_new");
      expect(url).toContain("key=telegram");
      expect(url).toContain("page=1");
      expect(url).toContain("hl=en-US");
      expect(url).toContain("search_type=active_search");
      expect(options.headers).toBeDefined();
      expect(options.headers["Ual-Access-Signature"]).toBeTruthy();

      expect(result.data.data).toHaveLength(1);
      expect(result.data.data[0].data[0].app_info.package_name).toBe(
        "org.telegram.messenger"
      );
      expect(result.data.data[0].data[0].app_info.title).toBe("Telegram");
    });

    test("uses custom page number", async () => {
      mockBody({ data: { data: [] } });
      await client.search("whatsapp", 3);
      const [url] = mockedMobileRequest.mock.calls[0] as [string, any];
      expect(url).toContain("page=3");
    });

    test("handles empty search results", async () => {
      mockBody({ data: { data: [] } });
      const result = await client.search("nonexistent");
      expect(result.data.data).toHaveLength(0);
    });

    test("handles multiple data blocks in search response", async () => {
      const mockResponse: MobileSearchResponse = {
        data: {
          data: [
            { data: [{ app_info: { package_name: "org.telegram.messenger", title: "Telegram" } }] },
            { data: [{ app_info: { package_name: "com.whatsapp", title: "WhatsApp" } }] },
          ],
        },
      };
      mockBody(mockResponse);
      const result = await client.search("messenger");
      expect(result.data.data).toHaveLength(2);
    });
  });

  describe("getDetail()", () => {
    test("signs request and sends GET for app detail", async () => {
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
          asset: { url: "https://download.example.com/telegram.apk", type: "apk" },
          screenshots: ["https://screenshot1.png"],
          update_date: "2024-01-01",
          requires_android: "6.0+",
        },
      };
      mockBody(mockResponse);

      const result = await client.getDetail("org.telegram.messenger");

      expect(mockedMobileRequest).toHaveBeenCalledTimes(1);
      const [url, options] = mockedMobileRequest.mock.calls[0] as [string, any];
      expect(url).toContain("tapi.pureapk.com/v3/get_app_detail");
      expect(url).toContain("package_name=org.telegram.messenger");
      expect(options.headers["Ual-Access-Signature"]).toBeTruthy();
      expect(options.headers["Ual-Access-Nonce"]).toBeTruthy();
      expect(options.headers["Ual-Access-Timestamp"]).toBeTruthy();

      expect(result.app_detail.package_name).toBe("org.telegram.messenger");
      expect(result.app_detail.title).toBe("Telegram");
      expect(result.app_detail.asset?.url).toBe(
        "https://download.example.com/telegram.apk"
      );
    });

    test("handles detail response with minimal fields", async () => {
      mockBody({ app_detail: { title: "TestApp", package_name: "com.test.app", version_name: "1.0" } });
      const result = await client.getDetail("com.test.app");
      expect(result.app_detail.package_name).toBe("com.test.app");
      expect(result.app_detail.version_name).toBe("1.0");
      expect(result.app_detail.asset).toBeUndefined();
    });
  });

  describe("URL construction", () => {
    test("encodes query parameters", async () => {
      mockBody({ data: { data: [] } });
      await client.search("test query");
      const [url] = mockedMobileRequest.mock.calls[0] as [string, any];
      expect(url).toContain("key=test%20query");
    });

    test("uses configured timeout", async () => {
      const customClient = new MobileClient({ timeout: 5000 });
      mockBody({ data: { data: [] } });
      await customClient.search("test");
      const [, options] = mockedMobileRequest.mock.calls[0] as [string, any];
      expect(options.timeout).toBe(5000);
    });

    test("uses configured proxy", async () => {
      const customClient = new MobileClient({ proxy: "http://127.0.0.1:7890" });
      mockBody({ data: { data: [] } });
      await customClient.search("test");
      const [, options] = mockedMobileRequest.mock.calls[0] as [string, any];
      expect(options.proxy).toBe("http://127.0.0.1:7890");
    });

    test("constructs URL without leading slash duplication", async () => {
      mockBody({ app_detail: { title: "T", package_name: "c.t", version_name: "1" } });
      await client.getDetail("com.test");
      const [url] = mockedMobileRequest.mock.calls[0] as [string, any];
      expect(url).not.toMatch(/\/\/get_app_detail/);
      expect(url).toContain("/v3/get_app_detail");
    });
  });

  describe("resolve()", () => {
    test("uses env APKPURE_MOBILE_RESOLVE when set", async () => {
      const prev = process.env.APKPURE_MOBILE_RESOLVE;
      process.env.APKPURE_MOBILE_RESOLVE = "104.20.24.85,172.66.150.6";
      mockBody({ app_detail: { title: "T", package_name: "c.t", version_name: "1" } });
      try {
        await client.getDetail("com.test");
      } finally {
        if (prev === undefined) delete process.env.APKPURE_MOBILE_RESOLVE;
        else process.env.APKPURE_MOBILE_RESOLVE = prev;
      }
      const [, options] = mockedMobileRequest.mock.calls[0] as [string, any];
      expect(options.resolve).toContain("tapi.pureapk.com:443:104.20.24.85");
      expect(options.resolve).toContain("tapi.pureapk.com:443:172.66.150.6");
      expect(mockedResolveViaDoh).not.toHaveBeenCalled();
    });

    test("falls back to DoH when env not set", async () => {
      mockedResolveViaDoh.mockResolvedValueOnce(["104.20.24.85"]);
      mockBody({ app_detail: { title: "T", package_name: "c.t", version_name: "1" } });
      await client.getDetail("com.test");
      const [, options] = mockedMobileRequest.mock.calls[0] as [string, any];
      expect(mockedResolveViaDoh).toHaveBeenCalledWith("tapi.pureapk.com");
      expect(options.resolve).toContain("tapi.pureapk.com:443:104.20.24.85");
    });
  });

  describe("status handling", () => {
    test("throws on non-2xx response", async () => {
      mockedMobileRequest.mockResolvedValueOnce({
        status: 403,
        headers: {},
        body: Buffer.from("Forbidden"),
      });
      await expect(client.getDetail("com.test")).rejects.toThrow(/403/);
    });
  });

  describe("resolveEntries", () => {
    test("maps host+ips to resolve entries", () => {
      const entries = resolveEntries("tapi.pureapk.com", ["1.2.3.4", "5.6.7.8"]);
      expect(entries).toEqual(["tapi.pureapk.com:443:1.2.3.4", "tapi.pureapk.com:443:5.6.7.8"]);
    });
  });
});

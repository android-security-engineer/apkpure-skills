import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

// Must hoist mock before imports that use them
vi.mock("undici", () => ({
  fetch: vi.fn(),
  ProxyAgent: vi.fn(),
  FormData: vi.fn(),
  File: vi.fn(),
}));

vi.mock("node:fs", () => ({
  createWriteStream: vi.fn(),
  mkdirSync: vi.fn(),
}));

vi.mock("node:crypto", () => ({
  createHash: vi.fn(),
}));

import { fetchText, fetchHtml, downloadFile, setProxy } from "../src/utils/http.js";
import { fetch as mockFetch, ProxyAgent as MockProxyAgent } from "undici";
import { createWriteStream, mkdirSync } from "node:fs";

describe("http utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset global proxy state
    setProxy("");
  });

  // ---- fetchText ----

  describe("fetchText", () => {
    test("makes GET request by default", async () => {
      (mockFetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        text: () => Promise.resolve("hello"),
      });

      const result = await fetchText("https://example.com");
      expect(result).toBe("hello");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://example.com",
        expect.objectContaining({ method: "GET" })
      );
    });

    test("makes POST request when method specified", async () => {
      (mockFetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        text: () => Promise.resolve("posted"),
      });

      const result = await fetchText("https://example.com", { method: "POST", body: "data" });
      expect(result).toBe("posted");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://example.com",
        expect.objectContaining({ method: "POST", body: "data" })
      );
    });

    test("sends default User-Agent header", async () => {
      (mockFetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        text: () => Promise.resolve("ok"),
      });

      await fetchText("https://example.com");
      const callArgs = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(callArgs.headers["User-Agent"]).toContain("Chrome");
    });

    test("merges custom headers with defaults", async () => {
      (mockFetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        text: () => Promise.resolve("ok"),
      });

      await fetchText("https://example.com", {
        headers: { "X-Custom": "value" },
      });
      const callArgs = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(callArgs.headers["User-Agent"]).toContain("Chrome");
      expect(callArgs.headers["X-Custom"]).toBe("value");
    });

    test("sets timeout via AbortController (uses default 30s if not specified)", async () => {
      (mockFetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        text: () => Promise.resolve("ok"),
      });

      await fetchText("https://example.com", { timeout: 5000 });
      const callArgs = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0][1];
      // signal should be an AbortSignal
      expect(callArgs.signal).toBeInstanceOf(AbortSignal);
    });

    test("aborts on timeout", async () => {
      // Simulate fetch that never resolves, then gets aborted
      let abortSignal: AbortSignal | undefined;
      (mockFetch as ReturnType<typeof vi.fn>).mockImplementation(
        (_url: string, opts: { signal?: AbortSignal }) => {
          abortSignal = opts.signal;
          return new Promise((_resolve, reject) => {
            if (abortSignal) {
              abortSignal.addEventListener("abort", () => {
                reject(new DOMException("The operation was aborted", "AbortError"));
              });
            }
          });
        }
      );

      // Use very short timeout
      await expect(fetchText("https://example.com", { timeout: 50 })).rejects.toThrow();
    });

    test("uses proxy dispatcher when proxy option provided", async () => {
      (mockFetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        text: () => Promise.resolve("proxied"),
      });
      (MockProxyAgent as ReturnType<typeof vi.fn>).mockReturnValue({ type: "proxy-agent" });

      const result = await fetchText("https://example.com", { proxy: "http://proxy:8080" });
      expect(result).toBe("proxied");
      expect(MockProxyAgent).toHaveBeenCalledWith("http://proxy:8080");
      const callArgs = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(callArgs.dispatcher).toEqual({ type: "proxy-agent" });
    });

    test("uses global proxy when no per-request proxy", async () => {
      (mockFetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        text: () => Promise.resolve("global-proxied"),
      });
      (MockProxyAgent as ReturnType<typeof vi.fn>).mockReturnValue({ type: "global-proxy" });

      setProxy("http://global:9999");
      await fetchText("https://example.com");
      expect(MockProxyAgent).toHaveBeenCalledWith("http://global:9999");
    });

    test("clears timeout even on success", async () => {
      (mockFetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        text: () => Promise.resolve("ok"),
      });
      const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");

      await fetchText("https://example.com", { timeout: 5000 });
      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });

  // ---- fetchHtml ----

  describe("fetchHtml", () => {
    test("sets correct Accept and Accept-Language headers", async () => {
      (mockFetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        text: () => Promise.resolve("<html></html>"),
      });

      await fetchHtml("https://example.com/page");
      // fetchHtml calls fetchText internally, so we check the fetch call
      const callArgs = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(callArgs.headers["Accept"]).toBe(
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      );
      expect(callArgs.headers["Accept-Language"]).toBe("en-US,en;q=0.9");
    });

    test("passes timeout and proxy options to fetchText", async () => {
      (mockFetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        text: () => Promise.resolve("<html></html>"),
      });
      (MockProxyAgent as ReturnType<typeof vi.fn>).mockReturnValue({ type: "proxy" });

      await fetchHtml("https://example.com", { timeout: 10000, proxy: "http://p:1" });
      const callArgs = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(callArgs.signal).toBeInstanceOf(AbortSignal);
      expect(callArgs.dispatcher).toEqual({ type: "proxy" });
    });

    test("allows custom headers to override defaults", async () => {
      (mockFetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        text: () => Promise.resolve("<html></html>"),
      });

      await fetchHtml("https://example.com", {
        headers: { "Accept-Language": "ja-JP" },
      });
      const callArgs = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(callArgs.headers["Accept-Language"]).toBe("ja-JP");
    });
  });

  // ---- downloadFile ----

  describe("downloadFile", () => {
    test("creates parent directories", async () => {
      const mockStream = {
        write: vi.fn(),
        end: vi.fn(),
      };
      (createWriteStream as ReturnType<typeof vi.fn>).mockReturnValue(mockStream);
      (mockFetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        headers: new Map([["content-length", "0"]]),
        body: null,
      });

      await downloadFile("https://example.com/file.apk", "/tmp/deep/nested/file.apk");
      expect(mkdirSync).toHaveBeenCalledWith("/tmp/deep/nested", { recursive: true });
    });

    test("downloads file with progress callback", async () => {
      const chunks = [Buffer.from("hello"), Buffer.from("world")];
      const mockStream = {
        write: vi.fn(),
        end: vi.fn(),
      };
      (createWriteStream as ReturnType<typeof vi.fn>).mockReturnValue(mockStream);

      // Create an async iterable body
      const asyncBody = (async function* () {
        yield chunks[0];
        yield chunks[1];
      })();

      (mockFetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        headers: new Map([["content-length", "10"]]),
        body: asyncBody,
      });

      const onProgress = vi.fn();
      const downloaded = await downloadFile(
        "https://example.com/file.apk",
        "/tmp/test.apk",
        { onProgress }
      );

      expect(downloaded).toBe(10); // 5 + 5 bytes
      expect(mockStream.write).toHaveBeenCalledTimes(2);
      expect(mockStream.end).toHaveBeenCalled();
      expect(onProgress).toHaveBeenCalled();
    });

    test("throws on HTTP error response", async () => {
      (mockFetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 404,
      });

      await expect(
        downloadFile("https://example.com/missing.apk", "/tmp/test.apk")
      ).rejects.toThrow("Download failed: HTTP 404");
    });

    test("returns 0 downloaded when body is null", async () => {
      const mockStream = {
        write: vi.fn(),
        end: vi.fn(),
      };
      (createWriteStream as ReturnType<typeof vi.fn>).mockReturnValue(mockStream);
      (mockFetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        headers: new Map([["content-length", "0"]]),
        body: null,
      });

      const downloaded = await downloadFile(
        "https://example.com/empty.apk",
        "/tmp/empty.apk"
      );
      expect(downloaded).toBe(0);
      expect(mockStream.write).not.toHaveBeenCalled();
      expect(mockStream.end).toHaveBeenCalled();
    });

    test("uses proxy dispatcher when proxy option provided", async () => {
      const mockStream = {
        write: vi.fn(),
        end: vi.fn(),
      };
      (createWriteStream as ReturnType<typeof vi.fn>).mockReturnValue(mockStream);
      (mockFetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        headers: new Map([["content-length", "0"]]),
        body: null,
      });
      (MockProxyAgent as ReturnType<typeof vi.fn>).mockReturnValue({ type: "proxy" });

      await downloadFile("https://example.com/file.apk", "/tmp/test.apk", {
        proxy: "http://proxy:8080",
      });
      const callArgs = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(callArgs.dispatcher).toEqual({ type: "proxy" });
    });

    test("sends default User-Agent and custom headers", async () => {
      const mockStream = {
        write: vi.fn(),
        end: vi.fn(),
      };
      (createWriteStream as ReturnType<typeof vi.fn>).mockReturnValue(mockStream);
      (mockFetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        headers: new Map([["content-length", "0"]]),
        body: null,
      });

      await downloadFile("https://example.com/file.apk", "/tmp/test.apk", {
        headers: { "X-Token": "abc" },
      });
      const callArgs = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(callArgs.headers["User-Agent"]).toContain("Chrome");
      expect(callArgs.headers["X-Token"]).toBe("abc");
    });

    test("follows redirects", async () => {
      const mockStream = {
        write: vi.fn(),
        end: vi.fn(),
      };
      (createWriteStream as ReturnType<typeof vi.fn>).mockReturnValue(mockStream);
      (mockFetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        headers: new Map([["content-length", "0"]]),
        body: null,
      });

      await downloadFile("https://example.com/file.apk", "/tmp/test.apk");
      const callArgs = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(callArgs.redirect).toBe("follow");
    });
  });

  // ---- setProxy / getDispatcher ----

  describe("setProxy and getDispatcher", () => {
    test("setProxy sets global proxy used by fetchText", async () => {
      (mockFetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        text: () => Promise.resolve("ok"),
      });
      (MockProxyAgent as ReturnType<typeof vi.fn>).mockReturnValue({ type: "global-proxy" });

      setProxy("http://my-proxy:1234");
      await fetchText("https://example.com");

      expect(MockProxyAgent).toHaveBeenCalledWith("http://my-proxy:1234");
    });

    test("per-request proxy overrides global proxy", async () => {
      (mockFetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        text: () => Promise.resolve("ok"),
      });
      (MockProxyAgent as ReturnType<typeof vi.fn>).mockImplementation(
        (url: string) => ({ type: "proxy", url })
      );

      setProxy("http://global:9999");
      await fetchText("https://example.com", { proxy: "http://override:8080" });

      expect(MockProxyAgent).toHaveBeenCalledWith("http://override:8080");
    });

    test("no dispatcher when no proxy set", async () => {
      (mockFetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        text: () => Promise.resolve("ok"),
      });

      setProxy("");
      await fetchText("https://example.com");
      const callArgs = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(callArgs.dispatcher).toBeUndefined();
    });
  });
});

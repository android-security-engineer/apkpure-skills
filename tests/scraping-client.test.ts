import { describe, test, expect } from "vitest";
import * as cheerio from "cheerio";
import { ScrapingClient } from "../src/client/scraping-client.js";

describe("ScrapingClient parseSize", () => {
  const client = new ScrapingClient();

  test("parses MB size", () => {
    const result = (client as any).parseSize("45.2 MB");
    expect(result).toBeCloseTo(45.2 * 1024 * 1024, 0);
  });

  test("parses KB size", () => {
    const result = (client as any).parseSize("512 KB");
    expect(result).toBe(512 * 1024);
  });

  test("returns undefined for invalid size", () => {
    expect((client as any).parseSize("invalid")).toBeUndefined();
  });
});

describe("ScrapingClient extractSearchResult", () => {
  const client = new ScrapingClient();

  test("extracts app info from HTML element", () => {
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
});

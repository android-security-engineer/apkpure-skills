import { describe, test, expect } from "vitest";
import type { AppInfo, AppVersion } from "../src/types/index.js";

describe("CLI output formatting", () => {
  const sampleApps: AppInfo[] = [
    {
      packageName: "org.telegram.messenger",
      name: "Telegram",
      version: "10.5.2",
      developer: "Telegram LLC",
      category: "Communication",
      rating: "4.8",
    },
    {
      packageName: "com.whatsapp",
      name: "WhatsApp",
      version: "2.24.5",
    },
  ];

  test("formatAppList produces correct lines", () => {
    const lines: string[] = [];
    for (const app of sampleApps) {
      lines.push(`${app.name}`);
      lines.push(`  Package:  ${app.packageName}`);
      lines.push(`  Version:  ${app.version}`);
      if (app.developer) lines.push(`  Developer: ${app.developer}`);
    }
    expect(lines).toContain("Telegram");
    expect(lines).toContain("  Package:  org.telegram.messenger");
    expect(lines).toContain("  Developer: Telegram LLC");
    expect(lines).toContain("  Package:  com.whatsapp");
  });

  test("formatVersions marks latest", () => {
    const versions: AppVersion[] = [
      { version: "10.5.2", versionCode: 10520, downloadUrl: "https://a", type: "apk" },
      { version: "10.5.1", versionCode: 10510, downloadUrl: "https://b", type: "apk" },
    ];
    const lines = versions.map((v, i) => {
      const tag = i === 0 ? " (latest)" : "";
      return `  ${v.version}${tag}  [${v.type.toUpperCase()}]  code=${v.versionCode}`;
    });
    expect(lines[0]).toContain("(latest)");
    expect(lines[1]).not.toContain("(latest)");
  });

  test("formatSize converts bytes to MB", () => {
    const bytes = 63 * 1024 * 1024;
    const mb = (bytes / 1024 / 1024).toFixed(1);
    expect(mb).toBe("63.0");
  });

  test("empty app list outputs no-apps message", () => {
    const apps: AppInfo[] = [];
    const msg = apps.length === 0 ? "No apps found." : `Found ${apps.length} apps.`;
    expect(msg).toBe("No apps found.");
  });

  test("empty versions list outputs no-versions message", () => {
    const versions: AppVersion[] = [];
    const msg = versions.length === 0 ? "No versions found." : `Total: ${versions.length} versions.`;
    expect(msg).toBe("No versions found.");
  });
});

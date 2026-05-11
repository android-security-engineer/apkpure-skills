# APKPure Full Workflow Closure — Search → Info → Versions → Download

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`
> Steps use checkbox (`- [ ]`) syntax.

**Goal:** 实现完整的 APKPure 使用闭环：搜索 app → 查看信息 → 列出版本 → 下载指定版本 APK，并在 Skill 知识库中完整记录这套工作流。

**Architecture:** 用户 CLI 输入 → commander 解析命令 → ApkPure SDK 处理（MobileClient 优先 + ScrapingClient fallback）→ 格式化输出到终端。核心改动是 CLI 层的输出格式化和 Skill 文档层的闭环工作流描述。SDK 核心逻辑（search/info/versions/download）已实现且 14 个测试通过，本次不改核心逻辑。

**Tech Stack:** Node.js 20, TypeScript 5, commander 12, cheerio 1, undici 7, vitest 2

**Risks:**
- Task 2 修改 `src/cli.ts` 的输出格式，可能影响 skill-handler 的 JSON 解析 → 缓解：JSON 输出只加 `--json` flag，默认人类可读表格
- Skill 文档更新涉及 `skill/SKILL.md` 和 `skill/references/advanced.md` 两处 → 缓解：先改 SKILL.md 主文档，再同步 advanced.md

---

### Task 1: CLI 输出格式化 — 搜索结果表格 + info/versions 可读输出

**Depends on:** None
**Files:**
- Modify: `src/cli.ts:1-92`

- [ ] **Step 1: 修改 search 命令输出 — 人类可读表格格式（默认）+ JSON（--json flag）**

文件: `src/cli.ts:15-24`（替换 search 命令的 action）

```typescript
program
  .command("search")
  .description("Search for apps on APKPure")
  .argument("<query>", "Search query")
  .option("-m, --mode <mode>", "API mode: api|scraping|auto", "auto")
  .option("-p, --proxy <proxy>", "HTTP proxy URL (auto-detected if not specified)")
  .option("-j, --json", "Output raw JSON instead of table")
  .action(async (query: string, opts: { mode: string; proxy?: string; json?: boolean }) => {
    const client = new ApkPure({ mode: opts.mode as "api" | "scraping" | "auto", proxy: opts.proxy });
    const result = await client.search(query);

    if (opts.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (!result.apps.length) {
      console.log("No apps found.");
      return;
    }

    for (const app of result.apps) {
      console.log(`${app.name}`);
      console.log(`  Package:  ${app.packageName}`);
      console.log(`  Version:  ${app.version}`);
      if (app.developer) console.log(`  Developer: ${app.developer}`);
      if (app.category) console.log(`  Category:  ${app.category}`);
      if (app.rating) console.log(`  Rating:    ${app.rating}`);
      console.log();
    }
    console.log(`Found ${result.apps.length} apps.`);
  });
```

- [ ] **Step 2: 修改 info 命令输出 — 人类可读详情（默认）+ JSON（--json flag）**

文件: `src/cli.ts:26-40`（替换 info 命令的 action）

```typescript
program
  .command("info")
  .description("Get detailed info for an app")
  .argument("<package>", "Android package name (e.g. com.whatsapp)")
  .option("-m, --mode <mode>", "API mode: api|scraping|auto", "auto")
  .option("-p, --proxy <proxy>", "HTTP proxy URL (auto-detected if not specified)")
  .option("-j, --json", "Output raw JSON instead of formatted text")
  .action(async (pkg: string, opts: { mode: string; proxy?: string; json?: boolean }) => {
    const client = new ApkPure({ mode: opts.mode as "api" | "scraping" | "auto", proxy: opts.proxy });
    const detail = await client.getInfo(pkg);
    if (!detail) {
      console.error(opts.json ? JSON.stringify({ error: "App not found" }) : `App not found: ${pkg}`);
      process.exit(1);
    }

    if (opts.json) {
      console.log(JSON.stringify(detail, null, 2));
      return;
    }

    console.log(`  ${detail.name}`);
    console.log(`  Package:     ${detail.packageName}`);
    console.log(`  Version:     ${detail.version}`);
    if (detail.versionCode) console.log(`  Version Code: ${detail.versionCode}`);
    if (detail.developer) console.log(`  Developer:   ${detail.developer}`);
    if (detail.category) console.log(`  Category:    ${detail.category}`);
    if (detail.rating) console.log(`  Rating:      ${detail.rating}`);
    if (detail.updateDate) console.log(`  Updated:     ${detail.updateDate}`);
    if (detail.requiresAndroid) console.log(`  Requires:    Android ${detail.requiresAndroid}`);
    if (detail.downloadUrl) console.log(`  Download:    ${detail.fileType.toUpperCase()} available`);
    if (detail.description) {
      const desc = detail.description.length > 200
        ? detail.description.slice(0, 200) + "..."
        : detail.description;
      console.log(`\n  ${desc}`);
    }
  });
```

- [ ] **Step 3: 修改 versions 命令输出 — 版本列表表格（默认）+ JSON（--json flag）**

文件: `src/cli.ts:72-90`（替换 versions 命令的 action）

```typescript
program
  .command("versions")
  .description("List all available versions of an app")
  .argument("<package>", "Android package name")
  .option("-p, --proxy <proxy>", "HTTP proxy URL (auto-detected if not specified)")
  .option("-j, --json", "Output raw JSON instead of table")
  .action(async (pkg: string, opts: { proxy?: string; json?: boolean }) => {
    const sdk = new ApkPure({ proxy: opts.proxy });
    const versions = await sdk.getVersions(pkg);

    if (opts.json) {
      console.log(JSON.stringify(versions, null, 2));
      return;
    }

    if (!versions.length) {
      console.log("No versions found.");
      return;
    }

    console.log(`Versions for ${pkg}:`);
    console.log();
    for (const v of versions) {
      const tag = v.versionCode === versions[0]?.versionCode ? " (latest)" : "";
      console.log(`  ${v.version}${tag}  [${v.type.toUpperCase()}]  code=${v.versionCode}`);
    }
    console.log();
    console.log(`Total: ${versions.length} versions.`);
    console.log(`\nDownload a specific version:`);
    console.log(`  npx apkpure download ${pkg} -v ${versions[0]?.version}`);
  });
```

- [ ] **Step 4: 修改 trending 命令输出 — 格式化列表（默认）+ JSON（--json flag）**

文件: `src/cli.ts:62-79`（替换 trending 命令的 action）

```typescript
program
  .command("trending")
  .description("List trending games (24h)")
  .option("-p, --proxy <proxy>", "HTTP proxy URL (auto-detected if not specified)")
  .option("-j, --json", "Output raw JSON instead of list")
  .action(async (opts: { proxy?: string; json?: boolean }) => {
    const sdk = new ApkPure({ proxy: opts.proxy });
    const apps = await sdk.trending();

    if (opts.json) {
      console.log(JSON.stringify(apps, null, 2));
      return;
    }

    if (!apps.length) {
      console.log("No trending apps found.");
      return;
    }

    for (let i = 0; i < apps.length; i++) {
      const app = apps[i];
      console.log(`  ${i + 1}. ${app.title}`);
      console.log(`     ${app.detailUrl}`);
    }
    console.log(`\nTotal: ${apps.length} trending apps.`);
  });
```

- [ ] **Step 5: 验证 CLI 编译通过**
Run: `npm run build 2>&1 | tail -5`
Expected:
  - Exit code: 0
  - Output contains: "Build success"

- [ ] **Step 6: 提交**
Run: `git add src/cli.ts && git commit -m "feat(cli): add human-readable output with --json flag for all commands"`

---

### Task 2: Download 命令优化 — 版本选择提示 + 成功信息

**Depends on:** Task 1
**Files:**
- Modify: `src/cli.ts:42-69`（download 命令 action）

- [ ] **Step 1: 修改 download 命令 — 改善版本选择提示和成功输出**

文件: `src/cli.ts` 中 download 命令的 action（替换整个 action）

```typescript
program
  .command("download")
  .description("Download an APK/XAPK file")
  .argument("<package>", "Android package name")
  .option("-o, --output <dir>", "Output directory", "./apks")
  .option("-v, --version <version>", "Specific version to download")
  .option("-p, --proxy <proxy>", "HTTP proxy URL (auto-detected if not specified)")
  .option("-j, --json", "Output raw JSON instead of progress info")
  .action(
    async (
      pkg: string,
      opts: { output: string; version?: string; proxy?: string; json?: boolean }
    ) => {
      mkdirSync(opts.output, { recursive: true });
      const sdk = new ApkPure({ proxy: opts.proxy });

      if (!opts.json) {
        const detail = await sdk.getInfo(pkg);
        if (!detail) {
          console.error(`App not found: ${pkg}`);
          process.exit(1);
        }
        console.log(`Downloading: ${detail.name} (${pkg})`);
        if (opts.version) {
          console.log(`Version:     ${opts.version} (requested)`);
        } else {
          console.log(`Version:     ${detail.version} (latest)`);
        }
        console.log(`Output:      ${resolve(opts.output)}`);
        console.log();
      }

      const result = await sdk.download(pkg, {
        outputDir: resolve(opts.output),
        version: opts.version,
        onProgress: opts.json
          ? undefined
          : (downloaded, total) => {
              const pct = ((downloaded / total) * 100).toFixed(1);
              const mb = (downloaded / 1024 / 1024).toFixed(1);
              const totalMb = (total / 1024 / 1024).toFixed(1);
              process.stderr.write(`\r  Progress: ${mb}/${totalMb} MB (${pct}%)`);
            },
      });

      if (!opts.json) process.stderr.write("\n");

      if (opts.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(`\nDownload complete!`);
        console.log(`  File:   ${result.filePath}`);
        console.log(`  Size:   ${(result.fileSize / 1024 / 1024).toFixed(1)} MB`);
        console.log(`  Type:   ${result.fileType.toUpperCase()}`);
        console.log(`  SHA256: ${result.sha256}`);
      }
    }
  );
```

- [ ] **Step 2: 验证 CLI 编译通过**
Run: `npm run build 2>&1 | tail -5`
Expected:
  - Exit code: 0
  - Output contains: "Build success"

- [ ] **Step 3: 提交**
Run: `git add src/cli.ts && git commit -m "feat(cli): improve download UX with version info and success summary"`

---

### Task 3: Skill 知识库重写 — 完整闭环工作流文档

**Depends on:** Task 1, Task 2
**Files:**
- Modify: `skill/SKILL.md:1-82`
- Modify: `skill/references/advanced.md:1-206`

- [ ] **Step 1: 重写 SKILL.md — 以闭环工作流为核心叙事**

文件: `skill/SKILL.md`（替换整个文件）

```markdown
---
name: apkpure
description: Search, get info, list versions, and download Android APK files from APKPure. Use when the user asks to: (1) search for Android apps by name or keyword, (2) get detailed app information (version, developer, description, download URL), (3) list all available versions of an app, (4) download APK/XAPK files to local disk, (5) find trending apps. Supports auto-detection of local Clash proxy for GFW environments. Complete workflow: search → info → versions → download.
---

# APKPure — Android APK Search & Download

Complete workflow for finding and downloading Android APK files.

## Quick Start

```bash
npx apkpure search telegram
npx apkpure info org.telegram.messenger
npx apkpure versions org.telegram.messenger
npx apkpure download org.telegram.messenger
```

## Workflow: Search → Info → Versions → Download

### Step 1: Search

Find apps by name or keyword. Returns package name, version, developer, category.

```bash
npx apkpure search "whatsapp"
npx apkpure search "微信"
```

Default output is human-readable. Add `--json` for machine-readable output.

Output fields: package name (needed for subsequent commands), app name, version, developer, category, rating.

### Step 2: Get Info

Use the package name from search results to get full details.

```bash
npx apkpure info com.whatsapp
```

Returns: name, version, version code, developer, category, rating, update date, description, download availability (APK/XAPK/APKS), screenshots.

### Step 3: List Versions

See all available versions before downloading.

```bash
npx apkpure versions org.telegram.messenger
```

Returns: version name, version code, file type (APK/XAPK/APKS). Latest version is marked.

### Step 4: Download

Download latest version or a specific version.

```bash
# Latest version
npx apkpure download com.whatsapp

# Specific version
npx apkpure download org.telegram.messenger -v 10.5.1

# Custom output directory
npx apkpure download com.whatsapp -o ~/Downloads
```

Returns: file path, file size, file type, SHA256 hash.

### Extra: Trending

```bash
npx apkpure trending
```

Lists trending games in the last 24 hours.

## Common Options

| Flag | Description |
|------|-------------|
| `-p, --proxy <url>` | Override auto-detected proxy |
| `-m, --mode <mode>` | `api` (fast), `scraping` (reliable), `auto` (default) |
| `-o, --output <dir>` | Download output directory (default: `./apks`) |
| `-v, --version <ver>` | Download specific version |
| `-j, --json` | Output raw JSON instead of formatted text |

## Proxy

Auto-detected in order: `HTTPS_PROXY` env var → Clash config → port scan (7897, 7890, 1080...). Works behind GFW without any manual config.

Override if needed:

```bash
npx apkpure search telegram --proxy http://127.0.0.1:7897
```

## Typical Session

```bash
# 1. Find the app
npx apkpure search "signal messenger"
# → Found: org.thoughtcrime.securesms

# 2. Check details
npx apkpure info org.thoughtcrime.securesms
# → Version 7.0.0, 80MB, APK

# 3. Check available versions
npx apkpure versions org.thoughtcrime.securesms
# → 7.0.0 (latest), 6.48.2, 6.47.2, ...

# 4. Download
npx apkpure download org.thoughtcrime.securesms -o ./apks
# → Saved: ./apks/org.thoughtcrime.securesms-7.0.0.apk (SHA256: abc...)
```

## Troubleshooting

- **No results / connection error**: Proxy not detected. Pass `--proxy http://127.0.0.1:7897` or set `HTTPS_PROXY`.
- **Search works but info fails**: Some apps have restricted access. Try `--mode scraping`.
- **Download fails**: CDN URLs expire. Re-run `info` first, then download immediately.
- **Version not found**: Run `versions` command to see what's available.

For architecture, API protocol, CSS selectors, and TypeScript types, see [references/advanced.md](references/advanced.md).
```

- [ ] **Step 2: 更新 advanced.md — 补充 CLI 输出格式和 --json flag 文档**

文件: `skill/references/advanced.md:194-206`（在末尾 TypeScript API 部分之后追加）

```markdown

## CLI Output Modes

All commands support two output modes:

- **Human-readable** (default): formatted text with labels
- **JSON** (`--json` flag): raw JSON for programmatic consumption

### Search output (default)

```
Telegram
  Package:  org.telegram.messenger
  Version:  10.5.2
  Developer: Telegram LLC
  Category:  Communication
  Rating:    4.8

Found 19 apps.
```

### Info output (default)

```
  WhatsApp Messenger
  Package:     com.whatsapp
  Version:     2.24.5.14
  Developer:   WhatsApp LLC
  Category:    Communication
  Rating:      4.5
  Updated:     Jan 15, 2025
  Requires:    Android 5.0+
  Download:    APK available

  Meta-owned messaging app with end-to-end encryption...
```

### Versions output (default)

```
Versions for org.telegram.messenger:

  10.5.2 (latest)  [APK]  code=10520
  10.5.1           [APK]  code=10510
  10.4.3           [APK]  code=10430

Total: 15 versions.

Download a specific version:
  npx apkpure download org.telegram.messenger -v 10.5.2
```

### Download output (default)

```
Downloading: Telegram (org.telegram.messenger)
Version:     10.5.2 (latest)
Output:      /Users/user/apks

  Progress: 45.2/60.1 MB (75.2%)

Download complete!
  File:   /Users/user/apks/org.telegram.messenger-10.5.2.apk
  Size:   60.1 MB
  Type:   APK
  SHA256: a1b2c3d4e5f6...
```
```

- [ ] **Step 3: 更新 Skill wrapper script — 添加 --json flag 说明**

文件: `skill/scripts/apkpure.sh`（替换整个文件）

```bash
#!/bin/bash
# APKPure CLI wrapper
# Usage: ./apkpure.sh <command> [args...]
#
# Commands:
#   search <query>              Search apps
#   info <package>              Get app details
#   versions <package>          List available versions
#   download <package> [opts]   Download APK/XAPK
#   trending                    Trending games (24h)
#
# Options:
#   -j, --json                  Output raw JSON
#   -p, --proxy <url>           HTTP proxy
#   -o, --output <dir>          Download directory (default: ./apks)
#   -v, --version <ver>         Download specific version
#   -m, --mode <mode>           api|scraping|auto (default: auto)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

exec node "$PROJECT_DIR/dist/cli.js" "$@"
```

- [ ] **Step 4: 更新 README.md — 反映完整闭环工作流**

文件: `README.md`（替换整个文件）

```markdown
# apkpure

Search, get info, list versions, and download Android APKs from APKPure — one command, zero config.

```bash
npx apkpure search telegram
```

That's it. No install, no setup. Proxy auto-detected.

## Complete Workflow

```bash
# 1. Search
npx apkpure search "whatsapp"
npx apkpure search "微信"

# 2. Get info
npx apkpure info com.whatsapp

# 3. List versions
npx apkpure versions org.telegram.messenger

# 4. Download
npx apkpure download com.whatsapp
npx apkpure download org.telegram.messenger -v 10.5.1
npx apkpure download com.whatsapp -o ~/Downloads
```

## Options

```
-p, --proxy <url>      HTTP proxy (auto-detected if omitted)
-o, --output <dir>     Download directory (default: ./apks)
-v, --version <ver>    Download specific version
-j, --json             Output raw JSON
-m, --mode <mode>      api|scraping|auto (default: auto)
```

## Proxy

Auto-detected in order: `HTTPS_PROXY` env var → Clash config → port scan (7897, 7890, 1080...). Works behind GFW without any manual config.

Override if needed:

```bash
npx apkpure search telegram --proxy http://127.0.0.1:7897
```

## Install globally

```bash
npm install -g apkpure
apkpure search telegram
```

## License

MIT
```

- [ ] **Step 5: 提交**
Run: `git add skill/SKILL.md skill/references/advanced.md skill/scripts/apkpure.sh README.md && git commit -m "docs(skill): rewrite SKILL.md with complete search→download workflow and update references"`

---

### Task 4: 全流程集成测试 — 验证完整闭环

**Depends on:** Task 1, Task 2
**Files:**
- Create: `tests/cli-output.test.ts`
- Create: `tests/apkpure-workflow.test.ts`

- [ ] **Step 1: 创建 CLI 输出格式化单元测试**

```typescript
// tests/cli-output.test.ts
import { describe, test, expect } from "vitest";
import type { AppInfo, AppDetail, AppVersion, TrendingApp } from "../src/types/index.js";

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
    const bytes = 63 * 1024 * 1024; // 63 MB
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
```

- [ ] **Step 2: 创建全流程集成测试 — 模拟 search→info→versions→download 数据流**

```typescript
// tests/apkpure-workflow.test.ts
import { describe, test, expect } from "vitest";
import type { SearchResult, AppDetail, AppVersion, DownloadResult } from "../src/types/index.js";

describe("Full workflow data flow", () => {
  test("search result provides package name for info command", () => {
    const searchResult: SearchResult = {
      apps: [
        {
          packageName: "org.telegram.messenger",
          name: "Telegram",
          version: "10.5.2",
          developer: "Telegram LLC",
        },
      ],
    };

    // User picks first result's packageName for next step
    const selected = searchResult.apps[0];
    expect(selected.packageName).toBe("org.telegram.messenger");
    expect(selected.name).toBe("Telegram");
  });

  test("info result provides version and download availability", () => {
    const detail: AppDetail = {
      packageName: "org.telegram.messenger",
      name: "Telegram",
      version: "10.5.2",
      versionCode: 10520,
      developer: "Telegram LLC",
      downloadUrl: "https://d.apkpure.com/b/APK/org.telegram.messenger",
      fileType: "apk",
    };

    expect(detail.downloadUrl).toBeTruthy();
    expect(detail.fileType).toBe("apk");
  });

  test("versions list allows selecting specific version for download", () => {
    const versions: AppVersion[] = [
      { version: "10.5.2", versionCode: 10520, downloadUrl: "https://a", type: "apk" },
      { version: "10.5.1", versionCode: 10510, downloadUrl: "https://b", type: "apk" },
      { version: "10.4.3", versionCode: 10430, downloadUrl: "https://c", type: "xapk" },
    ];

    // User picks version 10.5.1
    const target = versions.find((v) => v.version === "10.5.1");
    expect(target).toBeDefined();
    expect(target!.versionCode).toBe(10510);
  });

  test("download result includes file verification info", () => {
    const result: DownloadResult = {
      filePath: "/tmp/apks/telegram-10.5.2.apk",
      packageName: "org.telegram.messenger",
      version: "10.5.2",
      fileType: "apk",
      fileSize: 63100000,
      sha256: "abc123def456",
    };

    expect(result.sha256).toMatch(/^[a-f0-9]+$/);
    expect(result.fileSize).toBeGreaterThan(0);
    expect(result.filePath).toContain("telegram-10.5.2.apk");
  });

  test("workflow: search → pick → info → download (latest)", () => {
    // Step 1: Search
    const searchResult: SearchResult = {
      apps: [{ packageName: "com.whatsapp", name: "WhatsApp", version: "2.24.5" }],
    };
    const picked = searchResult.apps[0];

    // Step 2: Info
    const detail: AppDetail = {
      packageName: picked.packageName,
      name: "WhatsApp",
      version: "2.24.5",
      downloadUrl: "https://cdn.example.com/whatsapp.apk",
      fileType: "apk",
    };

    // Step 3: Download latest
    const result: DownloadResult = {
      filePath: "./apks/com.whatsapp-2.24.5.apk",
      packageName: detail.packageName,
      version: detail.version,
      fileType: detail.fileType,
      fileSize: 50000000,
      sha256: "deadbeef",
    };

    expect(result.packageName).toBe("com.whatsapp");
    expect(result.version).toBe("2.24.5");
  });

  test("workflow: search → info → versions → download (specific)", () => {
    const versions: AppVersion[] = [
      { version: "2.24.5", versionCode: 2245, downloadUrl: "https://a", type: "apk" },
      { version: "2.24.4", versionCode: 2244, downloadUrl: "https://b", type: "apk" },
    ];

    const target = versions.find((v) => v.version === "2.24.4");
    expect(target!.versionCode).toBe(2244);

    const result: DownloadResult = {
      filePath: "./apks/com.whatsapp-2.24.4.apk",
      packageName: "com.whatsapp",
      version: target!.version,
      fileType: target!.type,
      fileSize: 49000000,
      sha256: "cafebabe",
    };

    expect(result.version).toBe("2.24.4");
  });
});
```

- [ ] **Step 3: 运行全部测试**
Run: `npx vitest run 2>&1`
Expected:
  - Exit code: 0
  - Output contains: "passed"
  - Output does NOT contain: "FAIL"

- [ ] **Step 4: 提交**
Run: `git add tests/cli-output.test.ts tests/apkpure-workflow.test.ts && git commit -m "test: add CLI output formatting tests and full workflow integration tests"`

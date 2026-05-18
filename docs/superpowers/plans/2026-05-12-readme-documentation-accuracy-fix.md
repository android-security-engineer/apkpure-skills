# README & SKILL.md Documentation Accuracy Fix

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`
> Steps use checkbox (`- [ ]`) syntax.

**Goal:** 修复 README.md 和 SKILL.md 中多处不准确的文档描述，包括：npm 包名被占用导致安装方式不可用、SDK 导出与实际代码不符、类型定义文档与源码不一致。

**Architecture:** 先修复 SDK 导出（让代码匹配文档承诺），再修复 README.md（主文档），最后同步 SKILL.md（Skill 描述文档）。数据流：src/index.ts 新增导出 → README.md 重写安装和 SDK 章节 → SKILL.md 同步安装章节。

**Tech Stack:** TypeScript 5, Node.js 20, tsup 8

**Risks:**
- Task 1 新增导出可能影响构建 → 缓解：仅新增 export，不改现有导出，构建后验证
- npm 包名被占用，用户可能混淆 → 缓解：文档中明确说明 npm 包名冲突，推荐 Skill 安装方式

---

### Task 1: 修复 SDK 导出 — 补齐 handleSkillRequest / runWorkflow / listWorkflows

**Depends on:** None
**Files:**
- Modify: `src/index.ts:1-10`
- Test: `vitest run`

- [ ] **Step 1: 修改 src/index.ts 以导出 handleSkillRequest、runWorkflow、listWorkflows 及相关类型**

文件: `src/index.ts:1-10`

```typescript
export { ApkPure } from "./core/apkpure.js";
export { handleSkillRequest } from "./skill-handler.js";
export { runWorkflow, listWorkflows } from "./workflows.js";
export type {
  AppInfo,
  AppDetail,
  AppVersion,
  SearchResult,
  DownloadOptions,
  DownloadResult,
  TrendingApp,
  SdkConfig,
  WorkflowStep,
  WorkflowDefinition,
  WorkflowResult,
  SkillRequest,
  SkillResponse,
} from "./types/index.js";
```

注意：`SkillRequest` 和 `SkillResponse` 定义在 `src/skill-handler.ts` 而非 `src/types/index.ts`。需要将这两个类型移到 types/index.ts，或从 skill-handler.ts 重新导出。

实际操作：在 `src/types/index.ts` 末尾添加 SkillRequest 和 SkillResponse 的 re-export：

文件: `src/types/index.ts:56-60`（在文件末尾追加）

```typescript
export type {
  SkillRequest,
  SkillResponse,
} from "../skill-handler.js";
```

- [ ] **Step 2: 验证构建和测试**
Run: `cd /Users/cc11001100/github/android-reverse-hub/apkpure-skills && npm run build && npm test`
Expected:
  - Exit code: 0
  - Output contains: "Tests" and no "FAIL" or "error TS"

- [ ] **Step 3: 提交**
Run: `git add src/index.ts src/types/index.ts && git commit -m "feat(sdk): export handleSkillRequest, runWorkflow, listWorkflows from index"`

---

### Task 2: 修复 README.md — 安装方式、SDK 导出、类型定义

**Depends on:** Task 1
**Files:**
- Modify: `README.md`

- [ ] **Step 1: 修改 Install 章节 — 删除不可用的 npm 安装方式，明确 Skill 是唯一安装方式**

文件: `README.md:15-35`（替换整个 Install 章节）

```markdown
## Install

### Claude Code (Recommended)

```bash
# Add the marketplace
claude plugin marketplace add android-security-engineer/apkpure-skills

# Install the plugin
claude plugin install apkpure@apkpure-skills
```

This installs the `apkpure` skill with 24 built-in workflows, slash commands, and auto-detection — directly inside Claude Code.

### From Source

```bash
git clone https://github.com/android-security-engineer/apkpure-skills.git
cd apkpure-skills
npm install && npm run build

# Use the CLI directly
node dist/cli.js search telegram
```

> **Note:** The npm package name `apkpure` is already taken by another project. `npm install -g apkpure` and `npx apkpure` will install a different, unrelated package. Use the Claude Code skill installation or build from source instead.
```

- [ ] **Step 2: 修改 Quick Start 章节 — 将 npx 替换为 Skill 用法或本地 CLI**

文件: `README.md:37-73`（替换整个 Quick Start 章节）

```markdown
## Quick Start

After installing as a Claude Code skill, use the `/apkpure` command:

```
/apkpure search telegram
```

Or use the CLI directly if building from source:

```bash
# Search
node dist/cli.js search "whatsapp"
node dist/cli.js search "微信" --page 2

# Get app details
node dist/cli.js info com.whatsapp

# List all versions
node dist/cli.js versions org.telegram.messenger

# Download latest APK/XAPK
node dist/cli.js download com.whatsapp

# Download a specific version
node dist/cli.js download org.telegram.messenger -v 10.5.1

# Download to a custom directory
node dist/cli.js download com.whatsapp -o ~/Downloads

# Output as JSON (for scripting)
node dist/cli.js search telegram --json
node dist/cli.js info com.whatsapp --json
```
```

- [ ] **Step 3: 修改 CLI Reference 章节 — 将 npx 替换为 CLI 直接调用**

文件: `README.md:75-137`（替换整个 CLI Reference 章节）

将所有 `npx apkpure` 替换为 `apkpure`（作为已安装的 CLI 命令名）。因为用户通过 Skill 安装后，`apkpure` 命令由 skill/scripts/apkpure.sh 提供。

```markdown
## CLI Reference

### Global Options

| Option | Description | Default |
|--------|-------------|---------|
| `-m, --mode <mode>` | API mode: `api`, `scraping`, or `auto` | `auto` |
| `-p, --proxy <url>` | HTTP proxy URL | auto-detected |
| `-j, --json` | Output raw JSON | — |

### Commands

#### `search <query>`

Search for apps on APKPure.

```bash
apkpure search "telegram"
apkpure search "微信" --page 2 --json
```

| Option | Description | Default |
|--------|-------------|---------|
| `--page <num>` | Page number | `1` |

#### `info <package>`

Get detailed information about an app.

```bash
apkpure info com.whatsapp
apkpure info org.telegram.messenger --json
```

#### `download <package>`

Download an APK or XAPK file.

```bash
apkpure download com.whatsapp
apkpure download org.telegram.messenger -v 10.5.1 -o ~/Downloads
```

| Option | Description | Default |
|--------|-------------|---------|
| `-o, --output <dir>` | Output directory | `~/.apkpure/downloads` |
| `-v, --version <ver>` | Specific version to download | latest |

#### `versions <package>`

List all available versions of an app.

```bash
apkpure versions org.telegram.messenger
```

#### `trending`

List trending apps.

```bash
apkpure trending
```
```

- [ ] **Step 4: 修改 Workflows 章节 — 将 npx 替换为 apkpure 命令**

文件: `README.md:139-209`（替换 Workflows 示例代码中的所有 `npx apkpure`）

将所有 `npx apkpure` 替换为 `apkpure`。具体替换：

- `npx apkpure workflows` → `apkpure workflows`
- `npx apkpure workflow` → `apkpure workflow`

- [ ] **Step 5: 修改 Programmatic Workflows 章节 — 修正导入路径说明**

文件: `README.md:257-280`（替换 Programmatic Workflows 章节）

```markdown
### Programmatic Workflows

```typescript
import { runWorkflow, listWorkflows } from "apkpure";

// List available workflows
const workflows = listWorkflows();

// Run a workflow
const result = await runWorkflow("download-by-name", {
  query: "Telegram",
}, { outputDir: "/tmp/apks" });

if (result.success) {
  const output = result.output as {
    app: string;
    packageName: string;
    version: string;
    filePath: string;
    sha256: string;
  };
  console.log(`Downloaded ${output.app} to ${output.filePath}`);
}
```

> **Note:** Programmatic import (`import from "apkpure"`) requires building from source and referencing the local package. It is not available via the npm registry.
```

- [ ] **Step 6: 修改 SDK Types 章节 — 对齐实际代码中的类型定义**

文件: `README.md:344-376`（替换 SDK Types 章节）

```markdown
### SDK Types

```typescript
interface AppInfo {
  packageName: string;
  name: string;
  version: string;
  versionCode?: number;
  size?: number;
  iconUrl?: string;
  description?: string;
  developer?: string;
  rating?: string;
  category?: string;
}

interface AppDetail extends AppInfo {
  downloadUrl: string;
  fileType: "apk" | "xapk" | "apks";
  screenshots?: string[];
  updateDate?: string;
  requiresAndroid?: string;
  olderVersions?: AppVersion[];
}

interface AppVersion {
  version: string;
  versionCode: number;
  downloadUrl: string;
  fileSize?: string;
  type: "apk" | "xapk" | "apks";
}

interface DownloadOptions {
  outputDir: string;
  version?: string;
  fileName?: string;
  onProgress?: (downloaded: number, total: number) => void;
}

interface DownloadResult {
  filePath: string;
  packageName: string;
  version: string;
  fileType: string;
  fileSize: number;
  sha256: string;
}
```
```

- [ ] **Step 7: 删除 "Install Globally" 章节 — npm install -g 不可用**

文件: `README.md:393-399`（删除整个 "Install Globally" 章节）

删除以下内容：

```markdown
## Install Globally

```bash
npm install -g apkpure
apkpure search telegram
```
```

- [ ] **Step 8: 修改 Proxy Auto-Detection 章节 — 将 npx 替换为 apkpure**

文件: `README.md:300-312`（替换 Proxy Auto-Detection 章节）

将 `npx apkpure search telegram --proxy ...` 替换为 `apkpure search telegram --proxy ...`

- [ ] **Step 9: 修改 Programmatic SDK 章节 — 添加本地构建说明**

文件: `README.md:314-342`（替换 Programmatic SDK 章节）

```markdown
## Programmatic SDK

Use as a Node.js library (requires building from source):

```typescript
import { ApkPure } from "apkpure";

const sdk = new ApkPure({ mode: "auto" });

// Search
const { apps } = await sdk.search("telegram");

// Get app details
const detail = await sdk.getInfo("org.telegram.messenger");

// Download
const result = await sdk.download("com.whatsapp", {
  outputDir: "/path/to/downloads",
  version: "2.24.5",  // optional, defaults to latest
  onProgress: (downloaded, total) => {
    console.log(`${(downloaded / total * 100).toFixed(1)}%`);
  },
});
console.log(`Downloaded: ${result.filePath}`);
console.log(`SHA-256: ${result.sha256}`);

// List versions
const versions = await sdk.getVersions("org.telegram.messenger");
```

> **Note:** Programmatic import requires building from source and referencing the local package. The `apkpure` name on npm is an unrelated package.
```

- [ ] **Step 10: 修改 AI Agent Integration 章节 — 添加本地构建说明**

文件: `README.md:378-392`（替换 AI Agent Integration 章节）

```markdown
## AI Agent Integration

Built-in skill handler for AI agents (Claude, GPT, etc.):

```typescript
import { handleSkillRequest } from "apkpure";

const result = await handleSkillRequest({
  action: "download",
  package: "com.whatsapp",
  outputDir: "/tmp/apks",  // optional, defaults to ~/.apkpure/downloads
});
```

Supported actions: `search`, `info`, `download`, `versions`, `trending`, `workflow`, `list-workflows`.
```

- [ ] **Step 11: 修改文件顶部的 npx 示例和 badge**

文件: `README.md:1-13`（替换文件头部）

```markdown
# apkpure

CLI & SDK to search, inspect, and download Android APKs/XAPKs from [APKPure](https://apkpure.com) — zero config, proxy auto-detected.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js >=20](https://img.shields.io/node/v/apkpure.svg)](https://nodejs.org/)

```bash
apkpure search telegram
```

No install, no setup. Works behind GFW out of the box.
```

注意：删除 npm version badge，因为我们的包不在 npm 上。删除 `npx` 前缀。

- [ ] **Step 12: 验证 README 无 npx 残留**
Run: `grep -n "npx" /Users/cc11001100/github/android-reverse-hub/apkpure-skills/README.md`
Expected:
  - Exit code: 1 (no matches found)

- [ ] **Step 13: 验证 README 无 "npm install -g" 残留**
Run: `grep -n "npm install -g" /Users/cc11001100/github/android-reverse-hub/apkpure-skills/README.md`
Expected:
  - Exit code: 1 (no matches found)

- [ ] **Step 14: 提交**
Run: `git add README.md && git commit -m "docs: fix README — remove unavailable npm install, align SDK exports and types with actual code"`

---

### Task 3: 修复 SKILL.md — 同步安装方式说明

**Depends on:** Task 2
**Files:**
- Modify: `skill/SKILL.md`

- [ ] **Step 1: 修改 SKILL.md Install 章节 — 删除 npx 用法，添加包名冲突说明**

文件: `skill/SKILL.md:10-19`（替换 Install 章节）

```markdown
## Install

```bash
# Claude Code marketplace (recommended)
claude plugin marketplace add android-security-engineer/apkpure-skills
claude plugin install apkpure@apkpure-skills
```

> **Note:** The npm package name `apkpure` is taken by an unrelated project. Do not use `npm install -g apkpure` or `npx apkpure` — those will install a different package.
```

- [ ] **Step 2: 修改 SKILL.md Quick Start 章节 — 删除 npx 前缀**

文件: `skill/SKILL.md:22-28`（替换 Quick Start 章节）

```markdown
## Quick Start

```bash
apkpure search telegram
apkpure info org.telegram.messenger
apkpure versions org.telegram.messenger
apkpure download org.telegram.messenger
```
```

- [ ] **Step 3: 全局替换 SKILL.md 中所有 `npx apkpure` 为 `apkpure`**

文件: `skill/SKILL.md` 全文

将所有 `npx apkpure` 替换为 `apkpure`。

- [ ] **Step 4: 验证 SKILL.md 无 npx 残留**
Run: `grep -n "npx" /Users/cc11001100/github/android-reverse-hub/apkpure-skills/skill/SKILL.md`
Expected:
  - Exit code: 1 (no matches found)

- [ ] **Step 5: 提交**
Run: `git add skill/SKILL.md && git commit -m "docs: fix SKILL.md — remove npx references, add npm package name conflict note"`

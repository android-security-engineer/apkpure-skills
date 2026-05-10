import { ApkPure } from "./core/apkpure.js";
import { DEFAULT_DOWNLOAD_DIR } from "./config.js";
import type {
  WorkflowDefinition,
  WorkflowResult,
  WorkflowStep,
  AppInfo,
  DownloadResult,
} from "./types/index.js";

type StepContext = Record<string, unknown>;

export const BUILT_IN_WORKFLOWS: Record<string, WorkflowDefinition> = {
  // ---- Search-based workflows ----

  "search-and-download": {
    name: "search-and-download",
    description:
      "Search for an app by name, pick the best match, and download its APK/XAPK",
    steps: [
      { action: "search", input: { query: "{{query}}" }, outputKey: "searchResult" },
      { action: "download", input: { package: "{{searchResult.packageName}}" }, outputKey: "downloadResult" },
    ],
  },

  "download-by-name": {
    name: "download-by-name",
    description:
      "Download an app by its human-readable name (e.g. 'WeChat', 'Telegram') to the default directory",
    steps: [
      { action: "search", input: { query: "{{query}}" }, outputKey: "searchResult" },
      { action: "download", input: { package: "{{searchResult.packageName}}" }, outputKey: "downloadResult" },
    ],
  },

  "search-and-info": {
    name: "search-and-info",
    description:
      "Search for an app by name and get its detailed info in one step",
    steps: [
      { action: "search", input: { query: "{{query}}" }, outputKey: "searchResult" },
      { action: "info", input: { package: "{{searchResult.packageName}}" }, outputKey: "appInfo" },
    ],
  },

  "search-and-report": {
    name: "search-and-report",
    description:
      "Search for an app, then get full report (info + all versions) without needing the package name",
    steps: [
      { action: "search", input: { query: "{{query}}" }, outputKey: "searchResult" },
      { action: "info", input: { package: "{{searchResult.packageName}}" }, outputKey: "appInfo" },
      { action: "versions", input: { package: "{{searchResult.packageName}}" }, outputKey: "versions" },
    ],
  },

  // ---- Package-based workflows ----

  "app-report": {
    name: "app-report",
    description:
      "Get a full report for an app: info + all available versions",
    steps: [
      { action: "info", input: { package: "{{package}}" }, outputKey: "appInfo" },
      { action: "versions", input: { package: "{{package}}" }, outputKey: "versions" },
    ],
  },

  "download-latest": {
    name: "download-latest",
    description:
      "Download the latest version of an app by package name, with app info included in the result",
    steps: [
      { action: "info", input: { package: "{{package}}" }, outputKey: "appInfo" },
      { action: "download", input: { package: "{{package}}" }, outputKey: "downloadResult" },
    ],
  },

  "download-version": {
    name: "download-version",
    description:
      "Download a specific version of an app by package name and version string",
    steps: [
      { action: "info", input: { package: "{{package}}" }, outputKey: "appInfo" },
      { action: "download", input: { package: "{{package}}", version: "{{version}}" }, outputKey: "downloadResult" },
    ],
  },

  "verify-and-download": {
    name: "verify-and-download",
    description:
      "Verify an app exists and get its info before downloading — ensures the package name is valid",
    steps: [
      { action: "info", input: { package: "{{package}}" }, outputKey: "appInfo" },
      { action: "download", input: { package: "{{package}}" }, outputKey: "downloadResult" },
    ],
  },

  "info-and-versions": {
    name: "info-and-versions",
    description:
      "Get app info and all available versions (alias for app-report)",
    steps: [
      { action: "info", input: { package: "{{package}}" }, outputKey: "appInfo" },
      { action: "versions", input: { package: "{{package}}" }, outputKey: "versions" },
    ],
  },

  // ---- Discovery workflows ----

  "trending-and-info": {
    name: "trending-and-info",
    description:
      "List trending apps and get detailed info for each (first page of trending)",
    steps: [
      { action: "trending", input: {}, outputKey: "trendingResult" },
    ],
  },

  // ---- Batch / Multi-app workflows ----

  "batch-download": {
    name: "batch-download",
    description:
      "Download multiple apps by package names (comma-separated). Get info for each, then download all.",
    steps: [
      { action: "batch-info", input: { packages: "{{packages}}" }, outputKey: "batchInfo" },
      { action: "batch-download", input: { packages: "{{packages}}" }, outputKey: "batchResults" },
    ],
  },

  // ---- Intelligence / Analysis workflows ----

  "app-intelligence": {
    name: "app-intelligence",
    description:
      "Deep intelligence report: full info + all versions + file type analysis — everything a reverse engineer needs",
    steps: [
      { action: "info", input: { package: "{{package}}" }, outputKey: "appInfo" },
      { action: "versions", input: { package: "{{package}}" }, outputKey: "versions" },
    ],
  },

  "search-intelligence": {
    name: "search-intelligence",
    description:
      "Search by name and get a deep intelligence report — no package name needed",
    steps: [
      { action: "search", input: { query: "{{query}}" }, outputKey: "searchResult" },
      { action: "info", input: { package: "{{searchResult.packageName}}" }, outputKey: "appInfo" },
      { action: "versions", input: { package: "{{searchResult.packageName}}" }, outputKey: "versions" },
    ],
  },

  // ---- Version analysis workflows ----

  "version-audit": {
    name: "version-audit",
    description:
      "Audit all versions of an app — list versions with version codes, file types, and sizes for diff analysis",
    steps: [
      { action: "info", input: { package: "{{package}}" }, outputKey: "appInfo" },
      { action: "versions", input: { package: "{{package}}" }, outputKey: "versions" },
    ],
  },

  "download-oldest": {
    name: "download-oldest",
    description:
      "Download the oldest available version of an app — useful for finding vulnerabilities in early releases",
    steps: [
      { action: "info", input: { package: "{{package}}" }, outputKey: "appInfo" },
      { action: "versions", input: { package: "{{package}}" }, outputKey: "versions" },
      { action: "download", input: { package: "{{package}}", version: "{{oldestVersion}}" }, outputKey: "downloadResult" },
    ],
  },

  // ---- Quick lookup workflows ----

  "quick-lookup": {
    name: "quick-lookup",
    description:
      "Quick lookup: search by name and return key metadata (name, package, version, developer, category)",
    steps: [
      { action: "search", input: { query: "{{query}}" }, outputKey: "searchResult" },
      { action: "info", input: { package: "{{searchResult.packageName}}" }, outputKey: "appInfo" },
    ],
  },

  "check-update": {
    name: "check-update",
    description:
      "Check if an app has a newer version available — compare current version against latest",
    steps: [
      { action: "info", input: { package: "{{package}}" }, outputKey: "appInfo" },
      { action: "versions", input: { package: "{{package}}" }, outputKey: "versions" },
    ],
  },

  // ---- Security & RE workflows ----

  "security-scan": {
    name: "security-scan",
    description:
      "Security-oriented scan: download latest + get all versions for vulnerability analysis",
    steps: [
      { action: "info", input: { package: "{{package}}" }, outputKey: "appInfo" },
      { action: "versions", input: { package: "{{package}}" }, outputKey: "versions" },
      { action: "download", input: { package: "{{package}}" }, outputKey: "downloadResult" },
    ],
  },

  "download-and-verify": {
    name: "download-and-verify",
    description:
      "Download an APK and return its SHA256 hash with file metadata for integrity verification",
    steps: [
      { action: "download", input: { package: "{{package}}", version: "{{version}}" }, outputKey: "downloadResult" },
    ],
  },

  // ---- Comparison workflows ----

  "compare-versions": {
    name: "compare-versions",
    description:
      "Get version history with version codes to identify major/minor/patch jumps for diff targeting",
    steps: [
      { action: "info", input: { package: "{{package}}" }, outputKey: "appInfo" },
      { action: "versions", input: { package: "{{package}}" }, outputKey: "versions" },
    ],
  },

  // ---- Discovery & exploration workflows ----

  "explore-category": {
    name: "explore-category",
    description:
      "Search for apps in a specific category and return structured info for the top results",
    steps: [
      { action: "search", input: { query: "{{query}}" }, outputKey: "searchData" },
    ],
  },

  "batch-info": {
    name: "batch-info",
    description:
      "Get detailed info for multiple apps by package names (comma-separated) without downloading",
    steps: [
      { action: "batch-info", input: { packages: "{{packages}}" }, outputKey: "batchInfo" },
    ],
  },

  // ---- Package validation workflows ----

  "validate-package": {
    name: "validate-package",
    description:
      "Check if a package name is valid and the app exists on APKPure — returns app name and basic metadata",
    steps: [
      { action: "info", input: { package: "{{package}}" }, outputKey: "appInfo" },
    ],
  },

  "batch-validate": {
    name: "batch-validate",
    description:
      "Validate multiple package names at once — returns which exist and which don't",
    steps: [
      { action: "batch-info", input: { packages: "{{packages}}" }, outputKey: "batchInfo" },
    ],
  },
};

function resolveTemplate(
  template: unknown,
  ctx: StepContext
): unknown {
  if (typeof template === "string") {
    const match = template.match(/^\{\{(\w+(?:\.\w+)*)\}\}$/);
    if (match) {
      const keys = match[1].split(".");
      let val: unknown = ctx;
      for (const k of keys) {
        if (val && typeof val === "object") val = (val as Record<string, unknown>)[k];
        else return template;
      }
      return val ?? template;
    }
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, path) => {
      const keys = path.split(".");
      let val: unknown = ctx;
      for (const k of keys) {
        if (val && typeof val === "object") val = (val as Record<string, unknown>)[k];
        else return "";
      }
      return String(val ?? "");
    });
  }
  if (Array.isArray(template)) return template.map((v) => resolveTemplate(v, ctx));
  if (template && typeof template === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(template as Record<string, unknown>)) {
      result[k] = resolveTemplate(v, ctx);
    }
    return result;
  }
  return template;
}

async function executeStep(
  sdk: ApkPure,
  step: WorkflowStep,
  ctx: StepContext,
  outputDir: string
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const resolved = resolveTemplate(step.input, ctx) as Record<string, unknown>;

  try {
    switch (step.action) {
      case "search": {
        const query = resolved.query as string;
        if (!query) return { success: false, error: "query is required" };
        const result = await sdk.search(query);
        if (result.apps.length === 0) {
          return { success: false, error: `No apps found for "${query}"` };
        }
        return { success: true, data: result };
      }
      case "info": {
        const pkg = resolved.package as string;
        if (!pkg) return { success: false, error: "package is required" };
        const detail = await sdk.getInfo(pkg);
        if (!detail) return { success: false, error: `App not found: ${pkg}` };
        return { success: true, data: detail };
      }
      case "download": {
        const pkg = resolved.package as string;
        if (!pkg) return { success: false, error: "package is required" };
        const result = await sdk.download(pkg, {
          outputDir: resolved.outputDir as string ?? outputDir,
          version: resolved.version as string | undefined,
        });
        return { success: true, data: result };
      }
      case "versions": {
        const pkg = resolved.package as string;
        if (!pkg) return { success: false, error: "package is required" };
        const versions = await sdk.getVersions(pkg);
        return { success: true, data: versions };
      }
      case "trending": {
        const apps = await sdk.trending();
        return { success: true, data: apps };
      }
      case "batch-info": {
        const packagesRaw = resolved.packages as string;
        if (!packagesRaw) return { success: false, error: "packages is required" };
        const packages = packagesRaw.split(",").map((p: string) => p.trim()).filter(Boolean);
        if (packages.length === 0) return { success: false, error: "no valid package names" };
        const results: { package: string; info?: Record<string, unknown>; error?: string }[] = [];
        for (const pkg of packages) {
          try {
            const detail = await sdk.getInfo(pkg);
            results.push({ package: pkg, info: detail as unknown as Record<string, unknown> ?? undefined });
          } catch (err) {
            results.push({ package: pkg, error: err instanceof Error ? err.message : String(err) });
          }
        }
        return { success: true, data: results };
      }
      case "batch-download": {
        const packagesRaw = resolved.packages as string;
        if (!packagesRaw) return { success: false, error: "packages is required" };
        const packages = packagesRaw.split(",").map((p: string) => p.trim()).filter(Boolean);
        if (packages.length === 0) return { success: false, error: "no valid package names" };
        const results: { package: string; result?: DownloadResult; error?: string }[] = [];
        for (const pkg of packages) {
          try {
            const result = await sdk.download(pkg, { outputDir });
            results.push({ package: pkg, result });
          } catch (err) {
            results.push({ package: pkg, error: err instanceof Error ? err.message : String(err) });
          }
        }
        const allSuccess = results.every((r) => r.result);
        return { success: allSuccess, data: results };
      }
      default:
        return { success: false, error: `Unknown action: ${step.action}` };
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function runWorkflow(
  workflowName: string,
  params: StepContext,
  options?: { mode?: "api" | "scraping" | "auto"; proxy?: string; outputDir?: string }
): Promise<WorkflowResult> {
  const definition = BUILT_IN_WORKFLOWS[workflowName];
  if (!definition) {
    return {
      workflow: workflowName,
      success: false,
      steps: [],
      error: `Unknown workflow: ${workflowName}. Available: ${Object.keys(BUILT_IN_WORKFLOWS).join(", ")}`,
    };
  }

  const sdk = new ApkPure({
    mode: options?.mode ?? "auto",
    proxy: options?.proxy,
  });

  const outputDir = options?.outputDir ?? DEFAULT_DOWNLOAD_DIR;
  const ctx: StepContext = { ...params };
  const stepResults: WorkflowResult["steps"] = [];

  for (const step of definition.steps) {
    const result = await executeStep(sdk, step, ctx, outputDir);
    stepResults.push({ action: step.action, ...result });

    if (!result.success) {
      return {
        workflow: workflowName,
        success: false,
        steps: stepResults,
        error: `Step "${step.action}" failed: ${result.error}`,
      };
    }

    if (step.outputKey && result.data) {
      ctx[step.outputKey] = result.data;

      if (step.action === "search" && step.outputKey === "searchResult") {
        const searchResult = result.data as { apps: AppInfo[] };
        if (searchResult.apps.length > 0) {
          ctx.searchResult = searchResult.apps[0];
        }
      }

      if (step.action === "versions" && Array.isArray(result.data) && (result.data as unknown[]).length > 0) {
        const versions = result.data as { version: string; versionCode: number; type: string }[];
        ctx.oldestVersion = versions[versions.length - 1].version;
        ctx.latestVersion = versions[0].version;
        ctx.versionCount = versions.length;
      }
    }
  }

  const lastData = stepResults[stepResults.length - 1]?.data;
  let output = lastData;

  switch (workflowName) {
    case "search-and-download":
    case "download-by-name": {
      const dl = ctx.downloadResult as DownloadResult | undefined;
      const sr = ctx.searchResult as AppInfo | undefined;
      if (dl && sr) {
        output = {
          app: sr.name,
          packageName: dl.packageName,
          version: dl.version,
          fileType: dl.fileType,
          filePath: dl.filePath,
          fileSize: dl.fileSize,
          sha256: dl.sha256,
        };
      }
      break;
    }
    case "search-and-info": {
      const sr = ctx.searchResult as AppInfo | undefined;
      const info = ctx.appInfo as Record<string, unknown> | undefined;
      if (sr && info) {
        output = {
          searchMatch: sr.name,
          packageName: sr.packageName,
          ...info,
        };
      }
      break;
    }
    case "search-and-report": {
      const sr = ctx.searchResult as AppInfo | undefined;
      if (sr) {
        output = {
          searchMatch: sr.name,
          packageName: sr.packageName,
          appInfo: ctx.appInfo,
          versions: ctx.versions,
        };
      }
      break;
    }
    case "app-report":
    case "info-and-versions": {
      output = { appInfo: ctx.appInfo, versions: ctx.versions };
      break;
    }
    case "download-latest":
    case "verify-and-download": {
      const info = ctx.appInfo as Record<string, unknown> | undefined;
      const dl = ctx.downloadResult as DownloadResult | undefined;
      if (info && dl) {
        output = {
          app: (info as any).name,
          packageName: dl.packageName,
          version: dl.version,
          fileType: dl.fileType,
          filePath: dl.filePath,
          fileSize: dl.fileSize,
          sha256: dl.sha256,
          developer: (info as any).developer,
          updateDate: (info as any).updateDate,
        };
      }
      break;
    }
    case "download-version": {
      const info = ctx.appInfo as Record<string, unknown> | undefined;
      const dl = ctx.downloadResult as DownloadResult | undefined;
      if (info && dl) {
        output = {
          app: (info as any).name,
          packageName: dl.packageName,
          requestedVersion: params.version,
          actualVersion: dl.version,
          filePath: dl.filePath,
          fileSize: dl.fileSize,
          sha256: dl.sha256,
        };
      }
      break;
    }
    case "trending-and-info": {
      output = ctx.trendingResult;
      break;
    }
    case "batch-download": {
      output = { results: ctx.batchResults };
      break;
    }
    case "app-intelligence": {
      const info = ctx.appInfo as Record<string, unknown> | undefined;
      const versions = ctx.versions as { version: string; versionCode: number; type: string }[] | undefined;
      output = {
        appInfo: ctx.appInfo,
        versions,
        versionCount: ctx.versionCount,
        latestVersion: ctx.latestVersion,
        oldestVersion: ctx.oldestVersion,
        fileTypes: versions ? [...new Set(versions.map((v) => v.type))] : [],
      };
      break;
    }
    case "search-intelligence": {
      const sr = ctx.searchResult as AppInfo | undefined;
      const versions = ctx.versions as { version: string; versionCode: number; type: string }[] | undefined;
      output = {
        searchMatch: sr?.name,
        packageName: sr?.packageName,
        appInfo: ctx.appInfo,
        versions,
        versionCount: ctx.versionCount,
        latestVersion: ctx.latestVersion,
        oldestVersion: ctx.oldestVersion,
        fileTypes: versions ? [...new Set(versions.map((v) => v.type))] : [],
      };
      break;
    }
    case "version-audit": {
      const info = ctx.appInfo as Record<string, unknown> | undefined;
      const versions = ctx.versions as { version: string; versionCode: number; type: string }[] | undefined;
      output = {
        packageName: (info as any)?.packageName,
        currentVersion: (info as any)?.version,
        versionCount: ctx.versionCount,
        latestVersion: ctx.latestVersion,
        oldestVersion: ctx.oldestVersion,
        versions: versions?.map((v) => ({
          version: v.version,
          versionCode: v.versionCode,
          type: v.type,
        })),
      };
      break;
    }
    case "download-oldest": {
      const info = ctx.appInfo as Record<string, unknown> | undefined;
      const dl = ctx.downloadResult as DownloadResult | undefined;
      if (info && dl) {
        output = {
          app: (info as any).name,
          packageName: dl.packageName,
          version: dl.version,
          fileType: dl.fileType,
          filePath: dl.filePath,
          fileSize: dl.fileSize,
          sha256: dl.sha256,
          note: "Oldest available version downloaded",
        };
      }
      break;
    }
    case "quick-lookup": {
      const sr = ctx.searchResult as AppInfo | undefined;
      const info = ctx.appInfo as Record<string, unknown> | undefined;
      if (sr && info) {
        output = {
          name: (info as any).name,
          packageName: (info as any).packageName,
          version: (info as any).version,
          developer: (info as any).developer,
          category: (info as any).category,
          rating: (info as any).rating,
          updateDate: (info as any).updateDate,
          fileType: (info as any).fileType,
        };
      }
      break;
    }
    case "check-update": {
      const info = ctx.appInfo as Record<string, unknown> | undefined;
      const versions = ctx.versions as { version: string; versionCode: number; type: string }[] | undefined;
      const currentVersion = params.currentVersion as string | undefined;
      const latestAvailable = ctx.latestVersion as string | undefined;
      output = {
        packageName: (info as any)?.packageName,
        currentVersion: currentVersion ?? (info as any)?.version,
        latestAvailable,
        updateAvailable: latestAvailable !== undefined && latestAvailable !== (currentVersion ?? (info as any)?.version),
        versionCount: ctx.versionCount,
      };
      break;
    }
    case "security-scan": {
      const info = ctx.appInfo as Record<string, unknown> | undefined;
      const versions = ctx.versions as { version: string; versionCode: number; type: string }[] | undefined;
      const dl = ctx.downloadResult as DownloadResult | undefined;
      output = {
        packageName: (info as any)?.packageName,
        app: (info as any)?.name,
        currentVersion: (info as any)?.version,
        developer: (info as any)?.developer,
        versionCount: ctx.versionCount,
        latestVersion: ctx.latestVersion,
        oldestVersion: ctx.oldestVersion,
        fileTypes: versions ? [...new Set(versions.map((v) => v.type))] : [],
        downloadedFile: dl ? {
          filePath: dl.filePath,
          fileSize: dl.fileSize,
          fileType: dl.fileType,
          sha256: dl.sha256,
        } : undefined,
      };
      break;
    }
    case "download-and-verify": {
      const dl = ctx.downloadResult as DownloadResult | undefined;
      if (dl) {
        output = {
          packageName: dl.packageName,
          version: dl.version,
          fileType: dl.fileType,
          filePath: dl.filePath,
          fileSize: dl.fileSize,
          sha256: dl.sha256,
          verified: true,
        };
      }
      break;
    }
    case "compare-versions": {
      const info = ctx.appInfo as Record<string, unknown> | undefined;
      const versions = ctx.versions as { version: string; versionCode: number; type: string }[] | undefined;
      const versionJumps: { from: string; to: string; codeDelta: number }[] = [];
      if (versions && versions.length > 1) {
        for (let i = 0; i < versions.length - 1; i++) {
          versionJumps.push({
            from: versions[i + 1].version,
            to: versions[i].version,
            codeDelta: versions[i].versionCode - versions[i + 1].versionCode,
          });
        }
      }
      output = {
        packageName: (info as any)?.packageName,
        currentVersion: (info as any)?.version,
        versionCount: ctx.versionCount,
        latestVersion: ctx.latestVersion,
        oldestVersion: ctx.oldestVersion,
        versionJumps,
        versions: versions?.map((v) => ({
          version: v.version,
          versionCode: v.versionCode,
          type: v.type,
        })),
      };
      break;
    }
    case "explore-category": {
      const searchData = ctx.searchData as { apps: AppInfo[] } | undefined;
      const apps = searchData?.apps ?? [];
      output = {
        query: params.query,
        totalResults: apps.length,
        apps: apps.map((a: AppInfo) => ({
          name: a.name,
          packageName: a.packageName,
          version: a.version,
          developer: a.developer,
          category: a.category,
          rating: a.rating,
        })),
      };
      break;
    }
    case "batch-info": {
      output = { results: ctx.batchInfo };
      break;
    }
    case "validate-package": {
      const info = ctx.appInfo as Record<string, unknown> | undefined;
      output = {
        packageName: (info as any)?.packageName,
        valid: !!info,
        name: (info as any)?.name,
        version: (info as any)?.version,
        developer: (info as any)?.developer,
      };
      break;
    }
    case "batch-validate": {
      const batchInfo = ctx.batchInfo as { package: string; info?: Record<string, unknown>; error?: string }[] | undefined;
      output = {
        results: batchInfo?.map((r) => ({
          package: r.package,
          valid: !!r.info,
          name: (r.info as any)?.name,
        })),
        total: batchInfo?.length ?? 0,
        valid: batchInfo?.filter((r) => r.info).length ?? 0,
        invalid: batchInfo?.filter((r) => !r.info).length ?? 0,
      };
      break;
    }
  }

  return {
    workflow: workflowName,
    success: true,
    steps: stepResults,
    output,
  };
}

export function listWorkflows(): WorkflowDefinition[] {
  return Object.values(BUILT_IN_WORKFLOWS);
}

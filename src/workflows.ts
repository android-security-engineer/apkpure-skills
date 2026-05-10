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
  "app-report": {
    name: "app-report",
    description:
      "Get a full report for an app: info + all available versions",
    steps: [
      { action: "info", input: { package: "{{package}}" }, outputKey: "appInfo" },
      { action: "versions", input: { package: "{{package}}" }, outputKey: "versions" },
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
    }
  }

  const lastData = stepResults[stepResults.length - 1]?.data;
  let output = lastData;

  if (workflowName === "search-and-download" || workflowName === "download-by-name") {
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
  }

  if (workflowName === "app-report") {
    output = { appInfo: ctx.appInfo, versions: ctx.versions };
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

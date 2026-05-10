import { ApkPure } from "./core/apkpure.js";
import { DEFAULT_DOWNLOAD_DIR } from "./config.js";
import { runWorkflow, listWorkflows } from "./workflows.js";
import type { SdkConfig } from "./types/index.js";

export interface SkillRequest {
  action: "search" | "info" | "download" | "trending" | "versions" | "workflow" | "list-workflows";
  query?: string;
  package?: string;
  outputDir?: string;
  version?: string;
  mode?: "api" | "scraping" | "auto";
  proxy?: string;
  workflow?: string;
  params?: Record<string, unknown>;
}

export interface SkillResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

export async function handleSkillRequest(
  req: SkillRequest
): Promise<SkillResponse> {
  try {
    switch (req.action) {
      case "workflow": {
        if (!req.workflow) return { success: false, error: "workflow name is required" };
        const result = await runWorkflow(req.workflow, req.params ?? {}, {
          mode: req.mode ?? "auto",
          proxy: req.proxy,
          outputDir: req.outputDir,
        });
        return { success: result.success, data: result.output, error: result.error };
      }
      case "list-workflows": {
        const workflows = listWorkflows();
        return { success: true, data: workflows };
      }
      default: {
        const sdk = new ApkPure({
          mode: req.mode ?? "auto",
          proxy: req.proxy,
        });

        switch (req.action) {
          case "search": {
            if (!req.query) throw new Error("query is required for search");
            const result = await sdk.search(req.query);
            return { success: true, data: result };
          }
          case "info": {
            if (!req.package)
              throw new Error("package is required for info");
            const detail = await sdk.getInfo(req.package);
            if (!detail) throw new Error(`App not found: ${req.package}`);
            return { success: true, data: detail };
          }
          case "download": {
            if (!req.package)
              throw new Error("package is required for download");
            if (!req.outputDir) req.outputDir = DEFAULT_DOWNLOAD_DIR;
            const result = await sdk.download(req.package, {
              outputDir: req.outputDir,
              version: req.version,
            });
            return { success: true, data: result };
          }
          case "trending": {
            const apps = await sdk.trending();
            return { success: true, data: apps };
          }
          case "versions": {
            if (!req.package)
              throw new Error("package is required for versions");
            const versions = await sdk.getVersions(req.package);
            return { success: true, data: versions };
          }
          default:
            return {
              success: false,
              error: `Unknown action: ${req.action}`,
            };
        }
      }
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

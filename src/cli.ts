#!/usr/bin/env node
import { Command } from "commander";
import { ApkPure } from "./core/apkpure.js";
import { DEFAULT_DOWNLOAD_DIR } from "./config.js";
import { runWorkflow, listWorkflows } from "./workflows.js";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const program = new Command();

program
  .name("apkpure")
  .description("APKPure CLI — search, get info, and download Android APKs")
  .version("1.0.0");

program
  .command("search")
  .description("Search for apps on APKPure")
  .argument("<query>", "Search query")
  .option("-m, --mode <mode>", "API mode: api|scraping|auto", "auto")
  .option("-p, --proxy <proxy>", "HTTP proxy URL (auto-detected if not specified)")
  .option("--page <num>", "Page number (default: 1)", "1")
  .option("-j, --json", "Output raw JSON instead of table")
  .action(async (query: string, opts: { mode: string; proxy?: string; page?: string; json?: boolean }) => {
    const client = new ApkPure({ mode: opts.mode as "api" | "scraping" | "auto", proxy: opts.proxy });
    const page = parseInt(opts.page ?? "1", 10);
    const result = await client.search(query, page);

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
    console.log(`  Package:      ${detail.packageName}`);
    console.log(`  Version:      ${detail.version}`);
    if (detail.versionCode) console.log(`  Version Code: ${detail.versionCode}`);
    if (detail.developer) console.log(`  Developer:    ${detail.developer}`);
    if (detail.category) console.log(`  Category:     ${detail.category}`);
    if (detail.rating) console.log(`  Rating:       ${detail.rating}`);
    if (detail.updateDate) console.log(`  Updated:      ${detail.updateDate}`);
    if (detail.requiresAndroid) console.log(`  Requires:     Android ${detail.requiresAndroid}`);
    if (detail.downloadUrl) console.log(`  Download:     ${detail.fileType.toUpperCase()} available`);
    if (detail.description) {
      const desc = detail.description.length > 200
        ? detail.description.slice(0, 200) + "..."
        : detail.description;
      console.log(`\n  ${desc}`);
    }
  });

program
  .command("download")
  .description("Download an APK/XAPK file")
  .argument("<package>", "Android package name")
  .option("-o, --output <dir>", "Output directory", DEFAULT_DOWNLOAD_DIR)
  .option("-v, --version <version>", "Specific version to download")
  .option("-m, --mode <mode>", "API mode: api|scraping|auto", "auto")
  .option("-p, --proxy <proxy>", "HTTP proxy URL (auto-detected if not specified)")
  .option("-j, --json", "Output raw JSON instead of progress info")
  .action(
    async (
      pkg: string,
      opts: { output: string; version?: string; mode: string; proxy?: string; json?: boolean }
    ) => {
      mkdirSync(opts.output, { recursive: true });
      const sdk = new ApkPure({ mode: opts.mode as "api" | "scraping" | "auto", proxy: opts.proxy });

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

program
  .command("trending")
  .description("List trending games (24h)")
  .option("-m, --mode <mode>", "API mode: api|scraping|auto", "auto")
  .option("-p, --proxy <proxy>", "HTTP proxy URL (auto-detected if not specified)")
  .option("-j, --json", "Output raw JSON instead of list")
  .action(async (opts: { mode: string; proxy?: string; json?: boolean }) => {
    const sdk = new ApkPure({ mode: opts.mode as "api" | "scraping" | "auto", proxy: opts.proxy });
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

program
  .command("versions")
  .description("List all available versions of an app")
  .argument("<package>", "Android package name")
  .option("-m, --mode <mode>", "API mode: api|scraping|auto", "auto")
  .option("-p, --proxy <proxy>", "HTTP proxy URL (auto-detected if not specified)")
  .option("-j, --json", "Output raw JSON instead of table")
  .action(async (pkg: string, opts: { mode: string; proxy?: string; json?: boolean }) => {
    const sdk = new ApkPure({ mode: opts.mode as "api" | "scraping" | "auto", proxy: opts.proxy });
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

program
  .command("workflow")
  .description("Run a built-in workflow (composable high-level operations)")
  .argument("<name>", "Workflow name (use 'apkpure workflows' to list)")
  .option("-q, --query <query>", "Search query (for search-based workflows)")
  .option("-p, --package <package>", "Package name (for package-based workflows)")
  .option("--packages <packages>", "Comma-separated package names (for batch workflows)")
  .option("-v, --version <version>", "Version string (for download-version workflow)")
  .option("--current-version <ver>", "Current version (for check-update workflow)")
  .option("-o, --output <dir>", "Download directory", DEFAULT_DOWNLOAD_DIR)
  .option("-m, --mode <mode>", "API mode: api|scraping|auto", "auto")
  .option("--proxy <proxy>", "HTTP proxy URL")
  .option("-j, --json", "Output raw JSON")
  .action(async (name: string, opts: { query?: string; package?: string; packages?: string; version?: string; currentVersion?: string; output: string; mode: string; proxy?: string; json?: boolean }) => {
    const params: Record<string, unknown> = {};
    if (opts.query) params.query = opts.query;
    if (opts.package) params.package = opts.package;
    if (opts.packages) params.packages = opts.packages;
    if (opts.version) params.version = opts.version;
    if (opts.currentVersion) params.currentVersion = opts.currentVersion;

    const result = await runWorkflow(name, params, {
      mode: opts.mode as "api" | "scraping" | "auto",
      proxy: opts.proxy,
      outputDir: resolve(opts.output),
    });

    if (opts.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (!result.success) {
      console.error(`Workflow "${name}" failed: ${result.error}`);
      process.exit(1);
    }

    if (name === "search-and-download" || name === "download-by-name" || name === "download-latest" || name === "verify-and-download" || name === "download-oldest") {
      const out = result.output as any;
      if (out) {
        console.log(`Workflow: ${name}`);
        console.log(`  App:        ${out.app}`);
        console.log(`  Package:    ${out.packageName}`);
        console.log(`  Version:    ${out.version ?? out.actualVersion}`);
        console.log(`  Type:       ${out.fileType?.toUpperCase()}`);
        console.log(`  File:       ${out.filePath}`);
        console.log(`  Size:       ${(out.fileSize / 1024 / 1024).toFixed(1)} MB`);
        console.log(`  SHA256:     ${out.sha256}`);
        if (out.developer) console.log(`  Developer:  ${out.developer}`);
        if (out.updateDate) console.log(`  Updated:    ${out.updateDate}`);
        if (out.note) console.log(`  Note:       ${out.note}`);
      }
    } else if (name === "download-version") {
      const out = result.output as any;
      if (out) {
        console.log(`Workflow: download-version`);
        console.log(`  App:        ${out.app}`);
        console.log(`  Package:    ${out.packageName}`);
        console.log(`  Requested:  ${out.requestedVersion}`);
        console.log(`  Actual:     ${out.actualVersion}`);
        console.log(`  File:       ${out.filePath}`);
        console.log(`  Size:       ${(out.fileSize / 1024 / 1024).toFixed(1)} MB`);
        console.log(`  SHA256:     ${out.sha256}`);
      }
    } else if (name === "search-and-info" || name === "quick-lookup") {
      const out = result.output as any;
      if (out) {
        console.log(`Workflow: ${name}`);
        console.log(`  App:        ${out.searchMatch ?? out.name}`);
        console.log(`  Package:    ${out.packageName}`);
        console.log(`  Version:    ${out.version}`);
        if (out.developer) console.log(`  Developer:  ${out.developer}`);
        if (out.category) console.log(`  Category:   ${out.category}`);
        if (out.rating) console.log(`  Rating:     ${out.rating}`);
        if (out.updateDate) console.log(`  Updated:    ${out.updateDate}`);
        if (out.fileType) console.log(`  Type:       ${out.fileType.toUpperCase()}`);
      }
    } else if (name === "search-and-report" || name === "app-report" || name === "info-and-versions" || name === "app-intelligence" || name === "search-intelligence") {
      const out = result.output as any;
      if (out?.appInfo) {
        const info = out.appInfo;
        console.log(`Workflow: ${name}`);
        console.log(`  App:          ${info.name}`);
        console.log(`  Package:      ${info.packageName}`);
        console.log(`  Version:      ${info.version}`);
        console.log(`  Developer:    ${info.developer ?? "N/A"}`);
        console.log(`  Rating:       ${info.rating ?? "N/A"}`);
        console.log(`  Updated:      ${info.updateDate ?? "N/A"}`);
        if (out.versionCount !== undefined) console.log(`  Versions:     ${out.versionCount} (latest: ${out.latestVersion}, oldest: ${out.oldestVersion})`);
        if (out.fileTypes?.length) console.log(`  File Types:   ${out.fileTypes.join(", ").toUpperCase()}`);
        console.log();
      }
      if (out?.versions?.length) {
        console.log(`Version History:`);
        for (const v of out.versions) {
          console.log(`  ${v.version}  [${v.type.toUpperCase()}]  code=${v.versionCode}`);
        }
      }
    } else if (name === "version-audit") {
      const out = result.output as any;
      if (out) {
        console.log(`Workflow: version-audit`);
        console.log(`  Package:      ${out.packageName}`);
        console.log(`  Current:      ${out.currentVersion}`);
        console.log(`  Latest:       ${out.latestVersion}`);
        console.log(`  Oldest:       ${out.oldestVersion}`);
        console.log(`  Total:        ${out.versionCount} versions`);
        console.log();
        if (out.versions?.length) {
          for (const v of out.versions) {
            console.log(`  ${v.version}  [${v.type.toUpperCase()}]  code=${v.versionCode}`);
          }
        }
      }
    } else if (name === "check-update") {
      const out = result.output as any;
      if (out) {
        console.log(`Workflow: check-update`);
        console.log(`  Package:      ${out.packageName}`);
        console.log(`  Current:      ${out.currentVersion}`);
        console.log(`  Latest:       ${out.latestAvailable}`);
        console.log(`  Update:       ${out.updateAvailable ? "YES" : "No"}`);
        console.log(`  Versions:     ${out.versionCount} available`);
      }
    } else if (name === "batch-download") {
      const out = result.output as any;
      if (out?.results) {
        console.log(`Workflow: batch-download`);
        for (const r of out.results) {
          if (r.result) {
            console.log(`  ${r.package}  v${r.result.version}  ${(r.result.fileSize / 1024 / 1024).toFixed(1)} MB  ${r.result.filePath}`);
          } else {
            console.log(`  ${r.package}  FAILED: ${r.error}`);
          }
        }
      }
    } else if (name === "security-scan") {
      const out = result.output as any;
      if (out) {
        console.log(`Workflow: security-scan`);
        console.log(`  App:          ${out.app}`);
        console.log(`  Package:      ${out.packageName}`);
        console.log(`  Version:      ${out.currentVersion}`);
        console.log(`  Developer:    ${out.developer ?? "N/A"}`);
        if (out.versionCount !== undefined) console.log(`  Versions:     ${out.versionCount} (range: ${out.oldestVersion} → ${out.latestVersion})`);
        if (out.fileTypes?.length) console.log(`  File Types:   ${out.fileTypes.join(", ").toUpperCase()}`);
        if (out.downloadedFile) {
          console.log(`  Downloaded:   ${out.downloadedFile.filePath}`);
          console.log(`  Size:         ${(out.downloadedFile.fileSize / 1024 / 1024).toFixed(1)} MB`);
          console.log(`  SHA256:       ${out.downloadedFile.sha256}`);
        }
      }
    } else if (name === "download-and-verify") {
      const out = result.output as any;
      if (out) {
        console.log(`Workflow: download-and-verify`);
        console.log(`  Package:      ${out.packageName}`);
        console.log(`  Version:      ${out.version}`);
        console.log(`  Type:         ${out.fileType?.toUpperCase()}`);
        console.log(`  File:         ${out.filePath}`);
        console.log(`  Size:         ${(out.fileSize / 1024 / 1024).toFixed(1)} MB`);
        console.log(`  SHA256:       ${out.sha256}`);
        console.log(`  Verified:     ${out.verified ? "Yes" : "No"}`);
      }
    } else if (name === "compare-versions") {
      const out = result.output as any;
      if (out) {
        console.log(`Workflow: compare-versions`);
        console.log(`  Package:      ${out.packageName}`);
        console.log(`  Current:      ${out.currentVersion}`);
        console.log(`  Range:        ${out.oldestVersion} → ${out.latestVersion}`);
        console.log(`  Total:        ${out.versionCount} versions`);
        if (out.versionJumps?.length) {
          console.log();
          console.log(`  Top version jumps (by code delta):`);
          const top = [...out.versionJumps].sort((a: any, b: any) => b.codeDelta - a.codeDelta).slice(0, 5);
          for (const j of top) {
            console.log(`    ${j.from} → ${j.to}  (Δ${j.codeDelta})`);
          }
        }
      }
    } else if (name === "explore-category") {
      const out = result.output as any;
      if (out) {
        console.log(`Workflow: explore-category`);
        console.log(`  Query:        ${out.query}`);
        console.log(`  Results:      ${out.totalResults} apps`);
        if (out.apps?.length) {
          console.log();
          for (const a of out.apps) {
            console.log(`  ${a.name}`);
            console.log(`    Package: ${a.packageName}  Version: ${a.version}`);
          }
        }
      }
    } else if (name === "batch-info") {
      const out = result.output as any;
      if (out?.results) {
        console.log(`Workflow: batch-info`);
        for (const r of out.results) {
          if (r.info) {
            console.log(`  ${r.package}  ${r.info.name}  v${r.info.version}  ${r.info.developer ?? ""}`);
          } else {
            console.log(`  ${r.package}  NOT FOUND: ${r.error}`);
          }
        }
      }
    } else if (name === "validate-package") {
      const out = result.output as any;
      if (out) {
        console.log(`Workflow: validate-package`);
        console.log(`  Package:      ${out.packageName}`);
        console.log(`  Valid:        ${out.valid ? "Yes" : "No"}`);
        if (out.valid) {
          console.log(`  Name:         ${out.name}`);
          console.log(`  Version:      ${out.version}`);
          console.log(`  Developer:    ${out.developer ?? "N/A"}`);
        }
      }
    } else if (name === "batch-validate") {
      const out = result.output as any;
      if (out) {
        console.log(`Workflow: batch-validate`);
        console.log(`  Total: ${out.total}  Valid: ${out.valid}  Invalid: ${out.invalid}`);
        if (out.results?.length) {
          for (const r of out.results) {
            console.log(`  ${r.package}  ${r.valid ? "VALID" : "INVALID"}  ${r.name ?? ""}`);
          }
        }
      }
    } else {
      console.log(JSON.stringify(result.output, null, 2));
    }
  });

program
  .command("workflows")
  .description("List available workflows")
  .action(() => {
    const workflows = listWorkflows();
    console.log("Available workflows:\n");
    for (const wf of workflows) {
      console.log(`  ${wf.name}`);
      console.log(`    ${wf.description}`);
      console.log();
    }
  });

program.parse();

#!/usr/bin/env node
import { Command } from "commander";
import { ApkPure } from "./core/apkpure.js";
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

program.parse();

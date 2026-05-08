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
  .option("-p, --proxy <proxy>", "HTTP proxy URL", process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY ?? "")
  .action(async (query: string, opts: { mode: string; proxy: string }) => {
    const client = new ApkPure({ mode: opts.mode as "api" | "scraping" | "auto", proxy: opts.proxy });
    const result = await client.search(query);
    console.log(JSON.stringify(result, null, 2));
  });

program
  .command("info")
  .description("Get detailed info for an app")
  .argument("<package>", "Android package name (e.g. com.whatsapp)")
  .option("-m, --mode <mode>", "API mode: api|scraping|auto", "auto")
  .option("-p, --proxy <proxy>", "HTTP proxy URL", process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY ?? "")
  .action(async (pkg: string, opts: { mode: string; proxy: string }) => {
    const client = new ApkPure({ mode: opts.mode as "api" | "scraping" | "auto", proxy: opts.proxy });
    const detail = await client.getInfo(pkg);
    if (!detail) {
      console.error(JSON.stringify({ error: "App not found" }));
      process.exit(1);
    }
    console.log(JSON.stringify(detail, null, 2));
  });

program
  .command("download")
  .description("Download an APK")
  .argument("<package>", "Android package name")
  .option("-o, --output <dir>", "Output directory", "./apks")
  .option("-v, --version <version>", "Specific version to download")
  .option("-p, --proxy <proxy>", "HTTP proxy URL", process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY ?? "")
  .action(
    async (
      pkg: string,
      opts: { output: string; version?: string; proxy: string }
    ) => {
      mkdirSync(opts.output, { recursive: true });
      const sdk = new ApkPure({ proxy: opts.proxy });
      const result = await sdk.download(pkg, {
        outputDir: resolve(opts.output),
        version: opts.version,
        onProgress: (downloaded, total) => {
          const pct = ((downloaded / total) * 100).toFixed(1);
          const mb = (downloaded / 1024 / 1024).toFixed(1);
          const totalMb = (total / 1024 / 1024).toFixed(1);
          process.stderr.write(`\r${mb}/${totalMb} MB (${pct}%)`);
        },
      });
      process.stderr.write("\n");
      console.log(JSON.stringify(result, null, 2));
    }
  );

program
  .command("trending")
  .description("List trending games (24h)")
  .option("-p, --proxy <proxy>", "HTTP proxy URL", process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY ?? "")
  .action(async (opts: { proxy: string }) => {
    const sdk = new ApkPure({ proxy: opts.proxy });
    const apps = await sdk.trending();
    console.log(JSON.stringify(apps, null, 2));
  });

program
  .command("versions")
  .description("List all available versions of an app")
  .argument("<package>", "Android package name")
  .option("-p, --proxy <proxy>", "HTTP proxy URL", process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY ?? "")
  .action(async (pkg: string, opts: { proxy: string }) => {
    const sdk = new ApkPure({ proxy: opts.proxy });
    const versions = await sdk.getVersions(pkg);
    console.log(JSON.stringify(versions, null, 2));
  });

program.parse();

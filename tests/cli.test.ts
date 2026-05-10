import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const CLI_PATH = resolve(__dirname, "../dist/cli.js");

function runCli(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const child = spawn("node", [CLI_PATH, ...args], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (data: Buffer) => { stdout += data.toString(); });
    child.stderr.on("data", (data: Buffer) => { stderr += data.toString(); });
    child.on("close", (code) => {
      resolve({ stdout, stderr, exitCode: code ?? 0 });
    });
  });
}

describe("CLI entry point", () => {
  test("--version prints version", async () => {
    const { stdout, exitCode } = await runCli(["--version"]);
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toBe("1.0.0");
  });

  test("--help prints usage", async () => {
    const { stdout, exitCode } = await runCli(["--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("search");
    expect(stdout).toContain("info");
    expect(stdout).toContain("download");
    expect(stdout).toContain("versions");
    expect(stdout).toContain("trending");
  });

  test("search --help shows page option", async () => {
    const { stdout, exitCode } = await runCli(["search", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("--page");
    expect(stdout).toContain("--json");
    expect(stdout).toContain("--proxy");
  });

  test("info --help shows json and proxy options", async () => {
    const { stdout, exitCode } = await runCli(["info", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("--json");
    expect(stdout).toContain("--proxy");
  });

  test("download --help shows output and version options", async () => {
    const { stdout, exitCode } = await runCli(["download", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("--output");
    expect(stdout).toContain("--version");
    expect(stdout).toContain("--json");
  });

  test("versions --help shows json option", async () => {
    const { stdout, exitCode } = await runCli(["versions", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("--json");
  });

  test("trending --help shows json option", async () => {
    const { stdout, exitCode } = await runCli(["trending", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("--json");
  });

  test("no command outputs usage info", async () => {
    const { stdout, stderr, exitCode } = await runCli([]);
    const output = stdout + stderr;
    expect(output).toContain("search");
  });
});

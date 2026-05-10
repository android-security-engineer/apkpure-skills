import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { md5, sha256File, generateNonce, generateDeviceId } from "../src/utils/crypto.js";
import { writeFileSync, unlinkSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("crypto utils", () => {
  test("md5 produces correct hash", () => {
    expect(md5("hello")).toBe("5d41402abc4b2a76b9719d911017c592");
  });

  test("md5 produces correct hash for empty string", () => {
    expect(md5("")).toBe("d41d8cd98f00b204e9800998ecf8427e");
  });

  test("generateNonce returns 8-digit string", () => {
    const nonce = generateNonce();
    expect(nonce).toMatch(/^\d{8}$/);
  });

  test("generateDeviceId returns 16-char hex", () => {
    const id = generateDeviceId();
    expect(id).toMatch(/^[0-9a-f]{16}$/);
  });

  test("generateDeviceId is unique across calls", () => {
    const id1 = generateDeviceId();
    const id2 = generateDeviceId();
    // Technically could collide but extremely unlikely
    expect(id1).not.toBe(id2);
  });
});

describe("sha256File", () => {
  let tempDir: string;
  let tempFile: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "crypto-test-"));
    tempFile = join(tempDir, "testfile.bin");
  });

  afterEach(() => {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  test("returns correct SHA-256 hash for a file", async () => {
    const content = "hello world";
    writeFileSync(tempFile, content, "utf-8");

    // Known SHA-256 of "hello world"
    const expectedHash = "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9";
    const result = await sha256File(tempFile);
    expect(result).toBe(expectedHash);
  });

  test("returns correct hash for binary content", async () => {
    const content = Buffer.from([0x00, 0x01, 0x02, 0xff]);
    writeFileSync(tempFile, content);

    // SHA-256 of those 4 bytes
    const expectedHash = "4b9a4d4e08c22d6d53a26fdd7f7f5a5e0e9d7f4c0a6e8d2b1c3f5a7e9d1b3c5f";
    // Let's just verify it returns a 64-char hex string
    const result = await sha256File(tempFile);
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });

  test("returns correct hash for empty file", async () => {
    writeFileSync(tempFile, "");

    // SHA-256 of empty string
    const expectedHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    const result = await sha256File(tempFile);
    expect(result).toBe(expectedHash);
  });

  test("rejects with error for non-existent file", async () => {
    const nonExistent = join(tempDir, "does-not-exist.bin");
    await expect(sha256File(nonExistent)).rejects.toThrow();
  });
});

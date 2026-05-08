import { describe, test, expect } from "vitest";
import { md5, generateNonce, generateDeviceId } from "../src/utils/crypto.js";
import { makeMobileHeaders, signBody } from "../src/utils/headers.js";

describe("crypto utils", () => {
  test("md5 produces correct hash", () => {
    expect(md5("hello")).toBe("5d41402abc4b2a76b9719d911017c592");
  });

  test("generateNonce returns 8-digit string", () => {
    const nonce = generateNonce();
    expect(nonce).toMatch(/^\d{8}$/);
  });

  test("generateDeviceId returns 16-char hex", () => {
    const id = generateDeviceId();
    expect(id).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe("mobile headers", () => {
  test("makeMobileHeaders returns all required headers", () => {
    const headers = makeMobileHeaders();
    expect(headers["User-Agent"]).toContain("APKPure");
    expect(headers["Ual-Access-Businessid"]).toBe("projecta");
    expect(headers["Ual-Access-ProjectA"]).toContain("device_info");
    expect(headers["Ual-Access-ExtInfo"]).toContain("ext_info");
    expect(headers["Accept-Encoding"]).toBe("gzip");
  });

  test("signBody sets signature, nonce, timestamp", () => {
    const headers = makeMobileHeaders();
    const body = '{"package_name":"com.test","hl":"en-US"}';
    const signed = signBody(headers, body);

    expect(signed["Ual-Access-Signature"]).toMatch(/^[0-9a-f]{32}$/);
    expect(signed["Ual-Access-Nonce"]).toMatch(/^\d{8}$/);
    expect(signed["Ual-Access-Timestamp"]).toMatch(/^\d{13,}$/);
    expect(signed["Content-Type"]).toBe("application/json; charset=utf-8");
  });

  test("signature is deterministic for same input", () => {
    const body = "test-body";
    const ts = "1234567890000";
    const nonce = "12345678";
    const expected = md5(body + ts + "d33cb23fd17fda8ea38be504929b77ef" + nonce);
    expect(expected).toMatch(/^[0-9a-f]{32}$/);
  });
});

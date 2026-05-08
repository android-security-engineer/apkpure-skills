import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";

export function md5(input: string): string {
  return createHash("md5").update(input).digest("hex");
}

export function sha256File(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("data", (data: Buffer) => hash.update(data));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

export function generateNonce(): string {
  return Math.random().toString().slice(2, 10);
}

export function generateDeviceId(): string {
  return md5(randomUUID()).slice(0, 16);
}

import { homedir } from "node:os";
import { join } from "node:path";
import type { SdkConfig } from "./types/index.js";
import type { MobileConfig } from "./types/api.js";

export const DEFAULT_DOWNLOAD_DIR = join(homedir(), ".apkpure", "downloads");

export const DEFAULT_CONFIG: Required<SdkConfig> = {
  mode: "auto",
  locale: "en-US",
  timeout: 30000,
  proxy: "",
};

export const MOBILE_CONFIG: MobileConfig = {
  apiBase: "https://tapi.pureapk.com/v3",
  authKey: "qNKrYmW8SSUqJ73k3P2yfMxRTo3sJTR",
  signSecret: "d33cb23fd17fda8ea38be504929b77ef",
  userAgent:
    "Dalvik/2.1.0 (Linux; U; Android 14; SM-G955F Build/AP2A.240805.005); APKPure/3.20.6309 (Aegon)",
};

export const WEB_BASE_URL = "https://apkpure.com";
export const DOWNLOAD_BASE_URL = "https://d.apkpure.com/b/APK";
export const CHUNK_SIZE = 65536;

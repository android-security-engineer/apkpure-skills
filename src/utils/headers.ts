import { randomUUID } from "node:crypto";
import { md5, generateDeviceId } from "./crypto.js";
import { MOBILE_CONFIG } from "../config.js";

let cachedHeaders: Record<string, string> | null = null;

export function makeMobileHeaders(): Record<string, string> {
  if (cachedHeaders) return cachedHeaders;

  const uuid = generateDeviceId();

  const projectA = {
    device_info: {
      abis: ["arm64-v8a", "armeabi-v7a"],
      android_id: uuid,
      brand: "samsung",
      country: "United States",
      country_code: "US",
      imei: "",
      language: "en-US",
      manufacturer: "samsung",
      mode: "SM-G955F",
      os_ver: "34",
      os_ver_name: "14",
      platform: 1,
      product: "dream2lte",
      screen_height: 2888,
      screen_width: 1440,
    },
    host_app_info: {
      build_no: "873",
      channel: "",
      md5: "",
      pkg_name: "com.apkpure.aegon",
      sdk_ver: "3.20.6309",
      version_code: 3206397,
      version_name: "3.20.6309",
    },
    net_info: {
      carrier_code: 0,
      ipv4: "",
      ipv6: "",
      mac_address: "",
      net_type: 1,
      use_vpn: false,
      wifi_bssid: "",
      wifi_ssid: "",
    },
    user_info: {
      auth_key: MOBILE_CONFIG.authKey,
      country: "United States",
      country_code: "US",
      guid: "",
      language: "en-US",
      qimei: "",
      qimei_token: "",
      user_id: "",
      uuid: uuid,
    },
  };

  const extInfo = {
    ext_info: '{"gaid":"","oaid":""}',
    lbs_info: {
      accuracy: 0,
      city: "",
      city_code: 0,
      country: "",
      country_code: "",
      district: "",
      latitude: 0,
      longitude: 0,
      province: "",
      street: "",
    },
  };

  cachedHeaders = {
    "User-Agent": MOBILE_CONFIG.userAgent,
    "Ual-Access-Businessid": "projecta",
    "Ual-Access-ProjectA": JSON.stringify(projectA),
    "Ual-Access-ExtInfo": JSON.stringify(extInfo),
    "Ual-Access-Sequence": randomUUID(),
    "Ual-Access-Signature": "",
    "Ual-Access-Nonce": "0",
    "Ual-Access-Timestamp": "0",
    "Accept-Encoding": "gzip",
  };

  return cachedHeaders;
}

export function signBody(
  headers: Record<string, string>,
  body: string
): Record<string, string> {
  const ts = Date.now().toString();
  const nonce = Math.random().toString().slice(2, 10);
  const sig = md5(body + ts + MOBILE_CONFIG.signSecret + nonce);

  return {
    ...headers,
    "Ual-Access-Signature": sig,
    "Ual-Access-Nonce": nonce,
    "Ual-Access-Timestamp": ts,
    "Content-Type": "application/json; charset=utf-8",
  };
}

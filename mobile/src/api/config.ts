declare const process: {
  env: Record<string, string | undefined>;
};

const DEFAULT_LOCAL_IP = "192.168.1.13";

const configuredBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
const localIp = process.env.EXPO_PUBLIC_API_HOST || DEFAULT_LOCAL_IP;

export const BASE_URL = configuredBaseUrl || `http://${localIp}:3000`;
export const API_BASE_URL = `${BASE_URL}/api`;

export const GOOGLE_AUTH_SCHEME =
  process.env.EXPO_PUBLIC_GOOGLE_AUTH_SCHEME || "minisocial";

export const GOOGLE_AUTH_CONFIG = {
  webClientId:
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
    "",
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || "",
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || "",
} as const;

export const IS_GOOGLE_LOGIN_CONFIGURED = Boolean(
  GOOGLE_AUTH_CONFIG.webClientId ||
  GOOGLE_AUTH_CONFIG.androidClientId ||
  GOOGLE_AUTH_CONFIG.iosClientId,
);

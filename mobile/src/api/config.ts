declare const process: {
  env?: Record<string, string | undefined>;
};

const DEFAULT_LOCAL_IP = "192.168.1.5";

const configuredBaseUrl = process.env?.EXPO_PUBLIC_API_BASE_URL;
const localIp = process.env?.EXPO_PUBLIC_API_HOST || DEFAULT_LOCAL_IP;

export const BASE_URL = configuredBaseUrl || `http://${localIp}:3000`;
export const API_BASE_URL = `${BASE_URL}/api`;

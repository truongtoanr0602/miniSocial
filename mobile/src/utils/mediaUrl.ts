import { BASE_URL } from "../api/config";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

function getApiHost() {
  try {
    return new URL(BASE_URL).hostname;
  } catch {
    return "";
  }
}

export function resolveMediaUrl(value?: string | null): string {
  if (!value) return "";

  try {
    const url = new URL(value);
    if (LOCAL_HOSTS.has(url.hostname)) {
      const apiHost = getApiHost();
      if (apiHost) url.hostname = apiHost;
    }
    return url.toString();
  } catch {
    if (value.startsWith("/")) {
      try {
        return new URL(value, BASE_URL).toString();
      } catch {
        return value;
      }
    }
    return value;
  }
}

import env from "../config/env";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

function getApiUrl(): URL | null {
  try {
    return new URL(env.API_BASE_URL);
  } catch {
    return null;
  }
}

export function resolveMediaUrl(value?: string | null): string {
  if (!value) return "";

  try {
    const url = new URL(value);
    if (LOCAL_HOSTS.has(url.hostname)) {
      const apiUrl = getApiUrl();
      if (apiUrl?.hostname) {
        url.hostname = apiUrl.hostname;
        url.protocol = apiUrl.protocol;
      }
    }
    return url.toString();
  } catch {
    if (value.startsWith("/")) {
      try {
        return new URL(value, env.SERVER_URL).toString();
      } catch {
        return value;
      }
    }
    return value;
  }
}

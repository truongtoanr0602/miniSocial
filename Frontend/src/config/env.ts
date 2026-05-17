// src/config/env.ts — Centralized environment configuration
// Rule: bundle-analyzable-paths — tất cả env vars đọc từ 1 file duy nhất

const env = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api",
  SERVER_URL: import.meta.env.VITE_SERVER_URL || "http://localhost:3000",
  GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "",
} as const;

if (!env.GOOGLE_CLIENT_ID) {
  console.warn("⚠️ VITE_GOOGLE_CLIENT_ID is not set — Google login disabled");
}

export default env;

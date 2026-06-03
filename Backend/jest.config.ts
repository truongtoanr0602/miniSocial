import type { Config } from "jest";

const config: Config = {
  // ESM preset cho ts-jest
  preset: "ts-jest/presets/default-esm",

  testEnvironment: "node",

  // Setup file chạy trước tất cả test
  globalSetup: "./src/__tests__/globalSetup.ts",
  globalTeardown: "./src/__tests__/globalTeardown.ts",

  // Xử lý `.js` imports trong ESM (backend dùng import from "./xxx.js")
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },

  // Chỉ chạy các file *.test.ts
  testMatch: ["**/src/__tests__/**/*.test.ts"],

  // Transform TypeScript
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: {
          module: "nodenext",
          target: "esnext",
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          strict: true,
          skipLibCheck: true,
          verbatimModuleSyntax: false,
          resolveJsonModule: true,
        },
      },
    ],
  },

  // Transform cả code trong src (không chỉ test)
  transformIgnorePatterns: ["node_modules/(?!.*\\.mjs$)"],

  // Timeout dài hơn cho MongoDB in-memory startup
  testTimeout: 30000,

  // Verbose output
  verbose: true,

  // Force exit sau khi test xong
  forceExit: true,
  detectOpenHandles: true,
};

export default config;

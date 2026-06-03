/**
 * setup.ts — Tạo Express app + kết nối MongoDB cho test.
 * File này KHÔNG listen port — supertest tự xử lý.
 */
import { jest } from "@jest/globals";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import http from "http";
import { MongoMemoryServer } from "mongodb-memory-server";

// ── Mock MinIO service TRƯỚC khi import routes ──
// Trong ESM, dùng jest.unstable_mockModule
jest.unstable_mockModule("../services/minioService.js", () => ({
  uploadAndCompressImage: jest.fn<() => Promise<string>>().mockResolvedValue("mock://test-image.webp"),
  uploadRawFile: jest.fn<() => Promise<string>>().mockResolvedValue("mock://test-file.pdf"),
}));

// Import routes SAU khi mock đã được đăng ký
const { default: authRoutes } = await import("../routes/authRoutes.js");
const { default: postRoutes } = await import("../routes/postRoutes.js");
const { default: conversationRoutes } = await import("../routes/conversationRoutes.js");
const { default: notificationRoutes } = await import("../routes/notificationRoutes.js");
const { default: followRoutes } = await import("../routes/followRoutes.js");
const { default: userRoutes } = await import("../routes/userRoutes.js");
const { default: searchRoutes } = await import("../routes/searchRoutes.js");
const { default: reportRoutes } = await import("../routes/reportRoutes.js");

// Socket
const { initializeSocket } = await import("../sockets/index.js");

// ── Biến module-level ──
let mongod: MongoMemoryServer;
let app: express.Express;
let server: http.Server;

/**
 * Tạo Express app instance cho test
 */
function createApp(): express.Express {
  const testApp = express();

  testApp.use(cors());
  testApp.use(express.json());
  testApp.use(express.urlencoded({ extended: true }));

  // Fake i18n middleware (trả key nguyên bản thay vì dịch)
  testApp.use((req, _res, next) => {
    (req as any).t = (key: string) => key;
    next();
  });

  // Đăng ký routes giống server.ts
  testApp.use("/api/auth", authRoutes);
  testApp.use("/api/conversations", conversationRoutes);
  testApp.use("/api/post", postRoutes);
  testApp.use("/api/notifications", notificationRoutes);
  testApp.use("/api/follow", followRoutes);
  testApp.use("/api/users", userRoutes);
  testApp.use("/api/search", searchRoutes);
  testApp.use("/api/report", reportRoutes);

  // 404 handler
  testApp.use((req: express.Request, res: express.Response) => {
    res.status(404).json({ message: "Route không tồn tại", path: req.path });
  });

  return testApp;
}

/**
 * Khởi tạo: MongoDB in-memory + Express app + Socket.IO server
 */
export async function setupTestEnvironment() {
  // Tạo MongoDB in-memory riêng cho mỗi test suite
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  await mongoose.connect(uri);

  app = createApp();
  server = http.createServer(app);

  // Khởi tạo Socket.IO trên server test
  initializeSocket(server);

  return { app, server, mongod };
}

/**
 * Cleanup: xóa tất cả collections sau mỗi test
 */
export async function clearDatabase() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key]!.deleteMany({});
  }
}

/**
 * Teardown: đóng kết nối + dừng MongoDB
 */
export async function teardownTestEnvironment() {
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
}

export { app, server };

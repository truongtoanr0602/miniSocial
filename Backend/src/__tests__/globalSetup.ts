/**
 * globalSetup.ts — Chạy MỘT LẦN trước khi bất kỳ test nào bắt đầu.
 * Khởi tạo MongoDB in-memory và lưu URI vào biến môi trường.
 */
import { MongoMemoryServer } from "mongodb-memory-server";

export default async function globalSetup() {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  // Lưu instance để teardown dùng
  (globalThis as any).__MONGOD__ = mongod;

  // Đặt biến môi trường để setup.ts (trong mỗi worker) dùng kết nối
  process.env.MONGO_TEST_URI = uri;
  process.env.JWT_SECRET = "test_jwt_secret_key_12345";
  process.env.NODE_ENV = "test";
}

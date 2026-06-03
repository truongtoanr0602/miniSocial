/**
 * notification.test.ts — Test Notification API
 */
import request from "supertest";
import type { Express } from "express";
import mongoose from "mongoose";
import Notification from "../models/Notification.js";
import {
  setupTestEnvironment,
  clearDatabase,
  teardownTestEnvironment,
} from "./setup.js";
import {
  createTestUser,
  getAuthToken,
  fakeObjectId,
} from "./helpers.js";

let app: Express;

beforeAll(async () => {
  const env = await setupTestEnvironment();
  app = env.app;
});
afterEach(async () => { await clearDatabase(); });
afterAll(async () => { await teardownTestEnvironment(); });

// Helper: tạo notification test
async function createTestNotification(recipientId: string, senderId: string, overrides: any = {}) {
  return Notification.create({
    recipient_id: new mongoose.Types.ObjectId(recipientId),
    sender_id: new mongoose.Types.ObjectId(senderId),
    type: "like",
    message: "đã thích bài viết của bạn",
    is_read: false,
    ...overrides,
  });
}

describe("GET /api/notifications", () => {
  it("Lấy danh sách thông báo → 200 + pagination", async () => {
    const user = await createTestUser();
    const sender = await createTestUser();
    const token = getAuthToken(user._id.toString());
    await createTestNotification(user._id.toString(), sender._id.toString());
    const res = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.notifications.length).toBe(1);
    expect(res.body.data.pagination).toBeDefined();
  });

  it("Lấy thông báo phân trang → page 2", async () => {
    const user = await createTestUser();
    const sender = await createTestUser();
    const token = getAuthToken(user._id.toString());
    // Tạo 3 notifications
    for (let i = 0; i < 3; i++) {
      await createTestNotification(user._id.toString(), sender._id.toString());
    }
    const res = await request(app)
      .get("/api/notifications?page=1&limit=2")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.notifications.length).toBe(2);
    expect(res.body.data.pagination.totalPages).toBe(2);
  });

  it("Không có token → 401", async () => {
    const res = await request(app).get("/api/notifications");
    expect(res.status).toBe(401);
  });

  it("Notification có populated sender info", async () => {
    const user = await createTestUser();
    const sender = await createTestUser({ display_name: "John Sender" });
    const token = getAuthToken(user._id.toString());
    await createTestNotification(user._id.toString(), sender._id.toString());
    const res = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${token}`);
    expect(res.body.data.notifications[0].sender_id.display_name).toBe("John Sender");
  });
});

describe("GET /api/notifications/unread-count", () => {
  it("Lấy số thông báo chưa đọc → 200", async () => {
    const user = await createTestUser();
    const sender = await createTestUser();
    const token = getAuthToken(user._id.toString());
    await createTestNotification(user._id.toString(), sender._id.toString());
    await createTestNotification(user._id.toString(), sender._id.toString());
    const res = await request(app)
      .get("/api/notifications/unread-count")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.unreadCount).toBe(2);
  });
});

describe("PATCH /api/notifications/:notificationId/read", () => {
  it("Đánh dấu 1 thông báo đã đọc → 200", async () => {
    const user = await createTestUser();
    const sender = await createTestUser();
    const token = getAuthToken(user._id.toString());
    const notif = await createTestNotification(user._id.toString(), sender._id.toString());
    const res = await request(app)
      .patch(`/api/notifications/${notif._id}/read`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.is_read).toBe(true);
  });

  it("Đánh dấu thông báo không tồn tại → 404", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    const res = await request(app)
      .patch(`/api/notifications/${fakeObjectId()}/read`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it("ID không hợp lệ → 400", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    const res = await request(app)
      .patch("/api/notifications/invalid-id/read")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/notifications/read-all", () => {
  it("Đánh dấu tất cả đã đọc → 200", async () => {
    const user = await createTestUser();
    const sender = await createTestUser();
    const token = getAuthToken(user._id.toString());
    await createTestNotification(user._id.toString(), sender._id.toString());
    await createTestNotification(user._id.toString(), sender._id.toString());
    const res = await request(app)
      .patch("/api/notifications/read-all")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.modifiedCount).toBe(2);
  });

  it("Unread count = 0 sau mark-all-read", async () => {
    const user = await createTestUser();
    const sender = await createTestUser();
    const token = getAuthToken(user._id.toString());
    await createTestNotification(user._id.toString(), sender._id.toString());
    await request(app)
      .patch("/api/notifications/read-all")
      .set("Authorization", `Bearer ${token}`);
    const res = await request(app)
      .get("/api/notifications/unread-count")
      .set("Authorization", `Bearer ${token}`);
    expect(res.body.data.unreadCount).toBe(0);
  });
});

describe("DELETE /api/notifications/:notificationId", () => {
  it("Xóa 1 thông báo → 200", async () => {
    const user = await createTestUser();
    const sender = await createTestUser();
    const token = getAuthToken(user._id.toString());
    const notif = await createTestNotification(user._id.toString(), sender._id.toString());
    const res = await request(app)
      .delete(`/api/notifications/${notif._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it("Xóa thông báo không tồn tại → 404", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    const res = await request(app)
      .delete(`/api/notifications/${fakeObjectId()}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it("Xóa thông báo của người khác → 404", async () => {
    const user = await createTestUser();
    const other = await createTestUser();
    const sender = await createTestUser();
    const notif = await createTestNotification(user._id.toString(), sender._id.toString());
    const otherToken = getAuthToken(other._id.toString());
    const res = await request(app)
      .delete(`/api/notifications/${notif._id}`)
      .set("Authorization", `Bearer ${otherToken}`);
    expect(res.status).toBe(404);
  });
});

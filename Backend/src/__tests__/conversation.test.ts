/**
 * conversation.test.ts — Test Chat/Messaging API
 */
import request from "supertest";
import type { Express } from "express";
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

// ═══════════════════════════════════════════
// CREATE CONVERSATION
// ═══════════════════════════════════════════
describe("POST /api/conversations/:receiverId", () => {
  it("Tạo conversation mới → 200", async () => {
    const sender = await createTestUser();
    const receiver = await createTestUser();
    const token = getAuthToken(sender._id.toString());
    const res = await request(app)
      .post(`/api/conversations/${receiver._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.participants.length).toBe(2);
  });

  it("Lấy conversation đã tồn tại (idempotent) → cùng ID", async () => {
    const sender = await createTestUser();
    const receiver = await createTestUser();
    const token = getAuthToken(sender._id.toString());
    const res1 = await request(app)
      .post(`/api/conversations/${receiver._id}`)
      .set("Authorization", `Bearer ${token}`);
    const res2 = await request(app)
      .post(`/api/conversations/${receiver._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res1.body.data._id).toBe(res2.body.data._id);
  });

  it("Không thể tạo conversation với chính mình → 400", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    const res = await request(app)
      .post(`/api/conversations/${user._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it("Receiver ID không hợp lệ → 400", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    const res = await request(app)
      .post("/api/conversations/invalid-id")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(400);
  });
});

// ═══════════════════════════════════════════
// GET CONVERSATIONS
// ═══════════════════════════════════════════
describe("GET /api/conversations", () => {
  it("Lấy danh sách conversations → 200", async () => {
    const sender = await createTestUser();
    const receiver = await createTestUser();
    const token = getAuthToken(sender._id.toString());
    await request(app)
      .post(`/api/conversations/${receiver._id}`)
      .set("Authorization", `Bearer ${token}`);
    const res = await request(app)
      .get("/api/conversations")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(1);
  });
});

// ═══════════════════════════════════════════
// SEND MESSAGE
// ═══════════════════════════════════════════
describe("POST /api/conversations/:conversationId/messages", () => {
  it("Gửi tin nhắn text → 201", async () => {
    const sender = await createTestUser();
    const receiver = await createTestUser();
    const token = getAuthToken(sender._id.toString());
    const convRes = await request(app)
      .post(`/api/conversations/${receiver._id}`)
      .set("Authorization", `Bearer ${token}`);
    const convId = convRes.body.data._id;
    const res = await request(app)
      .post(`/api/conversations/${convId}/messages`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Xin chào!", messageType: "text" });
    expect(res.status).toBe(201);
    expect(res.body.data.content).toBe("Xin chào!");
  });

  it("Gửi tin nhắn thiếu content (text) → 400", async () => {
    const sender = await createTestUser();
    const receiver = await createTestUser();
    const token = getAuthToken(sender._id.toString());
    const convRes = await request(app)
      .post(`/api/conversations/${receiver._id}`)
      .set("Authorization", `Bearer ${token}`);
    const convId = convRes.body.data._id;
    const res = await request(app)
      .post(`/api/conversations/${convId}/messages`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "", messageType: "text" });
    expect(res.status).toBe(400);
  });

  it("Gửi tin nhắn conversation không tồn tại → 404", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    const res = await request(app)
      .post(`/api/conversations/${fakeObjectId()}/messages`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Hello", messageType: "text" });
    expect(res.status).toBe(404);
  });

  it("Gửi tin nhắn không có token → 401", async () => {
    const res = await request(app)
      .post(`/api/conversations/${fakeObjectId()}/messages`)
      .send({ content: "Hello", messageType: "text" });
    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════
// GET MESSAGES
// ═══════════════════════════════════════════
describe("GET /api/conversations/:conversationId/messages", () => {
  it("Lấy tin nhắn trong conversation → 200 + pagination", async () => {
    const sender = await createTestUser();
    const receiver = await createTestUser();
    const token = getAuthToken(sender._id.toString());
    const convRes = await request(app)
      .post(`/api/conversations/${receiver._id}`)
      .set("Authorization", `Bearer ${token}`);
    const convId = convRes.body.data._id;
    await request(app)
      .post(`/api/conversations/${convId}/messages`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Tin nhắn 1", messageType: "text" });
    const res = await request(app)
      .get(`/api/conversations/${convId}/messages`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.messages.length).toBe(1);
    expect(res.body.data.pagination).toBeDefined();
  });

  it("Lấy tin nhắn conversation không phải thành viên → 404", async () => {
    const sender = await createTestUser();
    const receiver = await createTestUser();
    const stranger = await createTestUser();
    const senderToken = getAuthToken(sender._id.toString());
    const strangerToken = getAuthToken(stranger._id.toString());
    const convRes = await request(app)
      .post(`/api/conversations/${receiver._id}`)
      .set("Authorization", `Bearer ${senderToken}`);
    const convId = convRes.body.data._id;
    const res = await request(app)
      .get(`/api/conversations/${convId}/messages`)
      .set("Authorization", `Bearer ${strangerToken}`);
    expect(res.status).toBe(404);
  });
});

// ═══════════════════════════════════════════
// DELETE MESSAGE
// ═══════════════════════════════════════════
describe("DELETE /api/conversations/:conversationId/messages/:messageId", () => {
  it("Xóa tin nhắn (soft delete) → 200", async () => {
    const sender = await createTestUser();
    const receiver = await createTestUser();
    const token = getAuthToken(sender._id.toString());
    const convRes = await request(app)
      .post(`/api/conversations/${receiver._id}`)
      .set("Authorization", `Bearer ${token}`);
    const convId = convRes.body.data._id;
    const msgRes = await request(app)
      .post(`/api/conversations/${convId}/messages`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "To be deleted", messageType: "text" });
    const msgId = msgRes.body.data._id;
    const res = await request(app)
      .delete(`/api/conversations/${convId}/messages/${msgId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it("Xóa tin nhắn không tồn tại → 404", async () => {
    const sender = await createTestUser();
    const receiver = await createTestUser();
    const token = getAuthToken(sender._id.toString());
    const convRes = await request(app)
      .post(`/api/conversations/${receiver._id}`)
      .set("Authorization", `Bearer ${token}`);
    const convId = convRes.body.data._id;
    const res = await request(app)
      .delete(`/api/conversations/${convId}/messages/${fakeObjectId()}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

// ═══════════════════════════════════════════
// MARK AS READ
// ═══════════════════════════════════════════
describe("PATCH /api/conversations/:conversationId/read", () => {
  it("Mark as read → 200", async () => {
    const sender = await createTestUser();
    const receiver = await createTestUser();
    const senderToken = getAuthToken(sender._id.toString());
    const receiverToken = getAuthToken(receiver._id.toString());
    const convRes = await request(app)
      .post(`/api/conversations/${receiver._id}`)
      .set("Authorization", `Bearer ${senderToken}`);
    const convId = convRes.body.data._id;
    await request(app)
      .post(`/api/conversations/${convId}/messages`)
      .set("Authorization", `Bearer ${senderToken}`)
      .send({ content: "Đọc tin này", messageType: "text" });
    const res = await request(app)
      .patch(`/api/conversations/${convId}/read`)
      .set("Authorization", `Bearer ${receiverToken}`);
    expect(res.status).toBe(200);
  });

  it("Mark as read conversation không phải thành viên → 404", async () => {
    const sender = await createTestUser();
    const receiver = await createTestUser();
    const stranger = await createTestUser();
    const senderToken = getAuthToken(sender._id.toString());
    const strangerToken = getAuthToken(stranger._id.toString());
    const convRes = await request(app)
      .post(`/api/conversations/${receiver._id}`)
      .set("Authorization", `Bearer ${senderToken}`);
    const convId = convRes.body.data._id;
    const res = await request(app)
      .patch(`/api/conversations/${convId}/read`)
      .set("Authorization", `Bearer ${strangerToken}`);
    expect(res.status).toBe(404);
  });
});

// ═══════════════════════════════════════════
// INTEGRATION: lastMessage + unreadCount
// ═══════════════════════════════════════════
describe("Chat integration tests", () => {
  it("LastMessage cập nhật sau khi gửi tin", async () => {
    const sender = await createTestUser();
    const receiver = await createTestUser();
    const token = getAuthToken(sender._id.toString());
    const convRes = await request(app)
      .post(`/api/conversations/${receiver._id}`)
      .set("Authorization", `Bearer ${token}`);
    const convId = convRes.body.data._id;
    await request(app)
      .post(`/api/conversations/${convId}/messages`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Tin cuối cùng", messageType: "text" });
    const listRes = await request(app)
      .get("/api/conversations")
      .set("Authorization", `Bearer ${token}`);
    expect(listRes.body.data[0].lastMessage).toBeDefined();
    expect(listRes.body.data[0].lastMessage.content).toBe("Tin cuối cùng");
  });

  it("UnreadCount tăng khi nhận tin + reset sau mark-read", async () => {
    const sender = await createTestUser();
    const receiver = await createTestUser();
    const senderToken = getAuthToken(sender._id.toString());
    const receiverToken = getAuthToken(receiver._id.toString());
    const convRes = await request(app)
      .post(`/api/conversations/${receiver._id}`)
      .set("Authorization", `Bearer ${senderToken}`);
    const convId = convRes.body.data._id;
    // Gửi tin
    await request(app)
      .post(`/api/conversations/${convId}/messages`)
      .set("Authorization", `Bearer ${senderToken}`)
      .send({ content: "Tin 1", messageType: "text" });
    // Kiểm tra unread của receiver
    const listRes = await request(app)
      .get("/api/conversations")
      .set("Authorization", `Bearer ${receiverToken}`);
    expect(listRes.body.data[0].unreadCount).toBe(1);
    // Mark read
    await request(app)
      .patch(`/api/conversations/${convId}/read`)
      .set("Authorization", `Bearer ${receiverToken}`);
    // Kiểm tra lại
    const listRes2 = await request(app)
      .get("/api/conversations")
      .set("Authorization", `Bearer ${receiverToken}`);
    expect(listRes2.body.data[0].unreadCount).toBe(0);
  });
});

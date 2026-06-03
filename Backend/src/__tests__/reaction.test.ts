/**
 * reaction.test.ts — Test Like/React API
 */
import request from "supertest";
import type { Express } from "express";
import Notification from "../models/Notification.js";
import PostModel from "../models/postModel.js";
import {
  setupTestEnvironment,
  clearDatabase,
  teardownTestEnvironment,
} from "./setup.js";
import {
  createTestUser,
  getAuthToken,
  createTestPost,
  fakeObjectId,
} from "./helpers.js";

let app: Express;

beforeAll(async () => {
  const env = await setupTestEnvironment();
  app = env.app;
});
afterEach(async () => { await clearDatabase(); });
afterAll(async () => { await teardownTestEnvironment(); });

describe("POST /api/post/:postId/react", () => {
  it("Like bài viết thành công → is_liked: true", async () => {
    const user = await createTestUser();
    const author = await createTestUser();
    const post = await createTestPost(author._id.toString());
    const token = getAuthToken(user._id.toString());
    const res = await request(app)
      .post(`/api/post/${post._id}/react`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.is_liked).toBe(true);
    expect(res.body.data.likes).toBe(1);
  });

  it("Unlike bài viết (toggle) → is_liked: false", async () => {
    const user = await createTestUser();
    const post = await createTestPost(user._id.toString());
    const token = getAuthToken(user._id.toString());
    // Like
    await request(app)
      .post(`/api/post/${post._id}/react`)
      .set("Authorization", `Bearer ${token}`);
    // Unlike (toggle)
    const res = await request(app)
      .post(`/api/post/${post._id}/react`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.is_liked).toBe(false);
    expect(res.body.data.likes).toBe(0);
  });

  it("Like bài viết không tồn tại → 404", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    const res = await request(app)
      .post(`/api/post/${fakeObjectId()}/react`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it("Like bài viết ID không hợp lệ → 400", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    const res = await request(app)
      .post("/api/post/invalid-id/react")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it("Like tạo notification cho chủ bài viết", async () => {
    const author = await createTestUser();
    const liker = await createTestUser();
    const post = await createTestPost(author._id.toString());
    const token = getAuthToken(liker._id.toString());
    await request(app)
      .post(`/api/post/${post._id}/react`)
      .set("Authorization", `Bearer ${token}`);
    const notifications = await Notification.find({
      recipient_id: author._id,
      type: "like",
    });
    expect(notifications.length).toBe(1);
  });

  it("Tự like bài mình → KHÔNG tạo notification", async () => {
    const user = await createTestUser();
    const post = await createTestPost(user._id.toString());
    const token = getAuthToken(user._id.toString());
    await request(app)
      .post(`/api/post/${post._id}/react`)
      .set("Authorization", `Bearer ${token}`);
    const notifications = await Notification.find({
      recipient_id: user._id,
      type: "like",
    });
    expect(notifications.length).toBe(0);
  });

  it("Like count tăng đúng trong post stats", async () => {
    const user = await createTestUser();
    const post = await createTestPost(user._id.toString());
    const token = getAuthToken(user._id.toString());
    await request(app)
      .post(`/api/post/${post._id}/react`)
      .set("Authorization", `Bearer ${token}`);
    const updatedPost = await PostModel.findById(post._id);
    expect(updatedPost!.stats.likes).toBe(1);
  });

  it("Unlike count giảm đúng trong post stats", async () => {
    const user = await createTestUser();
    const post = await createTestPost(user._id.toString());
    const token = getAuthToken(user._id.toString());
    // Like rồi Unlike
    await request(app)
      .post(`/api/post/${post._id}/react`)
      .set("Authorization", `Bearer ${token}`);
    await request(app)
      .post(`/api/post/${post._id}/react`)
      .set("Authorization", `Bearer ${token}`);
    const updatedPost = await PostModel.findById(post._id);
    expect(updatedPost!.stats.likes).toBe(0);
  });

  it("Like không có token → 401", async () => {
    const user = await createTestUser();
    const post = await createTestPost(user._id.toString());
    const res = await request(app).post(`/api/post/${post._id}/react`);
    expect(res.status).toBe(401);
  });

  it("Like 2 lần liên tiếp = unlike", async () => {
    const user = await createTestUser();
    const post = await createTestPost(user._id.toString());
    const token = getAuthToken(user._id.toString());
    await request(app)
      .post(`/api/post/${post._id}/react`)
      .set("Authorization", `Bearer ${token}`);
    const res = await request(app)
      .post(`/api/post/${post._id}/react`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.body.data.is_liked).toBe(false);
  });
});

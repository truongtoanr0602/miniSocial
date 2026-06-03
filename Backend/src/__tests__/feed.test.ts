/**
 * feed.test.ts — Test Personal Feed API
 */
import request from "supertest";
import type { Express } from "express";
import Follow from "../models/Follows.js";
import mongoose from "mongoose";
import {
  setupTestEnvironment,
  clearDatabase,
  teardownTestEnvironment,
} from "./setup.js";
import {
  createTestUser,
  getAuthToken,
  createTestPost,
} from "./helpers.js";

let app: Express;

beforeAll(async () => {
  const env = await setupTestEnvironment();
  app = env.app;
});
afterEach(async () => { await clearDatabase(); });
afterAll(async () => { await teardownTestEnvironment(); });

// Helper: tạo accepted follow
async function createFollow(followerId: string, followingId: string) {
  await Follow.create({
    follower_id: new mongoose.Types.ObjectId(followerId),
    following_id: new mongoose.Types.ObjectId(followingId),
    status: "accepted",
  });
}

describe("GET /api/post/feed", () => {
  it("Feed cá nhân có bài của người follow → 200", async () => {
    const user = await createTestUser();
    const friend = await createTestUser();
    const token = getAuthToken(user._id.toString());
    // Follow friend
    await createFollow(user._id.toString(), friend._id.toString());
    // Friend đăng bài
    await createTestPost(friend._id.toString(), { content: "Bài của friend" });
    const res = await request(app)
      .get("/api/post/feed")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.posts.length).toBeGreaterThan(0);
  });

  it("Feed có bài của chính mình", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    await createTestPost(user._id.toString(), { content: "Bài của mình" });
    const res = await request(app)
      .get("/api/post/feed")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.posts.some((p: any) => p.content === "Bài của mình")).toBe(true);
  });

  it("Feed không có bài private", async () => {
    const user = await createTestUser();
    const friend = await createTestUser();
    const token = getAuthToken(user._id.toString());
    await createFollow(user._id.toString(), friend._id.toString());
    await createTestPost(friend._id.toString(), {
      content: "Private post",
      visibility: "private",
    });
    const res = await request(app)
      .get("/api/post/feed")
      .set("Authorization", `Bearer ${token}`);
    expect(res.body.data.posts.every((p: any) => p.visibility !== "private")).toBe(true);
  });

  it("Feed phân trang", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    // Tạo 3 bài
    for (let i = 0; i < 3; i++) {
      await createTestPost(user._id.toString(), { content: `Post ${i}` });
    }
    const res = await request(app)
      .get("/api/post/feed?page=1&limit=2")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.posts.length).toBe(2);
    expect(res.body.data.pagination.totalPages).toBe(2);
  });

  it("Feed trống (chưa follow ai) → chỉ bài của mình", async () => {
    const user = await createTestUser();
    const stranger = await createTestUser();
    const token = getAuthToken(user._id.toString());
    await createTestPost(stranger._id.toString(), { content: "Stranger post" });
    await createTestPost(user._id.toString(), { content: "My post" });
    const res = await request(app)
      .get("/api/post/feed")
      .set("Authorization", `Bearer ${token}`);
    expect(res.body.data.posts.every(
      (p: any) => p.author_id._id === user._id.toString() || p.author_id === user._id.toString()
    )).toBe(true);
  });

  it("Feed có is_liked state", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    await createTestPost(user._id.toString(), { content: "Like test" });
    const res = await request(app)
      .get("/api/post/feed")
      .set("Authorization", `Bearer ${token}`);
    expect(res.body.data.posts[0]).toHaveProperty("is_liked");
  });

  it("Feed không có token → 401", async () => {
    const res = await request(app).get("/api/post/feed");
    expect(res.status).toBe(401);
  });

  it("Feed sắp xếp mới nhất trước", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    await createTestPost(user._id.toString(), { content: "Bài cũ" });
    // Delay nhẹ để đảm bảo timestamp khác
    await new Promise((resolve) => setTimeout(resolve, 50));
    await createTestPost(user._id.toString(), { content: "Bài mới" });
    const res = await request(app)
      .get("/api/post/feed")
      .set("Authorization", `Bearer ${token}`);
    expect(res.body.data.posts[0].content).toBe("Bài mới");
  });
});

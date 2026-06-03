/**
 * user.test.ts — Test User Profile API
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
// GET MY PROFILE
// ═══════════════════════════════════════════
describe("GET /api/users/me", () => {
  it("Lấy profile chính mình → 200 + user data + posts", async () => {
    const user = await createTestUser({ display_name: "Self User" });
    const token = getAuthToken(user._id.toString());
    await createTestPost(user._id.toString());
    const res = await request(app)
      .get("/api/users/me")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.display_name).toBe("Self User");
    expect(res.body.data.posts).toBeDefined();
    expect(Array.isArray(res.body.data.posts)).toBe(true);
  });

  it("Profile không chứa password_hash", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    const res = await request(app)
      .get("/api/users/me")
      .set("Authorization", `Bearer ${token}`);
    expect(res.body.data.password_hash).toBeUndefined();
  });

  it("Profile có followersCount và followingCount", async () => {
    const user = await createTestUser();
    const follower = await createTestUser();
    const token = getAuthToken(user._id.toString());
    // Tạo follow
    await Follow.create({
      follower_id: new mongoose.Types.ObjectId(follower._id.toString()),
      following_id: new mongoose.Types.ObjectId(user._id.toString()),
      status: "accepted",
    });
    const res = await request(app)
      .get("/api/users/me")
      .set("Authorization", `Bearer ${token}`);
    expect(res.body.data.followersCount).toBe(1);
    expect(res.body.data.followingCount).toBe(0);
  });

  it("Không có token → 401", async () => {
    const res = await request(app).get("/api/users/me");
    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════
// GET OTHER USER PROFILE
// ═══════════════════════════════════════════
describe("GET /api/users/profile/:id", () => {
  it("Lấy profile user khác → 200", async () => {
    const user = await createTestUser({ display_name: "Other User" });
    const viewer = await createTestUser();
    const token = getAuthToken(viewer._id.toString());
    const res = await request(app)
      .get(`/api/users/profile/${user._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.display_name).toBe("Other User");
  });

  it("Lấy profile user không tồn tại → 404", async () => {
    const viewer = await createTestUser();
    const token = getAuthToken(viewer._id.toString());
    const res = await request(app)
      .get(`/api/users/profile/${fakeObjectId()}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

// ═══════════════════════════════════════════
// UPDATE PROFILE
// ═══════════════════════════════════════════
describe("PUT /api/users/update", () => {
  it("Cập nhật display_name → 200", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    const res = await request(app)
      .put("/api/users/update")
      .set("Authorization", `Bearer ${token}`)
      .send({ display_name: "New Name" });
    expect(res.status).toBe(200);
    expect(res.body.data.display_name).toBe("New Name");
  });

  it("Cập nhật bio → 200", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    const res = await request(app)
      .put("/api/users/update")
      .set("Authorization", `Bearer ${token}`)
      .send({ bio: "Đây là bio mới" });
    expect(res.status).toBe(200);
    expect(res.body.data.bio).toBe("Đây là bio mới");
  });

  it("Cập nhật privacy setting → 200", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    const res = await request(app)
      .put("/api/users/update")
      .set("Authorization", `Bearer ${token}`)
      .send({ privacy: "private" });
    expect(res.status).toBe(200);
    expect(res.body.data.settings.privacy).toBe("private");
  });

  it("Cập nhật language setting → 200", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    const res = await request(app)
      .put("/api/users/update")
      .set("Authorization", `Bearer ${token}`)
      .send({ language: "en" });
    expect(res.status).toBe(200);
    expect(res.body.data.settings.language).toBe("en");
  });

  it("Cập nhật profile không có token → 401", async () => {
    const res = await request(app)
      .put("/api/users/update")
      .send({ display_name: "Hack" });
    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════
// SUGGESTED USERS
// ═══════════════════════════════════════════
describe("GET /api/users/suggested", () => {
  it("Lấy suggested users → 200", async () => {
    const user = await createTestUser();
    const other1 = await createTestUser({ display_name: "Suggested 1" });
    const other2 = await createTestUser({ display_name: "Suggested 2" });
    const token = getAuthToken(user._id.toString());
    const res = await request(app)
      .get("/api/users/suggested")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });

  it("Suggested users không bao gồm chính mình", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    const res = await request(app)
      .get("/api/users/suggested")
      .set("Authorization", `Bearer ${token}`);
    const selfInList = res.body.data.find(
      (u: any) => u._id === user._id.toString()
    );
    expect(selfInList).toBeUndefined();
  });

  it("Suggested users không bao gồm người đã follow", async () => {
    const user = await createTestUser();
    const following = await createTestUser({ display_name: "Already Following" });
    const token = getAuthToken(user._id.toString());
    // Follow
    await request(app)
      .post(`/api/follow/${following._id}`)
      .set("Authorization", `Bearer ${token}`);
    // Cập nhật user.following trực tiếp (vì followController cập nhật)
    const res = await request(app)
      .get("/api/users/suggested")
      .set("Authorization", `Bearer ${token}`);
    const followedInList = res.body.data.find(
      (u: any) => u._id === following._id.toString()
    );
    expect(followedInList).toBeUndefined();
  });
});

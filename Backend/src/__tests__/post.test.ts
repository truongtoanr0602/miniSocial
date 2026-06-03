/**
 * post.test.ts — Test toàn bộ Post CRUD API
 */
import request from "supertest";
import type { Express } from "express";
import mongoose from "mongoose";
import PostModel from "../models/postModel.js";
import Reaction from "../models/Reaction.js";
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

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await teardownTestEnvironment();
});

// ═══════════════════════════════════════════
// CREATE POST
// ═══════════════════════════════════════════
describe("POST /api/post/createPost", () => {
  it("Tạo bài viết text thành công → 201", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    const res = await request(app)
      .post("/api/post/createPost")
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Xin chào mọi người! #hello" });
    expect(res.status).toBe(201);
    expect(res.body.data.content).toBe("Xin chào mọi người! #hello");
    expect(res.body.data.hashtags).toContain("#hello");
  });

  it("Tạo bài viết thiếu content và media → 400", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    const res = await request(app)
      .post("/api/post/createPost")
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "" });
    expect(res.status).toBe(400);
  });

  it("Tạo bài viết không có token → 401", async () => {
    const res = await request(app)
      .post("/api/post/createPost")
      .send({ content: "No token" });
    expect(res.status).toBe(401);
  });

  it("Tạo bài viết với hashtags được trích xuất từ content", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    const res = await request(app)
      .post("/api/post/createPost")
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Đi du lịch #travel #vietnam thật đẹp" });
    expect(res.status).toBe(201);
    expect(res.body.data.hashtags).toEqual(
      expect.arrayContaining(["#travel", "#vietnam"])
    );
  });

  it("Tạo bài viết với visibility private → 201", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    const res = await request(app)
      .post("/api/post/createPost")
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Bài viết riêng tư", visibility: "private" });
    expect(res.status).toBe(201);
    expect(res.body.data.visibility).toBe("private");
  });
});

// ═══════════════════════════════════════════
// GET POST
// ═══════════════════════════════════════════
describe("GET /api/post/explore", () => {
  it("Lấy newsfeed thành công → 200", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    await createTestPost(user._id.toString());
    const res = await request(app)
      .get("/api/post/explore")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});

describe("GET /api/post/:postId", () => {
  it("Lấy bài viết theo ID → 200", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    const post = await createTestPost(user._id.toString());
    const res = await request(app)
      .get(`/api/post/${post._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe(post._id.toString());
  });

  it("Lấy bài viết ID không hợp lệ → 400", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    const res = await request(app)
      .get("/api/post/invalid-id")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it("Lấy bài viết không tồn tại → 404", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    const res = await request(app)
      .get(`/api/post/${fakeObjectId()}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

// ═══════════════════════════════════════════
// UPDATE POST
// ═══════════════════════════════════════════
describe("PATCH /api/post/:postId", () => {
  it("Sửa bài viết thành công (chủ sở hữu) → 200", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    const post = await createTestPost(user._id.toString());
    const res = await request(app)
      .patch(`/api/post/${post._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Nội dung đã cập nhật" });
    expect(res.status).toBe(200);
    expect(res.body.data.content).toBe("Nội dung đã cập nhật");
  });

  it("Sửa bài viết không phải tác giả → 403", async () => {
    const author = await createTestUser();
    const other = await createTestUser();
    const post = await createTestPost(author._id.toString());
    const token = getAuthToken(other._id.toString());
    const res = await request(app)
      .patch(`/api/post/${post._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Hack content" });
    expect(res.status).toBe(403);
  });

  it("Sửa bài viết không tồn tại → 404", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    const res = await request(app)
      .patch(`/api/post/${fakeObjectId()}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Ghost post" });
    expect(res.status).toBe(404);
  });

  it("Sửa visibility bài viết → 200", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    const post = await createTestPost(user._id.toString());
    const res = await request(app)
      .patch(`/api/post/${post._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ visibility: "friends" });
    expect(res.status).toBe(200);
    expect(res.body.data.visibility).toBe("friends");
  });
});

// ═══════════════════════════════════════════
// DELETE POST
// ═══════════════════════════════════════════
describe("DELETE /api/post/:postId", () => {
  it("Xóa bài viết thành công → 200", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    const post = await createTestPost(user._id.toString());
    const res = await request(app)
      .delete(`/api/post/${post._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it("Xóa bài viết không phải tác giả → 403", async () => {
    const author = await createTestUser();
    const other = await createTestUser();
    const post = await createTestPost(author._id.toString());
    const token = getAuthToken(other._id.toString());
    const res = await request(app)
      .delete(`/api/post/${post._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("Xóa bài viết không tồn tại → 404", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    const res = await request(app)
      .delete(`/api/post/${fakeObjectId()}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it("Xóa bài viết cũng xóa reactions liên quan", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    const post = await createTestPost(user._id.toString());
    // Tạo 1 reaction
    await Reaction.create({
      post_id: post._id,
      user_id: user._id,
      type: "like",
    });
    // Xóa post
    await request(app)
      .delete(`/api/post/${post._id}`)
      .set("Authorization", `Bearer ${token}`);
    // Kiểm tra reaction cũng bị xóa
    const remainingReactions = await Reaction.find({ post_id: post._id });
    expect(remainingReactions.length).toBe(0);
  });
});

// ═══════════════════════════════════════════
// SHARE POST
// ═══════════════════════════════════════════
describe("POST /api/post/:postId/share", () => {
  it("Share bài viết thành công → shares +1 và tạo bài trên profile người share", async () => {
    const author = await createTestUser();
    const sharer = await createTestUser();
    const token = getAuthToken(sharer._id.toString());
    const post = await createTestPost(author._id.toString(), {
      content: "Bài gốc để share",
      media: [{ url: "posts/original.webp", type: "image" }],
    });

    const res = await request(app)
      .post(`/api/post/${post._id}/share`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.shares).toBe(1);
    expect(res.body.data.sharedPost.content).toBe("Bài gốc để share");
    expect(res.body.data.sharedPost.author_id._id).toBe(sharer._id.toString());

    const sharedPost = await PostModel.findOne({ author_id: sharer._id }).lean();
    expect(sharedPost).toBeTruthy();
    expect(sharedPost?.content).toBe("Bài gốc để share");
    expect(sharedPost?.media[0].url).toBe("posts/original.webp");
  });

  it("Share bài viết không tồn tại → 404", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    const res = await request(app)
      .post(`/api/post/${fakeObjectId()}/share`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it("Không cho share bài viết private của người khác", async () => {
    const author = await createTestUser();
    const sharer = await createTestUser();
    const token = getAuthToken(sharer._id.toString());
    const post = await createTestPost(author._id.toString(), {
      visibility: "private",
    });

    const res = await request(app)
      .post(`/api/post/${post._id}/share`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(await PostModel.countDocuments({ author_id: sharer._id })).toBe(0);
  });
});

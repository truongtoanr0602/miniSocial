/**
 * comment.test.ts — Test Comment API
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

describe("POST /api/post/:postId/comments", () => {
  it("Tạo comment thành công → 201", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    const post = await createTestPost(user._id.toString());
    const res = await request(app)
      .post(`/api/post/${post._id}/comments`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Bình luận hay quá!" });
    expect(res.status).toBe(201);
    expect(res.body.data.content).toBe("Bình luận hay quá!");
  });

  it("Tạo comment thiếu content → 400", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    const post = await createTestPost(user._id.toString());
    const res = await request(app)
      .post(`/api/post/${post._id}/comments`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "" });
    expect(res.status).toBe(400);
  });

  it("Tạo comment post không tồn tại → 404", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    const res = await request(app)
      .post(`/api/post/${fakeObjectId()}/comments`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Bình luận" });
    expect(res.status).toBe(404);
  });

  it("Tạo reply comment thành công (with parent_id) → 201", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    const post = await createTestPost(user._id.toString());
    // Tạo comment gốc
    const parentRes = await request(app)
      .post(`/api/post/${post._id}/comments`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Comment gốc" });
    const parentId = parentRes.body.data._id;
    // Reply
    const res = await request(app)
      .post(`/api/post/${post._id}/comments`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Reply nè", parent_id: parentId });
    expect(res.status).toBe(201);
    expect(res.body.data.parent_id).toBe(parentId);
  });

  it("Reply với parent_id không tồn tại → 404", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    const post = await createTestPost(user._id.toString());
    const res = await request(app)
      .post(`/api/post/${post._id}/comments`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Reply sai", parent_id: fakeObjectId() });
    expect(res.status).toBe(404);
  });

  it("Comment tạo notification cho chủ bài viết", async () => {
    const author = await createTestUser();
    const commenter = await createTestUser();
    const post = await createTestPost(author._id.toString());
    const token = getAuthToken(commenter._id.toString());
    await request(app)
      .post(`/api/post/${post._id}/comments`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Nice post!" });
    const notifications = await Notification.find({
      recipient_id: author._id,
      type: "comment",
    });
    expect(notifications.length).toBe(1);
  });

  it("Tự comment bài mình → KHÔNG tạo notification", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    const post = await createTestPost(user._id.toString());
    await request(app)
      .post(`/api/post/${post._id}/comments`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Tự reply" });
    const notifications = await Notification.find({
      recipient_id: user._id,
      type: "comment",
    });
    expect(notifications.length).toBe(0);
  });
});

describe("GET /api/post/:postId/comments", () => {
  it("Lấy danh sách comments → 200 + pagination", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    const post = await createTestPost(user._id.toString());
    await request(app)
      .post(`/api/post/${post._id}/comments`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Comment 1" });
    const res = await request(app)
      .get(`/api/post/${post._id}/comments`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.comments.length).toBeGreaterThan(0);
    expect(res.body.data.pagination).toBeDefined();
  });
});

describe("GET /api/post/:postId/comments/:commentId/replies", () => {
  it("Lấy replies của comment → 200", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    const post = await createTestPost(user._id.toString());
    const parentRes = await request(app)
      .post(`/api/post/${post._id}/comments`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Parent" });
    const parentId = parentRes.body.data._id;
    await request(app)
      .post(`/api/post/${post._id}/comments`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Reply 1", parent_id: parentId });
    const res = await request(app)
      .get(`/api/post/${post._id}/comments/${parentId}/replies`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.replies.length).toBe(1);
  });
});

describe("DELETE /api/post/:postId/comments/:commentId", () => {
  it("Xóa comment (tác giả) → 200", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    const post = await createTestPost(user._id.toString());
    const commentRes = await request(app)
      .post(`/api/post/${post._id}/comments`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "To be deleted" });
    const commentId = commentRes.body.data._id;
    const res = await request(app)
      .delete(`/api/post/${post._id}/comments/${commentId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it("Xóa comment (chủ bài viết) → 200", async () => {
    const postAuthor = await createTestUser();
    const commenter = await createTestUser();
    const post = await createTestPost(postAuthor._id.toString());
    const commenterToken = getAuthToken(commenter._id.toString());
    const commentRes = await request(app)
      .post(`/api/post/${post._id}/comments`)
      .set("Authorization", `Bearer ${commenterToken}`)
      .send({ content: "Comment bị xóa bởi chủ bài" });
    const commentId = commentRes.body.data._id;
    // Chủ bài viết xóa
    const postAuthorToken = getAuthToken(postAuthor._id.toString());
    const res = await request(app)
      .delete(`/api/post/${post._id}/comments/${commentId}`)
      .set("Authorization", `Bearer ${postAuthorToken}`);
    expect(res.status).toBe(200);
  });

  it("Xóa comment không có quyền → 403", async () => {
    const postAuthor = await createTestUser();
    const commenter = await createTestUser();
    const stranger = await createTestUser();
    const post = await createTestPost(postAuthor._id.toString());
    const commenterToken = getAuthToken(commenter._id.toString());
    const commentRes = await request(app)
      .post(`/api/post/${post._id}/comments`)
      .set("Authorization", `Bearer ${commenterToken}`)
      .send({ content: "Protected comment" });
    const commentId = commentRes.body.data._id;
    const strangerToken = getAuthToken(stranger._id.toString());
    const res = await request(app)
      .delete(`/api/post/${post._id}/comments/${commentId}`)
      .set("Authorization", `Bearer ${strangerToken}`);
    expect(res.status).toBe(403);
  });

  it("Xóa comment không tồn tại → 404", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    const post = await createTestPost(user._id.toString());
    const res = await request(app)
      .delete(`/api/post/${post._id}/comments/${fakeObjectId()}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it("Comment stats.comments giảm khi xóa", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    const post = await createTestPost(user._id.toString());
    const commentRes = await request(app)
      .post(`/api/post/${post._id}/comments`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Will be deleted" });
    const commentId = commentRes.body.data._id;
    // Xóa comment
    await request(app)
      .delete(`/api/post/${post._id}/comments/${commentId}`)
      .set("Authorization", `Bearer ${token}`);
    const updatedPost = await PostModel.findById(post._id);
    expect(updatedPost!.stats.comments).toBe(0);
  });
});

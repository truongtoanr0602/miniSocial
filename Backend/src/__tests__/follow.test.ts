/**
 * follow.test.ts — Test Follow/Block API
 */
import request from "supertest";
import type { Express } from "express";
import Follow from "../models/Follows.js";
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

// ═══════════════════════════════════════════
// FOLLOW / UNFOLLOW
// ═══════════════════════════════════════════
describe("POST /api/follow/:targetId", () => {
  it("Follow user thành công → is_following: true", async () => {
    const user = await createTestUser();
    const target = await createTestUser();
    const token = getAuthToken(user._id.toString());
    const res = await request(app)
      .post(`/api/follow/${target._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.is_following).toBe(true);
  });

  it("Unfollow toggle → is_following: false", async () => {
    const user = await createTestUser();
    const target = await createTestUser();
    const token = getAuthToken(user._id.toString());
    await request(app)
      .post(`/api/follow/${target._id}`)
      .set("Authorization", `Bearer ${token}`);
    const res = await request(app)
      .post(`/api/follow/${target._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.is_following).toBe(false);
  });

  it("Không thể follow chính mình → 400", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    const res = await request(app)
      .post(`/api/follow/${user._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it("Follow user không tồn tại → 404", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    const res = await request(app)
      .post(`/api/follow/${fakeObjectId()}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it("Follow user private → status: pending", async () => {
    const user = await createTestUser();
    const target = await createTestUser({
      settings: { privacy: "private", language: "vi", two_factor_enable: false },
    });
    const token = getAuthToken(user._id.toString());
    const res = await request(app)
      .post(`/api/follow/${target._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("pending");
  });

  it("Follow user đã bị block → 403", async () => {
    const user = await createTestUser();
    const target = await createTestUser();
    const token = getAuthToken(user._id.toString());
    // Block trước
    await request(app)
      .post(`/api/follow/block/${target._id}`)
      .set("Authorization", `Bearer ${token}`);
    // Thử follow
    const res = await request(app)
      .post(`/api/follow/${target._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("Follow ID không hợp lệ → 400", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    const res = await request(app)
      .post("/api/follow/invalid-id")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it("Follow tạo notification", async () => {
    const user = await createTestUser();
    const target = await createTestUser();
    const token = getAuthToken(user._id.toString());
    await request(app)
      .post(`/api/follow/${target._id}`)
      .set("Authorization", `Bearer ${token}`);
    const notifications = await Notification.find({
      recipient_id: target._id,
      type: "follow",
    });
    expect(notifications.length).toBe(1);
  });
});

// ═══════════════════════════════════════════
// BLOCK / UNBLOCK
// ═══════════════════════════════════════════
describe("POST /api/follow/block/:targetId", () => {
  it("Block user thành công → is_blocked: true", async () => {
    const user = await createTestUser();
    const target = await createTestUser();
    const token = getAuthToken(user._id.toString());
    const res = await request(app)
      .post(`/api/follow/block/${target._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.is_blocked).toBe(true);
  });

  it("Unblock toggle → is_blocked: false", async () => {
    const user = await createTestUser();
    const target = await createTestUser();
    const token = getAuthToken(user._id.toString());
    await request(app)
      .post(`/api/follow/block/${target._id}`)
      .set("Authorization", `Bearer ${token}`);
    const res = await request(app)
      .post(`/api/follow/block/${target._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.body.data.is_blocked).toBe(false);
  });

  it("Không thể block chính mình → 400", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    const res = await request(app)
      .post(`/api/follow/block/${user._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it("Block xóa follow 2 chiều", async () => {
    const user = await createTestUser();
    const target = await createTestUser();
    const userToken = getAuthToken(user._id.toString());
    const targetToken = getAuthToken(target._id.toString());
    // Follow lẫn nhau
    await request(app)
      .post(`/api/follow/${target._id}`)
      .set("Authorization", `Bearer ${userToken}`);
    await request(app)
      .post(`/api/follow/${user._id}`)
      .set("Authorization", `Bearer ${targetToken}`);
    // Block
    await request(app)
      .post(`/api/follow/block/${target._id}`)
      .set("Authorization", `Bearer ${userToken}`);
    // Kiểm tra follow bị xóa
    const followCount = await Follow.countDocuments({});
    expect(followCount).toBe(0);
  });
});

// ═══════════════════════════════════════════
// STATUS / LISTS
// ═══════════════════════════════════════════
describe("GET /api/follow/status/:targetId", () => {
  it("Kiểm tra follow status → 200", async () => {
    const user = await createTestUser();
    const target = await createTestUser();
    const token = getAuthToken(user._id.toString());
    await request(app)
      .post(`/api/follow/${target._id}`)
      .set("Authorization", `Bearer ${token}`);
    const res = await request(app)
      .get(`/api/follow/status/${target._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.is_following).toBe(true);
  });
});

describe("GET /api/follow/:userId/followers", () => {
  it("Lấy danh sách followers → 200", async () => {
    const user = await createTestUser();
    const follower = await createTestUser();
    const token = getAuthToken(follower._id.toString());
    await request(app)
      .post(`/api/follow/${user._id}`)
      .set("Authorization", `Bearer ${token}`);
    const res = await request(app)
      .get(`/api/follow/${user._id}/followers`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.users.length).toBe(1);
  });
});

describe("GET /api/follow/:userId/following", () => {
  it("Lấy danh sách following → 200", async () => {
    const user = await createTestUser();
    const target = await createTestUser();
    const token = getAuthToken(user._id.toString());
    await request(app)
      .post(`/api/follow/${target._id}`)
      .set("Authorization", `Bearer ${token}`);
    const res = await request(app)
      .get(`/api/follow/${user._id}/following`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.users.length).toBe(1);
  });
});

describe("GET /api/follow/:userId/counts", () => {
  it("Lấy follow counts → 200", async () => {
    const user = await createTestUser();
    const follower = await createTestUser();
    const token = getAuthToken(follower._id.toString());
    await request(app)
      .post(`/api/follow/${user._id}`)
      .set("Authorization", `Bearer ${token}`);
    const res = await request(app)
      .get(`/api/follow/${user._id}/counts`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.followers).toBe(1);
    expect(res.body.data.following).toBe(0);
  });
});

// ═══════════════════════════════════════════
// PENDING REQUESTS
// ═══════════════════════════════════════════
describe("Follow Requests (private user)", () => {
  it("Accept follow request → 200", async () => {
    const requester = await createTestUser();
    const privateUser = await createTestUser({
      settings: { privacy: "private", language: "vi", two_factor_enable: false },
    });
    const requesterToken = getAuthToken(requester._id.toString());
    const privateToken = getAuthToken(privateUser._id.toString());
    // Gửi follow request
    await request(app)
      .post(`/api/follow/${privateUser._id}`)
      .set("Authorization", `Bearer ${requesterToken}`);
    // Lấy pending requests
    const pendingRes = await request(app)
      .get("/api/follow/requests/pending")
      .set("Authorization", `Bearer ${privateToken}`);
    expect(pendingRes.body.data.requests.length).toBe(1);
    const requestId = pendingRes.body.data.requests[0].request_id;
    // Accept
    const res = await request(app)
      .patch(`/api/follow/requests/${requestId}/accept`)
      .set("Authorization", `Bearer ${privateToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("accepted");
  });

  it("Reject follow request → 200", async () => {
    const requester = await createTestUser();
    const privateUser = await createTestUser({
      settings: { privacy: "private", language: "vi", two_factor_enable: false },
    });
    const requesterToken = getAuthToken(requester._id.toString());
    const privateToken = getAuthToken(privateUser._id.toString());
    await request(app)
      .post(`/api/follow/${privateUser._id}`)
      .set("Authorization", `Bearer ${requesterToken}`);
    const pendingRes = await request(app)
      .get("/api/follow/requests/pending")
      .set("Authorization", `Bearer ${privateToken}`);
    const requestId = pendingRes.body.data.requests[0].request_id;
    const res = await request(app)
      .delete(`/api/follow/requests/${requestId}/reject`)
      .set("Authorization", `Bearer ${privateToken}`);
    expect(res.status).toBe(200);
  });

  it("Accept request không tồn tại → 404", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    const res = await request(app)
      .patch(`/api/follow/requests/${fakeObjectId()}/accept`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

/**
 * report.test.ts — Test Report API
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
  createAdminUser,
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

describe("POST /api/report", () => {
  it("Tạo report thành công → 201", async () => {
    const user = await createTestUser();
    const target = await createTestUser();
    const post = await createTestPost(target._id.toString());
    const token = getAuthToken(user._id.toString());
    const res = await request(app)
      .post("/api/report")
      .set("Authorization", `Bearer ${token}`)
      .send({
        target_type: "post",
        target_id: post._id.toString(),
        reason: "Nội dung spam",
      });
    expect(res.status).toBe(201);
    expect(res.body.data.reason).toBe("Nội dung spam");
  });

  it("Tạo report thiếu field → 400", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    const res = await request(app)
      .post("/api/report")
      .set("Authorization", `Bearer ${token}`)
      .send({ target_type: "post" }); // thiếu target_id, reason
    expect(res.status).toBe(400);
  });

  it("Tạo report trùng lặp → 400 ALREADY_REPORTED", async () => {
    const user = await createTestUser();
    const post = await createTestPost((await createTestUser())._id.toString());
    const token = getAuthToken(user._id.toString());
    await request(app)
      .post("/api/report")
      .set("Authorization", `Bearer ${token}`)
      .send({
        target_type: "post",
        target_id: post._id.toString(),
        reason: "Spam",
      });
    const res = await request(app)
      .post("/api/report")
      .set("Authorization", `Bearer ${token}`)
      .send({
        target_type: "post",
        target_id: post._id.toString(),
        reason: "Spam lần 2",
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("ALREADY_REPORTED");
  });

  it("Report target_id không hợp lệ → 400", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    const res = await request(app)
      .post("/api/report")
      .set("Authorization", `Bearer ${token}`)
      .send({
        target_type: "post",
        target_id: "invalid",
        reason: "Spam",
      });
    expect(res.status).toBe(400);
  });

  it("Report không có token → 401", async () => {
    const res = await request(app).post("/api/report").send({
      target_type: "post",
      target_id: fakeObjectId(),
      reason: "Spam",
    });
    expect(res.status).toBe(401);
  });
});

describe("GET /api/report", () => {
  it("Lấy reports (admin) → 200", async () => {
    const admin = await createAdminUser();
    const user = await createTestUser();
    const post = await createTestPost(user._id.toString());
    const userToken = getAuthToken(user._id.toString());
    const adminToken = getAuthToken(admin._id.toString());
    // Tạo report
    await request(app)
      .post("/api/report")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        target_type: "post",
        target_id: post._id.toString(),
        reason: "Spam",
      });
    const res = await request(app)
      .get("/api/report")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.reports.length).toBe(1);
    expect(res.body.data.pagination).toBeDefined();
  });

  it("Lấy reports (user thường) → 403", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    const res = await request(app)
      .get("/api/report")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("Lấy reports phân trang", async () => {
    const admin = await createAdminUser();
    const adminToken = getAuthToken(admin._id.toString());
    const res = await request(app)
      .get("/api/report?page=1&limit=5")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.pagination.limit).toBe(5);
  });
});

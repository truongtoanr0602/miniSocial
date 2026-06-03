/**
 * auth.test.ts — Test toàn bộ Authentication API
 * Bao gồm: OTP, Register, Login, Reset Password, Google Login
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
  createTestOtp,
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
// OTP — Phone
// ═══════════════════════════════════════════
describe("POST /api/auth/sendPhoneOtp", () => {
  it("Gửi OTP qua phone thành công", async () => {
    const res = await request(app)
      .post("/api/auth/sendPhoneOtp")
      .send({ phone_number: "0901234567" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("Gửi OTP thiếu phone_number → 400", async () => {
    const res = await request(app)
      .post("/api/auth/sendPhoneOtp")
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe("POST /api/auth/verifyPhoneOtp", () => {
  it("Xác thực OTP phone đúng → 200", async () => {
    await createTestOtp({ phone_number: "0901234567", otp: "123456" });
    const res = await request(app)
      .post("/api/auth/verifyPhoneOtp")
      .send({ phone_number: "0901234567", otp: "123456" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("Xác thực OTP phone sai → 400", async () => {
    await createTestOtp({ phone_number: "0901234567", otp: "123456" });
    const res = await request(app)
      .post("/api/auth/verifyPhoneOtp")
      .send({ phone_number: "0901234567", otp: "999999" });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("OTP hết hạn → 400", async () => {
    await createTestOtp({
      phone_number: "0901234567",
      otp: "123456",
      expires_at: new Date(Date.now() - 1000), // đã hết hạn
    });
    const res = await request(app)
      .post("/api/auth/verifyPhoneOtp")
      .send({ phone_number: "0901234567", otp: "123456" });
    expect(res.status).toBe(400);
  });
});

// ═══════════════════════════════════════════
// OTP — Email
// ═══════════════════════════════════════════
describe("POST /api/auth/sendEmailOtp", () => {
  it("Gửi OTP qua email thành công", async () => {
    const res = await request(app)
      .post("/api/auth/sendEmailOtp")
      .send({ email: "test@example.com" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("Gửi OTP thiếu email → 400", async () => {
    const res = await request(app)
      .post("/api/auth/sendEmailOtp")
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe("POST /api/auth/verifyEmailOtp", () => {
  it("Xác thực OTP email đúng → 200", async () => {
    await createTestOtp({ email: "test@example.com", otp: "654321" });
    const res = await request(app)
      .post("/api/auth/verifyEmailOtp")
      .send({ email: "test@example.com", otp: "654321" });
    expect(res.status).toBe(200);
  });

  it("Xác thực OTP email sai → 400", async () => {
    await createTestOtp({ email: "test@example.com", otp: "654321" });
    const res = await request(app)
      .post("/api/auth/verifyEmailOtp")
      .send({ email: "test@example.com", otp: "000000" });
    expect(res.status).toBe(400);
  });
});

// ═══════════════════════════════════════════
// REGISTER
// ═══════════════════════════════════════════
describe("POST /api/auth/register", () => {
  it("Đăng ký thành công với email + OTP → 201", async () => {
    await createTestOtp({ email: "newuser@example.com", otp: "111111" });
    const res = await request(app).post("/api/auth/register").send({
      username: "newuser",
      email: "newuser@example.com",
      password: "Password@123",
      display_name: "New User",
      otp: "111111",
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it("Đăng ký thành công với phone + OTP → 201", async () => {
    await createTestOtp({ phone_number: "0909876543", otp: "222222" });
    const res = await request(app).post("/api/auth/register").send({
      username: "phoneuser",
      phone_number: "0909876543",
      password: "Password@123",
      display_name: "Phone User",
      otp: "222222",
    });
    expect(res.status).toBe(201);
  });

  it("Đăng ký thiếu email và phone → 400 MISSING_CONTACT", async () => {
    const res = await request(app).post("/api/auth/register").send({
      username: "nocontact",
      password: "Password@123",
      otp: "111111",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("MISSING_CONTACT");
  });

  it("Đăng ký thiếu OTP → 400 MISSING_OTP", async () => {
    const res = await request(app).post("/api/auth/register").send({
      username: "nootp",
      email: "nootp@example.com",
      password: "Password@123",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("MISSING_OTP");
  });

  it("Đăng ký OTP sai → 400 INVALID_OTP", async () => {
    await createTestOtp({ email: "wrong@example.com", otp: "111111" });
    const res = await request(app).post("/api/auth/register").send({
      username: "wrongotp",
      email: "wrong@example.com",
      password: "Password@123",
      otp: "999999",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("INVALID_OTP");
  });

  it("Đăng ký trùng username → 400", async () => {
    const existingUser = await createTestUser({ username: "dupeuser" });
    await createTestOtp({ email: "dupe@example.com", otp: "111111" });
    const res = await request(app).post("/api/auth/register").send({
      username: "dupeuser",
      email: "dupe@example.com",
      password: "Password@123",
      otp: "111111",
    });
    expect(res.status).toBe(400);
  });

  it("Đăng ký trùng email → 400", async () => {
    const existingUser = await createTestUser({ email: "existing@example.com" });
    await createTestOtp({ email: "existing@example.com", otp: "111111" });
    const res = await request(app).post("/api/auth/register").send({
      username: "newunique",
      email: "existing@example.com",
      password: "Password@123",
      otp: "111111",
    });
    expect(res.status).toBe(400);
  });

  it("Đăng ký trùng phone → 400", async () => {
    const existingUser = await createTestUser({ phone_number: "0911111111" });
    await createTestOtp({ phone_number: "0911111111", otp: "111111" });
    const res = await request(app).post("/api/auth/register").send({
      username: "phonedupe",
      phone_number: "0911111111",
      password: "Password@123",
      otp: "111111",
    });
    expect(res.status).toBe(400);
  });
});

// ═══════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════
describe("POST /api/auth/login", () => {
  it("Đăng nhập thành công bằng email → 200 + token", async () => {
    await createTestUser({
      email: "login@example.com",
      password_hash: await (await import("bcryptjs")).default.hash("MyPass@123", 10),
    });
    const res = await request(app).post("/api/auth/login").send({
      account: "login@example.com",
      password: "MyPass@123",
    });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.email).toBe("login@example.com");
  });

  it("Đăng nhập thành công bằng phone → 200", async () => {
    await createTestUser({
      phone_number: "0912345678",
      password_hash: await (await import("bcryptjs")).default.hash("MyPass@123", 10),
    });
    const res = await request(app).post("/api/auth/login").send({
      account: "0912345678",
      password: "MyPass@123",
    });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
  });

  it("Đăng nhập thiếu account/password → 400", async () => {
    const res = await request(app).post("/api/auth/login").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("MISSING_CREDENTIALS");
  });

  it("Đăng nhập sai tài khoản → 401", async () => {
    const res = await request(app).post("/api/auth/login").send({
      account: "nonexist@example.com",
      password: "Password@123",
    });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("USER_NOT_FOUND");
  });

  it("Đăng nhập sai password → 401", async () => {
    await createTestUser({
      email: "correct@example.com",
      password_hash: await (await import("bcryptjs")).default.hash("CorrectPass", 10),
    });
    const res = await request(app).post("/api/auth/login").send({
      account: "correct@example.com",
      password: "WrongPass",
    });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("INVALID_PASSWORD");
  });
});

// ═══════════════════════════════════════════
// RESET PASSWORD
// ═══════════════════════════════════════════
describe("POST /api/auth/resetPassword", () => {
  it("Reset password thành công → 200", async () => {
    await createTestUser({ phone_number: "0999999999" });
    await createTestOtp({ phone_number: "0999999999", otp: "333333" });
    const res = await request(app).post("/api/auth/resetPassword").send({
      phone_number: "0999999999",
      otp: "333333",
      newPassword: "NewPass@123",
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("Reset password OTP sai → 400", async () => {
    await createTestUser({ phone_number: "0988888888" });
    await createTestOtp({ phone_number: "0988888888", otp: "333333" });
    const res = await request(app).post("/api/auth/resetPassword").send({
      phone_number: "0988888888",
      otp: "000000",
      newPassword: "NewPass@123",
    });
    expect(res.status).toBe(400);
  });

  it("Reset password user không tồn tại → 404", async () => {
    await createTestOtp({ phone_number: "0977777777", otp: "444444" });
    const res = await request(app).post("/api/auth/resetPassword").send({
      phone_number: "0977777777",
      otp: "444444",
      newPassword: "NewPass@123",
    });
    expect(res.status).toBe(404);
  });
});

// ═══════════════════════════════════════════
// GOOGLE LOGIN
// ═══════════════════════════════════════════
describe("POST /api/auth/google", () => {
  it("Google login thiếu idToken → 400", async () => {
    const res = await request(app).post("/api/auth/google").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("MISSING_ID_TOKEN");
  });
});

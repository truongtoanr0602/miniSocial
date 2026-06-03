/**
 * helpers.ts — Hàm tiện ích dùng chung trong các test files.
 */
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User from "../models/userModel.js";
import PostModel from "../models/postModel.js";
import OtpModel from "../models/otpModels.js";

const JWT_SECRET = process.env.JWT_SECRET || "test_jwt_secret_key_12345";

// ── Tạo user test ──
export async function createTestUser(overrides: Record<string, any> = {}) {
  const defaults = {
    username: `testuser_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    email: `test_${Date.now()}@example.com`,
    phone_number: `09${Date.now().toString().slice(-8)}`,
    password_hash: await bcrypt.hash("Test@1234", 10),
    display_name: "Test User",
    avatar_url: "avatars/default_profile.webp",
    bio: "",
    status: "active" as const,
    role: "user" as const,
  };

  const data = { ...defaults, ...overrides };
  const user = await User.create(data);
  return user;
}

// ── Tạo admin user ──
export async function createAdminUser(overrides: Record<string, any> = {}) {
  return createTestUser({ ...overrides, role: "admin" });
}

// ── Tạo JWT token cho user ──
export function getAuthToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "1h" });
}

// ── Tạo bài viết test ──
export async function createTestPost(
  authorId: string,
  overrides: Record<string, any> = {}
) {
  const defaults = {
    author_id: new mongoose.Types.ObjectId(authorId),
    content: "Bài viết test #hello",
    hashtags: ["#hello"],
    media: [],
    visibility: "public" as const,
    stats: { likes: 0, comments: 0, shares: 0 },
  };

  return PostModel.create({ ...defaults, ...overrides });
}

// ── Tạo OTP test (để test register/verify) ──
export async function createTestOtp(data: {
  phone_number?: string;
  email?: string;
  otp: string;
  expires_at?: Date;
}) {
  return OtpModel.create({
    ...data,
    expires_at: data.expires_at || new Date(Date.now() + 5 * 60 * 1000), // 5 phút
  });
}

// ── Helper tạo ObjectId hợp lệ nhưng không tồn tại trong DB ──
export function fakeObjectId(): string {
  return new mongoose.Types.ObjectId().toString();
}

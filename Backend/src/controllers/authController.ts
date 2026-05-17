import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import User from "../models/userModel.js";
import { successResponse, errorResponse } from "../utils/response.js";
import otpModels from "../models/otpModels.js";
import { env } from "../config/env.js";


const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ─────────────────────────────────────────────
// [POST] /api/auth/register
// ─────────────────────────────────────────────
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, phone_number, password, display_name, otp } =
      req.body;

    const existingUsername = await User.findOne({ username });

    if (!email && !phone_number) {
      errorResponse(req, res, "auth.MISSING_CONTACT", 400, "MISSING_CONTACT");
      return;
    }
    if (!otp) {
      errorResponse(req, res, "auth.MISSING_OTP", 400, "MISSING_OTP");
      return;
    }

    const query = phone_number ? { phone_number, otp } : { email, otp };
    const otpRecord = await otpModels.findOne(query);

    if (!otpRecord) {
      errorResponse(req, res, "auth.INVALID_OTP", 400, "INVALID_OTP");
      return;
    }

    if (otpRecord.expires_at.getTime() < Date.now()) {
      errorResponse(req, res, "auth.EXPIRED_OTP", 400, "EXPIRED_OTP");
      return;
    }
    const userQuery = phone_number ? { phone_number } : { email };
    const existingUser = await User.findOne(userQuery);
    if (existingUser) {
      errorResponse(
        req,
        res,
        "auth.USER_ALREADY_EXISTS",
        400,
        "USER_ALREADY_EXISTS",
      );
      return;
    }

    if (existingUsername) {
      errorResponse(
        req,
        res,
        "auth.DUPLICATE_USERNAME",
        400,
        "DUPLICATE_USERNAME",
      );
      return;
    }
    //   req: Request,       // 👈 Bổ sung req vào đây
    //   res: Response,
    //   messageKey = "common.SERVER_ERROR", // 👈 Nhận key từ file JSON
    //   status = 500,
    //   error = "SERVER_ERROR", // Mã lỗi nguyên bản (giữ nguyên để debug)

    if (email?.trim()) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        errorResponse(req, res, "auth.DUPLICATE_EMAIL", 400, "DUPLICATE_EMAIL");
        return;
      }
    }

    if (phone_number?.trim()) {
      const existingPhone = await User.findOne({ phone_number });
      if (existingPhone) {
        errorResponse(req, res, "auth.DUPLICATE_PHONE", 400, "DUPLICATE_PHONE");
        return;
      }
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const newUser = new User({
      username,
      email: email?.trim() || undefined,
      phone_number: phone_number?.trim() || undefined,
      password_hash,
      display_name: display_name || username,
      status: "active",
      created_at: new Date(),
    });

    await newUser.save();

    successResponse(req, res, null, "auth.REGISTER_SUCCESS", 201);
  } catch (error: any) {
    console.error("Error:", error);

    if (error.code === 11000) {
      errorResponse(req, res, "auth.DUPLICATE_KEY", 400, "DUPLICATE_KEY");
    } else if (error.name === "ValidationError") {
      errorResponse(req, res, "auth.VALIDATION_ERROR", 400, "VALIDATION_ERROR");
    } else {
      errorResponse(req, res, "auth.SERVER_ERROR", 500, "SERVER_ERROR");
    }
  }
};

// OTP
const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();
export const sendPhoneOtp = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { phone_number } = req.body;
    if (!phone_number) {
      errorResponse(
        req,
        res,
        "auth.MISSING_PHONE_NUMBER",
        400,
        "MISSING_PHONE_NUMBER",
      );
      return;
    }
    const otp = generateOtp();
    const expires_at = new Date(Date.now() + 5 * 60 * 1000); // OTP có hiệu lực trong 5 phút

    await otpModels.deleteMany({ phone_number }); // Xóa OTP cũ nếu tồn tại
    await otpModels.create({ phone_number, otp, expires_at });

    console.log(`[MOCK SMS] Gửi tới SĐT: ${phone_number}`);
    console.log(
      `[MOCK SMS] Nội dung: Mã xác nhận Mạng Xã Hội của bạn là: ${otp}. Mã có hiệu lực trong 3 phút.`,
    );

    successResponse(req, res, null, "auth.OTP_SENT", 200, "OTP_SENT");
  } catch (error: any) {
    console.error("Error:", error);
    errorResponse(req, res, "common.SERVER_ERROR", 500, "SERVER_ERROR");
  }
};

//QUÊN MẬT KHẨU
export const resetPassword = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { phone_number, email, otp, newPassword } = req.body;

    // 1. TÌM VÀ SO SÁNH OTP (Logic này giống hệt lúc Đăng ký)
    const query = phone_number ? { phone_number, otp } : { email, otp };
    const otpRecord = await otpModels.findOne(query);

    if (!otpRecord) {
      errorResponse(req, res, "auth.INVALID_OTP", 400, "INVALID_OTP");
      return;
    }

    if (otpRecord.expires_at.getTime() < Date.now()) {
      errorResponse(req, res, "auth.EXPIRED_OTP", 400, "EXPIRED_OTP");
      return;
    }

    // 2. NẾU OTP ĐÚNG -> TIẾN HÀNH ĐỔI MẬT KHẨU
    // Tìm user bằng số điện thoại
    const userQuery = phone_number ? { phone_number } : { email };
    const user = await User.findOne(userQuery);
    if (!user) {
      errorResponse(req, res, "auth.USER_NOT_FOUND", 404, "USER_NOT_FOUND");
      return;
    }

    // Mã hóa mật khẩu mới
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Cập nhật vào Database
    user.password_hash = hashedPassword;
    await user.save();

    // Xóa OTP cũ cho sạch DB
    await otpModels.deleteMany(phone_number ? { phone_number } : { email });

    successResponse(
      req,
      res,
      null,
      "auth.PASSWORD_RESET_SUCCESS",
      200,
      "PASSWORD_RESET_SUCCESS",
    );
  } catch (error: any) {
    console.error("Error:", error);
    errorResponse(req, res, "common.SERVER_ERROR", 500, "SERVER_ERROR");
  }
};

//XAC THUC OTP
export const verifyPhoneOtp = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { phone_number, otp } = req.body;
    const otpRecord = await otpModels.findOne({ phone_number, otp });

    if (!otpRecord) {
      errorResponse(req, res, "auth.INVALID_OTP", 400, "INVALID_OTP");
      return;
    }
    if (otpRecord.expires_at.getTime() < Date.now()) {
      errorResponse(req, res, "auth.EXPIRED_OTP", 400, "EXPIRED_OTP");
      return;
    }
    await otpModels.deleteMany({ phone_number }); // Xóa OTP sau khi xác thực thành công
    successResponse(req, res, null, "auth.OTP_VERIFIED", 200, "OTP_VERIFIED");
  } catch (error: any) {
    console.error("Error:", error);
    errorResponse(req, res, "common.SERVER_ERROR", 500, "SERVER_ERROR");
  }
};

//Xac thuc tp cho email
export const sendEmailOtp = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      errorResponse(req, res, "auth.MISSING_EMAIL", 400, "MISSING_EMAIL");
      return;
    }

    const otp = generateOtp();
    const expires_at = new Date(Date.now() + 5 * 60 * 1000); // 5 phút

    // Xóa OTP cũ và lưu OTP mới
    await otpModels.deleteMany({ email });
    await otpModels.create({ email, otp, expires_at });

    // ⚡ MOCK GỬI EMAIL
    console.log(`\n📧 =======================================`);
    console.log(`[MOCK EMAIL] Gửi tới Email: ${email}`);
    console.log(
      `[MOCK EMAIL] Nội dung: Mã khôi phục mật khẩu của bạn là: ${otp}`,
    );
    console.log(`==========================================\n`);

    successResponse(req, res, null, "auth.OTP_SENT", 200, "OTP_SENT");
  } catch (error: any) {
    console.error("Error:", error);
    errorResponse(req, res, "common.SERVER_ERROR", 500, "SERVER_ERROR");
  }
};
//XacThuc Email OTP
export const verifyEmailOtp = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { email, otp } = req.body;
    const otpRecord = await otpModels.findOne({ email, otp });

    if (!otpRecord) {
      errorResponse(req, res, "auth.INVALID_OTP", 400, "INVALID_OTP");
      return;
    }
    if (otpRecord.expires_at.getTime() < Date.now()) {
      errorResponse(req, res, "auth.EXPIRED_OTP", 400, "EXPIRED_OTP");
      return;
    }
    await otpModels.deleteMany({ email }); // Xóa OTP sau khi xác thực thành công
    successResponse(req, res, null, "auth.OTP_VERIFIED", 200, "OTP_VERIFIED");
  } catch (error: any) {
    console.error("Error:", error);
    errorResponse(req, res, "common.SERVER_ERROR", 500, "SERVER_ERROR");
  }
};

// ─────────────────────────────────────────────
// [POST] /api/auth/login
// ─────────────────────────────────────────────
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { account, password } = req.body;

    if (!account || !password) {
      errorResponse(
        req,
        res,
        "auth.MISSING_CREDENTIALS",
        400,
        "MISSING_CREDENTIALS",
      );
      return;
    }

    const user = await User.findOne({
      $or: [
        { email: account },
        { phone_number: account },
      ],
    });

    if (!user) {
      errorResponse(req, res, "auth.USER_NOT_FOUND", 401, "USER_NOT_FOUND");
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      errorResponse(req, res, "auth.INVALID_PASSWORD", 401, "INVALID_PASSWORD");
      return;
    }

    const token = jwt.sign({ userId: user._id }, env.jwtSecret, {
      expiresIn: "7d",
    });

    successResponse(
      req,
      res,
      {
        token,
        user: {
          id: user._id,
          username: user.username,
          display_name: user.display_name,
          email: user.email,
          phone_number: user.phone_number,
          avatar_url: user.avatar_url,
        },
      },
      "auth.LOGIN_SUCCESS",
      200,
      "LOGIN_SUCCESS",
    );
  } catch (error) {
    console.error("Error:", error);
    errorResponse(req, res, "auth.SERVER_ERROR", 500, "SERVER_ERROR");
  }
};

// ─────────────────────────────────────────────
// [POST] /api/auth/google
// ─────────────────────────────────────────────
export const googleLogin = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      errorResponse(req, res, "auth.MISSING_ID_TOKEN", 400, "MISSING_ID_TOKEN");
      return;
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.error("GOOGLE_CLIENT_ID chưa được cấu hình");
      errorResponse(
        req,
        res,
        "auth.SERVER_CONFIG_ERROR",
        500,
        "SERVER_CONFIG_ERROR",
      );
      return;
    }

    let ticket: any;
    try {
      ticket = await client.verifyIdToken({ idToken, audience: clientId });
    } catch (verifyError: any) {
      console.error("Token verification failed:", verifyError?.message);
      errorResponse(
        req,
        res,
        "auth.GOOGLE_TOKEN_INVALID",
        401,
        "GOOGLE_TOKEN_INVALID",
      );
      return;
    }

    const payload = ticket.getPayload();
    if (!payload?.email) {
      errorResponse(
        req,
        res,
        "auth.GOOGLE_PAYLOAD_MISSING",
        400,
        "GOOGLE_PAYLOAD_MISSING",
      );
      return;
    }

    const { email, name, picture } = payload;

    let user = await User.findOne({ email });

    if (!user) {
      const baseUsername = email.split("@")[0];
      const randomUsername = `${baseUsername}_${Math.floor(Math.random() * 10000)}`;
      const password_hash = await bcrypt.hash(
        Math.random().toString(36).slice(-10),
        10,
      );

      user = new User({
        username: randomUsername,
        email,
        password_hash,
        display_name: name || "Người dùng Google",
        avatar_url: picture || "avatars/default_profile.webp",
        status: "active",
      });

      await user.save();
    }

    const token = jwt.sign({ userId: user._id }, env.jwtSecret, {
      expiresIn: "7d",
    });

    successResponse(
      req,
      res,
      {
        token,
        user: {
          id: user._id,
          username: user.username,
          display_name: user.display_name,
          email: user.email,
          avatar_url: user.avatar_url,
        },
      },
      "auth.GOOGLE_LOGIN_SUCCESS",
      200,
      "GOOGLE_LOGIN_SUCCESS",
    );
  } catch (error: any) {
    console.error("Error:", error?.message || error);
    errorResponse(req, res, "auth.SERVER_ERROR", 500, "SERVER_ERROR");
  }
};

import type { Request, Response } from "express";
import mongoose from "mongoose";
import Report from "../models/Report.js";
import User from "../models/userModel.js";
import { successResponse, errorResponse } from "../utils/response.js";

interface AuthRequest extends Request {
  userId?: string;
}

// ──────────────────────────────────────────
// 1. Tạo báo cáo
// POST /api/report
// Body: { target_type, target_id, reason, description? }
// ──────────────────────────────────────────
export const createReport = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.userId as string;
    const { target_type, target_id, reason, description } = req.body;

    if (!target_type || !target_id || !reason) {
      errorResponse(req, res, "report.MISSING_FIELDS", 400, "MISSING_FIELDS");
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(target_id)) {
      errorResponse(req, res, "report.INVALID_TARGET_ID", 400, "INVALID_TARGET_ID");
      return;
    }

    // Kiểm tra đã report chưa
    const existing = await Report.findOne({
      reporter_id: new mongoose.Types.ObjectId(userId),
      target_id: new mongoose.Types.ObjectId(target_id),
      target_type,
    });

    if (existing) {
      errorResponse(req, res, "report.ALREADY_REPORTED", 400, "ALREADY_REPORTED");
      return;
    }

    const report = await Report.create({
      reporter_id: new mongoose.Types.ObjectId(userId),
      target_type,
      target_id: new mongoose.Types.ObjectId(target_id),
      reason,
      description: description?.trim() || "",
    });

    successResponse(req, res, report, "report.CREATED", 201, "CREATED");
  } catch (error: any) {
    console.error("Error in createReport:", error);
    errorResponse(req, res, "common.SERVER_ERROR", 500, "SERVER_ERROR");
  }
};

// ──────────────────────────────────────────
// 2. Lấy danh sách report (admin only)
// GET /api/report?page=1&limit=20
// ──────────────────────────────────────────
export const getReports = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.userId as string;

    // Kiểm tra quyền admin
    const currentUser = await User.findById(userId).select("role").lean();
    if (!currentUser || currentUser.role !== "admin") {
      errorResponse(req, res, "report.FORBIDDEN", 403, "FORBIDDEN");
      return;
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);

    const total = await Report.countDocuments();

    const reports = await Report.find()
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("reporter_id", "_id username display_name avatar_url")
      .lean();

    successResponse(
      req,
      res,
      {
        reports,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
      "report.FETCHED",
      200,
      "FETCHED",
    );
  } catch (error: any) {
    console.error("Error in getReports:", error);
    errorResponse(req, res, "common.SERVER_ERROR", 500, "SERVER_ERROR");
  }
};

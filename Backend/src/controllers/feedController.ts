import type { Request, Response } from "express";
import mongoose from "mongoose";
import PostModel from "../models/postModel.js";
import Follow from "../models/Follows.js";
import { successResponse, errorResponse } from "../utils/response.js";

interface AuthRequest extends Request {
  userId?: string;
}

// ──────────────────────────────────────────
// Personal Feed: lấy bài viết từ người đang follow + bài của chính mình
// GET /api/post/feed?page=1&limit=20
// ──────────────────────────────────────────
export const getPersonalFeed = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.userId as string;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);

    // Lấy danh sách người đang follow (status = accepted)
    const followingRecords = await Follow.find({
      follower_id: new mongoose.Types.ObjectId(userId),
      status: "accepted",
    }).select("following_id").lean();

    const followingIds = followingRecords.map((f) => f.following_id);

    // Feed = bài của người mình follow + bài của chính mình
    const authorFilter = [
      ...followingIds,
      new mongoose.Types.ObjectId(userId),
    ];

    const total = await PostModel.countDocuments({
      author_id: { $in: authorFilter },
      visibility: { $ne: "private" },
    });

    const posts = await PostModel.find({
      author_id: { $in: authorFilter },
      visibility: { $ne: "private" },
    })
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("author_id", "username display_name avatar_url")
      .lean();

    successResponse(
      req,
      res,
      {
        posts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      "post.FEED_SUCCESS",
      200,
      "FEED_SUCCESS",
    );
  } catch (error: any) {
    console.error("Error in getPersonalFeed:", error);
    errorResponse(req, res, "common.SERVER_ERROR", 500, "SERVER_ERROR");
  }
};

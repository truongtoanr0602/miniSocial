import Post from "../models/postModel.js";
import User from "../models/userModel.js";
import type { Request, Response } from "express";
import { successResponse, errorResponse } from "../utils/response.js";

export async function search(req: Request, res: Response) {
  try {
    const { q = "" } = req.query as { q?: string };
    if (!q.trim()) {
      successResponse(req, res, { users: [], posts: [] }, "search.EMPTY_QUERY", 200, "EMPTY_QUERY");
      return;
    }

    const users = await User.find({
      $or: [
        { username: { $regex: q, $options: "i" } },
        { display_name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ],
    })
      .select("username display_name email avatar_url bio followers following")
      .limit(20);

    const hashtagQuery = q.startsWith("#")
      ? q.toLowerCase()
      : `#${q.toLowerCase()}`;

    const posts = await Post.find({
      $or: [
        { content: { $regex: q, $options: "i" } },
        { hashtags: hashtagQuery },
      ],
    })
      .populate("author_id", "username display_name avatar_url")
      .sort({ created_at: -1 })
      .limit(20);

    successResponse(req, res, { users, posts }, "search.SUCCESS", 200, "SUCCESS");
  } catch (error: any) {
    console.error("Lỗi tìm kiếm:", error);
    errorResponse(req, res, "common.SERVER_ERROR", 500, "SERVER_ERROR");
  }
}

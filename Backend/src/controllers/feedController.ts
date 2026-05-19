import type { Request, Response } from "express";
import mongoose from "mongoose";
import PostModel from "../models/postModel.js";
import Follow from "../models/Follows.js";
import Reaction from "../models/Reaction.js";
import { successResponse, errorResponse } from "../utils/response.js";

interface AuthRequest extends Request {
  userId?: string;
}

export const getPersonalFeed = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.userId as string;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);

    const followingRecords = await Follow.find({
      follower_id: new mongoose.Types.ObjectId(userId),
      status: "accepted",
    })
      .select("following_id")
      .lean();

    const authorFilter = [
      ...followingRecords.map((follow) => follow.following_id),
      new mongoose.Types.ObjectId(userId),
    ];

    const query = {
      author_id: { $in: authorFilter },
      visibility: { $ne: "private" },
    };

    const total = await PostModel.countDocuments(query);
    const posts = await PostModel.find(query)
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("author_id", "username display_name avatar_url")
      .lean();

    const reactions = await Reaction.find({
      post_id: { $in: posts.map((post) => post._id) },
      user_id: new mongoose.Types.ObjectId(userId),
      type: "like",
    })
      .select("post_id")
      .lean();
    const likedPostIds = new Set(
      reactions.map((reaction) => reaction.post_id.toString()),
    );

    successResponse(
      req,
      res,
      {
        posts: posts.map((post) => ({
          ...post,
          is_liked: likedPostIds.has(post._id.toString()),
        })),
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

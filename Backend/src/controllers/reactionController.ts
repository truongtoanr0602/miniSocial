import type { Request, Response } from "express";
import mongoose from "mongoose";
import PostModel from "../models/postModel.js";
import Reaction from "../models/Reaction.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { createNotification } from "./notificationController.js";

interface AuthRequest extends Request {
  userId?: string;
}

export const reactToPost = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.userId as string;
    const { postId } = req.params as { postId: string };

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      errorResponse(req, res, "post.INVALID_ID", 400, "INVALID_ID");
      return;
    }

    const post = await PostModel.findById(postId);
    if (!post) {
      errorResponse(req, res, "post.NOT_FOUND", 404, "NOT_FOUND");
      return;
    }

    const existingReaction = await Reaction.findOne({
      post_id: new mongoose.Types.ObjectId(postId),
      user_id: new mongoose.Types.ObjectId(userId),
      type: "like",
    });

    let isLiked = false;
    if (existingReaction) {
      await Reaction.findByIdAndDelete(existingReaction._id);
      post.stats.likes = Math.max(0, post.stats.likes - 1);
    } else {
      await Reaction.create({
        post_id: new mongoose.Types.ObjectId(postId),
        user_id: new mongoose.Types.ObjectId(userId),
        type: "like",
      });
      post.stats.likes += 1;
      isLiked = true;

      const postAuthorId = post.author_id.toString();
      if (postAuthorId !== userId) {
        await createNotification({
          recipient_id: postAuthorId,
          sender_id: userId,
          type: "like",
          target_id: postId,
          message: "đã thích bài viết của bạn",
        });
      }
    }

    await post.save();

    successResponse(
      req,
      res,
      { likes: post.stats.likes, is_liked: isLiked },
      "post.REACT_SUCCESS",
      200,
      "REACT_SUCCESS",
    );
  } catch (error: any) {
    console.error("Error in reactToPost:", error);
    errorResponse(req, res, "common.SERVER_ERROR", 500, "SERVER_ERROR");
  }
};

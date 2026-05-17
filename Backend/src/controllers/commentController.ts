import type { Request, Response } from "express";
import mongoose from "mongoose";
import Comment from "../models/Comments.js";
import PostModel from "../models/postModel.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { createNotification } from "./notificationController.js";

interface AuthRequest extends Request {
  userId?: string;
}

// ──────────────────────────────────────────
// 1. Tạo comment / reply
// POST /api/post/:postId/comments
// Body: { content, parent_id? }
// ──────────────────────────────────────────
export const createComment = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.userId as string;
    const { postId } = req.params as { postId: string };
    const { content, parent_id } = req.body;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      errorResponse(req, res, "comment.INVALID_POST_ID", 400, "INVALID_POST_ID");
      return;
    }

    if (!content?.trim()) {
      errorResponse(req, res, "comment.MISSING_CONTENT", 400, "MISSING_CONTENT");
      return;
    }

    const post = await PostModel.findById(postId);
    if (!post) {
      errorResponse(req, res, "post.NOT_FOUND", 404, "POST_NOT_FOUND");
      return;
    }

    // Nếu là reply, kiểm tra parent comment tồn tại
    if (parent_id) {
      if (!mongoose.Types.ObjectId.isValid(parent_id)) {
        errorResponse(req, res, "comment.INVALID_PARENT_ID", 400, "INVALID_PARENT_ID");
        return;
      }
      const parentComment = await Comment.findById(parent_id);
      if (!parentComment || parentComment.post_id.toString() !== postId) {
        errorResponse(req, res, "comment.PARENT_NOT_FOUND", 404, "PARENT_NOT_FOUND");
        return;
      }
    }

    const comment = await Comment.create({
      post_id: new mongoose.Types.ObjectId(postId),
      author_id: new mongoose.Types.ObjectId(userId),
      parent_id: parent_id ? new mongoose.Types.ObjectId(parent_id) : null,
      content: content.trim(),
    });

    // Cập nhật số comment trên post
    await PostModel.findByIdAndUpdate(postId, {
      $inc: { "stats.comments": 1 },
    });

    // Nếu là reply, tăng replies count trên parent
    if (parent_id) {
      await Comment.findByIdAndUpdate(parent_id, {
        $inc: { "stats.replies": 1 },
      });
    }

    // Populate author info
    const populated = await comment.populate(
      "author_id",
      "_id username display_name avatar_url",
    );

    // Gửi notification cho chủ bài viết (nếu không phải tự comment bài mình)
    const postAuthorId = post.author_id.toString();
    if (postAuthorId !== userId) {
      await createNotification({
        recipient_id: postAuthorId,
        sender_id: userId,
        type: "comment",
        target_id: postId,
        message: "đã bình luận bài viết của bạn",
      });
    }

    successResponse(req, res, populated, "comment.CREATED", 201, "CREATED");
  } catch (error: any) {
    console.error("Error in createComment:", error);
    errorResponse(req, res, "common.SERVER_ERROR", 500, "SERVER_ERROR");
  }
};

// ──────────────────────────────────────────
// 2. Lấy comments theo post (phân trang)
// GET /api/post/:postId/comments?page=1&limit=20
// ──────────────────────────────────────────
export const getComments = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { postId } = req.params as { postId: string };
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      errorResponse(req, res, "comment.INVALID_POST_ID", 400, "INVALID_POST_ID");
      return;
    }

    // Chỉ lấy top-level comments (parent_id = null)
    const total = await Comment.countDocuments({
      post_id: new mongoose.Types.ObjectId(postId),
      parent_id: null,
      "stats.is_deleted": false,
    });

    const comments = await Comment.find({
      post_id: new mongoose.Types.ObjectId(postId),
      parent_id: null,
      "stats.is_deleted": false,
    })
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("author_id", "_id username display_name avatar_url")
      .lean();

    successResponse(
      req,
      res,
      {
        comments,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      "comment.FETCHED",
      200,
      "FETCHED",
    );
  } catch (error: any) {
    console.error("Error in getComments:", error);
    errorResponse(req, res, "common.SERVER_ERROR", 500, "SERVER_ERROR");
  }
};

// ──────────────────────────────────────────
// 3. Lấy replies của 1 comment
// GET /api/post/:postId/comments/:commentId/replies?page=1&limit=10
// ──────────────────────────────────────────
export const getReplies = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { commentId } = req.params as { commentId: string };
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 10);

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      errorResponse(req, res, "comment.INVALID_ID", 400, "INVALID_ID");
      return;
    }

    const total = await Comment.countDocuments({
      parent_id: new mongoose.Types.ObjectId(commentId),
      "stats.is_deleted": false,
    });

    const replies = await Comment.find({
      parent_id: new mongoose.Types.ObjectId(commentId),
      "stats.is_deleted": false,
    })
      .sort({ created_at: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("author_id", "_id username display_name avatar_url")
      .lean();

    successResponse(
      req,
      res,
      {
        replies,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
      "comment.REPLIES_FETCHED",
      200,
      "REPLIES_FETCHED",
    );
  } catch (error: any) {
    console.error("Error in getReplies:", error);
    errorResponse(req, res, "common.SERVER_ERROR", 500, "SERVER_ERROR");
  }
};

// ──────────────────────────────────────────
// 4. Xóa comment (soft delete)
// DELETE /api/post/:postId/comments/:commentId
// ──────────────────────────────────────────
export const deleteComment = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.userId as string;
    const { postId, commentId } = req.params as { postId: string; commentId: string };

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      errorResponse(req, res, "comment.INVALID_ID", 400, "INVALID_ID");
      return;
    }

    const comment = await Comment.findOne({
      _id: commentId,
      post_id: new mongoose.Types.ObjectId(postId),
    });

    if (!comment) {
      errorResponse(req, res, "comment.NOT_FOUND", 404, "NOT_FOUND");
      return;
    }

    // Chỉ tác giả comment hoặc chủ bài viết mới được xóa
    const post = await PostModel.findById(postId);
    const isCommentAuthor = comment.author_id.toString() === userId;
    const isPostAuthor = post?.author_id.toString() === userId;

    if (!isCommentAuthor && !isPostAuthor) {
      errorResponse(req, res, "comment.UNAUTHORIZED", 403, "UNAUTHORIZED");
      return;
    }

    // Soft delete
    comment.stats.is_deleted = true;
    comment.content = "[Bình luận đã bị xóa]";
    await comment.save();

    // Giảm số comment trên post
    await PostModel.findByIdAndUpdate(postId, {
      $inc: { "stats.comments": -1 },
    });

    successResponse(req, res, { commentId }, "comment.DELETED", 200, "DELETED");
  } catch (error: any) {
    console.error("Error in deleteComment:", error);
    errorResponse(req, res, "common.SERVER_ERROR", 500, "SERVER_ERROR");
  }
};

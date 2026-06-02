import type { Request, Response } from "express";
import mongoose from "mongoose";
import PostModel from "../models/postModel.js";
import Reaction from "../models/Reaction.js";
import { uploadAndCompressImage, uploadRawFile } from "../services/minioService.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { getVisibilityFilter } from "../utils/visibilityFilter.js";

function extractHashtags(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/#[a-zA-Z0-9_]+/g) || [];
  return [...new Set(matches.map((tag) => tag.toLowerCase()))];
}

function parseHashtags(value: unknown, content: string): string[] {
  if (!value) return extractHashtags(content);
  if (Array.isArray(value)) return value.map(String);
  if (typeof value !== "string") return [];

  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    return value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
}

async function addViewerState<T extends { _id: unknown }>(
  posts: T[],
  userId?: string,
) {
  if (!userId || posts.length === 0) return posts.map((post) => ({ ...post, is_liked: false }));

  const postIds = posts.map((post) => new mongoose.Types.ObjectId(String(post._id)));
  const reactions = await Reaction.find({
    post_id: { $in: postIds },
    user_id: new mongoose.Types.ObjectId(userId),
    type: "like",
  })
    .select("post_id")
    .lean();
  const likedPostIds = new Set(reactions.map((reaction) => reaction.post_id.toString()));

  return posts.map((post) => ({
    ...post,
    is_liked: likedPostIds.has(String(post._id)),
  }));
}

export const createPost = async (req: Request, res: Response): Promise<void> => {
  try {
    const { content = "", visibility = "public" } = req.body;
    const author_id = (req as any).userId;
    const mediaItems: { url: string; type: "image" | "video"; alt_text?: string }[] = [];

    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        if (file.mimetype.startsWith("video/")) {
          const url = await uploadRawFile(file.buffer, file.originalname, file.mimetype);
          mediaItems.push({ url, type: "video" });
          continue;
        }
        const url = await uploadAndCompressImage(file.buffer);
        mediaItems.push({ url, type: "image" });
      }
    }

    const trimmedContent = String(content).trim();
    if (!trimmedContent && mediaItems.length === 0) {
      errorResponse(req, res, "post.MISSING_CONTENT", 400, "MISSING_CONTENT");
      return;
    }

    const post = await PostModel.create({
      author_id,
      content: trimmedContent,
      hashtags: parseHashtags(req.body.hashtags, trimmedContent),
      media: mediaItems,
      visibility: ["public", "friends", "private"].includes(visibility) ? visibility : "public",
    });

    const populatedPost = await PostModel.findById(post._id).populate(
      "author_id",
      "username display_name avatar_url",
    );

    successResponse(req, res, populatedPost, "post.CREATED", 201, "CREATED");
  } catch (error: any) {
    console.error("Error creating post:", error);
    errorResponse(req, res, "post.CREATE_FAILED", 500, "CREATE_FAILED");
  }
};

export const sharePost = async (req: Request, res: Response): Promise<void> => {
  try {
    const { postId } = req.params as { postId: string };

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      errorResponse(req, res, "post.INVALID_ID", 400, "INVALID_ID");
      return;
    }

    const post = await PostModel.findByIdAndUpdate(
      postId,
      { $inc: { "stats.shares": 1 } },
      { new: true },
    ).select("stats");

    if (!post) {
      errorResponse(req, res, "post.NOT_FOUND", 404, "NOT_FOUND");
      return;
    }

    successResponse(
      req,
      res,
      { postId, shares: post.stats.shares },
      "post.SHARED",
      200,
      "SHARED",
    );
  } catch (error: any) {
    console.error("Error sharing post:", error);
    errorResponse(req, res, "common.SERVER_ERROR", 500, "SERVER_ERROR");
  }
};

export const repostPost = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId as string;
    const { postId } = req.params as { postId: string };
    const { content } = req.body;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      errorResponse(req, res, "post.INVALID_ID", 400, "INVALID_ID");
      return;
    }

    const originalPost = await PostModel.findByIdAndUpdate(
      postId,
      { $inc: { "stats.shares": 1 } },
      { new: true }
    );

    if (!originalPost) {
      errorResponse(req, res, "post.NOT_FOUND", 404, "NOT_FOUND");
      return;
    }

    const newPost = await PostModel.create({
      author_id: new mongoose.Types.ObjectId(userId),
      content: content?.trim() || "",
      is_repost: true,
      original_post_id: new mongoose.Types.ObjectId(postId),
      media: originalPost.media, // Copy media from original post so clients can render it
    });

    const populatedPost = await PostModel.findById(newPost._id)
      .populate("author_id", "username display_name avatar_url")
      .populate({
        path: "original_post_id",
        select: "content media author_id is_repost stats created_at visibility",
        populate: { path: "author_id", select: "_id username display_name avatar_url" }
      });

    successResponse(req, res, populatedPost, "post.REPOST_SUCCESS", 201, "REPOST_SUCCESS");
  } catch (error: any) {
    console.error("Error reposting post:", error);
    errorResponse(req, res, "common.SERVER_ERROR", 500, "SERVER_ERROR");
  }
};

export const getNewsfeed = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId as string | undefined;
    const posts = await PostModel.find({ visibility: "public" })
      .sort({ created_at: -1 })
      .populate("author_id", "username display_name avatar_url")
      .populate({
        path: "original_post_id",
        select: "content media author_id is_repost stats created_at visibility",
        populate: { path: "author_id", select: "_id username display_name avatar_url" }
      })
      .lean();

    successResponse(
      req,
      res,
      await addViewerState(posts, userId),
      "post.GET_SUCCESS",
      200,
      "GET_SUCCESS",
    );
  } catch (error: any) {
    console.error("Error fetching newsfeed:", error);
    errorResponse(req, res, "common.SERVER_ERROR", 500, "SERVER_ERROR");
  }
};

export const getPostById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId as string | undefined;
    const { postId } = req.params as { postId: string };

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      errorResponse(req, res, "post.INVALID_ID", 400, "INVALID_ID");
      return;
    }

    const post = await PostModel.findById(postId)
      .populate("author_id", "username display_name avatar_url")
      .populate({
        path: "original_post_id",
        select: "content media author_id is_repost stats created_at visibility",
        populate: { path: "author_id", select: "_id username display_name avatar_url" }
      })
      .lean();

    if (!post) {
      errorResponse(req, res, "post.NOT_FOUND", 404, "NOT_FOUND");
      return;
    }

    const authorId =
      typeof post.author_id === "object" && post.author_id
        ? String((post.author_id as any)._id)
        : String(post.author_id);
    const visibilityFilter = await getVisibilityFilter(userId, authorId);

    if (
      "visibility" in visibilityFilter &&
      visibilityFilter.visibility !== post.visibility &&
      !(
        typeof visibilityFilter.visibility === "object" &&
        visibilityFilter.visibility !== null &&
        "$in" in visibilityFilter.visibility &&
        Array.isArray((visibilityFilter.visibility as any).$in) &&
        (visibilityFilter.visibility as any).$in.includes(post.visibility)
      )
    ) {
      errorResponse(req, res, "post.NOT_FOUND", 404, "NOT_FOUND");
      return;
    }

    const [postWithViewerState] = await addViewerState([post], userId);
    successResponse(req, res, postWithViewerState, "post.GET_SUCCESS", 200, "GET_SUCCESS");
  } catch (error: any) {
    console.error("Error fetching post:", error);
    errorResponse(req, res, "common.SERVER_ERROR", 500, "SERVER_ERROR");
  }
};

export const updatePost = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId as string;
    const { postId } = req.params as { postId: string };
    const { content, visibility } = req.body;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      errorResponse(req, res, "post.INVALID_ID", 400, "INVALID_ID");
      return;
    }

    const post = await PostModel.findById(postId);
    if (!post) {
      errorResponse(req, res, "post.NOT_FOUND", 404, "NOT_FOUND");
      return;
    }

    if (post.author_id.toString() !== userId) {
      errorResponse(req, res, "post.NOT_AUTHOR", 403, "NOT_AUTHOR");
      return;
    }

    if (content !== undefined) {
      const trimmedContent = String(content).trim();
      if (!trimmedContent && post.media.length === 0) {
        errorResponse(req, res, "post.MISSING_CONTENT", 400, "MISSING_CONTENT");
        return;
      }
      post.content = trimmedContent;
      post.hashtags = extractHashtags(trimmedContent);
    }

    if (visibility && ["public", "friends", "private"].includes(visibility)) {
      post.visibility = visibility;
    }

    await post.save();
    const populatedPost = await PostModel.findById(post._id).populate(
      "author_id",
      "username display_name avatar_url",
    );

    successResponse(req, res, populatedPost, "post.UPDATED", 200, "UPDATED");
  } catch (error: any) {
    console.error("Error updating post:", error);
    errorResponse(req, res, "common.SERVER_ERROR", 500, "SERVER_ERROR");
  }
};

export const deletePost = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId as string;
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

    if (post.author_id.toString() !== userId) {
      errorResponse(req, res, "post.NOT_AUTHOR", 403, "NOT_AUTHOR");
      return;
    }

    await Promise.all([
      PostModel.findByIdAndDelete(postId),
      Reaction.deleteMany({ post_id: new mongoose.Types.ObjectId(postId) }),
    ]);

    successResponse(req, res, { postId }, "post.DELETED", 200, "DELETED");
  } catch (error: any) {
    console.error("Error deleting post:", error);
    errorResponse(req, res, "common.SERVER_ERROR", 500, "SERVER_ERROR");
  }
};

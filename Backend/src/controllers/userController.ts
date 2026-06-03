import type { Request, Response } from "express";
// Đảm bảo đường dẫn import Model khớp với project của bạn

import PostModel from "../models/postModel.js";
import User from "../models/userModel.js";
import Follow from "../models/Follows.js";
import { uploadAndCompressImage } from "../services/minioService.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { getVisibilityFilter } from "../utils/visibilityFilter.js";

// ==========================================
// 1. LẤY THÔNG TIN PROFILE & BÀI VIẾT
// ==========================================
export const getUserProfile = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params; // ID của user cần xem profile

    // Lấy thông tin user (giấu password đi)
    const user = await User.findById(id).select("-password_hash");
    if (!user) {
      errorResponse(req, res, "user.NOT_FOUND", 404, "NOT_FOUND");
      return;
    }

    // Lấy các bài viết của user này (filter theo quyền xem của viewer)
    const viewerId = (req as any).userId as string | undefined;
    const visibilityFilter = await getVisibilityFilter(viewerId, String(id));
    const posts = await PostModel.find({ author_id: id, ...visibilityFilter } as any)
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
      { user, posts },
      "user.PROFILE_FETCHED",
      200,
      "PROFILE_FETCHED",
    );
  } catch (error: any) {
    console.error("Lỗi lấy profile:", error);
    errorResponse(req, res, "common.SERVER_ERROR", 500, "SERVER_ERROR");
  }
};

// ==========================================
// 2. CẬP NHẬT THÔNG TIN & AVATAR
// ==========================================
export const updateProfile = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req as any).userId; // Lấy ID từ Token
    const {
      display_name,
      username,
      bio,
      email,
      phone_number,
      location,
      website,
      privacy,
      language,
    } = req.body;

    let avatarUrl = undefined;

    // Nếu user có gửi file ảnh lên -> Nén WebP và up lên MinIO
    if (req.file) {
      avatarUrl = await uploadAndCompressImage(req.file.buffer);
    }

    const updateData: Record<string, unknown> = {};
    if (display_name?.trim()) updateData.display_name = display_name.trim();
    if (username?.trim()) updateData.username = username.trim().toLowerCase();
    if (bio !== undefined) updateData.bio = String(bio).trim();
    if (email?.trim()) updateData.email = email.trim().toLowerCase();
    if (phone_number?.trim()) updateData.phone_number = phone_number.trim();
    if (location !== undefined) updateData.location = String(location).trim();
    if (website !== undefined) updateData.website = String(website).trim();
    if (avatarUrl) updateData.avatar_url = avatarUrl;
    if (["public", "friends", "private"].includes(privacy)) {
      updateData["settings.privacy"] = privacy;
    }
    if (language?.trim()) updateData["settings.language"] = language.trim();

    // Cập nhật vào DB
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }, // Trả về data mới sau khi update
    ).select("-password_hash");

    successResponse(req, res, updatedUser, "user.UPDATED", 200, "UPDATED");
  } catch (error: any) {
    console.error("Lỗi cập nhật profile:", error);
    errorResponse(req, res, "common.SERVER_ERROR", 500, "SERVER_ERROR");
  }
};

// ==========================================
// 3. FOLLOW / UNFOLLOW
// ==========================================
export const toggleFollow = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const currentUserId = (req as any).userId; // Người đang bấm Follow
    const { targetId } = req.params; // Người được Follow

    if (!targetId) {
      errorResponse(
        req,
        res,
        "user.MISSING_TARGET_ID",
        400,
        "MISSING_TARGET_ID",
      );
      return;
    }

    if (currentUserId === targetId) {
      errorResponse(
        req,
        res,
        "user.CANNOT_FOLLOW_SELF",
        400,
        "CANNOT_FOLLOW_SELF",
      );
      return;
    }

    const targetUser = await User.findById(targetId);
    const currentUser = await User.findById(currentUserId);

    if (!targetUser || !currentUser) {
      errorResponse(req, res, "user.NOT_FOUND", 404, "NOT_FOUND");
      return;
    }

    // Kiểm tra xem đã follow chưa bằng cách so sánh string của ObjectId
    const isFollowing = currentUser.following.some(
      (id) => id.toString() === targetId.toString(),
    );

    if (isFollowing) {
      // Nếu đã follow -> Unfollow
      await User.findByIdAndUpdate(currentUserId, {
        $pull: { following: targetId },
      });
      await User.findByIdAndUpdate(targetId, {
        $pull: { followers: currentUserId },
      });
      successResponse(req, res, null, "user.UNFOLLOWED", 200, "UNFOLLOWED");
    } else {
      // Nếu chưa follow -> Follow
      await User.findByIdAndUpdate(currentUserId, {
        $push: { following: targetId },
      });
      await User.findByIdAndUpdate(targetId, {
        $push: { followers: currentUserId },
      });
      successResponse(req, res, null, "user.FOLLOWED", 200, "FOLLOWED");
    }
  } catch (error: any) {
    console.error("Lỗi Follow:", error);
    errorResponse(req, res, "common.SERVER_ERROR", 500, "SERVER_ERROR");
  }
};

// ==========================================
// 4. GỢI Ý KẾT BẠN (Suggested Users)
// ==========================================
export const getSuggestedUsers = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const currentUserId = (req as any).userId;
    const currentUser = await User.findById(currentUserId).select("following");

    // Lấy danh sách user mà mình chưa follow (trừ chính mình)
    const excludeIds = [
      currentUserId,
      ...(currentUser?.following?.map((id) => id.toString()) || []),
    ];

    const suggestedUsers = await User.find({
      _id: { $nin: excludeIds },
      status: "active",
    })
      .select("username display_name avatar_url bio followers")
      .limit(10)
      .lean();

    // Thêm follower count cho frontend hiển thị
    const usersWithStats = suggestedUsers.map((user) => ({
      ...user,
      followerCount: user.followers?.length || 0,
    }));

    successResponse(
      req,
      res,
      usersWithStats,
      "user.SUGGESTED_USERS",
      200,
      "SUGGESTED_USERS",
    );
  } catch (error: any) {
    console.error("Lỗi lấy gợi ý kết bạn:", error);
    errorResponse(req, res, "common.SERVER_ERROR", 500, "SERVER_ERROR");
  }
};

// ==========================================
// 5. LẤY PROFILE CỦA CHÍNH MÌNH
// ==========================================
export const getMyProfile = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req as any).userId;

    const user = await User.findById(userId).select("-password_hash").lean();

    if (!user) {
      errorResponse(req, res, "user.NOT_FOUND", 404, "NOT_FOUND");
      return;
    }

    const [posts, followersCount, followingCount] = await Promise.all([
      // Lấy bài viết của user
      PostModel.find({ author_id: userId } as any)
        .sort({ created_at: -1 })
        .populate("author_id", "username display_name avatar_url")
        .populate({
          path: "original_post_id",
          select: "content media author_id is_repost stats created_at visibility",
          populate: { path: "author_id", select: "_id username display_name avatar_url" }
        })
        .lean(),
      Follow.countDocuments({ following_id: userId, status: "accepted" }),
      Follow.countDocuments({ follower_id: userId, status: "accepted" }),
    ]);

    const profileData = {
      ...user,
      postsCount: posts.length,
      followersCount,
      followingCount,
      posts,
    };

    successResponse(
      req,
      res,
      profileData,
      "user.PROFILE_FETCHED",
      200,
      "PROFILE_FETCHED",
    );
  } catch (error: any) {
    console.error("Lỗi lấy profile:", error);
    errorResponse(req, res, "common.SERVER_ERROR", 500, "SERVER_ERROR");
  }
};

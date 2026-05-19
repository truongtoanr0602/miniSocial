import type { Request, Response } from "express";
import mongoose from "mongoose";
import Follow from "../models/Follows.js";
import Block from "../models/Block.js";
import User from "../models/userModel.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { createNotification } from "./notificationController.js";

interface AuthRequest extends Request {
  userId?: string;
}

// ─────────────────────────────────────────────
// 1. Follow / Unfollow toggle
// POST /api/follow/:targetId
// ─────────────────────────────────────────────
export const toggleFollow = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.userId as string;
    const { targetId } = req.params as { targetId: string };

    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      errorResponse(req, res, "follow.INVALID_ID", 400, "INVALID_ID");
      return;
    }

    if (userId === targetId) {
      errorResponse(
        req,
        res,
        "follow.CANNOT_FOLLOW_SELF",
        400,
        "CANNOT_FOLLOW_SELF",
      );
      return;
    }

    // Kiểm tra user mục tiêu có tồn tại không
    const targetUser = await User.findById(targetId);
    if (!targetUser) {
      errorResponse(req, res, "user.NOT_FOUND", 404, "USER_NOT_FOUND");
      return;
    }

    const isBlocked = await Block.exists({
      $or: [
        {
          blocker_id: new mongoose.Types.ObjectId(userId),
          blocked_id: new mongoose.Types.ObjectId(targetId),
        },
        {
          blocker_id: new mongoose.Types.ObjectId(targetId),
          blocked_id: new mongoose.Types.ObjectId(userId),
        },
      ],
    });
    if (isBlocked) {
      errorResponse(req, res, "follow.USER_BLOCKED", 403, "USER_BLOCKED");
      return;
    }

    const existingFollow = await Follow.findOne({
      follower_id: new mongoose.Types.ObjectId(userId),
      following_id: new mongoose.Types.ObjectId(targetId),
    });

    if (existingFollow) {
      await Follow.findByIdAndDelete(existingFollow._id);
      await Promise.all([
        User.findByIdAndUpdate(userId, { $pull: { following: targetId } }),
        User.findByIdAndUpdate(targetId, { $pull: { followers: userId } }),
      ]);
      successResponse(
        req,
        res,
        { is_following: false },
        "follow.UNFOLLOW_SUCCESS",
        200,
        "UNFOLLOW_SUCCESS",
      );
    } else {
      const status =
        targetUser.settings?.privacy === "private" ? "pending" : "accepted";

      await Follow.create({
        follower_id: new mongoose.Types.ObjectId(userId),
        following_id: new mongoose.Types.ObjectId(targetId),
        status,
      });
      if (status === "accepted") {
        await Promise.all([
          User.findByIdAndUpdate(userId, {
            $addToSet: { following: targetId },
          }),
          User.findByIdAndUpdate(targetId, {
            $addToSet: { followers: userId },
          }),
        ]);
      }

      // Gửi thông báo realtime cho người được follow
      if (status === "accepted") {
        await createNotification({
          recipient_id: targetId,
          sender_id: userId,
          type: "follow",
          target_id: userId,
          message: "đã theo dõi bạn",
        });
      } else {
        await createNotification({
          recipient_id: targetId,
          sender_id: userId,
          type: "follow",
          target_id: userId,
          message: "đã gửi yêu cầu theo dõi bạn",
        });
      }

      successResponse(
        req,
        res,
        { is_following: true, status },
        "follow.FOLLOW_SUCCESS",
        200,
        "FOLLOW_SUCCESS",
      );
    }
  } catch (error: any) {
    console.error("Error in toggleFollow:", error);
    errorResponse(req, res, "common.SERVER_ERROR", 500, "SERVER_ERROR");
  }
};

// ─────────────────────────────────────────────
// 2. Block / Unblock toggle
// POST /api/follow/block/:targetId
// ─────────────────────────────────────────────
export const toggleBlock = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.userId as string;
    const { targetId } = req.params as { targetId: string };

    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      errorResponse(req, res, "follow.INVALID_ID", 400, "INVALID_ID");
      return;
    }

    if (userId === targetId) {
      errorResponse(
        req,
        res,
        "follow.CANNOT_BLOCK_SELF",
        400,
        "CANNOT_BLOCK_SELF",
      );
      return;
    }

    const existingBlock = await Block.findOne({
      blocker_id: new mongoose.Types.ObjectId(userId),
      blocked_id: new mongoose.Types.ObjectId(targetId),
    });

    if (existingBlock) {
      await Block.findByIdAndDelete(existingBlock._id);
      successResponse(
        req,
        res,
        { is_blocked: false },
        "follow.UNBLOCK_SUCCESS",
        200,
        "UNBLOCK_SUCCESS",
      );
    } else {
      await Block.create({
        blocker_id: new mongoose.Types.ObjectId(userId),
        blocked_id: new mongoose.Types.ObjectId(targetId),
      });
      // Xóa follow 2 chiều khi block
      await Follow.deleteMany({
        $or: [
          {
            follower_id: new mongoose.Types.ObjectId(userId),
            following_id: new mongoose.Types.ObjectId(targetId),
          },
          {
            follower_id: new mongoose.Types.ObjectId(targetId),
            following_id: new mongoose.Types.ObjectId(userId),
          },
        ],
      });
      await Promise.all([
        User.findByIdAndUpdate(userId, {
          $pull: { following: targetId, followers: targetId },
        }),
        User.findByIdAndUpdate(targetId, {
          $pull: { following: userId, followers: userId },
        }),
      ]);
      successResponse(
        req,
        res,
        { is_blocked: true },
        "follow.BLOCK_SUCCESS",
        200,
        "BLOCK_SUCCESS",
      );
    }
  } catch (error: any) {
    console.error("Error in toggleBlock:", error);
    errorResponse(req, res, "common.SERVER_ERROR", 500, "SERVER_ERROR");
  }
};

// ─────────────────────────────────────────────
// 3. Kiểm tra trạng thái follow giữa 2 user
// GET /api/follow/status/:targetId
// ─────────────────────────────────────────────
export const getFollowStatus = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.userId as string;
    const { targetId } = req.params as { targetId: string };

    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      errorResponse(req, res, "follow.INVALID_ID", 400, "INVALID_ID");
      return;
    }

    // Mình follow họ?
    const iFollow = await Follow.findOne({
      follower_id: new mongoose.Types.ObjectId(userId),
      following_id: new mongoose.Types.ObjectId(targetId),
    });

    // Họ follow mình?
    const theyFollowMe = await Follow.findOne({
      follower_id: new mongoose.Types.ObjectId(targetId),
      following_id: new mongoose.Types.ObjectId(userId),
    });

    // Block?
    const isBlocked = await Block.exists({
      blocker_id: new mongoose.Types.ObjectId(userId),
      blocked_id: new mongoose.Types.ObjectId(targetId),
    });

    const isBlockedBy = await Block.exists({
      blocker_id: new mongoose.Types.ObjectId(targetId),
      blocked_id: new mongoose.Types.ObjectId(userId),
    });

    successResponse(
      req,
      res,
      {
        is_following: iFollow?.status === "accepted",
        is_pending: iFollow?.status === "pending",
        is_followed_by: theyFollowMe?.status === "accepted",
        is_blocked: !!isBlocked,
        is_blocked_by: !!isBlockedBy,
      },
      "follow.STATUS_FETCHED",
      200,
      "STATUS_FETCHED",
    );
  } catch (error: any) {
    console.error("Error in getFollowStatus:", error);
    errorResponse(req, res, "common.SERVER_ERROR", 500, "SERVER_ERROR");
  }
};

// ─────────────────────────────────────────────
// 4. Lấy danh sách người theo dõi (followers) của 1 user
// GET /api/follow/:userId/followers?page=1&limit=20
// ─────────────────────────────────────────────
export const getFollowers = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { userId } = req.params as { userId: string };
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      errorResponse(req, res, "follow.INVALID_ID", 400, "INVALID_ID");
      return;
    }

    const total = await Follow.countDocuments({
      following_id: new mongoose.Types.ObjectId(userId),
      status: "accepted",
    });

    const followers = await Follow.find({
      following_id: new mongoose.Types.ObjectId(userId),
      status: "accepted",
    })
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("follower_id", "_id username display_name avatar_url bio")
      .lean();

    // Trả về danh sách user thay vì follow records
    const users = followers.map((f: any) => f.follower_id).filter(Boolean);

    successResponse(
      req,
      res,
      {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      "follow.FOLLOWERS_FETCHED",
      200,
      "FOLLOWERS_FETCHED",
    );
  } catch (error: any) {
    console.error("Error in getFollowers:", error);
    errorResponse(req, res, "common.SERVER_ERROR", 500, "SERVER_ERROR");
  }
};

// ─────────────────────────────────────────────
// 5. Lấy danh sách đang theo dõi (following) của 1 user
// GET /api/follow/:userId/following?page=1&limit=20
// ─────────────────────────────────────────────
export const getFollowing = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { userId } = req.params as { userId: string };
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      errorResponse(req, res, "follow.INVALID_ID", 400, "INVALID_ID");
      return;
    }

    const total = await Follow.countDocuments({
      follower_id: new mongoose.Types.ObjectId(userId),
      status: "accepted",
    });

    const following = await Follow.find({
      follower_id: new mongoose.Types.ObjectId(userId),
      status: "accepted",
    })
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("following_id", "_id username display_name avatar_url bio")
      .lean();

    const users = following.map((f: any) => f.following_id).filter(Boolean);

    successResponse(
      req,
      res,
      {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      "follow.FOLLOWING_FETCHED",
      200,
      "FOLLOWING_FETCHED",
    );
  } catch (error: any) {
    console.error("Error in getFollowing:", error);
    errorResponse(req, res, "common.SERVER_ERROR", 500, "SERVER_ERROR");
  }
};

// ─────────────────────────────────────────────
// 6. Lấy danh sách yêu cầu follow đang chờ (cho tài khoản private)
// GET /api/follow/requests/pending?page=1&limit=20
// ─────────────────────────────────────────────
export const getPendingRequests = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.userId as string;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);

    const total = await Follow.countDocuments({
      following_id: new mongoose.Types.ObjectId(userId),
      status: "pending",
    });

    const requests = await Follow.find({
      following_id: new mongoose.Types.ObjectId(userId),
      status: "pending",
    })
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("follower_id", "_id username display_name avatar_url bio")
      .lean();

    const users = requests.map((r: any) => ({
      request_id: r._id,
      user: r.follower_id,
      requested_at: r.created_at,
    }));

    successResponse(
      req,
      res,
      {
        requests: users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      "follow.PENDING_FETCHED",
      200,
      "PENDING_FETCHED",
    );
  } catch (error: any) {
    console.error("Error in getPendingRequests:", error);
    errorResponse(req, res, "common.SERVER_ERROR", 500, "SERVER_ERROR");
  }
};

// ─────────────────────────────────────────────
// 7. Chấp nhận yêu cầu follow
// PATCH /api/follow/requests/:requestId/accept
// ─────────────────────────────────────────────
export const acceptFollowRequest = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.userId as string;
    const { requestId } = req.params as { requestId: string };

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      errorResponse(req, res, "follow.INVALID_ID", 400, "INVALID_ID");
      return;
    }

    const followRequest = await Follow.findOne({
      _id: requestId,
      following_id: new mongoose.Types.ObjectId(userId),
      status: "pending",
    });

    if (!followRequest) {
      errorResponse(
        req,
        res,
        "follow.REQUEST_NOT_FOUND",
        404,
        "REQUEST_NOT_FOUND",
      );
      return;
    }

    followRequest.status = "accepted";
    await followRequest.save();
    await Promise.all([
      User.findByIdAndUpdate(followRequest.follower_id, {
        $addToSet: { following: followRequest.following_id },
      }),
      User.findByIdAndUpdate(followRequest.following_id, {
        $addToSet: { followers: followRequest.follower_id },
      }),
    ]);

    // Thông báo cho người gửi request biết đã được chấp nhận
    await createNotification({
      recipient_id: followRequest.follower_id.toString(),
      sender_id: userId,
      type: "follow",
      target_id: userId,
      message: "đã chấp nhận yêu cầu theo dõi của bạn",
    });

    successResponse(
      req,
      res,
      { request_id: requestId, status: "accepted" },
      "follow.REQUEST_ACCEPTED",
      200,
      "REQUEST_ACCEPTED",
    );
  } catch (error: any) {
    console.error("Error in acceptFollowRequest:", error);
    errorResponse(req, res, "common.SERVER_ERROR", 500, "SERVER_ERROR");
  }
};

// ─────────────────────────────────────────────
// 8. Từ chối yêu cầu follow
// DELETE /api/follow/requests/:requestId/reject
// ─────────────────────────────────────────────
export const rejectFollowRequest = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.userId as string;
    const { requestId } = req.params as { requestId: string };

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      errorResponse(req, res, "follow.INVALID_ID", 400, "INVALID_ID");
      return;
    }

    const followRequest = await Follow.findOneAndDelete({
      _id: requestId,
      following_id: new mongoose.Types.ObjectId(userId),
      status: "pending",
    });

    if (!followRequest) {
      errorResponse(
        req,
        res,
        "follow.REQUEST_NOT_FOUND",
        404,
        "REQUEST_NOT_FOUND",
      );
      return;
    }

    successResponse(
      req,
      res,
      { request_id: requestId },
      "follow.REQUEST_REJECTED",
      200,
      "REQUEST_REJECTED",
    );
  } catch (error: any) {
    console.error("Error in rejectFollowRequest:", error);
    errorResponse(req, res, "common.SERVER_ERROR", 500, "SERVER_ERROR");
  }
};

// ─────────────────────────────────────────────
// 9. Lấy số lượng followers / following của 1 user
// GET /api/follow/:userId/counts
// ─────────────────────────────────────────────
export const getFollowCounts = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { userId } = req.params as { userId: string };

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      errorResponse(req, res, "follow.INVALID_ID", 400, "INVALID_ID");
      return;
    }

    const [followersCount, followingCount] = await Promise.all([
      Follow.countDocuments({
        following_id: new mongoose.Types.ObjectId(userId),
        status: "accepted",
      }),
      Follow.countDocuments({
        follower_id: new mongoose.Types.ObjectId(userId),
        status: "accepted",
      }),
    ]);

    successResponse(
      req,
      res,
      { followers: followersCount, following: followingCount },
      "follow.COUNTS_FETCHED",
      200,
      "COUNTS_FETCHED",
    );
  } catch (error: any) {
    console.error("Error in getFollowCounts:", error);
    errorResponse(req, res, "common.SERVER_ERROR", 500, "SERVER_ERROR");
  }
};

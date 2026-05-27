import mongoose from "mongoose";
import Follow from "../models/Follows.js";

/**
 * Tạo MongoDB query filter cho visibility dựa trên quan hệ viewer → author.
 *
 * - Own profile:        xem tất cả (không filter visibility)
 * - Accepted follower:  xem public + friends
 * - Người khác:         chỉ xem public
 */
export async function getVisibilityFilter(
  viewerId: string | undefined,
  authorId: string,
): Promise<Record<string, unknown>> {
  // Xem profile mình → thấy tất cả
  if (viewerId && viewerId === authorId) {
    return {};
  }

  // Xem profile người khác → check follow status
  if (viewerId) {
    const follow = await Follow.findOne({
      follower_id: new mongoose.Types.ObjectId(viewerId),
      following_id: new mongoose.Types.ObjectId(authorId),
      status: "accepted",
    })
      .select("_id")
      .lean();

    if (follow) {
      // Accepted follower → xem public + friends
      return { visibility: { $in: ["public", "friends"] } };
    }
  }

  // Không follow hoặc chưa đăng nhập → chỉ xem public
  return { visibility: "public" };
}

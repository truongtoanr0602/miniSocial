import mongoose from "mongoose";
import Message from "../models/Message.js";
import { getIo, getReceiverSocketId, getConnectedUsers } from "./state.js";

// ─────────────────────────────────────────────
// Helpers dùng chung cho socket module
// ─────────────────────────────────────────────

/**
 * Khi user kết nối lại, đánh dấu `deliveredAt` cho những tin nhắn
 * đã gửi cho họ trong khi offline (deliveredAt = null).
 * Sau đó thông báo sender rằng tin đã được deliver.
 */
export async function flushPendingDeliveries(userId: string): Promise<void> {
  try {
    const io = getIo();
    const connectedUsers = getConnectedUsers();

    const result = await Message.updateMany(
      {
        receiverId: new mongoose.Types.ObjectId(userId),
        deliveredAt: null,
      },
      { $set: { deliveredAt: new Date() } },
    );

    if (result.modifiedCount > 0) {
      // Lấy danh sách tin vừa deliver để thông báo sender
      const deliveredMessages = await Message.find(
        {
          receiverId: new mongoose.Types.ObjectId(userId),
          deliveredAt: { $exists: true, $ne: null },
          readAt: null,
        },
        { conversationId: 1, senderId: 1, _id: 1 },
      ).limit(50);

      // Group theo sender để giảm số emit
      const bySender: Record<string, string[]> = {};
      for (const msg of deliveredMessages) {
        const senderId = msg.senderId.toString();
        if (!bySender[senderId]) bySender[senderId] = [];
        bySender[senderId].push(msg._id.toString());
      }

      for (const [senderId, messageIds] of Object.entries(bySender)) {
        const senderSocketId = connectedUsers[senderId];
        if (senderSocketId) {
          io.to(senderSocketId).emit("messagesDelivered", {
            receiverId: userId,
            messageIds,
          });
        }
      }
    }
  } catch (err) {
    console.error("[Socket] flushPendingDeliveries error:", err);
  }
}

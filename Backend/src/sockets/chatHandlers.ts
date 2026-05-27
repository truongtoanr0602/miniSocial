import mongoose from "mongoose";
import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";
import { getIo, getReceiverSocketId } from "./state.js";
import type {
  AuthenticatedSocket,
  ConversationPayload,
  TypingPayload,
} from "./types.js";

// ─────────────────────────────────────────────
// Chat handlers: typing, join/leave room, markAsRead
// ─────────────────────────────────────────────

/** Đăng ký tất cả event liên quan đến chat cho 1 socket */
export function registerChatHandlers(socket: AuthenticatedSocket): void {
  const userId = socket.data.userId;
  const io = getIo();

  // ── Typing ──────────────────────────────────
  socket.on("typing", (data: TypingPayload) => {
    const receiverSocketId = getReceiverSocketId(data.receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("typing", {
        senderId: userId,
        conversationId: data.conversationId,
      });
    }
  });

  socket.on("stopTyping", (data: TypingPayload) => {
    const receiverSocketId = getReceiverSocketId(data.receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("stopTyping", {
        senderId: userId,
        conversationId: data.conversationId,
      });
    }
  });

  // ── Join conversation room ───────────────────
  socket.on(
    "joinConversation",
    async (data: ConversationPayload, callback?: (ok: boolean) => void) => {
      try {
        if (!mongoose.Types.ObjectId.isValid(data.conversationId)) {
          callback?.(false);
          return;
        }

        // Kiểm tra user có quyền vào room này không
        const conv = await Conversation.findOne({
          _id: data.conversationId,
          participants: new mongoose.Types.ObjectId(userId),
        });

        if (!conv) {
          callback?.(false);
          return;
        }

        socket.join(data.conversationId);
        console.log(`[Socket] ${userId} joined room ${data.conversationId}`);
        callback?.(true);
      } catch (err) {
        console.error("[Socket] joinConversation error:", err);
        callback?.(false);
      }
    },
  );

  socket.on("leaveConversation", (data: ConversationPayload) => {
    socket.leave(data.conversationId);
  });

  // ── Mark as read ─────────────────────────────
  socket.on(
    "markAsRead",
    async (data: ConversationPayload, callback?: (ok: boolean) => void) => {
      try {
        if (!mongoose.Types.ObjectId.isValid(data.conversationId)) {
          callback?.(false);
          return;
        }

        const conversation = await Conversation.findOne({
          _id: data.conversationId,
          participants: new mongoose.Types.ObjectId(userId),
        });

        if (!conversation) {
          callback?.(false);
          return;
        }

        const now = new Date();

        // Đánh dấu đã đọc tất cả tin chưa đọc của mình
        await Message.updateMany(
          {
            conversationId: data.conversationId,
            receiverId: new mongoose.Types.ObjectId(userId),
            readAt: null,
          },
          { $set: { readAt: now } },
        );

        // Reset unread counter
        await Conversation.findByIdAndUpdate(data.conversationId, {
          $set: { [`unreadCount.${userId}`]: 0 },
        });

        // Thông báo cho đối phương biết tin đã được đọc
        const partnerId = conversation.participants
          .find((p) => p.toString() !== userId)
          ?.toString();

        if (partnerId) {
          const partnerSocketId = getReceiverSocketId(partnerId);
          if (partnerSocketId) {
            io.to(partnerSocketId).emit("messagesRead", {
              conversationId: data.conversationId,
              readBy: userId,
              readAt: now,
            });
          }
        }

        callback?.(true);
      } catch (err) {
        console.error("[Socket] markAsRead error:", err);
        callback?.(false);
      }
    },
  );
}

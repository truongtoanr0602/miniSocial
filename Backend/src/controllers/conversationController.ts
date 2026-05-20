import type { Request, Response } from "express";
import mongoose from "mongoose";
import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";
import { uploadAndCompressImage, uploadRawFile } from "../services/minioService.js";
import { getReceiverSocketId, getIo } from "../sockets/state.js";
import { successResponse, errorResponse } from "../utils/response.js";

interface AuthRequest extends Request {
  userId?: string;
}

// ─────────────────────────────────────────────
// 1. Lấy danh sách cuộc trò chuyện của user
// GET /conversations
// ─────────────────────────────────────────────
export const getConversations = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.userId as string;

    const conversations = await Conversation.find({
      participants: new mongoose.Types.ObjectId(userId),
    })
      .sort({ updatedAt: -1 })
      .populate("participants", "_id username display_name avatar_url")
      .populate({
        path: "lastMessage",
        select:
          "_id content messageType mediaUrl sender createdAt readAt deliveredAt",
      });

    // Ẩn bản thân khỏi danh sách participants để FE dễ dùng
    const result = await Promise.all(conversations.map(async (conv: any) => {
      const other = (conv.participants as any[]).find(
        (p) => p._id.toString() !== userId,
      );
      const unreadCount = await Message.countDocuments({
        conversationId: conv._id,
        receiver: new mongoose.Types.ObjectId(userId),
        readAt: null,
        deletedBy: { $ne: new mongoose.Types.ObjectId(userId) },
      });

      return {
        _id: conv._id,
        partner: other ?? null,
        lastMessage: conv.lastMessage,
        unreadCount,
        updatedAt: conv.updatedAt,
      };
    }));

    successResponse(
      req,
      res,
      result,
      "chat.GET_CONVERSATIONS_SUCCESS",
      200,
      "GET_CONVERSATIONS_SUCCESS",
    );
  } catch (error) {
    console.error("Error in getConversations:", error);
    errorResponse(req, res, "common.SERVER_ERROR", 500, "SERVER_ERROR");
  }
};

// ─────────────────────────────────────────────
// 2. Tạo hoặc lấy cuộc trò chuyện với 1 user
// POST /conversations/:receiverId
// ─────────────────────────────────────────────
export const createConversation = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const senderId = req.userId as string;
    const { receiverId } = req.params as { receiverId: string };

    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      errorResponse(
        req,
        res,
        "chat.INVALID_RECEIVER_ID",
        400,
        "INVALID_RECEIVER_ID",
      );
      return;
    }

    if (senderId === receiverId) {
      errorResponse(
        req,
        res,
        "chat.CANNOT_CHAT_YOURSELF",
        400,
        "CANNOT_CHAT_YOURSELF",
      );
      return;
    }

    const senderOId = new mongoose.Types.ObjectId(senderId);
    const receiverOId = new mongoose.Types.ObjectId(receiverId);

    // Tìm conversation đã tồn tại giữa 2 người
    let conversation = await Conversation.findOne({
      participants: { $all: [senderOId, receiverOId], $size: 2 },
    })
      .populate("participants", "_id username display_name avatar_url")
      .populate("lastMessage");

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderOId, receiverOId],
        unreadCount: {
          [senderId]: 0,
          [receiverId]: 0,
        },
      });

      conversation = await conversation.populate(
        "participants",
        "_id username display_name avatar_url",
      );
    }

    successResponse(
      req,
      res,
      conversation,
      "chat.CONVERSATION_READY",
      200,
      "CONVERSATION_READY",
    );
  } catch (error) {
    console.error("Error in createConversation:", error);
    errorResponse(req, res, "common.SERVER_ERROR", 500, "SERVER_ERROR");
  }
};

// ─────────────────────────────────────────────
// 3. Lấy tin nhắn trong 1 cuộc trò chuyện (phân trang)
// GET /conversations/:conversationId/messages?page=1&limit=30
// ─────────────────────────────────────────────
export const getMessages = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.userId as string;
    const { conversationId } = req.params as { conversationId: string };
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 30);

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      errorResponse(
        req,
        res,
        "chat.INVALID_CONVERSATION_ID",
        400,
        "INVALID_CONVERSATION_ID",
      );
      return;
    }

    // Kiểm tra user có trong conversation không
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: new mongoose.Types.ObjectId(userId),
    });

    if (!conversation) {
      errorResponse(
        req,
        res,
        "chat.CONVERSATION_NOT_FOUND",
        404,
        "CONVERSATION_NOT_FOUND",
      );
      return;
    }

    const total = await Message.countDocuments({
      conversationId,
      deletedBy: { $ne: new mongoose.Types.ObjectId(userId) }, // Lọc tin đã xoá phía mình
    });

    const messages = await Message.find({
      conversationId,
      deletedBy: { $ne: new mongoose.Types.ObjectId(userId) },
    })
      .sort({ createdAt: -1 }) // Mới nhất lên đầu để phân trang dễ
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("sender", "_id username display_name avatar_url");

    successResponse(
      req,
      res,
      {
        messages: messages.reverse(), // Trả về theo thứ tự cũ → mới cho FE
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      "chat.GET_MESSAGES_SUCCESS",
      200,
      "GET_MESSAGES_SUCCESS",
    );
  } catch (error) {
    console.error("Error in getMessages:", error);
    errorResponse(req, res, "common.SERVER_ERROR", 500, "SERVER_ERROR");
  }
};

// ─────────────────────────────────────────────
// 4. Gửi tin nhắn (text / image / file)
// POST /conversations/:conversationId/messages
// Body: { content?, mediaUrl?, messageType }
// ─────────────────────────────────────────────
export const sendMessage = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const senderId = req.userId as string;
    const { conversationId } = req.params as { conversationId: string };
    const uploadedFile = (req as any).file as Express.Multer.File | undefined;
    let { content = "", messageType = "text", mediaUrl } = req.body;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      errorResponse(
        req,
        res,
        "chat.INVALID_CONVERSATION_ID",
        400,
        "INVALID_CONVERSATION_ID",
      );
      return;
    }

    if (uploadedFile) {
      const isImage = uploadedFile.mimetype.startsWith("image/");
      messageType = isImage ? "image" : "file";
      mediaUrl = isImage
        ? await uploadAndCompressImage(uploadedFile.buffer)
        : await uploadRawFile(
            uploadedFile.buffer,
            uploadedFile.originalname,
            uploadedFile.mimetype,
          );
      if (!content?.trim()) {
        content = uploadedFile.originalname;
      }
    }

    if (!["text", "image", "file"].includes(messageType)) {
      errorResponse(req, res, "chat.INVALID_MESSAGE_TYPE", 400, "INVALID_MESSAGE_TYPE");
      return;
    }

    // Validate nội dung theo loại tin
    if (messageType === "text" && !content?.trim()) {
      errorResponse(req, res, "chat.MISSING_CONTENT", 400, "MISSING_CONTENT");
      return;
    }
    if ((messageType === "image" || messageType === "file") && !mediaUrl) {
      errorResponse(
        req,
        res,
        "chat.MISSING_MEDIA_URL",
        400,
        "MISSING_MEDIA_URL",
      );
      return;
    }

    // Tìm conversation và xác nhận sender là thành viên
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: new mongoose.Types.ObjectId(senderId),
    });

    if (!conversation) {
      errorResponse(
        req,
        res,
        "chat.CONVERSATION_NOT_FOUND",
        404,
        "CONVERSATION_NOT_FOUND",
      );
      return;
    }

    // Xác định receiver (người còn lại trong conversation)
    const receiverId = conversation.participants
      .find((p) => p.toString() !== senderId)
      ?.toString();

    if (!receiverId) {
      errorResponse(
        req,
        res,
        "chat.RECEIVER_NOT_FOUND",
        404,
        "RECEIVER_NOT_FOUND",
      );
      return;
    }

    // Tạo tin nhắn mới
    const messageData: Record<string, unknown> = {
      conversationId,
      sender: new mongoose.Types.ObjectId(senderId),
      receiver: new mongoose.Types.ObjectId(receiverId),
      messageType,
      content: content?.trim() ?? "",
      deliveredAt: null,
      readAt: null,
    };
    if (mediaUrl) {
      messageData.mediaUrl = mediaUrl;
    }

    const newMessage = await Message.create(messageData);

    // Cập nhật lastMessage + tăng unreadCount cho receiver
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: newMessage._id,
      $inc: { [`unreadCount.${receiverId}`]: 1 },
      updatedAt: new Date(),
    });

    const populated = await newMessage.populate(
      "sender",
      "_id username display_name avatar_url",
    );

    // Phát socket realtime cho receiver nếu đang online
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      getIo().to(receiverSocketId).emit("newMessage", {
        conversationId,
        message: populated,
      });

      // Đánh dấu delivered ngay khi biết receiver đang online
      await Message.findByIdAndUpdate(newMessage._id, {
        deliveredAt: new Date(),
      });
    }

    successResponse(
      req,
      res,
      populated,
      "chat.SEND_SUCCESS",
      201,
      "SEND_SUCCESS",
    );
  } catch (error) {
    console.error("Error in sendMessage:", error);
    errorResponse(req, res, "common.SERVER_ERROR", 500, "SERVER_ERROR");
  }
};

// ─────────────────────────────────────────────
// 5. Xoá tin nhắn (xoá phía mình, không xoá của đối phương)
// DELETE /conversations/:conversationId/messages/:messageId
// ─────────────────────────────────────────────
export const deleteMessage = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.userId as string;
    const { conversationId, messageId } = req.params as {
      conversationId: string;
      messageId: string;
    };

    if (
      !mongoose.Types.ObjectId.isValid(conversationId) ||
      !mongoose.Types.ObjectId.isValid(messageId)
    ) {
      errorResponse(req, res, "chat.INVALID_ID", 400, "INVALID_ID");
      return;
    }

    const message = await Message.findOne({ _id: messageId, conversationId });

    if (!message) {
      errorResponse(
        req,
        res,
        "chat.MESSAGE_NOT_FOUND",
        404,
        "MESSAGE_NOT_FOUND",
      );
      return;
    }

    // Chỉ sender mới được xoá cứng (xoá hoàn toàn); người nhận chỉ xoá phía mình
    const userOId = new mongoose.Types.ObjectId(userId);

    if (message.deletedBy?.toString() === userId) {
      errorResponse(req, res, "chat.ALREADY_DELETED", 400, "ALREADY_DELETED");
      return;
    }

    await Message.findByIdAndUpdate(messageId, { deletedBy: userOId });

    // Nếu đây là tin nhắn cuối cùng → cập nhật lại lastMessage cho conversation
    const conversation = await Conversation.findById(conversationId);
    if (conversation?.lastMessage?.toString() === messageId) {
      const prevMessage = await Message.findOne({
        conversationId,
        _id: { $ne: messageId },
        deletedBy: { $ne: userOId },
      }).sort({ createdAt: -1 });

      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: prevMessage?._id ?? null,
      });
    }

    // Thông báo realtime cho đối phương (nếu cần ẩn tin nhắn ở phía họ)
    const receiverId = conversation?.participants
      .find((p) => p.toString() !== userId)
      ?.toString();

    if (receiverId) {
      const receiverSocketId = getReceiverSocketId(receiverId);
      if (receiverSocketId) {
        getIo()
          .to(receiverSocketId)
          .emit("messageDeleted", { conversationId, messageId });
      }
    }

    successResponse(
      req,
      res,
      { messageId },
      "chat.DELETE_SUCCESS",
      200,
      "DELETE_SUCCESS",
    );
  } catch (error) {
    console.error("Error in deleteMessage:", error);
    errorResponse(req, res, "common.SERVER_ERROR", 500, "SERVER_ERROR");
  }
};

// ─────────────────────────────────────────────
// 6. Đánh dấu đã đọc tất cả tin nhắn trong conversation
// PATCH /conversations/:conversationId/read
// ─────────────────────────────────────────────
export const markAsRead = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.userId as string;
    const { conversationId } = req.params as { conversationId: string };

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      errorResponse(
        req,
        res,
        "chat.INVALID_CONVERSATION_ID",
        400,
        "INVALID_CONVERSATION_ID",
      );
      return;
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: new mongoose.Types.ObjectId(userId),
    });

    if (!conversation) {
      errorResponse(
        req,
        res,
        "chat.CONVERSATION_NOT_FOUND",
        404,
        "CONVERSATION_NOT_FOUND",
      );
      return;
    }

    const now = new Date();

    // Cập nhật readAt cho tất cả tin nhắn chưa đọc của mình (receiver = userId)
    await Message.updateMany(
      {
        conversationId,
        receiver: new mongoose.Types.ObjectId(userId),
        readAt: null,
      },
      { $set: { readAt: now } },
    );

    // Reset unreadCount về 0 cho userId
    await Conversation.findByIdAndUpdate(conversationId, {
      $set: { [`unreadCount.${userId}`]: 0 },
    });

    // Thông báo realtime cho sender biết tin đã được đọc
    const partnerId = conversation.participants
      .find((p) => p.toString() !== userId)
      ?.toString();

    if (partnerId) {
      const partnerSocketId = getReceiverSocketId(partnerId);
      if (partnerSocketId) {
        getIo().to(partnerSocketId).emit("messagesRead", {
          conversationId,
          readBy: userId,
          readAt: now,
        });
      }
    }

    successResponse(
      req,
      res,
      { conversationId },
      "chat.MARK_READ_SUCCESS",
      200,
      "MARK_READ_SUCCESS",
    );
  } catch (error) {
    console.error("Error in markAsRead:", error);
    errorResponse(req, res, "common.SERVER_ERROR", 500, "SERVER_ERROR");
  }
};

import { useState, useEffect, useCallback, useRef } from "react";
import apiClient from "../services/api";
import { useSocketEvent, useSocketEmit } from "./useSocket";
// Backend emit "newMessage" với payload { conversationId, message }
interface NewMessagePayload {
  conversationId: string;
  message: IMessage;
}

export interface IMessage {
  _id: string;
  conversationId: string;
  sender: string | { _id: string; username: string; display_name: string; avatar?: string };
  receiver: string;
  content: string;
  media_url?: string;
  media_type?: string;
  readAt?: string;
  deliveredAt?: string;
  createdAt: string;
}

export interface IConversation {
  _id: string;
  participants: Array<{
    _id: string;
    username: string;
    display_name: string;
    avatar?: string;
  }>;
  lastMessage?: {
    content: string;
    sender: string;
    createdAt: string;
  };
  unreadCount?: Record<string, number>;
  updatedAt: string;
}

/**
 * Hook quản lý danh sách conversations.
 */
export function useConversations() {
  const [conversations, setConversations] = useState<IConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get("/conversations");
      setConversations(response.data.data || []);
    } catch (err) {
      console.error("Lỗi tải danh sách hội thoại:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Cập nhật conversation khi có tin nhắn mới (realtime)
  // Backend emit: { conversationId, message } → cần unwrap payload
  useSocketEvent<NewMessagePayload>("newMessage", (payload) => {
    const msg = payload.message;
    setConversations((prev) => {
      const updated = prev.map((conv) => {
        if (conv._id === payload.conversationId) {
          return {
            ...conv,
            lastMessage: {
              content: msg.content,
              sender: typeof msg.sender === "string" ? msg.sender : msg.sender._id,
              createdAt: msg.createdAt,
            },
            updatedAt: msg.createdAt,
          };
        }
        return conv;
      });
      // Sắp xếp lại: conversation vừa có tin mới lên đầu
      return updated.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
    });
  });

  return { conversations, isLoading, refetch: fetchConversations };
}

/**
 * Hook quản lý tin nhắn trong 1 conversation cụ thể.
 * Fetch REST + lắng nghe realtime qua Socket.IO.
 */
export function useMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const emit = useSocketEmit();
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Fetch messages khi conversationId thay đổi
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      try {
        setIsLoading(true);
        const response = await apiClient.get(`/conversations/${conversationId}/messages`);
        const data = response.data.data;
        // Backend trả messages trong .messages hoặc trực tiếp
        setMessages(data?.messages || data || []);
      } catch (err) {
        console.error("Lỗi tải tin nhắn:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();

    // Join conversation room
    emit("joinConversation", { conversationId });

    return () => {
      emit("leaveConversation", { conversationId });
    };
  }, [conversationId, emit]);

  // Lắng nghe tin nhắn mới (realtime)
  // Backend emit: { conversationId, message }
  useSocketEvent<NewMessagePayload>("newMessage", (payload) => {
    if (payload.conversationId === conversationId) {
      setMessages((prev) => [...prev, payload.message]);
    }
  });

  // Lắng nghe typing indicator
  useSocketEvent<{ senderId: string; conversationId: string }>("typing", (data) => {
    if (data.conversationId === conversationId) {
      setIsTyping(true);
    }
  });

  useSocketEvent<{ senderId: string; conversationId: string }>("stopTyping", (data) => {
    if (data.conversationId === conversationId) {
      setIsTyping(false);
    }
  });

  // Gửi tin nhắn qua REST API (Backend sẽ emit socket event)
  const sendMessage = useCallback(
    async (content: string) => {
      if (!conversationId || !content.trim()) return;
      try {
        const response = await apiClient.post(`/conversations/${conversationId}/messages`, {
          content: content.trim(),
        });
        // Message sẽ được thêm qua socket event "newMessage"
        return response.data.data;
      } catch (err) {
        console.error("Lỗi gửi tin nhắn:", err);
        throw err;
      }
    },
    [conversationId],
  );

  // Gửi typing indicator
  const sendTyping = useCallback(
    (receiverId: string) => {
      if (!conversationId) return;
      emit("typing", { conversationId, receiverId });

      // Auto stop typing sau 3 giây
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        emit("stopTyping", { conversationId, receiverId });
      }, 3000);
    },
    [conversationId, emit],
  );

  // Mark as read
  const markAsRead = useCallback(() => {
    if (!conversationId) return;
    emit("markAsRead", { conversationId });
  }, [conversationId, emit]);

  return {
    messages,
    isLoading,
    isTyping,
    sendMessage,
    sendTyping,
    markAsRead,
  };
}

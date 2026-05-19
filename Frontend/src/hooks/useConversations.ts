import { useState, useEffect, useCallback, useRef } from "react";
import apiClient from "../services/api";
import { useSocketEvent, useSocketEmit } from "./useSocket";

export interface IMessage {
  _id: string;
  conversationId: string;
  sender: string | {
    _id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
    avatar?: string;
  };
  receiver: string;
  content: string;
  mediaUrl?: string;
  media_type?: string;
  messageType?: "text" | "image" | "file";
  readAt?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
}

export interface IPartner {
  _id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  avatar?: string;
}

export interface IConversation {
  _id: string;
  partner?: IPartner | null;
  participants?: IPartner[];
  lastMessage?: {
    content: string;
    sender: string;
    createdAt: string;
  } | null;
  unreadCount?: number;
  updatedAt: string;
}

interface NewMessagePayload {
  conversationId: string;
  message: IMessage;
}

export function useConversations() {
  const [conversations, setConversations] = useState<IConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get("/conversations");
      setConversations(response.data.data || []);
    } catch (err) {
      console.error("Load conversations failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchConversations();
  }, [fetchConversations]);

  useSocketEvent<NewMessagePayload>("newMessage", (payload) => {
    const msg = payload.message;
    setConversations((prev) => {
      const updated = prev.map((conv) =>
        conv._id === payload.conversationId
          ? {
              ...conv,
              lastMessage: {
                content: msg.content,
                sender: typeof msg.sender === "string" ? msg.sender : msg.sender._id,
                createdAt: msg.createdAt,
              },
              updatedAt: msg.createdAt,
            }
          : conv,
      );

      return updated.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
    });
  });

  return { conversations, isLoading, refetch: fetchConversations };
}

export function useMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const emit = useSocketEmit();
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    let isActive = true;

    const fetchMessages = async () => {
      try {
        setIsLoading(true);
        const response = await apiClient.get(`/conversations/${conversationId}/messages`);
        const data = response.data.data;
        if (isActive) setMessages(data?.messages || data || []);
      } catch (err) {
        console.error("Load messages failed:", err);
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    void fetchMessages();
    emit("joinConversation", { conversationId });

    return () => {
      isActive = false;
      emit("leaveConversation", { conversationId });
    };
  }, [conversationId, emit]);

  useSocketEvent<NewMessagePayload>("newMessage", (payload) => {
    if (payload.conversationId === conversationId) {
      setMessages((prev) =>
        prev.some((message) => message._id === payload.message._id)
          ? prev
          : [...prev, payload.message],
      );
    }
  });

  useSocketEvent<{ senderId: string; conversationId: string }>("typing", (data) => {
    if (data.conversationId === conversationId) setIsTyping(true);
  });

  useSocketEvent<{ senderId: string; conversationId: string }>("stopTyping", (data) => {
    if (data.conversationId === conversationId) setIsTyping(false);
  });

  const sendMessage = useCallback(
    async (content: string) => {
      if (!conversationId || !content.trim()) return undefined;

      try {
        const response = await apiClient.post(`/conversations/${conversationId}/messages`, {
          content: content.trim(),
        });
        const message = response.data.data as IMessage | undefined;
        if (message) {
          setMessages((prev) =>
            prev.some((item) => item._id === message._id) ? prev : [...prev, message],
          );
        }
        return message;
      } catch (err) {
        console.error("Send message failed:", err);
        throw err;
      }
    },
    [conversationId],
  );

  const sendTyping = useCallback(
    (receiverId: string) => {
      if (!conversationId) return;
      emit("typing", { conversationId, receiverId });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        emit("stopTyping", { conversationId, receiverId });
      }, 3000);
    },
    [conversationId, emit],
  );

  const markAsRead = useCallback(async () => {
    if (!conversationId) return;
    emit("markAsRead", { conversationId });
    try {
      await apiClient.patch(`/conversations/${conversationId}/read`);
    } catch (err) {
      console.error("Mark read failed:", err);
    }
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

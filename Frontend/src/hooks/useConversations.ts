import { useState, useEffect, useCallback, useRef } from "react";
import apiClient from "../services/api";
import { useSocketEvent, useSocketEmit } from "./useSocket";
import { useCurrentUser } from "./useCurrentUser";

export interface IMessage {
  _id: string;
  conversationId: string;
  senderId: string | {
    _id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
    avatar?: string;
  };
  receiverId: string;
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
    _id?: string;
    content?: string;
    senderId?: string | IPartner;
    messageType?: "text" | "image" | "file";
    mediaUrl?: string;
    createdAt?: string;
  } | null;
  unreadCount?: number;
  updatedAt: string;
}

interface NewMessagePayload {
  conversationId: string;
  message: IMessage;
}

const CONVERSATION_READ_EVENT = "miniSocial:conversation-read";

type SenderRef = string | { _id?: string; id?: string } | null | undefined;

function getSenderId(value: SenderRef): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value._id || ("id" in value ? value.id || null : null);
}

function getMessageSenderId(message: Partial<IMessage> | null | undefined): string | null {
  if (!message) return null;
  const legacy = message as Partial<IMessage> & {
    sender?: SenderRef;
    author?: SenderRef;
    user?: SenderRef;
    userId?: SenderRef;
  };
  return getSenderId(
    legacy.senderId ?? legacy.sender ?? legacy.userId ?? legacy.user ?? legacy.author,
  );
}

function normalizeMessagesResponse(data: unknown): IMessage[] {
  if (Array.isArray(data)) return data as IMessage[];
  const wrapped = data as { messages?: unknown } | null | undefined;
  return Array.isArray(wrapped?.messages) ? (wrapped.messages as IMessage[]) : [];
}

export function useConversations() {
  const currentUser = useCurrentUser();
  const [conversations, setConversations] = useState<IConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get("/conversations");
      const data = response.data.data;
      setConversations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Load conversations failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    const handleConversationRead = (event: Event) => {
      const conversationId = (event as CustomEvent<string>).detail;
      if (!conversationId) return;
      setConversations((prev) =>
        prev.map((conv) =>
          conv._id === conversationId ? { ...conv, unreadCount: 0 } : conv,
        ),
      );
    };

    window.addEventListener(CONVERSATION_READ_EVENT, handleConversationRead);
    return () => {
      window.removeEventListener(CONVERSATION_READ_EVENT, handleConversationRead);
    };
  }, []);

  const markConversationRead = useCallback((conversationId: string) => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv._id === conversationId ? { ...conv, unreadCount: 0 } : conv,
      ),
    );
    window.dispatchEvent(
      new CustomEvent(CONVERSATION_READ_EVENT, { detail: conversationId }),
    );
  }, []);

  useSocketEvent<NewMessagePayload>("newMessage", (payload) => {
    const msg = payload?.message;
    if (!msg || (!msg.conversationId && !payload?.conversationId)) return;
    const senderId = getMessageSenderId(msg);
    const isFromCurrentUser = Boolean(currentUser?._id && senderId === currentUser._id);
    const conversationId = payload?.conversationId || msg.conversationId;

    if (!conversations.some((conv) => conv._id === conversationId)) {
      void fetchConversations();
      return;
    }

    setConversations((prev) => {
      const updated = prev.map((conv) =>
        conv._id === conversationId
          ? {
              ...conv,
              lastMessage: {
                _id: msg._id,
                content: msg.content || "",
                senderId: senderId || undefined,
                messageType: msg.messageType,
                mediaUrl: msg.mediaUrl,
                createdAt: msg.createdAt,
              },
              unreadCount: isFromCurrentUser
                ? conv.unreadCount || 0
                : (conv.unreadCount || 0) + 1,
              updatedAt: msg.createdAt,
            }
          : conv,
      );

      return updated.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
    });
  });

  return {
    conversations,
    isLoading,
    markConversationRead,
    refetch: fetchConversations,
  };
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
        if (isActive) setMessages(normalizeMessagesResponse(data));
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
    const msg = payload?.message;
    const payloadConversationId = payload?.conversationId || msg?.conversationId;
    if (payloadConversationId === conversationId && msg) {
      setMessages((prev) =>
        prev.some((message) => message._id === msg._id)
          ? prev
          : [...prev, msg],
      );
    }
  });

  useSocketEvent<{ conversationId: string; readBy?: string; readAt?: string | Date }>(
    "messagesRead",
    (data) => {
      if (data.conversationId !== conversationId) return;
      const readAt =
        typeof data.readAt === "string"
          ? data.readAt
          : data.readAt?.toISOString?.() || new Date().toISOString();
      setMessages((prev) =>
        prev.map((message) =>
          data.readBy && message.receiverId === data.readBy
            ? { ...message, readAt }
            : message,
        ),
      );
    },
  );

  useSocketEvent<{ messageIds?: string[]; receiverId?: string }>(
    "messagesDelivered",
    (data) => {
      const deliveredIds = new Set(data.messageIds || []);
      if (deliveredIds.size === 0) return;
      const deliveredAt = new Date().toISOString();
      setMessages((prev) =>
        prev.map((message) =>
          deliveredIds.has(message._id) ? { ...message, deliveredAt } : message,
        ),
      );
    },
  );

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

  const sendAttachment = useCallback(
    async (file: File, messageType: "image" | "file") => {
      if (!conversationId) return undefined;

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("messageType", messageType);
        formData.append("content", file.name);

        const response = await apiClient.post(
          `/conversations/${conversationId}/messages/upload`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } },
        );
        const message = response.data.data as IMessage | undefined;
        if (message) {
          setMessages((prev) =>
            prev.some((item) => item._id === message._id) ? prev : [...prev, message],
          );
        }
        return message;
      } catch (err) {
        console.error("Send attachment failed:", err);
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
    sendAttachment,
    sendTyping,
    markAsRead,
  };
}

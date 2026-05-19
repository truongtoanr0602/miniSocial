import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft,
  Image,
  Loader2,
  MoreVertical,
  Paperclip,
  Phone,
  Search,
  Send,
  Smile,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { useConversations, useMessages } from "../../hooks/useConversations";
import { useCurrentUser } from "../../hooks/useCurrentUser";

interface MessagesViewProps {
  initialConversationId?: string | null;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày`;
  return new Date(dateStr).toLocaleDateString("vi-VN");
}

export function MessagesView({ initialConversationId = null }: MessagesViewProps) {
  const currentUser = useCurrentUser();
  const { conversations, isLoading: convLoading, refetch } = useConversations();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    initialConversationId,
  );
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isLoading: msgLoading,
    isTyping,
    sendMessage,
    sendTyping,
    markAsRead,
  } = useMessages(selectedConversationId);

  useEffect(() => {
    if (!initialConversationId) return;
    setSelectedConversationId(initialConversationId);
    void refetch();
  }, [initialConversationId, refetch]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (selectedConversationId) void markAsRead();
  }, [selectedConversationId, markAsRead]);

  const filteredConversations = conversations.filter((conv) => {
    const partner = conv.partner;
    if (!partner) return false;
    const name = partner.display_name || partner.username || "";
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const selectedConv = conversations.find((conv) => conv._id === selectedConversationId);
  const selectedPartner = selectedConv?.partner;

  const handleSendMessage = useCallback(async () => {
    if (!messageText.trim()) return;
    try {
      await sendMessage(messageText);
      setMessageText("");
      void refetch();
    } catch {
      toast.error("Không thể gửi tin nhắn.");
    }
  }, [messageText, refetch, sendMessage]);

  const handleInputChange = (value: string) => {
    setMessageText(value);
    if (selectedPartner && value.trim()) sendTyping(selectedPartner._id);
  };

  const partnerAvatar = selectedPartner
    ? selectedPartner.avatar_url ||
      selectedPartner.avatar ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedPartner.display_name || selectedPartner.username)}&background=7c3aed&color=fff`
    : "";

  return (
    <div className="h-full max-w-6xl mx-auto">
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden h-full flex">
        <div
          className={`w-full md:w-96 border-r border-gray-200 flex flex-col ${
            selectedConversationId ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-3">
              Tin nhắn
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {convLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
                <span className="ml-2 text-sm text-gray-500">Đang tải...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <p className="font-medium">Chưa có cuộc trò chuyện nào</p>
                <p className="text-sm mt-1">Tìm người dùng và bấm Nhắn tin để bắt đầu.</p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const partner = conv.partner;
                if (!partner) return null;
                const avatar =
                  partner.avatar_url ||
                  partner.avatar ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(partner.display_name || partner.username)}&background=7c3aed&color=fff`;
                const lastMsg = conv.lastMessage;
                const unread = conv.unreadCount || 0;

                return (
                  <button
                    key={conv._id}
                    onClick={() => setSelectedConversationId(conv._id)}
                    className={`w-full p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                      selectedConversationId === conv._id ? "bg-purple-50" : ""
                    }`}
                  >
                    <img src={avatar} alt={partner.display_name || partner.username} className="w-12 h-12 rounded-full object-cover" />
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-baseline justify-between mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {partner.display_name || partner.username}
                        </h3>
                        {lastMsg?.createdAt ? (
                          <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                            {timeAgo(lastMsg.createdAt)}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600 truncate">
                          {lastMsg?.content || "Bắt đầu cuộc trò chuyện..."}
                        </p>
                        {unread > 0 ? (
                          <span className="flex-shrink-0 ml-2 px-2 py-0.5 bg-purple-600 text-white text-xs rounded-full">
                            {unread}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className={`flex-1 flex flex-col ${selectedConversationId ? "flex" : "hidden md:flex"}`}>
          {selectedPartner ? (
            <>
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedConversationId(null)}
                    className="p-1 hover:bg-gray-100 rounded-full md:hidden"
                    title="Quay lại"
                  >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <img src={partnerAvatar} alt={selectedPartner.display_name || selectedPartner.username} className="w-10 h-10 rounded-full object-cover" />
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {selectedPartner.display_name || selectedPartner.username}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {isTyping ? "Đang nhập..." : `@${selectedPartner.username}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toast.info("Tính năng gọi thoại đang được cập nhật.")} title="Gọi thoại" className="p-2 hover:bg-gray-100 rounded-full">
                    <Phone className="w-5 h-5 text-gray-600" />
                  </button>
                  <button onClick={() => toast.info("Tính năng gọi video đang được cập nhật.")} title="Gọi video" className="p-2 hover:bg-gray-100 rounded-full">
                    <Video className="w-5 h-5 text-gray-600" />
                  </button>
                  <button onClick={() => toast.info("Tùy chọn chat đang được cập nhật.")} title="Tùy chọn chat" className="p-2 hover:bg-gray-100 rounded-full">
                    <MoreVertical className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {msgLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
                    <span className="ml-2 text-gray-500">Đang tải tin nhắn...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <p>Hãy gửi lời chào đầu tiên.</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const senderId = typeof message.sender === "string" ? message.sender : message.sender._id;
                    const isOwn = senderId === currentUser?._id;

                    return (
                      <div key={message._id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                            isOwn
                              ? "bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-br-sm"
                              : "bg-gray-100 text-gray-900 rounded-bl-sm"
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p className={`text-xs mt-1 ${isOwn ? "text-purple-100" : "text-gray-500"}`}>
                            {timeAgo(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 border-t border-gray-200">
                <div className="flex items-end gap-2">
                  <button onClick={() => toast.info("Tính năng gửi ảnh đang được cập nhật.")} title="Gửi ảnh" className="p-2 hover:bg-gray-100 rounded-full flex-shrink-0">
                    <Image className="w-5 h-5 text-gray-600" />
                  </button>
                  <button onClick={() => toast.info("Tính năng gửi tệp đang được cập nhật.")} title="Gửi tệp" className="p-2 hover:bg-gray-100 rounded-full flex-shrink-0">
                    <Paperclip className="w-5 h-5 text-gray-600" />
                  </button>
                  <div className="flex-1 relative">
                    <textarea
                      value={messageText}
                      onChange={(event) => handleInputChange(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          void handleSendMessage();
                        }
                      }}
                      placeholder="Nhập tin nhắn..."
                      className="w-full px-4 py-2 pr-10 bg-gray-100 rounded-full resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm max-h-32"
                      rows={1}
                    />
                    <button onClick={() => toast.info("Emoji đang được cập nhật.")} title="Emoji" className="absolute right-3 bottom-2 hover:scale-110 transition-transform">
                      <Smile className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                  <button
                    onClick={() => void handleSendMessage()}
                    disabled={!messageText.trim()}
                    title="Gửi tin nhắn"
                    className="p-2 bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-full hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Send className="w-12 h-12 text-purple-400" />
                </div>
                <p className="text-lg font-medium">Chọn một cuộc trò chuyện</p>
                <p className="text-sm mt-1">Hoặc tìm người dùng để bắt đầu nhắn tin.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

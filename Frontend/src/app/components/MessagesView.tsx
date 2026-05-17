import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  Send,
  MoreVertical,
  Phone,
  Video,
  Image,
  Smile,
  Paperclip,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import {
  useConversations,
  useMessages,
} from "../../hooks/useConversations";
import { useCurrentUser } from "../../hooks/useCurrentUser";

/**
 * Tính thời gian tương đối.
 */
function timeAgo(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày`;
  return new Date(dateStr).toLocaleDateString("vi-VN");
}

export function MessagesView() {
  const currentUser = useCurrentUser();
  const { conversations, isLoading: convLoading } = useConversations();
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
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

  // Scroll xuống cuối khi có tin nhắn mới
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark as read khi mở conversation
  useEffect(() => {
    if (selectedConversationId) {
      markAsRead();
    }
  }, [selectedConversationId, markAsRead]);

  // Lọc conversations theo search query
  const filteredConversations = conversations.filter((conv: any) => {
    const partner = conv.partner;
    if (!partner) return false;
    const name = partner.display_name || partner.username || "";
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Lấy thông tin partner của conversation đang chọn
  const selectedConv = conversations.find(
    (c: any) => c._id === selectedConversationId,
  );
  const selectedPartner = (selectedConv as any)?.partner;

  const handleSendMessage = useCallback(async () => {
    if (!messageText.trim()) return;
    try {
      await sendMessage(messageText);
      setMessageText("");
    } catch {
      // Lỗi đã được log trong hook
    }
  }, [messageText, sendMessage]);

  // Typing indicator
  const handleInputChange = (value: string) => {
    setMessageText(value);
    if (selectedPartner && value.trim()) {
      sendTyping(selectedPartner._id);
    }
  };

  const handleVoiceCall = useCallback(() => {
    toast.info("Tính năng gọi thoại đang được cập nhật.");
  }, []);

  const handleVideoCall = useCallback(() => {
    toast.info("Tính năng gọi video đang được cập nhật.");
  }, []);

  const handleMoreOptions = useCallback(() => {
    toast.info("Tùy chọn cuộc trò chuyện đang được cập nhật.");
  }, []);

  const handlePickImage = useCallback(() => {
    toast.info("Tính năng gửi ảnh đang được cập nhật.");
  }, []);

  const handlePickFile = useCallback(() => {
    toast.info("Tính năng gửi tệp đang được cập nhật.");
  }, []);

  const handleEmojiPicker = useCallback(() => {
    toast.info("Bộ chọn emoji đang được cập nhật.");
  }, []);

  return (
    <div className="h-full max-w-6xl mx-auto">
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden h-full flex">
        {/* Conversations List */}
        <div
          className={`w-full md:w-96 border-r border-gray-200 flex flex-col ${
            selectedConversationId ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Header */}
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
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto">
            {convLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
                <span className="ml-2 text-sm text-gray-500">Đang tải...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <p className="font-medium">Chưa có cuộc trò chuyện nào</p>
                <p className="text-sm mt-1">Bắt đầu trò chuyện với bạn bè!</p>
              </div>
            ) : (
              filteredConversations.map((conv: any) => {
                const partner = conv.partner;
                if (!partner) return null;
                const partnerAvatar =
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
                    <div className="relative flex-shrink-0">
                      <img
                        src={partnerAvatar}
                        alt={partner.display_name || partner.username}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    </div>
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

        {/* Chat Area */}
        <div
          className={`flex-1 flex flex-col ${
            selectedConversationId ? "flex" : "hidden md:flex"
          }`}
        >
          {selectedPartner ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Back button on mobile */}
                  <button
                    onClick={() => setSelectedConversationId(null)}
                    className="p-1 hover:bg-gray-100 rounded-full md:hidden"
                  >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <div className="relative">
                    <img
                      src={
                        selectedPartner.avatar_url ||
                        selectedPartner.avatar ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedPartner.display_name || selectedPartner.username)}&background=7c3aed&color=fff`
                      }
                      alt={
                        selectedPartner.display_name || selectedPartner.username
                      }
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {selectedPartner.display_name || selectedPartner.username}
                    </h3>
                    {isTyping ? (
                      <p className="text-xs text-purple-600 font-medium">
                        Đang nhập...
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500">
                        @{selectedPartner.username}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleVoiceCall}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <Phone className="w-5 h-5 text-gray-600" />
                  </button>
                  <button
                    onClick={handleVideoCall}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <Video className="w-5 h-5 text-gray-600" />
                  </button>
                  <button
                    onClick={handleMoreOptions}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <MoreVertical className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {msgLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
                    <span className="ml-2 text-gray-500">
                      Đang tải tin nhắn...
                    </span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <p>Hãy gửi lời chào đầu tiên! 👋</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    // Xác định tin nhắn của mình hay đối phương
                    const senderId =
                      typeof message.sender === "string"
                        ? message.sender
                        : message.sender._id;
                    const isOwn = senderId === currentUser?._id;

                    return (
                      <div
                        key={message._id}
                        className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                            isOwn
                              ? "bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-br-sm"
                              : "bg-gray-100 text-gray-900 rounded-bl-sm"
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p
                            className={`text-xs mt-1 ${
                              isOwn ? "text-purple-100" : "text-gray-500"
                            }`}
                          >
                            {timeAgo(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                {/* Typing indicator */}
                {isTyping ? (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-2">
                      <div className="flex space-x-1">
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ) : null}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex items-end gap-2">
                  <button
                    onClick={handlePickImage}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                  >
                    <Image className="w-5 h-5 text-gray-600" />
                  </button>
                  <button
                    onClick={handlePickFile}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                  >
                    <Paperclip className="w-5 h-5 text-gray-600" />
                  </button>
                  <div className="flex-1 relative">
                    <textarea
                      value={messageText}
                      onChange={(e) => handleInputChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Nhập tin nhắn..."
                      className="w-full px-4 py-2 pr-10 bg-gray-100 rounded-full resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm max-h-32"
                      rows={1}
                    />
                    <button
                      onClick={handleEmojiPicker}
                      className="absolute right-3 bottom-2 hover:scale-110 transition-transform"
                    >
                      <Smile className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                  <button
                    onClick={handleSendMessage}
                    disabled={!messageText.trim()}
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
                <p className="text-sm mt-1">Để bắt đầu nhắn tin</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

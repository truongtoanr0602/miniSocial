import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft,
  CheckCheck,
  FileText,
  Image,
  Loader2,
  MoreVertical,
  Paperclip,
  Search,
  Send,
  Smile,
} from "lucide-react";
import { toast } from "sonner";
import { copyText } from "../../utils/share";
import { useConversations, useMessages } from "../../hooks/useConversations";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useLangText } from "../../hooks/useLangText";

interface MessagesViewProps {
  initialConversationId?: string | null;
}

function timeAgo(dateStr: string, text: (vi: string, en: string) => string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return text("Vừa xong", "Just now");
  if (minutes < 60) return text(`${minutes} phút`, `${minutes} min`);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return text(`${hours} giờ`, `${hours} hr`);
  const days = Math.floor(hours / 24);
  if (days < 7) return text(`${days} ngày`, `${days} d`);
  return new Date(dateStr).toLocaleDateString(text("vi-VN", "en-US"));
}

const QUICK_EMOJIS = ["😀", "😂", "😍", "👍", "🙏", "🔥", "🎉", "❤️"];

export function MessagesView({ initialConversationId = null }: MessagesViewProps) {
  const currentUser = useCurrentUser();
  const text = useLangText();
  const {
    conversations,
    isLoading: convLoading,
    markConversationRead,
    refetch,
  } = useConversations();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    initialConversationId,
  );
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showChatOptions, setShowChatOptions] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    messages,
    isLoading: msgLoading,
    isTyping,
    sendMessage,
    sendAttachment,
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
    if (selectedConversationId) {
      markConversationRead(selectedConversationId);
      void markAsRead();
    }
    setShowChatOptions(false);
    setShowEmojiPicker(false);
  }, [selectedConversationId, markAsRead, markConversationRead]);

  useEffect(() => {
    if (!selectedConversationId || messages.length === 0) return;
    markConversationRead(selectedConversationId);
    void markAsRead();
  }, [messages.length, selectedConversationId, markAsRead, markConversationRead]);

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
      toast.error(text("Không thể gửi tin nhắn.", "Could not send message."));
    }
  }, [messageText, refetch, sendMessage, text]);

  const handleAttachmentChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>, messageType: "image" | "file") => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;

      try {
        setIsUploading(true);
        await sendAttachment(file, messageType);
        void refetch();
      } catch (err: any) {
        toast.error(err.response?.data?.message || text("Không thể gửi tệp đính kèm.", "Could not send attachment."));
      } finally {
        setIsUploading(false);
      }
    },
    [refetch, sendAttachment, text],
  );

  const handleSelectEmoji = useCallback((emoji: string) => {
    setMessageText((value) => `${value}${emoji}`);
    setShowEmojiPicker(false);
  }, []);

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
              {text("Tin nhắn", "Messages")}
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={text("Tìm kiếm...", "Search...")}
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
                <span className="ml-2 text-sm text-gray-500">{text("Đang tải...", "Loading...")}</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <p className="font-medium">{text("Chưa có cuộc trò chuyện nào", "No conversations yet")}</p>
                <p className="text-sm mt-1">
                  {text("Tìm người dùng và bấm Nhắn tin để bắt đầu.", "Find a user and choose Message to start.")}
                </p>
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
                            {timeAgo(lastMsg.createdAt, text)}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600 truncate">
                          {lastMsg?.content || text("Bắt đầu cuộc trò chuyện...", "Start a conversation...")}
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
                    title={text("Quay lại", "Back")}
                  >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <img src={partnerAvatar} alt={selectedPartner.display_name || selectedPartner.username} className="w-10 h-10 rounded-full object-cover" />
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {selectedPartner.display_name || selectedPartner.username}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {isTyping ? text("Đang nhập...", "Typing...") : `@${selectedPartner.username}`}
                    </p>
                  </div>
                </div>
                <div className="relative flex items-center gap-2">
                  <button
                    onClick={() => setShowChatOptions((value) => !value)}
                    title={text("Tùy chọn chat", "Chat options")}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <MoreVertical className="w-5 h-5 text-gray-600" />
                  </button>
                  {showChatOptions ? (
                    <div className="absolute right-0 top-11 z-20 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 text-sm shadow-lg">
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedConversationId) {
                            markConversationRead(selectedConversationId);
                          }
                          void markAsRead();
                          setShowChatOptions(false);
                          toast.success(text("Đã đánh dấu cuộc trò chuyện là đã đọc.", "Conversation marked as read."));
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gray-50"
                      >
                        <CheckCheck className="h-4 w-4 text-purple-600" />
                        {text("Đánh dấu đã đọc", "Mark as read")}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void copyText(`@${selectedPartner.username}`, text("Đã sao chép tên người dùng.", "Username copied."));
                          setShowChatOptions(false);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gray-50"
                      >
                        <FileText className="h-4 w-4 text-gray-600" />
                        {text("Sao chép username", "Copy username")}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {msgLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
                    <span className="ml-2 text-gray-500">{text("Đang tải tin nhắn...", "Loading messages...")}</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <p>{text("Hãy gửi lời chào đầu tiên.", "Send the first hello.")}</p>
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
                          {message.messageType === "image" && message.mediaUrl ? (
                            <a href={message.mediaUrl} target="_blank" rel="noreferrer" className="block">
                              <img
                                src={message.mediaUrl}
                                alt={message.content || text("Ảnh đã gửi", "Sent image")}
                                className="mb-2 max-h-72 rounded-xl object-cover"
                              />
                            </a>
                          ) : null}
                          {message.messageType === "file" && message.mediaUrl ? (
                            <a
                              href={message.mediaUrl}
                              target="_blank"
                              rel="noreferrer"
                              className={`mb-2 flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${
                                isOwn ? "bg-white/15 text-white" : "bg-white text-gray-800"
                              }`}
                            >
                              <Paperclip className="h-4 w-4" />
                              <span className="truncate">{message.content || text("Tệp đính kèm", "Attachment")}</span>
                            </a>
                          ) : null}
                          {message.content && message.messageType !== "file" ? (
                            <p className="text-sm">{message.content}</p>
                          ) : null}
                          <p className={`text-xs mt-1 ${isOwn ? "text-purple-100" : "text-gray-500"}`}>
                            {timeAgo(message.createdAt, text)}
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
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => void handleAttachmentChange(event, "image")}
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(event) => void handleAttachmentChange(event, "file")}
                  />
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    disabled={isUploading}
                    title={text("Gửi ảnh", "Send image")}
                    className="p-2 hover:bg-gray-100 rounded-full flex-shrink-0 disabled:opacity-50"
                  >
                    <Image className="w-5 h-5 text-gray-600" />
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    title={text("Gửi tệp", "Send file")}
                    className="p-2 hover:bg-gray-100 rounded-full flex-shrink-0 disabled:opacity-50"
                  >
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
                      placeholder={text("Nhập tin nhắn...", "Type a message...")}
                      className="w-full px-4 py-2 pr-10 bg-gray-100 rounded-full resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm max-h-32"
                      rows={1}
                    />
                    {showEmojiPicker ? (
                      <div className="absolute bottom-11 right-0 z-20 grid grid-cols-4 gap-1 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
                        {QUICK_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleSelectEmoji(emoji)}
                            className="h-9 w-9 rounded-lg text-lg hover:bg-gray-100"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <button
                      onClick={() => setShowEmojiPicker((value) => !value)}
                      title="Emoji"
                      className="absolute right-3 bottom-2 hover:scale-110 transition-transform"
                    >
                      <Smile className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                  <button
                    onClick={() => void handleSendMessage()}
                    disabled={!messageText.trim()}
                    title={text("Gửi tin nhắn", "Send message")}
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
                <p className="text-lg font-medium">{text("Chọn một cuộc trò chuyện", "Select a conversation")}</p>
                <p className="text-sm mt-1">
                  {text("Hoặc tìm người dùng để bắt đầu nhắn tin.", "Or find a user to start messaging.")}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

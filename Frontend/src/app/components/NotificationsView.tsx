import {
  Heart,
  MessageCircle,
  UserPlus,
  AtSign,
  Clock,
  Check,
  CheckCheck,
  Loader2,
} from "lucide-react";
import {
  useNotifications,
  type INotification,
} from "../../hooks/useNotifications";
import { useLangText } from "../../hooks/useLangText";
import { resolveMediaUrl } from "../../utils/mediaUrl";

interface NotificationsViewProps {
  onOpenPost?: (postId: string) => void;
  onOpenProfile?: (userId: string) => void;
}

const getNotificationIcon = (type: INotification["type"]) => {
  switch (type) {
    case "like":
      return <Heart className="w-5 h-5 text-red-500 fill-red-500" />;
    case "comment":
      return <MessageCircle className="w-5 h-5 text-blue-500" />;
    case "follow":
      return <UserPlus className="w-5 h-5 text-purple-500" />;
    case "mention":
      return <AtSign className="w-5 h-5 text-green-500" />;
    case "system":
      return <Heart className="w-5 h-5 text-gray-500" />;
    default:
      return <Heart className="w-5 h-5 text-gray-500" />;
  }
};

const getNotificationText = (
  type: INotification["type"],
  text: (vi: string, en: string) => string,
) => {
  switch (type) {
    case "like":
      return text("đã thích bài viết của bạn", "liked your post");
    case "comment":
      return text("đã bình luận bài viết của bạn", "commented on your post");
    case "follow":
      return text("đã bắt đầu theo dõi bạn", "started following you");
    case "mention":
      return text("đã nhắc đến bạn", "mentioned you");
    default:
      return text("đã tương tác với bạn", "interacted with you");
  }
};

/**
 * Tính thời gian tương đối từ timestamp.
 */
function timeAgo(
  dateStr: string,
  text: (vi: string, en: string) => string,
): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return text("Vừa xong", "Just now");
  if (minutes < 60)
    return text(`${minutes} phút trước`, `${minutes} minutes ago`);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return text(`${hours} giờ trước`, `${hours} hours ago`);
  const days = Math.floor(hours / 24);
  if (days < 7) return text(`${days} ngày trước`, `${days} days ago`);
  return new Date(dateStr).toLocaleDateString(text("vi-VN", "en-US"));
}

function getSenderId(notification: INotification): string | null {
  const sender = notification.sender_id;
  if (!sender) return null;
  if (typeof sender === "string") return sender;
  return sender._id;
}

export function NotificationsView({
  onOpenPost,
  onOpenProfile,
}: NotificationsViewProps) {
  const text = useLangText();
  const {
    notifications,
    isLoading,
    error,
    unreadCount,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const handleOpenNotification = (notification: INotification) => {
    if (!notification.is_read) {
      void markAsRead(notification._id);
    }

    if (notification.type === "follow") {
      const profileId = getSenderId(notification) || notification.target_id;
      if (profileId) onOpenProfile?.(profileId);
      return;
    }

    if (
      (notification.type === "like" ||
        notification.type === "comment" ||
        notification.type === "mention") &&
      notification.target_id
    ) {
      onOpenPost?.(notification.target_id);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          <span className="ml-3 text-gray-500">
            {text("Đang tải thông báo...", "Loading notifications...")}
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-12 text-center">
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              {text("Thông báo", "Notifications")}
            </h2>
            {unreadCount > 0 ? (
              <p className="text-sm text-gray-500 mt-1">
                {unreadCount} {text("chưa đọc", "unread")}
              </p>
            ) : null}
          </div>
          {unreadCount > 0 ? (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              {text("Đánh dấu tất cả đã đọc", "Mark all as read")}
            </button>
          ) : null}
        </div>

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-purple-400" />
            </div>
            <p className="text-gray-500 font-medium">
              {text("Chưa có thông báo nào", "No notifications yet")}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {text(
                "Khi có người tương tác, bạn sẽ thấy ở đây",
                "When someone interacts with you, you will see it here",
              )}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => {
              // Lấy thông tin sender (có thể là object hoặc string)
              const sender =
                typeof notification.sender_id === "object"
                  ? notification.sender_id
                  : null;
              const senderName =
                sender?.display_name ||
                sender?.username ||
                text("Ai đó", "Someone");
              const senderAvatar =
                resolveMediaUrl(sender?.avatar_url) ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=7c3aed&color=fff`;

              return (
                <div
                  key={notification._id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleOpenNotification(notification)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleOpenNotification(notification);
                    }
                  }}
                  className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                    !notification.is_read ? "bg-purple-50/50" : ""
                  }`}
                >
                  <div className="flex gap-3">
                    {/* Avatar with notification icon */}
                    <div className="relative flex-shrink-0">
                      <img
                        src={senderAvatar}
                        alt={senderName}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-md">
                        {getNotificationIcon(notification.type)}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm">
                            <span className="font-semibold text-gray-900">
                              {senderName}
                            </span>{" "}
                            <span className="text-gray-600">
                              {notification.message ||
                                getNotificationText(notification.type, text)}
                            </span>
                          </p>
                          <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            <span>
                              {timeAgo(notification.created_at, text)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Read indicator */}
                    {!notification.is_read ? (
                      <div className="w-2.5 h-2.5 bg-purple-600 rounded-full flex-shrink-0 mt-2"></div>
                    ) : (
                      <Check className="w-4 h-4 text-gray-300 flex-shrink-0 mt-2" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

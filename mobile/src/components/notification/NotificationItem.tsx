import React, { memo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Heart, MessageCircle, UserPlus, AtSign, Clock } from "lucide-react-native";
import { Avatar } from "../common/Avatar";
import { palette } from "../../theme";
import type { INotification, IUser } from "../../types/models";

interface Props {
  notification: INotification;
  onPress?: (notification: INotification) => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  like: <Heart color="#ef4444" size={14} fill="#ef4444" />,
  comment: <MessageCircle color="#3b82f6" size={14} />,
  follow: <UserPlus color="#a855f7" size={14} />,
  mention: <AtSign color="#22c55e" size={14} />,
};

const TEXT_MAP: Record<string, string> = {
  like: "đã thích bài viết của bạn",
  comment: "đã bình luận bài viết của bạn",
  follow: "đã bắt đầu theo dõi bạn",
  mention: "đã nhắc đến bạn",
};

function NotificationItemRaw({ notification, onPress }: Props) {
  const sender = (typeof notification.sender_id === "object" ? notification.sender_id : null) as IUser | null;
  const senderName = sender?.display_name || sender?.username || "Ai đó";
  const icon = ICON_MAP[notification.type] || <Heart color="#6b7280" size={14} />;

  return (
    <Pressable
      onPress={() => onPress?.(notification)}
      style={[styles.row, !notification.is_read ? styles.unread : null]}
    >
      <View style={styles.avatarContainer}>
        <Avatar uri={sender?.avatar_url} name={senderName} size={44} />
        <View style={styles.iconBadge}>{icon}</View>
      </View>
      <View style={styles.content}>
        <Text style={styles.text}>
          <Text style={styles.senderName}>{senderName}</Text>
          {" "}{notification.message || TEXT_MAP[notification.type] || "đã tương tác với bạn"}
        </Text>
        <View style={styles.timeRow}>
          <Clock color={palette.muted} size={12} />
          <Text style={styles.timeText}>
            {new Date(notification.created_at).toLocaleDateString("vi-VN")}
          </Text>
        </View>
      </View>
      {!notification.is_read ? <View style={styles.unreadDot} /> : null}
    </Pressable>
  );
}

export const NotificationItem = memo(NotificationItemRaw);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  unread: { backgroundColor: "rgba(147, 51, 234, 0.04)" },
  avatarContainer: { marginRight: 12 },
  iconBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 2,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  content: { flex: 1, justifyContent: "center" },
  text: { fontSize: 14, color: palette.ink, lineHeight: 20 },
  senderName: { fontWeight: "bold" },
  timeRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  timeText: { fontSize: 12, color: palette.muted, marginLeft: 4 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.primary,
    alignSelf: "center",
    marginLeft: 8,
  },
});

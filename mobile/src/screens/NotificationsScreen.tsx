import React, { useEffect, useState, useCallback } from "react";
import { View, Text, Pressable, RefreshControl, StyleSheet } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Heart, MessageCircle, UserPlus, AtSign, Share2, CheckCheck, Clock } from "lucide-react-native";
import { Image } from "expo-image";
import { api } from "../api/client";
import { ENDPOINTS } from "../api/endpoints";
import { palette } from "../theme";
import { ScreenGradient } from "../components/common/ScreenGradient";
import { useLanguage } from "../store/LanguageContext";
import type { INotification, IUser } from "../types/models";

const FlashListAny = FlashList as any;

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "like": return <Heart color="#ef4444" size={16} fill="#ef4444" />;
    case "comment": return <MessageCircle color="#3b82f6" size={16} />;
    case "follow": return <UserPlus color="#a855f7" size={16} />;
    case "mention": return <AtSign color="#22c55e" size={16} />;
    case "share": return <Share2 color="#f97316" size={16} />;
    default: return <Heart color="#6b7280" size={16} />;
  }
};

const getNotificationText = (type: string, t: (vi: string, en: string) => string) => {
  switch (type) {
    case "like": return t("đã thích bài viết của bạn", "liked your post");
    case "comment": return t("đã bình luận bài viết của bạn", "commented on your post");
    case "follow": return t("đã bắt đầu theo dõi bạn", "started following you");
    case "mention": return t("đã nhắc đến bạn", "mentioned you");
    case "share": return t("đã chia sẻ bài viết của bạn", "shared your post");
    default: return t("đã tương tác với bạn", "interacted with you");
  }
};

export default function NotificationsScreen() {
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await api.get(ENDPOINTS.NOTIFICATIONS);
      const data = res.data.data;
      const list = data?.notifications || (Array.isArray(data) ? data : []);
      setNotifications(list);
    } catch (e) {
      console.error("[NotificationsScreen] Load error:", e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await api.patch(ENDPOINTS.NOTIFICATION_READ(id));
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, is_read: true } : n))
      );
    } catch (e) {
      console.error("[NotificationsScreen] Mark read error:", e);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await api.patch(ENDPOINTS.NOTIFICATION_READ_ALL);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (e) {
      console.error("[NotificationsScreen] Mark all read error:", e);
    }
  }, []);

  const renderItem = useCallback(({ item }: { item: INotification }) => {
    const sender = (typeof item.sender_id === "object" ? item.sender_id : null) as IUser | null;
    const senderName = sender?.display_name || sender?.username || t("Ai đó", "Someone");
    const senderAvatar = sender?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=7c3aed&color=fff`;

    return (
      <Pressable
        onPress={() => !item.is_read ? markAsRead(item._id) : undefined}
        style={[
          styles.notifRow,
          !item.is_read ? styles.notifUnread : null,
        ]}
      >
        <View style={styles.avatarContainer}>
          <Image source={{ uri: senderAvatar }} style={styles.avatar} />
          <View style={styles.iconBadge}>
            {getNotificationIcon(item.type)}
          </View>
        </View>
        <View style={styles.notifContent}>
          <Text style={styles.notifText}>
            <Text style={styles.notifSender}>{senderName}</Text>
            {" "}{item.message || getNotificationText(item.type, t)}
          </Text>
          <View style={styles.notifTime}>
            <Clock color={palette.muted} size={12} />
            <Text style={styles.notifTimeText}>
              {new Date(item.created_at).toLocaleDateString(t("vi-VN", "en-US"))}
            </Text>
          </View>
        </View>
        {!item.is_read ? <View style={styles.unreadDot} /> : null}
      </Pressable>
    );
  }, [markAsRead, t]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <ScreenGradient>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>{t("Thông báo", "Notifications")}</Text>
            {unreadCount > 0 ? (
              <Text style={styles.headerSubtitle}>{unreadCount} {t("chưa đọc", "unread")}</Text>
            ) : null}
          </View>
          {unreadCount > 0 ? (
            <Pressable onPress={markAllAsRead} style={styles.markAllBtn}>
              <CheckCheck color={palette.primary} size={16} />
              <Text style={styles.markAllText}>{t("Đã đọc tất cả", "Mark all read")}</Text>
            </Pressable>
          ) : null}
        </View>
        
        <FlashListAny
          data={notifications}
          renderItem={renderItem}
          keyExtractor={(item: INotification) => item._id}
          estimatedItemSize={80}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        />
      </View>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    margin: 16,
    backgroundColor: palette.card,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: palette.primary },
  headerSubtitle: { fontSize: 14, color: palette.muted },
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    backgroundColor: palette.gradient.purpleLight,
    borderRadius: 8,
  },
  markAllText: { color: palette.primary, fontSize: 12, fontWeight: "600", marginLeft: 4 },
  notifRow: {
    flexDirection: "row",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  notifUnread: { backgroundColor: "rgba(147, 51, 234, 0.05)" },
  avatarContainer: { marginRight: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  iconBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 2,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  notifContent: { flex: 1, justifyContent: "center" },
  notifText: { fontSize: 14, color: palette.ink, lineHeight: 20 },
  notifSender: { fontWeight: "bold" },
  notifTime: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  notifTimeText: { fontSize: 12, color: palette.muted, marginLeft: 4 },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.primary,
    alignSelf: "center",
    marginLeft: 8,
  },
});

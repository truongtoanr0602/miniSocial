import React, { useCallback, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { MessageCircle, Search as SearchIcon } from "lucide-react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "../api/client";
import { ENDPOINTS } from "../api/endpoints";
import PostItem from "../components/PostItem";
import { ScreenGradient } from "../components/common/ScreenGradient";
import { useAuth } from "../store/AuthContext";
import { useLanguage } from "../store/LanguageContext";
import { palette } from "../theme";
import type { IPost } from "../types/models";

const FlashListAny = FlashList as any;

type SearchResult = {
  _id: string;
  type: "user" | "post";
  username?: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  content?: string;
  author_id?: unknown;
  stats?: { likes: number; comments: number; shares: number };
  media?: { url: string; type: string }[];
  created_at?: string;
};

export default function SearchScreen({ navigation }: any) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const submit = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    try {
      setLoading(true);
      const { data } = await api.get(
        `${ENDPOINTS.SEARCH}?q=${encodeURIComponent(query)}`,
      );
      const raw = data.data || data;
      const users = (raw.users || []).map((item: any) => ({
        ...item,
        type: "user" as const,
      }));
      const posts = (raw.posts || []).map((item: any) => ({
        ...item,
        type: "post" as const,
      }));
      setResults([...users, ...posts]);
    } catch (e) {
      console.error("[SearchScreen] Search error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const onSearchChange = useCallback(
    (text: string) => {
      setQ(text);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        void submit(text);
      }, 500);
    },
    [submit],
  );

  const startConversation = useCallback(
    async (userId: string) => {
      try {
        const res = await api.post(ENDPOINTS.CREATE_CONVERSATION(userId));
        const conversation = res.data.data || res.data;
        const conversationId = conversation._id || conversation.conversation?._id;
        navigation.navigate("Messages", { initialConversationId: conversationId });
      } catch (e) {
        console.error("[SearchScreen] Create conversation error:", e);
      }
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: SearchResult }) => {
      if (item.type === "user") {
        const displayName = item.display_name || item.username || t("Người dùng", "User");
        const avatarUri =
          item.avatar_url ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=7c3aed&color=fff`;
        const isCurrentUser = item._id === (user as any)?._id;

        return (
          <Pressable
            onPress={() =>
              isCurrentUser
                ? navigation.navigate("Profile")
                : navigation.navigate("UserProfile", { userId: item._id })
            }
            style={styles.userRow}
          >
            <Image source={{ uri: avatarUri }} style={styles.userAvatar} />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{displayName}</Text>
              <Text style={styles.userHandle}>@{item.username}</Text>
              {item.bio ? (
                <Text style={styles.userBio} numberOfLines={1}>
                  {item.bio}
                </Text>
              ) : null}
            </View>
            {isCurrentUser ? (
              <View style={styles.selfBadge}>
                <Text style={styles.selfText}>{t("Bạn", "You")}</Text>
              </View>
            ) : (
              <Pressable
                onPress={() => startConversation(item._id)}
                style={styles.messageBtnWrapper}
              >
                <LinearGradient
                  colors={[palette.primary, palette.accent]}
                  style={styles.messageBtn}
                >
                  <MessageCircle color="#fff" size={14} style={styles.messageIcon} />
                  <Text style={styles.messageText}>{t("Nhắn tin", "Message")}</Text>
                </LinearGradient>
              </Pressable>
            )}
          </Pressable>
        );
      }

      return (
        <View style={styles.postResult}>
          <PostItem
            post={item as unknown as IPost}
            onRefresh={() => submit(q)}
            onOpenProfile={(userId) => navigation.navigate("UserProfile", { userId })}
          />
        </View>
      );
    },
    [navigation, q, startConversation, submit, t, user],
  );

  const keyExtractor = useCallback(
    (item: SearchResult) => `${item.type}_${item._id}`,
    [],
  );

  const usersCount = results.filter((item) => item.type === "user").length;
  const postsCount = results.filter((item) => item.type === "post").length;

  const ListHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.searchCard}>
        <Text style={styles.searchTitle}>{t("Tìm kiếm", "Search")}</Text>
        <View style={styles.searchInputWrapper}>
          <SearchIcon color={palette.muted} size={20} />
          <TextInput
            value={q}
            onChangeText={onSearchChange}
            placeholder={t("Tìm kiếm người dùng, bài viết, hashtag", "Search users, posts, hashtags")}
            style={styles.searchInput}
            placeholderTextColor={palette.muted}
            autoCapitalize="none"
          />
        </View>
      </View>

      {results.length > 0 ? (
        <View style={styles.summaryRow}>
          {usersCount > 0 ? (
            <View style={styles.summaryBadge}>
              <Text style={styles.summaryText}>{usersCount} {t("người dùng", "users")}</Text>
            </View>
          ) : null}
          {postsCount > 0 ? (
            <View style={styles.summaryBadge}>
              <Text style={styles.summaryText}>{postsCount} {t("bài viết", "posts")}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {q.trim() && results.length === 0 && !loading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>{t("Không tìm thấy kết quả cho", "No results for")} "{q}"</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <ScreenGradient>
      <FlashListAny
        data={results}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        estimatedItemSize={80}
        getItemType={(item: SearchResult) => item.type}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
      />
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  listContent: { padding: 16 },
  headerContainer: { marginBottom: 8 },
  searchCard: {
    backgroundColor: palette.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  searchTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: palette.primary,
    marginBottom: 12,
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  searchInput: { flex: 1, fontSize: 16, color: palette.ink, marginLeft: 12 },
  summaryRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  summaryBadge: {
    backgroundColor: "rgba(147, 51, 234, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  summaryText: { color: palette.primary, fontWeight: "600", fontSize: 13 },
  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyText: { color: palette.muted, fontSize: 14 },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: palette.card,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  userAvatar: { width: 48, height: 48, borderRadius: 24 },
  userInfo: { flex: 1, marginLeft: 12 },
  userName: { fontWeight: "700", color: palette.ink, fontSize: 15 },
  userHandle: { color: palette.muted, fontSize: 13, marginTop: 2 },
  userBio: { color: palette.muted, fontSize: 12, marginTop: 2 },
  messageBtnWrapper: { marginLeft: 8 },
  messageBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  messageIcon: { marginRight: 4 },
  messageText: { color: "#fff", fontWeight: "600", fontSize: 12 },
  selfBadge: {
    backgroundColor: "#f3f4f6",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginLeft: 8,
  },
  selfText: { color: palette.muted, fontWeight: "600", fontSize: 12 },
  postResult: { marginBottom: 8 },
});

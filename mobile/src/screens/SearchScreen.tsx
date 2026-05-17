import React, { useState, useCallback, useRef } from "react";
import { Pressable, Text, TextInput, View, StyleSheet } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Search as SearchIcon, UserPlus } from "lucide-react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "../api/client";
import { ENDPOINTS } from "../api/endpoints";
import { palette } from "../theme";
import { ScreenGradient } from "../components/common/ScreenGradient";
import PostItem from "../components/PostItem";
import type { IPost, IUser } from "../types/models";

const FlashListAny = FlashList as any;

type SearchResult = {
  _id: string;
  type: "user" | "post";
  // User fields
  username?: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  // Post fields
  content?: string;
  author_id?: any;
  stats?: { likes: number; comments: number; shares: number };
  media?: { url: string; type: string }[];
  created_at?: string;
};

export default function SearchScreen() {
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
      const { data } = await api.get(`${ENDPOINTS.SEARCH}?q=${encodeURIComponent(query)}`);
      const raw = data.data || data;
      const users = (raw.users || []).map((u: any) => ({ ...u, type: "user" as const }));
      const posts = (raw.posts || []).map((p: any) => ({ ...p, type: "post" as const }));
      setResults([...users, ...posts]);
    } catch (e) {
      console.error("[SearchScreen] Search error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const onSearchChange = useCallback((text: string) => {
    setQ(text);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      submit(text);
    }, 500);
  }, [submit]);

  const followUser = useCallback(async (userId: string) => {
    try {
      await api.post(ENDPOINTS.TOGGLE_FOLLOW(userId));
      // Remove from results after following
      setResults((prev) => prev.filter((r) => r._id !== userId));
    } catch (e) {
      console.error("[SearchScreen] Follow error:", e);
    }
  }, []);

  const renderItem = useCallback(({ item }: { item: SearchResult }) => {
    if (item.type === "user") {
      const displayName = item.display_name || item.username || "Người dùng";
      const avatarUri = item.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=7c3aed&color=fff`;
      return (
        <View style={styles.userRow}>
          <Image source={{ uri: avatarUri }} style={styles.userAvatar} />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{displayName}</Text>
            <Text style={styles.userHandle}>@{item.username}</Text>
            {item.bio ? <Text style={styles.userBio} numberOfLines={1}>{item.bio}</Text> : null}
          </View>
          <Pressable onPress={() => followUser(item._id)} style={styles.followBtnWrapper}>
            <LinearGradient
              colors={[palette.primary, palette.accent]}
              style={styles.followBtn}
            >
              <UserPlus color="#fff" size={14} style={styles.followIcon} />
              <Text style={styles.followText}>Theo dõi</Text>
            </LinearGradient>
          </Pressable>
        </View>
      );
    }

    // Post result
    return (
      <View style={styles.postResult}>
        <PostItem post={item as any as IPost} onRefresh={() => submit(q)} />
      </View>
    );
  }, [followUser, submit, q]);

  const keyExtractor = useCallback((item: SearchResult) => `${item.type}_${item._id}`, []);

  const usersCount = results.filter((r) => r.type === "user").length;
  const postsCount = results.filter((r) => r.type === "post").length;

  const ListHeader = () => (
    <View style={styles.headerContainer}>
      {/* Search Input */}
      <View style={styles.searchCard}>
        <Text style={styles.searchTitle}>Tìm kiếm</Text>
        <View style={styles.searchInputWrapper}>
          <SearchIcon color={palette.muted} size={20} />
          <TextInput
            value={q}
            onChangeText={onSearchChange}
            placeholder="Tìm kiếm người dùng hoặc #hashtag"
            style={styles.searchInput}
            placeholderTextColor={palette.muted}
            autoCapitalize="none"
          />
        </View>
      </View>

      {/* Results Summary */}
      {results.length > 0 ? (
        <View style={styles.summaryRow}>
          {usersCount > 0 ? (
            <View style={styles.summaryBadge}>
              <Text style={styles.summaryText}>{usersCount} người dùng</Text>
            </View>
          ) : null}
          {postsCount > 0 ? (
            <View style={styles.summaryBadge}>
              <Text style={styles.summaryText}>{postsCount} bài viết</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {q.trim() && results.length === 0 && !loading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Không tìm thấy kết quả cho "{q}"</Text>
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
  searchTitle: { fontSize: 24, fontWeight: "bold", color: palette.primary, marginBottom: 12 },
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
  followBtnWrapper: { marginLeft: 8 },
  followBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  followIcon: { marginRight: 4 },
  followText: { color: "#fff", fontWeight: "600", fontSize: 12 },
  postResult: { marginBottom: 8 },
});

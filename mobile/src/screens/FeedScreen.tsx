import React, { useEffect, useState, useCallback, useMemo } from "react";
import { View, Text, RefreshControl, ScrollView, Pressable, StyleSheet } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";
import { Users } from "lucide-react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "../api/client";
import { BASE_URL } from "../api/config";
import { ENDPOINTS } from "../api/endpoints";
import PostComposer from "../components/PostComposer";
import PostItem from "../components/PostItem";
import { useAuth } from "../store/AuthContext";
import { palette } from "../theme";
import { ScreenGradient } from "../components/common/ScreenGradient";
import type { IPost, IUser, ApiResponse } from "../types/models";

const FlashListAny = FlashList as any;

export default function FeedScreen({ navigation }: any) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<IPost[]>([]);
  const [suggestions, setSuggestions] = useState<IUser[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      const [postsRes, suggestionsRes] = await Promise.all([
        api.get<ApiResponse<{ posts: IPost[] }>>(ENDPOINTS.FEED),
        api.get<ApiResponse<IUser[]>>(ENDPOINTS.SUGGESTED_USERS),
      ]);
      // Feed trả về { posts, pagination } hoặc array trực tiếp
      const postsData = postsRes.data.data;
      setPosts(Array.isArray(postsData) ? postsData : (postsData as any)?.posts || []);
      setSuggestions(suggestionsRes.data.data || []);
    } catch (e) {
      console.error("[FeedScreen] Load error:", e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Socket.IO connection — init once
  useEffect(() => {
    if (!user) return;
    const socket: Socket = io(BASE_URL);
    socket.emit("register-user", user._id);
    return () => {
      socket.disconnect();
    };
  }, [user]);

  const followUser = useCallback(async (userId: string) => {
    try {
      await api.post(ENDPOINTS.TOGGLE_FOLLOW(userId));
      setSuggestions((prev) => prev.filter((u) => u._id !== userId));
    } catch (e) {
      console.error("[FeedScreen] Follow error:", e);
    }
  }, []);

  const renderItem = useCallback(({ item }: { item: IPost }) => (
    <View style={styles.postWrapper}>
      <PostItem post={item} onRefresh={load} />
    </View>
  ), [load]);

  const keyExtractor = useCallback((item: IPost) => item._id, []);

  const ListHeader = useMemo(() => (
    <View style={styles.headerContainer}>
      <View style={styles.composerWrapper}>
        <PostComposer onCreated={load} />
      </View>

      {/* Gợi ý kết bạn */}
      {suggestions.length > 0 ? (
        <View style={styles.suggestionsContainer}>
          <View style={styles.suggestionsHeader}>
            <Users color={palette.primary} size={18} style={styles.suggestionsIcon} />
            <Text style={styles.suggestionsTitle}>Gợi ý kết bạn</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionsScroll}>
            {suggestions.map((suggestedUser) => {
              const avatar = suggestedUser.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(suggestedUser.display_name || suggestedUser.username)}&background=7c3aed&color=fff`;
              return (
                <View key={suggestedUser._id} style={styles.suggestionCard}>
                  <Image source={{ uri: avatar }} style={styles.suggestionAvatar} />
                  <Text style={styles.suggestionName} numberOfLines={1}>
                    {suggestedUser.display_name || suggestedUser.username}
                  </Text>
                  <Text style={styles.suggestionUsername} numberOfLines={1}>
                    @{suggestedUser.username}
                  </Text>
                  <Pressable onPress={() => followUser(suggestedUser._id)} style={styles.followBtnWrapper}>
                    <LinearGradient
                      colors={[palette.primary, palette.accent]}
                      style={styles.followBtn}
                    >
                      <Text style={styles.followBtnText}>Theo dõi</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </View>
  ), [suggestions, load, followUser]);

  return (
    <ScreenGradient>
      <FlashListAny
        data={posts}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        estimatedItemSize={250}
        ListHeaderComponent={ListHeader}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={load} />
        }
      />
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  postWrapper: { paddingHorizontal: 14 },
  headerContainer: { paddingVertical: 14 },
  composerWrapper: { paddingHorizontal: 14, marginBottom: 16 },
  suggestionsContainer: { marginBottom: 16 },
  suggestionsHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginBottom: 12 },
  suggestionsIcon: { marginRight: 8 },
  suggestionsTitle: { fontSize: 16, fontWeight: "bold", color: palette.ink },
  suggestionsScroll: { paddingHorizontal: 14 },
  suggestionCard: {
    width: 140,
    padding: 12,
    marginRight: 12,
    alignItems: "center",
    backgroundColor: palette.card,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  suggestionAvatar: { width: 60, height: 60, borderRadius: 30, marginBottom: 8 },
  suggestionName: { fontWeight: "600", color: palette.ink, fontSize: 14, textAlign: "center" },
  suggestionUsername: { color: palette.muted, fontSize: 12, textAlign: "center", marginBottom: 12 },
  followBtnWrapper: { width: "100%" },
  followBtn: { paddingVertical: 6, borderRadius: 20, alignItems: "center" },
  followBtnText: { color: "#fff", fontWeight: "600", fontSize: 12 },
});

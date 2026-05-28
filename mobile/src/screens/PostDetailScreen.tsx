import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, RefreshControl, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { ArrowLeft } from "lucide-react-native";
import { api } from "../api/client";
import { ENDPOINTS } from "../api/endpoints";
import { palette } from "../theme";
import { ScreenGradient } from "../components/common/ScreenGradient";
import PostItem from "../components/PostItem";
import { useLanguage } from "../store/LanguageContext";
import type { IPost, ApiResponse } from "../types/models";

export default function PostDetailScreen({ route, navigation }: any) {
  const { t } = useLanguage();
  const postId = route?.params?.postId as string | undefined;
  const [post, setPost] = useState<IPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!postId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<ApiResponse<IPost>>(ENDPOINTS.POST_DETAIL(postId));
      const data = res.data.data;
      // API có thể trả { post: ... } hoặc trực tiếp object
      setPost((data as any)?.post || data);
    } catch (e: any) {
      console.error("[PostDetailScreen] Load error:", e);
      setError(
        e.response?.status === 404
          ? t("Bài viết không tồn tại hoặc đã bị xóa", "Post not found or has been deleted")
          : t("Không thể tải bài viết", "Failed to load post"),
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [postId, t]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  return (
    <ScreenGradient>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <Pressable onPress={() => navigation.goBack()} style={styles.backRow}>
          <ArrowLeft color={palette.ink} size={20} />
          <Text style={styles.backText}>{t("Quay lại", "Back")}</Text>
        </Pressable>

        {/* Content */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={palette.primary} />
            <Text style={styles.loadingText}>
              {t("Đang tải bài viết...", "Loading post...")}
            </Text>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={load} style={styles.retryBtn}>
              <Text style={styles.retryText}>{t("Thử lại", "Retry")}</Text>
            </Pressable>
          </View>
        ) : post ? (
          <PostItem
            post={post}
            onRefresh={load}
            onOpenProfile={(userId) => navigation.navigate("UserProfile", { userId })}
          />
        ) : null}
      </ScrollView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  backText: {
    marginLeft: 6,
    color: palette.ink,
    fontWeight: "700",
    fontSize: 16,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    color: palette.muted,
    fontSize: 14,
  },
  errorText: {
    color: palette.muted,
    fontSize: 16,
    textAlign: "center",
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: palette.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});

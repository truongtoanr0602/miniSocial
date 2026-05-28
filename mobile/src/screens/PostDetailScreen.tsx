import React, { useEffect, useState, useCallback } from "react";
import { View, RefreshControl } from "react-native";
import { api } from "../api/client";
import { ENDPOINTS } from "../api/endpoints";
import PostItem from "../components/PostItem";
import { useNavigation } from "@react-navigation/native";
import { ScreenGradient } from "../components/common/ScreenGradient";
import type { IPost } from "../types/models";

export default function PostDetailScreen({ route }: any) {
  const postId: string = route?.params?.postId;
  const navigation: any = useNavigation();
  const [post, setPost] = useState<IPost | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!postId) return;
    try {
      setRefreshing(true);
      const res = await api.get(ENDPOINTS.UPDATE_POST(postId));
      const data = res.data.data || res.data;
      setPost(data);
    } catch (e) {
      console.error("[PostDetail] Load error", e);
    } finally {
      setRefreshing(false);
    }
  }, [postId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!post) {
    return (
      <ScreenGradient>
        <View style={{ flex: 1 }} />
      </ScreenGradient>
    );
  }

  return (
    <ScreenGradient>
      <View style={{ flex: 1, margin: 16 }}>
        <PostItem post={post} onRefresh={load} onOpenProfile={(userId: string) => {
          if (!userId) return;
          navigation.navigate("UserProfile", { userId });
        }} />
      </View>
    </ScreenGradient>
  );
}

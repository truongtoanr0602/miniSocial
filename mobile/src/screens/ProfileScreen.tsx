import React, { useEffect, useState, useCallback, useMemo } from "react";
import { View, Text, RefreshControl, Pressable, StyleSheet } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { Link2, Calendar, Edit, MoreHorizontal, Grid, Image as ImageIcon, Info } from "lucide-react-native";
import { api } from "../api/client";
import { ENDPOINTS } from "../api/endpoints";
import { useAuth } from "../store/AuthContext";
import { palette } from "../theme";
import { ScreenGradient } from "../components/common/ScreenGradient";
import PostItem from "../components/PostItem";
import type { IPost, IUser } from "../types/models";

const FlashListAny = FlashList as any;

export default function ProfileScreen() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("posts");

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await api.get(ENDPOINTS.MY_PROFILE);
      setProfile(res.data.data || res.data);
    } catch (e) {
      console.error("[ProfileScreen] Load error:", e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const renderItem = useCallback(({ item }: { item: IPost }) => (
    <PostItem post={item} onRefresh={load} />
  ), [load]);

  const keyExtractor = useCallback((item: IPost) => item._id, []);

  if (!profile) {
    return (
      <ScreenGradient>
        <Text style={styles.loadingText}>Đang tải hồ sơ...</Text>
      </ScreenGradient>
    );
  }

  const userData = profile.user || profile;
  const avatarUrl = userData.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.display_name || userData.username)}&background=7c3aed&color=fff`;

  const ListHeader = () => (
    <View style={styles.headerContainer}>
      {/* Profile Card */}
      <View style={styles.profileCard}>
        {/* Banner */}
        <LinearGradient
          colors={["#4338ca", "#a855f7", "#ec4899"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.banner}
        />
        
        <View style={styles.profileBody}>
          {/* Avatar and Edit Button Row */}
          <View style={styles.avatarRow}>
            <View style={styles.avatarBorder}>
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              <View style={styles.onlineDot} />
            </View>
            <View style={styles.actionRow}>
              <Pressable style={styles.editBtn} onPress={() => {
                const { Alert } = require("react-native");
                Alert.alert("Chỉnh sửa", "Tính năng chỉnh sửa hồ sơ đang phát triển.");
              }}>
                <Edit color="#fff" size={16} style={styles.editIcon} />
                <Text style={styles.editBtnText}>Chỉnh sửa</Text>
              </Pressable>
              <Pressable style={styles.moreBtn} onPress={() => {
                const { Alert } = require("react-native");
                Alert.alert("Tùy chọn", "Chia sẻ trang cá nhân, Sao chép link...");
              }}>
                <MoreHorizontal color={palette.ink} size={20} />
              </Pressable>
            </View>
          </View>

          {/* User Info */}
          <View style={styles.userInfo}>
            <Text style={styles.displayName}>{userData.display_name || userData.username}</Text>
            <Text style={styles.username}>@{userData.username}</Text>
            <Text style={styles.bio}>{userData.bio || "Chưa có tiểu sử"}</Text>
            
            <View style={styles.metaRow}>
              {userData.email ? (
                <View style={styles.metaItem}>
                  <Link2 color={palette.muted} size={14} style={styles.metaIcon} />
                  <Text style={styles.metaText}>{userData.email}</Text>
                </View>
              ) : null}
              <View style={styles.metaItem}>
                <Calendar color={palette.muted} size={14} style={styles.metaIcon} />
                <Text style={styles.metaText}>
                  Tham gia tháng {new Date(userData.created_at || Date.now()).getMonth() + 1} năm {new Date(userData.created_at || Date.now()).getFullYear()}
                </Text>
              </View>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View>
              <Text style={styles.statValue}>{profile.followersCount || userData.followers?.length || 0}</Text>
              <Text style={styles.statLabel}>Người theo dõi</Text>
            </View>
            <View>
              <Text style={styles.statValue}>{profile.followingCount || userData.following?.length || 0}</Text>
              <Text style={styles.statLabel}>Đang theo dõi</Text>
            </View>
            <View>
              <Text style={styles.statValue}>{profile.postsCount || profile.posts?.length || 0}</Text>
              <Text style={styles.statLabel}>Bài viết</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {(["posts", "photos", "about"] as const).map((tab) => {
          const isActive = activeTab === tab;
          const icons = { posts: Grid, photos: ImageIcon, about: Info };
          const labels = { posts: "Bài viết", photos: "Hình ảnh", about: "Giới thiệu" };
          const Icon = icons[tab];
          return (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tabItem, isActive ? styles.tabActive : null]}
            >
              <Icon color={isActive ? palette.primary : palette.muted} size={18} style={styles.tabIcon} />
              <Text style={[styles.tabText, isActive ? styles.tabTextActive : null]}>{labels[tab]}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  return (
    <ScreenGradient>
      <FlashListAny
        data={activeTab === "posts" ? (profile.posts || []) : []}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        estimatedItemSize={250}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
      />
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  loadingText: { padding: 16, textAlign: "center", color: palette.muted, marginTop: 40 },
  headerContainer: { marginBottom: 16 },
  profileCard: {
    backgroundColor: palette.card,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  banner: { height: 120, width: "100%" },
  profileBody: { paddingHorizontal: 16, paddingBottom: 16 },
  avatarRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: -40, marginBottom: 12 },
  avatarBorder: { borderWidth: 4, borderColor: "#fff", borderRadius: 50, backgroundColor: "#fff" },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  onlineDot: { position: "absolute", bottom: 0, right: 0, width: 16, height: 16, backgroundColor: "#22c55e", borderRadius: 8, borderWidth: 2, borderColor: "#fff" },
  actionRow: { flexDirection: "row", gap: 8 },
  editBtn: { backgroundColor: palette.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, flexDirection: "row", alignItems: "center" },
  editIcon: { marginRight: 6 },
  editBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  moreBtn: { backgroundColor: "#f3f4f6", padding: 8, borderRadius: 8 },
  userInfo: { marginBottom: 16 },
  displayName: { fontSize: 24, fontWeight: "bold", color: palette.ink },
  username: { fontSize: 14, color: palette.muted, marginBottom: 12 },
  bio: { fontSize: 15, color: palette.ink, marginBottom: 12 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  metaItem: { flexDirection: "row", alignItems: "center" },
  metaIcon: { marginRight: 4 },
  metaText: { fontSize: 13, color: palette.muted },
  statsRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: palette.line, paddingTop: 16, gap: 32 },
  statValue: { fontSize: 18, fontWeight: "bold", color: palette.ink },
  statLabel: { fontSize: 13, color: palette.muted },
  tabContainer: {
    flexDirection: "row",
    padding: 8,
    justifyContent: "space-between",
    backgroundColor: palette.card,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  tabItem: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 10, borderRadius: 8 },
  tabActive: { backgroundColor: "rgba(147, 51, 234, 0.1)" },
  tabIcon: { marginRight: 8 },
  tabText: { fontWeight: "600", color: palette.muted },
  tabTextActive: { color: palette.primary },
  listContent: { padding: 16 },
});

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import {
  ArrowLeft,
  Calendar,
  Edit,
  Grid,
  Image as ImageIcon,
  Info,
  Link2,
  MoreHorizontal,
  X,
} from "lucide-react-native";
import { api } from "../api/client";
import { ENDPOINTS } from "../api/endpoints";
import { useAuth } from "../store/AuthContext";
import { palette } from "../theme";
import { ScreenGradient } from "../components/common/ScreenGradient";
import PostItem from "../components/PostItem";
import type { IPost, IUser } from "../types/models";

const FlashListAny = FlashList as any;

type FollowListKind = "followers" | "following";

function avatarFor(user: Pick<IUser, "display_name" | "username" | "avatar_url">) {
  return (
    user.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(user.display_name || user.username)}&background=7c3aed&color=fff`
  );
}

function normalizeProfile(raw: any) {
  const user = raw.user || raw;
  const posts = (raw.posts || []).map((post: IPost) => ({
    ...post,
    author_id: typeof post.author_id === "object" ? post.author_id : user,
  }));
  return {
    ...user,
    posts,
    postsCount: raw.postsCount ?? posts.length,
    followersCount: raw.followersCount ?? user.followers?.length ?? 0,
    followingCount: raw.followingCount ?? user.following?.length ?? 0,
    is_following: raw.is_following,
    is_pending: raw.is_pending,
  };
}

export default function ProfileScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const routeUserId = route?.params?.userId as string | undefined;
  const targetUserId = routeUserId || (user as any)?._id;
  const isOwnProfile = !routeUserId || routeUserId === (user as any)?._id;
  const [profile, setProfile] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"posts" | "photos" | "about">("posts");
  const [followListKind, setFollowListKind] = useState<FollowListKind | null>(null);
  const [followUsers, setFollowUsers] = useState<IUser[]>([]);
  const [loadingFollowList, setLoadingFollowList] = useState(false);

  const load = useCallback(async () => {
    if (!targetUserId) return;
    try {
      setRefreshing(true);
      const endpoint = isOwnProfile ? ENDPOINTS.MY_PROFILE : ENDPOINTS.USER_PROFILE(targetUserId);
      const [profileRes, countsRes, statusRes] = await Promise.all([
        api.get(endpoint),
        api.get(ENDPOINTS.FOLLOW_COUNTS(targetUserId)).catch(() => null),
        isOwnProfile
          ? Promise.resolve(null)
          : api.get(ENDPOINTS.FOLLOW_STATUS(targetUserId)).catch(() => null),
      ]);
      const baseProfile = normalizeProfile(profileRes.data.data || profileRes.data);
      setProfile({
        ...baseProfile,
        followersCount: countsRes?.data?.data?.followers ?? baseProfile.followersCount,
        followingCount: countsRes?.data?.data?.following ?? baseProfile.followingCount,
        is_following: statusRes?.data?.data?.is_following ?? baseProfile.is_following,
        is_pending: statusRes?.data?.data?.is_pending ?? baseProfile.is_pending,
      });
    } catch (e) {
      console.error("[ProfileScreen] Load error:", e);
    } finally {
      setRefreshing(false);
    }
  }, [isOwnProfile, targetUserId]);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const openFollowList = useCallback(
    async (kind: FollowListKind) => {
      if (!targetUserId) return;
      setFollowListKind(kind);
      setFollowUsers([]);
      try {
        setLoadingFollowList(true);
        const endpoint =
          kind === "followers"
            ? ENDPOINTS.FOLLOWERS(targetUserId)
            : ENDPOINTS.FOLLOWING(targetUserId);
        const res = await api.get(`${endpoint}?limit=50`);
        setFollowUsers(res.data.data?.users || []);
      } catch (e) {
        console.error("[ProfileScreen] Load follow list error:", e);
      } finally {
        setLoadingFollowList(false);
      }
    },
    [targetUserId],
  );

  const toggleFollow = useCallback(async () => {
    if (!targetUserId || isOwnProfile) return;
    try {
      const res = await api.post(`/follow/${targetUserId}`);
      const result = res.data.data || {};
      setProfile((prev: any) =>
        prev
          ? {
              ...prev,
              is_following: Boolean(result.is_following && result.status !== "pending"),
              is_pending: result.status === "pending",
              followersCount:
                result.is_following && result.status !== "pending"
                  ? prev.followersCount + 1
                  : Math.max(0, prev.followersCount - 1),
            }
          : prev,
      );
    } catch (e) {
      console.error("[ProfileScreen] Follow error:", e);
    }
  }, [isOwnProfile, targetUserId]);

  const renderItem = useCallback(
    ({ item }: { item: IPost }) => (
      <PostItem
        post={item}
        onRefresh={load}
        onOpenProfile={(userId) => navigation.push("UserProfile", { userId })}
      />
    ),
    [load, navigation],
  );

  const keyExtractor = useCallback((item: IPost) => item._id, []);

  const photoMedia = useMemo(
    () =>
      (profile?.posts || []).flatMap((post: IPost) =>
        (post.media || [])
          .filter((media) => media.type === "image")
          .map((media) => media.url),
      ),
    [profile?.posts],
  );

  if (!profile) {
    return (
      <ScreenGradient>
        <Text style={styles.loadingText}>Đang tải hồ sơ...</Text>
      </ScreenGradient>
    );
  }

  const userData = profile.user || profile;
  const avatarUrl = avatarFor(userData);
  const followButtonLabel = profile.is_pending
    ? "Đã gửi yêu cầu"
    : profile.is_following
      ? "Đang theo dõi"
      : "Theo dõi";

  const ListHeader = () => (
    <View style={styles.headerContainer}>
      {!isOwnProfile ? (
        <Pressable onPress={() => navigation.goBack()} style={styles.backRow}>
          <ArrowLeft color={palette.ink} size={20} />
          <Text style={styles.backText}>Quay lại</Text>
        </Pressable>
      ) : null}

      <View style={styles.profileCard}>
        <LinearGradient
          colors={["#4338ca", "#a855f7", "#ec4899"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.banner}
        />

        <View style={styles.profileBody}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarBorder}>
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              <View style={styles.onlineDot} />
            </View>
            <View style={styles.actionRow}>
              {isOwnProfile ? (
                <Pressable style={styles.editBtn} onPress={() => navigation.navigate("Settings")}>
                  <Edit color="#fff" size={16} style={styles.editIcon} />
                  <Text style={styles.editBtnText}>Chỉnh sửa</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={[styles.followBtn, profile.is_following || profile.is_pending ? styles.followingBtn : null]}
                  onPress={toggleFollow}
                >
                  <Text style={[styles.followBtnText, profile.is_following || profile.is_pending ? styles.followingBtnText : null]}>
                    {followButtonLabel}
                  </Text>
                </Pressable>
              )}
              <Pressable style={styles.moreBtn}>
                <MoreHorizontal color={palette.ink} size={20} />
              </Pressable>
            </View>
          </View>

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
                  Tham gia tháng {new Date(userData.created_at || Date.now()).getMonth() + 1} năm{" "}
                  {new Date(userData.created_at || Date.now()).getFullYear()}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.statsRow}>
            <Pressable onPress={() => void openFollowList("followers")} style={styles.statItem}>
              <Text style={styles.statValue}>{profile.followersCount ?? 0}</Text>
              <Text style={styles.statLabel}>Người theo dõi</Text>
            </Pressable>
            <Pressable onPress={() => void openFollowList("following")} style={styles.statItem}>
              <Text style={styles.statValue}>{profile.followingCount ?? 0}</Text>
              <Text style={styles.statLabel}>Đang theo dõi</Text>
            </Pressable>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.postsCount ?? profile.posts?.length ?? 0}</Text>
              <Text style={styles.statLabel}>Bài viết</Text>
            </View>
          </View>
        </View>
      </View>

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

      {activeTab === "photos" && photoMedia.length === 0 ? (
        <Text style={styles.emptyText}>Chưa có hình ảnh nào</Text>
      ) : null}
      {activeTab === "about" ? (
        <View style={styles.aboutCard}>
          <Text style={styles.aboutTitle}>Thông tin cơ bản</Text>
          <Text style={styles.aboutText}>Tên hiển thị: {userData.display_name || userData.username}</Text>
          <Text style={styles.aboutText}>Username: @{userData.username}</Text>
          <Text style={styles.aboutText}>Tiểu sử: {userData.bio || "Chưa cập nhật"}</Text>
        </View>
      ) : null}
    </View>
  );

  const data =
    activeTab === "posts"
      ? profile.posts || []
      : activeTab === "photos"
        ? photoMedia.map((url: string, index: number) => ({ _id: `${url}-${index}`, url }))
        : [];

  return (
    <ScreenGradient>
      <FlashListAny
        key={activeTab}
        data={data}
        renderItem={
          activeTab === "photos"
            ? ({ item }: { item: { url: string } }) => <Image source={{ uri: item.url }} style={styles.photoItem} />
            : renderItem
        }
        keyExtractor={(item: any) => item._id}
        estimatedItemSize={activeTab === "photos" ? 140 : 250}
        numColumns={activeTab === "photos" ? 3 : 1}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
      />

      <Modal visible={Boolean(followListKind)} transparent animationType="fade" onRequestClose={() => setFollowListKind(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {followListKind === "followers" ? "Người theo dõi" : "Đang theo dõi"}
              </Text>
              <Pressable onPress={() => setFollowListKind(null)} style={styles.closeBtn}>
                <X color={palette.muted} size={20} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalList}>
              {loadingFollowList ? (
                <Text style={styles.emptyText}>Đang tải...</Text>
              ) : followUsers.length === 0 ? (
                <Text style={styles.emptyText}>Chưa có người dùng nào.</Text>
              ) : (
                followUsers.map((followUser) => (
                  <Pressable
                    key={followUser._id}
                    onPress={() => {
                      setFollowListKind(null);
                      navigation.push("UserProfile", { userId: followUser._id });
                    }}
                    style={styles.followUserRow}
                  >
                    <Image source={{ uri: avatarFor(followUser) }} style={styles.followUserAvatar} />
                    <View style={styles.followUserInfo}>
                      <Text style={styles.followUserName}>{followUser.display_name || followUser.username}</Text>
                      <Text style={styles.followUserHandle}>@{followUser.username}</Text>
                    </View>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  loadingText: { padding: 16, textAlign: "center", color: palette.muted, marginTop: 40 },
  listContent: { padding: 16 },
  headerContainer: { marginBottom: 16 },
  backRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  backText: { marginLeft: 6, color: palette.ink, fontWeight: "700" },
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
  followBtn: { backgroundColor: palette.primary, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 8 },
  followingBtn: { backgroundColor: "#f3f4f6" },
  followBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  followingBtnText: { color: palette.ink },
  moreBtn: { backgroundColor: "#f3f4f6", padding: 8, borderRadius: 8 },
  userInfo: { marginBottom: 16 },
  displayName: { fontSize: 24, fontWeight: "bold", color: palette.ink },
  username: { fontSize: 14, color: palette.muted, marginBottom: 12 },
  bio: { fontSize: 15, color: palette.ink, marginBottom: 12 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 16, flexWrap: "wrap" },
  metaItem: { flexDirection: "row", alignItems: "center" },
  metaIcon: { marginRight: 4 },
  metaText: { fontSize: 13, color: palette.muted },
  statsRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: palette.line, paddingTop: 16, gap: 24 },
  statItem: { minWidth: 78 },
  statValue: { fontSize: 18, fontWeight: "bold", color: palette.ink },
  statLabel: { fontSize: 13, color: palette.muted },
  tabContainer: { flexDirection: "row", padding: 8, justifyContent: "space-between", backgroundColor: palette.card, borderRadius: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  tabItem: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 10, borderRadius: 8 },
  tabActive: { backgroundColor: "rgba(147, 51, 234, 0.1)" },
  tabIcon: { marginRight: 8 },
  tabText: { fontWeight: "600", color: palette.muted },
  tabTextActive: { color: palette.primary },
  emptyText: { textAlign: "center", color: palette.muted, paddingVertical: 28 },
  aboutCard: { backgroundColor: palette.card, borderRadius: 16, padding: 16, marginTop: 12 },
  aboutTitle: { color: palette.ink, fontWeight: "800", fontSize: 16, marginBottom: 10 },
  aboutText: { color: palette.ink, fontSize: 14, marginBottom: 8 },
  photoItem: { aspectRatio: 1, margin: 3, borderRadius: 8, backgroundColor: "#f3f4f6" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 20 },
  modalCard: { maxHeight: "70%", backgroundColor: "#fff", borderRadius: 16, overflow: "hidden" },
  modalHeader: { minHeight: 54, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: palette.line },
  modalTitle: { color: palette.ink, fontWeight: "800", fontSize: 16 },
  closeBtn: { padding: 8 },
  modalList: { padding: 8 },
  followUserRow: { flexDirection: "row", alignItems: "center", padding: 10, borderRadius: 12 },
  followUserAvatar: { width: 44, height: 44, borderRadius: 22 },
  followUserInfo: { marginLeft: 12, flex: 1 },
  followUserName: { color: palette.ink, fontWeight: "700", fontSize: 14 },
  followUserHandle: { color: palette.muted, fontSize: 12, marginTop: 2 },
});

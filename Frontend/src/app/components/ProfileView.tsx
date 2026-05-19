import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Edit,
  Grid,
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  MoreHorizontal,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import apiClient from "../../services/api";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { PostCard } from "./PostCard";
import type { IMyProfile, IPost, IUser } from "../../types/models";

interface ProfileViewProps {
  userId?: string | null;
  onEditProfile?: () => void;
  onOpenProfile?: (userId: string) => void;
}

type ProfileData = IMyProfile & {
  is_following?: boolean;
  is_pending?: boolean;
};

type FollowListKind = "followers" | "following";

function avatarFor(user: Pick<IUser, "display_name" | "username" | "avatar_url">) {
  return (
    user.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(user.display_name || user.username)}&background=7c3aed&color=fff`
  );
}

function normalizeOtherProfile(data: any): ProfileData {
  const user = data.user || data;
  const posts = (data.posts || []).map((post: IPost) => ({
    ...post,
    author_id: typeof post.author_id === "object" ? post.author_id : user,
  }));

  return {
    ...user,
    posts,
    postsCount: data.postsCount ?? posts.length,
    followersCount: data.followersCount ?? user.followers?.length ?? 0,
    followingCount: data.followingCount ?? user.following?.length ?? 0,
    is_following: data.is_following,
    is_pending: data.is_pending,
  };
}

export function ProfileView({ userId, onEditProfile, onOpenProfile }: ProfileViewProps) {
  const currentUser = useCurrentUser();
  const currentUserId = currentUser?._id;
  const targetUserId = userId || currentUserId || null;
  const isOwnProfile = !userId || userId === currentUserId;
  const [activeTab, setActiveTab] = useState<"posts" | "photos" | "about">("posts");
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [followListKind, setFollowListKind] = useState<FollowListKind | null>(null);
  const [followUsers, setFollowUsers] = useState<IUser[]>([]);
  const [isLoadingFollowList, setIsLoadingFollowList] = useState(false);

  const fetchProfile = useCallback(async () => {
    const token = localStorage.getItem("userToken");
    if (!token || !targetUserId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const endpoint = isOwnProfile ? "/users/me" : `/users/profile/${targetUserId}`;
      const profileRes = await apiClient.get(endpoint);
      const baseProfile = isOwnProfile
        ? profileRes.data.data
        : normalizeOtherProfile(profileRes.data.data || profileRes.data);

      const [countsRes, statusRes] = await Promise.all([
        apiClient.get(`/follow/${targetUserId}/counts`).catch(() => null),
        isOwnProfile
          ? Promise.resolve(null)
          : apiClient.get(`/follow/status/${targetUserId}`).catch(() => null),
      ]);

      setProfile({
        ...baseProfile,
        followersCount:
          countsRes?.data?.data?.followers ?? baseProfile.followersCount ?? 0,
        followingCount:
          countsRes?.data?.data?.following ?? baseProfile.followingCount ?? 0,
        is_following:
          statusRes?.data?.data?.is_following ?? baseProfile.is_following ?? false,
        is_pending:
          statusRes?.data?.data?.is_pending ?? baseProfile.is_pending ?? false,
      });
    } catch (err) {
      console.error("Load profile failed:", err);
      toast.error("Không thể tải trang cá nhân.");
    } finally {
      setIsLoading(false);
    }
  }, [isOwnProfile, targetUserId]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const openFollowList = useCallback(
    async (kind: FollowListKind) => {
      if (!targetUserId) return;
      setFollowListKind(kind);
      setFollowUsers([]);
      try {
        setIsLoadingFollowList(true);
        const res = await apiClient.get(`/follow/${targetUserId}/${kind}?limit=50`);
        setFollowUsers(res.data.data?.users || []);
      } catch (err) {
        console.error("Load follow list failed:", err);
        toast.error("Không thể tải danh sách.");
      } finally {
        setIsLoadingFollowList(false);
      }
    },
    [targetUserId],
  );

  const handleToggleFollow = useCallback(async () => {
    if (!targetUserId || isOwnProfile) return;
    try {
      const res = await apiClient.post(`/follow/${targetUserId}`);
      const result = res.data.data || {};
      setProfile((prev) =>
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
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Không thể cập nhật theo dõi.");
    }
  }, [isOwnProfile, targetUserId]);

  const updatePostInProfile = useCallback((updatedPost: IPost) => {
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            posts: prev.posts.map((post) =>
              post._id === updatedPost._id ? { ...post, ...updatedPost } : post,
            ),
          }
        : prev,
    );
  }, []);

  const removePostFromProfile = useCallback((postId: string) => {
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            postsCount: Math.max(0, prev.postsCount - 1),
            posts: prev.posts.filter((post) => post._id !== postId),
          }
        : prev,
    );
  }, []);

  const incrementComments = useCallback((postId: string) => {
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            posts: prev.posts.map((post) =>
              post._id === postId
                ? { ...post, stats: { ...post.stats, comments: post.stats.comments + 1 } }
                : post,
            ),
          }
        : prev,
    );
  }, []);

  const handleLike = useCallback(async (postId: string) => {
    try {
      const response = await apiClient.post(`/post/${postId}/react`);
      const result = response.data.data;
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              posts: prev.posts.map((post) =>
                post._id === postId
                  ? {
                      ...post,
                      is_liked: result?.is_liked ?? !post.is_liked,
                      stats: { ...post.stats, likes: result?.likes ?? post.stats.likes },
                    }
                  : post,
              ),
            }
          : prev,
      );
    } catch (err) {
      console.error("Like failed:", err);
      toast.error("Không thể cập nhật lượt thích.");
    }
  }, []);

  const photoMedia = useMemo(
    () =>
      (profile?.posts || []).flatMap((post) =>
        (post.media || [])
          .filter((media) => media.type === "image")
          .map((media) => media.url),
      ),
    [profile?.posts],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
        <span className="ml-3 text-gray-500">Đang tải trang cá nhân...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20 text-gray-500">
        <p>Không thể tải thông tin cá nhân</p>
        <button onClick={fetchProfile} className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg">
          Thử lại
        </button>
      </div>
    );
  }

  const avatarUrl = avatarFor(profile);
  const joinDate = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString("vi-VN", {
        month: "long",
        year: "numeric",
      })
    : "Không rõ";
  const followButtonLabel = profile.is_pending
    ? "Đã gửi yêu cầu"
    : profile.is_following
      ? "Đang theo dõi"
      : "Theo dõi";

  return (
    <div className="flex flex-col space-y-6 pb-20">
      <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
        <div className="h-48 sm:h-64 relative w-full bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500">
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </div>

        <div className="relative px-4 sm:px-8 pb-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-16 sm:-mt-20 mb-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-end space-y-4 sm:space-y-0 sm:space-x-4">
              <div className="relative z-10">
                <img src={avatarUrl} alt={profile.display_name} className="w-32 h-32 sm:w-40 sm:h-40 rounded-full object-cover ring-4 ring-white shadow-xl" />
                <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 border-4 border-white rounded-full" />
              </div>
              <div className="text-center sm:text-left mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{profile.display_name}</h1>
                <p className="text-gray-500 font-medium">@{profile.username}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 mt-6 sm:mt-0 justify-center">
              {isOwnProfile ? (
                <button
                  onClick={onEditProfile}
                  className="flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:shadow-lg transition-all font-medium"
                >
                  <Edit className="w-5 h-5" />
                  <span>Chỉnh sửa</span>
                </button>
              ) : (
                <button
                  onClick={handleToggleFollow}
                  className={`px-6 py-2.5 rounded-xl font-medium transition-all ${
                    profile.is_following || profile.is_pending
                      ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      : "bg-purple-600 text-white hover:bg-purple-700"
                  }`}
                >
                  {followButtonLabel}
                </button>
              )}
              <button
                onClick={() => toast.info("Các tùy chọn khác đang được cập nhật.")}
                className="p-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="mt-4 sm:mt-0 max-w-2xl">
            <p className="text-gray-700 mb-4 text-center sm:text-left text-lg">
              {profile.bio || "Chưa có tiểu sử"}
            </p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-sm text-gray-500">
              {profile.email ? (
                <div className="flex items-center space-x-1">
                  <LinkIcon className="w-4 h-4" />
                  <span>{profile.email}</span>
                </div>
              ) : null}
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>Tham gia {joinDate}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center sm:justify-start space-x-8 mt-6 pt-6 border-t border-gray-100">
            <button onClick={() => void openFollowList("followers")} className="text-center sm:text-left">
              <span className="block text-xl font-bold text-gray-900">{profile.followersCount}</span>
              <span className="text-sm text-gray-500">Người theo dõi</span>
            </button>
            <button onClick={() => void openFollowList("following")} className="text-center sm:text-left">
              <span className="block text-xl font-bold text-gray-900">{profile.followingCount}</span>
              <span className="text-sm text-gray-500">Đang theo dõi</span>
            </button>
            <div className="text-center sm:text-left">
              <span className="block text-xl font-bold text-gray-900">{profile.postsCount}</span>
              <span className="text-sm text-gray-500">Bài viết</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200/50 p-2">
        <div className="flex space-x-2">
          {[
            ["posts", Grid, "Bài viết"],
            ["photos", ImageIcon, "Hình ảnh"],
            ["about", UserPlus, "Giới thiệu"],
          ].map(([tab, Icon, label]) => (
            <button
              key={tab as string}
              onClick={() => setActiveTab(tab as "posts" | "photos" | "about")}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl transition-all font-medium ${
                activeTab === tab
                  ? "bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 shadow-sm"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{label as string}</span>
            </button>
          ))}
        </div>
      </div>

      {activeTab === "posts" ? (
        <div className="space-y-6">
          {profile.posts.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200/50 p-6 text-center text-gray-500 py-20">
              <Grid className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">Chưa có bài viết nào</p>
            </div>
          ) : (
            profile.posts.map((post) => (
              <PostCard
                key={post._id}
                post={post}
                onLike={handleLike}
                onCommentCreated={incrementComments}
                onShare={() => toast.info("Tính năng chia sẻ đang được cập nhật.")}
                onPostUpdated={updatePostInProfile}
                onPostDeleted={removePostFromProfile}
                onOpenProfile={onOpenProfile}
              />
            ))
          )}
        </div>
      ) : null}

      {activeTab === "photos" ? (
        photoMedia.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200/50 p-6 text-center text-gray-500 py-20">
            <ImageIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg">Chưa có hình ảnh nào</p>
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200/50 p-4">
            <div className="grid grid-cols-3 gap-2">
              {photoMedia.map((url) => (
                <img key={url} src={url} alt="Ảnh bài viết" className="w-full h-40 object-cover rounded-lg" />
              ))}
            </div>
          </div>
        )
      ) : null}

      {activeTab === "about" ? (
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200/50 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Thông tin cơ bản</h3>
          <div className="space-y-4">
            <div className="flex pb-4 border-b border-gray-100">
              <span className="w-1/3 text-gray-500 font-medium">Tên hiển thị</span>
              <span className="w-2/3 text-gray-900">{profile.display_name}</span>
            </div>
            <div className="flex pb-4 border-b border-gray-100">
              <span className="w-1/3 text-gray-500 font-medium">Username</span>
              <span className="w-2/3 text-gray-900">@{profile.username}</span>
            </div>
            <div className="flex">
              <span className="w-1/3 text-gray-500 font-medium">Tiểu sử</span>
              <span className="w-2/3 text-gray-900">{profile.bio || "Chưa cập nhật"}</span>
            </div>
          </div>
        </div>
      ) : null}

      {followListKind ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h3 className="font-bold text-gray-900">
                {followListKind === "followers" ? "Người theo dõi" : "Đang theo dõi"}
              </h3>
              <button onClick={() => setFollowListKind(null)} className="rounded-full p-1 hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {isLoadingFollowList ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                </div>
              ) : followUsers.length === 0 ? (
                <p className="py-10 text-center text-sm text-gray-500">Chưa có người dùng nào.</p>
              ) : (
                followUsers.map((user) => (
                  <button
                    key={user._id}
                    onClick={() => {
                      setFollowListKind(null);
                      onOpenProfile?.(user._id);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-gray-50"
                  >
                    <img src={avatarFor(user)} alt={user.display_name} className="h-11 w-11 rounded-full object-cover" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-gray-900">{user.display_name || user.username}</span>
                      <span className="block truncate text-xs text-gray-500">@{user.username}</span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

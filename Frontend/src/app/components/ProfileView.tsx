import { useState, useEffect, useCallback } from "react";
import { Grid, Image as ImageIcon, MapPin, Link as LinkIcon, Calendar, MoreHorizontal, UserPlus, MessageCircle, Loader2 } from "lucide-react";
import { PostCard } from "./PostCard";
import type { Post } from "./PostFeed";
import apiClient from "../../services/api";
import { useCurrentUser } from "../../hooks/useCurrentUser";

/**
 * Tính thời gian tương đối.
 */
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return new Date(dateStr).toLocaleDateString("vi-VN");
}

function normalizePost(raw: any): Post {
  const author = raw.author_id || {};
  return {
    ...raw,
    id: raw._id,
    author: {
      name: author.display_name || author.username || "Ẩn danh",
      avatar: author.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(author.display_name || "U")}&background=7c3aed&color=fff`,
      username: `@${author.username || "unknown"}`,
    },
    image: raw.media_urls?.[0] || undefined,
    likes: raw.likes_count ?? 0,
    comments: raw.comments_count ?? 0,
    shares: raw.shares_count ?? 0,
    timestamp: timeAgo(raw.createdAt || new Date().toISOString()),
  };
}

function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export function ProfileView() {
  const currentUser = useCurrentUser();
  const [activeTab, setActiveTab] = useState<"posts" | "photos" | "about">("posts");
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!currentUser?._id) return;
    try {
      setIsLoading(true);
      const [profileRes, postsRes] = await Promise.all([
        apiClient.get(`/users/${currentUser._id}`),
        apiClient.get(`/post/user/${currentUser._id}`),
      ]);
      setProfile(profileRes.data.data || profileRes.data);
      const rawPosts = postsRes.data.data?.posts || postsRes.data.data || [];
      setPosts(rawPosts.map(normalizePost));
    } catch (err: any) {
      if (err.response?.status !== 401) {
        console.error("Lỗi tải profile:", err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?._id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Profile data (fallback to currentUser from localStorage)
  const displayName = profile?.display_name || currentUser?.display_name || "Người dùng";
  const username = profile?.username || currentUser?.username || "user";
  const bio = profile?.bio || "";
  const location = profile?.location || "";
  const avatarUrl = profile?.avatar_url || (currentUser as any)?.avatar_url
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=7c3aed&color=fff&size=200`;
  const followersCount = profile?.followers_count ?? 0;
  const followingCount = profile?.following_count ?? 0;
  const postsCount = profile?.posts_count ?? posts.length;
  const joinDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("vi-VN", { month: "long", year: "numeric" })
    : "";
  const email = profile?.email || currentUser?.email || "";

  const handleLike = useCallback(async (postId: string) => {
    try {
      await apiClient.post(`/post/${postId}/like`);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, is_liked: !p.is_liked, likes: p.is_liked ? p.likes - 1 : p.likes + 1 }
            : p,
        ),
      );
    } catch (err) {
      console.error("Lỗi like:", err);
    }
  }, []);

  const handleComment = useCallback((_postId: string) => {}, []);
  const handleShare = useCallback((_postId: string) => {}, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
        <span className="ml-3 text-gray-500">Đang tải trang cá nhân...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6 pb-20">
      {/* Profile Header Card */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
        {/* Cover Photo */}
        <div className="h-48 sm:h-64 relative w-full bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500">
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
        </div>

        {/* Profile Info Section */}
        <div className="relative px-4 sm:px-8 pb-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-16 sm:-mt-20 mb-6">
            {/* Avatar & Name */}
            <div className="flex flex-col sm:flex-row items-center sm:items-end space-y-4 sm:space-y-0 sm:space-x-4">
              <div className="relative z-10">
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-32 h-32 sm:w-40 sm:h-40 rounded-full object-cover ring-4 ring-white shadow-xl"
                />
                <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 border-4 border-white rounded-full"></div>
              </div>
              <div className="text-center sm:text-left mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{displayName}</h1>
                <p className="text-gray-500 font-medium">@{username}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3 mt-6 sm:mt-0 justify-center">
              <button className="flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:shadow-lg transition-all font-medium">
                <UserPlus className="w-5 h-5" />
                <span>Theo dõi</span>
              </button>
              <button className="p-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all">
                <MessageCircle className="w-5 h-5" />
              </button>
              <button className="p-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Bio & Details */}
          <div className="mt-4 sm:mt-0 max-w-2xl">
            {bio ? (
              <p className="text-gray-700 mb-4 text-center sm:text-left text-lg">{bio}</p>
            ) : null}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-sm text-gray-500">
              {location ? (
                <div className="flex items-center space-x-1">
                  <MapPin className="w-4 h-4" />
                  <span>{location}</span>
                </div>
              ) : null}
              {email ? (
                <div className="flex items-center space-x-1">
                  <LinkIcon className="w-4 h-4" />
                  <span className="text-purple-600">{email}</span>
                </div>
              ) : null}
              {joinDate ? (
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>Tham gia {joinDate}</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center sm:justify-start space-x-8 mt-6 pt-6 border-t border-gray-100">
            <div className="text-center sm:text-left">
              <span className="block text-xl font-bold text-gray-900">{formatCount(followersCount)}</span>
              <span className="text-sm text-gray-500">Người theo dõi</span>
            </div>
            <div className="text-center sm:text-left">
              <span className="block text-xl font-bold text-gray-900">{formatCount(followingCount)}</span>
              <span className="text-sm text-gray-500">Đang theo dõi</span>
            </div>
            <div className="text-center sm:text-left">
              <span className="block text-xl font-bold text-gray-900">{postsCount}</span>
              <span className="text-sm text-gray-500">Bài viết</span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Navigation */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200/50 p-2">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab("posts")}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl transition-all font-medium ${
              activeTab === "posts"
                ? "bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 shadow-sm"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Grid className="w-5 h-5" />
            <span>Bài viết</span>
          </button>
          <button
            onClick={() => setActiveTab("photos")}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl transition-all font-medium ${
              activeTab === "photos"
                ? "bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 shadow-sm"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <ImageIcon className="w-5 h-5" />
            <span>Hình ảnh</span>
          </button>
          <button
            onClick={() => setActiveTab("about")}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl transition-all font-medium ${
              activeTab === "about"
                ? "bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 shadow-sm"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <UserPlus className="w-5 h-5" />
            <span>Giới thiệu</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "posts" ? (
          <div className="space-y-6">
            {posts.length === 0 ? (
              <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200/50 p-12 text-center">
                <p className="text-gray-500 text-lg">Chưa có bài viết nào</p>
                <p className="text-gray-400 text-sm mt-2">Hãy chia sẻ khoảnh khắc đầu tiên!</p>
              </div>
            ) : (
              posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onLike={handleLike}
                  onComment={handleComment}
                  onShare={handleShare}
                />
              ))
            )}
          </div>
        ) : null}

        {activeTab === "photos" ? (
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200/50 p-6 text-center text-gray-500 py-20">
            <ImageIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg">Chưa có hình ảnh nào</p>
          </div>
        ) : null}

        {activeTab === "about" ? (
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200/50 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Thông tin cơ bản</h3>
            <div className="space-y-4">
              {email ? (
                <div className="flex pb-4 border-b border-gray-100">
                  <span className="w-1/3 text-gray-500 font-medium">Email</span>
                  <span className="w-2/3 text-gray-900">{email}</span>
                </div>
              ) : null}
              {location ? (
                <div className="flex pb-4 border-b border-gray-100">
                  <span className="w-1/3 text-gray-500 font-medium">Sống tại</span>
                  <span className="w-2/3 text-gray-900">{location}</span>
                </div>
              ) : null}
              {joinDate ? (
                <div className="flex pb-4 border-b border-gray-100">
                  <span className="w-1/3 text-gray-500 font-medium">Tham gia</span>
                  <span className="w-2/3 text-gray-900">{joinDate}</span>
                </div>
              ) : null}
              {!email && !location && !joinDate ? (
                <p className="text-gray-400 text-center py-8">Chưa có thông tin</p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

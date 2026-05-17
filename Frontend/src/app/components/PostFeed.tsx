import { useState, useEffect, useCallback } from "react";
import { PostCard } from "./PostCard";
import { Loader2 } from "lucide-react";
import apiClient from "../../services/api";

export interface Post {
  _id: string;
  id: string; // alias cho _id để PostCard tương thích
  author_id: {
    _id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
  author: {
    name: string;
    avatar: string;
    username: string;
  };
  content: string;
  media_urls?: string[];
  image?: string;
  visibility: "public" | "friends" | "private";
  likes_count: number;
  comments_count: number;
  shares_count: number;
  likes: number;
  comments: number;
  shares: number;
  is_liked?: boolean;
  timestamp: string;
  createdAt: string;
}

/**
 * Tính thời gian tương đối từ ISO date string.
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

/**
 * Normalize dữ liệu Backend → format PostCard cần.
 */
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

export function PostFeed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get("/post/feed");
      const rawPosts = response.data.data?.posts || response.data.data || [];
      setPosts(rawPosts.map(normalizePost));
      setError(null);
    } catch (err: any) {
      if (err.response?.status !== 401) {
        setError("Không thể tải bài viết");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleLike = useCallback(async (postId: string) => {
    try {
      await apiClient.post(`/post/${postId}/like`);
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                is_liked: !post.is_liked,
                likes: post.is_liked ? post.likes - 1 : post.likes + 1,
              }
            : post,
        ),
      );
    } catch (err) {
      console.error("Lỗi like bài viết:", err);
    }
  }, []);

  const handleComment = useCallback(async (postId: string, content?: string) => {
    if (!content) return;
    try {
      await apiClient.post(`/post/${postId}/comment`, { content });
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? { ...post, comments: post.comments + 1 }
            : post,
        ),
      );
    } catch (err) {
      console.error("Lỗi bình luận:", err);
    }
  }, []);

  const handleShare = useCallback(async (postId: string) => {
    try {
      await apiClient.post(`/post/${postId}/share`);
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? { ...post, shares: post.shares + 1 }
            : post,
        ),
      );
    } catch (err) {
      console.error("Lỗi chia sẻ:", err);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
        <span className="ml-3 text-gray-500">Đang tải bài viết...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={fetchPosts}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Create Post Area */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg p-4 border border-gray-200/50">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white font-bold text-lg">
            {(() => {
              try {
                const u = JSON.parse(localStorage.getItem("userData") || "{}");
                return (u.display_name || u.username || "U").charAt(0).toUpperCase();
              } catch {
                return "U";
              }
            })()}
          </div>
          <input
            type="text"
            placeholder="Bạn đang nghĩ gì?"
            className="flex-1 px-4 py-3 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500"
            readOnly
          />
        </div>
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
          <button className="flex items-center space-x-2 px-4 py-2 hover:bg-gray-100 rounded-lg transition-all">
            <span className="text-xl">📸</span>
            <span className="text-sm text-gray-600 hidden sm:inline">Ảnh</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 hover:bg-gray-100 rounded-lg transition-all">
            <span className="text-xl">🎥</span>
            <span className="text-sm text-gray-600 hidden sm:inline">Video</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 hover:bg-gray-100 rounded-lg transition-all">
            <span className="text-xl">😊</span>
            <span className="text-sm text-gray-600 hidden sm:inline">Cảm xúc</span>
          </button>
        </div>
      </div>

      {/* Posts */}
      {posts.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg p-12 text-center">
          <p className="text-gray-500 text-lg font-medium">Chưa có bài viết nào</p>
          <p className="text-gray-400 text-sm mt-2">Hãy tạo bài viết đầu tiên!</p>
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
  );
}

import { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PostCard } from "./PostCard";
import apiClient from "../../services/api";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import type { IPost } from "../../types/models";

interface PostFeedProps {
  onCreatePost?: () => void;
}

export function PostFeed({ onCreatePost }: PostFeedProps) {
  const [posts, setPosts] = useState<IPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentUser = useCurrentUser();

  const fetchPosts = useCallback(async () => {
    const token = localStorage.getItem("userToken");
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const response = await apiClient.get("/post/feed");
      const data = response.data.data;
      setPosts(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err: any) {
      if (err.response?.status !== 401) {
        setError(err.response?.data?.message || "Lỗi tải bảng tin");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Like bài viết qua API
  const handleLike = useCallback(async (postId: string) => {
    try {
      await apiClient.post(`/post/${postId}/react`);
      setPosts((prev) =>
        prev.map((post) =>
          post._id === postId
            ? { ...post, stats: { ...post.stats, likes: post.stats.likes + 1 } }
            : post,
        ),
      );
    } catch (err) {
      console.error("Lỗi like bài viết:", err);
    }
  }, []);

  const handleComment = useCallback((_postId: string) => {
    // Sẽ mở phần comment — logic hiện tại trong PostCard
  }, []);

  const handleShare = useCallback((_postId: string) => {
    // Sẽ implement share sau
  }, []);

  const handleOpenCreatePost = useCallback(() => {
    if (onCreatePost) {
      onCreatePost();
      return;
    }
    toast.info("Tính năng tạo bài viết đang được cập nhật.");
  }, [onCreatePost]);

  // Lấy avatar URL hiện tại
  const userAvatar =
    currentUser?.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.display_name || "U")}&background=7c3aed&color=fff`;

  if (isLoading) {
    return (
      <div className="space-y-6 pb-6">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg p-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          <span className="ml-3 text-gray-500">Đang tải bảng tin...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 pb-6">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg p-12 text-center">
          <p className="text-red-500">{error}</p>
          <button
            onClick={fetchPosts}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Create Post */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg p-4 border border-gray-200/50">
        <div className="flex items-center space-x-3">
          <img
            src={userAvatar}
            alt="Your avatar"
            className="w-12 h-12 rounded-full object-cover"
          />
          <input
            type="text"
            placeholder="Bạn đang nghĩ gì?"
            className="flex-1 px-4 py-3 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500"
            readOnly
            onClick={handleOpenCreatePost}
          />
        </div>
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={handleOpenCreatePost}
            className="flex items-center space-x-2 px-4 py-2 hover:bg-gray-100 rounded-lg transition-all"
          >
            <span className="text-xl">📸</span>
            <span className="text-sm text-gray-600 hidden sm:inline">Ảnh</span>
          </button>
          <button
            onClick={handleOpenCreatePost}
            className="flex items-center space-x-2 px-4 py-2 hover:bg-gray-100 rounded-lg transition-all"
          >
            <span className="text-xl">🎥</span>
            <span className="text-sm text-gray-600 hidden sm:inline">
              Video
            </span>
          </button>
          <button
            onClick={handleOpenCreatePost}
            className="flex items-center space-x-2 px-4 py-2 hover:bg-gray-100 rounded-lg transition-all"
          >
            <span className="text-xl">😊</span>
            <span className="text-sm text-gray-600 hidden sm:inline">
              Cảm xúc
            </span>
          </button>
        </div>
      </div>

      {/* Posts — dữ liệu thật từ API */}
      {posts.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg p-12 text-center">
          <p className="text-gray-500 font-medium">Chưa có bài viết nào</p>
          <p className="text-sm text-gray-400 mt-1">
            Hãy tạo bài viết đầu tiên hoặc theo dõi ai đó!
          </p>
        </div>
      ) : (
        posts.map((post) => (
          <PostCard
            key={post._id}
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

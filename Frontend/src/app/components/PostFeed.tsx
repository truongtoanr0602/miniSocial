import { useState, useEffect, useCallback } from "react";
import { Camera, Loader2, Smile, Video } from "lucide-react";
import { toast } from "sonner";
import { PostCard } from "./PostCard";
import { CreatePostModal } from "./CreatePostModal";
import apiClient from "../../services/api";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useLangText } from "../../hooks/useLangText";
import { sharePostLink } from "../../utils/share";
import type { IPost } from "../../types/models";

interface PostFeedProps {
  onCreatePost?: () => void;
  refreshKey?: number;
  onOpenProfile?: (userId: string) => void;
}

export function PostFeed({ onCreatePost, refreshKey = 0, onOpenProfile }: PostFeedProps) {
  const [posts, setPosts] = useState<IPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLocalComposerOpen, setIsLocalComposerOpen] = useState(false);
  const currentUser = useCurrentUser();
  const text = useLangText();

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
      setPosts(Array.isArray(data) ? data : data?.posts || []);
      setError(null);
    } catch (err: any) {
      if (err.response?.status !== 401) {
        setError(err.response?.data?.message || text("Lỗi tải bảng tin", "Could not load feed"));
      }
    } finally {
      setIsLoading(false);
    }
  }, [text]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts, refreshKey]);

  const handleLike = useCallback(async (postId: string) => {
    try {
      const response = await apiClient.post(`/post/${postId}/react`);
      const result = response.data.data;
      setPosts((prev) =>
        prev.map((post) =>
          post._id === postId
            ? {
                ...post,
                is_liked: result?.is_liked ?? !post.is_liked,
                stats: {
                  ...post.stats,
                  likes:
                    typeof result?.likes === "number"
                      ? result.likes
                      : Math.max(0, post.stats.likes + (post.is_liked ? -1 : 1)),
                },
              }
            : post,
        ),
      );
    } catch (err) {
      console.error("Lỗi thích bài viết:", err);
      toast.error(text("Không thể cập nhật lượt thích.", "Could not update like."));
    }
  }, [text]);

  const handleCommentCreated = useCallback((postId: string) => {
    setPosts((prev) =>
      prev.map((post) =>
        post._id === postId
          ? { ...post, stats: { ...post.stats, comments: post.stats.comments + 1 } }
          : post,
      ),
    );
  }, []);

  const handlePostUpdated = useCallback((updatedPost: IPost) => {
    setPosts((prev) =>
      prev.map((post) =>
        post._id === updatedPost._id
          ? { ...post, ...updatedPost, is_liked: post.is_liked }
          : post,
      ),
    );
  }, []);

  const handlePostDeleted = useCallback((postId: string) => {
    setPosts((prev) => prev.filter((post) => post._id !== postId));
  }, []);

  const handleShare = useCallback(async (postId: string) => {
    try {
      const response = await apiClient.post(`/post/${postId}/share`);
      const shares = response.data.data?.shares;
      setPosts((prev) =>
        prev.map((post) =>
          post._id === postId
            ? {
                ...post,
                stats: {
                  ...post.stats,
                  shares: typeof shares === "number" ? shares : post.stats.shares + 1,
                },
              }
            : post,
        ),
      );
      await sharePostLink(postId);
    } catch (err) {
      console.error("Share failed:", err);
      toast.error(text("Không thể chia sẻ bài viết.", "Could not share post."));
    }
  }, [text]);

  const handleOpenCreatePost = useCallback(() => {
    if (onCreatePost) {
      onCreatePost();
      return;
    }
    setIsLocalComposerOpen(true);
  }, [onCreatePost]);

  const userName = currentUser?.display_name || currentUser?.username || "U";
  const userAvatar =
    (currentUser as any)?.avatar_url ||
    currentUser?.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=7c3aed&color=fff`;

  if (isLoading) {
    return (
      <div className="space-y-6 pb-6">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg p-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          <span className="ml-3 text-gray-500">{text("Đang tải bảng tin...", "Loading feed...")}</span>
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
            {text("Thử lại", "Try again")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="space-y-6 pb-6">
      <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg p-4 border border-gray-200/50">
        <div className="flex items-center space-x-3">
          <img src={userAvatar} alt="Your avatar" className="w-12 h-12 rounded-full object-cover" />
          <input
            type="text"
            placeholder={text("Bạn đang nghĩ gì?", "What are you thinking?")}
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
            <Camera className="w-5 h-5 text-green-600" />
            <span className="text-sm text-gray-600 hidden sm:inline">{text("Ảnh", "Photo")}</span>
          </button>
          <button
            onClick={handleOpenCreatePost}
            className="flex items-center space-x-2 px-4 py-2 hover:bg-gray-100 rounded-lg transition-all"
          >
            <Video className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-gray-600 hidden sm:inline">Video</span>
          </button>
          <button
            onClick={handleOpenCreatePost}
            className="flex items-center space-x-2 px-4 py-2 hover:bg-gray-100 rounded-lg transition-all"
          >
            <Smile className="w-5 h-5 text-yellow-600" />
            <span className="text-sm text-gray-600 hidden sm:inline">{text("Cảm xúc", "Feeling")}</span>
          </button>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg p-12 text-center">
          <p className="text-gray-500 font-medium">{text("Chưa có bài viết nào", "No posts yet")}</p>
          <p className="text-sm text-gray-400 mt-1">
            {text("Hãy tạo bài viết đầu tiên hoặc theo dõi ai đó.", "Create the first post or follow someone.")}
          </p>
        </div>
      ) : (
        posts.map((post) => (
          <PostCard
            key={post._id}
            post={post}
            onLike={handleLike}
            onCommentCreated={handleCommentCreated}
            onShare={handleShare}
            onPostUpdated={handlePostUpdated}
            onPostDeleted={handlePostDeleted}
            onOpenProfile={onOpenProfile}
          />
        ))
      )}
    </div>
    <CreatePostModal
      isOpen={isLocalComposerOpen}
      onClose={() => setIsLocalComposerOpen(false)}
      onPostCreated={() => void fetchPosts()}
    />
    </>
  );
}

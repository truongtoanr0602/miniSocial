import { useState, useCallback, memo } from "react";
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import type { IPost, IUser } from "../../types/models";

interface PostCardProps {
  post: IPost;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  onShare: (postId: string) => void;
}

/**
 * Tính thời gian tương đối từ timestamp.
 */
function timeAgo(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
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
 * Lấy thông tin author từ post (author_id có thể là populated object hoặc string)
 */
function getAuthorInfo(authorId: IUser | string) {
  if (typeof authorId === "string") {
    return { name: "Người dùng", username: "user", avatar: "" };
  }
  const user = authorId as IUser;
  return {
    name: user.display_name || user.username,
    username: `@${user.username}`,
    avatar:
      user.avatar_url ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(user.display_name || user.username)}&background=7c3aed&color=fff`,
  };
}

// Rule: rerender-memo — wrap PostCard trong React.memo()
export const PostCard = memo(function PostCard({
  post,
  onLike,
  onComment,
  onShare,
}: PostCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");

  const author = getAuthorInfo(post.author_id);

  // Rule: rerender-memo — useCallback cho handlers
  const handleLike = useCallback(() => {
    setIsLiked((prev) => !prev);
    onLike(post._id);
  }, [post._id, onLike]);

  const handleComment = useCallback(() => {
    if (commentText.trim()) {
      onComment(post._id);
      setCommentText("");
      setShowComments(true);
    }
  }, [commentText, post._id, onComment]);

  const handleShare = useCallback(() => {
    onShare(post._id);
    toast.success("Đã chia sẻ bài viết!");
  }, [post._id, onShare]);

  const handleToggleSave = useCallback(() => {
    setIsSaved((prev) => !prev);
  }, []);

  const handleToggleComments = useCallback(() => {
    setShowComments((prev) => !prev);
  }, []);

  const handleMoreOptions = useCallback(() => {
    toast.info("Tùy chọn bài viết sẽ sớm được cập nhật.");
  }, []);

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden hover:shadow-xl transition-all duration-300">
      {/* Post Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img
            src={author.avatar}
            alt={author.name}
            className="w-12 h-12 rounded-full object-cover ring-2 ring-purple-500/20"
          />
          <div>
            <h3 className="font-semibold text-gray-900">{author.name}</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span>{author.username}</span>
              <span>•</span>
              <span>{timeAgo(post.created_at)}</span>
            </div>
          </div>
        </div>
        <button
          onClick={handleMoreOptions}
          className="p-2 hover:bg-gray-100 rounded-full transition-all"
        >
          <MoreHorizontal className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Post Content */}
      {post.content ? (
        <div className="px-4 pb-3">
          <p className="text-gray-800">{post.content}</p>
        </div>
      ) : null}

      {/* Post Media — hiển thị ảnh/video từ MinIO */}
      {post.media && post.media.length > 0 ? (
        <div className="relative">
          {post.media.length === 1 ? (
            <img
              src={post.media[0].url}
              alt={post.media[0].alt_text || "Post content"}
              className="w-full object-cover max-h-[500px]"
            />
          ) : (
            <div className="grid grid-cols-2 gap-1">
              {post.media.map((m, idx) => (
                <img
                  key={idx}
                  src={m.url}
                  alt={m.alt_text || `Media ${idx + 1}`}
                  className="w-full h-48 object-cover"
                />
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* Post Stats — dữ liệu thật từ DB */}
      <div className="px-4 py-3 flex items-center justify-between text-sm text-gray-600">
        <div className="flex items-center space-x-2">
          <div className="flex -space-x-1">
            <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white text-xs">
              ❤️
            </div>
            <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
              👍
            </div>
          </div>
          <span>{post.stats.likes} lượt thích</span>
        </div>
        <div className="flex items-center space-x-4">
          <span>{post.stats.comments} bình luận</span>
          <span>{post.stats.shares} chia sẻ</span>
        </div>
      </div>

      {/* Post Actions */}
      <div className="px-4 py-2 border-t border-gray-200/50 flex items-center justify-around">
        <button
          onClick={handleLike}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all hover:bg-gray-100 ${
            isLiked ? "text-red-500" : "text-gray-600"
          }`}
        >
          <Heart className={`w-5 h-5 ${isLiked ? "fill-current" : ""}`} />
          <span className="hidden sm:inline">Thích</span>
        </button>

        <button
          onClick={handleToggleComments}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-all hover:bg-gray-100 text-gray-600"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="hidden sm:inline">Bình luận</span>
        </button>

        <button
          onClick={handleShare}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-all hover:bg-gray-100 text-gray-600"
        >
          <Share2 className="w-5 h-5" />
          <span className="hidden sm:inline">Chia sẻ</span>
        </button>

        <button
          onClick={handleToggleSave}
          className={`p-2 rounded-lg transition-all hover:bg-gray-100 ${
            isSaved ? "text-purple-500" : "text-gray-600"
          }`}
        >
          <Bookmark className={`w-5 h-5 ${isSaved ? "fill-current" : ""}`} />
        </button>
      </div>

      {/* Comments Section */}
      {showComments ? (
        <div className="px-4 pb-4 border-t border-gray-200/50 pt-4">
          <div className="flex space-x-3">
            <img
              src={`https://ui-avatars.com/api/?name=U&background=7c3aed&color=fff`}
              alt="Your avatar"
              className="w-8 h-8 rounded-full object-cover"
            />
            <div className="flex-1 flex space-x-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Viết bình luận..."
                className="flex-1 px-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500"
                onKeyDown={(e) => e.key === "Enter" && handleComment()}
              />
              <button
                onClick={handleComment}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full hover:shadow-lg transition-all"
              >
                Gửi
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
});

import { useState, useCallback, memo } from "react";
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Send } from "lucide-react";
import type { Post } from "./PostFeed";
import apiClient from "../../services/api";

interface PostCardProps {
  post: Post;
  onLike: (postId: string) => void;
  onComment: (postId: string, content?: string) => void;
  onShare: (postId: string) => void;
}

export const PostCard = memo(function PostCard({ post, onLike, onComment, onShare }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(post.is_liked ?? false);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [isSaved, setIsSaved] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<any[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);

  const handleLike = useCallback(() => {
    setIsLiked((prev) => !prev);
    setLikeCount((prev) => (isLiked ? prev - 1 : prev + 1));
    onLike(post.id);
  }, [post.id, isLiked, onLike]);

  const handleToggleComments = useCallback(async () => {
    const nextShow = !showComments;
    setShowComments(nextShow);

    // Lazy load comments khi mở lần đầu
    if (nextShow && !commentsLoaded) {
      try {
        const res = await apiClient.get(`/post/${post.id}/comments`);
        const data = res.data.data;
        setComments(data?.comments || data || []);
        setCommentsLoaded(true);
      } catch {
        // Fallback — comments sẽ trống
      }
    }
  }, [showComments, commentsLoaded, post.id]);

  const handleSubmitComment = useCallback(async () => {
    if (!commentText.trim()) return;
    try {
      const res = await apiClient.post(`/post/${post.id}/comment`, {
        content: commentText.trim(),
      });
      const newComment = res.data.data;
      if (newComment) {
        setComments((prev) => [...prev, newComment]);
      }
      onComment(post.id, commentText.trim());
      setCommentText("");
      setShowComments(true);
    } catch (err) {
      console.error("Lỗi gửi bình luận:", err);
    }
  }, [commentText, post.id, onComment]);

  const handleShare = useCallback(() => {
    onShare(post.id);
  }, [post.id, onShare]);

  const handleSave = useCallback(() => {
    setIsSaved((prev) => !prev);
  }, []);

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden hover:shadow-xl transition-all duration-300">
      {/* Post Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img
            src={post.author.avatar}
            alt={post.author.name}
            className="w-12 h-12 rounded-full object-cover ring-2 ring-purple-500/20"
          />
          <div>
            <h3 className="font-semibold text-gray-900">{post.author.name}</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span>{post.author.username}</span>
              <span>•</span>
              <span>{post.timestamp}</span>
            </div>
          </div>
        </div>
        <button className="p-2 hover:bg-gray-100 rounded-full transition-all">
          <MoreHorizontal className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Post Content */}
      <div className="px-4 pb-3">
        <p className="text-gray-800 whitespace-pre-wrap">{post.content}</p>
      </div>

      {/* Post Image */}
      {post.image ? (
        <div className="relative">
          <img
            src={post.image}
            alt="Post content"
            className="w-full object-cover max-h-[500px]"
            loading="lazy"
          />
        </div>
      ) : null}

      {/* Post Stats */}
      <div className="px-4 py-3 flex items-center justify-between text-sm text-gray-600">
        <div className="flex items-center space-x-2">
          <div className="flex -space-x-1">
            <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white text-xs">❤️</div>
            <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">👍</div>
          </div>
          <span>{likeCount} lượt thích</span>
        </div>
        <div className="flex items-center space-x-4">
          <span>{post.comments} bình luận</span>
          <span>{post.shares} chia sẻ</span>
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
          onClick={handleSave}
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
          {/* Loaded Comments */}
          {comments.length > 0 ? (
            <div className="space-y-3 mb-3">
              {comments.map((comment: any) => {
                const cAuthor = comment.user_id || comment.author_id || {};
                const cName = cAuthor.display_name || cAuthor.username || "Ẩn danh";
                const cAvatar = cAuthor.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(cName)}&background=7c3aed&color=fff&size=32`;
                return (
                  <div key={comment._id} className="flex space-x-3">
                    <img
                      src={cAvatar}
                      alt={cName}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div className="flex-1 bg-gray-100 rounded-2xl px-4 py-2">
                      <p className="font-semibold text-sm">{cName}</p>
                      <p className="text-sm text-gray-700">{comment.content}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {/* Add Comment */}
          <div className="flex space-x-3 items-center">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {(() => {
                try {
                  const u = JSON.parse(localStorage.getItem("userData") || "{}");
                  return (u.display_name || u.username || "U").charAt(0).toUpperCase();
                } catch {
                  return "U";
                }
              })()}
            </div>
            <div className="flex-1 flex space-x-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Viết bình luận..."
                className="flex-1 px-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmitComment();
                }}
              />
              <button
                onClick={handleSubmitComment}
                disabled={!commentText.trim()}
                className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
});

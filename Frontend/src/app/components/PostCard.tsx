import { useState, useCallback, memo } from "react";
import {
  Ban,
  Bookmark,
  Edit3,
  Flag,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Save,
  Send,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import apiClient from "../../services/api";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import type { IComment, IPost, IUser } from "../../types/models";

interface PostCardProps {
  post: IPost;
  onLike: (postId: string) => void;
  onCommentCreated: (postId: string) => void;
  onShare: (postId: string) => void;
  onPostUpdated: (post: IPost) => void;
  onPostDeleted: (postId: string) => void;
  onOpenProfile?: (userId: string) => void;
}

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

function getUserInfo(userValue: IUser | string | undefined) {
  if (!userValue || typeof userValue === "string") {
    return { id: "", name: "Người dùng", username: "user", avatar: "" };
  }

  return {
    id: userValue._id,
    name: userValue.display_name || userValue.username,
    username: `@${userValue.username}`,
    avatar:
      userValue.avatar_url ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(userValue.display_name || userValue.username)}&background=7c3aed&color=fff`,
  };
}

export const PostCard = memo(function PostCard({
  post,
  onLike,
  onCommentCreated,
  onShare,
  onPostUpdated,
  onPostDeleted,
  onOpenProfile,
}: PostCardProps) {
  const currentUser = useCurrentUser();
  const [isSaved, setIsSaved] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<IComment[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showTools, setShowTools] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(post.content || "");

  const author = getUserInfo(post.author_id as IUser | string);
  const isOwner = Boolean(currentUser?._id && author.id === currentUser._id);
  const openAuthorProfile = useCallback(() => {
    if (author.id) onOpenProfile?.(author.id);
  }, [author.id, onOpenProfile]);

  const loadComments = useCallback(async () => {
    if (commentsLoaded || isLoadingComments) return;
    try {
      setIsLoadingComments(true);
      const response = await apiClient.get(`/post/${post._id}/comments`);
      setComments(response.data.data?.comments || []);
      setCommentsLoaded(true);
    } catch (err) {
      console.error("Load comments failed:", err);
      toast.error("Không thể tải bình luận.");
    } finally {
      setIsLoadingComments(false);
    }
  }, [commentsLoaded, isLoadingComments, post._id]);

  const handleLike = useCallback(() => {
    onLike(post._id);
  }, [post._id, onLike]);

  const handleToggleComments = useCallback(() => {
    const nextValue = !showComments;
    setShowComments(nextValue);
    if (nextValue) void loadComments();
  }, [loadComments, showComments]);

  const handleComment = useCallback(async () => {
    const content = commentText.trim();
    if (!content) return;

    try {
      const response = await apiClient.post(`/post/${post._id}/comments`, { content });
      const createdComment = response.data.data;
      setComments((prev) => [createdComment, ...prev]);
      setCommentText("");
      setShowComments(true);
      setCommentsLoaded(true);
      onCommentCreated(post._id);
    } catch (err) {
      console.error("Create comment failed:", err);
      toast.error("Không thể gửi bình luận.");
    }
  }, [commentText, onCommentCreated, post._id]);

  const handleSaveEdit = useCallback(async () => {
    const content = editText.trim();
    if (!content && post.media.length === 0) return;

    try {
      const response = await apiClient.patch(`/post/${post._id}`, { content });
      onPostUpdated(response.data.data);
      setIsEditing(false);
      toast.success("Đã cập nhật bài viết.");
    } catch (err) {
      console.error("Update post failed:", err);
      toast.error("Không thể cập nhật bài viết.");
    }
  }, [editText, onPostUpdated, post._id, post.media.length]);

  const handleDelete = useCallback(async () => {
    if (!window.confirm("Xóa bài viết này?")) return;

    try {
      await apiClient.delete(`/post/${post._id}`);
      onPostDeleted(post._id);
      toast.success("Đã xóa bài viết.");
    } catch (err) {
      console.error("Delete post failed:", err);
      toast.error("Không thể xóa bài viết.");
    }
  }, [onPostDeleted, post._id]);

  const handleReport = useCallback(async () => {
    const reason = window.prompt("Lý do báo cáo bài viết:", "spam");
    if (!reason?.trim()) return;

    try {
      await apiClient.post("/report", {
        target_type: "post",
        target_id: post._id,
        reason: reason.trim(),
      });
      toast.success("Đã gửi báo cáo.");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Không thể gửi báo cáo.");
    }
  }, [post._id]);

  const handleBlock = useCallback(async () => {
    if (!author.id || isOwner) return;
    if (!window.confirm(`Chặn ${author.name}?`)) return;

    try {
      await apiClient.post(`/follow/block/${author.id}`);
      toast.success("Đã cập nhật trạng thái chặn.");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Không thể chặn người dùng.");
    }
  }, [author.id, author.name, isOwner]);

  const handleShare = useCallback(() => {
    onShare(post._id);
  }, [onShare, post._id]);

  const currentUserName = currentUser?.display_name || currentUser?.username || "U";
  const currentUserAvatar =
    (currentUser as any)?.avatar_url ||
    currentUser?.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUserName)}&background=7c3aed&color=fff`;

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden hover:shadow-xl transition-all duration-300">
      <div className="p-4 flex items-center justify-between">
        <button
          type="button"
          onClick={openAuthorProfile}
          className="flex items-center space-x-3 rounded-xl text-left transition-colors hover:bg-gray-50"
        >
          <img src={author.avatar} alt={author.name} className="w-12 h-12 rounded-full object-cover ring-2 ring-purple-500/20" />
          <div>
            <h3 className="font-semibold text-gray-900">{author.name}</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span>{author.username}</span>
              <span>-</span>
              <span>{timeAgo(post.created_at)}</span>
            </div>
          </div>
        </button>
        <div className="relative">
          <button
            onClick={() => setShowTools((value) => !value)}
            aria-label="Tùy chọn bài viết"
            title="Tùy chọn bài viết"
            className="p-2 hover:bg-gray-100 rounded-full transition-all"
          >
            <MoreHorizontal className="w-5 h-5 text-gray-500" />
          </button>
          {showTools ? (
            <div className="absolute right-0 top-10 z-10 w-48 rounded-lg border border-gray-200 bg-white shadow-lg py-1">
              {isOwner ? (
                <>
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setShowTools(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Edit3 className="w-4 h-4" /> Sửa bài viết
                  </button>
                  <button
                    onClick={handleDelete}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> Xóa bài viết
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleReport}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Flag className="w-4 h-4" /> Báo cáo
                  </button>
                  <button
                    onClick={handleBlock}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                  >
                    <Ban className="w-4 h-4" /> Chặn người dùng
                  </button>
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div className="px-4 pb-3">
        {isEditing ? (
          <div className="space-y-3">
            <textarea
              value={editText}
              onChange={(event) => setEditText(event.target.value)}
              className="w-full min-h-24 rounded-lg border border-gray-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditText(post.content || "");
                }}
                className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 flex items-center gap-2"
              >
                <X className="w-4 h-4" /> Hủy
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-3 py-2 rounded-lg bg-purple-600 text-white flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> Lưu
              </button>
            </div>
          </div>
        ) : post.content ? (
          <p className="text-gray-800 whitespace-pre-wrap">{post.content}</p>
        ) : null}
      </div>

      {post.media?.length > 0 ? (
        <div className="relative">
          {post.media.length === 1 ? (
            <img src={post.media[0].url} alt={post.media[0].alt_text || "Post content"} className="w-full object-cover max-h-[500px]" />
          ) : (
            <div className="grid grid-cols-2 gap-1">
              {post.media.map((item, idx) => (
                <img key={`${item.url}-${idx}`} src={item.url} alt={item.alt_text || `Media ${idx + 1}`} className="w-full h-48 object-cover" />
              ))}
            </div>
          )}
        </div>
      ) : null}

      <div className="px-4 py-3 flex items-center justify-between text-sm text-gray-600">
        <span>{post.stats.likes} lượt thích</span>
        <div className="flex items-center space-x-4">
          <span>{post.stats.comments} bình luận</span>
          <span>{post.stats.shares} chia sẻ</span>
        </div>
      </div>

      <div className="px-4 py-2 border-t border-gray-200/50 flex items-center justify-around">
        <button
          onClick={handleLike}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all hover:bg-gray-100 ${
            post.is_liked ? "text-red-500" : "text-gray-600"
          }`}
        >
          <Heart className={`w-5 h-5 ${post.is_liked ? "fill-current" : ""}`} />
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
          onClick={() => setIsSaved((value) => !value)}
          aria-label={isSaved ? "Bỏ lưu bài viết" : "Lưu bài viết"}
          title={isSaved ? "Bỏ lưu bài viết" : "Lưu bài viết"}
          className={`p-2 rounded-lg transition-all hover:bg-gray-100 ${
            isSaved ? "text-purple-500" : "text-gray-600"
          }`}
        >
          <Bookmark className={`w-5 h-5 ${isSaved ? "fill-current" : ""}`} />
        </button>
      </div>

      {showComments ? (
        <div className="px-4 pb-4 border-t border-gray-200/50 pt-4 space-y-4">
          <div className="flex space-x-3">
            <img src={currentUserAvatar} alt="Your avatar" className="w-8 h-8 rounded-full object-cover" />
            <div className="flex-1 flex space-x-2">
              <input
                type="text"
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                placeholder="Viết bình luận..."
                className="flex-1 px-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500"
                onKeyDown={(event) => {
                  if (event.key === "Enter") void handleComment();
                }}
              />
              <button
                onClick={() => void handleComment()}
                aria-label="Gửi bình luận"
                title="Gửi bình luận"
                className="px-3 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

          {isLoadingComments ? (
            <div className="text-sm text-gray-500">Đang tải bình luận...</div>
          ) : comments.length === 0 ? (
            <div className="text-sm text-gray-500">Chưa có bình luận nào.</div>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => {
                const commentAuthor = getUserInfo(comment.author_id as IUser | string);
                return (
                  <div key={comment._id} className="flex gap-2">
                    <button type="button" onClick={() => commentAuthor.id && onOpenProfile?.(commentAuthor.id)}>
                      <img src={commentAuthor.avatar} alt={commentAuthor.name} className="w-8 h-8 rounded-full object-cover" />
                    </button>
                    <div className="rounded-2xl bg-gray-100 px-3 py-2">
                      <div className="text-sm font-semibold text-gray-900">{commentAuthor.name}</div>
                      <div className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
});

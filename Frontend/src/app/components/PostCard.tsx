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
import { useLangText } from "../../hooks/useLangText";
import type { IComment, IPost, IUser } from "../../types/models";

interface PostCardProps {
  post: IPost;
  onLike: (postId: string) => void;
  onCommentCreated: (postId: string) => void;
  onShare: (postId: string) => void;
  onPostUpdated: (post: IPost) => void;
  onPostDeleted: (postId: string) => void;
  onOpenProfile?: (userId: string) => void;
  isHighlighted?: boolean;
}

function timeAgo(dateStr: string, text: (vi: string, en: string) => string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return text("Vừa xong", "Just now");
  if (minutes < 60) return text(`${minutes} phút trước`, `${minutes} minutes ago`);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return text(`${hours} giờ trước`, `${hours} hours ago`);
  const days = Math.floor(hours / 24);
  if (days < 7) return text(`${days} ngày trước`, `${days} days ago`);
  return new Date(dateStr).toLocaleDateString(text("vi-VN", "en-US"));
}

function getUserInfo(userValue: IUser | string | undefined, text: (vi: string, en: string) => string) {
  if (!userValue || typeof userValue === "string") {
    return { id: "", name: text("Người dùng", "User"), username: "user", avatar: "" };
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
  isHighlighted = false,
}: PostCardProps) {
  const currentUser = useCurrentUser();
  const text = useLangText();
  const [isSaved, setIsSaved] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<IComment[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showTools, setShowTools] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(post.content || "");

  const author = getUserInfo(post.author_id as IUser | string, text);
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
      toast.error(text("Không thể tải bình luận.", "Could not load comments."));
    } finally {
      setIsLoadingComments(false);
    }
  }, [commentsLoaded, isLoadingComments, post._id, text]);

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
      toast.error(text("Không thể gửi bình luận.", "Could not send comment."));
    }
  }, [commentText, onCommentCreated, post._id, text]);

  const handleSaveEdit = useCallback(async () => {
    const content = editText.trim();
    if (!content && post.media.length === 0) return;

    try {
      const response = await apiClient.patch(`/post/${post._id}`, { content });
      onPostUpdated(response.data.data);
      setIsEditing(false);
      toast.success(text("Đã cập nhật bài viết.", "Post updated."));
    } catch (err) {
      console.error("Update post failed:", err);
      toast.error(text("Không thể cập nhật bài viết.", "Could not update post."));
    }
  }, [editText, onPostUpdated, post._id, post.media.length, text]);

  const handleDelete = useCallback(async () => {
    if (!window.confirm(text("Xóa bài viết này?", "Delete this post?"))) return;

    try {
      await apiClient.delete(`/post/${post._id}`);
      onPostDeleted(post._id);
      toast.success(text("Đã xóa bài viết.", "Post deleted."));
    } catch (err) {
      console.error("Delete post failed:", err);
      toast.error(text("Không thể xóa bài viết.", "Could not delete post."));
    }
  }, [onPostDeleted, post._id, text]);

  const handleReport = useCallback(async () => {
    const reason = window.prompt(text("Lý do báo cáo bài viết:", "Reason for reporting this post:"), "spam");
    if (!reason?.trim()) return;

    try {
      await apiClient.post("/report", {
        target_type: "post",
        target_id: post._id,
        reason: reason.trim(),
      });
      toast.success(text("Đã gửi báo cáo.", "Report submitted."));
    } catch (err: any) {
      toast.error(err.response?.data?.message || text("Không thể gửi báo cáo.", "Could not submit report."));
    }
  }, [post._id, text]);

  const handleBlock = useCallback(async () => {
    if (!author.id || isOwner) return;
    if (!window.confirm(text(`Chặn ${author.name}?`, `Block ${author.name}?`))) return;

    try {
      await apiClient.post(`/follow/block/${author.id}`);
      toast.success(text("Đã cập nhật trạng thái chặn.", "Block status updated."));
    } catch (err: any) {
      toast.error(err.response?.data?.message || text("Không thể chặn người dùng.", "Could not block user."));
    }
  }, [author.id, author.name, isOwner, text]);

  const handleShare = useCallback(() => {
    onShare(post._id);
  }, [onShare, post._id]);

  const currentUserName = currentUser?.display_name || currentUser?.username || "U";
  const currentUserAvatar =
    (currentUser as any)?.avatar_url ||
    currentUser?.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUserName)}&background=7c3aed&color=fff`;

  return (
    <div
      id={`post-${post._id}`}
      className={`bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border overflow-hidden hover:shadow-xl transition-all duration-300 ${
        isHighlighted ? "border-purple-400 ring-4 ring-purple-200" : "border-gray-200/50"
      }`}
    >
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
              <span>{timeAgo(post.created_at, text)}</span>
            </div>
          </div>
        </button>
        <div className="relative">
          <button
            onClick={() => setShowTools((value) => !value)}
            aria-label={text("Tùy chọn bài viết", "Post options")}
            title={text("Tùy chọn bài viết", "Post options")}
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
                    <Edit3 className="w-4 h-4" /> {text("Sửa bài viết", "Edit post")}
                  </button>
                  <button
                    onClick={handleDelete}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> {text("Xóa bài viết", "Delete post")}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleReport}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Flag className="w-4 h-4" /> {text("Báo cáo", "Report")}
                  </button>
                  <button
                    onClick={handleBlock}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                  >
                    <Ban className="w-4 h-4" /> {text("Chặn người dùng", "Block user")}
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
                <X className="w-4 h-4" /> {text("Hủy", "Cancel")}
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-3 py-2 rounded-lg bg-purple-600 text-white flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> {text("Lưu", "Save")}
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
            post.media[0].type === "video" ? (
              <video src={post.media[0].url} controls className="w-full max-h-[500px] bg-black" />
            ) : (
              <img src={post.media[0].url} alt={post.media[0].alt_text || "Post content"} className="w-full object-cover max-h-[500px]" />
            )
          ) : (
            <div className="grid grid-cols-2 gap-1">
              {post.media.map((item, idx) => (
                item.type === "video" ? (
                  <video key={`${item.url}-${idx}`} src={item.url} controls className="h-48 w-full bg-black object-cover" />
                ) : (
                  <img key={`${item.url}-${idx}`} src={item.url} alt={item.alt_text || `Media ${idx + 1}`} className="w-full h-48 object-cover" />
                )
              ))}
            </div>
          )}
        </div>
      ) : null}

      <div className="px-4 py-3 flex items-center justify-between text-sm text-gray-600">
        <span>{post.stats.likes} {text("lượt thích", "likes")}</span>
        <div className="flex items-center space-x-4">
          <span>{post.stats.comments} {text("bình luận", "comments")}</span>
          <span>{post.stats.shares} {text("chia sẻ", "shares")}</span>
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
          <span className="hidden sm:inline">{text("Thích", "Like")}</span>
        </button>
        <button
          onClick={handleToggleComments}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-all hover:bg-gray-100 text-gray-600"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="hidden sm:inline">{text("Bình luận", "Comment")}</span>
        </button>
        <button
          onClick={handleShare}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-all hover:bg-gray-100 text-gray-600"
        >
          <Share2 className="w-5 h-5" />
          <span className="hidden sm:inline">{text("Chia sẻ", "Share")}</span>
        </button>
        <button
          onClick={() => setIsSaved((value) => !value)}
          aria-label={isSaved ? text("Bỏ lưu bài viết", "Unsave post") : text("Lưu bài viết", "Save post")}
          title={isSaved ? text("Bỏ lưu bài viết", "Unsave post") : text("Lưu bài viết", "Save post")}
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
                placeholder={text("Viết bình luận...", "Write a comment...")}
                className="flex-1 px-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500"
                onKeyDown={(event) => {
                  if (event.key === "Enter") void handleComment();
                }}
              />
              <button
                onClick={() => void handleComment()}
                aria-label={text("Gửi bình luận", "Send comment")}
                title={text("Gửi bình luận", "Send comment")}
                className="px-3 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

          {isLoadingComments ? (
            <div className="text-sm text-gray-500">{text("Đang tải bình luận...", "Loading comments...")}</div>
          ) : comments.length === 0 ? (
            <div className="text-sm text-gray-500">{text("Chưa có bình luận nào.", "No comments yet.")}</div>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => {
                const commentAuthor = getUserInfo(comment.author_id as IUser | string, text);
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

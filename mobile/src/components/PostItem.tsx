import React, { memo, useCallback, useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  Bookmark,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Share2,
} from "lucide-react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "../api/client";
import { ENDPOINTS } from "../api/endpoints";
import { useAuth } from "../store/AuthContext";
import { palette } from "../theme";
import type { IComment, IPost, IUser } from "../types/models";

interface Props {
  post: IPost;
  onRefresh: () => void;
  onOpenProfile?: (userId: string) => void;
}

function PostItem({ post, onRefresh, onOpenProfile }: Props) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<IComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(post.content || "");
  const [localContent, setLocalContent] = useState(post.content || "");
  const [isLiked, setIsLiked] = useState(Boolean(post.is_liked));
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.stats?.likes || 0);
  const [commentsCount, setCommentsCount] = useState(post.stats?.comments || 0);

  const author = (
    typeof post.author_id === "object" ? post.author_id : null
  ) as IUser | null;
  const isOwner = Boolean(author?._id && (user as any)?._id === author._id);
  const authorName = author?.display_name || author?.username || "Người dùng";
  const authorAvatar =
    author?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=7c3aed&color=fff`;

  useEffect(() => {
    setIsLiked(Boolean(post.is_liked));
    setLikesCount(post.stats?.likes || 0);
    setCommentsCount(post.stats?.comments || 0);
    setLocalContent(post.content || "");
    setEditText(post.content || "");
  }, [
    post._id,
    post.content,
    post.is_liked,
    post.stats?.comments,
    post.stats?.likes,
  ]);

  const like = useCallback(async () => {
    const previousLiked = isLiked;
    const previousLikes = likesCount;
    const nextLiked = !previousLiked;
    setIsLiked(nextLiked);
    setLikesCount((prev) => Math.max(0, nextLiked ? prev + 1 : prev - 1));

    try {
      const res = await api.post(ENDPOINTS.REACT_POST(post._id));
      const data = res.data.data || res.data;
      if (typeof data.likes === "number") setLikesCount(data.likes);
      if (typeof data.is_liked === "boolean") setIsLiked(data.is_liked);
    } catch (e) {
      setIsLiked(previousLiked);
      setLikesCount(previousLikes);
      console.error("[PostItem] Like error:", e);
    }
  }, [isLiked, likesCount, post._id]);

  const loadComments = useCallback(async () => {
    try {
      setLoadingComments(true);
      const res = await api.get(ENDPOINTS.POST_COMMENTS(post._id));
      const fetchedComments =
        res.data.data?.comments ||
        (Array.isArray(res.data.data) ? res.data.data : []);
      setComments(fetchedComments);
    } catch (e) {
      console.error("[PostItem] Load comments error:", e);
    } finally {
      setLoadingComments(false);
    }
  }, [post._id]);

  const toggleComments = useCallback(() => {
    const nextShow = !showComments;
    setShowComments(nextShow);
    if (nextShow) void loadComments();
  }, [loadComments, showComments]);

  const submitComment = useCallback(async () => {
    if (!text.trim()) return;
    const commentText = text.trim();
    setText("");

    try {
      await api.post(ENDPOINTS.POST_COMMENTS(post._id), {
        content: commentText,
      });
      setCommentsCount((prev) => prev + 1);
      void loadComments();
      onRefresh();
    } catch (e) {
      console.error("[PostItem] Comment error:", e);
    }
  }, [loadComments, onRefresh, post._id, text]);

  const saveEdit = useCallback(async () => {
    const nextContent = editText.trim();
    if (!nextContent && post.media.length === 0) {
      Alert.alert("Sửa bài viết", "Nội dung không được để trống.");
      return;
    }

    try {
      await api.patch(ENDPOINTS.UPDATE_POST(post._id), {
        content: nextContent,
        visibility: post.visibility,
      });
      setLocalContent(nextContent);
      setIsEditing(false);
      onRefresh();
    } catch (e) {
      console.error("[PostItem] Update error:", e);
      Alert.alert("Sửa bài viết", "Không thể cập nhật bài viết.");
    }
  }, [editText, onRefresh, post._id, post.media.length, post.visibility]);

  const deletePost = useCallback(() => {
    Alert.alert("Xóa bài viết", "Bạn có chắc chắn muốn xóa bài viết này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(ENDPOINTS.DELETE_POST(post._id));
            onRefresh();
          } catch (e) {
            console.error("[PostItem] Delete error:", e);
            Alert.alert("Xóa bài viết", "Không thể xóa bài viết.");
          }
        },
      },
    ]);
  }, [onRefresh, post._id]);

  const reportPost = useCallback(async () => {
    try {
      await api.post(ENDPOINTS.REPORT, {
        target_type: "post",
        target_id: post._id,
        reason: "inappropriate",
        description: "Reported from mobile app",
      });
      Alert.alert("Báo cáo", "Đã gửi báo cáo bài viết.");
    } catch (e: any) {
      console.error("[PostItem] Report error:", e);
      Alert.alert(
        "Báo cáo",
        e.response?.data?.message || "Không thể báo cáo bài viết.",
      );
    }
  }, [post._id]);

  const blockAuthor = useCallback(() => {
    if (!author?._id) return;
    Alert.alert("Chặn người dùng", `Bạn có muốn chặn ${authorName}?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Chặn",
        style: "destructive",
        onPress: async () => {
          try {
            await api.post(ENDPOINTS.BLOCK_USER(author._id));
            Alert.alert("Chặn người dùng", "Đã cập nhật trạng thái chặn.");
            onRefresh();
          } catch (e) {
            console.error("[PostItem] Block error:", e);
            Alert.alert("Chặn người dùng", "Không thể chặn người dùng.");
          }
        },
      },
    ]);
  }, [author?._id, authorName, onRefresh]);

  const handleMorePress = useCallback(() => {
    if (isOwner) {
      Alert.alert("Tùy chọn bài viết", undefined, [
        { text: "Sửa bài viết", onPress: () => setIsEditing(true) },
        { text: "Xóa bài viết", style: "destructive", onPress: deletePost },
        { text: "Hủy", style: "cancel" },
      ]);
      return;
    }

    Alert.alert("Tùy chọn bài viết", undefined, [
      { text: "Báo cáo bài viết", onPress: reportPost },
      { text: "Chặn người dùng", style: "destructive", onPress: blockAuthor },
      { text: "Hủy", style: "cancel" },
    ]);
  }, [blockAuthor, deletePost, isOwner, reportPost]);

  const handleShare = useCallback(() => {
    Alert.alert("Chia sẻ", "Tính năng chia sẻ bài viết đang được phát triển.");
  }, []);

  const handleBookmark = useCallback(() => {
    const nextBookmarked = !isBookmarked;
    setIsBookmarked(nextBookmarked);
    Alert.alert(
      "Lưu bài viết",
      nextBookmarked ? "Đã lưu bài viết." : "Đã bỏ lưu bài viết.",
    );
  }, [isBookmarked]);

  return (
    <View style={styles.cardContainer}>
      <View style={styles.header}>
        <Pressable
          onPress={() => author?._id && onOpenProfile?.(author._id)}
          style={styles.userInfoRow}
        >
          <Image
            source={{ uri: authorAvatar }}
            style={styles.avatar}
            contentFit="cover"
          />
          <View style={styles.nameContainer}>
            <Text style={styles.displayName}>{authorName}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.username}>@{author?.username || "user"}</Text>
              <Text style={styles.bullet}>-</Text>
              <Text style={styles.timeText}>
                {new Date(post.created_at || Date.now()).toLocaleDateString(
                  "vi-VN",
                )}
              </Text>
            </View>
          </View>
        </Pressable>
        <Pressable onPress={handleMorePress} style={styles.moreBtn}>
          <MoreHorizontal color={palette.muted} size={20} />
        </Pressable>
      </View>

      {isEditing ? (
        <View style={styles.editContainer}>
          <TextInput
            value={editText}
            onChangeText={setEditText}
            multiline
            style={styles.editInput}
            placeholder="Cập nhật nội dung bài viết..."
            placeholderTextColor={palette.muted}
          />
          <View style={styles.editActions}>
            <Pressable
              onPress={() => {
                setEditText(localContent);
                setIsEditing(false);
              }}
              style={styles.editCancelBtn}
            >
              <Text style={styles.editCancelText}>Hủy</Text>
            </Pressable>
            <Pressable onPress={saveEdit} style={styles.editSaveBtn}>
              <Text style={styles.editSaveText}>Lưu</Text>
            </Pressable>
          </View>
        </View>
      ) : localContent ? (
        <View style={styles.contentContainer}>
          <Text style={styles.contentText}>{localContent}</Text>
        </View>
      ) : null}

      {post.media && post.media.length > 0 ? (
        <Image
          source={{ uri: post.media[0].url }}
          style={styles.mediaImage}
          contentFit="cover"
        />
      ) : null}

      <View style={styles.statsRow}>
        <View style={styles.likesStats}>
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.statEmojiBadge,
                { backgroundColor: palette.danger, zIndex: 2 },
              ]}
            >
              <Text style={styles.emojiText}>♥</Text>
            </View>
            <View
              style={[
                styles.statEmojiBadge,
                { backgroundColor: palette.accent, marginLeft: -6, zIndex: 1 },
              ]}
            >
              <Text style={styles.emojiText}>+</Text>
            </View>
          </View>
          <Text style={styles.statsText}>{likesCount} lượt thích</Text>
        </View>
        <View style={styles.otherStats}>
          <Text style={styles.statsText}>{commentsCount} bình luận</Text>
          <Text style={styles.statsText}>{post.stats?.shares || 0} chia sẻ</Text>
        </View>
      </View>

      <View style={styles.actionButtonsRow}>
        <Pressable onPress={like} style={styles.actionBtn}>
          <Heart
            color={isLiked ? palette.danger : palette.muted}
            size={22}
            fill={isLiked ? palette.danger : "none"}
          />
          <Text
            style={[styles.actionBtnText, isLiked ? styles.likedText : null]}
          >
            Thích
          </Text>
        </Pressable>
        <Pressable onPress={toggleComments} style={styles.actionBtn}>
          <MessageCircle color={palette.muted} size={22} />
          <Text style={styles.actionBtnText}>Bình luận</Text>
        </Pressable>
        <Pressable onPress={handleShare} style={styles.actionBtn}>
          <Share2 color={palette.muted} size={22} />
          <Text style={styles.actionBtnText}>Chia sẻ</Text>
        </Pressable>
        <Pressable onPress={handleBookmark} style={styles.bookmarkBtn}>
          <Bookmark
            color={isBookmarked ? palette.primary : palette.muted}
            size={22}
            fill={isBookmarked ? palette.primary : "none"}
          />
        </Pressable>
      </View>

      {showComments ? (
        <View style={styles.commentsSection}>
          <View style={styles.commentInputRow}>
            <Image
              source={{
                uri: `https://ui-avatars.com/api/?name=U&background=7c3aed&color=fff`,
              }}
              style={styles.commentAvatar}
            />
            <View style={styles.inputContainer}>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Viết bình luận..."
                placeholderTextColor={palette.muted}
                style={styles.input}
                onSubmitEditing={submitComment}
              />
              <Pressable onPress={submitComment} style={styles.sendBtnWrapper}>
                <LinearGradient
                  colors={[palette.primary, palette.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.sendBtn}
                >
                  <Text style={styles.sendBtnText}>Gửi</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>

          {loadingComments ? (
            <Text style={styles.loadingCommentsText}>Đang tải bình luận...</Text>
          ) : comments.length === 0 ? (
            <Text style={styles.noCommentsText}>
              Chưa có bình luận nào. Hãy là người đầu tiên.
            </Text>
          ) : (
            comments.map((comment) => {
              const commentAuthor = (
                typeof comment.author_id === "object"
                  ? comment.author_id
                  : null
              ) as IUser | null;
              const commentAuthorName =
                commentAuthor?.display_name ||
                commentAuthor?.username ||
                "Người dùng";
              const commentAuthorAvatar =
                commentAuthor?.avatar_url ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(commentAuthorName)}&background=7c3aed&color=fff`;
              return (
                <View key={comment._id} style={styles.commentRow}>
                  <Pressable
                    onPress={() => commentAuthor?._id && onOpenProfile?.(commentAuthor._id)}
                  >
                    <Image
                      source={{ uri: commentAuthorAvatar }}
                      style={styles.commentRowAvatar}
                    />
                  </Pressable>
                  <View style={styles.commentBubble}>
                    <Text style={styles.commentAuthorName}>
                      {commentAuthorName}
                    </Text>
                    <Text style={styles.commentContent}>{comment.content}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: palette.card,
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  userInfoRow: { flexDirection: "row", alignItems: "center", flex: 1 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "rgba(147, 51, 234, 0.2)",
  },
  nameContainer: { marginLeft: 12, flex: 1 },
  displayName: { fontWeight: "700", color: palette.ink, fontSize: 16 },
  metaRow: { flexDirection: "row", alignItems: "center" },
  username: { color: palette.muted, fontSize: 12 },
  bullet: { color: palette.muted, fontSize: 12, marginHorizontal: 4 },
  timeText: { color: palette.muted, fontSize: 12 },
  moreBtn: { padding: 8 },
  contentContainer: { paddingHorizontal: 16, paddingBottom: 12 },
  contentText: { color: palette.ink, fontSize: 15, lineHeight: 22 },
  editContainer: { paddingHorizontal: 16, paddingBottom: 12 },
  editInput: {
    minHeight: 88,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    color: palette.ink,
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: "top",
  },
  editActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 10,
  },
  editCancelBtn: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: "#f3f4f6",
  },
  editCancelText: { color: palette.ink, fontWeight: "600" },
  editSaveBtn: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: palette.primary,
  },
  editSaveText: { color: "#fff", fontWeight: "700" },
  mediaImage: { width: "100%", height: 300, backgroundColor: "#f3f4f6" },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  likesStats: { flexDirection: "row", alignItems: "center" },
  badgeRow: { flexDirection: "row", marginRight: 8 },
  statEmojiBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  statsText: { color: palette.muted, fontSize: 13 },
  otherStats: { flexDirection: "row", alignItems: "center", gap: 12 },
  actionButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: palette.line,
  },
  actionBtn: { flexDirection: "row", alignItems: "center", padding: 8 },
  actionBtnText: { color: palette.muted, marginLeft: 6, fontWeight: "500" },
  likedText: { color: palette.danger },
  bookmarkBtn: { padding: 8 },
  commentsSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: palette.line,
    backgroundColor: "rgba(249, 250, 251, 0.5)",
  },
  commentInputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  commentAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 12 },
  inputContainer: { flex: 1, flexDirection: "row", alignItems: "center" },
  input: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    color: palette.ink,
  },
  sendBtnWrapper: { marginLeft: 8 },
  sendBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  sendBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  loadingCommentsText: {
    textAlign: "center",
    color: palette.muted,
    paddingVertical: 12,
  },
  noCommentsText: {
    textAlign: "center",
    color: palette.muted,
    paddingVertical: 12,
    fontSize: 14,
  },
  commentRow: { flexDirection: "row", marginBottom: 12 },
  commentRowAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 8 },
  commentBubble: {
    backgroundColor: "#f3f4f6",
    borderRadius: 16,
    padding: 10,
    flexShrink: 1,
  },
  commentAuthorName: {
    fontWeight: "700",
    color: palette.ink,
    fontSize: 13,
    marginBottom: 2,
  },
  commentContent: { color: palette.ink, fontSize: 14 },
});

export default memo(PostItem);

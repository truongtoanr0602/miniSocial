import React, { useState, memo, useCallback } from "react";
import {
  Pressable,
  Text,
  TextInput,
  View,
  StyleSheet,
  Alert,
} from "react-native";
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreHorizontal,
} from "lucide-react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "../api/client";
import { ENDPOINTS } from "../api/endpoints";
import { palette } from "../theme";
import type { IPost, IUser, IComment } from "../types/models";

interface Props {
  post: IPost;
  onRefresh: () => void;
}

function PostItem({ post, onRefresh }: Props) {
  const [text, setText] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<IComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);

  // Optimistic UI for like
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.stats?.likes || 0);

  const author = (
    typeof post.author_id === "object" ? post.author_id : null
  ) as IUser | null;
  const authorName = author?.display_name || author?.username || "Người dùng";
  const authorAvatar =
    author?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=7c3aed&color=fff`;

  const like = async () => {
    const nextLiked = !isLiked;
    setIsLiked(nextLiked);
    setLikesCount((prev) => (nextLiked ? prev + 1 : prev - 1));
    try {
      await api.post(ENDPOINTS.REACT_POST(post._id));
      onRefresh();
    } catch (e) {
      // Rollback
      setIsLiked(isLiked);
      setLikesCount(likesCount);
      console.error("[PostItem] Like error:", e);
    }
  };

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

  const toggleComments = () => {
    const nextShow = !showComments;
    setShowComments(nextShow);
    if (nextShow) {
      loadComments();
    }
  };

  const submitComment = async () => {
    if (!text.trim()) return;
    const commentText = text.trim();
    setText("");
    try {
      // Backend expects: content
      await api.post(ENDPOINTS.POST_COMMENTS(post._id), {
        content: commentText,
      });
      loadComments();
      onRefresh();
    } catch (e) {
      console.error("[PostItem] Comment error:", e);
    }
  };

  const handleMorePress = useCallback(() => {
    Alert.alert(
      "Tùy chọn bài viết",
      "Các tùy chọn bổ sung sẽ sớm được cập nhật.",
    );
  }, []);

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
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.userInfoRow}>
          <Image
            source={{ uri: authorAvatar }}
            style={styles.avatar}
            contentFit="cover"
          />
          <View style={styles.nameContainer}>
            <Text style={styles.displayName}>{authorName}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.username}>@{author?.username || "user"}</Text>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.timeText}>
                {new Date(post.created_at || Date.now()).toLocaleDateString(
                  "vi-VN",
                )}
              </Text>
            </View>
          </View>
        </View>
        <Pressable onPress={handleMorePress} style={styles.moreBtn}>
          <MoreHorizontal color={palette.muted} size={20} />
        </Pressable>
      </View>

      {/* Content */}
      {post.content ? (
        <View style={styles.contentContainer}>
          <Text style={styles.contentText}>{post.content}</Text>
        </View>
      ) : null}

      {/* Media */}
      {post.media && post.media.length > 0 ? (
        <Image
          source={{ uri: post.media[0].url }}
          style={styles.mediaImage}
          contentFit="cover"
        />
      ) : null}

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.likesStats}>
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.statEmojiBadge,
                { backgroundColor: palette.danger, zIndex: 2 },
              ]}
            >
              <Text style={styles.emojiText}>❤️</Text>
            </View>
            <View
              style={[
                styles.statEmojiBadge,
                { backgroundColor: palette.accent, marginLeft: -6, zIndex: 1 },
              ]}
            >
              <Text style={styles.emojiText}>👍</Text>
            </View>
          </View>
          <Text style={styles.statsText}>{likesCount} lượt thích</Text>
        </View>
        <View style={styles.otherStats}>
          <Text style={styles.statsText}>
            {post.stats?.comments || 0} bình luận
          </Text>
          <Text style={styles.statsText}>
            {post.stats?.shares || 0} chia sẻ
          </Text>
        </View>
      </View>

      {/* Actions */}
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

      {/* Comments Section */}
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
            <Text style={styles.loadingCommentsText}>
              Đang tải bình luận...
            </Text>
          ) : comments.length === 0 ? (
            <Text style={styles.noCommentsText}>
              Chưa có bình luận nào. Hãy là người đầu tiên! 💬
            </Text>
          ) : (
            comments.map((c) => {
              const cAuthor = (
                typeof c.author_id === "object" ? c.author_id : null
              ) as IUser | null;
              const cAuthorName =
                cAuthor?.display_name || cAuthor?.username || "Người dùng";
              const cAuthorAvatar =
                cAuthor?.avatar_url ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(cAuthorName)}&background=7c3aed&color=fff`;
              return (
                <View key={c._id} style={styles.commentRow}>
                  <Image
                    source={{ uri: cAuthorAvatar }}
                    style={styles.commentRowAvatar}
                  />
                  <View style={styles.commentBubble}>
                    <Text style={styles.commentAuthorName}>{cAuthorName}</Text>
                    <Text style={styles.commentContent}>{c.content}</Text>
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
    borderRadius: 24,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
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
  userInfoRow: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "rgba(147, 51, 234, 0.2)",
  },
  nameContainer: { marginLeft: 12 },
  displayName: { fontWeight: "700", color: palette.ink, fontSize: 16 },
  metaRow: { flexDirection: "row", alignItems: "center" },
  username: { color: palette.muted, fontSize: 12 },
  bullet: { color: palette.muted, fontSize: 12, marginHorizontal: 4 },
  timeText: { color: palette.muted, fontSize: 12 },
  moreBtn: { padding: 8 },
  contentContainer: { paddingHorizontal: 16, paddingBottom: 12 },
  contentText: { color: palette.ink, fontSize: 15, lineHeight: 22 },
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
  emojiText: { fontSize: 10 },
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

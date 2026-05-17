import type { Request, Response } from 'express';
import PostModel from '../models/postModel.js';
// Import các Model khác (Bạn nhớ tạo các file này nếu chưa có nhé)
// import CommentModel from '../models/commentModel.js';
// import NotificationModel from '../models/notificationModel.js';
import { uploadAndCompressImage } from '../services/minioService.js';
import { successResponse, errorResponse } from "../utils/response.js";
// import { emitNotification } from "../services/socketService.js";

// ==========================================
// HÀM TIỆN ÍCH
// ==========================================
// Tự động tìm các từ khóa có dấu # trong bài viết
function extractHashtags(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/#[a-zA-Z0-9_]+/g) || [];
  return [...new Set(matches.map((t) => t.toLowerCase()))];
}

// ==========================================
// 1. API TẠO BÀI VIẾT (Tích hợp MinIO + WebP)
// ==========================================
export const createPost = async (req: Request, res: Response): Promise<void> => {
  try {
    const { content, visibility } = req.body;
    let { hashtags } = req.body;
    
    const author_id = (req as any).userId; 

    // Xử lý Hashtag: Nếu người dùng gửi lên thì dùng, không thì tự động quét trong nội dung chữ
    let parsedHashtags: string[] = [];
    if (hashtags) {
        try {
            parsedHashtags = JSON.parse(hashtags);
        } catch {
            parsedHashtags = typeof hashtags === 'string' ? hashtags.split(',').map(h => h.trim()) : hashtags;
        }
    } else if (content) {
        parsedHashtags = extractHashtags(content);
    }

    // Xử lý File Media (Nén ảnh WebP)
    const mediaItems: { url: string, type: 'image' | 'video', alt_text?: string }[] = [];

    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      for (const file of req.files) {
        const isVideo = file.mimetype.startsWith('video/');
        
        if (isVideo) {
            // Xử lý video ở đây sau
        } else {
            // Nén sang WebP bằng Sharp rồi đẩy lên MinIO
            const url = await uploadAndCompressImage(file.buffer);
            mediaItems.push({ url, type: 'image' });
        }
      }
    }

    if (!content && mediaItems.length === 0) {
      errorResponse(req, res, "post.MISSING_CONTENT", 400, "MISSING_CONTENT");
      return;
    }

    // Lưu vào Database
    const post = await PostModel.create({
      author_id,
      content,
      hashtags: parsedHashtags || [],
      media: mediaItems,
      visibility: visibility || 'public'
    });

    // Populate thông tin người đăng để trả về Frontend hiện ngay lập tức
    const populatedPost = await PostModel.findById(post._id).populate(
      "author_id",
      "username display_name avatar_url" // Trả về các trường thông tin cơ bản của User
    );

    successResponse(req, res, populatedPost, "post.CREATED", 201, "CREATED"); 

  } catch (error: any) {
    console.error("Lỗi tạo bài viết:", error);
    errorResponse(req, res, "post.CREATE_FAILED", 500, "CREATE_FAILED");
  }
};

// ==========================================
// 2. API LẤY BẢNG TIN (NEWSFEED)
// ==========================================
export const getNewsfeed = async (req: Request, res: Response): Promise<void> => {
    try {
        // Lấy danh sách bài viết mới nhất
        const posts = await PostModel.find({ visibility: { $ne: 'private' } }) // Không lấy bài private của người khác
            .sort({ created_at: -1 })
            .populate("author_id", "username display_name avatar_url")
            .lean();

        // 💡 Tạm thời comment logic lấy Comment để test post trước. 
        // Khi nào code xong CommentModel thì bạn mở ra nhé.
        /*
        const postIds = posts.map((p) => p._id);
        const comments = await CommentModel.find({ post: { $in: postIds } })
            .populate("user", "username display_name avatarUrl")
            .sort({ created_at: 1 })
            .lean();

        const commentsByPost = comments.reduce((acc: any, c: any) => {
            const key = String(c.post);
            if (!acc[key]) acc[key] = [];
            acc[key].push(c);
            return acc;
        }, {});

        const merged = posts.map((post) => ({
            ...post,
            comments: commentsByPost[String(post._id)] || [],
        }));
        */

        successResponse(req, res, posts, "post.GET_SUCCESS", 200, "GET_SUCCESS");
    } catch (error: any) {
        console.error("Lỗi lấy bảng tin:", error);
        errorResponse(req, res, "common.SERVER_ERROR", 500, "SERVER_ERROR");
    }
}

// ==========================================
// 3. API TƯƠNG TÁC (REACT / LIKE)
// ==========================================
export const reactToPost = async (req: Request, res: Response): Promise<void> => {
    // Logic này sẽ phụ thuộc vào việc bạn lưu reactions vào một collection riêng
    // hay lưu trực tiếp vào mảng trong PostSchema. 
    // Tạm thời mình setup khung chuẩn để bạn làm tiếp.
    try {
        const { postId } = req.params;
        const post = await PostModel.findById(postId);
        
        if (!post) {
            errorResponse(req, res, "post.NOT_FOUND", 404, "NOT_FOUND");
            return;
        }

        // Tăng chỉ số stats.likes lên 1 (Dựa theo Schema của bạn)
        post.stats.likes += 1;
        await post.save();

        successResponse(req, res, { likes: post.stats.likes }, "post.REACT_SUCCESS", 200, "REACT_SUCCESS");
    } catch (error: any) {
        errorResponse(req, res, "common.SERVER_ERROR", 500, "SERVER_ERROR");
    }
}
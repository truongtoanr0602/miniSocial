import express from 'express';
import multer from 'multer';
import { createPost, getNewsfeed } from '../controllers/postController.js';
import { reactToPost } from '../controllers/reactionController.js';
import { getPersonalFeed } from '../controllers/feedController.js';
import { createComment, getComments, getReplies, deleteComment } from '../controllers/commentController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();
// Dùng memoryStorage để lưu file trên RAM, sau đó Sharp nén xong mới đẩy đi
const upload = multer({ storage: multer.memoryStorage() }); 

// GET /api/post/feed — Personal feed (bài viết từ người follow + chính mình)
router.get('/feed', verifyToken, getPersonalFeed);

// GET /api/post/explore — Global feed (tất cả bài public)
router.get('/explore', verifyToken, getNewsfeed);

// POST /api/post/createPost — Tạo bài viết mới
router.post('/createPost', verifyToken, upload.array('images', 5), createPost);

// POST /api/post/:postId/react — Like/react bài viết
router.post('/:postId/react', verifyToken, reactToPost);

// ── Comment Routes ──
// POST /api/post/:postId/comments — Tạo comment
router.post('/:postId/comments', verifyToken, createComment);

// GET /api/post/:postId/comments — Lấy comments
router.get('/:postId/comments', verifyToken, getComments);

// GET /api/post/:postId/comments/:commentId/replies — Lấy replies
router.get('/:postId/comments/:commentId/replies', verifyToken, getReplies);

// DELETE /api/post/:postId/comments/:commentId — Xóa comment
router.delete('/:postId/comments/:commentId', verifyToken, deleteComment);

export default router;
import express from 'express';
import multer from 'multer';
import { verifyToken } from '../middleware/authMiddleware.js';
import { getUserProfile, updateProfile, getSuggestedUsers, getMyProfile } from '../controllers/userController.js';
import { toggleFollow } from '../controllers/followController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// 0. Lấy profile của chính mình
router.get('/me', verifyToken, getMyProfile);

// 1. Gợi ý kết bạn
router.get('/suggested', verifyToken, getSuggestedUsers);

// 2. Xem Profile (Bất kỳ ai có token đều xem được)
router.get('/profile/:id', verifyToken, getUserProfile);

// 3. Cập nhật Profile (Chỉ cho phép up 1 ảnh với field name là 'avatar')
router.put('/update', verifyToken, upload.single('avatar'), updateProfile);

// 4. Follow / Unfollow
router.post('/follow/:targetId', verifyToken, toggleFollow);

export default router;
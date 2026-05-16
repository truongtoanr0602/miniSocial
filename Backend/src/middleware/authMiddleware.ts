import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const verifyToken = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // 1. Lấy token từ header Authorization (Bearer <token>)
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ 
        success: false, 
        message: "Truy cập bị từ chối! Không tìm thấy Token." 
      });
      return;
    }

    // Lấy phần mã phía sau chữ "Bearer "
    const token = authHeader.split(' ')[1];
    if (!token) {
      res.status(401).json({ 
        success: false, 
        message: "Định dạng Token không hợp lệ!" 
      });
      return; // Bắt buộc phải có return ở đây
    }

    // 2. Giải mã Token — PHẢI dùng cùng secret key với authController.login
    const decoded = jwt.verify(token, env.jwtSecret) as any;

    // 3. Gắn ID vào req để Controller (createPost) có thể lấy ra dùng
    // Vì token của bạn chứa "userId" (theo ảnh Postman), ta sẽ lấy decoded.userId
    (req as any).userId = decoded.userId;

    // 4. Cho phép đi tiếp vào hàm tạo bài viết
    next();
  } catch (error) {
    console.error("Lỗi xác thực Token:", error);
    res.status(401).json({ 
      success: false, 
      message: "Token không hợp lệ hoặc đã hết hạn!" 
    });
  }
};
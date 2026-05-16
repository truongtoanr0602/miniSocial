import multer from "multer";

// ─── Storage: dùng memoryStorage (lưu vào RAM, KHÔNG ghi file ra ổ cứng) ───
// File buffer sẽ được truyền sang Sharp để nén WebP rồi upload lên MinIO.
const storage = multer.memoryStorage();

// ─── Bộ lọc loại file cho phép ───
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];
const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
];
const ALLOWED_DOC_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "text/plain",
];
const ALLOWED_FILE_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_VIDEO_TYPES,
  ...ALLOWED_DOC_TYPES,
];

const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  if (ALLOWED_FILE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Loại file không được hỗ trợ: ${file.mimetype}`));
  }
};

// ─── Export middleware ───
// Sử dụng memoryStorage: file.buffer sẵn sàng để truyền vào Sharp / MinIO
export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // Giới hạn 10 MB
  },
});

// Helper để kiểm tra file có phải ảnh không
export const isImageFile = (mimetype: string): boolean => {
  return ALLOWED_IMAGE_TYPES.includes(mimetype);
};

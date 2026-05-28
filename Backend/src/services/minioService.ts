import * as Minio from 'minio';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env.js';

// 1. Cấu hình MinIO Client — đọc từ env, không hardcode credentials
export const minioClient = new Minio.Client({
  endPoint: env.minioEndpoint,
  port: env.minioPort,
  useSSL: false,
  accessKey: env.minioAccessKey,
  secretKey: env.minioSecretKey,
});

const BUCKET_NAME = 'social-media-posts';

function getPublicObjectUrl(fileName: string): string {
  return `${env.minioPublicUrl}/${BUCKET_NAME}/${fileName}`;
}

/**
 * Đảm bảo bucket tồn tại. Chạy 1 lần khi server khởi động.
 */
async function ensureBucket(): Promise<void> {
  const exists = await minioClient.bucketExists(BUCKET_NAME);
  if (!exists) {
    await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');
    // Set policy cho phép public read (để Frontend xem được ảnh)
    const policy = {
      Version: "2012-10-17",
      Statement: [{
        Action: ["s3:GetObject"],
        Effect: "Allow",
        Principal: "*",
        Resource: [`arn:aws:s3:::${BUCKET_NAME}/*`]
      }]
    };
    await minioClient.setBucketPolicy(BUCKET_NAME, JSON.stringify(policy));
  }
}

// Khởi tạo bucket ngay khi module được import
ensureBucket().catch(err => console.error("❌ MinIO bucket init error:", err));

/**
 * Nén ảnh sang WebP và upload lên MinIO.
 * Luồng bắt buộc: Multer (memoryStorage) → Sharp (WebP) → MinIO
 * @param fileBuffer - Buffer từ multer memoryStorage (req.file.buffer)
 * @returns URL public của ảnh trên MinIO
 */
export const uploadAndCompressImage = async (fileBuffer: Buffer): Promise<string> => {
  // BƯỚC NÉN WEBP: Đổi sang webp và nén chất lượng còn 80%
  const webpBuffer = await sharp(fileBuffer)
    .webp({ quality: 80 })
    .toBuffer();

  const fileName = `${uuidv4()}.webp`;

  // BƯỚC UPLOAD lên MinIO
  await minioClient.putObject(BUCKET_NAME, fileName, webpBuffer, webpBuffer.length, {
    'Content-Type': 'image/webp'
  });

  // Trả về URL public client truy cập được để lưu vào MongoDB.
  return getPublicObjectUrl(fileName);
};

/**
 * Upload file thô (không nén — dùng cho PDF, video, documents).
 * @param fileBuffer - Buffer từ multer memoryStorage
 * @param originalName - Tên gốc để lấy extension
 * @param mimetype - MIME type gốc
 * @returns URL public trên MinIO
 */
export const uploadRawFile = async (
  fileBuffer: Buffer,
  originalName: string,
  mimetype: string,
): Promise<string> => {
  const ext = originalName.split('.').pop() || 'bin';
  const fileName = `${uuidv4()}.${ext}`;

  await minioClient.putObject(BUCKET_NAME, fileName, fileBuffer, fileBuffer.length, {
    'Content-Type': mimetype,
  });

  return getPublicObjectUrl(fileName);
};

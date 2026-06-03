import dotenv from "dotenv";
dotenv.config();

const minioEndpoint = process.env.MINIO_ENDPOINT || "localhost";
const minioPort = parseInt(process.env.MINIO_PORT || "9000");
const googleClientIds = [
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_ANDROID_CLIENT_ID,
  process.env.GOOGLE_IOS_CLIENT_ID,
].filter((clientId): clientId is string => Boolean(clientId));

export const env = {
  port: process.env.PORT || 3000,
  mongoUri: process.env.DATABASE_URL || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/MiniSocailDB",
  jwtSecret: process.env.JWT_SECRET || "dev_secret",
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  googleClientIds,
  minioEndpoint,
  minioPort,
  minioPublicUrl: (process.env.MINIO_PUBLIC_URL || `http://${minioEndpoint}:${minioPort}`).replace(/\/+$/, ""),
  minioAccessKey: process.env.MINIO_ACCESS_KEY || "admin",
  minioSecretKey: process.env.MINIO_SECRET_KEY || "password123",
};

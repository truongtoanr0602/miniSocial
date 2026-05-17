import "dotenv/config";
import type { Request, Response } from "express";
import express from "express";
import mongoose from "mongoose";
import http from "http";
import cors from "cors";

import authRoutes from "./routes/authRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import conversationRoutes from "./routes/conversationRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import followRoutes from "./routes/followRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
import * as middleware from "i18next-http-middleware";
import { env } from "./config/env.js";
import i18next from "./config/i18n.js";
import { initializeSocket } from "./sockets/index.js";

const app = express();
const PORT = env.port || 3000;
const MONGO_URI = env.mongoUri;

const server = http.createServer(app);

// Khởi tạo Socket.IO
initializeSocket(server);

app.use(
  cors({
    origin: function (origin, callback) {
      // Cho phép: no-origin (mobile app, Postman), localhost, LAN IPs (192.168.x.x, 10.x.x.x)
      if (
        !origin ||
        /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+)(:\d+)?$/.test(origin)
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

// Middleware phải được setup trước các routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// GẮN CÁC ĐƯỜNG DẪN API VÀO ĐÂY

app.use(middleware.handle(i18next));

app.use("/api/auth", authRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/post", postRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/follow", followRoutes);
app.use("/api/users", userRoutes);
app.use("/api/search", searchRoutes);


app.get("/api/test", (req: Request, res: Response) => {
  res.status(200).json({ message: "MiniSocial API đang chạy mượt mà! 🚀" });
});

// Catch-all route cho 404 errors
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: "Route không tồn tại", path: req.path });
});

// Bắt đầu server ngay lập tức
server.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `❌ Port ${PORT} đang bị chiếm dụng. Vui lòng tắt process cũ rồi thử lại.`,
    );
    process.exit(1);
  } else {
    throw err;
  }
});

// Kết nối MongoDB (không phải chặn server)
mongoose
  .connect(MONGO_URI as string)
  .then(() => {
    console.log("✅ Đã kết nối thành công tới MongoDB!");
  })
  .catch((err) => {
    console.error("❌ Lỗi kết nối Database:", err);
  });

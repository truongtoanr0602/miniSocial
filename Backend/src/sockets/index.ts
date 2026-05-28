import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { setIo, setUserOnline, setUserOffline } from "./state.js";
import { authMiddleware } from "./middleware.js";
import { registerChatHandlers } from "./chatHandlers.js";
import { registerNotificationHandlers } from "./notificationHandlers.js";
import { flushPendingDeliveries } from "./helpers.js";
import type { AuthenticatedSocket } from "./types.js";

// Re-export mọi thứ cần dùng bên ngoài module
export { getIo, getReceiverSocketId } from "./state.js";
export type { ConnectedUsers, AuthenticatedSocket } from "./types.js";

// ─────────────────────────────────────────────
// Khởi tạo Socket.IO server
// ─────────────────────────────────────────────
export function initializeSocket(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: function (origin, callback) {
        // Cho phép: no-origin (mobile app), localhost, LAN IPs
        if (
          !origin ||
          /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+)(:\d+)?$/.test(
            origin,
          )
        ) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true,
      methods: ["GET", "POST"],
    },
  });

  // Lưu instance vào state
  setIo(io);

  // ── Middleware ──
  io.use(authMiddleware);

  // ── Connection handler ──
  io.on("connection", (socket) => {
    const s = socket as AuthenticatedSocket;
    const userId = s.data.userId;
    console.log(`[Socket] Connected: ${userId} (${s.id})`);

    // 1. Đăng ký user online`
    setUserOnline(userId, s.id);

    // 2. Flush tin nhắn chưa deliver khi user online lại
    flushPendingDeliveries(userId);

    // 3. Đăng ký các handler theo domain
    registerChatHandlers(s);
    registerNotificationHandlers(s);
    // Thêm handler mới ở đây, ví dụ:
    // registerPresenceHandlers(s);

    // ── Disconnect ──
    s.on("disconnect", () => {
      console.log(`[Socket] Disconnected: ${userId}`);
      setUserOffline(userId);
    });
  });

  return io;
}

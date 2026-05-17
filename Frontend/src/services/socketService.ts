import { io, Socket } from "socket.io-client";
import { getValidToken } from "../hooks/useCurrentUser";
import env from "../config/env";

// ─── Singleton Socket.IO connection ───
// Rule: advanced-init-once — init 1 lần duy nhất, không tái tạo khi StrictMode double-mount

let socket: Socket | null = null;

/**
 * Lấy socket instance (singleton pattern).
 * Socket sẽ KHÔNG tự connect — phải gọi connectSocket() riêng.
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(env.SERVER_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return socket;
}

/**
 * Kết nối socket với token hiện tại.
 * Gọi sau khi user đăng nhập thành công.
 */
export function connectSocket(): void {
  const token = getValidToken();
  if (!token) return;

  const s = getSocket();

  // Gắn token vào auth handshake
  s.auth = { token };

  if (!s.connected) {
    s.connect();
  }
}

/**
 * Ngắt kết nối socket.
 * Gọi khi user đăng xuất.
 */
export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect();
  }
}

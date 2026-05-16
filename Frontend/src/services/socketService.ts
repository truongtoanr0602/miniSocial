import { io, Socket } from "socket.io-client";
import { getValidToken } from "../hooks/useCurrentUser";

// ─── Singleton Socket.IO connection ───
// Rule: advanced-init-once — init 1 lần duy nhất, không tái tạo khi StrictMode double-mount
const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";

let socket: Socket | null = null;

/**
 * Lấy socket instance (singleton pattern).
 * Socket sẽ KHÔNG tự connect — phải gọi connectSocket() riêng.
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(SERVER_URL, {
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

// ──────────────────────────────────────────
// Cấu hình cơ sở — tập trung 1 nơi duy nhất
// Khi đổi mạng WiFi, chỉ cần sửa ở đây
// ──────────────────────────────────────────

// Change this to your computer's local IP if it changes.
// For Android emulator use 10.0.2.2 instead of localhost.
const LOCAL_IP = "192.168.1.8";

export const BASE_URL = `http://${LOCAL_IP}:3000`;
export const API_BASE_URL = `${BASE_URL}/api`;

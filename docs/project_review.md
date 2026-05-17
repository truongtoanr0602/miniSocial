# 📋 MiniSocial — Báo cáo Review Toàn Dự Án

> **Thời điểm review:** 2026-05-17 | **Trạng thái tổng thể:** 🟡 Beta — Chạy được, còn nhiều điểm cần hoàn thiện

---

## 1. Tổng quan kiến trúc

```
miniSocial/
├── Backend/        Node.js + Express 5 + TypeScript + MongoDB + Socket.IO + MinIO
├── Frontend/       React 19 + Vite + TailwindCSS v4 + Shadcn/Radix UI
├── mobile/         React Native + Expo SDK 54 + React Navigation 7
└── docker-compose  MinIO only
```

**Stack chính xác, hiện đại** — Express 5, TypeScript trên cả 3 project, Expo SDK 54, FlashList đã được áp dụng đúng. Không còn file JS lẫn lộn.

---

## 2. Backend — Đánh giá chi tiết

### ✅ Điểm mạnh

| Hạng mục | Nhận xét |
|---|---|
| Cấu trúc thư mục | Rõ ràng: `controllers / routes / models / middleware / services / sockets` |
| TypeScript | Toàn bộ, kiểu rõ ràng, `IUser`, `IPost` interfaces đầy đủ |
| Auth | JWT 7 ngày, bcryptjs salt 10, Google OAuth tách biệt |
| Follow system | Đủ 9 endpoint, xử lý private account → pending request |
| Notification | Realtime qua Socket.IO, populate sender info, phân trang |
| Conversation / Chat | CRUD đầy đủ, soft delete, đánh dấu đã đọc realtime |
| MinIO | Nén WebP bằng Sharp, public bucket policy |
| i18n | Tích hợp `i18next-http-middleware`, response keys chuẩn |
| Socket.IO | Tách module: `state / middleware / chatHandlers / notificationHandlers` |

### ❌ Vấn đề nghiêm trọng

#### 1. CORS quá chặt với mobile
```typescript
// server.ts & sockets/index.ts — CHỈ cho phép localhost
/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
```
> ⚠️ **Mobile app (192.168.x.x) sẽ bị chặn hoàn toàn ở REST API!**  
> `socket.io` cũng bị block vì cùng regex. Đây là nguyên nhân gốc rễ của lỗi kết nối mobile.

#### 2. Không có route feed riêng — FeedController trống
```typescript
// feedController.ts → 0 byte (file rỗng)
// Nhưng mobile gọi: api.get("/post/feed") → GET /api/post/feed ✅ (route có)
// postController.getNewsfeed chỉ lấy public posts, không filter theo following
```
> Feed hiện tại là **global feed**, không phải personal feed theo người đã follow.

#### 3. Duplicate Follow logic — 2 chỗ cùng handle follow
- `userController.ts` → `toggleFollow` (dùng $push/$pull trên User model)
- `followController.ts` → `toggleFollow` (dùng Follow collection riêng)
- `userRoutes.ts` dùng `userController.toggleFollow`
- `followRoutes.ts` dùng `followController.toggleFollow`

> 2 hệ thống follow song song, **data không đồng bộ với nhau**. Follow Collection và User.following/followers sẽ mâu thuẫn.

#### 4. JWT Secret yếu trong production
```typescript
jwtSecret: process.env.JWT_SECRET || "dev_secret",
```
> `.env` có `JWT_SECRET=dev_secret` — cực kỳ yếu, dễ bị crack.

#### 5. Controller rỗng (empty files)
- `commentController.ts` — 0 byte
- `feedController.ts` — 0 byte  
- `reactionController.ts` — 0 byte
- `reportController.ts` — 0 byte

> Đây là các tính năng quan trọng chưa implement nhưng đã khai báo file.

#### 6. Avatar field không nhất quán
```typescript
// userModel.ts: field là avatar_url
// userController.updateProfile: cập nhật avatarUrl (thiếu underscore!)
...(avatarUrl && { avatarUrl })  // ← SAI, phải là avatar_url
```

#### 7. OTP không gửi thật
```
console.log("[MOCK SMS]") // SMS không được gửi
console.log("[MOCK EMAIL]") // Email không được gửi
```
> OTP chỉ in ra console — không có Nodemailer/Twilio integration.

#### 8. Không có rate limiting
Không có `express-rate-limit` trên bất kỳ route nào — dễ bị brute force OTP, login.

### ⚠️ Vấn đề nhỏ

- `swagger-jsdoc` / `swagger-ui-express` trong dependencies nhưng không được mount
- `bcrypt` và `bcryptjs` cùng tồn tại (dùng `bcryptjs` thôi là đủ)
- `@types/mongoose` là deprecated (mongoose tự có types từ v8+)
- `nodemon --exec tsx watch src/server.ts` — không cần `watch` khi dùng với `nodemon`
- Không có helmet middleware (security headers)

---

## 3. Frontend — Đánh giá chi tiết

### ✅ Điểm mạnh

| Hạng mục | Nhận xét |
|---|---|
| Stack | Vite + React 19 + TailwindCSS v4 |
| UI Library | Shadcn/Radix UI — accessible, customizable |
| Component Coverage | 15 components đầy đủ các màn hình |
| API Service | `apiClient` tập trung, interceptor tự động đính token |
| Auth | Token lưu `localStorage`, interceptor xóa khi 401 |
| Google OAuth | `@react-oauth/google` tích hợp đúng |
| i18n | `react-i18next` đã setup |
| Real-time | `socket.io-client` có |

### ❌ Vấn đề nghiêm trọng

#### 1. Token key không nhất quán
```typescript
// authService.ts: localStorage.setItem('userToken', ...)
// api.ts interceptor: localStorage.getItem('userToken') ✅
// Nhưng cần kiểm tra các component không dùng key khác
```

#### 2. Quá nhiều dependencies không cần thiết
Frontend có **74 dependencies** — nhiều package trùng chức năng:
- `framer-motion` + `motion` (2 animation library cùng vendor!)
- `react-router` + `react-router-dom` (chỉ cần 1)
- `@mui/material` + `Radix UI` (2 component library lớn — bundle bloat)
- `react-slick` + `embla-carousel-react` (2 carousel library)
- `react-dnd` nhưng không thấy drag/drop feature nào

#### 3. React và react-dom là peerDependencies optional
```json
"peerDependenciesMeta": {
  "react": { "optional": true }
}
```
> `react` là optional trong chính project frontend — đây là lỗi cấu hình copy từ library template.

#### 4. Vite override cứng trong pnpm
```json
"pnpm": { "overrides": { "vite": "6.3.5" } }
```
> Nhưng devDependencies có `"vite": "^6.4.2"` — conflict version.

#### 5. `.env.example` chỉ có 1 dòng trống
> File example rỗng, không có documentation cho developer mới.

---

## 4. Mobile — Đánh giá chi tiết

### ✅ Điểm mạnh

| Hạng mục | Nhận xét |
|---|---|
| Navigation | React Navigation 7, Stack + BottomTabs đúng pattern |
| Auth Flow | `SecureStore` lưu token, context-based auth |
| Performance | `FlashList` thay `FlatList`, `useCallback` / `useMemo` đúng |
| UI | Gradient, expo-image (lazy loading), lucide icons |
| Real-time | Socket.IO kết nối, register-user emit |
| Notification screen | Hiển thị đúng, mark as read, mark all as read |
| Feed screen | Pull-to-refresh, suggested users, follow action |

### ❌ Vấn đề nghiêm trọng

#### 1. IP cứng (Hardcoded IP) ở 2 nơi
```typescript
// api/client.ts
const baseURL = "http://192.168.1.8:3000/api"; // ← HARDCODE

// screens/FeedScreen.tsx
const socketUrl = "http://192.168.1.8:3000"; // ← HARDCODE (nên import từ client.ts)
```
> Không dùng được khi đổi mạng WiFi hoặc deploy. Phải tập trung vào 1 biến `BASE_URL`.

#### 2. Expo SDK version outdated
```
Cảnh báo khi chạy:
expo@54.0.2 → expected: ~54.0.34
react-native-gesture-handler@2.20.2 → expected: ~2.28.0  
react-native-reanimated@3.16.7 → expected: ~4.1.1
```
> `package.json` đã sửa đúng nhưng chưa chạy `npm install` để cập nhật `node_modules`.

#### 3. User state không được load sau login
```typescript
// AuthContext.tsx
if (storedToken) {
  setTokenState(storedToken);
  setToken(storedToken);
  // Thiếu: fetch /api/users/me để set user state!
}
```
> Sau khi mở lại app, `user` sẽ là `null` dù `token` còn hạn. `user.id` dùng trong FeedScreen sẽ bị lỗi.

#### 4. Register function sai payload
```typescript
// AuthContext.tsx
const { data } = await api.post("/auth/register", {
  name,    // ← Backend cần: username, display_name, otp
  email,
  password, // ← Backend cần: password_hash (server tự hash)
});
// Backend trả về không có token sau register → crash vì setTokenState(data.token)
```
> Register flow hoàn toàn sai payload và logic xử lý response.

#### 5. Follow endpoint sai trên FeedScreen
```typescript
// FeedScreen.tsx line 55:
await api.post(`/users/follow/${userId}`); // → POST /api/users/follow/:targetId

// userRoutes.ts line 22:
router.post('/follow/:targetId', verifyToken, toggleFollow); // ← userController version
// followRoutes.ts có toggle follow riêng tại /api/follow/:targetId
```
> Gọi userController.toggleFollow (chỉ dùng User model), không phải followController (dùng Follow collection).

#### 6. Tab "Settings" trong bottom tab
> Settings nằm trong tab bar chính — UX không tốt, thường chỉ nên vào từ Profile screen.

---

## 5. Bảo mật tổng thể

| Vấn đề | Mức độ | Trạng thái |
|---|---|---|
| JWT Secret yếu (`dev_secret`) | 🔴 Cao | Chưa fix |
| CORS block mobile | 🔴 Cao | Chưa fix |
| Không có Rate Limiting | 🔴 Cao | Chưa implement |
| Thiếu Helmet (security headers) | 🟡 Trung bình | Chưa implement |
| OTP không gửi thật | 🟡 Trung bình | Mock only |
| MinIO credentials trong .env commit | 🟡 Trung bình | `admin/password123` |
| Google Client ID trong .env commit | 🟡 Trung bình | Public key nhưng vẫn nên gitignore |
| Không validate input (Joi/Zod) | 🟡 Trung bình | Chỉ dùng mongoose validation |

---

## 6. Tính năng — Trạng thái hiện tại

| Tính năng | Backend | Frontend | Mobile |
|---|---|---|---|
| Đăng ký / Đăng nhập | ✅ | ✅ | ⚠️ Register sai payload |
| Google OAuth | ✅ | ✅ | ❌ Chưa implement |
| OTP (Phone/Email) | ⚠️ Mock only | ✅ | ❌ Chưa có màn hình OTP |
| Tạo bài viết | ✅ | ✅ | ✅ |
| Feed (bảng tin) | ⚠️ Global chỉ | ✅ | ✅ |
| Reactions (like) | ⚠️ Cộng đơn giản | ❌ | ❌ |
| Comments | ❌ Empty file | ❌ | ❌ |
| Follow / Unfollow | ⚠️ 2 hệ thống | ✅ | ⚠️ Gọi sai endpoint |
| Notifications | ✅ | ✅ | ✅ |
| Tin nhắn (Chat) | ✅ | ✅ | ✅ |
| Tìm kiếm | ⚠️ Cơ bản | ✅ | ✅ |
| Profile | ✅ | ✅ | ✅ |
| Cài đặt / Avatar | ⚠️ Field bug | ✅ | ✅ |
| Báo cáo (Report) | ❌ Empty file | ❌ | ❌ |
| Block / Unblock | ✅ | ❌ | ❌ |

---

## 7. Ưu tiên cần fix ngay (Top 7)

### 🔴 Ưu tiên 1 — CORS cho phép mobile IP
```typescript
// server.ts & sockets/index.ts
origin: true  // Hoặc thêm IP vào whitelist
```

### 🔴 Ưu tiên 2 — Load user sau khi restore token
```typescript
// AuthContext.tsx — sau khi setToken(storedToken)
const { data } = await api.get("/users/me");
setUser(data.data);
```

### 🔴 Ưu tiên 3 — Fix hardcoded IP mobile
```typescript
// Tạo constants.ts hoặc dùng process.env
export const BASE_URL = __DEV__ ? "http://192.168.1.8:3000" : "https://production.com";
```

### 🔴 Ưu tiên 4 — Fix avatar_url bug trong updateProfile
```typescript
...(avatarUrl && { avatar_url: avatarUrl })  // Không phải { avatarUrl }
```

### 🟡 Ưu tiên 5 — Thống nhất Follow system
> Xóa `toggleFollow` trong `userController`, chỉ dùng `followController` + Follow collection.

### 🟡 Ưu tiên 6 — Fix Register payload trên mobile
```typescript
// Cần: username, email/phone, password, display_name, otp
// Cần OTP screen trước khi register
```

### 🟡 Ưu tiên 7 — Cập nhật Expo packages
```bash
cd mobile && npx expo install --fix
```

---

## 8. Đề xuất kiến trúc tiếp theo

1. **Implement Comments** — Tính năng cốt lõi của mạng xã hội, hiện chưa có
2. **Personal Feed** — Lấy bài viết từ người đang follow, không phải global
3. **Rate Limiting** — `npm install express-rate-limit` và áp dụng cho auth routes
4. **Input Validation** — Thêm `zod` hoặc `joi` vào backend controllers
5. **Push Notification** — Expo Notifications cho mobile (thay thế mock OTP cũng có thể)
6. **Tách Settings** — Di chuyển SettingsScreen ra khỏi bottom tab bar


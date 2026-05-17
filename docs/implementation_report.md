# 📋 Báo cáo triển khai — MiniSocial Backend + Mobile

> **Ngày thực hiện:** 2026-05-17
> **Phạm vi:** Backend + Mobile (theo yêu cầu, Frontend để sau)
> **Trạng thái:** ✅ Hoàn thành — cả Backend và Mobile biên dịch TypeScript 0 lỗi

---

## 1. Tổng quan thay đổi

| Hạng mục | File mới | File sửa | Mức độ |
|----------|---------|---------|--------|
| Backend | 4 | 5 | 🔴 Critical fixes + new features |
| Mobile | 4 | 8 | 🔴 Critical fixes + refactor |
| **Tổng** | **8** | **13** | **21 file thay đổi** |

---

## 2. Backend — Chi tiết thay đổi

### 🔴 Fix 1: CORS cho phép Mobile IP *(Critical)*
**Files:** `server.ts`, `sockets/index.ts`

```diff
- /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
+ /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+)(:\d+)?$/.test(origin)
```
> ✅ Mobile app (192.168.x.x) và Android emulator (10.0.2.2) giờ kết nối được cả REST API lẫn Socket.IO.

### 🔴 Fix 2: Bug `avatar_url` trong updateProfile *(Critical)*
**File:** `controllers/userController.ts`

```diff
- ...(bio && { bio }),
- ...(avatarUrl && { avatarUrl })
+ ...(bio !== undefined && { bio }),
+ ...(avatarUrl && { avatar_url: avatarUrl })
```
> ✅ Avatar cập nhật đúng field name `avatar_url` trong MongoDB.
> ✅ Bio có thể set thành chuỗi rỗng `""` (trước đây `""` bị skip do falsy).

### 🔴 Fix 3: Loại bỏ duplicate Follow system *(Critical)*
**File:** `routes/userRoutes.ts`

```diff
- import { toggleFollow } from '../controllers/userController.js';
+ import { toggleFollow } from '../controllers/followController.js';
```
> ✅ Chỉ còn 1 hệ thống Follow duy nhất dùng Follow collection. Data nhất quán.

### 🔴 Fix 4: Fix `avatarUrl` → `avatar_url` trong populate
**File:** `controllers/postController.ts`

```diff
- .populate("author_id", "username display_name avatarUrl")
+ .populate("author_id", "username display_name avatar_url")
```
> ✅ Populate trả đúng tên field, frontend nhận được avatar.

### ✨ Feature 1: Comment Controller — HOÀN TOÀN MỚI
**File:** `controllers/commentController.ts` (250 dòng)

| Endpoint | Method | Chức năng |
|----------|--------|-----------|
| `/api/post/:postId/comments` | POST | Tạo comment / reply |
| `/api/post/:postId/comments` | GET | Lấy comments (phân trang) |
| `/api/post/:postId/comments/:commentId/replies` | GET | Lấy replies |
| `/api/post/:postId/comments/:commentId` | DELETE | Soft delete |

> ✅ Tự động gửi notification cho chủ bài viết khi có comment.
> ✅ Hỗ trợ nested replies (parent_id).
> ✅ Soft delete — nội dung thay bằng `[Bình luận đã bị xóa]`.

### ✨ Feature 2: Reaction Controller — HOÀN TOÀN MỚI
**File:** `controllers/reactionController.ts` (65 dòng)

> ✅ Like + notification cho tác giả bài viết.

### ✨ Feature 3: Feed Controller — Personal Feed
**File:** `controllers/feedController.ts` (75 dòng)

```
GET /api/post/feed    → Personal feed (bài từ người follow + chính mình)
GET /api/post/explore → Global feed (tất cả public)
```

> ✅ Feed giờ dùng Follow collection, chỉ hiện bài từ người đang follow.

### ✨ Feature 4: Report Controller — HOÀN TOÀN MỚI
**File:** `controllers/reportController.ts` (100 dòng)

| Endpoint | Method | Chức năng |
|----------|--------|-----------|
| `/api/report` | POST | Tạo báo cáo |
| `/api/report` | GET | Lấy danh sách (admin) |

> ✅ Chống duplicate report.

### 📦 Post Routes cập nhật
**File:** `routes/postRoutes.ts` — thêm tất cả comment endpoints + personal feed

---

## 3. Mobile — Chi tiết thay đổi

### 🔴 Fix 1: Centralize Server URL *(Critical)*
**Files mới:**
- `src/api/config.ts` — Single source of truth cho `BASE_URL`
- `src/api/endpoints.ts` — 40+ API endpoint constants

```typescript
// Trước: hardcoded ở 2 file khác nhau
const baseURL = "http://192.168.1.8:3000/api"; // api/client.ts
const socketUrl = "http://192.168.1.8:3000";   // FeedScreen.tsx

// Sau: 1 nơi duy nhất
// api/config.ts
const LOCAL_IP = "192.168.1.8";
export const BASE_URL = `http://${LOCAL_IP}:3000`;
```

### 🔴 Fix 2: AuthContext — Load user khi restore token *(Critical)*
**File:** `src/store/AuthContext.tsx` — viết lại hoàn toàn

| Trước | Sau |
|-------|-----|
| Restore token từ SecureStore → `user = null` | Restore token → gọi `/users/me` → set user |
| Register(name, email, password) — sai payload | Register({username, email, password, display_name, otp}) — đúng |
| Không clear state khi token invalid | Clear token + user khi 401 |
| `isLoading` không có | `isLoading` có, hiển thị splash khi đang load |

### 🔴 Fix 3: RegisterScreen — Correct payload + OTP *(Critical)*
**File:** `src/screens/RegisterScreen.tsx` — viết lại hoàn toàn

| Trước | Sau |
|-------|-----|
| 3 field: name, email, password | 5 field: username, display_name, email, password, otp |
| Không có bước OTP | Gửi OTP → Nhập OTP → Register |
| Register xong crash (data.token undefined) | Register xong → navigate Login |

### 🔴 Fix 4: FeedScreen — Endpoint constants + StyleSheet
**File:** `src/screens/FeedScreen.tsx` — refactor

- ✅ Import `BASE_URL` từ config thay hardcode
- ✅ Dùng `ENDPOINTS.FEED`, `ENDPOINTS.TOGGLE_FOLLOW`
- ✅ `StyleSheet.create` thay inline objects
- ✅ `useCallback` cho `renderItem`, `keyExtractor`, `followUser`
- ✅ `useMemo` cho `ListHeader`

### 🟡 Fix 5: NotificationsScreen — Refactor
**File:** `src/screens/NotificationsScreen.tsx`

- ✅ Dùng `ENDPOINTS.NOTIFICATIONS`, `ENDPOINTS.NOTIFICATION_READ`
- ✅ StyleSheet.create
- ✅ Typed state: `INotification[]`
- ✅ Ternary thay `&&` (RN best practice)

### 🟡 Fix 6: ProfileScreen — Refactor
**File:** `src/screens/ProfileScreen.tsx`

- ✅ Dùng `ENDPOINTS.MY_PROFILE`
- ✅ StyleSheet.create
- ✅ useCallback cho renderItem, keyExtractor

### 🟡 Fix 7: MessagesScreen — Endpoints
**File:** `src/screens/MessagesScreen.tsx`

- ✅ Dùng `ENDPOINTS.CONVERSATIONS`, `ENDPOINTS.MESSAGES(convId)`

### 🟡 Fix 8: SearchScreen — Endpoints + Response parsing
**File:** `src/screens/SearchScreen.tsx`

- ✅ Dùng `ENDPOINTS.SEARCH`
- ✅ Fix response parsing `data.data || data`

### 🟡 Fix 9: PostComposer — Correct endpoint + field name
**File:** `src/components/PostComposer.tsx`

```diff
- formData.append("image", ...);  // sai field name
- await api.post("/post", ...);    // sai endpoint
+ formData.append("images", ...);  // đúng field cho multer
+ await api.post(ENDPOINTS.CREATE_POST, ...); // → /post/createPost
```

### 🟡 Fix 10: SettingsScreen — Safety
**File:** `src/screens/SettingsScreen.tsx`

- ✅ Fix `user?.avatar` → `user?.avatar_url`
- ✅ Ternary thay `&&` cho Text children (tránh crash RN)

### 📦 Shared Types
**File mới:** `src/types/models.ts`

- `IUser`, `IPost`, `IComment`, `INotification`, `IConversation`, `IMessage`, `IFollow`
- `ApiResponse<T>`, `PaginationInfo`, `PaginatedResponse<T>`

---

## 4. Kết quả kiểm tra

| Kiểm tra | Backend | Mobile |
|----------|---------|--------|
| TypeScript compile (`tsc --noEmit`) | ✅ 0 lỗi | ✅ 0 lỗi |
| Dev server start | ✅ Port 3000 | ✅ Metro Bundler |
| API endpoint reachable | ✅ 401 cho invalid token | — |
| Expo start | — | ✅ Khởi động thành công |

---

## 5. Lưu ý quan trọng

### ⚠️ Cần restart backend
Vì backend dùng `nodemon`, nó sẽ **tự restart** khi file thay đổi. Nếu backend không tự restart, hãy:
```bash
cd Backend && npm run dev
```

### ⚠️ Expo SDK vẫn là 54.0.32
Theo yêu cầu, không upgrade lên SDK 55. Tất cả code tương thích với SDK 54.

### ⚠️ Thay đổi IP mạng
Khi đổi WiFi, chỉ cần sửa **1 file duy nhất**:
```
mobile/src/api/config.ts → const LOCAL_IP = "xxx.xxx.xxx.xxx";
```

### ⚠️ OTP vẫn là mock
Backend gửi OTP bằng `console.log` (chưa tích hợp Nodemailer/Twilio). Khi test register, xem OTP trong terminal backend.

---

## 6. Việc chưa làm (ngoài phạm vi Backend + Mobile)

| Việc | Ghi chú |
|------|---------|
| Frontend fixes | Sẽ thực hiện trong lượt tiếp theo |
| Rate limiting | Cần `npm install express-rate-limit` |
| Helmet security headers | Cần `npm install helmet` |
| Push Notifications | Cần `expo-notifications` |
| Google OAuth trên mobile | Cần `expo-auth-session` |
| Video upload | Placeholder trong postController |
| Block/Report UI | Backend xong, mobile/frontend chưa có UI |

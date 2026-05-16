# 📦 Danh sách Thư viện & Công nghệ — MiniSocial

> Tổng hợp đầy đủ từ **mobile_app_plan.md**, **frontend_plan.md** và bổ sung các thư viện còn thiếu cho ứng dụng mạng xã hội.
> Cập nhật lần cuối: 2026

---

## 📋 Mục lục

1. [Core Framework & Runtime](#1-core-framework--runtime)
2. [Navigation & Routing](#2-navigation--routing)
3. [UI Components & Styling](#3-ui-components--styling)
4. [Data Fetching & API](#4-data-fetching--api)
5. [Form Handling & Validation](#5-form-handling--validation)
6. [State Management & Token Storage](#6-state-management--token-storage)
7. [Realtime & Communication](#7-realtime--communication)
8. [Push Notifications](#8-push-notifications)
9. [Media, Camera & Upload](#9-media-camera--upload)
10. [Animation & Gestures](#10-animation--gestures)
11. [Deep Linking & Sharing](#11-deep-linking--sharing)
12. [Offline & Local Persistence](#12-offline--local-persistence)
13. [List Performance](#13-list-performance)
14. [Internationalization](#14-internationalization)
15. [Auth & Security](#15-auth--security)
16. [Analytics & Crash Reporting](#16-analytics--crash-reporting)
17. [Build & Configuration](#18-build--configuration)

---

## 1. Core Framework & Runtime

| Thư viện         | Phiên bản                        | Dùng ở   | Mục đích                                   |
| ---------------- | -------------------------------- | -------- | ------------------------------------------ |
| **React**        | 19.2.x (Mobile), 18.x (Frontend) | Cả hai   | UI library chính                           |
| **React Native** | 0.83.x                           | Mobile   | Native mobile framework                    |
| **Expo SDK**     | 55.x                             | Mobile   | Managed workflow, build tools, OTA updates |
| **Vite**         | 6.x                              | Frontend | Build tool + dev server (thay Webpack)     |
| **TypeScript**   | ~5.x                             | Cả hai   | Static typing, type safety                 |
| **Node.js**      | 20.x LTS                         | Backend  | Runtime môi trường server                  |

---

## 2. Navigation & Routing

| Thư viện                           | Phiên bản | Dùng ở   | Mục đích                                                 |
| ---------------------------------- | --------- | -------- | -------------------------------------------------------- |
| **@react-navigation/native**       | 7.x       | Mobile   | Navigation core — dùng `useSyncExternalStore` (v7)       |
| **@react-navigation/native-stack** | 7.x       | Mobile   | Native stack navigator (UINavigationController/Fragment) |
| **@react-navigation/bottom-tabs**  | 7.x       | Mobile   | Bottom tab bar navigation                                |
| **react-native-screens**           | ~5.x      | Mobile   | Native screen containers (peer dep của navigation)       |
| **react-native-safe-area-context** | ~6.x      | Mobile   | Safe area insets (notch, status bar)                     |
| **React Router**                   | 7.x       | Frontend | Client-side routing SPA                                  |

---

## 3. UI Components & Styling

| Thư viện                    | Phiên bản | Dùng ở   | Mục đích                                                        |
| --------------------------- | --------- | -------- | --------------------------------------------------------------- |
| **Tailwind CSS**            | 4.x       | Frontend | Utility-first CSS framework                                     |
| **Radix UI**                | latest    | Frontend | Headless, accessible UI primitives (Dialog, Switch, Tooltip...) |
| **Lucide React**            | latest    | Frontend | Icon library (tree-shakeable)                                   |
| **expo-image**              | ^55.x     | Mobile   | Optimized image component (caching, WebP, placeholders)         |
| **expo-status-bar**         | ^55.x     | Mobile   | Status bar management                                           |
| **StyleSheet** _(built-in)_ | —         | Mobile   | React Native styling API                                        |
| **Pressable** _(built-in)_  | —         | Mobile   | Touch handler (thay TouchableOpacity)                           |

---

## 4. Data Fetching & API

| Thư viện                  | Phiên bản | Dùng ở   | Mục đích                                                                                      |
| ------------------------- | --------- | -------- | --------------------------------------------------------------------------------------------- |
| **Axios**                 | ^1.7.x    | Cả hai   | HTTP client + interceptors + timeout                                                          |
| **SWR**                   | latest    | Frontend | Client-side data fetching, caching, deduplication                                             |
| **@tanstack/react-query** | ^5.x      | Mobile   | ⭐ **MỚI** — Infinite query cho news feed, pagination, background refetch, optimistic updates |

> **Lý do cần React Query (Mobile):** Axios thuần không có built-in caching và infinite scroll. `useInfiniteQuery` của React Query rất phù hợp cho news feed vô hạn, tự động dedup requests và sync background data.

---

## 5. Form Handling & Validation

| Thư viện                | Phiên bản | Dùng ở | Mục đích                                                          |
| ----------------------- | --------- | ------ | ----------------------------------------------------------------- |
| **react-hook-form**     | ^7.x      | Cả hai | Form state management — giảm re-renders, thay thế nhiều useState  |
| **@hookform/resolvers** | ^3.x      | Cả hai | Kết nối react-hook-form với schema validators (Zod)               |
| **zod**                 | ^3.x      | Cả hai | Schema validation — type-safe, runtime validation cho form inputs |

---

## 6. State Management & Token Storage

| Thư viện                                      | Phiên bản | Dùng ở   | Mục đích                                                                          |
| --------------------------------------------- | --------- | -------- | --------------------------------------------------------------------------------- |
| **React Context** _(built-in)_                | —         | Cả hai   | Auth state, theme, user preferences                                               |
| **expo-secure-store**                         | ^55.x     | Mobile   | **Lưu access token + refresh token** (encrypted, keychain/keystore)               |
| **@react-native-async-storage/async-storage** | ^2.x      | Mobile   | ⭐ **MỚI** — Lưu user preferences, settings (theme, language) — không cần encrypt |
| **localStorage** _(built-in)_                 | —         | Frontend | Lưu **access token** (short-lived, 15–30m)                                        |
| **httpOnly cookie** _(backend set)_           | —         | Frontend | **Refresh token** (secure, httpOnly, SameSite=Strict) — JS không access được      |
| **jwt-decode**                                | latest    | Frontend | Decode JWT để check expiry trước khi gọi API                                      |

> [!IMPORTANT]
> **Phân biệt rõ expo-secure-store vs AsyncStorage:**
>
> - `expo-secure-store` → dành cho **secrets** (token, private key) — encrypted, chậm hơn
> - `AsyncStorage` → dành cho **preferences** (dark mode, language, cache data) — không encrypted, nhanh hơn
>
> **Token Strategy (cần Backend phối hợp):**
>
> - **Access Token:** 15–30 phút, lưu memory/localStorage (web) hoặc SecureStore (mobile)
> - **Refresh Token:** 7–30 ngày, lưu httpOnly cookie (web) hoặc SecureStore (mobile)
> - Backend cần thêm endpoint `POST /auth/refresh`

---

## 7. Realtime & Communication

| Thư viện             | Phiên bản | Dùng ở | Mục đích                                                        |
| -------------------- | --------- | ------ | --------------------------------------------------------------- |
| **socket.io-client** | ^4.7.x    | Cả hai | WebSocket client — chat, notifications realtime khi app đang mở |

---

## 8. Push Notifications

> ⭐ **MỤC MỚI — THIẾU HOÀN TOÀN** trong stack cũ

| Thư viện               | Phiên bản | Dùng ở | Mục đích                                                                            |
| ---------------------- | --------- | ------ | ----------------------------------------------------------------------------------- |
| **expo-notifications** | ^55.x     | Mobile | Push notification (like, comment, follow, mention) — hoạt động khi app đóng         |
| **expo-device**        | ^55.x     | Mobile | Peer dep của expo-notifications, detect physical device (simulator không nhận push) |

> [!IMPORTANT]
> **Tại sao cần push notification riêng?**
> Socket.IO chỉ hoạt động khi app đang **mở và kết nối**. Push notification mới đến được người dùng khi app **đóng hoàn toàn** — đây là kênh quan trọng nhất để giữ người dùng quay lại ứng dụng mạng xã hội.
>
> **Flow:** Backend → APNs (iOS) / FCM (Android) → Device → `expo-notifications` nhận và hiển thị.

---

## 9. Media, Camera & Upload

| Thư viện                      | Phiên bản | Dùng ở   | Mục đích                                                                          |
| ----------------------------- | --------- | -------- | --------------------------------------------------------------------------------- |
| **expo-image-picker**         | ^55.x     | Mobile   | Chọn ảnh/video từ gallery + chụp ảnh nhanh                                        |
| **expo-camera**               | ^55.x     | Mobile   | Camera trực tiếp — chụp ảnh/quay video trong app, QR code                         |
| **expo-location**             | ^55.x     | Mobile   | Vị trí GPS — check-in, gắn location vào post, nearby users                        |
| **expo-media-library**        | ^55.x     | Mobile   | Lưu ảnh/video vào gallery của device                                              |
| **expo-image-manipulator**    | ^55.x     | Mobile   | ⭐ **MỚI** — Crop, resize, compress ảnh trước khi upload (giảm bandwidth đáng kể) |
| **react-native-compressor**   | ^1.x      | Mobile   | ⭐ **MỚI** — Nén video trước khi upload (video post, story)                       |
| **react-dropzone**            | ^14.x     | Frontend | ⭐ **MỚI** — Drag-and-drop upload ảnh/video trên web                              |
| **browser-image-compression** | ^2.x      | Frontend | ⭐ **MỚI** — Compress ảnh phía client trước khi gửi lên server                    |

> [!WARNING]
> **Bắt buộc phải xử lý media trước khi upload!**
> Ảnh từ camera iPhone/Android thường nặng 3–10MB, video có thể 100MB+. Nếu upload thẳng không compress sẽ:
>
> - Tốn băng thông của user (4G/5G)
> - Tăng chi phí lưu trữ server
> - Làm chậm tốc độ load của người xem
>
> Workflow khuyến nghị: `pick → manipulate (crop/resize) → compress → upload to S3/Cloudinary`

---

## 10. Animation & Gestures

| Thư viện                         | Phiên bản | Dùng ở   | Mục đích                                        |
| -------------------------------- | --------- | -------- | ----------------------------------------------- |
| **react-native-reanimated**      | ^3.x      | Mobile   | UI thread animations (GPU-accelerated)          |
| **react-native-gesture-handler** | ^2.x      | Mobile   | Native gesture system (Tap, Pan, Pinch, Swipe)  |
| **framer-motion**                | latest    | Frontend | Web animations (transitions, layout animations) |

---

## 11. Deep Linking & Sharing

> ⭐ **MỤC MỚI — THIẾU HOÀN TOÀN** trong stack cũ

| Thư viện           | Phiên bản | Dùng ở | Mục đích                                                                                            |
| ------------------ | --------- | ------ | --------------------------------------------------------------------------------------------------- |
| **expo-linking**   | ^55.x     | Mobile | ⭐ **MỚI** — Deep link vào post/profile cụ thể (`minisocial://post/123`), xử lý URL từ notification |
| **expo-sharing**   | ^55.x     | Mobile | ⭐ **MỚI** — Share post/profile ra app ngoài (Messenger, WhatsApp, Instagram Story...)              |
| **expo-clipboard** | ^55.x     | Mobile | ⭐ **MỚI** — Copy link post vào clipboard                                                           |

> Deep link kết hợp với push notification tạo ra flow hoàn chỉnh: user nhận notification → tap → mở đúng màn hình post/comment.

---

## 12. Offline & Local Persistence

> ⭐ **MỤC MỚI** trong stack cũ

| Thư viện        | Phiên bản | Dùng ở | Mục đích                                                                   |
| --------------- | --------- | ------ | -------------------------------------------------------------------------- |
| **expo-sqlite** | ^55.x     | Mobile | ⭐ **MỚI** — Cache feed offline, draft post chưa gửi, local search history |

> [!NOTE]
> `AsyncStorage` (mục 6) đủ cho preferences đơn giản. Dùng `expo-sqlite` khi cần query phức tạp hơn (tìm kiếm draft, sort offline cache...).

---

## 13. List Performance

| Thư viện                | Phiên bản | Dùng ở | Mục đích                                                                      |
| ----------------------- | --------- | ------ | ----------------------------------------------------------------------------- |
| **@shopify/flash-list** | latest    | Mobile | Virtualized list — thay ScrollView + `.map()`, tối ưu news feed, comment list |

---

## 14. Internationalization

> ⭐ **MỤC MỚI** (đã có plan nhưng chưa có trong danh sách thư viện)

| Thư viện                             | Phiên bản | Dùng ở   | Mục đích                                                                         |
| ------------------------------------ | --------- | -------- | -------------------------------------------------------------------------------- |
| **i18next**                          | ^23.x     | Cả hai   | i18n core — quản lý translation keys, pluralization, interpolation               |
| **react-i18next**                    | ^14.x     | Cả hai   | React binding cho i18next (`useTranslation` hook)                                |
| **expo-localization**                | ^55.x     | Mobile   | ⭐ **MỚI** — Detect locale của device (vi-VN, en-US...) để set ngôn ngữ mặc định |
| **i18next-browser-languagedetector** | ^7.x      | Frontend | Auto-detect ngôn ngữ browser                                                     |

---

## 15. Auth & Security

| Thư viện / Công nghệ                         | Dùng ở   | Mục đích                                                           |
| -------------------------------------------- | -------- | ------------------------------------------------------------------ |
| **Google OAuth** (via `@react-oauth/google`) | Frontend | Google Sign-In trên web                                            |
| **expo-auth-session**                        | Mobile   | ⭐ **MỚI** — OAuth flow chuẩn trên mobile (Google, Facebook OAuth) |
| **expo-web-browser**                         | Mobile   | ⭐ **MỚI** — Peer dep của expo-auth-session, mở browser cho OAuth  |
| **JWT (JSON Web Token)**                     | Cả hai   | Authentication token format                                        |
| **Axios Interceptors**                       | Cả hai   | Auto-attach token, handle 401 redirect, silent refresh             |

> [!NOTE]
> `expo-auth-session` thay thế việc tự implement OAuth flow trên mobile — xử lý PKCE, redirect URI, code exchange đúng chuẩn bảo mật.

---

---

## 16. Build & Configuration

| Công nghệ           | Dùng ở   | Mục đích                                        |
| ------------------- | -------- | ----------------------------------------------- |
| **app.config.ts**   | Mobile   | Expo config (thay app.json) — env vars, plugins |
| **tsconfig.json**   | Cả hai   | TypeScript compiler configuration               |
| **babel.config.js** | Mobile   | Babel config (Reanimated plugin...)             |
| **vite.config.ts**  | Frontend | Vite build config                               |
| **.env**            | Cả hai   | Environment variables                           |
| **expo-doctor**     | Mobile   | Dependency compatibility checker                |

---

## ❌ Thư viện cần XÓA

| Thư viện                    | Lý do                                        |
| --------------------------- | -------------------------------------------- |
| `motion` (Frontend)         | Duplicate với `framer-motion` — chọn một     |
| `dotenv` (Frontend)         | Vite tự đọc `.env` — không cần cài thêm      |
| `react-dom` (Mobile)        | Không cần cho React Native                   |
| `react-native-web` (Mobile) | Không target web platform trong monorepo này |

---

## 📊 Tóm tắt & Roadmap

### Thống kê thư viện

| Metric                   | Mobile | Frontend | Chung |
| ------------------------ | ------ | -------- | ----- |
| **Thư viện production**  | 28     | 17       | 7     |
| **Thư viện dev/tooling** | 5      | 8        | 3     |
| **Công nghệ build**      | 5      | 3        | 2     |

### Thư viện dùng chung (shared)

| #   | Thư viện                             | Vai trò                            |
| --- | ------------------------------------ | ---------------------------------- |
| 1   | **React**                            | UI library                         |
| 2   | **TypeScript**                       | Type safety                        |
| 3   | **Axios**                            | HTTP client                        |
| 4   | **socket.io-client**                 | Realtime                           |
| 5   | **react-hook-form**                  | Form state management              |
| 6   | **zod**                              | Schema validation                  |
| 7   | **@hookform/resolvers**              | RHF + Zod bridge                   |
| 8   | **i18next + react-i18next**          | Internationalization               |
| 9   | **Shared Types** (`types/models.ts`) | Đồng bộ interfaces giữa 3 projects |

### Mức độ ưu tiên bổ sung

| Mức độ               | Thư viện cần thêm                                                                                                                      |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 🔴 **Bắt buộc ngay** | `expo-notifications`, `expo-device`, `expo-image-manipulator`, `@react-native-async-storage/async-storage`, `expo-linking`             |
| 🟡 **Nên có sớm**    | `@tanstack/react-query` (Mobile), `expo-sharing`, `expo-clipboard`, `browser-image-compression`, `react-dropzone`, `expo-auth-session` |
| 🟢 **Phase 3**       | `expo-sqlite`, `i18next`, `expo-local-authentication`, `@sentry/react-native`, `husky`, `lint-staged`                                  |

# 🌐 FRONTEND PLAN — MiniSocial (React + Vite + TypeScript)

> **Ngày tạo:** 15/05/2026
> **Tech Stack:** React 18, Vite 6, TypeScript, Tailwind CSS 4, SWR, Radix UI, React Router 7

---

## 1. Hiện trạng & Vấn đề

### 1.1 Tình trạng hiện tại
- **14 components** trong `src/app/components/` — tất cả `.tsx` ✅
- **1 hook:** `useCurrentUser.ts`
- **2 services:** `api.ts`, `authService.ts`
- **Styling:** Tailwind CSS 4 + theme.css
- **Data fetching:** SWR (đã có ✅)
- **UI library:** Radix UI primitives + Lucide icons
- **Auth:** JWT + Google OAuth

### 1.2 Vấn đề cần giải quyết (68 issues từ Review Report)

#### 🔴 CRITICAL (4 issues)

| # | File | Vấn đề |
|---|------|--------|
| 1 | `Navigation.tsx` | **Logout không xóa token** — chỉ navigate, không clear localStorage |
| 2 | `SettingsView.tsx` | **Toggle logic lỗi** — `"private-account"` → `"privateaccount"` thay vì `"privateAccount"` |
| 3 | `LoginView.tsx` | **Token bị log console** — `console.log("idToken:", credential)` |
| 4 | `useCurrentUser.ts` | **Không kiểm tra token expiry** — token hết hạn vẫn dùng |

#### 🔴 HIGH (9 issues)

| # | File | Vấn đề |
|---|------|--------|
| 1 | `CreatePostModal.tsx` | **Memory leak** — blob URLs không được revoke |
| 2 | `CreatePostModal.tsx` | **Early return trước hooks** — vi phạm Rules of Hooks |
| 3 | `PostCard.tsx` | **Thiếu useCallback** cho handlers — phá vỡ memo() |
| 4 | `Navigation.tsx` | **Hardcoded notification count = 3** |
| 5 | `SettingsView.tsx` | **Settings không persist** — mất khi refresh |
| 6 | `MessagesView.tsx` | **Polling 3s** thay vì WebSocket |
| 7 | `api.ts` | **Hardcoded URL** `http://localhost:3000` |
| 8 | `RegisterView.tsx` | **Hardcoded URL** bypass api client |
| 9 | `main.tsx` | **No fallback** cho missing `VITE_GOOGLE_CLIENT_ID` |

#### 🟡 MEDIUM (25 issues)
- Dùng `alert()` thay toast notifications
- Silent errors — chỉ `console.error()`, không UI feedback
- 6+ nút UI không có onClick handler
- Thiếu accessibility (aria-labels, keyboard nav, role="switch")
- `package.json` tên sai: `@figma/my-make-file`
- Duplicate: cả `framer-motion` lẫn `motion`
- Thiếu scripts: `lint`, `test`, `type-check`

---

## 2. Best Practices được chọn

> Từ **vercel-react-best-practices** (70 rules). Vì đây là **Vite SPA** (không phải Next.js), một số rules server-side không áp dụng.

### 2.1 🔴 CRITICAL — Eliminating Waterfalls

| Rule ID | Tên Rule | Áp dụng vào đâu | Mô tả |
|---------|----------|-----------------|-------|
| `async-parallel` | Promise.all() for Independent Ops | SocialMediaApp (feed + profile + notifications), ProfileView | Fetch song song thay tuần tự |
| `async-defer-await` | Defer Await Until Needed | Auth flows, conditional fetches | Move `await` vào branch thực sự cần |
| `async-cheap-condition-before-await` | Check Cheap Condition First | Protected routes, conditional API calls | Check token tồn tại trước khi gọi API |

### 2.2 🔴 CRITICAL — Bundle Size Optimization

| Rule ID | Tên Rule | Áp dụng vào đâu | Mô tả |
|---------|----------|-----------------|-------|
| `bundle-barrel-imports` | Avoid Barrel File Imports | Radix UI, Lucide React, MUI imports | Import trực tiếp: `import Button from '@mui/material/Button'` |
| `bundle-dynamic-imports` | Dynamic Imports (React.lazy) | CreatePostModal, MessagesView, SettingsView | `React.lazy(() => import('./HeavyComponent'))` cho components không cần ban đầu |
| `bundle-defer-third-party` | Defer Non-Critical Libraries | `canvas-confetti`, `recharts`, analytics | Load sau hydration, không block initial bundle |
| `bundle-conditional` | Conditional Module Loading | Image picker, emoji picker | Load modules chỉ khi feature được activate |
| `bundle-preload` | Preload on User Intent | Navigation hover → preload route | `void import('./MessagesView')` khi hover nav link |
| `bundle-analyzable-paths` | Statically Analyzable Paths | Dynamic imports, route configs | Dùng explicit map thay template string imports |

### 2.3 🟡 MEDIUM-HIGH — Client-Side Data Fetching

| Rule ID | Tên Rule | Áp dụng vào đâu | Mô tả |
|---------|----------|-----------------|-------|
| `client-swr-dedup` | SWR for Deduplication | Đã dùng SWR ✅ — nhưng cần chuẩn hóa | Tất cả data fetching qua SWR hooks, không `useEffect + fetch` |
| `client-event-listeners` | Deduplicate Event Listeners | Socket.IO listeners, resize handlers | 1 listener duy nhất, không duplicate trên re-mount |
| `client-passive-event-listeners` | Passive Scroll Listeners | Infinite scroll, scroll-to-top button | `{ passive: true }` cho scroll events |
| `client-localstorage-schema` | Version & Minimize localStorage | userToken, userData, settings | Version prefix `v1:userToken`, chỉ lưu fields cần thiết, try/catch |

### 2.4 🟡 MEDIUM — Re-render Optimization

| Rule ID | Tên Rule | Áp dụng vào đâu | Mô tả |
|---------|----------|-----------------|-------|
| `rerender-no-inline-components` | Don't Define Components Inside | Kiểm tra toàn bộ 14 components | Component trong component = remount mỗi render |
| `rerender-memo` | Extract to Memoized Components | PostCard (đã memo ✅), NotificationItem, Sidebar | `React.memo()` cho expensive pure components |
| `rerender-memo-with-default-value` | Hoist Default Props | Memoized components có optional callbacks | `const NOOP = () => {}` ở module level |
| `rerender-functional-setstate` | Functional setState | Mọi setState phụ thuộc current state | `setItems(prev => [...prev, newItem])` |
| `rerender-lazy-state-init` | Lazy State Init | useState với localStorage/parse | `useState(() => JSON.parse(stored))` |
| `rerender-derived-state-no-effect` | Derive During Render | SettingsView (toggle states), filtered lists | Không `useEffect → setState`, compute trực tiếp |
| `rerender-derived-state` | Subscribe Derived Booleans | Auth status, loading states | `const isLoggedIn = !!token` |
| `rerender-dependencies` | Narrow Effect Deps | useEffect trong PostCard, MessagesView | `[user.id]` thay `[user]` |
| `rerender-split-combined-hooks` | Split Independent Hooks | useMemo/useEffect kết hợp | Tách filter + sort thành 2 useMemo |
| `rerender-use-ref-transient-values` | useRef for Transient Values | Scroll position, timer IDs | Giá trị hay thay đổi nhưng không cần re-render |
| `rerender-move-effect-to-event` | Logic in Event Handlers | Like, comment, follow actions | Side effects user → handler, không state + effect |
| `rerender-transitions` | startTransition for Non-Urgent | Search filter, tab switch | `startTransition(() => setQuery(value))` |
| `rerender-use-deferred-value` | useDeferredValue | SearchView — filter large results | Input snappy, results render khi ready |
| `rerender-defer-reads` | Defer State Reads | Callbacks chỉ cần state khi execute | Đọc state trong handler, không subscribe |
| `rerender-simple-expression-in-memo` | Don't Memo Simple Primitives | `isLoading`, `hasError` booleans | Không wrap primitive expression trong useMemo |

### 2.5 🟡 MEDIUM — Rendering Performance

| Rule ID | Tên Rule | Áp dụng vào đâu | Mô tả |
|---------|----------|-----------------|-------|
| `rendering-content-visibility` | CSS content-visibility | PostFeed (long list), NotificationsView | `content-visibility: auto` cho off-screen items |
| `rendering-hoist-jsx` | Hoist Static JSX | Sidebar icons, nav items, empty states | Extract static JSX ra module-level constant |
| `rendering-conditional-render` | Ternary over `&&` | Conditional rendering | Ternary rõ ràng, tránh falsy bugs |
| `rendering-usetransition-loading` | useTransition Loading | Tab switches, navigation | `const [isPending, startTransition] = useTransition()` |
| `rendering-resource-hints` | Resource Hints | Google Fonts, avatar CDN | `<link rel="preconnect">`, `<link rel="dns-prefetch">` |
| `rendering-script-defer-async` | Script defer/async | Google OAuth script, analytics | `defer` hoặc `async` trên script tags |

### 2.6 🟢 LOW-MEDIUM — JavaScript Performance

| Rule ID | Tên Rule | Áp dụng vào đâu | Mô tả |
|---------|----------|-----------------|-------|
| `js-early-exit` | Early Return | Mọi function | Return sớm, giảm nesting |
| `js-set-map-lookups` | Set/Map O(1) | Liked posts, online users | `Set.has()` thay `Array.includes()` |
| `js-combine-iterations` | Combine Iterations | Data transforms | 1 loop thay chain `filter().map()` |
| `js-hoist-regexp` | Hoist RegExp | Search, hashtag parsing | RegExp ở module level |
| `js-cache-storage` | Cache Storage Reads | localStorage token reads | Cache kết quả, không đọc mỗi render |
| `js-cache-function-results` | Cache Function Results | `getImageUrl()`, date formatting | Module-level Map cache |
| `js-batch-dom-css` | Batch DOM/CSS Changes | Theme switching, animations | Group CSS changes via classes |
| `js-request-idle-callback` | requestIdleCallback | Analytics, prefetch | Defer non-critical work |
| `js-flatmap-filter` | flatMap | Data processing | `flatMap(x => cond ? [transform(x)] : [])` |

### 2.7 🟢 LOW — Advanced Patterns

| Rule ID | Tên Rule | Áp dụng vào đâu | Mô tả |
|---------|----------|-----------------|-------|
| `advanced-init-once` | Initialize Once | Socket.IO connection, Google OAuth | Module-level flag, không re-init StrictMode |
| `advanced-use-latest` | useLatest Stable Refs | Event handlers trong effects | Ref wrapper cho latest callback |

### 2.8 Rules KHÔNG áp dụng (Vite SPA, không phải Next.js)

| Category | Lý do |
|----------|-------|
| `server-*` (10 rules) | Không có SSR/RSC — Vite SPA là client-only |
| `async-suspense-boundaries` | Không có server streaming |
| `rendering-hydration-*` (2 rules) | Không có SSR hydration |
| `rendering-activity` | React Activity chưa stable |
| `bundle-dynamic-imports` (next/dynamic) | Dùng `React.lazy()` thay `next/dynamic` |
| `advanced-effect-event-deps` | `useEffectEvent` chưa stable |

---

## 3. Cấu trúc thư mục mới

```
Frontend/src/
├── main.tsx                      # Entry point
├── vite-env.d.ts
├── types/
│   ├── models.ts                 # Shared types (sync với Backend + Mobile)
│   ├── api.ts                    # API request/response types
│   └── auth.ts                   # Auth-related types
├── config/
│   ├── env.ts                    # Environment variables + validation
│   ├── routes.ts                 # Route constants
│   └── api.ts                    # API endpoints map
├── services/
│   ├── api.ts                    # Axios instance + interceptors (giữ nguyên, fix URL)
│   ├── authService.ts            # Auth methods (fix: proper types)
│   └── socketService.ts          # Socket.IO singleton (rule: advanced-init-once)
├── hooks/
│   ├── useCurrentUser.ts         # Fix: token expiry check
│   ├── usePosts.ts               # SWR hook for posts
│   ├── useNotifications.ts       # SWR + Socket.IO realtime
│   ├── useConversations.ts       # SWR hook for chat
│   ├── useSocket.ts              # Socket.IO hook
│   └── useMediaQuery.ts          # Responsive breakpoints
├── components/
│   ├── ui/                       # Radix-based primitives (Button, Input, Toast...)
│   ├── layout/
│   │   ├── Navigation.tsx        # Fix: logout + dynamic notification count
│   │   ├── Sidebar.tsx
│   │   └── AppShell.tsx          # Layout wrapper
│   ├── auth/
│   │   ├── LoginView.tsx         # Fix: remove console.log token
│   │   ├── RegisterView.tsx      # Fix: use api client, not hardcoded URL
│   │   └── ProtectedRoute.tsx    # Fix: token expiry check
│   ├── feed/
│   │   ├── PostFeed.tsx          # SWR + content-visibility
│   │   ├── PostCard.tsx          # Fix: useCallback handlers
│   │   └── CreatePostModal.tsx   # Fix: revoke blob URLs, hooks order
│   ├── profile/
│   │   ├── ProfileView.tsx
│   │   ├── ProfileCard.tsx
│   │   └── EditProfileModal.tsx
│   ├── messages/
│   │   ├── MessagesView.tsx      # Fix: WebSocket thay polling
│   │   └── ChatBubble.tsx
│   ├── notifications/
│   │   └── NotificationsView.tsx # Fix: clickable keyboard accessible
│   ├── search/
│   │   └── SearchView.tsx        # useDeferredValue for search
│   └── settings/
│       └── SettingsView.tsx      # Fix: toggle logic + persist
├── styles/
│   ├── tailwind.css
│   ├── theme.css
│   └── index.css
└── app/
    ├── App.tsx                   # Routes + ErrorBoundary
    └── routes.tsx                # React Router config
```

---

## 4. Phase 1 — Foundation & Critical Fixes (Tuần 1)

### 4.1 Fix package.json

```json
{
  "name": "minisocial-web",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext .ts,.tsx",
    "type-check": "tsc --noEmit",
    "test": "vitest"
  }
}
```
- Xóa duplicate `motion` (giữ `framer-motion`)
- Thêm `eslint`, `vitest`, `@testing-library/react` vào devDependencies

### 4.2 Fix env config (rule: `bundle-analyzable-paths`)

```typescript
// src/config/env.ts
const env = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  SERVER_URL: import.meta.env.VITE_SERVER_URL || "http://localhost:5000",
  GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "",
} as const;

if (!env.GOOGLE_CLIENT_ID) {
  console.warn("VITE_GOOGLE_CLIENT_ID is not set — Google login disabled");
}

export default env;
```

### 4.3 Fix Critical Bugs

```typescript
// 1. Logout — Navigation.tsx
const handleLogout = () => {
  localStorage.removeItem("userToken");
  localStorage.removeItem("userData");
  navigate("/login");
};

// 2. Token expiry — useCurrentUser.ts
const decoded = jwtDecode<JwtPayload>(token);
if (decoded.exp * 1000 < Date.now()) {
  localStorage.removeItem("userToken");
  return null;
}

// 3. Memory leak — CreatePostModal.tsx
useEffect(() => {
  return () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  };
}, [previewUrl]);

// 4. Settings toggle — SettingsView.tsx
const keyMap: Record<string, keyof Settings> = {
  "private-account": "privateAccount",
  "online-status": "onlineStatus",
  "push-notifications": "notifications",
  "dark-mode": "darkMode",
};
```

### 4.4 Form Handling với react-hook-form + zod (thay thế 7 useState)

```typescript
// BEFORE: RegisterView.tsx — 7 useState
const [username, setUsername] = useState("");
const [displayName, setDisplayName] = useState("");
const [contact, setContact] = useState("");
const [password, setPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");
const [otp, setOtp] = useState("");
const [step, setStep] = useState(1);

// AFTER: react-hook-form + zod
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const registerSchema = z.object({
  username: z.string().min(3, "Tối thiểu 3 ký tự"),
  displayName: z.string().min(1, "Không được để trống"),
  contact: z.string().min(1, "Email hoặc số điện thoại"),
  password: z.string().min(6, "Tối thiểu 6 ký tự"),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: "Mật khẩu không khớp",
  path: ["confirmPassword"],
});

type RegisterForm = z.infer<typeof registerSchema>;

const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
  resolver: zodResolver(registerSchema),
});

// → 0 useState, auto validation, auto TypeScript types, ít re-render hơn
```

### 4.5 Shared Types (sync Backend + Mobile)

```typescript
// src/types/models.ts — giống mobile/src/types/models.ts
export interface IUser { _id: string; username: string; display_name: string; /* ... */ }
export interface IPost { _id: string; author_id: IUser | string; content: string; /* ... */ }
export interface IComment { /* ... */ }
export interface INotification { /* ... */ }
export interface IConversation { /* ... */ }
export interface IMessage { /* ... */ }
```

---

## 5. Phase 2 — SWR Hooks & WebSocket (Tuần 2)

### 5.1 SWR Hooks chuẩn hóa (rule: `client-swr-dedup`)

```typescript
// src/hooks/usePosts.ts
export function usePosts() {
  const { data, error, mutate } = useSWR<IPost[]>("/feed", fetcher);
  return {
    posts: data ?? [],
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
}
```

### 5.2 WebSocket thay Polling (MessagesView)

```typescript
// src/services/socketService.ts (rule: advanced-init-once)
let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(env.SERVER_URL, { autoConnect: false });
  }
  return socket;
}
```

---

## 6. Phase 3 — Performance Optimization (Tuần 3–4)

### 6.1 Bundle Optimization

```typescript
// Lazy load heavy components (rule: bundle-dynamic-imports)
const CreatePostModal = React.lazy(() => import("./CreatePostModal"));
const MessagesView = React.lazy(() => import("./MessagesView"));
const SettingsView = React.lazy(() => import("./SettingsView"));

// Preload on hover (rule: bundle-preload)
const preloadMessages = () => void import("./MessagesView");
<button onMouseEnter={preloadMessages} onFocus={preloadMessages}>
  Messages
</button>
```

### 6.2 Re-render Optimization

```typescript
// PostCard — fix useCallback (rule: rerender-memo + rerender-functional-setstate)
const PostCard = React.memo(function PostCard({ post, onLike }: Props) {
  const handleLike = useCallback(() => {
    onLike(post._id);
  }, [post._id, onLike]);
  // ...
});

// SearchView — useDeferredValue (rule: rerender-use-deferred-value)
const [query, setQuery] = useState("");
const deferredQuery = useDeferredValue(query);
const { data } = useSWR(deferredQuery ? `/search?q=${deferredQuery}` : null, fetcher);
```

### 6.3 CSS Performance (rule: `rendering-content-visibility`)

```css
/* PostFeed — skip rendering off-screen posts */
.post-card {
  content-visibility: auto;
  contain-intrinsic-size: 0 400px;
}
```

### 6.4 Resource Hints (rule: `rendering-resource-hints`)

```html
<!-- index.html -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="dns-prefetch" href="https://images.unsplash.com" />
```

---

## 7. Phase 4 — Accessibility & Polish (Tuần 5)

### 7.1 Accessibility Fixes

```tsx
// CreatePostModal — close button
<button aria-label="Close modal" onClick={onClose}>×</button>

// NotificationsView — keyboard accessible
<div role="button" tabIndex={0} onKeyDown={handleKeyDown} onClick={onClick}>

// SettingsView — toggle switches
<Switch role="switch" aria-checked={enabled} aria-label={label} />
```

### 7.2 Error Boundary + Toast

```tsx
// Replace alert() with Sonner toast (đã có trong dependencies)
import { toast } from "sonner";
toast.error("Failed to create post");
toast.success("Post created!");
```

---

## 8. Dependencies cập nhật

### Thêm mới:
```bash
# Dev tools
npm install -D eslint @typescript-eslint/eslint-plugin vitest @testing-library/react @testing-library/jest-dom

# Form handling + validation (thay thế nhiều useState)
npm install react-hook-form @hookform/resolvers zod
```

### Xóa duplicate:
```bash
npm uninstall motion  # giữ framer-motion
npm uninstall dotenv  # Vite tự đọc .env
```

---

## 9. Timeline

| Phase | Tuần | Output |
|-------|------|--------|
| **1** | 1 | Fix critical bugs + env config + shared types + package.json |
| **2** | 2 | SWR hooks chuẩn hóa + WebSocket thay polling |
| **3** | 3–4 | Bundle optimization + re-render fixes + CSS perf |
| **4** | 5 | Accessibility + Error Boundary + Toast + Testing |

> [!TIP]
> **So với Mobile plan:** Frontend đã dùng TypeScript nên không cần migration JS→TS. Focus chính là fix bugs, bundle optimization, và re-render performance.

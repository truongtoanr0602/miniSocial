# 📱 MOBILE APP PLAN — MiniSocial (Expo + React Native + TypeScript)

> **Ngày tạo:** 15/05/2026 — **Cập nhật:** 15/05/2026  
> **Tech Stack:** React Native 0.83, Expo SDK 55, TypeScript, React Navigation 7

---

## 0. Upgrade Guide: SDK 54 → SDK 55 + React Navigation 7

> [!IMPORTANT]
> Project hiện tại đang dùng **Expo SDK 54 + RN 0.81 + React Nav 6**. Phải upgrade trước khi triển khai plan.

### 0.1 Expo SDK 54 → 55 — Breaking Changes

| # | Breaking Change | Impact | Cách xử lý |
|---|----------------|--------|------------|
| 1 | **New Architecture bắt buộc** — Legacy Bridge bị xóa | 🔴 | Project dùng Expo managed → tự động, nhưng cần test |
| 2 | **`newArchEnabled` flag bị xóa** khỏi app.json | 🟡 | Xóa flag nếu có, New Arch là default |
| 3 | **SDK versioning mới** — packages cùng major version | 🟡 | `expo-image-picker@^55.0.0` thay `~17.0.10` |
| 4 | **React 19.2 + RN 0.83** | 🟢 | Backwards compatible với React 19.1 |
| 5 | **Android Autolinking** đổi sang `expo-autolinking-settings` | 🟢 | Tự động khi `npx expo prebuild --clean` |

### 0.2 React Navigation 6 → 7 — Breaking Changes

| # | Breaking Change | Cách xử lý |
|---|----------------|------------|
| 1 | **State dùng `useSyncExternalStore`** thay Context — ít re-render hơn 40-60% | Tự động, không cần code changes |
| 2 | **Static Configuration API mới** — auto TypeScript types | Chuyển sang `createStaticNavigation()` |
| 3 | **Navigate to nested screens** — phải dùng explicit syntax | `navigate(Parent, { screen: Child })` thay `navigate(Child)` |
| 4 | **Navigate by key bị xóa** | Dùng `getId` prop thay thế |

### 0.3 Lệnh upgrade

```bash
# Bước 1: Kiểm tra tương thích
npx expo-doctor

# Bước 2: Nâng Expo SDK
npx expo install expo@^55 --fix

# Bước 3: Fix tất cả dependencies theo SDK 55
npx expo install --fix

# Bước 4: Nâng React Navigation 7
npm install @react-navigation/native@^7 \
  @react-navigation/native-stack@^7 \
  @react-navigation/bottom-tabs@^7

# Bước 5: Clean build
npx expo prebuild --clean
npx expo start --clear
```

### 0.4 Phiên bản mục tiêu sau upgrade

| Package | Hiện tại | Sau upgrade |
|---------|----------|-------------|
| `expo` | 54.0.33 | **~55.x** |
| `react-native` | 0.81.5 | **0.83.x** |
| `react` | 19.1.0 | **19.2.x** |
| `@react-navigation/native` | 6.1.18 | **7.x** |
| `@react-navigation/native-stack` | 6.11.0 | **7.x** |
| `react-native-screens` | ~4.16.0 | **~5.x** (SDK 55 matched) |
| `react-native-safe-area-context` | ~5.6.0 | **~6.x** (SDK 55 matched) |

---

## 1. Hiện trạng & Vấn đề

### 1.1 Tình trạng hiện tại
- **Tất cả file đều là `.js`** — chưa có TypeScript
- **5 screens:** Login, Register, Feed, Profile, Search
- **2 components:** PostComposer, PostItem
- **1 context:** AuthContext (không persist token)
- **1 API client:** hardcoded URL, không timeout, không interceptor
- **app.json:** thiếu icon, splash, SDK version

### 1.2 Vấn đề cần giải quyết (từ Review Report)

| # | Severity | Vấn đề |
|---|----------|--------|
| 1 | CRITICAL | `ScrollView` thay vì `FlatList/FlashList` cho feed |
| 2 | CRITICAL | Không có error handling (Promise.all không try/catch) |
| 3 | HIGH | Token chỉ lưu trong React state, restart = mất login |
| 4 | HIGH | Hardcoded URL `http://10.0.2.2:5000` |
| 5 | HIGH | Không có loading states |
| 6 | MEDIUM | Thiếu accessibility labels |
| 7 | MEDIUM | Inline style objects trong lists |
| 8 | MEDIUM | Functions không memoized |

---

## 2. Best Practices được chọn

> Tổng hợp từ **vercel-react-native-skills** (35+ rules) và **vercel-react-best-practices** (70 rules), chọn lọc những rules áp dụng được cho React Native mobile app.

### 2.1 Từ `vercel-react-native-skills` — Tất cả đều áp dụng

#### 🔴 CRITICAL — Core Rendering

| Rule ID | Tên Rule | Áp dụng vào đâu | Mô tả |
|---------|----------|-----------------|-------|
| `rendering-no-falsy-and` | Never Use `&&` with Potentially Falsy Values | Mọi component có conditional render | Dùng ternary `condition ? <X/> : null` thay `&&`, vì `0` hoặc `""` sẽ crash app RN |
| `rendering-text-in-text-component` | Wrap Strings in `<Text>` | Mọi component | Text phải nằm trong `<Text>`, nếu không sẽ crash |

#### 🔴 HIGH — List Performance

| Rule ID | Tên Rule | Áp dụng vào đâu | Mô tả |
|---------|----------|-----------------|-------|
| `list-performance-virtualize` | Use FlashList/LegendList | FeedScreen, SearchScreen, NotificationsScreen, ChatScreen | Thay `ScrollView + .map()` bằng virtualized list. Chỉ render items đang visible |
| `list-performance-item-memo` | Memoize List Items | PostItem, NotificationItem, MessageBubble, UserRow | Wrap component bằng `React.memo()` để skip re-render khi props không đổi |
| `list-performance-callbacks` | Hoist Callbacks to List Root | FeedScreen, SearchScreen | Tạo 1 instance callback ở parent, truyền xuống items thay vì tạo inline function |
| `list-performance-inline-objects` | Avoid Inline Style Objects | PostItem, tất cả list items | Dùng `StyleSheet.create` hoặc hoist style ra module scope, không tạo `{}` trong render |
| `list-performance-function-references` | Stable Function References | renderItem, keyExtractor | Extract `renderItem` và `keyExtractor` ra ngoài component hoặc wrap `useCallback` |
| `list-performance-images` | Compressed Images in Lists | PostItem (media), Avatar | Dùng thumbnail URL (`?w=200&h=200`) thay vì full-res image |
| `list-performance-item-expensive` | Lightweight List Items | PostItem, NotificationItem | Không fetch data, không heavy computation trong list item. Parent fetch, truyền primitives xuống |
| `list-performance-item-types` | Item Types for Heterogeneous Lists | FeedScreen (nếu có mixed content) | Dùng `getItemType` để FlashList/LegendList recycle đúng pool |

#### 🔴 HIGH — Animation

| Rule ID | Tên Rule | Áp dụng vào đâu | Mô tả |
|---------|----------|-----------------|-------|
| `animation-gpu-properties` | Animate Transform & Opacity Only | Press effects, transitions, modals | Không animate `width/height/margin`. Chỉ dùng `transform` (scale, translate) và `opacity` — chạy trên GPU |
| `animation-derived-value` | useDerivedValue over useAnimatedReaction | Animation logic phức tạp | Dùng `useDerivedValue(() => ...)` cho computed animations, `useAnimatedReaction` chỉ cho side effects |
| `animation-gesture-detector-press` | GestureDetector for Animated Press | Button animations | Dùng `Gesture.Tap()` + shared values thay `Pressable.onPressIn` — chạy trên UI thread, mượt hơn |

#### 🔴 HIGH — Scroll & Navigation

| Rule ID | Tên Rule | Áp dụng vào đâu | Mô tả |
|---------|----------|-----------------|-------|
| `scroll-no-usestate` | Never Track Scroll in useState | Mọi ScrollView có scroll tracking | Dùng Reanimated `useSharedValue` hoặc `useRef`, không `useState` — tránh render thrashing |
| `navigation-native-navigators` | Use Native Navigators | App.tsx, navigation setup | Dùng `createNativeStackNavigator` (đã có ✅). Cân nhắc `react-native-bottom-tabs` cho tab bar |

#### 🟡 MEDIUM — UI Patterns

| Rule ID | Tên Rule | Áp dụng vào đâu | Mô tả |
|---------|----------|-----------------|-------|
| `ui-expo-image` | Use expo-image | Mọi nơi hiển thị ảnh | Thay `Image` bằng `expo-image` — caching tốt hơn, placeholder, transition, WebP support |
| `ui-pressable` | Pressable over TouchableOpacity | Mọi touchable element | `Pressable` linh hoạt hơn, là API chính thức, hỗ trợ hover/focus states |
| `ui-safe-area-scroll` | Handle Safe Areas in ScrollViews | FeedScreen, ChatScreen | Dùng `contentInsetAdjustmentBehavior="automatic"` trên iOS |
| `ui-measure-views` | Use onLayout, not measure() | Components cần đo kích thước | `onLayout` callback thay vì `ref.measure()` — đồng bộ, không race conditions |
| `ui-styling` | StyleSheet.create hoặc NativeWind | Toàn bộ styling | Luôn dùng `StyleSheet.create` — RN optimize references, không tạo object mới mỗi render |
| `ui-native-modals` | Native Modals When Possible | Confirm dialogs, alerts | Dùng native modals (Alert, ActionSheet) thay JS-based bottom sheets khi phù hợp |

#### 🟡 MEDIUM — State Management

| Rule ID | Tên Rule | Áp dụng vào đâu | Mô tả |
|---------|----------|-----------------|-------|
| `react-state-minimize` | Minimize State & Derive Values | AuthContext, mọi screen | Không lưu `total`, `count` nếu derive được từ `items`. State = minimal source of truth |
| `react-state-dispatcher` | Dispatch Updaters for setState | AuthContext, mọi callbacks | `setState(prev => prev + 1)` thay `setState(count + 1)` — tránh stale closures |
| `react-state-fallback` | Fallback State over Initial State | Settings, form defaults | Dùng `undefined` + nullish coalescing `??` thay initial value — reactive fallbacks |

#### 🟢 LOW — Configuration

| Rule ID | Tên Rule | Áp dụng vào đâu | Mô tả |
|---------|----------|-----------------|-------|
| `fonts-config-plugin` | Config Plugins for Fonts | app.config.ts | Load fonts native ở build time, không runtime |
| `imports-design-system-folder` | Design System Folder | src/components/common/ | Tổ chức design system imports qua 1 folder trung tâm |
| `js-hoist-intl` | Hoist Intl Formatters | Date/currency formatting | Tạo `Intl.DateTimeFormat` 1 lần ở module level, không trong render |

---

### 2.2 Từ `vercel-react-best-practices` — Rules áp dụng được cho RN

> Server-Side Performance và Bundle Size rules **KHÔNG** áp dụng cho React Native. Các rules sau đây áp dụng được:

#### 🔴 CRITICAL — Eliminating Waterfalls

| Rule ID | Tên Rule | Áp dụng vào đâu | Mô tả |
|---------|----------|-----------------|-------|
| `async-parallel` | Promise.all() for Independent Ops | FeedScreen (posts + notifications), ProfileScreen (profile + posts) | Fetch song song thay tuần tự. VD: `const [posts, notifs] = await Promise.all([...])` |
| `async-defer-await` | Defer Await Until Needed | Auth flows, conditional API calls | Move `await` vào branch thực sự cần, không block toàn bộ function |
| `async-cheap-condition-before-await` | Check Cheap Condition First | Mọi async function có guard conditions | Check sync condition trước, rồi mới `await` — tiết kiệm network call |

#### 🟡 MEDIUM-HIGH — Client-Side Data Fetching

| Rule ID | Tên Rule | Áp dụng vào đâu | Mô tả |
|---------|----------|-----------------|-------|
| `client-localstorage-schema` | Version & Minimize Stored Data | SecureStore usage | Thêm version prefix, chỉ lưu fields cần thiết, wrap try/catch |

#### 🟡 MEDIUM — Re-render Optimization

| Rule ID | Tên Rule | Áp dụng vào đâu | Mô tả |
|---------|----------|-----------------|-------|
| `rerender-no-inline-components` | Don't Define Components Inside Components | Mọi component | Component bên trong component = remount mỗi render. Luôn define riêng, truyền props |
| `rerender-memo` | Extract to Memoized Components | PostItem, heavy components | Wrap `React.memo()` để skip re-render khi props stable |
| `rerender-memo-with-default-value` | Hoist Default Non-primitive Props | Memoized components có optional props | Extract default value ra constant: `const NOOP = () => {}` |
| `rerender-functional-setstate` | Functional setState Updates | Mọi setState phụ thuộc current state | `setItems(prev => [...prev, newItem])` — stable callbacks, no stale closures |
| `rerender-lazy-state-init` | Lazy State Initialization | useState với expensive initial value | `useState(() => JSON.parse(...))` thay `useState(JSON.parse(...))` |
| `rerender-derived-state-no-effect` | Derive State During Render | Cart total, filtered lists, computed values | `const total = items.reduce(...)` thay `useEffect(() => setTotal(...))` |
| `rerender-derived-state` | Subscribe to Derived Booleans | Auth state, loading states | `const isLoggedIn = !!token` thay subscribe toàn bộ auth object |
| `rerender-dependencies` | Narrow Effect Dependencies | useEffect dependencies | `[user.id]` thay `[user]` — effect chỉ re-run khi id thay đổi |
| `rerender-split-combined-hooks` | Split Combined Hooks | useMemo/useEffect với independent deps | Tách filter + sort thành 2 useMemo riêng — sort không recompute khi filter deps thay đổi |
| `rerender-use-ref-transient-values` | useRef for Transient Values | Scroll position, interval IDs, flags | Giá trị thay đổi thường xuyên nhưng không cần re-render → `useRef` |
| `rerender-move-effect-to-event` | Put Logic in Event Handlers | Submit, like, follow actions | Side effects do user interaction → xử lý trong handler, không model state + effect |

#### 🟢 LOW-MEDIUM — JavaScript Performance

| Rule ID | Tên Rule | Áp dụng vào đâu | Mô tả |
|---------|----------|-----------------|-------|
| `js-early-exit` | Early Return from Functions | Mọi function | Return sớm khi điều kiện không thỏa — giảm nesting, dễ đọc |
| `js-set-map-lookups` | Set/Map for O(1) Lookups | Check liked posts, blocked users | `new Set(likedIds).has(id)` thay `likedIds.includes(id)` |
| `js-combine-iterations` | Combine Array Iterations | Data transformation | 1 loop thay `filter().map()` — iterate 1 lần |
| `js-hoist-regexp` | Hoist RegExp Creation | Search, validation | Tạo RegExp ở module level, không trong loop/render |
| `js-cache-property-access` | Cache Object Properties in Loops | Loops qua arrays of objects | `const len = arr.length` trước loop |
| `js-flatmap-filter` | flatMap to Map+Filter in One Pass | Data processing | `items.flatMap(x => condition ? [transform(x)] : [])` |

#### 🟢 LOW — Rendering Performance

| Rule ID | Tên Rule | Áp dụng vào đâu | Mô tả |
|---------|----------|-----------------|-------|
| `rendering-hoist-jsx` | Hoist Static JSX | Components có JSX không đổi | Extract static JSX ra biến module-level — React skip diffing |
| `rendering-conditional-render` | Ternary over `&&` | Conditional rendering | Ternary rõ ràng hơn và tránh falsy value bugs (trùng với RN rule) |

#### 🟢 LOW — Advanced Patterns

| Rule ID | Tên Rule | Áp dụng vào đâu | Mô tả |
|---------|----------|-----------------|-------|
| `advanced-init-once` | Initialize App Once | App.tsx — Socket.IO init, analytics | Dùng module-level flag để init 1 lần, không re-init khi StrictMode double-mount |
| `advanced-use-latest` | useLatest for Stable Callbacks | Event handlers dùng trong effects | Ref wrapper để luôn có latest callback version mà không thay đổi effect deps |

---

### 2.3 Rules KHÔNG áp dụng cho React Native

| Category | Lý do |
|----------|-------|
| `bundle-*` (Bundle Size) | RN dùng Metro bundler, không tree-shake như Webpack/Vite |
| `server-*` (Server-Side) | RN là client-only, không có SSR/RSC |
| `async-suspense-boundaries` | Suspense streaming không áp dụng cho RN |
| `rendering-hydration-*` | Không có hydration trong RN |
| `rendering-content-visibility` | CSS property, không có trong RN |
| `rendering-activity` | React Activity component chưa support RN |
| `client-swr-dedup` | SWR là web-focused, RN dùng React Query/TanStack hoặc custom hooks |
| `client-event-listeners` | Web DOM events, không áp dụng trực tiếp |
| `client-passive-event-listeners` | Web scroll optimization, RN dùng native scroll |
| `js-batch-dom-css` | Không có DOM/CSS trong RN |
| `js-request-idle-callback` | `requestIdleCallback` là browser API |

---

## 3. Cấu trúc thư mục mới (TypeScript)

```
mobile/
├── app.config.ts              # Thay app.json, hỗ trợ env vars
├── App.tsx                    # Entry point
├── babel.config.js
├── tsconfig.json
├── index.ts
├── .env / .env.example
├── src/
│   ├── api/
│   │   ├── client.ts          # Axios + interceptors + timeout
│   │   ├── endpoints.ts       # API endpoint constants
│   │   └── types.ts           # API response types
│   ├── assets/icons/ & images/
│   ├── components/
│   │   ├── common/            # Button, Input, Avatar, Loading, EmptyState, ErrorView
│   │   ├── post/              # PostItem, PostComposer, PostActions
│   │   ├── notification/      # NotificationItem
│   │   └── chat/              # MessageBubble, ChatInput
│   ├── hooks/                 # useAuth, useApi, usePosts, useNotifications, useSocket
│   ├── navigation/            # RootNavigator, AuthStack, MainTabs, types.ts
│   ├── screens/               # auth/, feed/, search/, notifications/, chat/, profile/, settings/
│   ├── store/                 # AuthContext.tsx, SocketContext.tsx
│   ├── theme/                 # colors.ts, spacing.ts, typography.ts, styles.ts
│   ├── types/                 # models.ts, api.ts, navigation.ts
│   └── utils/                 # storage.ts, formatDate.ts, validators.ts
```

---

## 4. Phase 1 — Foundation & Migration (Tuần 1)

### 4.1 Dependencies mới (SDK 55 + Nav 7)

```bash
# TypeScript
npx expo install typescript @types/react @types/react-native

# Token persistence
npx expo install expo-secure-store

# Lists (rule: list-performance-virtualize)
npx expo install @shopify/flash-list

# Navigation 7 (đã install ở Bước 0.3)
# @react-navigation/native@^7
# @react-navigation/native-stack@^7
# @react-navigation/bottom-tabs@^7

# Images (rule: ui-expo-image)
npx expo install expo-image

# Animations (rule: animation-gpu-properties)
npx expo install react-native-reanimated react-native-gesture-handler

# Dev tools
npm install -D @testing-library/react-native jest

# Form handling + validation
npm install react-hook-form @hookform/resolvers zod

# Camera, Location, Media (tính năng xã hội)
npx expo install expo-camera expo-location expo-media-library
```

### 4.2 Shared Types, API Client, SecureStore wrapper
_(Chi tiết code xem ở bản plan trước — giữ nguyên)_

---

## 5. Phase 2 — Navigation & Design System (Tuần 2)

### Navigation Structure (React Navigation 7 — Static API)

```
RootNavigator (NativeStack)
├── AuthStack (NativeStack) → Login, Register
└── MainTabs (Bottom Tabs)
    ├── FeedStack → Feed, PostDetail, UserProfile
    ├── SearchScreen
    ├── NotificationsScreen
    ├── ChatStack → Conversations, Chat
    └── ProfileStack → Profile, EditProfile, Settings
```

### React Navigation 7 — Static Config (Khuyến nghị)

```typescript
// src/navigation/RootNavigator.tsx
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createStaticNavigation } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

// Static config — auto TypeScript types, no manual ParamList needed
const FeedStack = createNativeStackNavigator({
  screens: {
    Feed: { screen: FeedScreen },
    PostDetail: { screen: PostDetailScreen },
    UserProfile: { screen: UserProfileScreen },
  },
});

const MainTabs = createBottomTabNavigator({
  screens: {
    FeedTab: { screen: FeedStack, options: { title: "Home" } },
    Search: { screen: SearchScreen },
    Notifications: { screen: NotificationsScreen },
    ChatTab: { screen: ChatStack },
    ProfileTab: { screen: ProfileStack },
  },
});

const RootStack = createNativeStackNavigator({
  screenLayout: ({ children }) => <>{children}</>,
  screens: {
    Auth: { screen: AuthStack, options: { headerShown: false } },
    Main: { screen: MainTabs, options: { headerShown: false } },
  },
});

// createStaticNavigation generates typed Navigation component
export const Navigation = createStaticNavigation(RootStack);

// App.tsx
import { Navigation } from "./src/navigation/RootNavigator";
export default function App() {
  return (
    <AuthProvider>
      <Navigation />
    </AuthProvider>
  );
}
```

> [!TIP]
> **React Navigation 7 lợi ích:**
> - TypeScript types **tự động sinh** — không cần define `ParamList` thủ công
> - Deep linking config **tích hợp** trong static definition
> - **40-60% ít re-render** hơn nhờ `useSyncExternalStore`

---

## 6. Phase 3 — Screens & Components (Tuần 3–4)

### Screens cần build

| Screen | API Endpoints | Rules áp dụng chính |
|--------|---------------|---------------------|
| LoginScreen | `POST /auth/login` | `rerender-move-effect-to-event`, `react-hook-form` |
| RegisterScreen | `POST /auth/register`, `POST /auth/sendPhoneOtp` | `react-hook-form` + `zod` validation, `async-parallel` |
| FeedScreen | `GET /feed`, `GET /notifications` | `list-performance-virtualize`, `async-parallel`, `list-performance-item-memo` |
| SearchScreen | `GET /search?q=` | `list-performance-virtualize`, `rerender-use-ref-transient-values` (debounce) |
| NotificationsScreen | `GET /notifications`, `PATCH /:id/read` | `list-performance-virtualize`, `list-performance-item-types` |
| ConversationsScreen | `GET /conversations` | `list-performance-virtualize` |
| ChatScreen | `GET/POST /conversations/:id/messages` | `scroll-no-usestate`, `advanced-init-once` (socket) |
| ProfileScreen | `GET /users/:id/profile` | `rerender-derived-state`, `ui-expo-image` |
| EditProfileScreen | `PATCH /users/:id/profile` | `react-hook-form`, `rerender-move-effect-to-event` |
| SettingsScreen | Local + API | `react-state-fallback`, `client-localstorage-schema` |

---

## 7. Phase 4 — Performance & Polish (Tuần 5)

Áp dụng tất cả rules đã liệt kê ở Section 2, đặc biệt:

1. **Audit tất cả lists** — đảm bảo FlashList + memo + stable callbacks
2. **Audit conditional renders** — ternary thay `&&`
3. **Audit inline objects** — extract ra StyleSheet.create
4. **Audit useEffect** — narrow deps, move logic to handlers
5. **Audit setState** — functional updates cho state-dependent updates
6. **Test performance** — Flipper, React DevTools Profiler

---

## 8. Migration Plan (JS → TS) — Thứ tự

```
Step 1:  types/models.ts (tạo mới)
Step 2:  utils/storage.ts (tạo mới)  
Step 3:  api/client.js → client.ts
Step 4:  theme.js → theme/colors.ts + styles.ts
Step 5:  context/AuthContext.js → store/AuthContext.tsx
Step 6:  navigation/types.ts (tạo mới) + App.js → App.tsx
Step 7:  components/*.js → components/**/*.tsx
Step 8:  screens/*.js → screens/**/*.tsx
Step 9:  Tạo screens mới (Notifications, Chat, Settings, EditProfile)
Step 10: Xóa tất cả file .js cũ
```

---

## 9. Timeline tổng kết

| Phase | Tuần | Output |
|-------|------|--------|
| **1** | 1 | TypeScript + API client + types + storage |
| **2** | 2 | Design system + navigation + common components |
| **3** | 3–4 | Convert + build tất cả screens |
| **4** | 5 | Performance audit theo best practices + testing |

> [!TIP]
> **Nguyên tắc:** Mỗi file mới = `.tsx/.ts`. Không tạo file `.js`. Khi convert, xóa `.js` sau khi `.ts` hoạt động.

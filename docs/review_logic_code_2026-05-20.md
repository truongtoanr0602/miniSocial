# Review logic code - 2026-05-20

## Pham vi

Review logic hien tai cua monorepo `miniSocial`, gom:

- Backend: Express, TypeScript, MongoDB, Socket.IO.
- Frontend: Vite, React.
- Mobile: Expo, React Native.

Muc tieu review: tim loi logic co the phat sinh, API/client mismatch, va chuc nang chua hoat dong on dinh.

## Ket qua kiem tra tu dong

Da chay:

```bash
cd Backend && npm.cmd exec tsc -- --noEmit
cd Frontend && npm.cmd run build
cd mobile && npm.cmd exec tsc -- --noEmit
```

Ket qua:

- Backend typecheck: pass.
- Frontend build: pass.
- Mobile typecheck: pass.
- Frontend build co warning chunk JS lon khoang 632 kB.

Gioi han:

- `Frontend/` khong co `tsconfig*.json`, nen chua co lenh typecheck rieng cho web.

## Findings uu tien cao

### 1. Google login tren web sai shape response

File lien quan:

- `Frontend/src/services/authService.ts`
- `Frontend/src/app/components/LoginView.tsx`

`authService.googleLogin()` tra ve `response.data`, trong khi `LoginView.handleGoogleSuccess()` lai dung nhu object `{ token, user }`.

Tac dong:

- Dang nhap Google co the da luu token trong service nhung component van throw khi doc `data.user._id`.
- User co the bi bao loi hoac khong duoc dieu huong ve trang chinh.

Huong fix:

- Cho `googleLogin()` tra ve `response.data.data`, hoac sua `LoginView` doc `response.data.data`.
- Dong bo cach return voi `authService.login()`.

### 2. Privacy/visibility chua duoc enforce nhat quan

File lien quan:

- `Backend/src/controllers/userController.ts`
- `Backend/src/controllers/searchController.ts`
- `Backend/src/controllers/postController.ts`
- `Backend/src/controllers/feedController.ts`

Hien tai:

- Profile user tra ve toan bo posts cua user, co nguy co lo bai `private`.
- Search tim post khong loc `visibility`.
- Explore chi loai `private`, nen post `friends` van co the hien voi nguoi khong follow.

Tac dong:

- Chuc nang tai khoan rieng tu va bai viet friends/private chua dam bao dung y nghia.

Huong fix:

- Tao helper query visibility theo viewer:
  - Own profile: xem duoc tat ca.
  - Accepted follower: xem public + friends.
  - Khac: chi xem public.
- Ap dung chung cho profile, search, explore va feed.

### 3. Mobile realtime chua hoat dong dung

File lien quan:

- `mobile/src/store/SocketContext.tsx`
- `mobile/src/screens/FeedScreen.tsx`
- `mobile/src/hooks/useSocket.ts`
- `Backend/src/sockets/middleware.ts`

Hien tai:

- `SocketContext` da ket noi dung bang JWT auth handshake.
- Nhung cac screen mobile khong subscribe cac event `notification:new`, `newMessage`, `messagesRead`.
- `FeedScreen` va `useSocket` van tao socket rieng khong auth va emit `register-user`, trong khi backend hien tai xac thuc socket bang JWT handshake va khong thay handler `register-user`.

Tac dong:

- Mobile co the khong nhan realtime notification/chat.
- Co the phat sinh ket noi socket loi/lap thua.

Huong fix:

- Dung duy nhat `SocketContext`.
- Bo socket rieng trong `FeedScreen` va `useSocket` cu, hoac sua hook dung token.
- Them listener trong notification/chat screens cho cac event backend emit.

## Findings trung binh

### 4. Web notification doc sai field backend

File lien quan:

- `Frontend/src/hooks/useNotifications.ts`
- `Frontend/src/app/components/NotificationsView.tsx`

Backend tra field `message` va `created_at`, nhung UI dang doc `notification.content` va `notification.createdAt`.

Tac dong:

- Noi dung custom cua notification bi bo qua.
- Thoi gian co the hien sai/`Invalid Date`.

Huong fix:

- Doi UI sang `notification.message` va `notification.created_at`.
- Doi avatar sang `sender.avatar_url`.

### 5. Xoa comment co the lam sai stats.comments

File lien quan:

- `Backend/src/controllers/commentController.ts`

`deleteComment` khong check comment da bi soft delete hay chua, nhung moi lan goi van `$inc: { "stats.comments": -1 }`.

Tac dong:

- Goi DELETE lap lai co the lam `stats.comments` giam am hoac sai so lieu.

Huong fix:

- Neu `comment.stats.is_deleted === true` thi tra ve success idempotent hoac 400.
- Chi giam comment count lan dau soft delete.

### 6. Mobile toggle private account khong persist ngay

File lien quan:

- `mobile/src/screens/SettingsScreen.tsx`

Toggle `isPrivate` tren man Settings chinh chi doi state local. API update privacy chi chay khi user vao edit profile va bam save.

Tac dong:

- User bat/tat private account roi thoat man hinh se khong doi tren backend.

Huong fix:

- Khi toggle `isPrivate`, goi `PUT /users/update` voi `privacy`.
- Neu API fail thi rollback state.

### 7. Auth state web co the stale sau 401 hoac sua profile

File lien quan:

- `Frontend/src/services/api.ts`
- `Frontend/src/hooks/useCurrentUser.ts`
- `Frontend/src/app/components/SettingsView.tsx`

Interceptor xoa `userToken`/`userData` khi 401 nhung khong notify store. Settings cap nhat `userData` nhung khong emit event auth changed.

Tac dong:

- Route guard/nav/avatar co the khong cap nhat ngay cho den khi reload.

Huong fix:

- Goi `notifyAuthChanged()` sau khi interceptor clear auth.
- Goi `notifyAuthChanged()` sau khi Settings ghi `userData`.

## Findings thap

### 8. Report API chua validate target ton tai

File lien quan:

- `Backend/src/controllers/reportController.ts`
- `Backend/src/models/Report.ts`

Controller chi check ObjectId va field bat buoc, chua check target co ton tai trong Post/Comment/User.

Tac dong:

- Co the tao report cho ObjectId khong ton tai.
- `target_type` sai co the roi vao validation model va thanh 500 thay vi 400 ro rang.

Huong fix:

- Validate `target_type` trong controller.
- Query target model tuong ung truoc khi tao report.

## Chuc nang chua on dinh hoac chua day du

- Google login web: dang co loi response shape.
- Privacy/friends/private posts: chua enforce day du o profile/search/explore.
- Mobile realtime notification/chat: chua subscribe event dung cach.
- Web notification: hien sai field message/time.
- Comment stats: co nguy co sai khi delete lap.
- Mobile private toggle: chua persist neu chi bat/tat tren main settings.
- OTP: van la mock qua console, chua gui email/SMS that.
- Bookmark/save: hien la local UI behavior, chua co model/API that.
- Notification preferences: chu yeu la local setting, chua gan voi backend delivery.

## De xuat thu tu fix

1. Sua Google login web.
2. Dong bo visibility/privacy query backend.
3. Sua mobile realtime de dung `SocketContext` duy nhat.
4. Sua field notification web.
5. Lam `deleteComment` idempotent va khong giam stats lap.
6. Persist mobile private toggle ngay khi bam.
7. Notify auth store khi interceptor clear token va khi profile update.
8. Validate target report.


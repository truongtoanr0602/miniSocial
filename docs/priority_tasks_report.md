# Bao cao cac task uu tien da hoan thanh

Ngay thuc hien: 2026-05-18

## Tong quan

Da xu ly cac task uu tien truoc do, tru OTP that vi yeu cau hien tai van dung mock OTP.

## Dau ra chinh

### 1. Sua tao bai viet tren web

- Web da goi dung endpoint backend: `POST /api/post/createPost`.
- Field upload anh da doi tu `media` sang `images`, khop voi `multer upload.array("images", 5)`.
- Sau khi tao bai viet thanh cong, feed web tu refresh.

File lien quan:

- `Frontend/src/app/components/CreatePostModal.tsx`
- `Frontend/src/app/components/SocialMediaApp.tsx`
- `Frontend/src/app/components/PostFeed.tsx`

### 2. Like/unlike dung theo tung user

- Them collection/model `Reaction`.
- Like khong con tang vo han. Neu user da like thi bam lai se unlike.
- API tra ve `likes` va `is_liked` de frontend cap nhat UI dung.
- Feed tra them `is_liked` cho tung bai viet theo user dang dang nhap.

Endpoint:

- `POST /api/post/:postId/react`

File lien quan:

- `Backend/src/models/Reaction.ts`
- `Backend/src/controllers/reactionController.ts`
- `Backend/src/controllers/feedController.ts`
- `Backend/src/controllers/postController.ts`
- `Frontend/src/app/components/PostFeed.tsx`
- `Frontend/src/app/components/PostCard.tsx`

### 3. Comment web goi API that

- Web co the mo danh sach comment cua bai viet.
- Web co the gui comment moi qua API backend.
- So luong comment tren feed duoc cap nhat sau khi gui thanh cong.

Endpoint:

- `GET /api/post/:postId/comments`
- `POST /api/post/:postId/comments`

File lien quan:

- `Frontend/src/app/components/PostCard.tsx`
- `Frontend/src/app/components/PostFeed.tsx`
- `Frontend/src/types/models.ts`

### 4. Mount route report va them UI report/block

- Backend da mount route `/api/report`.
- Web co hanh dong bao cao bai viet tu menu cua post.
- Web co hanh dong chan nguoi dung tu menu cua post.

Endpoint:

- `POST /api/report`
- `GET /api/report`
- `POST /api/follow/block/:targetId`

File lien quan:

- `Backend/src/routes/reportRoutes.ts`
- `Backend/src/server.ts`
- `Frontend/src/app/components/PostCard.tsx`

### 5. Them sua/xoa bai viet

- Backend co endpoint sua bai viet cua chinh tac gia.
- Backend co endpoint xoa bai viet cua chinh tac gia.
- Khi xoa bai viet, reaction cua bai viet do cung duoc xoa.
- Web hien nut sua/xoa neu post thuoc user hien tai.

Endpoint:

- `PATCH /api/post/:postId`
- `DELETE /api/post/:postId`

File lien quan:

- `Backend/src/controllers/postController.ts`
- `Backend/src/routes/postRoutes.ts`
- `Frontend/src/app/components/PostCard.tsx`
- `Frontend/src/app/components/PostFeed.tsx`

### 6. Them security headers va rate limit auth

- Them middleware security headers noi bo, khong can cai them package.
- Them rate limit cho `/api/auth`.
- Giu mock OTP nhu yeu cau, khong tich hop email/SMS that.

File lien quan:

- `Backend/src/middleware/security.ts`
- `Backend/src/server.ts`

### 7. Sua config API mobile

- Mobile khong con chi phu thuoc vao hardcoded IP trong code logic.
- Co the cau hinh bang bien moi truong:
  - `EXPO_PUBLIC_API_BASE_URL`
  - `EXPO_PUBLIC_API_HOST`
- Neu khong cau hinh, app van fallback ve `192.168.1.8` nhu hien tai.

File lien quan:

- `mobile/src/api/config.ts`

### 8. Dong bo follow data

- Khi follow/unfollow bang `Follow` collection, backend dong bo them `User.following` va `User.followers`.
- Khi block, backend xoa follow hai chieu va dong bo lai user arrays.
- Khi accept follow request private, backend dong bo user arrays.

File lien quan:

- `Backend/src/controllers/followController.ts`

## Kiem tra da chay

```bash
cd Backend && npm.cmd exec tsc -- --noEmit
```

Ket qua: pass.

```bash
cd Frontend && npm.cmd run build
```

Ket qua: pass. Vite van canh bao chunk JS lon hon 500 kB.

```bash
cd mobile && npm.cmd exec tsc -- --noEmit
```

Ket qua: pass.

## Ghi chu con lai

- OTP van la mock theo dung yeu cau.
- Share/bookmark hien van la UI/local behavior, chua co model/API rieng.
- Vite warning bundle lon van con; nen tach code theo route/component sau neu muon toi uu performance.
- Video upload trong post controller hien van bo qua file video, chi xu ly anh.

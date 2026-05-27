# Review toàn bộ dự án Mini Social - 2026-05-27

## 1. Phạm vi và cách kiểm tra

Phạm vi review gồm 3 phần chính:

- `Backend`: Express + TypeScript + MongoDB/Mongoose + Socket.IO + MinIO.
- `Frontend`: React/Vite web app.
- `mobile`: Expo/React Native app.

Các lệnh đã chạy:

| Khu vực | Lệnh | Kết quả |
|---|---|---|
| Web | `npm.cmd run build` trong `Frontend` | Pass, nhưng cảnh báo bundle JS lớn `631.02 kB` sau minify. |
| Backend | `npx.cmd tsc --noEmit` trong `Backend` | Fail tại `Backend/src/sockets/helpers.ts:41`. |
| Mobile | `npx.cmd tsc --noEmit` trong `mobile` | Fail tại `mobile/src/components/PostItem.tsx:12`. |

Ghi chú môi trường:

- `npm`/`npx` chạy qua `npm.cmd`/`npx.cmd` vì PowerShell chặn script `.ps1`.
- Chưa chạy end-to-end runtime với MongoDB/MinIO thật. Các kết luận "đã xác nhận" bên dưới dựa trên build/type-check và đối chiếu code API giữa frontend/mobile/backend.
- Repo đang có sẵn nhiều thay đổi chưa commit trong `data/.minio.sys`, `docs/*`, `Backend/src/utils/visibilityFilter.ts`, `mobile/src/utils/mediaUrl.ts`. Báo cáo này không đụng vào các thay đổi đó.

## 2. Tóm tắt nhanh

Các chức năng có vấn đề rõ ràng nhất:

1. Backend hiện không pass TypeScript vì socket helper dùng sai field `sender`/`receiver` trong khi model `Message` dùng `senderId`/`receiverId`.
2. Mobile hiện không pass TypeScript vì `expo-av` không tồn tại trong `mobile/node_modules`, nhưng `PostItem.tsx` đang import `Video` từ đó.
3. Realtime chat trên mobile gần như không hoạt động đúng với backend hiện tại vì socket mobile không gửi JWT và dùng sai tên event.
4. Web notification đang đọc sai field từ backend, dẫn tới nội dung/thời gian/avatar hiển thị sai.
5. Privacy/private account/friends visibility chưa được enforce đầy đủ. Đặc biệt profile và search có thể lộ bài private/friends.
6. API profile có nguy cơ lộ `password_hash` vì select sai field.
7. API lấy danh sách report đang mở cho mọi user đăng nhập, chưa có kiểm tra admin.
8. Save/bookmark chưa có backend persistence; share chỉ tăng bộ đếm, chưa tạo bài share thật.
9. OTP email/SMS chỉ là mock log ra console, chưa gửi thật.
10. Dự án chưa có test tự động thực sự cho backend/web/mobile.

## 3. Lỗi đã xác nhận bằng build/type-check

### 3.1 Backend type-check fail: sai field message trong socket

Mức độ: Critical

Lệnh:

```powershell
npx.cmd tsc --noEmit
```

Kết quả:

```text
src/sockets/helpers.ts(41,30): error TS2551:
Property 'sender' does not exist on type '...IMessage...'. Did you mean 'senderId'?
```

Nguồn lỗi:

- `Backend/src/models/Message.ts:5-6`: model khai báo `senderId`, `receiverId`.
- `Backend/src/sockets/helpers.ts:21`: query dùng `receiver`.
- `Backend/src/sockets/helpers.ts:31`: query dùng `receiver`.
- `Backend/src/sockets/helpers.ts:35`: projection dùng `sender`.
- `Backend/src/sockets/helpers.ts:41`: đọc `msg.sender`.
- `Backend/src/sockets/chatHandlers.ts:102`: socket `markAsRead` cũng dùng `receiver`.

Tác động:

- TypeScript backend không pass.
- `flushPendingDeliveries()` không tìm được tin nhắn pending vì query field sai, nên trạng thái delivered cho tin nhắn offline không được flush đúng.
- Socket event `markAsRead` không update được tin nhắn vì query field sai. REST endpoint `PATCH /conversations/:conversationId/read` lại dùng `receiverId` đúng, nên web có thể vẫn được cứu bởi REST, nhưng socket path vẫn sai.

Hướng sửa:

- Đổi toàn bộ `sender` -> `senderId`, `receiver` -> `receiverId` trong socket helper/handler.
- Sau khi sửa, chạy lại `npx.cmd tsc --noEmit` trong `Backend`.

### 3.2 Mobile type-check fail: thiếu module `expo-av`

Mức độ: Critical

Lệnh:

```powershell
npx.cmd tsc --noEmit
```

Kết quả:

```text
src/components/PostItem.tsx(12,35): error TS2307:
Cannot find module 'expo-av' or its corresponding type declarations.
```

Nguồn lỗi:

- `mobile/src/components/PostItem.tsx:12`: `import { Video, ResizeMode } from 'expo-av';`
- `mobile/package.json` có khai báo `expo-av`, nhưng kiểm tra local cho thấy `mobile/node_modules/expo-av` chưa tồn tại.

Tác động:

- Mobile app không pass type-check.
- Tính năng xem video trong bài viết có thể không build được cho đến khi dependency được cài đúng hoặc được migrate sang package video phù hợp với Expo SDK hiện tại.

Hướng sửa:

- Chạy install lại dependency trong `mobile`, hoặc dùng `npx expo install expo-av`.
- Nếu Expo SDK hiện tại khuyến nghị package video mới, migrate phần video sang package đó.
- Sau đó chạy lại `npx.cmd tsc --noEmit`.

### 3.3 Web build pass nhưng bundle lớn

Mức độ: Low/Performance

Lệnh:

```powershell
npm.cmd run build
```

Kết quả:

- Build pass.
- Cảnh báo Vite: chunk JS chính `631.02 kB`, lớn hơn ngưỡng 500 kB.

Tác động:

- Không làm hỏng chức năng hiện tại.
- Có thể làm chậm first load, nhất là khi app lớn dần.

Hướng sửa:

- Code-split các view nặng: messages, settings, profile, notifications.
- Dynamic import cho modal/chức năng không dùng ngay.

## 4. Chức năng có khả năng chưa hoạt động hoặc hoạt động sai

### 4.1 Realtime chat trên mobile không khớp backend

Mức độ: High

Nguồn lỗi:

- `mobile/src/screens/MessagesScreen.tsx:82`: mobile connect `io(BASE_URL)` nhưng không truyền token.
- `Backend/src/sockets/middleware.ts:19-28`: backend bắt buộc JWT ở `socket.handshake.auth.token` hoặc header Authorization.
- `mobile/src/screens/MessagesScreen.tsx:86`: mobile emit `join_room`.
- `Backend/src/sockets/chatHandlers.ts:43`: backend lắng nghe `joinConversation`.
- `mobile/src/screens/MessagesScreen.tsx:90`: mobile lắng nghe `receive_message`.
- `Backend/src/controllers/conversationController.ts:351`: backend emit `newMessage`.
- `mobile/src/hooks/useSocket.ts:22-27` và `mobile/src/store/SocketContext.tsx:34-40`: cũng dùng socket không token và event `register-user`, không có handler tương ứng trong backend.

Tác động:

- Mobile khó nhận tin nhắn realtime qua Socket.IO.
- Mobile đang dùng polling để bù:
  - `mobile/src/screens/MessagesScreen.tsx:149-151`: reload mỗi 2.5 giây.
  - `mobile/src/screens/MessagesScreen.tsx:166-168`: reload thêm mỗi 3 giây.
- Hai interval trùng nhau gây request dư và vẫn không thay thế được realtime đúng nghĩa.

Hướng sửa:

- Dùng token từ `AuthContext` khi connect socket:
  - `io(BASE_URL, { auth: { token } })`.
- Đổi event mobile sang đúng backend:
  - `joinConversation`
  - `leaveConversation`
  - `newMessage`
  - `typing`
  - `stopTyping`
  - `markAsRead`
- Xóa polling trùng sau khi realtime ổn định.

### 4.2 Web notification đọc sai field từ backend

Mức độ: High

Nguồn lỗi:

- Backend model dùng:
  - `Backend/src/models/Notification.ts:8`: `message`
  - `Backend/src/models/Notification.ts:10`: `created_at`
  - `Backend/src/controllers/notificationController.ts:40`: lưu `message`
  - `Backend/src/controllers/notificationController.ts:83`: sort theo `created_at`
- Web lại dùng:
  - `Frontend/src/hooks/useNotifications.ts:17`: `content`
  - `Frontend/src/hooks/useNotifications.ts:19`: `createdAt`
  - `Frontend/src/app/components/NotificationsView.tsx:171`: đọc `notification.content`
  - `Frontend/src/app/components/NotificationsView.tsx:176`: gọi `timeAgo(notification.createdAt, text)`
  - `Frontend/src/app/components/NotificationsView.tsx:125`: đọc `sender.avatar`, trong khi backend populate `avatar_url`.

Tác động:

- Nội dung notification trên web thường rơi về text mặc định thay vì message thật từ backend.
- Thời gian có thể hiển thị `Invalid Date` hoặc sai.
- Avatar sender có thể fallback thay vì dùng avatar thật.

Hướng sửa:

- Đồng bộ type web với backend: `message`, `created_at`, `sender_id.avatar_url`.
- Hoặc normalize response trong `useNotifications()` trước khi đưa vào UI.

### 4.3 Privacy/private/friends visibility chưa được enforce

Mức độ: High

Nguồn lỗi:

- `Backend/src/controllers/userController.ts:28`: profile user lấy `PostModel.find({ author_id: id })`, không filter visibility theo viewer.
- `Backend/src/controllers/searchController.ts:28-33`: search post không filter visibility.
- `Backend/src/controllers/postController.ts:135`: explore chỉ loại `private`, nên bài `friends` vẫn xuất hiện cho mọi user đăng nhập.
- `Backend/src/controllers/feedController.ts:35`: personal feed lấy public + friends của người mình follow, nhưng chưa xét block.
- `Backend/src/utils/visibilityFilter.ts:11-38`: đã có helper visibility nhưng chưa được import/dùng ở controller nào.

Tác động:

- Người khác có thể thấy bài private/friends qua profile hoặc search.
- Chế độ private account chỉ ảnh hưởng follow request, chưa bảo vệ đầy đủ dữ liệu bài viết.
- Block cũng chưa được áp dụng đầy đủ trong feed/search/profile.

Hướng sửa:

- Dùng `getVisibilityFilter(viewerId, authorId)` trong profile.
- Search cần chỉ trả post public hoặc post được phép theo quan hệ follow.
- Explore chỉ nên trả `public`.
- Feed/search/profile nên loại tác giả đã block hoặc block viewer.

### 4.4 API profile có nguy cơ lộ `password_hash`

Mức độ: High/Security

Nguồn lỗi:

- `Backend/src/controllers/userController.ts:21`: dùng `.select("-password")`.
- `Backend/src/models/userModel.ts:7`: field thật là `password_hash`, không phải `password`.

Tác động:

- Khi gọi `GET /api/users/profile/:id`, response có thể chứa `password_hash`.
- Đây là lỗi bảo mật nghiêm trọng.

Hướng sửa:

- Đổi thành `.select("-password_hash")`.
- Cân nhắc set `select: false` ở schema field `password_hash`.
- Thêm test/API check để đảm bảo mọi profile response không chứa hash.

### 4.5 API report list chưa giới hạn admin

Mức độ: High/Security

Nguồn lỗi:

- `Backend/src/routes/reportRoutes.ts:7`: mọi route report chỉ cần `verifyToken`.
- `Backend/src/routes/reportRoutes.ts:10`: `GET /api/report` mở cho user đăng nhập.
- `Backend/src/controllers/reportController.ts:61`: comment ghi "admin", nhưng `getReports()` không kiểm tra role.

Tác động:

- Bất kỳ user đăng nhập nào cũng có thể xem danh sách report của toàn hệ thống.
- Dữ liệu report có thể chứa reporter và target nhạy cảm.

Hướng sửa:

- Thêm role/admin model hoặc middleware.
- Chặn `GET /api/report` nếu user không có quyền admin/moderator.

### 4.6 Share chưa tạo nội dung share thật

Mức độ: Medium

Nguồn lỗi:

- `Backend/src/controllers/postController.ts:98-129`: `sharePost` chỉ `$inc` `stats.shares`.
- `mobile/src/components/PostItem.tsx:269-280`: mobile comment rằng shared post sẽ xuất hiện ở news feed/profile và hỏi user có muốn xem trên profile.
- `Frontend/src/app/components/PostFeed.tsx:102-119`: web chỉ tăng counter rồi gọi share link.

Tác động:

- Nếu yêu cầu chức năng là "share/repost lên trang cá nhân", hiện chưa hoạt động.
- Nếu yêu cầu chỉ là "tăng số lượt chia sẻ/copy link", web gần đúng nhưng mobile đang thông báo sai kỳ vọng.

Hướng sửa:

- Xác định lại nghiệp vụ share:
  - Share link: chỉ tăng counter và copy/share URL.
  - Repost: cần model/field `shared_post_id`, tạo post mới và hiển thị ở profile/feed.
- Sửa message UI theo nghiệp vụ thật.

### 4.7 Save/bookmark chưa có persistence

Mức độ: Medium

Nguồn lỗi:

- `Frontend/src/app/components/PostCard.tsx:70`: `isSaved` chỉ là local state.
- `Frontend/src/app/components/PostCard.tsx:349`: bấm save chỉ toggle local state, không gọi API.
- `mobile/src/components/PostItem.tsx:79`: `isBookmarked` là local state.
- `mobile/src/components/PostItem.tsx:298-305`: handler chỉ alert, không gọi API.
- `mobile/src/components/PostItem.tsx:4`: import `Bookmark`, nhưng UI mobile hiện không render nút bookmark trong action row.
- Backend không có route/model bookmark/save.

Tác động:

- Web save mất sau refresh.
- Mobile save gần như chưa có chức năng thực tế.

Hướng sửa:

- Thêm model `SavedPost` hoặc field saved posts theo user.
- Thêm API save/unsave/list saved.
- Đồng bộ trạng thái từ backend vào web/mobile.

### 4.8 OTP email/SMS chỉ là mock

Mức độ: Medium/Production readiness

Nguồn lỗi:

- `Backend/src/controllers/authController.ts:144-147`: phone OTP chỉ `console.log`.
- `Backend/src/controllers/authController.ts:256-262`: email OTP chỉ `console.log`.
- Message phone ghi "3 phút" nhưng `expires_at` là 5 phút tại `Backend/src/controllers/authController.ts:139`.

Tác động:

- Register/forgot password chỉ dùng được khi developer đọc console backend.
- Người dùng thật không nhận được OTP qua email/SMS.

Hướng sửa:

- Tích hợp provider email/SMS thật.
- Không log OTP ở production.
- Đồng bộ thời hạn hiển thị với thời hạn thực tế.

### 4.9 Mobile "Quên mật khẩu" ở màn login chưa điều hướng

Mức độ: Medium

Nguồn lỗi:

- `mobile/src/screens/LoginScreen.tsx:97`: "Quên mật khẩu" là `<Text>`, không phải `Pressable`, không có `onPress`.
- Không thấy screen forgot password riêng trong `mobile/src/navigation/RootNavigator.tsx`.

Tác động:

- User mobile không thể mở luồng quên mật khẩu từ màn login.
- Một phần reset password đang có trong Settings, nhưng không giải quyết được trường hợp chưa đăng nhập.

Hướng sửa:

- Thêm `ForgotPasswordScreen` cho mobile.
- Bọc text bằng `Pressable` và thêm route navigation.

### 4.10 Media/avatar URL dễ hỏng khi truy cập từ mobile hoặc máy khác

Mức độ: Medium

Nguồn lỗi:

- `Backend/src/services/minioService.ts:61` và `:83`: backend lưu URL theo `env.minioEndpoint`, default là `localhost`.
- Mobile có helper rewrite riêng trong:
  - `mobile/src/components/PostItem.tsx:33-50`
  - `mobile/src/screens/MessagesScreen.tsx:50-75`
- Nhưng nhiều nơi vẫn dùng raw `avatar_url`/media URL:
  - `mobile/src/screens/ProfileScreen.tsx:39-42`
  - `mobile/src/screens/SearchScreen.tsx:97-111`
  - `mobile/src/screens/NotificationsScreen.tsx:81-94`
  - `Frontend/src/app/components/PostCard.tsx:298-300`
  - `Frontend/src/app/components/MessagesView.tsx:323-334`
- `mobile/src/utils/mediaUrl.ts:13-33` đã có helper `resolveMediaUrl`, nhưng chưa được dùng rộng rãi.

Tác động:

- URL `http://localhost:9000/...` hoạt động trên máy backend, nhưng sẽ sai trên điện thoại hoặc máy client khác.
- Avatar/media có thể không load dù upload thành công.

Hướng sửa:

- Backend nên trả URL public/base URL cấu hình theo client-accessible host, không hardcode `localhost`.
- Dùng một helper normalize URL duy nhất trên web/mobile.
- Thay các chỗ dùng raw `avatar_url`/`mediaUrl` bằng helper.

## 5. Vấn đề theo module

### 5.1 Backend

Chức năng có vẻ hoạt động một phần:

- Auth email/phone login/register hoạt động về mặt API nếu có OTP trong DB/log.
- Google login có logic, nhưng phụ thuộc `GOOGLE_CLIENT_ID`.
- CRUD post/comment/like cơ bản có endpoint và frontend đang gọi đúng.
- REST chat tạo conversation/gửi message/lấy message có vẻ khớp với web.
- Notification được tạo cho like/comment/follow.

Vấn đề cần sửa:

- Backend type-check fail do socket message field sai.
- `getUserProfile()` có thể lộ `password_hash`.
- Privacy/filter visibility chưa được enforce.
- Report admin API chưa có quyền admin.
- `postRoutes.ts` dùng multer memory storage không có file filter/size limit cho post upload, trong khi `middleware/upload.ts` đã có filter/limit nhưng chỉ dùng cho conversation upload.
- `deletePost()` xóa post và reaction nhưng không xóa comment/notification/report liên quan.
- `deleteComment()` giảm `stats.comments` nhưng không guard âm và không giảm `stats.replies` của parent khi xóa reply.
- `search()` trả cả email user (`Backend/src/controllers/searchController.ts:21`), có thể không nên expose.
- Server listen trước khi MongoDB connect xong (`Backend/src/server.ts:82-99`), app có thể nhận request khi DB chưa sẵn sàng.

### 5.2 Frontend web

Chức năng có vẻ hoạt động:

- Build production pass.
- Login/register/forgot password web có route và gọi API.
- Feed/create post/like/comment/edit/delete gọi endpoint hợp lý.
- Web chat REST và socket event chính nhìn chung khớp backend hơn mobile.

Vấn đề cần sửa:

- Notification dùng sai field `content`/`createdAt`/`avatar`.
- Save/bookmark chỉ local state.
- Share chưa tạo repost thật nếu nghiệp vụ yêu cầu chia sẻ lên profile.
- Media URL raw có thể hỏng ngoài localhost.
- `Frontend/src/types/models.ts` đang lệch backend ở notification/message:
  - notification dùng `content`, `createdAt`, `updatedAt`.
  - message dùng `sender`, `receiver`, `media_url`, trong khi backend dùng `senderId`, `receiverId`, `mediaUrl`.
- Bundle JS lớn, nên code-split.
- `Frontend/src/app/routes.tsx` có router kiểu `createBrowserRouter` nhưng `App.tsx` đang dùng `Routes` của `react-router-dom`; đây là code thừa/dễ gây nhầm.

### 5.3 Mobile

Chức năng có vẻ hoạt động một phần:

- Login/register email OTP có UI và gọi API.
- Feed/create post/like/comment/edit/delete có logic gọi endpoint.
- Profile/search/settings/notification có màn hình và API tương ứng.
- Chat REST có thể gửi/lấy message nhờ polling.

Vấn đề cần sửa:

- Type-check fail vì thiếu `expo-av`.
- Realtime socket mobile không khớp backend và thiếu JWT.
- Polling chat bị khai báo hai interval song song.
- Forgot password từ login chưa có interaction.
- Bookmark/save chưa render hoặc chưa persist.
- Media URL normalize bị copy-paste ở một số màn, helper chung chưa dùng rộng.
- `mobile/src/types/models.ts` vẫn định nghĩa `IMessage.sender`/`receiver`, lệch với backend `senderId`/`receiverId`.
- `PostItem.tsx` có import thừa `API_BASE_URL`, `fa`, `Bookmark` và nhiều logic local chưa dùng.

## 6. Bảng trạng thái chức năng chính

| Chức năng | Web | Mobile | Backend | Nhận xét |
|---|---|---|---|---|
| Đăng ký email/phone + OTP | Partial | Partial | Partial | OTP chỉ mock log, chưa gửi thật. |
| Đăng nhập email/phone | Có vẻ OK | Có vẻ OK | Có vẻ OK | Chưa có test tự động. |
| Google login | Config-dependent | Chưa thấy UI mobile | Config-dependent | Cần `GOOGLE_CLIENT_ID` đúng ở web/backend. |
| Quên mật khẩu | Partial | Chưa hoạt động từ login | Partial | Web gọi API; mobile login chưa có route; OTP mock. |
| Feed | Có vẻ OK | Có vẻ OK | Partial | Privacy/block chưa đầy đủ. |
| Tạo bài viết ảnh/video | Partial | Partial | Partial | Upload dùng được nhưng URL/limit/filter còn rủi ro; mobile video fail type-check. |
| Like | Có vẻ OK | Có vẻ OK | Có vẻ OK | Có notification. |
| Comment | Có vẻ OK | Có vẻ OK | Partial | Reply/delete count có thể lệch. |
| Edit/delete post | Có vẻ OK | Có vẻ OK | Có vẻ OK | Chưa xử lý cleanup comment/report. |
| Share | Partial | Partial | Partial | Chỉ tăng counter/copy link, không tạo repost. |
| Save/bookmark | Không persist | Chưa thực tế | Chưa có | Cần model/API. |
| Follow/unfollow | Có vẻ OK | Có vẻ OK | Partial | Pending private có, nhưng visibility chưa enforce. |
| Block | Partial | Partial | Partial | Xóa follow, nhưng feed/search/profile chưa filter block đầy đủ. |
| Search | Partial | Partial | Partial | Chưa filter privacy/block, expose email. |
| Notifications | Sai field hiển thị | REST có vẻ OK | Có vẻ OK | Web cần normalize field; mobile chưa realtime. |
| Chat REST | Có vẻ OK | Có thể OK | Có vẻ OK | Backend message model thống nhất với REST. |
| Chat realtime | Partial | Không khớp backend | Partial | Backend socket helper fail; mobile event/auth sai. |
| Report | Partial | Partial | Rủi ro bảo mật | GET report chưa admin-only. |
| Settings/profile update | Partial | Partial | Partial | Avatar URL/duplicate handling còn rủi ro. |

## 7. Ưu tiên sửa đề xuất

### P0 - Sửa ngay

1. Sửa backend socket field `sender`/`receiver` -> `senderId`/`receiverId`, chạy lại backend type-check.
2. Sửa `getUserProfile()` để không trả `password_hash`.
3. Sửa mobile dependency `expo-av` hoặc migrate video component để mobile pass type-check.
4. Chặn `GET /api/report` bằng middleware admin/moderator.

### P1 - Sửa trong vòng kế tiếp

1. Đồng bộ realtime socket mobile với backend: auth token + event names.
2. Sửa web notification field mapping.
3. Enforce privacy/filter visibility trong profile/search/explore/feed.
4. Chuẩn hóa media URL public cho web/mobile.

### P2 - Hoàn thiện chức năng

1. Làm thật save/bookmark.
2. Quyết định lại nghiệp vụ share: copy link hay repost.
3. Tích hợp email/SMS OTP thật.
4. Thêm test script và test tối thiểu cho auth/post/chat/privacy.
5. Code-split frontend để giảm bundle.

## 8. Test/kiểm thử còn thiếu

Hiện trạng script:

- Backend có `test` nhưng chỉ là placeholder: `echo "Error: no test specified" && exit 1`.
- Frontend không có test script, chỉ có `build` và `dev`.
- Mobile không có test/typecheck script, chỉ có Expo start scripts.

Nên thêm tối thiểu:

- Backend:
  - `npm run typecheck`
  - test API auth/register/login
  - test post visibility/private/friends
  - test chat message fields/read/delivered
  - test report admin-only
- Frontend:
  - typecheck riêng nếu thêm `tsconfig`
  - smoke test render login/feed/notification
- Mobile:
  - `npm run typecheck`
  - smoke test navigation/auth state

## 9. Kết luận

Dự án đã có khung chức năng khá đầy đủ cho mini social: auth, feed, post, comment, follow, chat, notification, report, settings và mobile app. Tuy nhiên hiện tại chưa thể coi là ổn định vì backend và mobile đều fail type-check, một số tính năng realtime/notification/privacy đang lệch contract giữa các lớp, và có ít nhất hai rủi ro bảo mật cần xử lý ngay: lộ `password_hash` ở profile và report list không giới hạn admin.

Thứ tự xử lý hợp lý là: backend type-check + security trước, sau đó mobile type-check + realtime socket, rồi đến privacy/search/feed và các chức năng chưa persist như save/share.

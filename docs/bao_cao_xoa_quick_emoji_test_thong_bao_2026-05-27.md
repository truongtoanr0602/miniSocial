# Báo cáo xóa Quick Emoji và kiểm tra thông báo Like/Follow

Ngày thực hiện: 27/05/2026

## Việc đã làm

1. Đã xóa Quick Emoji trong giao diện nhắn tin web.
   - Gỡ nút emoji cạnh ô nhập tin nhắn.
   - Gỡ danh sách emoji nhanh.
   - Gỡ state và handler liên quan đến emoji picker.
   - File chính: `Frontend/src/app/components/MessagesView.tsx`.

2. Đã bổ sung khả năng mở bài viết từ thông báo.
   - Thêm API `GET /api/post/:postId` để lấy một bài viết cụ thể theo `target_id` của thông báo.
   - API có kiểm tra quyền xem theo visibility trước khi trả bài viết.
   - File chính:
     - `Backend/src/controllers/postController.ts`
     - `Backend/src/routes/postRoutes.ts`

3. Đã cập nhật giao diện thông báo web.
   - Khi bấm thông báo `like`, `comment`, `mention`: mở đúng bài viết theo `target_id`.
   - Khi bấm thông báo `follow`: mở đúng trang cá nhân người vừa follow theo `sender_id` hoặc `target_id`.
   - Thông báo được đánh dấu đã đọc khi người dùng bấm vào.
   - File chính:
     - `Frontend/src/app/components/NotificationsView.tsx`
     - `Frontend/src/app/components/SocialMediaApp.tsx`
     - `Frontend/src/app/components/PostFeed.tsx`
     - `Frontend/src/app/components/PostCard.tsx`

4. Đã cập nhật feed để hỗ trợ bài viết được mở từ thông báo.
   - Nếu bài viết không nằm trong feed hiện tại, frontend gọi `GET /api/post/:postId` để tải bài đó.
   - Bài viết được đưa lên đầu feed và highlight để người dùng dễ nhận biết.

## Kết quả test API

Đã chạy test thực tế trên server test local `http://127.0.0.1:3100/api` với dữ liệu tạm, sau đó đã dọn dữ liệu test.

### Luồng Like

- Người A tạo bài viết.
- Người B gọi `POST /api/post/:postId/react`.
- Người A gọi `GET /api/notifications`.
- Kết quả: có thông báo `type = like`, `recipient_id` là người đăng, `sender_id` là người like, `target_id` là bài viết được like.
- Người A mở `GET /api/post/:target_id`.
- Kết quả: mở đúng bài viết vừa được like.

### Luồng Follow

- Người B gọi `POST /api/follow/:targetId` để follow Người A.
- Người A gọi `GET /api/notifications`.
- Kết quả: có thông báo `type = follow`, `recipient_id` là người được follow, `sender_id` là người vừa follow, `target_id` là profile của người vừa follow.
- Người A mở `GET /api/users/profile/:sender_id`.
- Kết quả: mở đúng trang cá nhân của người vừa follow.

## Kiểm tra kỹ thuật đã chạy

- `npm.cmd run build` trong `Frontend`: pass. Có cảnh báo bundle lớn hơn 500 KB, không chặn build.
- `npx.cmd tsc --noEmit` trong `Backend`: pass.
- `npx.cmd tsc --noEmit` trong `mobile`: pass.
- Kiểm tra lại quick emoji bằng `rg`: không còn `QUICK_EMOJIS`, `showEmojiPicker`, `handleSelectEmoji`, `Smile` trong `MessagesView.tsx`.

## Kết luận

Chức năng Quick Emoji đã được gỡ khỏi chat web. Luồng thông báo like và follow đã được kiểm tra bằng API thực tế: thông báo được tạo đúng cho người nhận và có đủ dữ liệu để điều hướng đến bài viết hoặc trang cá nhân tương ứng.

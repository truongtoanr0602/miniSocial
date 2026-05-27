# Báo cáo sửa chức năng chia sẻ và ảnh mobile - 2026-05-21

## Yêu cầu

- Xóa nút lưu nằm cạnh nút chia sẻ vì chức năng mô tả không có lưu bài viết.
- Chỉnh chia sẻ bài viết chỉ chia sẻ lên trang cá nhân, không mở app chia sẻ bên ngoài.
- Sửa lỗi mobile không nhìn được ảnh bài đăng.

## Thay đổi đã thực hiện

### Backend

- Thêm field `shared_post_id` vào model bài viết để lưu bài viết gốc được chia sẻ.
- Cập nhật `POST /api/post/:postId/share`:
  - Kiểm tra bài viết gốc hợp lệ và user hiện tại có quyền nhìn thấy bài viết đó.
  - Tăng `stats.shares` của bài gốc.
  - Tạo một bài viết mới trên trang cá nhân của user hiện tại với `shared_post_id` trỏ về bài gốc.
  - Trả về `sharedPost` đã populate để frontend/mobile có thể hiển thị ngay.
- Populate `shared_post_id` khi lấy feed và profile để bài share hiển thị nội dung bài gốc.

### Frontend web

- Xóa nút lưu/bookmark ở cạnh nút chia sẻ trong `PostCard`.
- Bỏ luồng `navigator.share` và copy link cho chia sẻ bài viết.
- Khi bấm chia sẻ:
  - Gọi API share nội bộ.
  - Cập nhật số lượt chia sẻ.
  - Thêm bài chia sẻ mới lên feed hoặc profile cá nhân nếu đang xem profile của mình.
- Sửa layout bài đăng trên mobile web:
  - Chữ dài tự xuống dòng, không kéo ngang card.
  - Ảnh bài đăng dùng `object-contain`, giới hạn chiều cao và không bị crop mất nội dung.
  - Card và media có `max-width`/`overflow` để không tràn viewport.

### Mobile app

- Xóa nút lưu/bookmark trong `PostItem`.
- Bỏ `React Native Share.share`, chia sẻ chỉ gọi API nội bộ và refresh feed/profile.
- Thêm `mobile/src/utils/mediaUrl.ts` để đổi URL media dạng `localhost`, `127.0.0.1`, `0.0.0.0` sang host đang cấu hình trong `EXPO_PUBLIC_API_HOST`/`BASE_URL`.
- Áp dụng helper URL cho:
  - Ảnh bài đăng trong feed/profile.
  - Ảnh preview của bài được chia sẻ.
  - Tab ảnh trong profile mobile.
- Đổi ảnh bài đăng sang `contentFit="contain"` để mobile nhìn được toàn bộ ảnh.

## File đã chỉnh

- `Backend/src/models/postModel.ts`
- `Backend/src/controllers/postController.ts`
- `Backend/src/controllers/feedController.ts`
- `Backend/src/controllers/userController.ts`
- `Frontend/src/app/components/PostCard.tsx`
- `Frontend/src/app/components/PostFeed.tsx`
- `Frontend/src/app/components/ProfileView.tsx`
- `Frontend/src/utils/share.ts`
- `Frontend/src/types/models.ts`
- `mobile/src/components/PostItem.tsx`
- `mobile/src/screens/ProfileScreen.tsx`
- `mobile/src/types/models.ts`
- `mobile/src/utils/mediaUrl.ts`

## Kiểm tra

- Backend: `npx.cmd tsc --noEmit` - đạt.
- Mobile: `npx.cmd tsc --noEmit` - đạt.
- Frontend: `npm.cmd run build` đã transform xong module nhưng dừng ở lỗi cấu hình Vite/Rollup: emitted asset nhận đường dẫn tuyệt đối `D:/miniSocial/Frontend/index.html`. Lỗi này xảy ra ở bước build HTML sau transform, không phải lỗi cú pháp từ các component đã chỉnh.

## Ghi chú

- Bài chia sẻ mới giữ visibility theo bài gốc để tránh mở rộng phạm vi hiển thị ngoài ý muốn.
- Với mobile, nếu vẫn không thấy ảnh, cần kiểm tra `EXPO_PUBLIC_API_HOST` có đúng IP LAN của máy chạy backend và MinIO không.

# Báo cáo cập nhật chức năng - 19/05/2026

## Tổng quan

Đã rà soát các chức năng đang báo "đang được cập nhật", "đang phát triển" hoặc chỉ hiển thị thông báo placeholder trong `Frontend`, `mobile` và `Backend`. Các chức năng chính đã được nối vào API thật hoặc thay bằng luồng tương tác hoàn chỉnh. Riêng giao diện nhắn tin web đã bỏ chức năng gọi thoại và gọi video theo yêu cầu.

## Cập nhật Backend

- Bổ sung xử lý upload tệp trong chat:
  - Ảnh được nén và upload qua MinIO.
  - Tệp tài liệu được upload dạng raw file.
  - Endpoint dùng lại route `POST /api/conversations/:conversationId/messages/upload`.
- Bổ sung hỗ trợ video khi tạo bài viết:
  - Backend không còn bỏ qua file video trong `createPost`.
  - Video được upload raw file và lưu vào `media` với type `video`.
- Bổ sung endpoint chia sẻ bài viết:
  - `POST /api/post/:postId/share`.
  - Tăng `stats.shares` và trả về số lượt chia sẻ mới.
- Mở rộng cập nhật hồ sơ:
  - Hỗ trợ cập nhật `username`, `email`, `phone_number`, `location`, `website`, `privacy`.
  - Model user có thêm `location` và `website`.

## Cập nhật Web Frontend

- Màn nhắn tin:
  - Đã bỏ nút gọi thoại và gọi video.
  - Gửi ảnh và gửi tệp hoạt động qua API upload.
  - Hiển thị ảnh/tệp ngay trong khung chat.
  - Thêm picker emoji nhanh.
  - Menu chat có thao tác đánh dấu đã đọc và sao chép username.
- Tạo bài viết:
  - Đăng ảnh/video hoạt động.
  - Thêm cảm xúc và vị trí vào nội dung bài viết.
  - Preview ảnh/video trước khi đăng.
- Bảng tin và trang cá nhân:
  - Chia sẻ bài viết hoạt động qua endpoint share.
  - Dùng Web Share API nếu trình duyệt hỗ trợ, nếu không sẽ copy link bài viết.
  - Cập nhật số lượt chia sẻ ngay trên UI.
- Trang cá nhân:
  - Menu tùy chọn hồ sơ có copy link, báo cáo tài khoản, chặn người dùng.
- Cài đặt:
  - Cập nhật hồ sơ gửi đầy đủ các trường thông tin.
  - Tài khoản riêng tư lưu xuống backend.
  - Chủ đề màu sắc có màn chọn riêng.
  - Chế độ tối lưu lựa chọn và áp dụng class `dark`.
  - FAQ/hỗ trợ có nội dung tương tác, không còn báo "đang cập nhật".
- Sidebar:
  - Nút "Xem thêm" gợi ý người dùng không còn placeholder.
- Build:
  - Chuyển inline style trong `index.html` sang `src/styles/index.css` để Vite build ổn định.

## Cập nhật Mobile

- Chat:
  - Gửi ảnh qua API upload.
  - Hiển thị ảnh trong khung chat.
- Đăng bài:
  - Chọn ảnh hoặc video.
  - Chọn nhanh cảm xúc và đưa vào nội dung bài viết.
- Bài viết:
  - Chia sẻ bài viết hoạt động qua endpoint share và React Native Share.
  - Cập nhật số lượt chia sẻ trên UI.
- Cài đặt:
  - Đổi mật khẩu có luồng gửi OTP và reset mật khẩu.
  - Chủ đề màu sắc có lựa chọn luân phiên.
  - FAQ/hỗ trợ có nội dung thật.
  - Cập nhật hồ sơ gửi thêm username, email, phone, location, website, privacy.

## Kết quả rà soát

- Không còn chuỗi placeholder kiểu:
  - "đang được cập nhật"
  - "đang phát triển"
  - "được phát triển"
  - `TODO`
- Phạm vi đã rà:
  - `Frontend/src`
  - `mobile/src`
  - `Backend/src`

## Kiểm thử đã chạy

- `npm.cmd run build` trong `Frontend`: thành công.
- `npx.cmd tsc --noEmit` trong `Backend`: thành công.
- `npx.cmd tsc --noEmit` trong `mobile`: thành công.
- Rà chuỗi placeholder bằng `rg`: không còn kết quả trong `Frontend/src`, `mobile/src`, `Backend/src`.

## Trạng thái server khi kiểm tra

- Frontend dev server đã chạy tại `http://127.0.0.1:5173/` và trả HTTP 200.
- Backend port `3000` đã có server đang chạy sẵn, endpoint `/api/test` trả phản hồi OK.

## Lưu ý

- Backend upload ảnh/video/tệp phụ thuộc MinIO local theo cấu hình `.env`.
- Các link chia sẻ hiện tạo link nội bộ theo `window.location.origin` với query `post` hoặc `profile`.
- Frontend chưa chạy được `npx tsc --noEmit` vì dự án không có TypeScript binary local và sandbox không cho tải package từ npm; Vite build đã chạy thành công.

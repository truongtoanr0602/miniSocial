# BÁO CÁO ĐỒ ÁN MÔN HỌC

## PHẦN MỞ ĐẦU

### Trang bìa & Trang phụ bìa
- **Tên trường:** [Tên trường của bạn]
- **Khoa:** [Tên khoa của bạn]
- **Tên đề tài:** Xây dựng ứng dụng Mạng Xã Hội Mini đa nền tảng (Web & Mobile)
- **Giảng viên hướng dẫn:** [Tên giảng viên]
- **Sinh viên thực hiện:** Trương Quốc Toản - Mã SV: 0214168 (và các thành viên khác nếu có)
- **Môn học:** Đồ án Đa Nền Tảng (Học kỳ 6)

### Lời cảm ơn và Lời cam đoan
**Lời cảm ơn:** Em xin gửi lời cảm ơn chân thành đến giảng viên hướng dẫn đã tận tình chỉ bảo, cung cấp những kiến thức quý báu và định hướng cho em trong suốt quá trình thực hiện đề tài này.
**Lời cam đoan:** Em xin cam đoan đây là công trình nghiên cứu và phát triển của bản thân (và nhóm). Các đoạn code, thư viện tham khảo đều được trích dẫn và sử dụng hợp lệ.

### Mục lục
1. Chương 1: Tổng quan
2. Chương 2: Cơ sở lý thuyết và Công nghệ
3. Chương 3: Phân tích và Thiết kế hệ thống
4. Chương 4: Xây dựng và Cài đặt ứng dụng
5. Chương 5: Kết luận và Hướng phát triển
6. Tài liệu tham khảo và Phụ lục

---

## 1. Chương 1: Tổng quan (Introduction)

### Lý do chọn đề tài
Trong thời đại số hóa hiện nay, mạng xã hội đã trở thành một phần không thể thiếu trong cuộc sống, giúp con người kết nối, chia sẻ thông tin và tương tác với nhau bất chấp khoảng cách địa lý. Tuy nhiên, việc xây dựng một hệ thống đồng nhất trên cả nền tảng Web và Mobile với khả năng đồng bộ dữ liệu theo thời gian thực luôn là một bài toán thú vị và thách thức. Đề tài "Mini Social App" được lựa chọn nhằm giải quyết vấn đề xây dựng một ứng dụng đa nền tảng mang lại trải nghiệm mượt mà, nhất quán cho người dùng.

### Mục tiêu đề tài
Xây dựng một ứng dụng mạng xã hội thu nhỏ (Mini Social) hoạt động trơn tru trên cả hai nền tảng Web và Mobile. Ứng dụng cung cấp các tính năng cốt lõi của một mạng xã hội hiện đại như:
- Đăng tải trạng thái (văn bản, hình ảnh).
- Tương tác với bài viết (Like, Comment).
- Cập nhật thông báo theo thời gian thực (Real-time).
- Trải nghiệm đồng nhất và dữ liệu được đồng bộ hóa tức thời giữa các thiết bị.

### Phạm vi nghiên cứu
- **Chức năng:** Tập trung vào các nghiệp vụ chính bao gồm Quản lý tài khoản (Auth), Bảng tin (Newsfeed), Đăng bài, Tương tác (Like/Comment), Thông báo thời gian thực và Tìm kiếm cơ bản.
- **Nền tảng hỗ trợ:** Trình duyệt Web (Desktop/Mobile Web) và Ứng dụng di động (Android/iOS).

---

## 2. Chương 2: Cơ sở lý thuyết và Công nghệ (Background)

### Công nghệ sử dụng
Dự án áp dụng các công nghệ hiện đại và phổ biến trong hệ sinh thái JavaScript, tối ưu cho việc phát triển ứng dụng đa nền tảng:
- **Mobile App:** `React Native` thông qua framework `Expo`, cho phép code một lần và chạy trên cả Android lẫn iOS.
- **Web App:** `ReactJS` kết hợp với build tool `Vite` giúp ứng dụng nhẹ, tốc độ phản hồi nhanh.
- **Backend:** `Node.js` cùng framework `Express.js` để xây dựng RESTful APIs.
- **Cơ sở dữ liệu:** `MongoDB` - hệ quản trị CSDL NoSQL linh hoạt, phù hợp với cấu trúc dữ liệu mạng xã hội.
- **Real-time:** Sử dụng `Socket.IO` để xử lý WebSockets, cho phép đẩy thông báo (push notifications) lập tức đến người dùng.
- **Lưu trữ tĩnh (Storage):** Triển khai `MinIO` (qua Docker) làm Object Storage độc lập lưu trữ hình ảnh/avatar.
- **Bảo mật & Xác thực:** `JSON Web Tokens (JWT)` và mã hóa mật khẩu với `bcrypt`.

### Kiến trúc hệ thống
Hệ thống được thiết kế theo mô hình **Client - Server**:
1. **Client Tier:** Gồm Web App và Mobile App, có nhiệm vụ render giao diện, xử lý UI/UX và gọi API.
2. **API/Logic Tier:** Backend Node.js chịu trách nhiệm xử lý nghiệp vụ, kiểm tra phân quyền và điều phối luồng dữ liệu. Xử lý đồng thời REST API và các kết nối WebSocket (Socket.IO).
3. **Data Tier:** MongoDB lưu trữ dữ liệu chính, MinIO lưu trữ file media.
Cấu trúc mã nguồn Backend được phân tách theo mô hình **MVC (Model - View - Controller)** (View ở đây được tách biệt hoàn toàn làm Client riêng).

---

## 3. Chương 3: Phân tích và Thiết kế hệ thống (Analysis & Design)

### Yêu cầu hệ thống
- **Yêu cầu chức năng (Functional):**
  - Đăng ký, đăng nhập tài khoản an toàn qua email/password.
  - Xem danh sách bài viết trên Newsfeed.
  - Tạo bài viết mới có đính kèm văn bản và hình ảnh.
  - Tương tác trực tiếp: Thích (Like) và Bình luận (Comment) bài viết.
  - Quản lý trang cá nhân (Profile): Cập nhật thông báo cá nhân, ảnh đại diện, xem các bài đã đăng.
  - Nhận thông báo realtime ngay lập tức khi có người tương tác với bài viết của mình.
  - Tìm kiếm bài viết/người dùng bằng từ khóa hoặc hashtag.

- **Yêu cầu phi chức năng (Non-functional):**
  - **Hiệu năng:** Tốc độ load Newsfeed nhanh, hình ảnh được tối ưu hóa.
  - **Tính khả dụng:** UI/UX thân thiện, Responsive trên mọi kích thước màn hình Web và Native trên Mobile.
  - **Bảo mật:** Mật khẩu phải được hash, API cần xác thực Bearer Token, phòng chống tấn công chèn mã độc.

### Biểu đồ Use Case (Các tác nhân chính)
- **Người dùng chưa đăng nhập (Guest):** Có thể Đăng ký, Đăng nhập.
- **Người dùng đã xác thực (User):** Có toàn quyền truy cập: Xem bảng tin, Đăng bài, Tương tác (Like/Comment), Sửa/xóa bài của chính mình, Xem thông báo, Chỉnh sửa hồ sơ.

### Thiết kế cơ sở dữ liệu
Hệ thống sử dụng MongoDB với 4 collection chính được liên kết tham chiếu (Reference):
1. **Users (`users`):** Lưu trữ thông tin định danh `_id`, `name`, `email`, `password` (hashed), `avatarUrl`, `bio`.
2. **Posts (`posts`):** Chứa nội dung bài đăng `content`, `imageUrl`, `hashtags`, danh sách `likes` (mảng ObjectID của User), và tham chiếu `author` đến collection Users.
3. **Comments (`comments`):** Lưu bình luận của người dùng trên bài đăng, tham chiếu đến cả `post` và `user`, cùng nội dung `text`.
4. **Notifications (`notifications`):** Phục vụ tính năng realtime, ghi nhận `recipient` (người nhận), `actor` (người tương tác), loại thông báo `type` (like/comment), nội dung `message` và trạng thái đọc `isRead`.

### Thiết kế giao diện (Wireframe/Mockup Overview)
Sơ đồ luồng cơ bản:
- `Màn hình Đăng nhập/Đăng ký` -> `Màn hình Bảng tin (Home/Newsfeed)`
- Từ `Newsfeed` -> `Màn hình Đăng bài (Create Post)` hoặc `Màn hình Chi tiết bài viết (Post Detail / Comments)`.
- Thanh điều hướng (Navbar/Bottom Tab) đi tới: `Bảng tin`, `Tìm kiếm`, `Thông báo`, `Hồ sơ cá nhân`.

---

## 4. Chương 4: Xây dựng và Cài đặt ứng dụng (Implementation)

### Môi trường triển khai
- **Môi trường phát triển:** Máy tính cài đặt Node.js (v18+), Docker & Docker Compose.
- **Công cụ lập trình:** Visual Studio Code.
- **Kiểm thử Mobile:** Máy ảo Android (Emulator) hoặc ứng dụng Expo Go trên thiết bị thật.

### Hiện thực hóa
- **Backend:** Thiết lập Express Server, kết nối MongoDB qua Mongoose. Triển khai API theo chuẩn REST. Đặc biệt cấu hình Socket.IO instance lắng nghe sự kiện `register-user` và emit `notification:new` khi có thay đổi.
- **Frontend (Web & Mobile):** Tổ chức theo cấu trúc Component-based của React. Sử dụng Context API hoặc thư viện quản lý state để chia sẻ dữ liệu xác thực (Auth State) toàn cục. Tái sử dụng các logic gọi API (Axios instance với interceptors để đính kèm JWT Token tự động).
- **Docker Compose:** Đóng gói dịch vụ cơ sở dữ liệu và Storage (`MinIO`) để dễ dàng khởi tạo môi trường trên mọi thiết bị chỉ với lệnh `docker compose up -d`.

### Kiểm thử (Testing)
- **Kiểm thử API (Postman):** Tạo các kịch bản test đăng nhập lấy Token, đính kèm Token vào Header để tạo bài viết, like, comment, và xác minh dữ liệu thay đổi trong DB.
- **Kiểm thử Real-time:** Mở 2 cửa sổ/thiết bị bằng 2 tài khoản khác nhau. User A like bài của User B -> Giao diện của User B nhảy số thông báo ngay lập tức mà không cần F5 (tải lại trang).
- **Kiểm thử đa nền tảng:** Đảm bảo một bài đăng từ Web hiển thị chính xác layout và hình ảnh trên App Mobile và ngược lại.

---

## 5. Chương 5: Kết luận và Hướng phát triển

### Đánh giá và Kết quả đạt được
Ứng dụng Mini Social App cơ bản đã hoàn thiện và đáp ứng được các mục tiêu cốt lõi đề ra:
- **Ưu điểm:** 
  - Hoàn thiện một mô hình ứng dụng fullstack (Monorepo) với kiến trúc rõ ràng, dễ bảo trì.
  - Sử dụng ReactJS và React Native giúp tiết kiệm thời gian phát triển giao diện do tận dụng được hệ sinh thái tương đồng.
  - Trải nghiệm cập nhật thời gian thực qua Socket.IO hoạt động cực kỳ ổn định và mượt mà.
  - Hệ thống xác thực bằng JWT bảo mật, không lưu trạng thái session trên server.
- **Nhược điểm/Hạn chế:**
  - Chưa tích hợp tính năng nhắn tin riêng tư (Private Chat / 1-on-1 Chat).
  - Chưa triển khai các bộ lọc kiểm duyệt nội dung văn bản và hình ảnh khi đăng tải.

### Hướng phát triển trong tương lai
Để ứng dụng ngày càng hoàn thiện và mang tính thực tiễn cao hơn, hệ thống có thể mở rộng các tính năng sau:
- Tích hợp đăng nhập bằng mạng xã hội (OAuth2 qua Google/Facebook) với Passport.js.
- Phát triển tính năng Chat 1-1 và Group Chat realtime.
- Tích hợp Redis Cache để tăng tốc độ truy xuất Newsfeed khi lượng người dùng lớn.
- Triển khai chức năng gọi điện (Video/Voice Call) bằng WebRTC.
- Nâng cấp lên Cloud Storage thực tế (như AWS S3 hoặc Cloudinary) khi deploy lên môi trường Production thay vì MinIO local.

---

## Tài liệu tham khảo và Phụ lục

**Tài liệu tham khảo:**
1. Tài liệu chính thức của ReactJS & React Native: https://react.dev, https://reactnative.dev
2. Tài liệu Expo: https://docs.expo.dev
3. Hướng dẫn sử dụng Express.js & Node.js: https://expressjs.com
4. Tài liệu MongoDB & Mongoose: https://mongoosejs.com
5. Socket.IO Documentation: https://socket.io/docs/v4/
6. Docker Compose Documentation: https://docs.docker.com/compose/

**Phụ lục:**
- Mã nguồn dự án được lưu trữ tại: [Đường dẫn GitHub / Nơi lưu trữ]
- File cấu trúc database mẫu, API Collection (Postman).

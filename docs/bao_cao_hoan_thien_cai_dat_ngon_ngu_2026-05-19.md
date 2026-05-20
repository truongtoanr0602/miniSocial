# Báo cáo hoàn thiện cài đặt và ngôn ngữ - 19/05/2026

## Mục tiêu

Hoàn thiện các chức năng còn chưa hoạt động chuẩn bên trong phần Cài đặt, đặc biệt là chức năng chọn ngôn ngữ cho 2 ngôn ngữ: Tiếng Việt và English.

## Cập nhật Web Frontend

- Hoàn thiện chọn ngôn ngữ trong `SettingsView`:
  - Thêm màn `Ngôn ngữ` riêng trong Cài đặt.
  - Có 2 lựa chọn: `Tiếng Việt` và `English`.
  - Hiển thị dấu chọn cho ngôn ngữ đang dùng.
  - Bấm chọn sẽ đổi ngôn ngữ ngay bằng `i18n.changeLanguage()`.
  - Lưu lựa chọn vào `localStorage` key `v1:settings`.
  - Lưu lựa chọn xuống backend qua `/users/update` với field `language`.
  - Cập nhật `document.documentElement.lang` theo ngôn ngữ đang dùng.
- Cập nhật i18n:
  - `Frontend/src/i18n.tsx` đọc ngôn ngữ đã lưu từ `localStorage` khi khởi tạo app.
  - Bổ sung nhóm key `settings` trong `vi.json` và `en.json`.
  - Các phần chính trong Cài đặt web đã dùng key dịch cho tiêu đề, nhóm cài đặt, các dòng menu, trạng thái bật/tắt, màn giao diện và màn ngôn ngữ.
- Sửa các điểm chưa chuẩn trong Cài đặt web:
  - Dòng `Ngôn ngữ` không còn toast một chiều.
  - Dòng `Ngôn ngữ` trong màn `Giao diện` mở đúng màn chọn ngôn ngữ.
  - Khi lưu hồ sơ, field `language` cũng được gửi kèm để không bị mất lựa chọn.
- Hoàn thiện lưu ý về các màn web còn hardcoded:
  - Thêm `Frontend/src/hooks/useLangText.ts` để các component dùng chung lựa chọn `vi/en` hiện tại của `i18n`.
  - Áp dụng song ngữ cho các màn/luồng chính: `Navigation`, `LoginView`, `RegisterView`, `ForgotPassword`, `PostFeed`, `CreatePostModal`, `PostCard`, `SearchView`, `MessagesView`, `NotificationsView`, `ProfileCard`, `ProfileView`, `Sidebar`.
  - Hoàn thiện các màn con trong `SettingsView`: chỉnh sửa hồ sơ, thông báo, giao diện, ngôn ngữ, trợ giúp/hỗ trợ.
  - Các toast, alert, placeholder, empty state, nút hành động và nhãn thời gian chính đã đổi theo lựa chọn Tiếng Việt/English.

## Cập nhật Mobile

- Hoàn thiện chọn ngôn ngữ trong `SettingsScreen`:
  - Thêm mode `language`.
  - Thêm màn chọn ngôn ngữ riêng.
  - Có 2 lựa chọn: `Tiếng Việt` và `English`.
  - Hiển thị dấu chọn cho ngôn ngữ đang dùng.
  - Lựa chọn được lưu xuống backend qua `ENDPOINTS.UPDATE_PROFILE` với field `language`.
  - Khi tải profile, app đọc `data.settings.language` để hiển thị đúng ngôn ngữ hiện tại.
- Sửa dòng `Ngôn ngữ` trong danh sách Cài đặt mobile:
  - Không còn chỉ hiện alert "ứng dụng hỗ trợ Tiếng Việt".
  - Subtitle hiển thị đúng ngôn ngữ đang chọn.
- Khi lưu hồ sơ mobile:
  - Gửi kèm field `language` để giữ lựa chọn ngôn ngữ.
- Hoàn thiện lưu ý về hệ i18n mobile:
  - Thêm `mobile/src/store/LanguageContext.tsx`.
  - Bọc app bằng `LanguageProvider` trong `mobile/App.tsx`.
  - Lưu lựa chọn ngôn ngữ bằng `expo-secure-store` để app nhớ sau khi mở lại.
  - `RootNavigator` đổi title tab/header theo ngôn ngữ hiện tại.
  - Áp dụng song ngữ cho các màn/luồng chính: `LoginScreen`, `RegisterScreen`, `FeedScreen`, `PostComposer`, `PostItem`, `SearchScreen`, `MessagesScreen`, `NotificationsScreen`, `ProfileScreen`, `SettingsScreen`.
  - Áp dụng song ngữ cho component dùng chung: `ChatInput`, `ErrorView`, `EmptyState`.
  - Các nhãn, placeholder, alert, trạng thái rỗng, nút hành động và format ngày giờ chính đã đổi theo lựa chọn Tiếng Việt/English.

## Kết quả đạt được

- Chức năng chọn ngôn ngữ Việt/Anh hoạt động trên web.
- Cài đặt web áp dụng i18n ngay khi chọn ngôn ngữ.
- Cài đặt web đọc lại ngôn ngữ đã lưu khi reload app.
- Chức năng chọn ngôn ngữ trên mobile có màn riêng và lưu được lựa chọn.
- Web đã xử lý phần lưu ý cũ về các màn hardcoded bằng `useLangText` cho các màn chính.
- Mobile đã có hệ i18n nội bộ bằng `LanguageProvider`, không còn chỉ lưu/hiển thị ngôn ngữ trong Cài đặt.
- Đã sửa lỗi loading lặp ở Feed và các màn web khác sau khi mở rộng song ngữ:
  - Nguyên nhân: `useLangText()` tạo function mới sau mỗi render, làm các `useEffect/useCallback` phụ thuộc vào `text` bị chạy lại liên tục.
  - Cách sửa: bọc hàm trả về trong `useCallback` và chỉ đổi khi `i18n.language/resolvedLanguage` đổi.
  - File sửa: `Frontend/src/hooks/useLangText.ts`.
- Không còn chuỗi placeholder kiểu:
  - `Ứng dụng hiện hỗ trợ`
  - `đang được cập nhật`
  - `đang phát triển`
  - `Tính năng ... cập nhật/phát triển`
  - `TODO`

## Kiểm thử đã chạy

- `npm.cmd run build` trong `Frontend`: thành công.
- `npx.cmd tsc --noEmit` trong `Backend`: thành công.
- `npx.cmd tsc --noEmit` trong `mobile`: thành công.
- Rà chuỗi placeholder bằng `rg` trong `Frontend/src`, `mobile/src`, `Backend/src`: không còn kết quả.

## Lưu ý sau cập nhật

- Hai lưu ý cũ đã được xử lý: web đã mở rộng song ngữ ra các màn chính, mobile đã có `LanguageProvider` và các màn chính dùng chung lựa chọn ngôn ngữ.
- Các comment/log kỹ thuật trong source có thể vẫn là tiếng Việt nhưng không phải text hiển thị cho người dùng.

## Cập nhật bổ sung - 20/05/2026

- Đã xóa chức năng `Chủ đề màu sắc / Theme color` khỏi phần Cài đặt trên web và mobile.
- Đã xóa key i18n `settings.rows.themeColor` trong `Frontend/src/locales/vi.json` và `Frontend/src/locales/en.json` vì chức năng này không còn hiển thị.
- Đã xóa mục `Chat trực tiếp / Live chat` trong màn `Trợ giúp & Hỗ trợ` trên web và mobile.
- Đã hoàn thiện `Chế độ tối`:
  - Web: bật/tắt class `.dark` trên `document.documentElement`, lưu trạng thái vào `localStorage`, bổ sung CSS nền, card, text, border, input và shadow cho giao diện tối.
  - Mobile: thêm `ThemeProvider` dùng `expo-secure-store` để lưu `darkMode`, bọc app bằng provider, đổi `ScreenGradient` theo theme, và cập nhật các card/row/input/text trong `SettingsScreen` theo màu sáng/tối.
- Kết quả đạt được: trong Cài đặt không còn mục chủ đề màu sắc, trong Trợ giúp & Hỗ trợ không còn chat trực tiếp, công tắc Chế độ tối đã có hiệu lực hiển thị và được lưu lại sau khi mở app.
- Kiểm thử sau cập nhật:
  - `npm.cmd run build` trong `Frontend`: thành công.
  - `npx.cmd tsc --noEmit` trong `mobile`: thành công.
  - `npx.cmd tsc --noEmit` trong `Backend`: thành công.
  - Rà lại text/mã liên quan trong màn Cài đặt: không còn `themeColor`, `Theme color`, `Chủ đề màu sắc`, `Chat trực tiếp`, `Live chat`, `Palette`, `selectedTheme` hoặc `THEME_OPTIONS`.

## Cập nhật bổ sung 2 - 20/05/2026

- Đã xóa hoàn toàn chức năng `Chế độ tối / Dark mode` khỏi web và mobile:
  - Web: bỏ state `darkMode`, bỏ dòng cài đặt, bỏ key i18n `settings.rows.darkMode`, bỏ CSS `.dark`.
  - Mobile: bỏ `ThemeProvider`, xóa `mobile/src/store/ThemeContext.tsx`, khôi phục `ScreenGradient` về màu sáng mặc định và bỏ dòng `Chế độ tối` trong `SettingsScreen`.
- Đã sửa logic số tin nhắn chưa đọc:
  - Navbar web không còn chấm đỏ cố định ở icon tin nhắn; badge chỉ hiện khi tổng `unreadCount` > 0.
  - Danh sách hội thoại reset badge về `0` ngay khi mở cuộc trò chuyện hoặc khi tin nhắn của cuộc trò chuyện đang mở được render.
  - `useConversations` cập nhật `unreadCount` theo tin mới từ socket và chỉ tăng với tin nhắn do người khác gửi.
  - Backend `/conversations` đếm trực tiếp số tin chưa đọc từ `Message` với `receiver = userId` và `readAt = null`, giúp số badge chuẩn theo tin người khác gửi mà user hiện tại chưa đọc.
  - Mobile `MessagesScreen` cũng reset `unreadCount` local và gọi API đánh dấu đã đọc khi mở hội thoại.
- Kiểm thử sau cập nhật:
  - `npm.cmd run build` trong `Frontend`: thành công sau khi chạy lại.
  - `npx.cmd tsc --noEmit` trong `mobile`: thành công.
  - `npx.cmd tsc --noEmit` trong `Backend`: thành công.
  - Rà lại source: không còn `darkMode`, `Dark mode`, `Chế độ tối`, `ThemeProvider`, `ThemeContext`, `useAppTheme`, `.dark` trong các file giao diện liên quan.

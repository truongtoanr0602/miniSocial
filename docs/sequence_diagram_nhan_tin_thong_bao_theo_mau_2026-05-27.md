# Sequence Diagram Nhắn tin và Thông báo

Ngày lập: 27/05/2026

Tài liệu này vẽ sequence diagram theo kiểu flow kiểm tra hiện tại: các lane chính gồm `Backend`, `Socket.IO`, `Frontend`, `Mobile`, có đánh dấu trạng thái bằng `✅`.

## 1. Kiểm tra nhắn tin realtime qua Socket.IO

Flow hiện tại:

```mermaid
%%{init: {"theme":"dark"}}%%
sequenceDiagram
    participant BE as Backend
    participant S as Socket.IO
    participant FE as Frontend
    participant M as Mobile

    FE->>BE: POST /api/conversations/:conversationId/messages ✅
    M->>BE: POST /api/conversations/:conversationId/messages ✅
    BE->>BE: verifyToken + validate conversationId ✅
    BE->>BE: kiểm tra sender thuộc conversation ✅
    BE->>BE: xác định receiverId từ participants ✅
    BE->>BE: tạo Message + cập nhật lastMessage + unreadCount ✅
    BE->>S: emit "newMessage" tới receiverSocketId ✅
    S->>FE: useSocketEvent("newMessage") ✅
    FE->>FE: append message nếu đang mở đúng conversation ✅
    FE->>FE: update conversation list + unreadCount ✅
    S->>M: SocketContext nhận "newMessage" ✅
    M->>M: append message nếu đang mở đúng conversation ✅
    M->>M: loadConversations() nếu không ở đúng conversation ✅
```

Ghi chú:

- Web append tin nhắn realtime qua `useSocketEvent("newMessage")`.
- Mobile nhận qua `SocketContext`, đồng thời vẫn có polling fallback 3 giây khi đang mở hội thoại.
- Backend chỉ emit realtime nếu receiver đang online và có `receiverSocketId`.

## 2. Kiểm tra gửi ảnh/file trong tin nhắn

Flow hiện tại:

```mermaid
%%{init: {"theme":"dark"}}%%
sequenceDiagram
    participant BE as Backend
    participant MINIO as MinIO
    participant S as Socket.IO
    participant FE as Frontend
    participant M as Mobile

    FE->>BE: POST /api/conversations/:conversationId/messages/upload ✅
    M->>BE: POST /api/conversations/:conversationId/messages/upload ✅
    BE->>BE: uploadMiddleware.single("file") ✅
    BE->>BE: xác định messageType image/file ✅
    alt File là ảnh
        BE->>MINIO: uploadAndCompressImage(buffer) ✅
        MINIO-->>BE: mediaUrl webp ✅
    else File thường
        BE->>MINIO: uploadRawFile(buffer, originalName, mimetype) ✅
        MINIO-->>BE: mediaUrl raw file ✅
    end
    BE->>BE: tạo Message có mediaUrl ✅
    BE->>BE: cập nhật lastMessage + unreadCount ✅
    BE->>S: emit "newMessage" nếu receiver online ✅
    S->>FE: render ảnh hoặc link file ✅
    S->>M: render ảnh hoặc link file ✅
```

Ghi chú:

- Backend dùng cùng controller `sendMessage()` cho text và upload.
- Ảnh được nén WebP trước khi lưu MinIO.
- File thường/video được upload raw.

## 3. Kiểm tra mở hội thoại và đánh dấu đã đọc

Flow hiện tại:

```mermaid
%%{init: {"theme":"dark"}}%%
sequenceDiagram
    participant BE as Backend
    participant S as Socket.IO
    participant FE as Frontend
    participant M as Mobile

    FE->>BE: GET /api/conversations/:conversationId/messages ✅
    M->>BE: GET /api/conversations/:conversationId/messages ✅
    BE->>BE: kiểm tra user thuộc conversation ✅
    BE-->>FE: trả messages theo thứ tự cũ -> mới ✅
    BE-->>M: trả messages theo thứ tự cũ -> mới ✅

    FE->>S: emit "joinConversation" ✅
    M->>S: emit "joinConversation" ✅
    S->>BE: kiểm tra quyền vào room ✅
    S-->>FE: join room thành công ✅
    S-->>M: join room thành công ✅

    FE->>S: emit "markAsRead" ✅
    FE->>BE: PATCH /api/conversations/:conversationId/read ✅
    M->>BE: PATCH /api/conversations/:conversationId/read ✅
    BE->>BE: set readAt cho tin receiver=userId ✅
    BE->>BE: reset unreadCount[userId] = 0 ✅
    BE->>S: emit "messagesRead" cho partner online ✅
    S->>FE: cập nhật readAt trên UI partner ✅
    S->>M: cập nhật/read state hoặc refetch ✅
```

Ghi chú:

- Web hiện gọi cả socket `markAsRead` và REST `PATCH /read`.
- Mobile gọi REST `PATCH /read`.
- Các thao tác này idempotent, chạy lại không làm sai dữ liệu.

## 4. Kiểm tra typing indicator

Flow hiện tại:

```mermaid
%%{init: {"theme":"dark"}}%%
sequenceDiagram
    participant BE as Backend
    participant S as Socket.IO
    participant FE as Frontend
    participant M as Mobile

    FE->>S: emit "typing" {conversationId, receiverId} ✅
    S->>BE: getReceiverSocketId(receiverId) ✅
    S->>FE: emit "typing" cho receiver web nếu online ✅
    S->>M: emit "typing" cho receiver mobile nếu online ✅

    FE->>FE: set timeout 3 giây ✅
    FE->>S: emit "stopTyping" ✅
    S->>BE: getReceiverSocketId(receiverId) ✅
    S->>FE: emit "stopTyping" ✅
    S->>M: emit "stopTyping" ✅
```

Ghi chú:

- Web đã có `sendTyping()` trong `useMessages()`.
- Backend đã có handler `typing` và `stopTyping`.
- Mobile hiện tập trung vào nhận/gửi message; typing indicator chưa đầy đủ như web.

## 5. Kiểm tra delivered khi user online lại

Flow hiện tại:

```mermaid
%%{init: {"theme":"dark"}}%%
sequenceDiagram
    participant BE as Backend
    participant S as Socket.IO
    participant FE as Frontend
    participant M as Mobile

    FE->>S: connectSocket(auth.token) ✅
    M->>S: SocketContext connect(auth.token) ✅
    S->>BE: socket middleware verify JWT ✅
    BE->>BE: setUserOnline(userId, socketId) ✅
    BE->>BE: flushPendingDeliveries(userId) ✅
    BE->>BE: update Message deliveredAt=null -> now ✅
    BE->>S: emit "messagesDelivered" cho sender online ✅
    S->>FE: update deliveredAt phía web sender ✅
    S->>M: mobile có thể nhận event nếu listener được gắn ✅
```

Ghi chú:

- Backend đã có `flushPendingDeliveries()`.
- Web hook đã listen `messagesDelivered`.
- Mobile hiện chưa thể hiện rõ listener riêng cho `messagesDelivered` trong màn Messages.

## 6. Kiểm tra thông báo đẩy Like/Comment qua Socket.IO

Flow hiện tại:

```mermaid
%%{init: {"theme":"dark"}}%%
sequenceDiagram
    participant BE as Backend
    participant S as Socket.IO
    participant FE as Frontend
    participant M as Mobile

    FE->>BE: POST /api/post/:postId/react hoặc /comments ✅
    M->>BE: POST /api/post/:postId/react hoặc /comments ✅
    BE->>BE: xử lý like/comment + cập nhật Post stats ✅
    BE->>BE: createNotification(type="like/comment", target_id=postId) ✅
    BE->>BE: bỏ qua nếu sender là chủ bài viết ✅
    BE->>BE: lưu Notification vào MongoDB ✅
    BE->>BE: populate sender_id(_id, username, display_name, avatar_url) ✅
    BE->>S: emit "notification:new" tới recipientSocketId ✅
    S->>FE: useSocketEvent("notification:new") ✅
    FE->>FE: prepend vào notifications list ✅
    FE->>FE: hiển thị message + avatar_url + created_at ✅
    S->>M: SocketContext nhận "notification:new" ✅
    M->>M: prepend vào notifications list ✅
    M->>M: hiển thị notification trong FlashList ✅
```

Ghi chú:

- `like` và `comment` dùng `target_id = postId`.
- Frontend web có thể bấm thông báo để mở bài viết theo `target_id`.
- Mobile hiện mới mark read khi bấm notification, chưa thấy điều hướng mở bài viết trong màn notification hiện tại.

## 7. Kiểm tra thông báo đẩy Follow qua Socket.IO

Flow hiện tại:

```mermaid
%%{init: {"theme":"dark"}}%%
sequenceDiagram
    participant BE as Backend
    participant S as Socket.IO
    participant FE as Frontend
    participant M as Mobile

    FE->>BE: POST /api/follow/:targetId ✅
    M->>BE: POST /api/follow/:targetId ✅
    BE->>BE: validate targetId + chặn tự follow ✅
    BE->>BE: kiểm tra block hai chiều ✅
    alt Đã follow
        BE->>BE: xóa Follow + pull followers/following ✅
        BE-->>FE: is_following=false ✅
        BE-->>M: is_following=false ✅
    else Chưa follow
        BE->>BE: tạo Follow status accepted/pending ✅
        BE->>BE: cập nhật followers/following nếu accepted ✅
        BE->>BE: createNotification(type="follow", target_id=followerId) ✅
        BE->>S: emit "notification:new" tới người được follow ✅
        S->>FE: prepend notification ✅
        S->>M: prepend notification ✅
        BE-->>FE: is_following=true + status ✅
        BE-->>M: is_following=true + status ✅
    end
```

Ghi chú:

- `follow` dùng `target_id = followerId`.
- Web ưu tiên mở profile theo `sender_id`, fallback `target_id`.

## 8. Kiểm tra mở thông báo để điều hướng

Flow hiện tại:

```mermaid
%%{init: {"theme":"dark"}}%%
sequenceDiagram
    participant BE as Backend
    participant S as Socket.IO
    participant FE as Frontend
    participant M as Mobile

    FE->>FE: user bấm notification ✅
    FE->>BE: PATCH /api/notifications/:notificationId/read ✅
    BE->>BE: kiểm tra recipient_id là user hiện tại ✅
    BE-->>FE: notification is_read=true ✅
    alt type like/comment/mention
        FE->>FE: onOpenPost(target_id) ✅
        FE->>BE: GET /api/post/:target_id ✅
        BE->>BE: kiểm tra visibility trước khi trả post ✅
        BE-->>FE: trả post + is_liked ✅
        FE->>FE: chuyển sang feed + highlight bài viết ✅
    else type follow
        FE->>FE: onOpenProfile(sender_id hoặc target_id) ✅
        FE->>BE: GET /api/users/profile/:id ✅
        BE-->>FE: trả user + posts ✅
        FE->>FE: chuyển sang profile người follow ✅
    end

    M->>M: user bấm notification ✅
    M->>BE: PATCH /api/notifications/:notificationId/read ✅
    BE-->>M: notification is_read=true ✅
    M->>M: hiện tại chỉ mark read trong NotificationsScreen ✅
```

Ghi chú:

- Web đã có luồng điều hướng hoàn chỉnh.
- Mobile hiện chưa có logic điều hướng theo `target_id`/`sender_id` trong `NotificationsScreen`.

## 9. Kiểm tra tải danh sách thông báo

Flow hiện tại:

```mermaid
%%{init: {"theme":"dark"}}%%
sequenceDiagram
    participant BE as Backend
    participant S as Socket.IO
    participant FE as Frontend
    participant M as Mobile

    FE->>BE: GET /api/notifications ✅
    M->>BE: GET /api/notifications ✅
    BE->>BE: find Notification theo recipient_id ✅
    BE->>BE: sort created_at desc + paginate ✅
    BE->>BE: populate sender_id ✅
    BE->>BE: count unreadCount ✅
    BE-->>FE: {notifications, unreadCount, pagination} ✅
    FE->>FE: setNotifications(data.notifications) ✅
    BE-->>M: {notifications, unreadCount, pagination} ✅
    M->>M: setNotifications(list) ✅
```

## 10. Tổng hợp trạng thái hiện tại

| Luồng | Backend | Frontend Web | Mobile |
| --- | --- | --- | --- |
| Gửi text message | ✅ | ✅ | ✅ |
| Gửi ảnh/file message | ✅ | ✅ | ✅ |
| Nhận `newMessage` realtime | ✅ | ✅ | ✅ |
| Polling fallback message | Không cần | Không dùng | ✅ |
| Join/leave conversation room | ✅ | ✅ | ✅ |
| Mark read message | ✅ | ✅ | ✅ |
| Typing indicator | ✅ | ✅ | Chưa đầy đủ |
| Delivered receipt | ✅ | ✅ | Chưa đầy đủ |
| Tạo notification like/comment/follow | ✅ | ✅ | ✅ |
| Nhận `notification:new` realtime | ✅ | ✅ | ✅ |
| Mark notification read | ✅ | ✅ | ✅ |
| Click notification mở bài/profile | ✅ | ✅ | Chưa đầy đủ |

## 11. Event Socket.IO đang dùng

| Event | Hướng | Web | Mobile | Ghi chú |
| --- | --- | --- | --- | --- |
| `newMessage` | Backend -> Client | ✅ | ✅ | Đẩy tin nhắn mới |
| `typing` | Client -> Backend -> Client | ✅ | Chưa đầy đủ | Web đang dùng rõ |
| `stopTyping` | Client -> Backend -> Client | ✅ | Chưa đầy đủ | Web timeout 3 giây |
| `joinConversation` | Client -> Backend | ✅ | ✅ | Join room khi mở chat |
| `leaveConversation` | Client -> Backend | ✅ | ✅ | Leave room khi đổi chat |
| `markAsRead` | Client -> Backend -> Partner | ✅ | Chưa đầy đủ | Mobile dùng REST là chính |
| `messagesRead` | Backend -> Partner | ✅ | Chưa đầy đủ | Web listen trong hook |
| `messagesDelivered` | Backend -> Sender | ✅ | Chưa đầy đủ | Backend đã emit khi receiver online lại |
| `messageDeleted` | Backend -> Partner | Có backend emit | Chưa rõ UI | Dùng khi xóa tin |
| `notification:new` | Backend -> Recipient | ✅ | ✅ | Đẩy thông báo realtime |
| `notification:read` | Client -> Backend | Backend có handler | Backend có handler | Web/mobile hiện dùng REST là chính |
| `notification:readAll` | Client -> Backend | Backend có handler | Backend có handler | Web/mobile hiện dùng REST là chính |

## 12. API REST chính

| Chức năng | Endpoint | Trạng thái |
| --- | --- | --- |
| Danh sách hội thoại | `GET /api/conversations` | ✅ |
| Tạo/mở hội thoại | `POST /api/conversations/:receiverId` | ✅ |
| Lấy tin nhắn | `GET /api/conversations/:conversationId/messages` | ✅ |
| Gửi text | `POST /api/conversations/:conversationId/messages` | ✅ |
| Gửi file/ảnh | `POST /api/conversations/:conversationId/messages/upload` | ✅ |
| Đánh dấu hội thoại đã đọc | `PATCH /api/conversations/:conversationId/read` | ✅ |
| Danh sách thông báo | `GET /api/notifications` | ✅ |
| Đánh dấu một thông báo đã đọc | `PATCH /api/notifications/:notificationId/read` | ✅ |
| Đánh dấu tất cả thông báo đã đọc | `PATCH /api/notifications/read-all` | ✅ |
| Mở bài từ thông báo | `GET /api/post/:postId` | ✅ |
| Mở profile từ thông báo follow | `GET /api/users/profile/:id` | ✅ |

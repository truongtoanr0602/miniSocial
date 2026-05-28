# Sequence Diagram chi tiết cho Nhắn tin và Thông báo

Ngày lập: 27/05/2026

Tài liệu này mô tả luồng hiện tại của chức năng nhắn tin và thông báo theo code trong dự án.

## Thành phần chính

| Nhóm | Thành phần | Vai trò |
| --- | --- | --- |
| Frontend | `MessagesView.tsx` | Màn hình danh sách hội thoại, khung chat, gửi text/file, đánh dấu đã đọc |
| Frontend | `useConversations.ts` | Gọi API hội thoại, lắng nghe socket chat |
| Frontend | `NotificationsView.tsx` | Hiển thị thông báo, mở bài viết/profile khi bấm thông báo |
| Frontend | `useNotifications.ts` | Gọi API thông báo, lắng nghe `notification:new` |
| Frontend | `socketService.ts` | Khởi tạo Socket.IO client singleton |
| Backend | `conversationRoutes.ts` | Route REST cho hội thoại và tin nhắn |
| Backend | `conversationController.ts` | Xử lý CRUD tin nhắn/hội thoại, upload file, read receipt |
| Backend | `chatHandlers.ts` | Xử lý socket typing, join room, mark read |
| Backend | `notificationController.ts` | Tạo, lấy, đọc, xóa thông báo |
| Backend | `reactionController.ts` | Tạo thông báo khi like bài viết |
| Backend | `commentController.ts` | Tạo thông báo khi comment bài viết |
| Backend | `followController.ts` | Tạo thông báo khi follow/follow request |
| Backend | MongoDB | Lưu `Conversation`, `Message`, `Notification`, `Post`, `Follow`, `Reaction` |
| Backend | MinIO | Lưu ảnh/file đính kèm trong tin nhắn |

## 1. Khởi tạo Socket.IO sau khi đăng nhập

```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng
    participant Web as Frontend
    participant SocketSvc as socketService.ts
    participant IO as Socket.IO Server
    participant Auth as socket middleware
    participant State as sockets/state.ts
    participant Helper as flushPendingDeliveries()
    participant DB as MongoDB

    User->>Web: Đăng nhập thành công
    Web->>SocketSvc: connectSocket()
    SocketSvc->>SocketSvc: Lấy token hợp lệ từ localStorage
    SocketSvc->>IO: connect(auth.token)
    IO->>Auth: Xác thực JWT
    Auth-->>IO: Gắn socket.data.userId
    IO->>State: setUserOnline(userId, socketId)
    IO->>Helper: flushPendingDeliveries(userId)
    Helper->>DB: Update Message(receiverId=userId, deliveredAt=null)
    Helper->>DB: Lấy message vừa delivered theo sender
    alt Sender đang online
        Helper->>IO: emit "messagesDelivered" cho sender
        IO-->>Web: Cập nhật deliveredAt phía sender
    else Sender offline
        Helper-->>IO: Không emit realtime
    end
    IO->>IO: registerChatHandlers()
    IO->>IO: registerNotificationHandlers()
```

Ghi chú:

- Socket client là singleton, không tự connect khi tạo instance.
- Token được gửi qua `socket.handshake.auth.token`.
- Khi user online lại, backend đánh dấu các tin nhắn chưa delivered thành delivered.

## 2. Tải danh sách hội thoại

```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng
    participant UI as MessagesView
    participant Hook as useConversations()
    participant API as GET /api/conversations
    participant Ctrl as getConversations()
    participant DB as MongoDB

    User->>UI: Mở màn hình Tin nhắn
    UI->>Hook: mount useConversations()
    Hook->>API: GET /api/conversations
    API->>Ctrl: verifyToken -> getConversations()
    Ctrl->>DB: Find Conversation có participants chứa userId
    Ctrl->>DB: Populate participants và lastMessage
    loop Mỗi conversation
        Ctrl->>DB: Count Message chưa đọc của user hiện tại
    end
    Ctrl-->>API: Danh sách { partner, lastMessage, unreadCount, updatedAt }
    API-->>Hook: successResponse(data)
    Hook-->>UI: setConversations()
    UI-->>User: Hiển thị danh sách hội thoại
```

Điểm quan trọng:

- Backend chỉ trả `partner` là người còn lại trong hội thoại để frontend dùng trực tiếp.
- `unreadCount` được tính bằng các tin có `receiverId = userId` và `readAt = null`.
- Tin bị xóa phía user hiện tại được lọc bằng `deletedBy != userId`.

## 3. Tạo hoặc mở hội thoại với một người dùng

```mermaid
sequenceDiagram
    autonumber
    actor UserA as Người A
    participant UI as Frontend
    participant API as POST /api/conversations/:receiverId
    participant Ctrl as createConversation()
    participant DB as MongoDB

    UserA->>UI: Bấm "Nhắn tin" ở profile/search
    UI->>API: POST /api/conversations/:receiverId
    API->>Ctrl: verifyToken -> createConversation()
    Ctrl->>Ctrl: Validate receiverId và chặn tự chat với chính mình
    Ctrl->>DB: Find Conversation có đủ 2 participants
    alt Conversation đã tồn tại
        DB-->>Ctrl: Trả conversation hiện có
        Ctrl->>DB: Populate participants, lastMessage
    else Chưa có conversation
        Ctrl->>DB: Create Conversation(participants=[sender, receiver])
        Ctrl->>DB: unreadCount sender=0, receiver=0
        Ctrl->>DB: Populate participants
    end
    Ctrl-->>API: conversation
    API-->>UI: successResponse(conversation)
    UI-->>UserA: Điều hướng sang màn hình chat
```

## 4. Chọn hội thoại và tải tin nhắn

```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng
    participant UI as MessagesView
    participant Hook as useMessages(conversationId)
    participant API as GET /api/conversations/:id/messages
    participant Ctrl as getMessages()
    participant DB as MongoDB
    participant Socket as Socket.IO

    User->>UI: Chọn một hội thoại
    UI->>Hook: set selectedConversationId
    Hook->>API: GET /api/conversations/:conversationId/messages
    API->>Ctrl: verifyToken -> getMessages()
    Ctrl->>DB: Validate user thuộc conversation
    Ctrl->>DB: Count Message không bị deletedBy user
    Ctrl->>DB: Find Message, sort createdAt desc, paginate
    Ctrl->>DB: Populate senderId
    Ctrl-->>API: messages.reverse() theo thứ tự cũ -> mới
    API-->>Hook: { messages, pagination }
    Hook->>Socket: emit "joinConversation" { conversationId }
    Socket->>DB: Kiểm tra user thuộc conversation
    Socket-->>Hook: callback true/false
    UI->>Hook: markAsRead()
    Hook->>Socket: emit "markAsRead" { conversationId }
    Hook->>API: PATCH /api/conversations/:conversationId/read
    API->>Ctrl: markAsRead()
    Ctrl->>DB: Update readAt cho tin receiver=userId
    Ctrl->>DB: Reset unreadCount[userId] = 0
    Ctrl-->>API: success
    API-->>Hook: success
```

Lưu ý:

- Frontend hiện đánh dấu đã đọc bằng cả socket `markAsRead` và REST `PATCH /read`.
- Hai thao tác này idempotent: chạy lại không làm sai dữ liệu vì chỉ set `readAt` và reset unread về `0`.

## 5. Gửi tin nhắn text realtime

```mermaid
sequenceDiagram
    autonumber
    actor Sender as Người gửi
    actor Receiver as Người nhận
    participant SenderUI as MessagesView Sender
    participant Hook as useMessages()
    participant API as POST /api/conversations/:id/messages
    participant Ctrl as sendMessage()
    participant DB as MongoDB
    participant State as sockets/state.ts
    participant IO as Socket.IO
    participant ReceiverUI as MessagesView Receiver

    Sender->>SenderUI: Nhập text và bấm gửi
    SenderUI->>Hook: sendMessage(content)
    Hook->>API: POST /api/conversations/:conversationId/messages
    API->>Ctrl: verifyToken -> sendMessage()
    Ctrl->>Ctrl: Validate conversationId
    Ctrl->>Ctrl: Validate messageType=text và content không rỗng
    Ctrl->>DB: Find Conversation có sender trong participants
    Ctrl->>Ctrl: Xác định receiverId từ participants
    Ctrl->>State: getReceiverSocketId(receiverId)
    alt Receiver online
        State-->>Ctrl: receiverSocketId
        Ctrl->>Ctrl: deliveredAt = now
    else Receiver offline
        State-->>Ctrl: undefined
        Ctrl->>Ctrl: deliveredAt = null
    end
    Ctrl->>DB: Create Message(conversationId, senderId, receiverId, content, deliveredAt, readAt=null)
    Ctrl->>DB: Update Conversation.lastMessage
    Ctrl->>DB: Increment unreadCount[receiverId] +1
    Ctrl->>DB: Populate senderId
    alt Receiver online
        Ctrl->>IO: emit "newMessage" tới receiverSocketId
        IO-->>ReceiverUI: { conversationId, message }
        ReceiverUI->>ReceiverUI: Append message, tăng unread nếu chưa mở hội thoại
    end
    Ctrl-->>API: successResponse(message, 201)
    API-->>Hook: message vừa tạo
    Hook-->>SenderUI: Append message nếu chưa có
    SenderUI->>Hook: refetch conversations()
    Hook->>API: GET /api/conversations
```

Kết quả:

- Người gửi thấy tin nhắn ngay sau response REST.
- Người nhận online nhận realtime qua `newMessage`.
- Người nhận offline sẽ thấy tin khi mở lại hội thoại; `deliveredAt` được flush khi họ reconnect socket.

## 6. Gửi ảnh hoặc file đính kèm

```mermaid
sequenceDiagram
    autonumber
    actor Sender as Người gửi
    participant UI as MessagesView
    participant Hook as useMessages()
    participant API as POST /api/conversations/:id/messages/upload
    participant Upload as uploadMiddleware
    participant Ctrl as sendMessage()
    participant MinIO as MinIO service
    participant DB as MongoDB
    participant IO as Socket.IO
    participant Receiver as Người nhận

    Sender->>UI: Chọn ảnh hoặc file
    UI->>Hook: sendAttachment(file, messageType)
    Hook->>API: multipart/form-data(file, messageType, content=file.name)
    API->>Upload: uploadMiddleware.single("file")
    Upload-->>Ctrl: req.file
    Ctrl->>Ctrl: Nếu mimetype image/* => messageType=image
    Ctrl->>Ctrl: Nếu không phải image => messageType=file
    alt Là ảnh
        Ctrl->>MinIO: uploadAndCompressImage(file.buffer)
        MinIO-->>Ctrl: mediaUrl
    else Là file thường
        Ctrl->>MinIO: uploadRawFile(buffer, originalname, mimetype)
        MinIO-->>Ctrl: mediaUrl
    end
    Ctrl->>DB: Create Message(messageType, mediaUrl, content=file.name)
    Ctrl->>DB: Update lastMessage và unreadCount
    Ctrl->>IO: emit "newMessage" nếu receiver online
    IO-->>Receiver: Nhận message có mediaUrl
    Ctrl-->>API: successResponse(message, 201)
    API-->>Hook: message
    Hook-->>UI: Render ảnh hoặc link file
```

Điểm validate:

- Tin `text` bắt buộc có `content`.
- Tin `image` hoặc `file` bắt buộc có `mediaUrl`.
- Nếu upload file không có caption, backend dùng `originalname` làm `content`.

## 7. Typing indicator

```mermaid
sequenceDiagram
    autonumber
    actor Sender as Người đang nhập
    actor Receiver as Người nhận
    participant SenderUI as MessagesView Sender
    participant Hook as useMessages()
    participant IO as Socket.IO Server
    participant State as sockets/state.ts
    participant ReceiverUI as MessagesView Receiver

    Sender->>SenderUI: Gõ vào ô nhập tin nhắn
    SenderUI->>Hook: sendTyping(receiverId)
    Hook->>IO: emit "typing" { conversationId, receiverId }
    IO->>State: getReceiverSocketId(receiverId)
    alt Receiver online
        IO-->>ReceiverUI: emit "typing" { senderId, conversationId }
        ReceiverUI->>ReceiverUI: setIsTyping(true)
    end
    Hook->>Hook: Đặt timeout 3 giây
    Hook->>IO: emit "stopTyping" sau timeout
    IO->>State: getReceiverSocketId(receiverId)
    alt Receiver online
        IO-->>ReceiverUI: emit "stopTyping" { senderId, conversationId }
        ReceiverUI->>ReceiverUI: setIsTyping(false)
    end
```

## 8. Read receipt và unread count

```mermaid
sequenceDiagram
    autonumber
    actor Reader as Người đọc
    actor Partner as Người gửi trước đó
    participant ReaderUI as MessagesView Reader
    participant Hook as useMessages()
    participant API as PATCH /api/conversations/:id/read
    participant Ctrl as markAsRead()
    participant DB as MongoDB
    participant IO as Socket.IO
    participant PartnerUI as MessagesView Partner

    Reader->>ReaderUI: Mở hội thoại hoặc nhận thêm tin trong hội thoại đang mở
    ReaderUI->>Hook: markAsRead()
    Hook->>IO: emit "markAsRead" { conversationId }
    Hook->>API: PATCH /api/conversations/:conversationId/read
    API->>Ctrl: verifyToken -> markAsRead()
    Ctrl->>DB: Validate Reader thuộc conversation
    Ctrl->>DB: Update Message(receiverId=Reader, readAt=null) set readAt=now
    Ctrl->>DB: Set Conversation.unreadCount[Reader] = 0
    Ctrl->>IO: emit "messagesRead" tới Partner nếu online
    IO-->>PartnerUI: { conversationId, readBy: Reader, readAt }
    PartnerUI->>PartnerUI: Cập nhật readAt cho message.receiverId=Reader
    Ctrl-->>API: successResponse({ conversationId })
    API-->>Hook: success
    Hook-->>ReaderUI: unreadCount local = 0
```

## 9. Xóa tin nhắn phía mình

```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng
    participant UI as Frontend
    participant API as DELETE /api/conversations/:conversationId/messages/:messageId
    participant Ctrl as deleteMessage()
    participant DB as MongoDB
    participant IO as Socket.IO
    participant Partner as Đối phương

    User->>UI: Chọn xóa tin nhắn
    UI->>API: DELETE /api/conversations/:conversationId/messages/:messageId
    API->>Ctrl: verifyToken -> deleteMessage()
    Ctrl->>DB: Find Message theo messageId và conversationId
    Ctrl->>Ctrl: Validate message tồn tại
    Ctrl->>DB: Update Message.deletedBy = userId
    alt Message là lastMessage của conversation
        Ctrl->>DB: Tìm message trước đó chưa bị user xóa
        Ctrl->>DB: Update Conversation.lastMessage
    end
    Ctrl->>IO: emit "messageDeleted" cho đối phương nếu online
    IO-->>Partner: { conversationId, messageId }
    Ctrl-->>API: successResponse({ messageId })
    API-->>UI: Cập nhật UI
```

Lưu ý: theo controller hiện tại, xóa tin nhắn là xóa phía người dùng thông qua `deletedBy`.

## 10. Tải danh sách thông báo

```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng
    participant UI as NotificationsView
    participant Hook as useNotifications()
    participant API as GET /api/notifications
    participant Ctrl as getNotifications()
    participant DB as MongoDB

    User->>UI: Mở màn hình Thông báo
    UI->>Hook: mount useNotifications()
    Hook->>Hook: Kiểm tra token trong localStorage
    Hook->>API: GET /api/notifications?page=1&limit=20
    API->>Ctrl: verifyToken -> getNotifications()
    Ctrl->>DB: Count total notification của recipient=userId
    Ctrl->>DB: Find Notification theo recipient=userId, sort created_at desc
    Ctrl->>DB: Populate sender_id(_id, username, display_name, avatar_url)
    Ctrl->>DB: Count unread notification
    Ctrl-->>API: { notifications, unreadCount, pagination }
    API-->>Hook: successResponse(data)
    Hook-->>UI: setNotifications()
    UI-->>User: Hiển thị danh sách thông báo
```

## 11. Tạo thông báo realtime khi Like bài viết

```mermaid
sequenceDiagram
    autonumber
    actor Actor as Người like bài
    actor Owner as Người đăng bài
    participant FE as Frontend Actor
    participant API as POST /api/post/:postId/react
    participant ReactCtrl as reactToPost()
    participant DB as MongoDB
    participant NotiCtrl as createNotification()
    participant State as sockets/state.ts
    participant IO as Socket.IO
    participant OwnerUI as useNotifications Owner

    Actor->>FE: Bấm Like bài viết
    FE->>API: POST /api/post/:postId/react
    API->>ReactCtrl: verifyToken -> reactToPost()
    ReactCtrl->>DB: Validate postId, find Post
    ReactCtrl->>DB: Find Reaction(post_id, user_id, type=like)
    alt Đã like trước đó
        ReactCtrl->>DB: Delete Reaction
        ReactCtrl->>DB: Decrease post.stats.likes
        ReactCtrl-->>API: { likes, is_liked:false }
    else Chưa like
        ReactCtrl->>DB: Create Reaction
        ReactCtrl->>DB: Increase post.stats.likes
        alt Actor không phải chủ bài viết
            ReactCtrl->>NotiCtrl: createNotification(recipient=post.author_id, sender=actor, type=like, target_id=postId)
            NotiCtrl->>DB: Create Notification
            NotiCtrl->>DB: Populate sender_id
            NotiCtrl->>State: getReceiverSocketId(ownerId)
            alt Owner online
                NotiCtrl->>IO: emit "notification:new" tới owner
                IO-->>OwnerUI: prepend notification vào state
            else Owner offline
                NotiCtrl-->>ReactCtrl: Chỉ lưu DB, không emit
            end
        else Actor tự like bài của mình
            ReactCtrl-->>ReactCtrl: Không tạo notification
        end
        ReactCtrl-->>API: { likes, is_liked:true }
    end
    API-->>FE: successResponse
```

Dữ liệu notification like:

| Field | Giá trị |
| --- | --- |
| `recipient_id` | ID chủ bài viết |
| `sender_id` | ID người like |
| `type` | `like` |
| `target_id` | ID bài viết |
| `message` | "đã thích bài viết của bạn" |

## 12. Tạo thông báo realtime khi Comment bài viết

```mermaid
sequenceDiagram
    autonumber
    actor Actor as Người bình luận
    actor Owner as Chủ bài viết
    participant FE as Frontend Actor
    participant API as POST /api/post/:postId/comments
    participant CommentCtrl as createComment()
    participant DB as MongoDB
    participant NotiCtrl as createNotification()
    participant IO as Socket.IO
    participant OwnerUI as useNotifications Owner

    Actor->>FE: Gửi bình luận
    FE->>API: POST /api/post/:postId/comments { content, parent_id? }
    API->>CommentCtrl: verifyToken -> createComment()
    CommentCtrl->>DB: Validate postId và content
    CommentCtrl->>DB: Find Post
    opt Là reply
        CommentCtrl->>DB: Validate parent comment cùng post
    end
    CommentCtrl->>DB: Create Comment(post_id, author_id, parent_id, content)
    CommentCtrl->>DB: Increase post.stats.comments
    opt Là reply
        CommentCtrl->>DB: Increase parent.stats.replies
    end
    CommentCtrl->>DB: Populate author_id
    alt Actor không phải chủ bài viết
        CommentCtrl->>NotiCtrl: createNotification(type=comment, target_id=postId)
        NotiCtrl->>DB: Create Notification
        NotiCtrl->>DB: Populate sender_id
        NotiCtrl->>IO: emit "notification:new" nếu Owner online
        IO-->>OwnerUI: Nhận notification realtime
    else Actor tự comment bài mình
        CommentCtrl-->>CommentCtrl: Không tạo notification
    end
    CommentCtrl-->>API: successResponse(comment, 201)
    API-->>FE: Render comment mới
```

Dữ liệu notification comment:

| Field | Giá trị |
| --- | --- |
| `recipient_id` | ID chủ bài viết |
| `sender_id` | ID người comment |
| `type` | `comment` |
| `target_id` | ID bài viết |
| `message` | "đã bình luận bài viết của bạn" |

## 13. Tạo thông báo realtime khi Follow

```mermaid
sequenceDiagram
    autonumber
    actor Follower as Người follow
    actor Target as Người được follow
    participant FE as Frontend Follower
    participant API as POST /api/follow/:targetId
    participant FollowCtrl as toggleFollow()
    participant DB as MongoDB
    participant NotiCtrl as createNotification()
    participant IO as Socket.IO
    participant TargetUI as useNotifications Target

    Follower->>FE: Bấm Follow
    FE->>API: POST /api/follow/:targetId
    API->>FollowCtrl: verifyToken -> toggleFollow()
    FollowCtrl->>FollowCtrl: Validate targetId và chặn tự follow
    FollowCtrl->>DB: Find target user
    FollowCtrl->>DB: Kiểm tra block hai chiều
    FollowCtrl->>DB: Find Follow(follower_id, following_id)
    alt Đã follow
        FollowCtrl->>DB: Delete Follow
        FollowCtrl->>DB: Pull following/followers khỏi User
        FollowCtrl-->>API: { is_following:false }
    else Chưa follow
        FollowCtrl->>FollowCtrl: status = private ? pending : accepted
        FollowCtrl->>DB: Create Follow(follower_id, following_id, status)
        alt status = accepted
            FollowCtrl->>DB: AddToSet following/followers
            FollowCtrl->>NotiCtrl: createNotification(type=follow, target_id=followerId)
            NotiCtrl->>DB: Create Notification
            NotiCtrl->>DB: Populate sender_id
            NotiCtrl->>IO: emit "notification:new" nếu Target online
            IO-->>TargetUI: Nhận notification realtime
        else status = pending
            FollowCtrl->>NotiCtrl: createNotification(type=follow, target_id=followerId)
            NotiCtrl->>DB: Create Notification dạng yêu cầu follow
            NotiCtrl->>IO: emit "notification:new" nếu Target online
            IO-->>TargetUI: Nhận notification realtime
        end
        FollowCtrl-->>API: { is_following:true, status }
    end
    API-->>FE: successResponse
```

Dữ liệu notification follow:

| Field | Giá trị |
| --- | --- |
| `recipient_id` | ID người được follow |
| `sender_id` | ID người vừa follow |
| `type` | `follow` |
| `target_id` | ID người vừa follow |
| `message` | "đã theo dõi bạn" hoặc "đã gửi yêu cầu theo dõi bạn" |

## 14. Đánh dấu thông báo đã đọc

```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng
    participant UI as NotificationsView
    participant Hook as useNotifications()
    participant API as PATCH /api/notifications/:notificationId/read
    participant Ctrl as markAsRead()
    participant DB as MongoDB

    User->>UI: Bấm vào một thông báo chưa đọc
    UI->>Hook: markAsRead(notificationId)
    Hook->>API: PATCH /api/notifications/:notificationId/read
    API->>Ctrl: verifyToken -> markAsRead()
    Ctrl->>Ctrl: Validate notificationId
    Ctrl->>DB: FindOneAndUpdate(_id, recipient_id=userId, is_read=true)
    alt Tìm thấy notification của user
        Ctrl-->>API: successResponse(notification)
        API-->>Hook: success
        Hook-->>UI: set is_read=true trong state local
    else Không tìm thấy hoặc không thuộc user
        Ctrl-->>API: 404 notification.NOT_FOUND
        API-->>Hook: catch error
    end
```

Ngoài REST, backend còn có socket event:

- `notification:read` để đánh dấu một notification đã đọc.
- `notification:readAll` để đánh dấu tất cả đã đọc.

Frontend web hiện dùng REST trong `useNotifications.ts`.

## 15. Bấm thông báo Like/Comment/Mention để mở bài viết

```mermaid
sequenceDiagram
    autonumber
    actor Owner as Người nhận thông báo
    participant NotiUI as NotificationsView
    participant Hook as useNotifications()
    participant App as SocialMediaApp
    participant Feed as PostFeed
    participant API as GET /api/post/:postId
    participant PostCtrl as getPostById()
    participant DB as MongoDB

    Owner->>NotiUI: Bấm notification type=like/comment/mention
    NotiUI->>Hook: markAsRead(notification._id) nếu chưa đọc
    NotiUI->>App: onOpenPost(notification.target_id)
    App->>App: setFocusedPostId(target_id)
    App->>App: activeView = "feed"
    App->>Feed: render PostFeed(focusedPostId)
    Feed->>DB: Qua API feed, tải /api/post/feed
    alt Bài viết đã nằm trong feed
        Feed->>Feed: Highlight bài viết target_id
        Feed->>Feed: scrollIntoView(post-target_id)
    else Bài viết không nằm trong feed
        Feed->>API: GET /api/post/:postId
        API->>PostCtrl: verifyToken -> getPostById()
        PostCtrl->>DB: Find Post by id và populate author_id
        PostCtrl->>DB: Kiểm tra visibility theo viewer/author/follow
        alt Có quyền xem
            PostCtrl->>DB: Kiểm tra viewer đã like bài chưa
            PostCtrl-->>API: successResponse(post)
            API-->>Feed: post
            Feed->>Feed: Prepend post lên đầu feed
            Feed->>Feed: Highlight và scroll tới bài viết
        else Không có quyền xem hoặc post không tồn tại
            PostCtrl-->>API: 404 post.NOT_FOUND
            API-->>Feed: error
            Feed-->>Owner: Toast "Không thể mở bài viết từ thông báo"
        end
    end
```

Quy tắc điều hướng:

- `like`, `comment`, `mention` dùng `target_id` làm `postId`.
- `PostFeed` sẽ tải thêm bài cụ thể nếu bài không có trong feed hiện tại.

## 16. Bấm thông báo Follow để mở trang cá nhân

```mermaid
sequenceDiagram
    autonumber
    actor Target as Người nhận thông báo follow
    participant NotiUI as NotificationsView
    participant Hook as useNotifications()
    participant App as SocialMediaApp
    participant Profile as ProfileView
    participant API as GET /api/users/profile/:id
    participant UserCtrl as getUserProfile()
    participant DB as MongoDB

    Target->>NotiUI: Bấm notification type=follow
    NotiUI->>Hook: markAsRead(notification._id) nếu chưa đọc
    NotiUI->>NotiUI: profileId = sender_id hoặc target_id
    NotiUI->>App: onOpenProfile(profileId)
    App->>App: selectedProfileId = profileId
    App->>App: activeView = "profile"
    App->>Profile: render ProfileView(userId=profileId)
    Profile->>API: GET /api/users/profile/:id
    API->>UserCtrl: verifyToken -> getUserProfile()
    UserCtrl->>DB: Find User by id, loại password_hash
    UserCtrl->>DB: Find Post của user theo visibilityFilter
    UserCtrl-->>API: successResponse({ user, posts })
    API-->>Profile: data
    Profile-->>Target: Hiển thị trang cá nhân người vừa follow
```

Quy tắc điều hướng:

- `sender_id` ưu tiên hơn vì đó là người tạo hành động follow.
- Nếu `sender_id` chỉ là string hoặc bị thiếu object populate, frontend fallback sang `target_id`.

## 17. Đánh dấu tất cả thông báo đã đọc

```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng
    participant UI as NotificationsView
    participant Hook as useNotifications()
    participant API as PATCH /api/notifications/read-all
    participant Ctrl as markAllAsRead()
    participant DB as MongoDB

    User->>UI: Bấm "Đánh dấu tất cả đã đọc"
    UI->>Hook: markAllAsRead()
    Hook->>API: PATCH /api/notifications/read-all
    API->>Ctrl: verifyToken -> markAllAsRead()
    Ctrl->>DB: UpdateMany(recipient_id=userId, is_read=false) set is_read=true
    Ctrl-->>API: { modifiedCount }
    API-->>Hook: success
    Hook-->>UI: set tất cả notification trong state thành is_read=true
```

## 18. Tổng hợp event Socket.IO

| Event | Hướng | Payload chính | Mục đích |
| --- | --- | --- | --- |
| `newMessage` | Backend -> Client receiver | `{ conversationId, message }` | Đẩy tin nhắn mới realtime |
| `typing` | Client sender -> Backend -> Client receiver | `{ conversationId, receiverId }` / `{ senderId, conversationId }` | Báo người gửi đang nhập |
| `stopTyping` | Client sender -> Backend -> Client receiver | `{ conversationId, receiverId }` / `{ senderId, conversationId }` | Tắt trạng thái đang nhập |
| `joinConversation` | Client -> Backend | `{ conversationId }` | Join room sau khi mở hội thoại |
| `leaveConversation` | Client -> Backend | `{ conversationId }` | Rời room khi đổi/unmount hội thoại |
| `markAsRead` | Client -> Backend -> Client partner | `{ conversationId }` / `{ conversationId, readBy, readAt }` | Đánh dấu tin nhắn đã đọc |
| `messagesRead` | Backend -> Client partner | `{ conversationId, readBy, readAt }` | Cập nhật read receipt |
| `messagesDelivered` | Backend -> Client sender | `{ receiverId, messageIds }` | Cập nhật delivered khi receiver online lại |
| `messageDeleted` | Backend -> Client partner | `{ conversationId, messageId }` | Báo tin nhắn bị xóa |
| `notification:new` | Backend -> Client recipient | `Notification` đã populate sender | Đẩy thông báo mới realtime |
| `notification:read` | Client -> Backend | `{ notificationId }` | Đánh dấu một thông báo đã đọc qua socket |
| `notification:readAll` | Client -> Backend | callback boolean | Đánh dấu tất cả thông báo đã đọc qua socket |

## 19. Tổng hợp API REST liên quan

### Nhắn tin

| Method | Endpoint | Controller | Mục đích |
| --- | --- | --- | --- |
| `GET` | `/api/conversations` | `getConversations` | Lấy danh sách hội thoại |
| `POST` | `/api/conversations/:receiverId` | `createConversation` | Tạo hoặc lấy hội thoại 1-1 |
| `GET` | `/api/conversations/:conversationId/messages` | `getMessages` | Lấy tin nhắn trong hội thoại |
| `POST` | `/api/conversations/:conversationId/messages` | `sendMessage` | Gửi tin text |
| `POST` | `/api/conversations/:conversationId/messages/upload` | `sendMessage` | Gửi ảnh/file qua upload |
| `DELETE` | `/api/conversations/:conversationId/messages/:messageId` | `deleteMessage` | Xóa tin nhắn phía mình |
| `PATCH` | `/api/conversations/:conversationId/read` | `markAsRead` | Đánh dấu hội thoại đã đọc |

### Thông báo

| Method | Endpoint | Controller | Mục đích |
| --- | --- | --- | --- |
| `GET` | `/api/notifications` | `getNotifications` | Lấy danh sách thông báo |
| `GET` | `/api/notifications/unread-count` | `getUnreadCount` | Lấy số thông báo chưa đọc |
| `PATCH` | `/api/notifications/:notificationId/read` | `markAsRead` | Đánh dấu một thông báo đã đọc |
| `PATCH` | `/api/notifications/read-all` | `markAllAsRead` | Đánh dấu tất cả đã đọc |
| `DELETE` | `/api/notifications/:notificationId` | `deleteNotification` | Xóa một thông báo |
| `GET` | `/api/post/:postId` | `getPostById` | Mở bài viết từ notification target_id |
| `GET` | `/api/users/profile/:id` | `getUserProfile` | Mở profile từ notification follow |

## 20. Dữ liệu lõi

### Message

| Field | Ý nghĩa |
| --- | --- |
| `conversationId` | Hội thoại chứa tin nhắn |
| `senderId` | Người gửi |
| `receiverId` | Người nhận |
| `messageType` | `text`, `image`, `file` |
| `content` | Nội dung text hoặc tên file |
| `mediaUrl` | Link ảnh/file nếu có |
| `deletedBy` | User đã xóa tin phía mình |
| `deliveredAt` | Thời điểm tin được delivered tới receiver |
| `readAt` | Thời điểm receiver đọc tin |

### Conversation

| Field | Ý nghĩa |
| --- | --- |
| `participants` | Hai user trong chat 1-1 |
| `lastMessage` | Message cuối cùng để preview |
| `unreadCount` | Map số tin chưa đọc theo userId |

### Notification

| Field | Ý nghĩa |
| --- | --- |
| `recipient_id` | Người nhận thông báo |
| `sender_id` | Người tạo hành động |
| `type` | `like`, `comment`, `follow`, `mention`, `system` |
| `target_id` | Bài viết hoặc profile liên quan |
| `message` | Nội dung hiển thị |
| `is_read` | Trạng thái đã đọc |
| `created_at` | Thời điểm tạo |

## 21. Các điều kiện biên quan trọng

1. Không tạo thông báo khi user tự like/comment bài viết của mình.
2. Không cho tự follow chính mình.
3. Tin nhắn text rỗng bị từ chối.
4. Tin nhắn image/file không có `mediaUrl` bị từ chối.
5. Tin nhắn gửi cho receiver offline có `deliveredAt = null`; khi receiver online lại thì backend flush delivery.
6. Người dùng chỉ lấy được tin nhắn nếu thuộc conversation.
7. Người dùng chỉ đánh dấu/xóa notification thuộc `recipient_id` của mình.
8. Notification like/comment/mention dùng `target_id` là postId.
9. Notification follow dùng `sender_id` hoặc `target_id` để mở profile người vừa follow.
10. Khi mở bài từ notification, backend kiểm tra visibility trước khi trả dữ liệu.

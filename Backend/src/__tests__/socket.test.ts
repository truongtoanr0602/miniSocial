/**
 * socket.test.ts — Test Socket.IO Real-time Features
 *
 * Test các chức năng realtime:
 * - Kết nối Socket.IO với JWT
 * - Typing / stopTyping events
 * - Join/Leave conversation room
 * - Mark as read qua socket
 * - Notification: read, readAll qua socket
 * - Realtime message delivery (newMessage event)
 * - Realtime notification delivery (notification:new event)
 */
import http from "http";
import { io as ioClient, Socket as ClientSocket } from "socket.io-client";
import mongoose from "mongoose";
import Notification from "../models/Notification.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import {
  setupTestEnvironment,
  clearDatabase,
  teardownTestEnvironment,
} from "./setup.js";
import {
  createTestUser,
  getAuthToken,
  createTestPost,
  fakeObjectId,
} from "./helpers.js";

let server: http.Server;
let serverPort: number;

// Helper: tạo socket client kết nối với server test
function createClient(token: string): ClientSocket {
  return ioClient(`http://localhost:${serverPort}`, {
    auth: { token },
    transports: ["websocket"],
    forceNew: true,
  });
}

// Helper: chờ event từ socket (có timeout)
function waitForEvent(socket: ClientSocket, event: string, timeoutMs = 5000): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for "${event}"`)), timeoutMs);
    socket.once(event, (data: any) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

// Helper: chờ socket kết nối thành công
function waitForConnect(socket: ClientSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    if (socket.connected) {
      resolve();
      return;
    }
    socket.on("connect", () => resolve());
    socket.on("connect_error", (err) => reject(err));
  });
}

beforeAll(async () => {
  const env = await setupTestEnvironment();
  server = env.server;
  // Listen trên port ngẫu nhiên cho Socket.IO test
  await new Promise<void>((resolve) => {
    server.listen(0, () => {
      const addr = server.address() as any;
      serverPort = addr.port;
      console.log(`[Socket Test] Server listening on port ${serverPort}`);
      resolve();
    });
  });
});

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await teardownTestEnvironment();
});

// ═══════════════════════════════════════════
// 1. KẾT NỐI & XÁC THỰC
// ═══════════════════════════════════════════
describe("Socket.IO Connection", () => {
  it("Kết nối thành công với JWT hợp lệ", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    const client = createClient(token);
    await waitForConnect(client);
    expect(client.connected).toBe(true);
    client.disconnect();
  });

  it("Kết nối thất bại với JWT không hợp lệ", async () => {
    const client = createClient("invalid-token-xyz");
    return new Promise<void>((resolve) => {
      client.on("connect_error", (err) => {
        expect(err.message).toContain("Authentication error");
        client.disconnect();
        resolve();
      });
    });
  });

  it("Kết nối thất bại khi không có token", async () => {
    const client = ioClient(`http://localhost:${serverPort}`, {
      transports: ["websocket"],
      forceNew: true,
    });
    return new Promise<void>((resolve) => {
      client.on("connect_error", (err) => {
        expect(err.message).toContain("Authentication error");
        client.disconnect();
        resolve();
      });
    });
  });
});

// ═══════════════════════════════════════════
// 2. TYPING EVENTS
// ═══════════════════════════════════════════
describe("Socket.IO Typing Events", () => {
  it("Gửi typing event → receiver nhận được", async () => {
    const user1 = await createTestUser();
    const user2 = await createTestUser();
    const token1 = getAuthToken(user1._id.toString());
    const token2 = getAuthToken(user2._id.toString());
    const client1 = createClient(token1);
    const client2 = createClient(token2);
    await Promise.all([waitForConnect(client1), waitForConnect(client2)]);

    const typingPromise = waitForEvent(client2, "typing");
    client1.emit("typing", {
      conversationId: fakeObjectId(),
      receiverId: user2._id.toString(),
    });
    const data = await typingPromise;
    expect(data.senderId).toBe(user1._id.toString());

    client1.disconnect();
    client2.disconnect();
  });

  it("Gửi stopTyping event → receiver nhận được", async () => {
    const user1 = await createTestUser();
    const user2 = await createTestUser();
    const token1 = getAuthToken(user1._id.toString());
    const token2 = getAuthToken(user2._id.toString());
    const client1 = createClient(token1);
    const client2 = createClient(token2);
    await Promise.all([waitForConnect(client1), waitForConnect(client2)]);

    const stopPromise = waitForEvent(client2, "stopTyping");
    client1.emit("stopTyping", {
      conversationId: fakeObjectId(),
      receiverId: user2._id.toString(),
    });
    const data = await stopPromise;
    expect(data.senderId).toBe(user1._id.toString());

    client1.disconnect();
    client2.disconnect();
  });
});

// ═══════════════════════════════════════════
// 3. JOIN/LEAVE CONVERSATION
// ═══════════════════════════════════════════
describe("Socket.IO Join/Leave Conversation", () => {
  it("Join conversation hợp lệ → callback true", async () => {
    const user1 = await createTestUser();
    const user2 = await createTestUser();
    // Tạo conversation trong DB
    const conv = await Conversation.create({
      participants: [
        new mongoose.Types.ObjectId(user1._id.toString()),
        new mongoose.Types.ObjectId(user2._id.toString()),
      ],
    });
    const token1 = getAuthToken(user1._id.toString());
    const client1 = createClient(token1);
    await waitForConnect(client1);

    const result = await new Promise<boolean>((resolve) => {
      client1.emit("joinConversation", { conversationId: conv._id.toString() }, (ok: boolean) => {
        resolve(ok);
      });
    });
    expect(result).toBe(true);
    client1.disconnect();
  });

  it("Join conversation không phải thành viên → callback false", async () => {
    const user1 = await createTestUser();
    const user2 = await createTestUser();
    const stranger = await createTestUser();
    const conv = await Conversation.create({
      participants: [
        new mongoose.Types.ObjectId(user1._id.toString()),
        new mongoose.Types.ObjectId(user2._id.toString()),
      ],
    });
    const token = getAuthToken(stranger._id.toString());
    const client = createClient(token);
    await waitForConnect(client);

    const result = await new Promise<boolean>((resolve) => {
      client.emit("joinConversation", { conversationId: conv._id.toString() }, (ok: boolean) => {
        resolve(ok);
      });
    });
    expect(result).toBe(false);
    client.disconnect();
  });

  it("Join conversation ID không hợp lệ → callback false", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    const client = createClient(token);
    await waitForConnect(client);

    const result = await new Promise<boolean>((resolve) => {
      client.emit("joinConversation", { conversationId: "invalid-id" }, (ok: boolean) => {
        resolve(ok);
      });
    });
    expect(result).toBe(false);
    client.disconnect();
  });
});

// ═══════════════════════════════════════════
// 4. MARK AS READ QUA SOCKET
// ═══════════════════════════════════════════
describe("Socket.IO Mark As Read", () => {
  it("markAsRead qua socket → cập nhật DB + emit messagesRead", async () => {
    const user1 = await createTestUser();
    const user2 = await createTestUser();
    // Tạo conversation + message
    const conv = await Conversation.create({
      participants: [
        new mongoose.Types.ObjectId(user1._id.toString()),
        new mongoose.Types.ObjectId(user2._id.toString()),
      ],
    });
    await Message.create({
      conversationId: conv._id,
      senderId: new mongoose.Types.ObjectId(user1._id.toString()),
      receiverId: new mongoose.Types.ObjectId(user2._id.toString()),
      messageType: "text",
      content: "Tin chưa đọc",
    });

    const token1 = getAuthToken(user1._id.toString());
    const token2 = getAuthToken(user2._id.toString());
    const client1 = createClient(token1);
    const client2 = createClient(token2);
    await Promise.all([waitForConnect(client1), waitForConnect(client2)]);

    // user1 lắng nghe messagesRead event
    const readPromise = waitForEvent(client1, "messagesRead");

    // user2 đánh dấu đã đọc qua socket
    const result = await new Promise<boolean>((resolve) => {
      client2.emit("markAsRead", { conversationId: conv._id.toString() }, (ok: boolean) => {
        resolve(ok);
      });
    });
    expect(result).toBe(true);

    // Kiểm tra user1 nhận được event messagesRead
    const readData = await readPromise;
    expect(readData.conversationId).toBe(conv._id.toString());
    expect(readData.readBy).toBe(user2._id.toString());

    // Kiểm tra DB
    const messages = await Message.find({
      conversationId: conv._id,
      readAt: { $ne: null },
    });
    expect(messages.length).toBe(1);

    client1.disconnect();
    client2.disconnect();
  });
});

// ═══════════════════════════════════════════
// 5. NOTIFICATION QUA SOCKET
// ═══════════════════════════════════════════
describe("Socket.IO Notification Handlers", () => {
  it("notification:read → đánh dấu 1 notification đã đọc", async () => {
    const user = await createTestUser();
    const sender = await createTestUser();
    // Tạo notification
    const notif = await Notification.create({
      recipient_id: new mongoose.Types.ObjectId(user._id.toString()),
      sender_id: new mongoose.Types.ObjectId(sender._id.toString()),
      type: "like",
      message: "đã thích bài viết",
      is_read: false,
    });

    const token = getAuthToken(user._id.toString());
    const client = createClient(token);
    await waitForConnect(client);

    const result = await new Promise<boolean>((resolve) => {
      client.emit("notification:read", { notificationId: notif._id.toString() }, (ok: boolean) => {
        resolve(ok);
      });
    });
    expect(result).toBe(true);

    // Kiểm tra DB
    const updated = await Notification.findById(notif._id);
    expect(updated!.is_read).toBe(true);
    client.disconnect();
  });

  it("notification:read với ID không hợp lệ → callback false", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    const client = createClient(token);
    await waitForConnect(client);

    const result = await new Promise<boolean>((resolve) => {
      client.emit("notification:read", { notificationId: "invalid" }, (ok: boolean) => {
        resolve(ok);
      });
    });
    expect(result).toBe(false);
    client.disconnect();
  });

  it("notification:readAll → đánh dấu tất cả đã đọc", async () => {
    const user = await createTestUser();
    const sender = await createTestUser();
    // Tạo 3 notifications chưa đọc
    for (let i = 0; i < 3; i++) {
      await Notification.create({
        recipient_id: new mongoose.Types.ObjectId(user._id.toString()),
        sender_id: new mongoose.Types.ObjectId(sender._id.toString()),
        type: "like",
        message: `Notification ${i}`,
        is_read: false,
      });
    }

    const token = getAuthToken(user._id.toString());
    const client = createClient(token);
    await waitForConnect(client);

    const result = await new Promise<boolean>((resolve) => {
      client.emit("notification:readAll", (ok: boolean) => {
        resolve(ok);
      });
    });
    expect(result).toBe(true);

    // Kiểm tra DB
    const unread = await Notification.countDocuments({
      recipient_id: new mongoose.Types.ObjectId(user._id.toString()),
      is_read: false,
    });
    expect(unread).toBe(0);
    client.disconnect();
  });
});

// ═══════════════════════════════════════════
// 6. REALTIME MESSAGE DELIVERY
// ═══════════════════════════════════════════
describe("Socket.IO Realtime Message Delivery", () => {
  it("Receiver online nhận realtime event 'newMessage' khi gửi tin qua API", async () => {
    const sender = await createTestUser();
    const receiver = await createTestUser();
    const senderToken = getAuthToken(sender._id.toString());
    const receiverToken = getAuthToken(receiver._id.toString());

    // Kết nối socket cho receiver
    const receiverClient = createClient(receiverToken);
    await waitForConnect(receiverClient);

    // Import supertest để gọi API
    const request = (await import("supertest")).default;
    const { app } = await import("./setup.js");

    // Tạo conversation
    const convRes = await request(app)
      .post(`/api/conversations/${receiver._id}`)
      .set("Authorization", `Bearer ${senderToken}`);
    const convId = convRes.body.data._id;

    // Receiver lắng nghe event newMessage
    const messagePromise = waitForEvent(receiverClient, "newMessage");

    // Sender gửi tin nhắn qua REST API
    await request(app)
      .post(`/api/conversations/${convId}/messages`)
      .set("Authorization", `Bearer ${senderToken}`)
      .send({ content: "Tin nhắn realtime!", messageType: "text" });

    // Kiểm tra receiver nhận được
    const msgEvent = await messagePromise;
    expect(msgEvent.conversationId).toBe(convId);
    expect(msgEvent.message.content).toBe("Tin nhắn realtime!");

    receiverClient.disconnect();
  });
});

// ═══════════════════════════════════════════
// 7. REALTIME NOTIFICATION
// ═══════════════════════════════════════════
describe("Socket.IO Realtime Notification", () => {
  it("Receiver online nhận 'notification:new' khi bị like bài", async () => {
    const author = await createTestUser();
    const liker = await createTestUser();
    const authorToken = getAuthToken(author._id.toString());
    const likerToken = getAuthToken(liker._id.toString());

    // Author kết nối socket
    const authorClient = createClient(authorToken);
    await waitForConnect(authorClient);

    // Tạo bài viết
    const post = await createTestPost(author._id.toString());

    // Author lắng nghe notification:new
    const notifPromise = waitForEvent(authorClient, "notification:new");

    // Liker like bài qua API
    const request = (await import("supertest")).default;
    const { app } = await import("./setup.js");
    await request(app)
      .post(`/api/post/${post._id}/react`)
      .set("Authorization", `Bearer ${likerToken}`);

    // Kiểm tra author nhận được notification realtime
    const notifEvent = await notifPromise;
    expect(notifEvent.type).toBe("like");
    expect(notifEvent.recipient_id.toString()).toBe(author._id.toString());

    authorClient.disconnect();
  });
});

// ═══════════════════════════════════════════
// 8. DISCONNECT
// ═══════════════════════════════════════════
describe("Socket.IO Disconnect", () => {
  it("User disconnect → không còn nhận events", async () => {
    const user = await createTestUser();
    const token = getAuthToken(user._id.toString());
    const client = createClient(token);
    await waitForConnect(client);
    expect(client.connected).toBe(true);
    client.disconnect();
    // Delay nhẹ để server xử lý disconnect
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(client.connected).toBe(false);
  });
});

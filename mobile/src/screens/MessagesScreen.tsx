import * as ImagePicker from "expo-image-picker";
import { io, Socket } from "socket.io-client";
import { BASE_URL } from "../api/config";


import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  RefreshControl,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import {
  Search,
  Send,
  ArrowLeft,
  Image as ImageIcon,
} from "lucide-react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "../api/client";
import { ENDPOINTS } from "../api/endpoints";
import { useAuth } from "../store/AuthContext";
import { useLanguage } from "../store/LanguageContext";
import { ui, palette } from "../theme";
import { ScreenGradient } from "../components/common/ScreenGradient";

const FlashListAny = FlashList as any;


export default function MessagesScreen({ route }: any) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [conversations, setConversations] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const initialConversationId = route?.params?.initialConversationId;
  // ✅ 2. ⚡️ ĐẶT HÀM Ở ĐÂY (Ngay dưới import, trên function MessagesScreen)
// Hàm này giúp biến hình link localhost thành link IP thật trỏ về MinIO (cổng 9000)
const getValidMediaUrl = (url?: string) => {
  if (!url) return "";
  
  // Đổi TOÀN BỘ dấu gạch chéo ngược \ của Windows thành gạch chéo xuôi /
  let formattedUrl = url.replace(/\\/g, '/');
  
  // Tính MinIO host từ BASE_URL (port 9000). Giữ fallback nếu parsing lỗi.
  let MINIO_URL = "http://192.168.0.101:9000";
  try {
    const parsed = new URL(BASE_URL);
    MINIO_URL = `${parsed.protocol}//${parsed.hostname}:9000`;
  } catch (e) {
    // fallback giữ nguyên
  }

  // Nếu link chứa localhost hoặc 127.0.0.1, ép nó về MINIO_URL
  if (formattedUrl.includes("localhost") || formattedUrl.includes("127.0.0.1")) {
    formattedUrl = formattedUrl.replace(/http:\/\/[^/]+/g, MINIO_URL);
  }
  // Nếu là đường dẫn tương đối (/messages/...) -> Nối MINIO_URL vào đầu
  else if (!formattedUrl.startsWith("http")) {
    formattedUrl = `${MINIO_URL}${formattedUrl.startsWith('/') ? '' : '/'}${formattedUrl}`;
  }
  
  return formattedUrl;
};

const socketRef = useRef<Socket | null>(null);


useEffect(() => {
  // 1. Kết nối với máy chủ Socket
  socketRef.current = io(BASE_URL);

  // 2. Tham gia vào phòng chat hiện tại (Tùy Backend cấu hình)
  if (selectedConvId) {
    socketRef.current.emit("join_room", selectedConvId);
  }

  // 3. Lắng nghe Backend "bắn" tin nhắn mới về
  socketRef.current.on("receive_message", (newMsg) => {
    // Nếu tin nhắn mới thuộc về phòng chat đang mở thì nhét nó vào mảng hiển thị
    if (newMsg.conversationId === selectedConvId || newMsg.conversation === selectedConvId) {
      setMessages((prev) => {
        // Kiểm tra trùng lặp để tránh hiện 2 tin giống nhau
        const isExist = prev.some((msg) => msg._id === newMsg._id);
        return isExist ? prev : [...prev, newMsg];
      });
    }
  });

  // 4. Dọn dẹp khi thoát phòng chat
  return () => {
    socketRef.current?.disconnect();
  };
}, [selectedConvId]);

  const loadConversations = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await api.get(ENDPOINTS.CONVERSATIONS);
      const list = res.data.data || (Array.isArray(res.data) ? res.data : []);
      setConversations(list);
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (initialConversationId) {
      setSelectedConvId(initialConversationId);
      void loadConversations();
    }
  }, [initialConversationId, loadConversations]);

  const loadMessages = useCallback(async (convId: string) => {
    try {
      const res = await api.get(ENDPOINTS.MESSAGES(convId));
      const list =
        res.data.data?.messages ||
        res.data.messages ||
        (Array.isArray(res.data.data) ? res.data.data : []);
      setMessages(list);
    } catch (e) {
      console.error(e);
    }
  }, []);
  useEffect(() => {
    let intervalId: any;

    // Nếu đang mở một phòng chat cụ thể
    if (selectedConvId) {
      // Thiết lập hẹn giờ: Cứ đúng 2.5 giây là âm thầm gọi hàm loadMessages 1 lần
      intervalId = setInterval(() => {
        loadMessages(selectedConvId);
      }, 2500); // 2500 mili-giây = 2.5 giây
    }

    // Dọn dẹp bộ đếm giờ khi bạn bấm nút Back thoát ra ngoài (Cực kỳ quan trọng để không lag máy)
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [selectedConvId, loadMessages]);
  // ⚡️ THÊM ĐOẠN NÀY VÀO ĐỂ LÀM MỚI TIN NHẮN LIÊN TỤC
  useEffect(() => {
    if (!selectedConvId) return;

    // Cứ 3 giây (3000ms) sẽ âm thầm gọi API lấy tin nhắn mới 1 lần
    const interval = setInterval(() => {
      loadMessages(selectedConvId);
    }, 3000);

    // Bắt buộc phải có dòng này để xóa bộ đếm khi thoát phòng chat (tránh tràn RAM)
    return () => clearInterval(interval);
  }, [selectedConvId, loadMessages]);

  const markConversationRead = useCallback(async (convId: string) => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv._id === convId ? { ...conv, unreadCount: 0 } : conv,
      ),
    );
    try {
      await api.patch(ENDPOINTS.MARK_READ(convId));
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (selectedConvId) {
      loadMessages(selectedConvId);
      void markConversationRead(selectedConvId);
    }
  }, [selectedConvId, loadMessages, markConversationRead]);

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedConvId) return;
    try {
      const res = await api.post(ENDPOINTS.MESSAGES(selectedConvId), {
        content: messageText,
      });
      const newMsg = res.data.data || res.data;
      setMessages((prev) => [...prev, newMsg]);
      setMessageText("");
      void loadConversations();
    } catch (e) {
      console.error(e);
    }
  };

  const handlePickImage = useCallback(async () => {
    if (!selectedConvId || isUploadingImage) return;
    
    // Đã cập nhật mediaTypes thành mảng theo chuẩn mới của Expo
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], 
      quality: 0.7, // Nén nhẹ xuống 70% để upload nhanh hơn, tránh timeout
    });
    
    if (result.canceled) return;

    try {
      setIsUploadingImage(true);
      const asset = result.assets[0];
      const formData = new FormData() as any;
      formData.append("messageType", "image");

      // 1. Tự động lấy tên và loại file chuẩn xác, không fix cứng JPG nữa
      const fileName = asset.fileName || `image_${Date.now()}.jpg`;
      const mimeType = asset.mimeType || 'image/jpeg';
      
      // 2. Lọc đường dẫn an toàn cho cả iOS và Android
      const fileUri = Platform.OS === 'ios' ? asset.uri.replace('file://', '') : asset.uri;

      formData.append("file", {
        uri: fileUri,
        name: fileName,
        type: mimeType,
      });

      // 3. Ghi đè cấu hình Axios riêng cho lệnh Upload này
      const res = await api.post(ENDPOINTS.MESSAGE_UPLOAD(selectedConvId), formData, {
        headers: { 
          "Content-Type": "multipart/form-data",
        },
        timeout: 30000, 
      });

      const newMsg = res.data.data || res.data;
      setMessages((prev) => [...prev, newMsg]);
      void loadConversations();
    } catch (e: any) {
      console.error("[Upload Ảnh Lỗi]:", e.message || e);
      Alert.alert(t("Gửi ảnh", "Send image"), t("Không thể gửi ảnh. Vui lòng thử lại.", "Could not send image."));
    } finally {
      setIsUploadingImage(false);
    }
  }, [isUploadingImage, loadConversations, selectedConvId, t]);

  const filteredConversations = conversations.filter((conv) => {
    const partner = conv.partner;
    if (!partner) return false;
    const name = partner.display_name || partner.username || "";
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const renderConversation = ({ item }: { item: any }) => {
    const partner = item.partner;
    if (!partner) return null;
    const avatar =
      partner.avatar_url ||
      partner.avatar ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(partner.display_name || partner.username)}&background=7c3aed&color=fff`;
    const lastMsg = item.lastMessage;
    const unread = item.unreadCount || 0;

    return (
      <Pressable
        onPress={() => {
          setSelectedConvId(item._id);
          void markConversationRead(item._id);
        }}
        style={{
          flexDirection: "row",
          padding: 16,
          borderBottomWidth: 1,
          borderBottomColor: palette.line,
          backgroundColor:
            unread > 0 ? "rgba(147, 51, 234, 0.05)" : "transparent",
        }}
      >
        <Image
          source={{ uri: avatar }}
          style={{ width: 50, height: 50, borderRadius: 25, marginRight: 12 }}
        />
        <View style={{ flex: 1, justifyContent: "center" }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 4,
            }}
          >
            <Text
              style={{ fontWeight: "700", color: palette.ink, fontSize: 16 }}
            >
              {partner.display_name || partner.username}
            </Text>
            {lastMsg?.createdAt ? (
              <Text style={{ fontSize: 12, color: palette.muted }}>
                {new Date(lastMsg.createdAt).toLocaleDateString(t("vi-VN", "en-US"))}
              </Text>
            ) : null}
          </View>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Text
              style={{ color: palette.muted, fontSize: 14 }}
              numberOfLines={1}
            >
              {lastMsg?.content || t("Bắt đầu cuộc trò chuyện...", "Start a conversation...")}
            </Text>
            {unread > 0 ? (
              <View
                style={{
                  backgroundColor: palette.primary,
                  borderRadius: 10,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  marginLeft: 8,
                }}
              >
                <Text
                  style={{ color: "#fff", fontSize: 10, fontWeight: "bold" }}
                >
                  {unread}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
    );
  };
  const scrollViewRef = useRef<any>(null);

  const selectedPartner = conversations.find(
    (c) => c._id === selectedConvId,
  )?.partner;

  if (selectedConvId && selectedPartner) {
    const partnerAvatar =
      selectedPartner.avatar_url ||
      selectedPartner.avatar ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedPartner.display_name || selectedPartner.username)}&background=7c3aed&color=fff`;
    return (
      <ScreenGradient>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View
            style={[
              ui.card,
              { flex: 1, margin: 16, padding: 0, overflow: "hidden" },
            ]}
          >
            {/* Chat Header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: palette.line,
              }}
            >
              <Pressable
                onPress={() => setSelectedConvId(null)}
                style={{ padding: 8, marginRight: 8 }}
              >
                <ArrowLeft color={palette.ink} size={24} />
              </Pressable>
              <Image
                source={{ uri: partnerAvatar }}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  marginRight: 12,
                }}
              />
              <View>
                <Text
                  style={{
                    fontWeight: "700",
                    fontSize: 16,
                    color: palette.ink,
                  }}
                >
                  {selectedPartner.display_name || selectedPartner.username}
                </Text>
              </View>
            </View>

            {/* Chat Messages */}
            <ScrollView
              ref={scrollViewRef}
              style={{ flex: 1, padding: 16 }}
              contentContainerStyle={{ paddingBottom: 16 }}
              
              // 1. Tự cuộn xuống khi có tin nhắn mới (Đã có từ trước)
              onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
              
              // ⚡️ 2. THÊM DÒNG NÀY: Tự cuộn xuống NGAY LẬP TỨC khi vừa vẽ xong giao diện phòng chat
              onLayout={() => scrollViewRef.current?.scrollToEnd({ animated: false })} // Để false cho nó xuất hiện ở đáy luôn, không bị hiệu ứng trượt làm rối mắt lúc mới vào
            >
              {messages.length === 0 ? (
                <Text
                  style={{
                    textAlign: "center",
                    color: palette.muted,
                    marginTop: 40,
                  }}
                >
                  {t("Hãy gửi lời chào đầu tiên!", "Send the first hello!")}
                </Text>
              ) : (
                messages.map((msg, idx) => {
                  // ✅ ĐOẠN CODE MỚI: Bọc thép mọi trường hợp
// 1. Lấy ID của mình (Quét cả trường hợp ._id lẫn .id)
const rawSender = msg.sender || msg.author || msg.userId || msg.senderId || msg.user;

// 2. Trích xuất ID từ biến vừa tìm được
const senderId = typeof rawSender === "string" 
  ? rawSender 
  : (rawSender?._id || rawSender?.id);
  
// 3. Lấy ID của bạn (như cũ)
const currentUserId = (user as any)?._id || (user as any)?.id;

// 4. Ép kiểu và so sánh
const isOwn = Boolean(
  senderId && 
  currentUserId && 
  String(senderId) === String(currentUserId)
);
                  return (
                    <View
                      key={idx}
                      style={{
                        flexDirection: "row",
                        justifyContent: isOwn ? "flex-end" : "flex-start",
                        marginBottom: 12,
                      }}
                    >
                      <LinearGradient
                        colors={
                          isOwn
                            ? [palette.primary, palette.accent]
                            : ["#f3f4f6", "#f3f4f6"]
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                          padding: 12,
                          borderRadius: 16,
                          borderBottomRightRadius: isOwn ? 4 : 16,
                          borderBottomLeftRadius: isOwn ? 16 : 4,
                          maxWidth: "80%",
                        }}
                      >
                        {msg.messageType === "image" && msg.mediaUrl ? (
                          <Image
                            // ✅ CODE MỚI: Bọc qua hàm getValidMediaUrl
                            source={{ uri: getValidMediaUrl(msg.mediaUrl) }}
                            style={{
                              width: 220,
                              height: 180,
                              borderRadius: 12,
                              marginBottom: msg.content ? 8 : 0,
                            }}
                            contentFit="cover"
                          />
                        ) : null}
                        {msg.content ? (
                          <Text
                            style={{
                              color: isOwn ? "#fff" : palette.ink,
                              fontSize: 15,
                            }}
                          >
                            {msg.content}
                          </Text>
                        ) : null}
                        <Text
                          style={{
                            color: isOwn
                              ? "rgba(255,255,255,0.7)"
                              : palette.muted,
                            fontSize: 10,
                            marginTop: 4,
                            alignSelf: "flex-end",
                          }}
                        >
                          {new Date(msg.createdAt).toLocaleTimeString(t("vi-VN", "en-US"), {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Text>
                      </LinearGradient>
                    </View>
                  );
                })
              )}
            </ScrollView>

            {/* Chat Input */}
            <View
              style={{
                padding: 16,
                borderTopWidth: 1,
                borderTopColor: palette.line,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Pressable
                onPress={handlePickImage}
                disabled={isUploadingImage}
                style={{ padding: 8, opacity: isUploadingImage ? 0.5 : 1 }}
              >
                <ImageIcon color={palette.muted} size={20} />
              </Pressable>
              <TextInput
                value={messageText}
                onChangeText={setMessageText}
                placeholder={t("Nhập tin nhắn...", "Type a message...")}
                style={{
                  flex: 1,
                  backgroundColor: "#f3f4f6",
                  borderRadius: 20,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  fontSize: 15,
                  marginHorizontal: 8,
                }}
                onSubmitEditing={sendMessage}
              />
              <Pressable onPress={sendMessage} disabled={!messageText.trim()}>
                <LinearGradient
                  colors={[palette.primary, palette.accent]}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: messageText.trim() ? 1 : 0.5,
                  }}
                >
                  <Send color="#fff" size={18} style={{ marginLeft: 2 }} />
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </ScreenGradient>
    );
  }

  return (
    <ScreenGradient>
      <View
        style={[
          ui.card,
          { flex: 1, margin: 16, padding: 0, overflow: "hidden" },
        ]}
      >
        <View
          style={{
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: palette.line,
          }}
        >
          <Text
            style={{
              fontSize: 24,
              fontWeight: "bold",
              color: palette.primary,
              marginBottom: 12,
            }}
          >
            {t("Tin nhắn", "Messages")}
          </Text>
          <View style={[ui.inputWrapper, { marginBottom: 0, height: 40 }]}>
            <Search color={palette.muted} size={18} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t("Tìm kiếm...", "Search...")}
              style={[ui.input, { fontSize: 14 }]}
            />
          </View>
        </View>

        <FlashListAny
          data={filteredConversations}
          renderItem={renderConversation}
          keyExtractor={(item: any) => item._id}
          estimatedItemSize={80}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={loadConversations}
            />
          }
        />
      </View>
    </ScreenGradient>
  );
}

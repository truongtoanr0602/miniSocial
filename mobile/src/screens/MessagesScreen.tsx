import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState, useCallback } from "react";
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
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled) return;

    try {
      setIsUploadingImage(true);
      const asset = result.assets[0];
      const formData = new FormData() as any;
      formData.append("messageType", "image");
      formData.append("file", {
        uri: asset.uri,
        name: "message.jpg",
        type: "image/jpeg",
      });
      const res = await api.post(ENDPOINTS.MESSAGE_UPLOAD(selectedConvId), formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const newMsg = res.data.data || res.data;
      setMessages((prev) => [...prev, newMsg]);
      void loadConversations();
    } catch (e) {
      console.error(e);
      Alert.alert(t("Gửi ảnh", "Send image"), t("Không thể gửi ảnh.", "Could not send image."));
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
              style={{ flex: 1, padding: 16 }}
              contentContainerStyle={{ paddingBottom: 16 }}
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
                  const senderId =
                    typeof msg.sender === "string"
                      ? msg.sender
                      : msg.sender._id;
                  const isOwn = senderId === (user as any)?._id;
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
                            source={{ uri: msg.mediaUrl }}
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

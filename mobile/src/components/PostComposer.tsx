import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { Image as ImageIcon, Video, Smile } from "lucide-react-native";
import { api } from "../api/client";
import { ENDPOINTS } from "../api/endpoints";
import { ui, palette } from "../theme";
import { useAuth } from "../store/AuthContext";
import { useLanguage } from "../store/LanguageContext";

const FEELINGS = [
  { id: "happy", label: "vui vẻ", labelEn: "happy" },
  { id: "grateful", label: "biết ơn", labelEn: "grateful" },
  { id: "excited", label: "hào hứng", labelEn: "excited" },
  { id: "relaxed", label: "thư giãn", labelEn: "relaxed" },
];

export default function PostComposer({ onCreated }: { onCreated: () => void }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [content, setContent] = useState("");
  const [mediaUri, setMediaUri] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const [feeling, setFeeling] = useState("");

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled) {
      setMediaUri(result.assets[0].uri);
      setMediaType("image");
    }
  };

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 0.7,
    });
    if (!result.canceled) {
      setMediaUri(result.assets[0].uri);
      setMediaType("video");
    }
  };

  const submit = async () => {
    const selectedFeeling = FEELINGS.find((option) => option.id === feeling);
    const finalContent = [
      content.trim(),
      selectedFeeling
        ? `${t("Đang cảm thấy", "Feeling")} ${t(selectedFeeling.label, selectedFeeling.labelEn)}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
    if (!finalContent && !mediaUri) return;
    try {
      const formData = new FormData() as any;
      formData.append("content", finalContent);
      if (mediaUri && mediaType) {
        formData.append("images", {
          uri: mediaUri,
          name: mediaType === "video" ? "post.mp4" : "post.jpg",
          type: mediaType === "video" ? "video/mp4" : "image/jpeg",
        });
      }
      await api.post(ENDPOINTS.CREATE_POST, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setContent("");
      setMediaUri("");
      setMediaType(null);
      setFeeling("");
      onCreated();
    } catch (e) {
      console.error("[PostComposer] Create post error:", e);
    }
  };

  const toggleFeeling = () => {
    const currentIndex = FEELINGS.findIndex((option) => option.id === feeling);
    setFeeling(FEELINGS[(currentIndex + 1) % FEELINGS.length].id);
  };
  const selectedFeeling = FEELINGS.find((option) => option.id === feeling);

  const userAvatar =
    (user as any)?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent((user as any)?.display_name || (user as any)?.username || "U")}&background=7c3aed&color=fff`;

  return (
    <View style={ui.card}>
      <View
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}
      >
        <Image
          source={{ uri: userAvatar }}
          style={{ width: 48, height: 48, borderRadius: 24, marginRight: 12 }}
        />
        <TextInput
          value={content}
          onChangeText={setContent}
          placeholder={t("Bạn đang nghĩ gì?", "What are you thinking?")}
          style={{
            flex: 1,
            backgroundColor: "#f3f4f6",
            borderRadius: 24,
            paddingHorizontal: 16,
            height: 48,
            fontSize: 16,
          }}
          placeholderTextColor={palette.muted}
        />
      </View>

      {mediaUri ? (
        <View style={{ marginBottom: 16 }}>
          {mediaType === "image" ? (
            <Image
              source={{ uri: mediaUri }}
              style={{ width: "100%", height: 200, borderRadius: 12 }}
              contentFit="cover"
            />
          ) : (
            <View
              style={{
                height: 120,
                borderRadius: 12,
                backgroundColor: "#111827",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Video color="#fff" size={28} />
              <Text style={{ color: "#fff", marginTop: 8, fontWeight: "700" }}>
                {t("Video đã chọn", "Video selected")}
              </Text>
            </View>
          )}
          <Pressable
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              backgroundColor: "rgba(0,0,0,0.5)",
              borderRadius: 12,
              padding: 4,
            }}
            onPress={() => {
              setMediaUri("");
              setMediaType(null);
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "bold" }}>X</Text>
          </Pressable>
        </View>
      ) : null}

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          borderTopWidth: 1,
          borderTopColor: palette.line,
          paddingTop: 12,
        }}
      >
        <Pressable
          onPress={pickImage}
          style={{ flexDirection: "row", alignItems: "center", padding: 8 }}
        >
          <ImageIcon color="#10b981" size={24} />
          <Text
            style={{ color: palette.muted, marginLeft: 8, fontWeight: "500" }}
          >
            {t("Ảnh", "Photo")}
          </Text>
        </Pressable>
        <Pressable
          onPress={pickVideo}
          style={{ flexDirection: "row", alignItems: "center", padding: 8 }}
        >
          <Video color="#f43f5e" size={24} />
          <Text
            style={{ color: palette.muted, marginLeft: 8, fontWeight: "500" }}
          >
            Video
          </Text>
        </Pressable>
        <Pressable
          onPress={toggleFeeling}
          style={{ flexDirection: "row", alignItems: "center", padding: 8 }}
        >
          <Smile color="#f5a524" size={24} />
          <Text
            style={{ color: palette.muted, marginLeft: 8, fontWeight: "500" }}
          >
            {selectedFeeling
              ? t(selectedFeeling.label, selectedFeeling.labelEn)
              : t("Cảm xúc", "Feeling")}
          </Text>
        </Pressable>
      </View>

      {content.trim() || mediaUri || feeling ? (
        <Pressable
          onPress={submit}
          style={{
            backgroundColor: palette.primary,
            borderRadius: 8,
            padding: 12,
            alignItems: "center",
            marginTop: 12,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
            {t("Đăng bài", "Post")}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

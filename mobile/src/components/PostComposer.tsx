import * as ImagePicker from "expo-image-picker";
import React, { useState, useCallback } from "react";
import { Pressable, Text, TextInput, View, Alert } from "react-native";
import { Image } from "expo-image";
import { Image as ImageIcon, Video, Smile } from "lucide-react-native";
import { api } from "../api/client";
import { ENDPOINTS } from "../api/endpoints";
import { ui, palette } from "../theme";
import { useAuth } from "../store/AuthContext";

export default function PostComposer({ onCreated }: { onCreated: () => void }) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [imageUri, setImageUri] = useState("");

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const submit = async () => {
    if (!content.trim() && !imageUri) return;
    try {
      const formData = new FormData() as any;
      formData.append("content", content);
      if (imageUri) {
        formData.append("images", {
          uri: imageUri,
          name: "post.jpg",
          type: "image/jpeg",
        });
      }
      await api.post(ENDPOINTS.CREATE_POST, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setContent("");
      setImageUri("");
      onCreated();
    } catch (e) {
      console.error("[PostComposer] Create post error:", e);
    }
  };

  const handleVideoFeature = useCallback(() => {
    Alert.alert("Video", "Tính năng đăng video đang được phát triển.");
  }, []);

  const handleFeelingFeature = useCallback(() => {
    Alert.alert("Cảm xúc", "Tính năng cảm xúc đang được phát triển.");
  }, []);

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
          placeholder="Bạn đang nghĩ gì?"
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

      {imageUri ? (
        <View style={{ marginBottom: 16 }}>
          <Image
            source={{ uri: imageUri }}
            style={{ width: "100%", height: 200, borderRadius: 12 }}
            contentFit="cover"
          />
          <Pressable
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              backgroundColor: "rgba(0,0,0,0.5)",
              borderRadius: 12,
              padding: 4,
            }}
            onPress={() => setImageUri("")}
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
            Ảnh
          </Text>
        </Pressable>
        <Pressable
          onPress={handleVideoFeature}
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
          onPress={handleFeelingFeature}
          style={{ flexDirection: "row", alignItems: "center", padding: 8 }}
        >
          <Smile color="#f5a524" size={24} />
          <Text
            style={{ color: palette.muted, marginLeft: 8, fontWeight: "500" }}
          >
            Cảm xúc
          </Text>
        </Pressable>
      </View>

      {content.trim() || imageUri ? (
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
            Đăng bài
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

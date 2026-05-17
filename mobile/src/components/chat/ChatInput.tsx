import React from "react";
import { View, TextInput, Pressable, StyleSheet } from "react-native";
import { Send, Image as ImageIcon } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { palette } from "../../theme";

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onPickImage?: () => void;
}

export function ChatInput({ value, onChangeText, onSend, onPickImage }: Props) {
  const canSend = value.trim().length > 0;

  return (
    <View style={styles.container}>
      {onPickImage ? (
        <Pressable onPress={onPickImage} style={styles.iconBtn}>
          <ImageIcon color={palette.muted} size={20} />
        </Pressable>
      ) : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Nhập tin nhắn..."
        placeholderTextColor={palette.muted}
        style={styles.input}
        onSubmitEditing={onSend}
      />
      <Pressable onPress={onSend} disabled={!canSend}>
        <LinearGradient
          colors={[palette.primary, palette.accent]}
          style={[styles.sendBtn, !canSend ? styles.sendDisabled : null]}
        >
          <Send color="#fff" size={18} style={styles.sendIcon} />
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: palette.line,
  },
  iconBtn: { padding: 8 },
  input: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 15,
    marginHorizontal: 8,
    color: palette.ink,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  sendDisabled: { opacity: 0.5 },
  sendIcon: { marginLeft: 2 },
});

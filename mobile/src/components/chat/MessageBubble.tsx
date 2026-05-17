import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { palette } from "../../theme";

interface Props {
  content: string;
  isOwn: boolean;
  timestamp: string;
}

function MessageBubbleRaw({ content, isOwn, timestamp }: Props) {
  if (isOwn) {
    return (
      <View style={[styles.wrapper, styles.ownWrapper]}>
        <LinearGradient
          colors={[palette.primary, palette.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.bubble, styles.ownBubble]}
        >
          <Text style={styles.ownText}>{content}</Text>
          <Text style={styles.ownTime}>{timestamp}</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, styles.otherWrapper]}>
      <View style={[styles.bubble, styles.otherBubble]}>
        <Text style={styles.otherText}>{content}</Text>
        <Text style={styles.otherTime}>{timestamp}</Text>
      </View>
    </View>
  );
}

export const MessageBubble = memo(MessageBubbleRaw);

const styles = StyleSheet.create({
  wrapper: { marginBottom: 12 },
  ownWrapper: { alignItems: "flex-end" },
  otherWrapper: { alignItems: "flex-start" },
  bubble: { maxWidth: "80%", padding: 12, borderRadius: 16 },
  ownBubble: { borderBottomRightRadius: 4 },
  otherBubble: { backgroundColor: "#f3f4f6", borderBottomLeftRadius: 4 },
  ownText: { color: "#fff", fontSize: 15 },
  otherText: { color: palette.ink, fontSize: 15 },
  ownTime: { color: "rgba(255,255,255,0.7)", fontSize: 10, marginTop: 4, alignSelf: "flex-end" },
  otherTime: { color: palette.muted, fontSize: 10, marginTop: 4, alignSelf: "flex-end" },
});

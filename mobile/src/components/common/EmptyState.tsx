import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { Inbox } from "lucide-react-native";
import { palette } from "../../theme";

interface Props {
  icon?: React.ReactNode;
  title?: string;
  message?: string;
  action?: React.ReactNode;
  style?: ViewStyle;
}

export function EmptyState({
  icon,
  title = "Không có dữ liệu",
  message = "Chưa có nội dung nào ở đây",
  action,
  style,
}: Props) {
  return (
    <View style={[styles.container, style]}>
      {icon ? icon : <Inbox color={palette.muted} size={48} />}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {action ? action : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: palette.ink,
    marginTop: 16,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    color: palette.muted,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
});

import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { Inbox } from "lucide-react-native";
import { palette } from "../../theme";
import { useLanguage } from "../../store/LanguageContext";

interface Props {
  icon?: React.ReactNode;
  title?: string;
  message?: string;
  action?: React.ReactNode;
  style?: ViewStyle;
}

export function EmptyState({
  icon,
  title,
  message,
  action,
  style,
}: Props) {
  const { t } = useLanguage();
  return (
    <View style={[styles.container, style]}>
      {icon ? icon : <Inbox color={palette.muted} size={48} />}
      <Text style={styles.title}>{title || t("Không có dữ liệu", "No data")}</Text>
      <Text style={styles.message}>{message || t("Chưa có nội dung nào ở đây", "There is no content here yet")}</Text>
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

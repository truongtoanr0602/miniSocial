import React from "react";
import { View, Text, Pressable, StyleSheet, ViewStyle } from "react-native";
import { AlertTriangle, RefreshCw } from "lucide-react-native";
import { palette } from "../../theme";
import { useLanguage } from "../../store/LanguageContext";

interface Props {
  message?: string;
  onRetry?: () => void;
  style?: ViewStyle;
}

export function ErrorView({
  message,
  onRetry,
  style,
}: Props) {
  const { t } = useLanguage();
  return (
    <View style={[styles.container, style]}>
      <AlertTriangle color={palette.danger} size={48} />
      <Text style={styles.message}>{message || t("Đã xảy ra lỗi. Vui lòng thử lại.", "Something went wrong. Please try again.")}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} style={styles.retryBtn}>
          <RefreshCw color="#fff" size={16} style={styles.retryIcon} />
          <Text style={styles.retryText}>{t("Thử lại", "Try again")}</Text>
        </Pressable>
      ) : null}
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
  message: {
    fontSize: 14,
    color: palette.muted,
    marginTop: 16,
    textAlign: "center",
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 20,
    backgroundColor: palette.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  retryIcon: { marginRight: 8 },
  retryText: { color: "#fff", fontWeight: "600", fontSize: 14 },
});

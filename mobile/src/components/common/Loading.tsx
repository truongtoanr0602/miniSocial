import React from "react";
import { View, ActivityIndicator, Text, StyleSheet, ViewStyle } from "react-native";
import { palette } from "../../theme";

interface Props {
  message?: string;
  size?: "small" | "large";
  style?: ViewStyle;
}

export function Loading({ message, size = "large", style }: Props) {
  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size={size} color={palette.primary} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
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
    marginTop: 16,
    fontSize: 14,
    color: palette.muted,
    textAlign: "center",
  },
});

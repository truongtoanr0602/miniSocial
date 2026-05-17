import React from "react";
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { palette } from "../../theme";

interface Props {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  style,
  textStyle,
}: Props) {
  const isDisabled = disabled || loading;

  if (variant === "primary") {
    return (
      <Pressable onPress={onPress} disabled={isDisabled} style={[styles.wrapper, style]}>
        <LinearGradient
          colors={[palette.primary, palette.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradient, isDisabled ? styles.disabled : null]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={[styles.primaryText, textStyle]}>{title}</Text>
          )}
        </LinearGradient>
      </Pressable>
    );
  }

  if (variant === "danger") {
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        style={[styles.dangerBtn, isDisabled ? styles.disabled : null, style]}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={[styles.dangerText, textStyle]}>{title}</Text>
        )}
      </Pressable>
    );
  }

  if (variant === "ghost") {
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        style={[styles.ghostBtn, isDisabled ? styles.disabled : null, style]}
      >
        <Text style={[styles.ghostText, textStyle]}>{title}</Text>
      </Pressable>
    );
  }

  // secondary
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={[styles.secondaryBtn, isDisabled ? styles.disabled : null, style]}
    >
      {loading ? (
        <ActivityIndicator color={palette.primary} size="small" />
      ) : (
        <Text style={[styles.secondaryText, textStyle]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: { borderRadius: 12, overflow: "hidden" },
  gradient: { height: 48, alignItems: "center", justifyContent: "center", borderRadius: 12 },
  primaryText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  secondaryBtn: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: palette.primary,
    backgroundColor: "transparent",
  },
  secondaryText: { color: palette.primary, fontWeight: "600", fontSize: 16 },
  ghostBtn: { height: 48, alignItems: "center", justifyContent: "center", borderRadius: 12 },
  ghostText: { color: palette.primary, fontWeight: "600", fontSize: 14 },
  dangerBtn: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: palette.danger,
  },
  dangerText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  disabled: { opacity: 0.5 },
});

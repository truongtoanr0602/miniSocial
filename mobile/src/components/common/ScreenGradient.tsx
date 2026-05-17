import React from "react";
import { StyleSheet, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { palette } from "../../theme";

interface Props {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
}

export function ScreenGradient({ children, style }: Props) {
  return (
    <LinearGradient
      colors={[palette.gradient.purpleLight, palette.gradient.blueLight, palette.gradient.pinkLight]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

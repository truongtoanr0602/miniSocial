import { StyleSheet } from "react-native";
import { palette } from "./colors";

// ──────────────────────────────────────────
// Typography — text presets
// ──────────────────────────────────────────
export const typography = StyleSheet.create({
  h1: {
    fontSize: 28,
    fontWeight: "800",
    color: palette.ink,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 24,
    fontWeight: "700",
    color: palette.ink,
  },
  h3: {
    fontSize: 20,
    fontWeight: "600",
    color: palette.ink,
  },
  body: {
    fontSize: 15,
    color: palette.ink,
    lineHeight: 22,
  },
  bodySmall: {
    fontSize: 13,
    color: palette.ink,
    lineHeight: 18,
  },
  caption: {
    fontSize: 12,
    color: palette.muted,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: palette.ink,
  },
  link: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.primary,
  },
});

import React from "react";
import { StyleSheet } from "react-native";
import { Image } from "expo-image";
import type { ImageStyle } from "expo-image";

interface Props {
  uri: string | null | undefined;
  name?: string;
  size?: number;
  style?: ImageStyle;
}

export function Avatar({ uri, name = "U", size = 48, style }: Props) {
  const fallbackUri = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=7c3aed&color=fff&size=${size * 2}`;
  const imageUri = uri || fallbackUri;

  return (
    <Image
      source={{ uri: imageUri }}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        style,
      ]}
      contentFit="cover"
      transition={200}
    />
  );
}

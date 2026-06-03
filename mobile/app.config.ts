import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "MiniSocialMobile",
  slug: "mini-social-mobile",
  scheme: process.env.EXPO_PUBLIC_GOOGLE_AUTH_SCHEME || "minisocial",
  version: "1.0.0",
  orientation: "portrait",
  assetBundlePatterns: ["**/*"],

  ios: {
    supportsTablet: true,
    bundleIdentifier:
      process.env.EXPO_PUBLIC_IOS_BUNDLE_IDENTIFIER ||
      "com.nguyenbanam.minisocial",
  },

  android: {
    adaptiveIcon: {
      backgroundColor: "#ffffff",
    },
    package:
      process.env.EXPO_PUBLIC_ANDROID_PACKAGE || "com.nguyenbanam.minisocial",
  },
  plugins: [
    [
      "expo-camera",
      {
        cameraPermission: "Allow MiniSocial to access your camera",
      },
    ],
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission:
          "Allow MiniSocial to use your location.",
      },
    ],
    [
      "expo-media-library",
      {
        photosPermission: "Allow MiniSocial to access your photos",
        savePhotosPermission: "Allow MiniSocial to save photos",
      },
    ],
    "expo-video",
    "expo-web-browser",
  ],
});

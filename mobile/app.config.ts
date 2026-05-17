import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'MiniSocialMobile',
  slug: 'mini-social-mobile',
  version: '1.0.0',
  orientation: 'portrait',
  assetBundlePatterns: ['**/*'],
  plugins: [
    [
      "expo-camera",
      {
        "cameraPermission": "Allow MiniSocial to access your camera"
      }
    ],
    [
      "expo-location",
      {
        "locationAlwaysAndWhenInUsePermission": "Allow MiniSocial to use your location."
      }
    ],
    [
      "expo-media-library",
      {
        "photosPermission": "Allow MiniSocial to access your photos",
        "savePhotosPermission": "Allow MiniSocial to save photos"
      }
    ]
  ]
});

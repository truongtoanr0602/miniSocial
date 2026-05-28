import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useAuth } from "../store/AuthContext";
import { useLanguage } from "../store/LanguageContext";
import { palette } from "../theme";
import {
  Home,
  Search,
  User,
  Bell,
  MessageCircle,
  Settings,
} from "lucide-react-native";

import FeedScreen from "../screens/FeedScreen";
import LoginScreen from "../screens/LoginScreen";
import ProfileScreen from "../screens/ProfileScreen";
import RegisterScreen from "../screens/RegisterScreen";
import SearchScreen from "../screens/SearchScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import MessagesScreen from "../screens/MessagesScreen";
import SettingsScreen from "../screens/SettingsScreen";
import PostDetailScreen from "../screens/PostDetailScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const sharedOptions = {
  headerStyle: { backgroundColor: "#ffffff" },
  headerTintColor: palette.ink,
  headerShadowVisible: false,
  contentStyle: { backgroundColor: palette.bg },
};

function MainTabs() {
  const { t } = useLanguage();

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#ffffff" },
        headerTintColor: palette.ink,
        headerShadowVisible: false,
        tabBarActiveTintColor: palette.primary,
        sceneStyle: { backgroundColor: palette.bg },
      }}
    >
      <Tab.Screen
        name="Feed"
        component={FeedScreen}
        options={{
          title: "Mini Social",
          tabBarLabel: t("Trang chủ", "Home"),
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          title: t("Tìm kiếm", "Search"),
          tabBarIcon: ({ color, size }) => <Search color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          title: t("Thông báo", "Notifications"),
          tabBarIcon: ({ color, size }) => <Bell color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          title: t("Tin nhắn", "Messages"),
          tabBarIcon: ({ color, size }) => (
            <MessageCircle color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: t("Hồ sơ", "Profile"),
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: t("Cài đặt", "Settings"),
          tabBarIcon: ({ color, size }) => (
            <Settings color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export function Navigation() {
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useLanguage();

  if (isLoading) {
    return null; // Or a splash screen
  }

  return (
    <Stack.Navigator screenOptions={sharedOptions}>
      {!isAuthenticated ? (
        <>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ title: t("Chào mừng", "Welcome") }}
          />
          <Stack.Screen
            name="Register"
            component={RegisterScreen}
            options={{ title: t("Đăng ký", "Register") }}
          />
        </>
      ) : (
        <>
          <Stack.Screen
            name="Main"
            component={MainTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="UserProfile"
            component={ProfileScreen}
            options={{ title: t("Trang cá nhân", "Profile") }}
          />
          <Stack.Screen
            name="PostDetail"
            component={PostDetailScreen}
            options={{ title: t("Bài viết", "Post") }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

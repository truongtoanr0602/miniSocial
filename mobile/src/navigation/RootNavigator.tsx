import React, { useEffect, useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View } from "react-native";
import { useLanguage } from "../store/LanguageContext";
import { useSocketContext } from "../store/SocketContext";
import { useAuth } from "../store/AuthContext";
import { api } from "../api/client";
import { ENDPOINTS } from "../api/endpoints";
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
  const { socket } = useSocketContext();
  const { user } = useAuth();
  const [unreadTotal, setUnreadTotal] = useState(0);

  const loadUnread = async () => {
    try {
      const res = await api.get(ENDPOINTS.CONVERSATIONS);
      const list = res.data.data || (Array.isArray(res.data) ? res.data : []);
      const total = list.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0);
      setUnreadTotal(total);
    } catch (e) {
      console.error("[MainTabs] loadUnread", e);
    }
  };

  useEffect(() => {
    void loadUnread();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (payload: any) => {
      const incoming = payload?.message || payload;
      const conversationId = payload?.conversationId || incoming?.conversationId || incoming?.conversation;
      if (!conversationId) return;

      // Nếu tin nhắn do chính bạn gửi thì không tăng
      const rawSender = incoming?.sender || incoming?.author || incoming?.userId || incoming?.senderId || incoming?.user;
      const senderId = typeof rawSender === "string" ? rawSender : (rawSender?._id || rawSender?.id);
      const currentUserId = (user as any)?._id || (user as any)?.id;
      if (String(senderId) === String(currentUserId)) return;

      setUnreadTotal((v) => v + 1);
    };

    socket.on("newMessage", handleNewMessage);
    return () => {
      socket.off("newMessage", handleNewMessage);
    };
  }, [socket, user]);

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
            <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
              <MessageCircle color={color} size={size} />
              {unreadTotal > 0 ? (
                <View style={{ position: "absolute", top: 2, right: -2, width: 10, height: 10, borderRadius: 6, backgroundColor: "#ef4444", borderWidth: 1, borderColor: "#fff" }} />
              ) : null}
            </View>
          ),
        }}
        listeners={() => ({
          focus: () => {
            // Clear local unread indicator immediately when user opens Messages
            setUnreadTotal(0);
            void loadUnread();
          },
        })}
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

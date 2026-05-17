import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Switch,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import {
  User,
  Lock,
  Shield,
  Eye,
  Bell,
  Moon,
  Globe,
  HelpCircle,
  LogOut,
  ChevronRight,
} from "lucide-react-native";
import { Image } from "expo-image";
import { useAuth } from "../store/AuthContext";
import { palette } from "../theme";
import { ScreenGradient } from "../components/common/ScreenGradient";

// ── Extracted Components (module-level to avoid remount) ──

interface SettingSectionProps {
  title: string;
  children: React.ReactNode;
}

function SettingSection({ title, children }: SettingSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

interface SettingItemProps {
  icon: React.ComponentType<{ color: string; size: number }>;
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
  onPress?: () => void;
  isDestructive?: boolean;
}

function SettingItem({
  icon: Icon,
  title,
  subtitle,
  rightElement,
  onPress,
  isDestructive = false,
}: SettingItemProps) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={styles.itemRow}>
      <View
        style={[
          styles.iconCircle,
          isDestructive ? styles.iconCircleDanger : null,
        ]}
      >
        <Icon
          color={isDestructive ? palette.danger : palette.primary}
          size={20}
        />
      </View>
      <View style={styles.itemContent}>
        <Text
          style={[
            styles.itemTitle,
            isDestructive ? styles.itemTitleDanger : null,
          ]}
        >
          {title}
        </Text>
        {subtitle ? <Text style={styles.itemSubtitle}>{subtitle}</Text> : null}
      </View>
      {rightElement ? (
        rightElement
      ) : onPress ? (
        <ChevronRight color={palette.muted} size={20} />
      ) : null}
    </Pressable>
  );
}

// ── Main Screen ──

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const [isPrivate, setIsPrivate] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const userData = user as any;
  const avatarUrl =
    userData?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(userData?.display_name || userData?.username || "U")}&background=7c3aed&color=fff`;

  const handleEditProfile = () => {
    Alert.alert("Chỉnh sửa", "Tính năng chỉnh sửa hồ sơ đang phát triển.");
  };

  const handleChangePassword = () => {
    Alert.alert("Đổi mật khẩu", "Tính năng đổi mật khẩu đang phát triển.");
  };

  const handleLogout = () => {
    Alert.alert("Đăng xuất", "Bạn có chắc chắn muốn đăng xuất?", [
      { text: "Hủy", style: "cancel" },
      { text: "Đăng xuất", style: "destructive", onPress: logout },
    ]);
  };

  const handleHelp = () => {
    Alert.alert("Trợ giúp", "Liên hệ: support@minisocial.app");
  };

  const handleLanguage = () => {
    Alert.alert("Ngôn ngữ", "Hiện tại ứng dụng đang hỗ trợ Tiếng Việt.");
  };

  return (
    <ScreenGradient>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.pageTitle}>Cài đặt</Text>

        {/* Profile Summary */}
        <View style={styles.profileSummary}>
          <Image source={{ uri: avatarUrl }} style={styles.profileAvatar} />
          <View>
            <Text style={styles.profileName}>
              {userData?.display_name || userData?.username}
            </Text>
            <Text style={styles.profileHandle}>@{userData?.username}</Text>
            {userData?.email ? (
              <Text style={styles.profileEmail}>{userData?.email}</Text>
            ) : null}
          </View>
        </View>

        <SettingSection title="Tài khoản">
          <SettingItem
            icon={User}
            title="Chỉnh sửa trang cá nhân"
            subtitle="Thay đổi ảnh đại diện, tên, bio"
            onPress={handleEditProfile}
          />
          <SettingItem
            icon={Lock}
            title="Đổi mật khẩu"
            subtitle="Cập nhật mật khẩu của bạn"
            onPress={handleChangePassword}
          />
        </SettingSection>

        <SettingSection title="Quyền riêng tư">
          <SettingItem
            icon={Shield}
            title="Tài khoản riêng tư"
            subtitle="Chỉ người theo dõi mới xem được bài viết"
            rightElement={
              <Switch
                value={isPrivate}
                onValueChange={setIsPrivate}
                trackColor={{ false: "#d1d5db", true: palette.primary }}
              />
            }
          />
          <SettingItem
            icon={Eye}
            title="Trạng thái hoạt động"
            subtitle="Hiển thị khi bạn đang online"
            rightElement={
              <Switch
                value={isActive}
                onValueChange={setIsActive}
                trackColor={{ false: "#d1d5db", true: palette.primary }}
              />
            }
          />
        </SettingSection>

        <SettingSection title="Thông báo">
          <SettingItem
            icon={Bell}
            title="Thông báo đẩy"
            subtitle="Nhận thông báo về hoạt động"
            rightElement={
              <Switch
                value={pushNotifications}
                onValueChange={setPushNotifications}
                trackColor={{ false: "#d1d5db", true: palette.primary }}
              />
            }
          />
        </SettingSection>

        <SettingSection title="Giao diện">
          <SettingItem
            icon={Moon}
            title="Chế độ tối"
            subtitle="Sử dụng giao diện tối"
            rightElement={
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{ false: "#d1d5db", true: palette.primary }}
              />
            }
          />
          <SettingItem
            icon={Globe}
            title="Ngôn ngữ"
            onPress={handleLanguage}
            rightElement={
              <View style={styles.langRow}>
                <Text style={styles.langText}>Tiếng Việt</Text>
                <ChevronRight color={palette.muted} size={20} />
              </View>
            }
          />
        </SettingSection>

        <SettingSection title="Hỗ trợ">
          <SettingItem
            icon={HelpCircle}
            title="Trợ giúp & hỗ trợ"
            onPress={handleHelp}
          />
          <SettingItem
            icon={LogOut}
            title="Đăng xuất"
            isDestructive
            onPress={handleLogout}
          />
        </SettingSection>
      </ScrollView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 16, paddingBottom: 40 },
  pageTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: palette.primary,
    marginBottom: 24,
    marginLeft: 8,
  },
  profileSummary: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: palette.card,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  profileAvatar: { width: 60, height: 60, borderRadius: 30, marginRight: 16 },
  profileName: { fontSize: 18, fontWeight: "bold", color: palette.ink },
  profileHandle: { fontSize: 14, color: palette.muted },
  profileEmail: { fontSize: 14, color: palette.muted },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.ink,
    marginBottom: 12,
    marginLeft: 16,
  },
  sectionCard: {
    backgroundColor: palette.card,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(147, 51, 234, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  iconCircleDanger: { backgroundColor: "rgba(239, 68, 68, 0.1)" },
  itemContent: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: "500", color: palette.ink },
  itemTitleDanger: { color: palette.danger },
  itemSubtitle: { fontSize: 13, color: palette.muted, marginTop: 2 },
  langRow: { flexDirection: "row", alignItems: "center" },
  langText: { color: palette.muted, marginRight: 8 },
});

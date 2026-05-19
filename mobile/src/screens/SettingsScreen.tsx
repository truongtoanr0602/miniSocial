import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  ArrowLeft,
  Bell,
  Camera,
  ChevronDown,
  ChevronRight,
  Eye,
  FileText,
  Globe,
  Heart,
  HelpCircle,
  Lock,
  LogOut,
  Mail,
  MessageCircle,
  MessageSquare,
  Moon,
  Palette,
  Save,
  Shield,
  User,
  Users,
} from "lucide-react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "../api/client";
import { ENDPOINTS } from "../api/endpoints";
import { ScreenGradient } from "../components/common/ScreenGradient";
import { useAuth } from "../store/AuthContext";
import { palette } from "../theme";
import type { ApiResponse, IUser } from "../types/models";

type SettingsScreenMode = "main" | "edit-profile" | "notifications" | "help";

type BooleanKey = "isPrivate" | "isActive" | "pushNotifications" | "darkMode";

type NotificationKey = "likes" | "comments" | "follows" | "messages";

interface RowProps {
  icon: React.ComponentType<{ color: string; size: number }>;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  value?: boolean;
  danger?: boolean;
}

function Toggle({ value }: { value: boolean }) {
  return (
    <View
      style={[styles.toggle, value ? styles.toggleActive : styles.toggleOff]}
    >
      <View
        style={[styles.toggleKnob, value ? styles.toggleKnobActive : null]}
      />
    </View>
  );
}

function SettingsHeader({
  title,
  onBack,
}: {
  title: string;
  onBack?: () => void;
}) {
  return (
    <View style={styles.subHeader}>
      {onBack ? (
        <Pressable onPress={onBack} style={styles.backButton}>
          <ArrowLeft color={palette.ink} size={22} />
        </Pressable>
      ) : null}
      <Text style={styles.subHeaderTitle}>{title}</Text>
    </View>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function SettingRow({
  icon: Icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  onPress,
  value,
  danger = false,
}: RowProps) {
  const hasToggle = typeof value === "boolean";

  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
        <Icon color={iconColor} size={20} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, danger ? styles.dangerText : null]}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {hasToggle ? (
        <Toggle value={Boolean(value)} />
      ) : danger ? null : (
        <ChevronRight color={palette.muted} size={20} />
      )}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const [mode, setMode] = useState<SettingsScreenMode>("main");
  const [profile, setProfile] = useState<IUser | null>(user);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState({
    likes: true,
    comments: true,
    follows: true,
    messages: true,
  });
  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [username, setUsername] = useState(user?.username || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [location, setLocation] = useState("Hà Nội, Việt Nam");
  const [website, setWebsite] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone_number || "");
  const [avatarUri, setAvatarUri] = useState(user?.avatar_url || "");
  const [saving, setSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const res = await api.get<ApiResponse<IUser>>(ENDPOINTS.MY_PROFILE);
      const data = res.data.data;
      setProfile(data);
      setDisplayName(data.display_name || "");
      setUsername(data.username || "");
      setBio(data.bio || "");
      setEmail(data.email || "");
      setPhone(data.phone_number || "");
      setAvatarUri(data.avatar_url || "");
    } catch (e) {
      console.error("[SettingsScreen] Load profile error:", e);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const userData = profile || user;
  const avatarUrl =
    avatarUri ||
    userData?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      userData?.display_name || userData?.username || "U",
    )}&background=7c3aed&color=fff`;

  const toggleBoolean = useCallback((key: BooleanKey) => {
    const setters = {
      isPrivate: setIsPrivate,
      isActive: setIsActive,
      pushNotifications: setPushNotifications,
      darkMode: setDarkMode,
    };
    setters[key]((value) => !value);
  }, []);

  const toggleNotification = useCallback((key: NotificationKey) => {
    setNotificationPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const pickAvatar = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
    }
  }, []);

  const saveProfile = useCallback(async () => {
    if (!displayName.trim()) {
      Alert.alert("Hồ sơ", "Tên hiển thị không được để trống.");
      return;
    }

    try {
      setSaving(true);
      const formData = new FormData() as any;
      formData.append("display_name", displayName.trim());
      formData.append("bio", bio.trim());

      if (avatarUri && avatarUri !== userData?.avatar_url) {
        formData.append("avatar", {
          uri: avatarUri,
          name: "avatar.jpg",
          type: "image/jpeg",
        });
      }

      const res = await api.put<ApiResponse<IUser>>(
        ENDPOINTS.UPDATE_PROFILE,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      const updated = res.data.data;
      setProfile((prev) => ({
        ...(prev || userData || ({} as IUser)),
        ...updated,
      }));
      setAvatarUri(updated.avatar_url || avatarUri);
      setMode("main");
      Alert.alert("Hồ sơ", "Đã lưu thay đổi.");
    } catch (e: any) {
      console.error("[SettingsScreen] Save profile error:", e);
      Alert.alert(
        "Hồ sơ",
        e.response?.data?.message || "Không thể cập nhật hồ sơ.",
      );
    } finally {
      setSaving(false);
    }
  }, [avatarUri, bio, displayName, userData]);

  const handleLogout = useCallback(() => {
    Alert.alert("Đăng xuất", "Bạn có chắc chắn muốn đăng xuất?", [
      { text: "Hủy", style: "cancel" },
      { text: "Đăng xuất", style: "destructive", onPress: logout },
    ]);
  }, [logout]);

  const mainSections = useMemo(
    () => [
      {
        title: "Tài khoản",
        rows: [
          {
            icon: User,
            iconColor: palette.primary,
            iconBg: "#f3e8ff",
            title: "Chỉnh sửa hồ sơ",
            subtitle: "Tên, bio, ảnh đại diện và thông tin cá nhân",
            onPress: () => setMode("edit-profile"),
          },
          {
            icon: Lock,
            iconColor: "#f59e0b",
            iconBg: "#fef3c7",
            title: "Đổi mật khẩu",
            subtitle: "Cập nhật mật khẩu của bạn",
            onPress: () =>
              Alert.alert("Đổi mật khẩu", "Tính năng này đang phát triển."),
          },
        ],
      },
      {
        title: "Quyền riêng tư & Bảo mật",
        rows: [
          {
            icon: Shield,
            iconColor: "#16a34a",
            iconBg: "#dcfce7",
            title: "Tài khoản riêng tư",
            subtitle: "Chỉ người được chấp thuận mới xem bài viết",
            value: isPrivate,
            onPress: () => toggleBoolean("isPrivate"),
          },
          {
            icon: Eye,
            iconColor: "#0891b2",
            iconBg: "#cffafe",
            title: "Trạng thái hoạt động",
            subtitle: "Cho phép người khác thấy khi bạn online",
            value: isActive,
            onPress: () => toggleBoolean("isActive"),
          },
        ],
      },
      {
        title: "Thông báo",
        rows: [
          {
            icon: Bell,
            iconColor: "#f59e0b",
            iconBg: "#fef3c7",
            title: "Thông báo day",
            subtitle: "Bật/tắt thông báo",
            value: pushNotifications,
            onPress: () => toggleBoolean("pushNotifications"),
          },
          {
            icon: Bell,
            iconColor: "#4f46e5",
            iconBg: "#e0e7ff",
            title: "Tùy chỉnh thông báo",
            subtitle: "Chọn loại thông báo muốn nhận",
            onPress: () => setMode("notifications"),
          },
        ],
      },
      {
        title: "Giao diện",
        rows: [
          {
            icon: Moon,
            iconColor: "#475569",
            iconBg: "#f1f5f9",
            title: "Chế độ tối",
            subtitle: "Đang tắt",
            value: darkMode,
            onPress: () => toggleBoolean("darkMode"),
          },
          {
            icon: Globe,
            iconColor: "#0d9488",
            iconBg: "#ccfbf1",
            title: "Ngôn ngữ",
            subtitle: "Tiếng Việt",
            onPress: () =>
              Alert.alert("Ngôn ngữ", "Ứng dụng hiện đang hỗ trợ Tiếng Việt."),
          },
          {
            icon: Palette,
            iconColor: "#c026d3",
            iconBg: "#fae8ff",
            title: "Chủ đề màu sắc",
            subtitle: "Tím (Mặc định)",
            onPress: () =>
              Alert.alert("Chủ đề", "Tính năng này đang được cập nhật."),
          },
        ],
      },
      {
        title: "Hỗ trợ",
        rows: [
          {
            icon: HelpCircle,
            iconColor: "#0284c7",
            iconBg: "#e0f2fe",
            title: "Tro giup & Hỗ trợ",
            subtitle: "FAQ, liên hệ và điều khoản",
            onPress: () => setMode("help"),
          },
          {
            icon: LogOut,
            iconColor: palette.danger,
            iconBg: "#fee2e2",
            title: "Đăng xuất",
            subtitle: "Thoát khỏi tài khoản hiện tại",
            danger: true,
            onPress: handleLogout,
          },
        ],
      },
    ],
    [
      darkMode,
      handleLogout,
      isActive,
      isPrivate,
      pushNotifications,
      toggleBoolean,
    ],
  );

  const renderMain = () => (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Text style={styles.pageTitle}>Cài đặt</Text>
      <Text style={styles.pageSubtitle}>
        Quản lý tài khoản và tùy chọn của bạn
      </Text>

      <View style={styles.profileSummary}>
        <Image source={{ uri: avatarUrl }} style={styles.profileAvatar} />
        <View style={styles.profileText}>
          <Text style={styles.profileName}>
            {userData?.display_name || userData?.username}
          </Text>
          <Text style={styles.profileHandle}>@{userData?.username}</Text>
          {userData?.email ? (
            <Text style={styles.profileEmail}>{userData.email}</Text>
          ) : null}
        </View>
        <Pressable
          onPress={() => setMode("edit-profile")}
          style={styles.editLink}
        >
          <Text style={styles.editLinkText}>Chỉnh sửa</Text>
        </Pressable>
      </View>

      {mainSections.map((section) => (
        <Section key={section.title} title={section.title}>
          {section.rows.map((row) => (
            <SettingRow key={row.title} {...row} />
          ))}
        </Section>
      ))}
    </ScrollView>
  );

  const renderEditProfile = () => (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <SettingsHeader title="Chỉnh sửa hồ sơ" onBack={() => setMode("main")} />

      <View style={styles.avatarCard}>
        <Pressable onPress={pickAvatar} style={styles.avatarEditor}>
          <View>
            <Image source={{ uri: avatarUrl }} style={styles.largeAvatar} />
            <View style={styles.cameraOverlay}>
              <Camera color="#fff" size={22} />
            </View>
          </View>
          <Text style={styles.changeAvatarText}>Thay đổi ảnh đại diện</Text>
        </Pressable>
      </View>

      <View style={styles.formCard}>
        <Field
          label="Họ và tên"
          value={displayName}
          onChangeText={setDisplayName}
        />
        <Text style={styles.inputLabel}>Tên người dùng</Text>
        <View style={styles.usernameInput}>
          <Text style={styles.atSign}>@</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            style={styles.usernameTextInput}
            autoCapitalize="none"
          />
        </View>
        <Field label="Bio" value={bio} onChangeText={setBio} multiline />
        <Field label="Địa điểm" value={location} onChangeText={setLocation} />
        <Field label="Website" value={website} onChangeText={setWebsite} />
      </View>

      <View style={styles.formCard}>
        <Text style={styles.cardTitle}>Thông tin liên hệ</Text>
        <Field label="Email" value={email} onChangeText={setEmail} />
        <Field
          label="Số điện thoại"
          value={phone}
          onChangeText={setPhone}
          placeholder="Số điện thoại"
        />
      </View>

      <Pressable
        onPress={saveProfile}
        disabled={saving}
        style={styles.saveWrapper}
      >
        <LinearGradient
          colors={[palette.primary, palette.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.saveGradient, saving ? styles.disabled : null]}
        >
          <Save color="#fff" size={16} style={styles.saveIcon} />
          <Text style={styles.saveText}>
            {saving ? "Đang lưu" : "Lưu thay doi"}
          </Text>
        </LinearGradient>
      </Pressable>
    </ScrollView>
  );

  const renderNotifications = () => {
    const rows = [
      {
        key: "likes" as const,
        icon: Heart,
        iconColor: "#ec4899",
        iconBg: "#fce7f3",
        title: "Lượt thích",
        subtitle: "Khi ai đó thích bài viết của bạn",
      },
      {
        key: "comments" as const,
        icon: MessageSquare,
        iconColor: "#0ea5e9",
        iconBg: "#e0f2fe",
        title: "Bình luận",
        subtitle: "Khi ai đó bình luận bài viết của bạn",
      },
      {
        key: "follows" as const,
        icon: Users,
        iconColor: "#22c55e",
        iconBg: "#dcfce7",
        title: "Theo dõi mới",
        subtitle: "Khi có người theo dõi bạn",
      },
      {
        key: "messages" as const,
        icon: Mail,
        iconColor: "#f97316",
        iconBg: "#ffedd5",
        title: "Tin nhắn",
        subtitle: "Khi bạn nhận được tin nhắn mới",
      },
    ];

    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <SettingsHeader
          title="Cài đặt thông báo"
          onBack={() => setMode("main")}
        />
        <Section title="Thông báo day">
          <SettingRow
            icon={Bell}
            iconColor={palette.primary}
            iconBg="#f3e8ff"
            title="Bật thông báo đẩy"
            subtitle="Nhận thông báo ngay cả khi không mở app"
            value={pushNotifications}
            onPress={() => toggleBoolean("pushNotifications")}
          />
        </Section>

        <Section title="Loại thông báo">
          {rows.map((row) => (
            <SettingRow
              key={row.key}
              icon={row.icon}
              iconColor={row.iconColor}
              iconBg={row.iconBg}
              title={row.title}
              subtitle={row.subtitle}
              value={notificationPrefs[row.key]}
              onPress={() => toggleNotification(row.key)}
            />
          ))}
        </Section>
      </ScrollView>
    );
  };

  const renderHelp = () => {
    const faqs = [
      "Làm thế nào để thay đổi ảnh đại diện?",
      "Toi có the xoa bài viết cua minh khong?",
      "Tài khoản rieng tu hoat dong nhu the nao?",
      "Làm thế nào để báo cáo một tài khoản?",
    ];
    const supportRows = [
      {
        icon: Mail,
        iconColor: "#0ea5e9",
        iconBg: "#e0f2fe",
        title: "Gửi email hỗ trợ",
        subtitle: "support@socialmini.com",
      },
      {
        icon: MessageCircle,
        iconColor: "#22c55e",
        iconBg: "#dcfce7",
        title: "Chat trực tiếp",
        subtitle: "Hỗ trợ 24/7",
      },
      {
        icon: FileText,
        iconColor: palette.primary,
        iconBg: "#f3e8ff",
        title: "Điều khoản dịch vụ",
      },
      {
        icon: Shield,
        iconColor: "#64748b",
        iconBg: "#f1f5f9",
        title: "Chính sách bảo mật",
      },
    ];

    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <SettingsHeader
          title="Trợ giúp & Hỗ trợ"
          onBack={() => setMode("main")}
        />

        <Section title="Câu hỏi thường gặp">
          {faqs.map((item) => (
            <Pressable
              key={item}
              onPress={() =>
                Alert.alert("Trợ giúp", "Nội dung đang được cập nhật.")
              }
              style={styles.faqRow}
            >
              <Text style={styles.faqText}>{item}</Text>
              <ChevronDown color={palette.muted} size={18} />
            </Pressable>
          ))}
        </Section>

        <Section title="Liên hệ hỗ trợ">
          {supportRows.map((row) => (
            <SettingRow
              key={row.title}
              icon={row.icon}
              iconColor={row.iconColor}
              iconBg={row.iconBg}
              title={row.title}
              subtitle={row.subtitle}
              onPress={() =>
                Alert.alert(row.title, "Tính năng này đang được cập nhật.")
              }
            />
          ))}
        </Section>
      </ScrollView>
    );
  };

  return (
    <ScreenGradient>
      {mode === "main" ? renderMain() : null}
      {mode === "edit-profile" ? renderEditProfile() : null}
      {mode === "notifications" ? renderNotifications() : null}
      {mode === "help" ? renderHelp() : null}
    </ScreenGradient>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.muted}
        multiline={multiline}
        style={[styles.textField, multiline ? styles.multilineField : null]}
        textAlignVertical={multiline ? "top" : "center"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 16, paddingBottom: 40 },
  pageTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: palette.primary,
    marginLeft: 4,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 13,
    color: palette.muted,
    marginLeft: 4,
    marginBottom: 18,
  },
  subHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  subHeaderTitle: { fontSize: 20, fontWeight: "800", color: palette.ink },
  profileSummary: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: palette.card,
    borderRadius: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: palette.line,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  profileAvatar: { width: 60, height: 60, borderRadius: 30, marginRight: 14 },
  profileText: { flex: 1 },
  profileName: { fontSize: 17, fontWeight: "800", color: palette.ink },
  profileHandle: { fontSize: 13, color: palette.muted, marginTop: 2 },
  profileEmail: { fontSize: 12, color: palette.muted, marginTop: 2 },
  editLink: { paddingHorizontal: 8, paddingVertical: 8 },
  editLinkText: { color: palette.primary, fontWeight: "700", fontSize: 13 },
  section: { marginBottom: 18 },
  sectionTitle: {
    fontSize: 12,
    textTransform: "uppercase",
    fontWeight: "800",
    color: "#9ca3af",
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: palette.card,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: palette.line,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  row: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { color: palette.ink, fontWeight: "700", fontSize: 14 },
  rowSubtitle: { color: palette.muted, fontSize: 12, marginTop: 2 },
  dangerText: { color: palette.danger },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: "center",
  },
  toggleActive: { backgroundColor: palette.primary },
  toggleOff: { backgroundColor: "#cbd5e1" },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
    transform: [{ translateX: 0 }],
  },
  toggleKnobActive: { transform: [{ translateX: 20 }] },
  avatarCard: {
    backgroundColor: palette.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.line,
    paddingVertical: 28,
    alignItems: "center",
    marginBottom: 14,
  },
  avatarEditor: { alignItems: "center" },
  largeAvatar: { width: 92, height: 92, borderRadius: 46 },
  cameraOverlay: {
    position: "absolute",
    inset: 0,
    borderRadius: 46,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  changeAvatarText: {
    color: palette.primary,
    fontWeight: "700",
    fontSize: 13,
    marginTop: 12,
  },
  formCard: {
    backgroundColor: palette.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 16,
    marginBottom: 14,
  },
  cardTitle: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 16,
  },
  field: { marginBottom: 14 },
  inputLabel: {
    color: palette.ink,
    fontWeight: "600",
    fontSize: 13,
    marginBottom: 7,
  },
  textField: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingHorizontal: 12,
    color: palette.ink,
    backgroundColor: "#fff",
    fontSize: 14,
  },
  multilineField: { minHeight: 92, paddingTop: 12, paddingBottom: 12 },
  usernameInput: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    backgroundColor: "#fff",
  },
  atSign: { color: palette.muted, marginRight: 8 },
  usernameTextInput: { flex: 1, color: palette.ink, fontSize: 14 },
  saveWrapper: { marginBottom: 8 },
  saveGradient: {
    minHeight: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  disabled: { opacity: 0.65 },
  saveIcon: { marginRight: 8 },
  saveText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  faqRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  faqText: { color: palette.ink, fontSize: 13, fontWeight: "600", flex: 1 },
});

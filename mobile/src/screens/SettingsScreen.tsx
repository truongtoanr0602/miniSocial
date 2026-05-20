import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Linking,
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
  Check,
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
  MessageSquare,
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
import { useLanguage } from "../store/LanguageContext";
import { palette } from "../theme";
import type { ApiResponse, IUser } from "../types/models";

type SettingsScreenMode =
  | "main"
  | "edit-profile"
  | "change-password"
  | "notifications"
  | "language"
  | "help";

type BooleanKey = "isPrivate" | "isActive" | "pushNotifications";
type Language = "vi" | "en";

type NotificationKey = "likes" | "comments" | "follows" | "messages";

const LANGUAGE_OPTIONS: Array<{ id: Language; label: string; nativeLabel: string }> = [
  { id: "vi", label: "Vietnamese", nativeLabel: "Tiếng Việt" },
  { id: "en", label: "English", nativeLabel: "English" },
];

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
  const { language, setLanguage: setAppLanguage, t } = useLanguage();
  const colors = palette;
  const [mode, setMode] = useState<SettingsScreenMode>("main");
  const [profile, setProfile] = useState<IUser | null>(user);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
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
  const [changeAccount, setChangeAccount] = useState(user?.email || user?.phone_number || "");
  const [changeOtp, setChangeOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changeStep, setChangeStep] = useState<1 | 2>(1);
  const [changingPassword, setChangingPassword] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const res = await api.get<ApiResponse<IUser>>(ENDPOINTS.MY_PROFILE);
      const data = res.data.data;
      setProfile(data);
      setDisplayName(data.display_name || "");
      setUsername(data.username || "");
      setBio(data.bio || "");
      setLocation(data.location || "");
      setWebsite(data.website || "");
      setEmail(data.email || "");
      setPhone(data.phone_number || "");
      setAvatarUri(data.avatar_url || "");
      setIsPrivate(data.settings?.privacy === "private");
      void setAppLanguage(data.settings?.language === "en" ? "en" : "vi");
      setChangeAccount(data.email || data.phone_number || "");
    } catch (e) {
      console.error("[SettingsScreen] Load profile error:", e);
    }
  }, [setAppLanguage]);

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
      Alert.alert(t("Hồ sơ", "Profile"), t("Tên hiển thị không được để trống.", "Display name cannot be empty."));
      return;
    }

    try {
      setSaving(true);
      const formData = new FormData() as any;
      formData.append("display_name", displayName.trim());
      formData.append("username", username.trim());
      formData.append("bio", bio.trim());
      formData.append("email", email.trim());
      formData.append("phone_number", phone.trim());
      formData.append("location", location.trim());
      formData.append("website", website.trim());
      formData.append("privacy", isPrivate ? "private" : "public");
      formData.append("language", language);

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
      Alert.alert(t("Hồ sơ", "Profile"), t("Đã lưu thay đổi.", "Changes saved."));
    } catch (e: any) {
      console.error("[SettingsScreen] Save profile error:", e);
      Alert.alert(
        t("Hồ sơ", "Profile"),
        e.response?.data?.message || t("Không thể cập nhật hồ sơ.", "Could not update profile."),
      );
    } finally {
      setSaving(false);
    }
  }, [
    avatarUri,
    bio,
    displayName,
    email,
    isPrivate,
    language,
    location,
    phone,
    userData,
    username,
    website,
    t,
  ]);

  const handleLogout = useCallback(() => {
    Alert.alert(t("Đăng xuất", "Log out"), t("Bạn có chắc chắn muốn đăng xuất?", "Are you sure you want to log out?"), [
      { text: t("Hủy", "Cancel"), style: "cancel" },
      { text: t("Đăng xuất", "Log out"), style: "destructive", onPress: logout },
    ]);
  }, [logout, t]);

  const isPhoneNumber = (input: string) => /^[0-9]{9,11}$/.test(input.trim());

  const sendPasswordOtp = useCallback(async () => {
    if (!changeAccount.trim()) {
      Alert.alert(t("Đổi mật khẩu", "Change password"), t("Nhập email hoặc số điện thoại.", "Enter an email or phone number."));
      return;
    }
    try {
      setChangingPassword(true);
      if (isPhoneNumber(changeAccount)) {
        await api.post(ENDPOINTS.SEND_PHONE_OTP, {
          phone_number: changeAccount.trim(),
        });
      } else {
        await api.post(ENDPOINTS.SEND_EMAIL_OTP, {
          email: changeAccount.trim(),
        });
      }
      setChangeStep(2);
      Alert.alert(t("Đổi mật khẩu", "Change password"), t("Mã OTP đã được gửi.", "OTP has been sent."));
    } catch (e: any) {
      Alert.alert(
        t("Đổi mật khẩu", "Change password"),
        e.response?.data?.message || t("Không thể gửi mã OTP.", "Could not send OTP."),
      );
    } finally {
      setChangingPassword(false);
    }
  }, [changeAccount, t]);

  const resetPassword = useCallback(async () => {
    if (!changeOtp.trim() || !newPassword.trim()) {
      Alert.alert(t("Đổi mật khẩu", "Change password"), t("Nhập OTP và mật khẩu mới.", "Enter OTP and a new password."));
      return;
    }
    try {
      setChangingPassword(true);
      const isPhone = isPhoneNumber(changeAccount);
      await api.post(ENDPOINTS.RESET_PASSWORD, {
        phone_number: isPhone ? changeAccount.trim() : undefined,
        email: isPhone ? undefined : changeAccount.trim(),
        otp: changeOtp.trim(),
        newPassword,
      });
      setChangeOtp("");
      setNewPassword("");
      setChangeStep(1);
      setMode("main");
      Alert.alert(t("Đổi mật khẩu", "Change password"), t("Đã đổi mật khẩu thành công.", "Password changed successfully."));
    } catch (e: any) {
      Alert.alert(
        t("Đổi mật khẩu", "Change password"),
        e.response?.data?.message || t("OTP không hợp lệ hoặc đã hết hạn.", "OTP is invalid or has expired."),
      );
    } finally {
      setChangingPassword(false);
    }
  }, [changeAccount, changeOtp, newPassword, t]);

  const handleLanguageChange = useCallback(async (nextLanguage: Language) => {
    await setAppLanguage(nextLanguage);
    try {
      const formData = new FormData() as any;
      formData.append("language", nextLanguage);
      await api.put(ENDPOINTS.UPDATE_PROFILE, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      Alert.alert(
        nextLanguage === "vi" ? "Ngôn ngữ" : "Language",
        nextLanguage === "vi" ? "Đã chuyển sang Tiếng Việt." : "Language switched to English.",
      );
    } catch (e: any) {
      Alert.alert(
        nextLanguage === "vi" ? "Ngôn ngữ" : "Language",
        e.response?.data?.message ||
          (nextLanguage === "vi" ? "Không thể lưu ngôn ngữ." : "Could not save language."),
      );
    }
  }, [setAppLanguage]);

  const selectedLanguage =
    LANGUAGE_OPTIONS.find((option) => option.id === language) ||
    LANGUAGE_OPTIONS[0];

  const mainSections = useMemo(
    () => [
      {
        title: t("Tài khoản", "Account"),
        rows: [
          {
            icon: User,
            iconColor: palette.primary,
            iconBg: "#f3e8ff",
            title: t("Chỉnh sửa hồ sơ", "Edit profile"),
            subtitle: t("Tên, bio, ảnh đại diện và thông tin cá nhân", "Name, bio, avatar and personal information"),
            onPress: () => setMode("edit-profile"),
          },
          {
            icon: Lock,
            iconColor: "#f59e0b",
            iconBg: "#fef3c7",
            title: t("Đổi mật khẩu", "Change password"),
            subtitle: t("Cập nhật mật khẩu của bạn", "Update your password"),
            onPress: () => setMode("change-password"),
          },
        ],
      },
      {
        title: t("Quyền riêng tư & Bảo mật", "Privacy & Security"),
        rows: [
          {
            icon: Shield,
            iconColor: "#16a34a",
            iconBg: "#dcfce7",
            title: t("Tài khoản riêng tư", "Private account"),
            subtitle: t("Chỉ người được chấp thuận mới xem bài viết", "Only approved followers can view posts"),
            value: isPrivate,
            onPress: () => toggleBoolean("isPrivate"),
          },
          {
            icon: Eye,
            iconColor: "#0891b2",
            iconBg: "#cffafe",
            title: t("Trạng thái hoạt động", "Activity status"),
            subtitle: t("Cho phép người khác thấy khi bạn online", "Allow others to see when you are online"),
            value: isActive,
            onPress: () => toggleBoolean("isActive"),
          },
        ],
      },
      {
        title: t("Thông báo", "Notifications"),
        rows: [
          {
            icon: Bell,
            iconColor: "#f59e0b",
            iconBg: "#fef3c7",
            title: t("Thông báo đẩy", "Push notifications"),
            subtitle: t("Bật/tắt thông báo", "Turn notifications on or off"),
            value: pushNotifications,
            onPress: () => toggleBoolean("pushNotifications"),
          },
          {
            icon: Bell,
            iconColor: "#4f46e5",
            iconBg: "#e0e7ff",
            title: t("Tùy chỉnh thông báo", "Notification preferences"),
            subtitle: t("Chọn loại thông báo muốn nhận", "Choose which notifications to receive"),
            onPress: () => setMode("notifications"),
          },
        ],
      },
      {
        title: t("Giao diện", "Appearance"),
        rows: [
          {
            icon: Globe,
            iconColor: "#0d9488",
            iconBg: "#ccfbf1",
            title: t("Ngôn ngữ", "Language"),
            subtitle: selectedLanguage.nativeLabel,
            onPress: () => setMode("language"),
          },
        ],
      },
      {
        title: t("Hỗ trợ", "Support"),
        rows: [
          {
            icon: HelpCircle,
            iconColor: "#0284c7",
            iconBg: "#e0f2fe",
            title: t("Trợ giúp & Hỗ trợ", "Help & Support"),
            subtitle: t("FAQ, liên hệ và điều khoản", "FAQ, contact and terms"),
            onPress: () => setMode("help"),
          },
          {
            icon: LogOut,
            iconColor: palette.danger,
            iconBg: "#fee2e2",
            title: t("Đăng xuất", "Log out"),
            subtitle: t("Thoát khỏi tài khoản hiện tại", "Leave the current account"),
            danger: true,
            onPress: handleLogout,
          },
        ],
      },
    ],
    [
      handleLogout,
      isActive,
      isPrivate,
      pushNotifications,
      selectedLanguage.nativeLabel,
      t,
      toggleBoolean,
    ],
  );

  const renderMain = () => (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Text style={styles.pageTitle}>{t("Cài đặt", "Settings")}</Text>
      <Text style={[styles.pageSubtitle, { color: colors.muted }]}>
        {t("Quản lý tài khoản và tùy chọn của bạn", "Manage your account and preferences")}
      </Text>

      <View
        style={[
          styles.profileSummary,
          { backgroundColor: colors.card, borderColor: colors.line },
        ]}
      >
        <Image source={{ uri: avatarUrl }} style={styles.profileAvatar} />
        <View style={styles.profileText}>
          <Text style={[styles.profileName, { color: colors.ink }]}>
            {userData?.display_name || userData?.username}
          </Text>
          <Text style={[styles.profileHandle, { color: colors.muted }]}>
            @{userData?.username}
          </Text>
          {userData?.email ? (
            <Text style={[styles.profileEmail, { color: colors.muted }]}>
              {userData.email}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={() => setMode("edit-profile")}
          style={styles.editLink}
        >
          <Text style={styles.editLinkText}>{t("Chỉnh sửa", "Edit")}</Text>
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
      <SettingsHeader title={t("Chỉnh sửa hồ sơ", "Edit profile")} onBack={() => setMode("main")} />

      <View
        style={[
          styles.avatarCard,
          { backgroundColor: colors.card, borderColor: colors.line },
        ]}
      >
        <Pressable onPress={pickAvatar} style={styles.avatarEditor}>
          <View>
            <Image source={{ uri: avatarUrl }} style={styles.largeAvatar} />
            <View style={styles.cameraOverlay}>
              <Camera color="#fff" size={22} />
            </View>
          </View>
          <Text style={styles.changeAvatarText}>{t("Thay đổi ảnh đại diện", "Change avatar")}</Text>
        </Pressable>
      </View>

      <View
        style={[
          styles.formCard,
          { backgroundColor: colors.card, borderColor: colors.line },
        ]}
      >
        <Field
          label={t("Họ và tên", "Full name")}
          value={displayName}
          onChangeText={setDisplayName}
        />
        <Text style={[styles.inputLabel, { color: colors.ink }]}>
          {t("Tên người dùng", "Username")}
        </Text>
        <View
          style={[
            styles.usernameInput,
            { backgroundColor: colors.inputBg, borderColor: colors.line },
          ]}
        >
          <Text style={[styles.atSign, { color: colors.muted }]}>@</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            style={[styles.usernameTextInput, { color: colors.ink }]}
            autoCapitalize="none"
          />
        </View>
        <Field label={t("Bio", "Bio")} value={bio} onChangeText={setBio} multiline />
        <Field label={t("Địa điểm", "Location")} value={location} onChangeText={setLocation} />
        <Field label="Website" value={website} onChangeText={setWebsite} />
      </View>

      <View
        style={[
          styles.formCard,
          { backgroundColor: colors.card, borderColor: colors.line },
        ]}
      >
        <Text style={[styles.cardTitle, { color: colors.ink }]}>
          {t("Thông tin liên hệ", "Contact information")}
        </Text>
        <Field label="Email" value={email} onChangeText={setEmail} />
        <Field
          label={t("Số điện thoại", "Phone number")}
          value={phone}
          onChangeText={setPhone}
          placeholder={t("Số điện thoại", "Phone number")}
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
            {saving ? t("Đang lưu", "Saving") : t("Lưu thay đổi", "Save changes")}
          </Text>
        </LinearGradient>
      </Pressable>
    </ScrollView>
  );

  const renderChangePassword = () => (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <SettingsHeader title={t("Đổi mật khẩu", "Change password")} onBack={() => setMode("main")} />

      <View
        style={[
          styles.formCard,
          { backgroundColor: colors.card, borderColor: colors.line },
        ]}
      >
        <Field
          label={t("Email hoặc số điện thoại", "Email or phone number")}
          value={changeAccount}
          onChangeText={setChangeAccount}
          placeholder={t("email@gmail.com hoặc 0987654321", "email@gmail.com or 0987654321")}
        />
        {changeStep === 2 ? (
          <>
            <Field
              label={t("Mã OTP", "OTP code")}
              value={changeOtp}
              onChangeText={setChangeOtp}
              placeholder={t("Nhập mã OTP", "Enter OTP code")}
            />
            <Field
              label={t("Mật khẩu mới", "New password")}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder={t("Nhập mật khẩu mới", "Enter new password")}
            />
          </>
        ) : null}
      </View>

      <Pressable
        onPress={changeStep === 1 ? sendPasswordOtp : resetPassword}
        disabled={changingPassword}
        style={styles.saveWrapper}
      >
        <LinearGradient
          colors={[palette.primary, palette.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.saveGradient, changingPassword ? styles.disabled : null]}
        >
          <Lock color="#fff" size={16} style={styles.saveIcon} />
          <Text style={styles.saveText}>
            {changingPassword
              ? t("Đang xử lý", "Processing")
              : changeStep === 1
                ? t("Gửi mã OTP", "Send OTP")
                : t("Đổi mật khẩu", "Change password")}
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
        title: t("Lượt thích", "Likes"),
        subtitle: t("Khi ai đó thích bài viết của bạn", "When someone likes your post"),
      },
      {
        key: "comments" as const,
        icon: MessageSquare,
        iconColor: "#0ea5e9",
        iconBg: "#e0f2fe",
        title: t("Bình luận", "Comments"),
        subtitle: t("Khi ai đó bình luận bài viết của bạn", "When someone comments on your post"),
      },
      {
        key: "follows" as const,
        icon: Users,
        iconColor: "#22c55e",
        iconBg: "#dcfce7",
        title: t("Theo dõi mới", "New follows"),
        subtitle: t("Khi có người theo dõi bạn", "When someone follows you"),
      },
      {
        key: "messages" as const,
        icon: Mail,
        iconColor: "#f97316",
        iconBg: "#ffedd5",
        title: t("Tin nhắn", "Messages"),
        subtitle: t("Khi bạn nhận được tin nhắn mới", "When you receive a new message"),
      },
    ];

    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <SettingsHeader
          title={t("Cài đặt thông báo", "Notification settings")}
          onBack={() => setMode("main")}
        />
        <Section title={t("Thông báo đẩy", "Push notifications")}>
          <SettingRow
            icon={Bell}
            iconColor={palette.primary}
            iconBg="#f3e8ff"
            title={t("Bật thông báo đẩy", "Enable push notifications")}
            subtitle={t("Nhận thông báo ngay cả khi không mở app", "Receive notifications even when the app is closed")}
            value={pushNotifications}
            onPress={() => toggleBoolean("pushNotifications")}
          />
        </Section>

        <Section title={t("Loại thông báo", "Notification types")}>
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

  const renderLanguage = () => (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <SettingsHeader title={t("Ngôn ngữ", "Language")} onBack={() => setMode("main")} />

      <Section title={t("Ngôn ngữ khả dụng", "Available languages")}>
        {LANGUAGE_OPTIONS.map((option) => {
          const isActive = language === option.id;
          return (
            <Pressable
              key={option.id}
              onPress={() => void handleLanguageChange(option.id)}
              style={[
                styles.row,
                { borderBottomColor: colors.line },
                isActive ? styles.activeRow : null,
              ]}
            >
              <View style={[styles.iconBox, { backgroundColor: "#ccfbf1" }]}>
                <Globe color="#0d9488" size={20} />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowTitle, { color: colors.ink }]}>
                  {option.nativeLabel}
                </Text>
                <Text style={[styles.rowSubtitle, { color: colors.muted }]}>
                  {option.label}
                </Text>
              </View>
              {isActive ? <Check color={palette.primary} size={20} /> : null}
            </Pressable>
          );
        })}
      </Section>

      <Text
        style={[
          styles.languageNote,
          {
            backgroundColor: colors.card,
            borderColor: colors.line,
            color: colors.muted,
          },
        ]}
      >
        {t(
          "Lựa chọn ngôn ngữ được lưu vào tài khoản. Các màn đã tích hợp đa ngôn ngữ sẽ áp dụng lựa chọn này.",
          "Your language choice is saved to your account. Screens integrated with multilingual text will apply this choice.",
        )}
      </Text>
    </ScrollView>
  );

  const renderHelp = () => {
    const faqs = [
      {
        question: t("Làm thế nào để thay đổi ảnh đại diện?", "How do I change my avatar?"),
        answer: t("Vào Chỉnh sửa hồ sơ, chạm Thay đổi ảnh đại diện rồi lưu.", "Open Edit profile, tap Change avatar, then save."),
      },
      {
        question: t("Tôi có thể xóa bài viết của mình không?", "Can I delete my own post?"),
        answer: t("Chạm nút ba chấm trên bài viết của bạn và chọn Xóa bài viết.", "Tap the three-dot menu on your post and choose Delete post."),
      },
      {
        question: t("Tài khoản riêng tư hoạt động như thế nào?", "How does a private account work?"),
        answer: t("Yêu cầu theo dõi mới sẽ chờ bạn chấp nhận trước khi xem nội dung.", "New follow requests wait for your approval before seeing your content."),
      },
      {
        question: t("Làm thế nào để báo cáo một tài khoản?", "How do I report an account?"),
        answer: t("Mở menu tùy chọn ở hồ sơ hoặc bài viết và chọn Báo cáo.", "Open the options menu on a profile or post and choose Report."),
      },
    ];
    const supportRows = [
      {
        icon: Mail,
        iconColor: "#0ea5e9",
        iconBg: "#e0f2fe",
        title: t("Gửi email hỗ trợ", "Send support email"),
        subtitle: "support@socialmini.com",
        onPress: () => Linking.openURL("mailto:support@socialmini.com"),
      },
      {
        icon: FileText,
        iconColor: palette.primary,
        iconBg: "#f3e8ff",
        title: t("Điều khoản dịch vụ", "Terms of service"),
        subtitle: t("Quy định sử dụng Social Mini", "Social Mini usage rules"),
        onPress: () =>
          Alert.alert(
            t("Điều khoản dịch vụ", "Terms of service"),
            t("Sử dụng lịch sự, không spam và không đăng nội dung vi phạm pháp luật.", "Be respectful, do not spam, and do not post illegal content."),
          ),
      },
      {
        icon: Shield,
        iconColor: "#64748b",
        iconBg: "#f1f5f9",
        title: t("Chính sách bảo mật", "Privacy policy"),
        subtitle: t("Cách Social Mini bảo vệ dữ liệu", "How Social Mini protects data"),
        onPress: () =>
          Alert.alert(
            t("Chính sách bảo mật", "Privacy policy"),
            t("Thông tin tài khoản chỉ dùng cho đăng nhập, hồ sơ và các tính năng mạng xã hội.", "Account information is used only for login, profile, and social features."),
          ),
      },
    ];

    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <SettingsHeader
          title={t("Trợ giúp & Hỗ trợ", "Help & Support")}
          onBack={() => setMode("main")}
        />

        <Section title={t("Câu hỏi thường gặp", "Frequently asked questions")}>
          {faqs.map((item) => (
            <Pressable
              key={item.question}
              onPress={() => Alert.alert(item.question, item.answer)}
              style={[styles.faqRow, { borderBottomColor: colors.line }]}
            >
              <Text style={[styles.faqText, { color: colors.ink }]}>
                {item.question}
              </Text>
              <ChevronDown color={colors.muted} size={18} />
            </Pressable>
          ))}
        </Section>

        <Section title={t("Liên hệ hỗ trợ", "Contact support")}>
          {supportRows.map((row) => (
            <SettingRow
              key={row.title}
              icon={row.icon}
              iconColor={row.iconColor}
              iconBg={row.iconBg}
              title={row.title}
              subtitle={row.subtitle}
              onPress={row.onPress}
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
      {mode === "change-password" ? renderChangePassword() : null}
      {mode === "notifications" ? renderNotifications() : null}
      {mode === "language" ? renderLanguage() : null}
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
  const colors = palette;

  return (
    <View style={styles.field}>
      <Text style={[styles.inputLabel, { color: colors.ink }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        multiline={multiline}
        style={[
          styles.textField,
          {
            backgroundColor: colors.inputBg,
            borderColor: colors.line,
            color: colors.ink,
          },
          multiline ? styles.multilineField : null,
        ]}
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
  activeRow: { backgroundColor: "rgba(147, 51, 234, 0.08)" },
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
  languageNote: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 20,
    backgroundColor: palette.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: palette.line,
  },
});

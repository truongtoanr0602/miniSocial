import { useCallback, useEffect, useState } from "react";
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
  MonitorCog,
  Save,
  Shield,
  User,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import apiClient from "../../services/api";
import { authService } from "../../services/authService";
import type { IMyProfile } from "../../types/models";

interface SettingsViewProps {
  onViewChange: (
    view:
      | "feed"
      | "profile"
      | "notifications"
      | "messages"
      | "search"
      | "settings",
  ) => void;
}

interface Settings {
  notifications: boolean;
  privateAccount: boolean;
  onlineStatus: boolean;
  language: Language;
}

interface NotificationPrefs {
  likes: boolean;
  comments: boolean;
  follows: boolean;
  messages: boolean;
}

interface SettingRow {
  id: string;
  icon: React.ReactNode;
  iconClass: string;
  title: string;
  description?: string;
  type?: "toggle" | "navigate" | "button";
  value?: boolean;
  danger?: boolean;
}

type SettingsScreen =
  | "main"
  | "edit-profile"
  | "notifications"
  | "appearance"
  | "language"
  | "help";
type Language = "vi" | "en";
type SettingsToggleKey = Exclude<keyof Settings, "language">;

const SETTINGS_KEY = "v1:settings";
const NOTIFICATION_PREFS_KEY = "v1:notification-prefs";

const LANGUAGE_OPTIONS: Array<{ id: Language; label: string; nativeLabel: string }> = [
  { id: "vi", label: "Vietnamese", nativeLabel: "Tiếng Việt" },
  { id: "en", label: "English", nativeLabel: "English" },
];

function loadSettings(): Settings {
  const defaults: Settings = {
    notifications: true,
    privateAccount: false,
    onlineStatus: true,
    language: "vi",
  };
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) return { ...defaults, ...JSON.parse(stored) };
  } catch {
    // Use defaults when local storage data is invalid.
  }
  return defaults;
}

function loadNotificationPrefs(): NotificationPrefs {
  try {
    const stored = localStorage.getItem(NOTIFICATION_PREFS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // Use defaults when local storage data is invalid.
  }
  return {
    likes: true,
    comments: true,
    follows: true,
    messages: true,
  };
}

function SettingsToggle({
  checked,
  label,
}: {
  checked?: boolean;
  label: string;
}) {
  return (
    <span
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        checked ? "bg-purple-600" : "bg-gray-300"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </span>
  );
}

function SubHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="mb-7 flex items-center gap-3">
      <button
        type="button"
        onClick={onBack}
        className="rounded-full p-2 text-gray-600 hover:bg-white"
        aria-label="Quay lại"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <h2 className="text-xl font-bold text-gray-900">{title}</h2>
    </div>
  );
}

export function SettingsView({
  onViewChange: _onViewChange,
}: SettingsViewProps) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [screen, setScreen] = useState<SettingsScreen>("main");
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>(
    loadNotificationPrefs,
  );
  const [profile, setProfile] = useState<IMyProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const [bioInput, setBioInput] = useState("");
  const [locationInput, setLocationInput] = useState("Hà Nội, Việt Nam");
  const [websiteInput, setWebsiteInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const text = useCallback(
    (vi: string, en: string) => (settings.language === "en" ? en : vi),
    [settings.language],
  );

  useEffect(() => {
    async function fetchProfile() {
      if (!localStorage.getItem("userToken")) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await apiClient.get("/users/me");
        const data = response.data.data;
        setProfile(data);
        setDisplayNameInput(data.display_name || "");
        setUsernameInput(data.username || "");
        setBioInput(data.bio || "");
        setLocationInput(data.location || "");
        setWebsiteInput(data.website || "");
        setEmailInput(data.email || "");
        setPhoneInput(data.phone_number || "");
        setAvatarPreview(data.avatar_url || "");
        setSettings((prev) => {
          const updated = {
            ...prev,
            privateAccount: data.settings?.privacy === "private",
            language:
              data.settings?.language === "en" || data.settings?.language === "vi"
                ? data.settings.language
                : prev.language,
          };
          localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
          return updated;
        });
      } catch (err) {
        console.error("Load profile error:", err);
      } finally {
        setIsLoading(false);
      }
    }

    void fetchProfile();
  }, []);

  useEffect(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.lang = settings.language;
    if (i18n.language !== settings.language) {
      void i18n.changeLanguage(settings.language);
    }
  }, [i18n, settings.language]);

  const handleToggle = useCallback((key: SettingsToggleKey) => {
    setSettings((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      if (key === "privateAccount") {
        const formData = new FormData();
        formData.append("privacy", updated.privateAccount ? "private" : "public");
        void apiClient.put("/users/update", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      return updated;
    });
  }, []);

  const handleLanguageChange = useCallback(
    async (language: Language) => {
      setSettings((prev) => {
        const updated = { ...prev, language };
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
        return updated;
      });
      document.documentElement.lang = language;
      await i18n.changeLanguage(language);

      try {
        const formData = new FormData();
        formData.append("language", language);
        await apiClient.put("/users/update", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success(t("settings.language.saved"));
      } catch (err: any) {
        toast.error(err.response?.data?.message || t("settings.language.saveFailed"));
      }
    },
    [i18n, t],
  );

  const handleNotificationToggle = useCallback(
    (key: keyof NotificationPrefs) => {
      setNotificationPrefs((prev) => {
        const updated = { ...prev, [key]: !prev[key] };
        localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(updated));
        return updated;
      });
    },
    [],
  );

  const handleAvatarChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    },
    [],
  );

  const handleSaveProfile = useCallback(async () => {
    if (!displayNameInput.trim()) {
      toast.error(text("Tên hiển thị không được để trống.", "Display name cannot be empty."));
      return;
    }

    try {
      setIsSavingProfile(true);
      const formData = new FormData();
      formData.append("display_name", displayNameInput.trim());
      formData.append("username", usernameInput.trim());
      formData.append("bio", bioInput.trim());
      formData.append("email", emailInput.trim());
      formData.append("phone_number", phoneInput.trim());
      formData.append("location", locationInput.trim());
      formData.append("website", websiteInput.trim());
      formData.append("privacy", settings.privateAccount ? "private" : "public");
      formData.append("language", settings.language);
      if (avatarFile) formData.append("avatar", avatarFile);

      const response = await apiClient.put("/users/update", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const updatedProfile = response.data.data;
      setProfile((prev) =>
        prev ? { ...prev, ...updatedProfile } : updatedProfile,
      );
      setAvatarFile(null);
      setAvatarPreview(updatedProfile.avatar_url || "");

      const currentUserRaw = localStorage.getItem("userData");
      if (currentUserRaw) {
        const currentUser = JSON.parse(currentUserRaw);
        localStorage.setItem(
          "userData",
          JSON.stringify({
            ...currentUser,
            display_name: updatedProfile.display_name,
            username: updatedProfile.username,
            avatar_url: updatedProfile.avatar_url,
            email: updatedProfile.email,
            phone_number: updatedProfile.phone_number,
          }),
        );
      }

      toast.success(text("Đã lưu thay đổi.", "Changes saved."));
      setScreen("main");
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          text("Không thể cập nhật hồ sơ.", "Could not update profile."),
      );
    } finally {
      setIsSavingProfile(false);
    }
  }, [
    avatarFile,
    bioInput,
    displayNameInput,
    emailInput,
    locationInput,
    phoneInput,
    settings.language,
    settings.privateAccount,
    text,
    usernameInput,
    websiteInput,
  ]);

  const handleLogout = useCallback(() => {
    authService.logout();
    navigate("/login");
  }, [navigate]);

  const handleNavigate = useCallback(
    (id: string) => {
      switch (id) {
        case "edit-profile":
          setScreen("edit-profile");
          break;
        case "change-password":
          navigate("/forgot-password");
          break;
        case "notification-settings":
          setScreen("notifications");
          break;
        case "help":
          setScreen("help");
          break;
        case "language":
          setScreen("language");
          break;
        default:
          break;
      }
    },
    [navigate],
  );

  const displayName = profile?.display_name || text("Đang tải...", "Loading...");
  const username = profile?.username || "";
  const email = profile?.email || "";
  const avatarUrl =
    avatarPreview ||
    profile?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=7c3aed&color=fff`;
  const selectedLanguage =
    LANGUAGE_OPTIONS.find((option) => option.id === settings.language) ||
    LANGUAGE_OPTIONS[0];

  const keyMap: Record<string, SettingsToggleKey> = {
    "private-account": "privateAccount",
    "online-status": "onlineStatus",
    "push-notifications": "notifications",
  };

  const sections: Array<{ title: string; rows: SettingRow[] }> = [
    {
      title: t("settings.sections.account"),
      rows: [
        {
          id: "edit-profile",
          icon: <User className="h-5 w-5" />,
          iconClass: "bg-purple-100 text-purple-600",
          title: t("settings.rows.editProfile.title"),
          description: t("settings.rows.editProfile.description"),
          type: "navigate",
        },
        {
          id: "change-password",
          icon: <Lock className="h-5 w-5" />,
          iconClass: "bg-amber-100 text-amber-600",
          title: t("settings.rows.changePassword.title"),
          description: t("settings.rows.changePassword.description"),
          type: "navigate",
        },
      ],
    },
    {
      title: t("settings.sections.privacy"),
      rows: [
        {
          id: "private-account",
          icon: <Shield className="h-5 w-5" />,
          iconClass: "bg-emerald-100 text-emerald-600",
          title: t("settings.rows.privateAccount.title"),
          description: t("settings.rows.privateAccount.description"),
          type: "toggle",
          value: settings.privateAccount,
        },
        {
          id: "online-status",
          icon: <Eye className="h-5 w-5" />,
          iconClass: "bg-cyan-100 text-cyan-600",
          title: t("settings.rows.onlineStatus.title"),
          description: t("settings.rows.onlineStatus.description"),
          type: "toggle",
          value: settings.onlineStatus,
        },
      ],
    },
    {
      title: t("settings.sections.notifications"),
      rows: [
        {
          id: "push-notifications",
          icon: <Bell className="h-5 w-5" />,
          iconClass: "bg-orange-100 text-orange-600",
          title: t("settings.rows.pushNotifications.title"),
          description: t("settings.rows.pushNotifications.description"),
          type: "toggle",
          value: settings.notifications,
        },
        {
          id: "notification-settings",
          icon: <MonitorCog className="h-5 w-5" />,
          iconClass: "bg-indigo-100 text-indigo-600",
          title: t("settings.rows.notificationSettings.title"),
          description: t("settings.rows.notificationSettings.description"),
          type: "navigate",
        },
      ],
    },
    {
      title: t("settings.sections.appearance"),
      rows: [
        {
          id: "language",
          icon: <Globe className="h-5 w-5" />,
          iconClass: "bg-teal-100 text-teal-600",
          title: t("settings.rows.language.title"),
          description: selectedLanguage.nativeLabel,
          type: "navigate",
        },
      ],
    },
    {
      title: t("settings.sections.support"),
      rows: [
        {
          id: "help",
          icon: <HelpCircle className="h-5 w-5" />,
          iconClass: "bg-sky-100 text-sky-600",
          title: t("settings.rows.help.title"),
          description: t("settings.rows.help.description"),
          type: "navigate",
        },
        {
          id: "logout",
          icon: <LogOut className="h-5 w-5" />,
          iconClass: "bg-red-100 text-red-600",
          title: t("settings.rows.logout.title"),
          description: t("settings.rows.logout.description"),
          type: "button",
          danger: true,
        },
      ],
    },
  ];

  const renderRow = (row: SettingRow) => (
    <button
      key={row.id}
      type="button"
      onClick={() => {
        if (row.type === "toggle") {
          const key = keyMap[row.id];
          if (key) handleToggle(key);
          return;
        }
        if (row.id === "logout") {
          handleLogout();
          return;
        }
        handleNavigate(row.id);
      }}
      className="flex w-full items-center gap-3 border-b border-gray-100 px-4 py-4 text-left transition-colors last:border-b-0 hover:bg-gray-50"
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${row.iconClass}`}
      >
        {row.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block text-sm font-semibold ${row.danger ? "text-red-600" : "text-gray-900"}`}
        >
          {row.title}
        </span>
        {row.description ? (
          <span className="mt-0.5 block truncate text-xs text-gray-500">
            {row.description}
          </span>
        ) : null}
      </span>
      {row.type === "toggle" ? (
        <SettingsToggle checked={row.value} label={row.title} />
      ) : row.id === "logout" ? null : (
        <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" />
      )}
    </button>
  );

  const renderMainScreen = () => (
    <>
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-purple-600">
          {t("settings.title")}
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          {t("settings.subtitle")}
        </p>
      </div>

      <div className="mb-5 rounded-2xl border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="h-28 animate-pulse rounded-2xl bg-gray-100" />
        ) : (
          <div className="flex items-center gap-4 px-5 py-5">
            <img
              src={avatarUrl}
              alt={displayName}
              className="h-16 w-16 shrink-0 rounded-full object-cover"
            />
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-base font-bold text-gray-900">
                {displayName}
              </h3>
              {username ? (
                <p className="text-sm text-gray-500">@{username}</p>
              ) : null}
              {email ? (
                <p className="truncate text-xs text-gray-500">{email}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setScreen("edit-profile")}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-purple-600 hover:bg-purple-50"
            >
              {t("settings.actions.edit")}
            </button>
          </div>
        )}
      </div>

      <div className="space-y-5">
        {sections.map((section) => (
          <section key={section.title}>
            <h3 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-gray-400">
              {section.title}
            </h3>
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              {section.rows.map(renderRow)}
            </div>
          </section>
        ))}
      </div>
    </>
  );

  const renderEditProfileScreen = () => (
    <>
      <SubHeader
        title={text("Chỉnh sửa hồ sơ", "Edit profile")}
        onBack={() => setScreen("main")}
      />

      <div className="mb-5 rounded-2xl border border-gray-200 bg-white px-5 py-7 shadow-sm">
        <label className="group mx-auto block w-fit cursor-pointer text-center">
          <span className="relative block">
            <img
              src={avatarUrl}
              alt={displayName}
              className="h-24 w-24 rounded-full border-4 border-white object-cover shadow-md"
            />
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/35">
              <Camera className="h-6 w-6 text-white" />
            </span>
          </span>
          <span className="mt-3 block text-sm font-semibold text-purple-600">
            {text("Thay đổi ảnh đại diện", "Change avatar")}
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </label>
      </div>

      <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid gap-5">
          <label className="text-sm font-medium text-gray-700">
            {text("Họ và tên", "Full name")}
            <input
              value={displayNameInput}
              onChange={(event) => setDisplayNameInput(event.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
            />
          </label>
          <label className="text-sm font-medium text-gray-700">
            {text("Tên người dùng", "Username")}
            <div className="mt-2 flex items-center rounded-xl border border-gray-300 px-4 py-3 focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-100">
              <span className="mr-2 text-sm text-gray-500">@</span>
              <input
                value={usernameInput}
                onChange={(event) => setUsernameInput(event.target.value)}
                className="min-w-0 flex-1 text-sm text-gray-900 outline-none"
              />
            </div>
          </label>
          <label className="text-sm font-medium text-gray-700">
            Bio
            <textarea
              value={bioInput}
              onChange={(event) => setBioInput(event.target.value)}
              rows={4}
              className="mt-2 w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
            />
          </label>
          <label className="text-sm font-medium text-gray-700">
            {text("Địa điểm", "Location")}
            <input
              value={locationInput}
              onChange={(event) => setLocationInput(event.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
            />
          </label>
          <label className="text-sm font-medium text-gray-700">
            Website
            <input
              value={websiteInput}
              onChange={(event) => setWebsiteInput(event.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
              placeholder="portfolio.example.com"
            />
          </label>
        </div>
      </div>

      <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-5 text-base font-semibold text-gray-900">
          {text("Thông tin liên hệ", "Contact information")}
        </h3>
        <div className="grid gap-5">
          <label className="text-sm font-medium text-gray-700">
            Email
            <input
              value={emailInput}
              onChange={(event) => setEmailInput(event.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
            />
          </label>
          <label className="text-sm font-medium text-gray-700">
            {text("Số điện thoại", "Phone number")}
            <input
              value={phoneInput}
              onChange={(event) => setPhoneInput(event.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
              placeholder={text("Số điện thoại", "Phone number")}
            />
          </label>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSaveProfile}
        disabled={isSavingProfile}
        className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-4 text-sm font-bold text-white shadow-sm transition hover:from-purple-700 hover:to-blue-700 disabled:opacity-60"
      >
        <Save className="h-4 w-4" />
        {isSavingProfile
          ? text("Đang lưu...", "Saving...")
          : text("Lưu thay đổi", "Save changes")}
      </button>
    </>
  );

  const renderNotificationsScreen = () => {
    const rows = [
      {
        id: "likes" as const,
        icon: <Heart className="h-5 w-5" />,
        iconClass: "bg-pink-100 text-pink-600",
        title: text("Lượt thích", "Likes"),
        description: text("Khi ai đó thích bài viết của bạn", "When someone likes your post"),
        value: notificationPrefs.likes,
      },
      {
        id: "comments" as const,
        icon: <MessageSquare className="h-5 w-5" />,
        iconClass: "bg-sky-100 text-sky-600",
        title: text("Bình luận", "Comments"),
        description: text("Khi ai đó bình luận bài viết của bạn", "When someone comments on your post"),
        value: notificationPrefs.comments,
      },
      {
        id: "follows" as const,
        icon: <Users className="h-5 w-5" />,
        iconClass: "bg-emerald-100 text-emerald-600",
        title: text("Theo dõi mới", "New follows"),
        description: text("Khi có người theo dõi bạn", "When someone follows you"),
        value: notificationPrefs.follows,
      },
      {
        id: "messages" as const,
        icon: <Mail className="h-5 w-5" />,
        iconClass: "bg-orange-100 text-orange-600",
        title: text("Tin nhắn", "Messages"),
        description: text("Khi bạn nhận được tin nhắn mới", "When you receive a new message"),
        value: notificationPrefs.messages,
      },
    ];

    return (
      <>
        <SubHeader
          title={text("Cài đặt thông báo", "Notification settings")}
          onBack={() => setScreen("main")}
        />

        <section className="mb-5">
          <h3 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-gray-400">
            {text("Thông báo đẩy", "Push notifications")}
          </h3>
          <button
            type="button"
            onClick={() => handleToggle("notifications")}
            className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4 text-left shadow-sm"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
              <Bell className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-gray-900">
                {text("Bật thông báo đẩy", "Enable push notifications")}
              </span>
              <span className="mt-0.5 block text-xs text-gray-500">
                {text(
                  "Nhận thông báo ngay cả khi không mở app",
                  "Receive notifications even when the app is closed",
                )}
              </span>
            </span>
            <SettingsToggle
              checked={settings.notifications}
              label={text("Bật thông báo đẩy", "Enable push notifications")}
            />
          </button>
        </section>

        <section>
          <h3 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-gray-400">
            {text("Loại thông báo", "Notification types")}
          </h3>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            {rows.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => handleNotificationToggle(row.id)}
                className="flex w-full items-center gap-3 border-b border-gray-100 px-5 py-4 text-left last:border-b-0 hover:bg-gray-50"
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${row.iconClass}`}
                >
                  {row.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-gray-900">
                    {row.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-gray-500">
                    {row.description}
                  </span>
                </span>
                <SettingsToggle checked={row.value} label={row.title} />
              </button>
            ))}
          </div>
        </section>
      </>
    );
  };

  const renderAppearanceScreen = () => (
    <>
      <SubHeader title={t("settings.appearance.title")} onBack={() => setScreen("main")} />

      <section className="mb-5">
        <h3 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-gray-400">
          {t("settings.appearance.display")}
        </h3>
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <button
            type="button"
            onClick={() => setScreen("language")}
            className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-gray-50"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-600">
              <Globe className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-gray-900">
                {t("settings.rows.language.title")}
              </span>
              <span className="mt-0.5 block text-xs text-gray-500">
                {selectedLanguage.nativeLabel}
              </span>
            </span>
          </button>
        </div>
      </section>

    </>
  );

  const renderLanguageScreen = () => (
    <>
      <SubHeader title={t("settings.language.title")} onBack={() => setScreen("main")} />

      <section className="mb-5">
        <h3 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-gray-400">
          {t("settings.language.available")}
        </h3>
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {LANGUAGE_OPTIONS.map((option) => {
            const isActive = settings.language === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => void handleLanguageChange(option.id)}
                className={`flex w-full items-center gap-3 border-b border-gray-100 px-5 py-4 text-left last:border-b-0 hover:bg-gray-50 ${
                  isActive ? "bg-purple-50" : ""
                }`}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-600">
                  <Globe className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-gray-900">
                    {option.nativeLabel}
                  </span>
                  <span className="mt-0.5 block text-xs text-gray-500">
                    {option.label}
                  </span>
                </span>
                {isActive ? <Check className="h-5 w-5 text-purple-600" /> : null}
              </button>
            );
          })}
        </div>
      </section>

      <p className="rounded-2xl bg-white px-5 py-4 text-sm leading-6 text-gray-600 shadow-sm">
        {t("settings.language.note")}
      </p>
    </>
  );

  const renderHelpScreen = () => {
    const faqItems = [
      {
        question: text("Làm thế nào để thay đổi ảnh đại diện?", "How do I change my avatar?"),
        answer: text(
          "Vào Cài đặt > Chỉnh sửa hồ sơ, bấm Thay đổi ảnh đại diện, chọn ảnh và lưu thay đổi.",
          "Open Settings > Edit profile, choose Change avatar, select an image, then save changes.",
        ),
      },
      {
        question: text("Tôi có thể xóa bài viết của mình không?", "Can I delete my own post?"),
        answer: text(
          "Có. Mở menu ba chấm trên bài viết của bạn rồi chọn Xóa bài viết.",
          "Yes. Open the three-dot menu on your post and choose Delete post.",
        ),
      },
      {
        question: text(
          "Tài khoản riêng tư hoạt động như thế nào?",
          "How does a private account work?",
        ),
        answer: text(
          "Khi bật tài khoản riêng tư, yêu cầu theo dõi mới sẽ ở trạng thái chờ cho đến khi bạn chấp nhận.",
          "When private account is enabled, new follow requests stay pending until you approve them.",
        ),
      },
      {
        question: text("Làm thế nào để báo cáo một tài khoản?", "How do I report an account?"),
        answer: text(
          "Mở trang cá nhân của tài khoản đó, chọn menu ba chấm và chọn Báo cáo tài khoản.",
          "Open that account profile, use the three-dot menu, and choose Report account.",
        ),
      },
    ];
    const supportItems = [
      {
        icon: <Mail className="h-5 w-5" />,
        iconClass: "bg-sky-100 text-sky-600",
        title: text("Gửi email hỗ trợ", "Send support email"),
        description: "support@socialmini.com",
        onClick: () => {
          window.location.href = "mailto:support@socialmini.com";
        },
      },
      {
        icon: <FileText className="h-5 w-5" />,
        iconClass: "bg-purple-100 text-purple-600",
        title: text("Điều khoản dịch vụ", "Terms of service"),
        description: text("Quy định sử dụng Social Mini", "Social Mini usage rules"),
        onClick: () =>
          toast.info(
            text(
              "Điều khoản: sử dụng lịch sự, không spam, không đăng nội dung vi phạm pháp luật.",
              "Terms: be respectful, do not spam, and do not post illegal content.",
            ),
          ),
      },
      {
        icon: <Shield className="h-5 w-5" />,
        iconClass: "bg-gray-100 text-gray-600",
        title: text("Chính sách bảo mật", "Privacy policy"),
        description: text("Cách Social Mini bảo vệ dữ liệu", "How Social Mini protects data"),
        onClick: () =>
          toast.info(
            text(
              "Chính sách bảo mật: thông tin tài khoản chỉ dùng cho đăng nhập, hồ sơ và tính năng mạng xã hội.",
              "Privacy policy: account information is used only for login, profile, and social features.",
            ),
          ),
      },
    ];

    return (
      <>
        <SubHeader
          title={text("Trợ giúp & Hỗ trợ", "Help & Support")}
          onBack={() => setScreen("main")}
        />

        <section className="mb-5">
          <h3 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-gray-400">
            {text("Câu hỏi thường gặp", "Frequently asked questions")}
          </h3>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            {faqItems.map((item, index) => (
              <button
                key={item.question}
                type="button"
                onClick={() =>
                  setOpenFaqIndex((current) => (current === index ? null : index))
                }
                className="w-full border-b border-gray-100 px-5 py-4 text-left last:border-b-0 hover:bg-gray-50"
              >
                <span className="flex items-center justify-between gap-3 text-sm font-medium text-gray-900">
                  <span>{item.question}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${
                      openFaqIndex === index ? "rotate-180" : ""
                    }`}
                  />
                </span>
                {openFaqIndex === index ? (
                  <span className="mt-2 block text-sm leading-6 text-gray-600">
                    {item.answer}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-gray-400">
            {text("Liên hệ hỗ trợ", "Contact support")}
          </h3>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            {supportItems.map((item) => (
              <button
                key={item.title}
                type="button"
                onClick={item.onClick}
                className="flex w-full items-center gap-3 border-b border-gray-100 px-5 py-4 text-left last:border-b-0 hover:bg-gray-50"
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.iconClass}`}
                >
                  {item.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-gray-900">
                    {item.title}
                  </span>
                  {item.description ? (
                    <span className="mt-0.5 block text-xs text-gray-500">
                      {item.description}
                    </span>
                  ) : null}
                </span>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </button>
            ))}
          </div>
        </section>
      </>
    );
  };

  return (
    <div className="mx-auto w-full max-w-[680px] px-4 pb-10">
      {screen === "main" ? renderMainScreen() : null}
      {screen === "edit-profile" ? renderEditProfileScreen() : null}
      {screen === "notifications" ? renderNotificationsScreen() : null}
      {screen === "appearance" ? renderAppearanceScreen() : null}
      {screen === "language" ? renderLanguageScreen() : null}
      {screen === "help" ? renderHelpScreen() : null}
    </div>
  );
}

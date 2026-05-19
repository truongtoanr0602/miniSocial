import { useCallback, useEffect, useState } from "react";
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
  MonitorCog,
  Moon,
  Palette,
  Save,
  Shield,
  User,
  Users,
} from "lucide-react";
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
  darkMode: boolean;
  privateAccount: boolean;
  onlineStatus: boolean;
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

type SettingsScreen = "main" | "edit-profile" | "notifications" | "help";

const SETTINGS_KEY = "v1:settings";
const NOTIFICATION_PREFS_KEY = "v1:notification-prefs";

function loadSettings(): Settings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // Use defaults when local storage data is invalid.
  }
  return {
    notifications: true,
    darkMode: false,
    privateAccount: false,
    onlineStatus: true,
  };
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
        setEmailInput(data.email || "");
        setPhoneInput(data.phone_number || "");
        setAvatarPreview(data.avatar_url || "");
      } catch (err) {
        console.error("Load profile error:", err);
      } finally {
        setIsLoading(false);
      }
    }

    void fetchProfile();
  }, []);

  const handleToggle = useCallback((key: keyof Settings) => {
    setSettings((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

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
      toast.error("Tên hiển thị không được để trống.");
      return;
    }

    try {
      setIsSavingProfile(true);
      const formData = new FormData();
      formData.append("display_name", displayNameInput.trim());
      formData.append("bio", bioInput.trim());
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
            avatar_url: updatedProfile.avatar_url,
          }),
        );
      }

      toast.success("Đã lưu thay đổi.");
      setScreen("main");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Không thể cập nhật hồ sơ.");
    } finally {
      setIsSavingProfile(false);
    }
  }, [avatarFile, bioInput, displayNameInput]);

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
          toast.info("Ứng dụng hiện hỗ trợ tiếng việt.");
          break;
        case "theme-color":
          toast.info("Tùy chỉnh màu sắc đang được cập nhật.");
          break;
        default:
          break;
      }
    },
    [navigate],
  );

  const displayName = profile?.display_name || "Đang tải...";
  const username = profile?.username || "";
  const email = profile?.email || "";
  const avatarUrl =
    avatarPreview ||
    profile?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=7c3aed&color=fff`;

  const keyMap: Record<string, keyof Settings> = {
    "private-account": "privateAccount",
    "online-status": "onlineStatus",
    "push-notifications": "notifications",
    "dark-mode": "darkMode",
  };

  const sections: Array<{ title: string; rows: SettingRow[] }> = [
    {
      title: "Tài khoản",
      rows: [
        {
          id: "edit-profile",
          icon: <User className="h-5 w-5" />,
          iconClass: "bg-purple-100 text-purple-600",
          title: "Chỉnh sửa hồ sơ",
          description: "Tên, bio, ảnh đại diện va thông tin cá nhân",
          type: "navigate",
        },
        {
          id: "change-password",
          icon: <Lock className="h-5 w-5" />,
          iconClass: "bg-amber-100 text-amber-600",
          title: "Đổi mật khẩu",
          description: "Cập nhật mật khẩu của bạn",
          type: "navigate",
        },
      ],
    },
    {
      title: "Quyền riêng tư và bảo mật",
      rows: [
        {
          id: "private-account",
          icon: <Shield className="h-5 w-5" />,
          iconClass: "bg-emerald-100 text-emerald-600",
          title: "Tài khoản riêng tư",
          description: "Chỉ người chấp nhận mới xem được bài viết",
          type: "toggle",
          value: settings.privateAccount,
        },
        {
          id: "online-status",
          icon: <Eye className="h-5 w-5" />,
          iconClass: "bg-cyan-100 text-cyan-600",
          title: "Trạng thái hoạt động",
          description: "Cho phép người khác thấy bạn khi online",
          type: "toggle",
          value: settings.onlineStatus,
        },
      ],
    },
    {
      title: "Thông báo",
      rows: [
        {
          id: "push-notifications",
          icon: <Bell className="h-5 w-5" />,
          iconClass: "bg-orange-100 text-orange-600",
          title: "Thông báo đẩy",
          description: "Bật/ tắt thông báo",
          type: "toggle",
          value: settings.notifications,
        },
        {
          id: "notification-settings",
          icon: <MonitorCog className="h-5 w-5" />,
          iconClass: "bg-indigo-100 text-indigo-600",
          title: "Tùy chỉnh thông báo",
          description: "Chọn loại thông báo muốn nhận",
          type: "navigate",
        },
      ],
    },
    {
      title: "Giao diện",
      rows: [
        {
          id: "dark-mode",
          icon: <Moon className="h-5 w-5" />,
          iconClass: "bg-slate-100 text-slate-600",
          title: "Chế độ tối",
          description: "Đang tắt",
          type: "toggle",
          value: settings.darkMode,
        },
        {
          id: "language",
          icon: <Globe className="h-5 w-5" />,
          iconClass: "bg-teal-100 text-teal-600",
          title: "Ngôn ngữ",
          description: "Tiếng Việt",
          type: "navigate",
        },
        {
          id: "theme-color",
          icon: <Palette className="h-5 w-5" />,
          iconClass: "bg-fuchsia-100 text-fuchsia-600",
          title: "Chủ đề màu sắc",
          description: "Tím (Mặc định)",
          type: "navigate",
        },
      ],
    },
    {
      title: "Hỗ trợ",
      rows: [
        {
          id: "help",
          icon: <HelpCircle className="h-5 w-5" />,
          iconClass: "bg-sky-100 text-sky-600",
          title: "Trợ giúp & hỗ trợ",
          description: "FAQ, liên hệ và điều khoản",
          type: "navigate",
        },
        {
          id: "logout",
          icon: <LogOut className="h-5 w-5" />,
          iconClass: "bg-red-100 text-red-600",
          title: "Đăng xuất",
          description: "Thoát khỏi tài khoản hiện tại",
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
        <h2 className="text-2xl font-bold text-purple-600">Cài đặt</h2>
        <p className="mt-1 text-sm text-gray-600">
          Quản lý tài khoản và tùy chọn của bạn
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
              Chỉnh sửa
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
      <SubHeader title="Chỉnh sửa hồ sơ" onBack={() => setScreen("main")} />

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
            Thay đổi ảnh đại diện
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
            Họ và tên
            <input
              value={displayNameInput}
              onChange={(event) => setDisplayNameInput(event.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
            />
          </label>
          <label className="text-sm font-medium text-gray-700">
            Tên người dùng
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
            Địa điểm
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
          Thông tin liên hệ
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
            Số điện thoại
            <input
              value={phoneInput}
              onChange={(event) => setPhoneInput(event.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
              placeholder="Số điện thoại"
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
        {isSavingProfile ? "Đang lưu..." : "Lưu thay đổi"}
      </button>
    </>
  );

  const renderNotificationsScreen = () => {
    const rows = [
      {
        id: "likes" as const,
        icon: <Heart className="h-5 w-5" />,
        iconClass: "bg-pink-100 text-pink-600",
        title: "Lượt thích",
        description: "Khi ai do thich bài viết cua ban",
        value: notificationPrefs.likes,
      },
      {
        id: "comments" as const,
        icon: <MessageSquare className="h-5 w-5" />,
        iconClass: "bg-sky-100 text-sky-600",
        title: "Bình luận",
        description: "Khi ai do bình luận bài viết cua ban",
        value: notificationPrefs.comments,
      },
      {
        id: "follows" as const,
        icon: <Users className="h-5 w-5" />,
        iconClass: "bg-emerald-100 text-emerald-600",
        title: "Theo dõi mới",
        description: "Khi có người theo dõi bạn",
        value: notificationPrefs.follows,
      },
      {
        id: "messages" as const,
        icon: <Mail className="h-5 w-5" />,
        iconClass: "bg-orange-100 text-orange-600",
        title: "Tin nhắn",
        description: "Khi bạn nhận được tin nhắn mới",
        value: notificationPrefs.messages,
      },
    ];

    return (
      <>
        <SubHeader title="Cài đặt thong bao" onBack={() => setScreen("main")} />

        <section className="mb-5">
          <h3 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-gray-400">
            Thông báo day
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
                Bật thông báo đẩy
              </span>
              <span className="mt-0.5 block text-xs text-gray-500">
                Nhan thong bao ngày ca khi khong mo app
              </span>
            </span>
            <SettingsToggle
              checked={settings.notifications}
              label="Bật thông báo đẩy"
            />
          </button>
        </section>

        <section>
          <h3 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-gray-400">
            Loại thông báo
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

  const renderHelpScreen = () => {
    const faqItems = [
      "Làm thế nào để thay đổi ảnh đại diện?",
      "Toi có the xoa bài viết cua minh khong?",
      "Tài khoản rieng tu hoat dong nhu the nao?",
      "Làm thế nào để báo cáo một tài khoản?",
    ];
    const supportItems = [
      {
        icon: <Mail className="h-5 w-5" />,
        iconClass: "bg-sky-100 text-sky-600",
        title: "Gửi email hỗ trợ",
        description: "support@socialmini.com",
      },
      {
        icon: <MessageCircle className="h-5 w-5" />,
        iconClass: "bg-emerald-100 text-emerald-600",
        title: "Chat trực tiếp",
        description: "Hỗ trợ 24/7",
      },
      {
        icon: <FileText className="h-5 w-5" />,
        iconClass: "bg-purple-100 text-purple-600",
        title: "Điều khoản dịch vụ",
      },
      {
        icon: <Shield className="h-5 w-5" />,
        iconClass: "bg-gray-100 text-gray-600",
        title: "Chính sách bảo mật",
      },
    ];

    return (
      <>
        <SubHeader title="Tro giup & Hỗ trợ" onBack={() => setScreen("main")} />

        <section className="mb-5">
          <h3 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-gray-400">
            Câu hỏi thường gặp
          </h3>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            {faqItems.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() =>
                  toast.info("Nội dung hướng dẫn đang được cập nhật.")
                }
                className="flex w-full items-center justify-between border-b border-gray-100 px-5 py-4 text-left text-sm font-medium text-gray-900 last:border-b-0 hover:bg-gray-50"
              >
                <span>{item}</span>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-gray-400">
            Liên hệ hỗ trợ
          </h3>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            {supportItems.map((item) => (
              <button
                key={item.title}
                type="button"
                onClick={() => toast.info("Tính năng này đang được cập nhật.")}
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
      {screen === "help" ? renderHelpScreen() : null}
    </div>
  );
}

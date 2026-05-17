import { useState, useEffect, useCallback } from "react";
import {
  User,
  Lock,
  Bell,
  Shield,
  Eye,
  Globe,
  Moon,
  HelpCircle,
  LogOut,
  ChevronRight,
  Camera,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import apiClient from "../../services/api";
import { authService } from "../../services/authService";
import { toast } from "sonner";
import type { IMyProfile } from "../../types/models";

interface SettingItem {
  id: string;
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: "toggle" | "navigate" | "button";
  value?: boolean;
  danger?: boolean;
}

// Setting keys persisted in localStorage
interface Settings {
  notifications: boolean;
  darkMode: boolean;
  privateAccount: boolean;
  onlineStatus: boolean;
}

type ViewType =
  | "feed"
  | "profile"
  | "notifications"
  | "messages"
  | "search"
  | "settings";

const SETTINGS_KEY = "v1:settings";

function loadSettings(): Settings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // Corrupt data — use defaults
  }
  return {
    notifications: true,
    darkMode: false,
    privateAccount: false,
    onlineStatus: true,
  };
}

interface SettingsViewProps {
  onViewChange: (view: ViewType) => void;
}

export function SettingsView({ onViewChange }: SettingsViewProps) {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [profile, setProfile] = useState<IMyProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user data thật
  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("userToken");
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const response = await apiClient.get("/users/me");
        setProfile(response.data.data);
      } catch (err) {
        console.error("Lỗi tải profile:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // Persist settings vào localStorage khi thay đổi
  const handleToggle = useCallback((key: keyof Settings) => {
    setSettings((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleLogout = useCallback(() => {
    authService.logout();
    navigate("/login");
  }, [navigate]);

  const handleNavigateAction = useCallback(
    (itemId: string) => {
      switch (itemId) {
        case "edit-profile":
          onViewChange("profile");
          break;
        case "change-password":
          navigate("/forgot-password");
          break;
        case "language":
          toast.info("Hiện tại ứng dụng đang hỗ trợ Tiếng Việt.");
          break;
        case "help":
          toast.info("Vui lòng liên hệ support@minisocial.app để được hỗ trợ.");
          break;
        default:
          break;
      }
    },
    [navigate, onViewChange],
  );

  // Explicit map từ item.id (kebab-case) sang settings key (camelCase)
  const keyMap: Record<string, keyof Settings> = {
    "private-account": "privateAccount",
    "online-status": "onlineStatus",
    "push-notifications": "notifications",
    "dark-mode": "darkMode",
  };

  const accountSettings: SettingItem[] = [
    {
      id: "edit-profile",
      icon: <User className="w-5 h-5" />,
      title: "Chỉnh sửa trang cá nhân",
      description: "Thay đổi ảnh đại diện, tên, bio",
      action: "navigate",
    },
    {
      id: "change-password",
      icon: <Lock className="w-5 h-5" />,
      title: "Đổi mật khẩu",
      description: "Cập nhật mật khẩu của bạn",
      action: "navigate",
    },
  ];

  const privacySettings: SettingItem[] = [
    {
      id: "private-account",
      icon: <Shield className="w-5 h-5" />,
      title: "Tài khoản riêng tư",
      description: "Chỉ người theo dõi mới xem được bài viết",
      action: "toggle",
      value: settings.privateAccount,
    },
    {
      id: "online-status",
      icon: <Eye className="w-5 h-5" />,
      title: "Trạng thái hoạt động",
      description: "Hiển thị khi bạn đang online",
      action: "toggle",
      value: settings.onlineStatus,
    },
  ];

  const notificationSettings: SettingItem[] = [
    {
      id: "push-notifications",
      icon: <Bell className="w-5 h-5" />,
      title: "Thông báo đẩy",
      description: "Nhận thông báo về hoạt động",
      action: "toggle",
      value: settings.notifications,
    },
  ];

  const appearanceSettings: SettingItem[] = [
    {
      id: "dark-mode",
      icon: <Moon className="w-5 h-5" />,
      title: "Chế độ tối",
      description: "Sử dụng giao diện tối",
      action: "toggle",
      value: settings.darkMode,
    },
    {
      id: "language",
      icon: <Globe className="w-5 h-5" />,
      title: "Ngôn ngữ",
      description: "Tiếng Việt",
      action: "navigate",
    },
  ];

  const supportSettings: SettingItem[] = [
    {
      id: "help",
      icon: <HelpCircle className="w-5 h-5" />,
      title: "Trợ giúp & hỗ trợ",
      action: "navigate",
    },
    {
      id: "logout",
      icon: <LogOut className="w-5 h-5" />,
      title: "Đăng xuất",
      action: "button",
      danger: true,
    },
  ];

  const renderSettingItem = (item: SettingItem) => {
    return (
      <div
        key={item.id}
        className={`flex items-center justify-between p-4 hover:bg-gray-50 transition-colors ${
          item.action === "navigate" || item.action === "button"
            ? "cursor-pointer"
            : ""
        }`}
        onClick={() => {
          if (item.action === "button" && item.id === "logout") {
            handleLogout();
            return;
          }
          if (item.action === "navigate") {
            handleNavigateAction(item.id);
          }
        }}
      >
        <div className="flex items-center gap-3 flex-1">
          <div
            className={`p-2 rounded-lg ${
              item.danger
                ? "bg-red-100 text-red-600"
                : "bg-gradient-to-br from-purple-100 to-blue-100 text-purple-600"
            }`}
          >
            {item.icon}
          </div>
          <div className="flex-1">
            <h4
              className={`font-medium ${
                item.danger ? "text-red-600" : "text-gray-900"
              }`}
            >
              {item.title}
            </h4>
            {item.description ? (
              <p className="text-sm text-gray-600 mt-0.5">{item.description}</p>
            ) : null}
          </div>
        </div>

        {item.action === "toggle" ? (
          <button
            role="switch"
            aria-checked={item.value}
            aria-label={item.title}
            onClick={(e) => {
              e.stopPropagation();
              const key = keyMap[item.id];
              if (key) {
                handleToggle(key);
              }
            }}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              item.value ? "bg-purple-600" : "bg-gray-300"
            }`}
          >
            <div
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform ${
                item.value ? "translate-x-6" : "translate-x-0.5"
              }`}
            ></div>
          </button>
        ) : null}

        {item.action === "navigate" ? (
          <ChevronRight className="w-5 h-5 text-gray-400" />
        ) : null}
      </div>
    );
  };

  // Profile section data — thật từ API
  const displayName = profile?.display_name || "Đang tải...";
  const username = profile?.username || "";
  const email = profile?.email || "";
  const avatarUrl =
    profile?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=7c3aed&color=fff`;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Cài đặt
          </h2>
        </div>

        {/* Profile Section — dữ liệu thật */}
        <div className="p-6 border-b border-gray-100">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div
                onClick={() => onViewChange("profile")}
                className="relative group cursor-pointer"
              >
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-20 h-20 rounded-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-gray-900">
                  {displayName}
                </h3>
                <p className="text-sm text-gray-600">@{username}</p>
                {email ? (
                  <p className="text-sm text-gray-500 mt-1">{email}</p>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* Settings Sections */}
        <div className="divide-y divide-gray-100">
          {/* Account */}
          <div className="p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Tài khoản</h3>
            <div className="space-y-1 -mx-4">
              {accountSettings.map(renderSettingItem)}
            </div>
          </div>

          {/* Privacy */}
          <div className="p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Quyền riêng tư</h3>
            <div className="space-y-1 -mx-4">
              {privacySettings.map(renderSettingItem)}
            </div>
          </div>

          {/* Notifications */}
          <div className="p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Thông báo</h3>
            <div className="space-y-1 -mx-4">
              {notificationSettings.map(renderSettingItem)}
            </div>
          </div>

          {/* Appearance */}
          <div className="p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Giao diện</h3>
            <div className="space-y-1 -mx-4">
              {appearanceSettings.map(renderSettingItem)}
            </div>
          </div>

          {/* Support */}
          <div className="p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Hỗ trợ</h3>
            <div className="space-y-1 -mx-4">
              {supportSettings.map(renderSettingItem)}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 text-center">
          <p className="text-xs text-gray-500">Social Mini v1.0.0</p>
          <p className="text-xs text-gray-400 mt-1">
            © 2026 Social Mini. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

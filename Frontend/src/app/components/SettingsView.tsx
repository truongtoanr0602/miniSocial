import { useState } from "react";
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
  Camera
} from "lucide-react";

interface SettingItem {
  id: string;
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: "toggle" | "navigate" | "button";
  value?: boolean;
  danger?: boolean;
}

export function SettingsView() {
  // Lazy init: đọc settings đã lưu từ localStorage
  const [settings, setSettings] = useState(() => {
    const defaults = {
      notifications: true,
      darkMode: false,
      privateAccount: false,
      onlineStatus: true,
    };
    try {
      const saved = localStorage.getItem("appSettings");
      return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    } catch {
      return defaults;
    }
  });

  const handleToggle = (key: keyof typeof settings) => {
    setSettings((prev: any) => {
      const updated = { ...prev, [key]: !prev[key] };
      // Persist vào localStorage
      localStorage.setItem("appSettings", JSON.stringify(updated));
      return updated;
    });
  };

  const accountSettings: SettingItem[] = [
    {
      id: "edit-profile",
      icon: <User className="w-5 h-5" />,
      title: "Chỉnh sửa trang cá nhân",
      description: "Thay đổi ảnh đại diện, tên, bio",
      action: "navigate"
    },
    {
      id: "change-password",
      icon: <Lock className="w-5 h-5" />,
      title: "Đổi mật khẩu",
      description: "Cập nhật mật khẩu của bạn",
      action: "navigate"
    }
  ];

  const privacySettings: SettingItem[] = [
    {
      id: "private-account",
      icon: <Shield className="w-5 h-5" />,
      title: "Tài khoản riêng tư",
      description: "Chỉ người theo dõi mới xem được bài viết",
      action: "toggle",
      value: settings.privateAccount
    },
    {
      id: "online-status",
      icon: <Eye className="w-5 h-5" />,
      title: "Trạng thái hoạt động",
      description: "Hiển thị khi bạn đang online",
      action: "toggle",
      value: settings.onlineStatus
    }
  ];

  const notificationSettings: SettingItem[] = [
    {
      id: "push-notifications",
      icon: <Bell className="w-5 h-5" />,
      title: "Thông báo đẩy",
      description: "Nhận thông báo về hoạt động",
      action: "toggle",
      value: settings.notifications
    }
  ];

  const appearanceSettings: SettingItem[] = [
    {
      id: "dark-mode",
      icon: <Moon className="w-5 h-5" />,
      title: "Chế độ tối",
      description: "Sử dụng giao diện tối",
      action: "toggle",
      value: settings.darkMode
    },
    {
      id: "language",
      icon: <Globe className="w-5 h-5" />,
      title: "Ngôn ngữ",
      description: "Tiếng Việt",
      action: "navigate"
    }
  ];

  const supportSettings: SettingItem[] = [
    {
      id: "help",
      icon: <HelpCircle className="w-5 h-5" />,
      title: "Trợ giúp & hỗ trợ",
      action: "navigate"
    },
    {
      id: "logout",
      icon: <LogOut className="w-5 h-5" />,
      title: "Đăng xuất",
      action: "button",
      danger: true
    }
  ];

  const renderSettingItem = (item: SettingItem) => {
    return (
      <div
        key={item.id}
        className={`flex items-center justify-between p-4 hover:bg-gray-50 transition-colors ${
          item.action === "navigate" || item.action === "button" ? "cursor-pointer" : ""
        }`}
        onClick={() => {
          if (item.action === "button" && item.id === "logout") {
            console.log("Logout");
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
            {item.description && (
              <p className="text-sm text-gray-600 mt-0.5">{item.description}</p>
            )}
          </div>
        </div>

        {item.action === "toggle" && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Explicit map từ item.id (kebab-case) sang settings key (camelCase)
              const keyMap: Record<string, keyof typeof settings> = {
                "private-account": "privateAccount",
                "online-status": "onlineStatus",
                "push-notifications": "notifications",
                "dark-mode": "darkMode",
              };
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
        )}

        {item.action === "navigate" && (
          <ChevronRight className="w-5 h-5 text-gray-400" />
        )}
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Cài đặt
          </h2>
        </div>

        {/* Profile Section */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="relative group cursor-pointer">
              <img
                src="https://i.pravatar.cc/150?img=1"
                alt="Profile"
                className="w-20 h-20 rounded-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg text-gray-900">Nguyễn Văn A</h3>
              <p className="text-sm text-gray-600">@nguyenvana</p>
              <p className="text-sm text-gray-500 mt-1">nguyenvana@email.com</p>
            </div>
          </div>
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
          <p className="text-xs text-gray-500">
            Social Mini v1.0.0
          </p>
          <p className="text-xs text-gray-400 mt-1">
            © 2026 Social Mini. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

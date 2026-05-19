import { useEffect } from "react";
import {
  Bell,
  Home,
  MessageCircle,
  PlusSquare,
  Search,
  Settings,
  User,
} from "lucide-react";
import { useNotifications } from "../../hooks/useNotifications";
import { connectSocket } from "../../services/socketService";

type ViewType =
  | "feed"
  | "profile"
  | "notifications"
  | "messages"
  | "search"
  | "settings";

interface NavigationProps {
  onViewChange: (view: ViewType) => void;
  activeView: ViewType;
  onCreatePost: () => void;
}

export function Navigation({
  onViewChange,
  activeView,
  onCreatePost,
}: NavigationProps) {
  const { unreadCount } = useNotifications();

  useEffect(() => {
    connectSocket();
  }, []);

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white text-xl font-bold">S</span>
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent hidden sm:block">
              Social Mini
            </h1>
          </div>

          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm..."
                onFocus={() => onViewChange("search")}
                className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer"
                readOnly
              />
            </div>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => onViewChange("feed")}
              className={`p-2 rounded-lg transition-all ${
                activeView === "feed"
                  ? "bg-purple-100 text-purple-600"
                  : "hover:bg-gray-100 text-gray-600"
              }`}
              title="Trang chu"
            >
              <Home className="w-6 h-6" />
            </button>

            <button
              onClick={() => onViewChange("search")}
              className={`p-2 rounded-lg transition-all md:hidden ${
                activeView === "search"
                  ? "bg-purple-100 text-purple-600"
                  : "hover:bg-gray-100 text-gray-600"
              }`}
              title="Tìm kiếm"
            >
              <Search className="w-6 h-6" />
            </button>

            <button
              onClick={() => onViewChange("messages")}
              className={`p-2 rounded-lg transition-all relative ${
                activeView === "messages"
                  ? "bg-purple-100 text-purple-600"
                  : "hover:bg-gray-100 text-gray-600"
              }`}
              title="Tin nhắn"
            >
              <MessageCircle className="w-6 h-6" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            <button
              onClick={onCreatePost}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-all"
              title="Tạo bài viết"
            >
              <PlusSquare className="w-6 h-6" />
            </button>

            <button
              onClick={() => onViewChange("notifications")}
              className={`p-2 rounded-lg transition-all relative ${
                activeView === "notifications"
                  ? "bg-purple-100 text-purple-600"
                  : "hover:bg-gray-100 text-gray-600"
              }`}
              title="Thông báo"
            >
              <Bell className="w-6 h-6" />
              {unreadCount > 0 ? (
                <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : null}
            </button>

            <button
              onClick={() => onViewChange("profile")}
              className={`p-2 rounded-lg transition-all ${
                activeView === "profile"
                  ? "bg-purple-100 text-purple-600"
                  : "hover:bg-gray-100 text-gray-600"
              }`}
              title="Trang ca nhan"
            >
              <User className="w-6 h-6" />
            </button>

            <button
              onClick={() => onViewChange("settings")}
              className={`p-2 rounded-lg transition-all ${
                activeView === "settings"
                  ? "bg-purple-100 text-purple-600"
                  : "hover:bg-gray-100 text-gray-600"
              }`}
              title="Cài đặt"
            >
              <Settings className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

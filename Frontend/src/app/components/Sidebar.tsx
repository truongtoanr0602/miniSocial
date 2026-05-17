import { useState, useEffect, useCallback } from "react";
import { TrendingUp, Users, Loader2 } from "lucide-react";
import apiClient from "../../services/api";
import { toast } from "sonner";
import type { ISuggestedUser } from "../../types/models";

interface SidebarProps {
  onViewAllSuggestions?: () => void;
}

export function Sidebar({ onViewAllSuggestions }: SidebarProps) {
  const [suggestedUsers, setSuggestedUsers] = useState<ISuggestedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  // Fetch gợi ý kết bạn thật từ API
  const fetchSuggested = useCallback(async () => {
    const token = localStorage.getItem("userToken");
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const response = await apiClient.get("/users/suggested");
      const data = response.data.data;
      setSuggestedUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Lỗi tải gợi ý kết bạn:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuggested();
  }, [fetchSuggested]);

  // Follow user qua API
  const handleFollow = useCallback(async (userId: string) => {
    try {
      await apiClient.post(`/users/follow/${userId}`);
      setFollowingIds((prev) => {
        const next = new Set(prev);
        next.add(userId);
        return next;
      });
      toast.success("Đã theo dõi!");
    } catch (err) {
      console.error("Lỗi theo dõi:", err);
      toast.error("Không thể theo dõi người dùng này");
    }
  }, []);

  return (
    <div className="sticky top-20 space-y-6">
      {/* Suggested Users — dữ liệu thật */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/50 p-4">
        <div className="flex items-center space-x-2 mb-4">
          <Users className="w-5 h-5 text-purple-600" />
          <h3 className="font-bold text-gray-900">Gợi ý kết bạn</h3>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
          </div>
        ) : suggestedUsers.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            Không có gợi ý nào
          </p>
        ) : (
          <div className="space-y-4">
            {suggestedUsers.slice(0, 5).map((user) => {
              const avatar =
                user.avatar_url ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(user.display_name || user.username)}&background=7c3aed&color=fff`;
              const isFollowing = followingIds.has(user._id);

              return (
                <div key={user._id} className="flex items-center space-x-3">
                  <img
                    src={avatar}
                    alt={user.display_name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">
                      {user.display_name}
                    </p>
                    <p className="text-xs text-gray-500">@{user.username}</p>
                  </div>
                  {isFollowing ? (
                    <span className="px-3 py-1 bg-gray-200 text-gray-600 text-xs rounded-full">
                      Đã theo dõi
                    </span>
                  ) : (
                    <button
                      onClick={() => handleFollow(user._id)}
                      className="px-3 py-1 bg-purple-600 text-white text-xs rounded-full hover:bg-purple-700 transition-all"
                    >
                      Theo dõi
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {suggestedUsers.length > 5 ? (
          <button
            onClick={() => {
              if (onViewAllSuggestions) {
                onViewAllSuggestions();
                return;
              }
              toast.info("Tính năng xem thêm đang được cập nhật.");
            }}
            className="w-full mt-4 text-sm text-purple-600 hover:text-purple-700 font-semibold"
          >
            Xem thêm
          </button>
        ) : null}
      </div>

      {/* Footer Links */}
      <div className="bg-white/60 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/50 p-4">
        <div className="flex flex-wrap gap-2 text-xs text-gray-500">
          <a href="#" className="hover:underline">
            Về chúng tôi
          </a>
          <span>•</span>
          <a href="#" className="hover:underline">
            Trợ giúp
          </a>
          <span>•</span>
          <a href="#" className="hover:underline">
            Điều khoản
          </a>
          <span>•</span>
          <a href="#" className="hover:underline">
            Quyền riêng tư
          </a>
        </div>
        <p className="text-xs text-gray-400 mt-2">© 2026 Social Mini</p>
      </div>
    </div>
  );
}

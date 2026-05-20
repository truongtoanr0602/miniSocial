import { useState, useEffect, useCallback } from "react";
import { TrendingUp, Users, Loader2 } from "lucide-react";
import apiClient from "../../services/api";
import { toast } from "sonner";
import { useLangText } from "../../hooks/useLangText";
import type { ISuggestedUser } from "../../types/models";

interface SidebarProps {
  onViewAllSuggestions?: () => void;
  onOpenProfile?: (userId: string) => void;
}

export function Sidebar({ onViewAllSuggestions, onOpenProfile }: SidebarProps) {
  const text = useLangText();
  const [suggestedUsers, setSuggestedUsers] = useState<ISuggestedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [visibleSuggestionCount, setVisibleSuggestionCount] = useState(5);

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
      const response = await apiClient.post(`/users/follow/${userId}`);
      const followStatus = response.data?.data?.status;
      setFollowingIds((prev) => {
        const next = new Set(prev);
        next.add(userId);
        return next;
      });
      if (followStatus === "pending") {
        toast.info(text("Đã gửi yêu cầu theo dõi.", "Follow request sent."));
        return;
      }
      window.dispatchEvent(new Event("profile:refresh"));
      toast.success(text("Đã theo dõi!", "Followed."));
    } catch (err) {
      console.error("Lỗi theo dõi:", err);
      toast.error(text("Không thể theo dõi người dùng này", "Could not follow this user"));
    }
  }, [text]);

  return (
    <div className="sticky top-20 space-y-6">
      {/* Suggested Users — dữ liệu thật */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/50 p-4">
        <div className="flex items-center space-x-2 mb-4">
          <Users className="w-5 h-5 text-purple-600" />
          <h3 className="font-bold text-gray-900">{text("Gợi ý kết bạn", "Suggested friends")}</h3>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
          </div>
        ) : suggestedUsers.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            {text("Không có gợi ý nào", "No suggestions")}
          </p>
        ) : (
          <div className="space-y-4">
            {suggestedUsers.slice(0, visibleSuggestionCount).map((user) => {
              const avatar =
                user.avatar_url ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(user.display_name || user.username)}&background=7c3aed&color=fff`;
              const isFollowing = followingIds.has(user._id);

              return (
                <div key={user._id} className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => onOpenProfile?.(user._id)}
                    className="shrink-0"
                  >
                    <img
                      src={avatar}
                      alt={user.display_name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenProfile?.(user._id)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <p className="font-semibold text-sm text-gray-900 truncate">
                      {user.display_name}
                    </p>
                    <p className="text-xs text-gray-500">@{user.username}</p>
                  </button>
                  {isFollowing ? (
                    <span className="px-3 py-1 bg-gray-200 text-gray-600 text-xs rounded-full">
                      {text("Đã theo dõi", "Following")}
                    </span>
                  ) : (
                    <button
                      onClick={() => handleFollow(user._id)}
                      className="px-3 py-1 bg-purple-600 text-white text-xs rounded-full hover:bg-purple-700 transition-all"
                    >
                      {text("Theo dõi", "Follow")}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {suggestedUsers.length > visibleSuggestionCount ? (
          <button
            onClick={() => {
              if (onViewAllSuggestions) {
                onViewAllSuggestions();
                return;
              }
              setVisibleSuggestionCount((value) =>
                Math.min(value + 5, suggestedUsers.length),
              );
            }}
            className="w-full mt-4 text-sm text-purple-600 hover:text-purple-700 font-semibold"
          >
            {text("Xem thêm", "See more")}
          </button>
        ) : null}
      </div>

      {/* Footer Links */}
      <div className="bg-white/60 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/50 p-4">
        <div className="flex flex-wrap gap-2 text-xs text-gray-500">
          <a href="#" className="hover:underline">
            {text("Về chúng tôi", "About us")}
          </a>
          <span>•</span>
          <a href="#" className="hover:underline">
            {text("Trợ giúp", "Help")}
          </a>
          <span>•</span>
          <a href="#" className="hover:underline">
            {text("Điều khoản", "Terms")}
          </a>
          <span>•</span>
          <a href="#" className="hover:underline">
            {text("Quyền riêng tư", "Privacy")}
          </a>
        </div>
        <p className="text-xs text-gray-400 mt-2">© 2026 Social Mini</p>
      </div>
    </div>
  );
}

import { Calendar, Mail, Phone, Loader2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import apiClient from "../../services/api";
import type { IMyProfile } from "../../types/models";

interface ProfileCardProps {
  onEditProfile?: () => void;
}

export function ProfileCard({ onEditProfile }: ProfileCardProps) {
  const [profile, setProfile] = useState<IMyProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    const token = localStorage.getItem("userToken");
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const response = await apiClient.get("/users/me");
      setProfile(response.data.data);
    } catch (err) {
      console.error("Lỗi tải profile card:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
    const onRefreshProfile = () => {
      fetchProfile();
    };
    window.addEventListener("profile:refresh", onRefreshProfile);
    return () => {
      window.removeEventListener("profile:refresh", onRefreshProfile);
    };
  }, [fetchProfile]);

  if (isLoading) {
    return (
      <div className="sticky top-20">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/50 p-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const avatarUrl = profile.avatar_url
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.display_name)}&background=7c3aed&color=fff&size=150`;

  const joinDate = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString("vi-VN", { month: "long", year: "numeric" })
    : "";

  return (
    <div className="sticky top-20">
      <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
        {/* Cover Image */}
        <div className="h-24 bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500"></div>
        
        {/* Profile Info */}
        <div className="px-4 pb-4">
          <div className="flex flex-col items-center -mt-12">
            <img
              src={avatarUrl}
              alt={profile.display_name}
              className="w-24 h-24 rounded-full object-cover ring-4 ring-white shadow-lg"
            />
            <h2 className="mt-3 font-bold text-gray-900">{profile.display_name}</h2>
            <p className="text-sm text-gray-500">@{profile.username}</p>
          </div>
          
          {/* Bio */}
          <p className="text-sm text-gray-700 text-center mt-3 px-2">
            {profile.bio || "🚀 Đang sử dụng Social Mini"}
          </p>
          
          {/* Info — dữ liệu thật */}
          <div className="mt-4 space-y-2 text-sm text-gray-600">
            {profile.email ? (
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4" />
                <span>{profile.email}</span>
              </div>
            ) : null}
            
            {profile.phone_number ? (
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4" />
                <span>{profile.phone_number}</span>
              </div>
            ) : null}

            {joinDate ? (
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>Tham gia {joinDate}</span>
              </div>
            ) : null}
          </div>
          
          {/* Stats — dữ liệu thật */}
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="font-bold text-gray-900">{profile.postsCount}</p>
              <p className="text-xs text-gray-500">Bài viết</p>
            </div>
            <div>
              <p className="font-bold text-gray-900">
                {profile.followersCount >= 1000
                  ? `${(profile.followersCount / 1000).toFixed(1)}K`
                  : profile.followersCount}
              </p>
              <p className="text-xs text-gray-500">Người theo dõi</p>
            </div>
            <div>
              <p className="font-bold text-gray-900">
                {profile.followingCount >= 1000
                  ? `${(profile.followingCount / 1000).toFixed(1)}K`
                  : profile.followingCount}
              </p>
              <p className="text-xs text-gray-500">Đang theo dõi</p>
            </div>
          </div>
          
          {/* Action Button */}
          <button
            onClick={() => {
              if (onEditProfile) {
                onEditProfile();
                return;
              }
              toast.info("Tính năng chỉnh sửa hồ sơ đang phát triển.");
            }}
            className="w-full mt-4 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            Chỉnh sửa trang cá nhân
          </button>
        </div>
      </div>
    </div>
  );
}

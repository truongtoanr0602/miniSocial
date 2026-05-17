import { MapPin, Calendar, Mail, Phone } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import apiClient from "../../services/api";
import { useCurrentUser } from "../../hooks/useCurrentUser";

interface UserProfile {
  _id: string;
  username: string;
  display_name: string;
  email?: string;
  phone_number?: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
  posts_count: number;
  followers_count: number;
  following_count: number;
  created_at?: string;
}

/**
 * Format số lớn: 1234 → "1.2K"
 */
function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export function ProfileCard() {
  const currentUser = useCurrentUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!currentUser?._id) return;
    try {
      const res = await apiClient.get(`/users/${currentUser._id}`);
      const data = res.data.data || res.data;
      setProfile(data);
    } catch {
      // Fallback: dùng localStorage data
    }
  }, [currentUser?._id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Fallback data từ localStorage nếu API chưa trả về
  const displayName = profile?.display_name || currentUser?.display_name || "Người dùng";
  const username = profile?.username || currentUser?.username || "user";
  const email = profile?.email || currentUser?.email;
  const phone = profile?.phone_number || (currentUser as any)?.phone_number;
  const bio = profile?.bio || "";
  const location = profile?.location || "";
  const avatarUrl = profile?.avatar_url || (currentUser as any)?.avatar_url
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=7c3aed&color=fff&size=150`;
  const postsCount = profile?.posts_count ?? 0;
  const followersCount = profile?.followers_count ?? 0;
  const followingCount = profile?.following_count ?? 0;
  const joinDate = profile?.created_at
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
              alt={displayName}
              className="w-24 h-24 rounded-full object-cover ring-4 ring-white shadow-lg"
            />
            <h2 className="mt-3 font-bold text-gray-900">{displayName}</h2>
            <p className="text-sm text-gray-500">@{username}</p>
          </div>

          {/* Bio */}
          {bio ? (
            <p className="text-sm text-gray-700 text-center mt-3 px-2">{bio}</p>
          ) : null}

          {/* Info */}
          <div className="mt-4 space-y-2 text-sm text-gray-600">
            {location ? (
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4" />
                <span>{location}</span>
              </div>
            ) : null}

            {email ? (
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4" />
                <span>{email}</span>
              </div>
            ) : null}

            {phone ? (
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4" />
                <span>{phone}</span>
              </div>
            ) : null}

            {joinDate ? (
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>Tham gia {joinDate}</span>
              </div>
            ) : null}
          </div>

          {/* Stats */}
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="font-bold text-gray-900">{formatCount(postsCount)}</p>
              <p className="text-xs text-gray-500">Bài viết</p>
            </div>
            <div>
              <p className="font-bold text-gray-900">{formatCount(followersCount)}</p>
              <p className="text-xs text-gray-500">Người theo dõi</p>
            </div>
            <div>
              <p className="font-bold text-gray-900">{formatCount(followingCount)}</p>
              <p className="text-xs text-gray-500">Đang theo dõi</p>
            </div>
          </div>

          {/* Action Button */}
          <button className="w-full mt-4 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            Chỉnh sửa trang cá nhân
          </button>
        </div>
      </div>
    </div>
  );
}

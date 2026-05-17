import { useState, useEffect, useCallback } from "react";
import {
  Grid,
  Image as ImageIcon,
  Link as LinkIcon,
  Calendar,
  MoreHorizontal,
  UserPlus,
  Loader2,
  Edit,
} from "lucide-react";
import { PostCard } from "./PostCard";
import apiClient from "../../services/api";
import { toast } from "sonner";
import type { IMyProfile } from "../../types/models";

interface ProfileViewProps {
  onEditProfile?: () => void;
}

export function ProfileView({ onEditProfile }: ProfileViewProps) {
  const [activeTab, setActiveTab] = useState<"posts" | "photos" | "about">(
    "posts",
  );
  const [profile, setProfile] = useState<IMyProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch profile thật từ API
  const fetchProfile = useCallback(async () => {
    const token = localStorage.getItem("userToken");
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const response = await apiClient.get("/users/me");
      setProfile(response.data.data);
    } catch (err: any) {
      console.error("Lỗi tải profile:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Handlers cho PostCard
  const handleLike = useCallback(async (postId: string) => {
    try {
      await apiClient.post(`/post/${postId}/react`);
    } catch (err) {
      console.error("Lỗi like:", err);
    }
  }, []);

  const NOOP = useCallback(() => {}, []);

  const handleEditProfile = useCallback(() => {
    if (onEditProfile) {
      onEditProfile();
      return;
    }
    toast.info("Tính năng chỉnh sửa hồ sơ đang được cập nhật.");
  }, [onEditProfile]);

  const handleMoreOptions = useCallback(() => {
    toast.info("Các tùy chọn khác sẽ sớm được cập nhật.");
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
        <span className="ml-3 text-gray-500">Đang tải trang cá nhân...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20 text-gray-500">
        <p>Không thể tải thông tin cá nhân</p>
        <button
          onClick={fetchProfile}
          className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg"
        >
          Thử lại
        </button>
      </div>
    );
  }

  const avatarUrl =
    profile.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.display_name)}&background=7c3aed&color=fff&size=200`;
  const joinDate = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString("vi-VN", {
        month: "long",
        year: "numeric",
      })
    : "Không rõ";

  // Lọc ảnh từ posts
  const photoMedia = (profile.posts || []).flatMap((p) =>
    (p.media || []).filter((m) => m.type === "image").map((m) => m.url),
  );

  return (
    <div className="flex flex-col space-y-6 pb-20">
      {/* Profile Header Card */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
        {/* Cover Photo */}
        <div className="h-48 sm:h-64 relative w-full bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500">
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
        </div>

        {/* Profile Info Section */}
        <div className="relative px-4 sm:px-8 pb-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-16 sm:-mt-20 mb-6">
            {/* Avatar & Name */}
            <div className="flex flex-col sm:flex-row items-center sm:items-end space-y-4 sm:space-y-0 sm:space-x-4">
              <div className="relative z-10">
                <img
                  src={avatarUrl}
                  alt={profile.display_name}
                  className="w-32 h-32 sm:w-40 sm:h-40 rounded-full object-cover ring-4 ring-white shadow-xl"
                />
                <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 border-4 border-white rounded-full"></div>
              </div>
              <div className="text-center sm:text-left mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {profile.display_name}
                </h1>
                <p className="text-gray-500 font-medium">@{profile.username}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3 mt-6 sm:mt-0 justify-center">
              <button
                onClick={handleEditProfile}
                className="flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:shadow-lg transition-all font-medium"
              >
                <Edit className="w-5 h-5" />
                <span>Chỉnh sửa</span>
              </button>
              <button
                onClick={handleMoreOptions}
                className="p-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Bio & Details */}
          <div className="mt-4 sm:mt-0 max-w-2xl">
            <p className="text-gray-700 mb-4 text-center sm:text-left text-lg">
              {profile.bio || "Chưa có tiểu sử"}
            </p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-sm text-gray-500">
              {profile.email ? (
                <div className="flex items-center space-x-1">
                  <LinkIcon className="w-4 h-4" />
                  <span>{profile.email}</span>
                </div>
              ) : null}
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>Tham gia {joinDate}</span>
              </div>
            </div>
          </div>

          {/* Stats — dữ liệu thật */}
          <div className="flex items-center justify-center sm:justify-start space-x-8 mt-6 pt-6 border-t border-gray-100">
            <div className="text-center sm:text-left">
              <span className="block text-xl font-bold text-gray-900">
                {profile.followersCount >= 1000
                  ? `${(profile.followersCount / 1000).toFixed(1)}K`
                  : profile.followersCount}
              </span>
              <span className="text-sm text-gray-500">Người theo dõi</span>
            </div>
            <div className="text-center sm:text-left">
              <span className="block text-xl font-bold text-gray-900">
                {profile.followingCount >= 1000
                  ? `${(profile.followingCount / 1000).toFixed(1)}K`
                  : profile.followingCount}
              </span>
              <span className="text-sm text-gray-500">Đang theo dõi</span>
            </div>
            <div className="text-center sm:text-left">
              <span className="block text-xl font-bold text-gray-900">
                {profile.postsCount}
              </span>
              <span className="text-sm text-gray-500">Bài viết</span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Navigation */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200/50 p-2">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab("posts")}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl transition-all font-medium ${
              activeTab === "posts"
                ? "bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 shadow-sm"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Grid className="w-5 h-5" />
            <span>Bài viết</span>
          </button>
          <button
            onClick={() => setActiveTab("photos")}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl transition-all font-medium ${
              activeTab === "photos"
                ? "bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 shadow-sm"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <ImageIcon className="w-5 h-5" />
            <span>Hình ảnh</span>
          </button>
          <button
            onClick={() => setActiveTab("about")}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl transition-all font-medium ${
              activeTab === "about"
                ? "bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 shadow-sm"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <UserPlus className="w-5 h-5" />
            <span>Giới thiệu</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "posts" ? (
          <div className="space-y-6">
            {(profile.posts || []).length === 0 ? (
              <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200/50 p-6 text-center text-gray-500 py-20">
                <Grid className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg">Chưa có bài viết nào</p>
              </div>
            ) : (
              (profile.posts || []).map((post) => (
                <PostCard
                  key={post._id}
                  post={post}
                  onLike={handleLike}
                  onComment={NOOP}
                  onShare={NOOP}
                />
              ))
            )}
          </div>
        ) : null}

        {activeTab === "photos" ? (
          photoMedia.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200/50 p-6 text-center text-gray-500 py-20">
              <ImageIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">Chưa có hình ảnh nào</p>
            </div>
          ) : (
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200/50 p-4">
              <div className="grid grid-cols-3 gap-2">
                {photoMedia.map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    alt={`Photo ${idx + 1}`}
                    className="w-full h-40 object-cover rounded-lg"
                  />
                ))}
              </div>
            </div>
          )
        ) : null}

        {activeTab === "about" ? (
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200/50 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Thông tin cơ bản
            </h3>
            <div className="space-y-4">
              <div className="flex pb-4 border-b border-gray-100">
                <span className="w-1/3 text-gray-500 font-medium">
                  Tên hiển thị
                </span>
                <span className="w-2/3 text-gray-900">
                  {profile.display_name}
                </span>
              </div>
              <div className="flex pb-4 border-b border-gray-100">
                <span className="w-1/3 text-gray-500 font-medium">
                  Username
                </span>
                <span className="w-2/3 text-gray-900">@{profile.username}</span>
              </div>
              {profile.email ? (
                <div className="flex pb-4 border-b border-gray-100">
                  <span className="w-1/3 text-gray-500 font-medium">Email</span>
                  <span className="w-2/3 text-gray-900">{profile.email}</span>
                </div>
              ) : null}
              {profile.phone_number ? (
                <div className="flex pb-4 border-b border-gray-100">
                  <span className="w-1/3 text-gray-500 font-medium">
                    Điện thoại
                  </span>
                  <span className="w-2/3 text-gray-900">
                    {profile.phone_number}
                  </span>
                </div>
              ) : null}
              <div className="flex">
                <span className="w-1/3 text-gray-500 font-medium">Tiểu sử</span>
                <span className="w-2/3 text-gray-900">
                  {profile.bio || "Chưa cập nhật"}
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

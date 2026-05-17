import { useState, useEffect, useCallback, useRef } from "react";
import {
  X,
  Image as ImageIcon,
  Smile,
  MapPin,
  Users,
  Globe,
  Lock,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import apiClient from "../../services/api";
import { useCurrentUser } from "../../hooks/useCurrentUser";

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated?: () => void;
}

type Privacy = "public" | "friends" | "private";

const PRIVACY_CONFIG: Record<Privacy, { icon: typeof Globe; label: string }> = {
  public: { icon: Globe, label: "Công khai" },
  friends: { icon: Users, label: "Bạn bè" },
  private: { icon: Lock, label: "Chỉ mình tôi" },
};

export function CreatePostModal({
  isOpen,
  onClose,
  onPostCreated,
}: CreatePostModalProps) {
  const [postText, setPostText] = useState("");
  const [privacy, setPrivacy] = useState<Privacy>("public");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentUser = useCurrentUser();

  // Cleanup blob URLs khi component unmount hoặc files thay đổi — FIX memory leak
  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  const handleImageSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      // Giới hạn 4 ảnh
      const newFiles = files.slice(0, 4 - selectedFiles.length);
      if (newFiles.length === 0) return;

      setSelectedFiles((prev) => [...prev, ...newFiles]);

      // Tạo preview URLs
      const urls = newFiles.map((file) => URL.createObjectURL(file));
      setPreviewUrls((prev) => [...prev, ...urls]);

      // Reset input
      e.target.value = "";
    },
    [selectedFiles.length],
  );

  const handleRemoveImage = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handlePost = useCallback(async () => {
    if ((!postText.trim() && selectedFiles.length === 0) || isSubmitting)
      return;

    setIsSubmitting(true);
    setError("");

    try {
      // Dùng FormData để gửi cả text + files
      const formData = new FormData();
      formData.append("content", postText.trim());
      formData.append("visibility", privacy);

      selectedFiles.forEach((file) => {
        formData.append("media", file);
      });

      await apiClient.post("/post", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // Reset form
      setPostText("");
      setSelectedFiles([]);
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
      setPreviewUrls([]);
      setPrivacy("public");

      onPostCreated?.();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Lỗi tạo bài viết!");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    postText,
    selectedFiles,
    privacy,
    isSubmitting,
    previewUrls,
    onPostCreated,
    onClose,
  ]);

  const handleClose = useCallback(() => {
    if (isSubmitting) return;
    setPostText("");
    setSelectedFiles([]);
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    setPreviewUrls([]);
    setError("");
    onClose();
  }, [isSubmitting, previewUrls, onClose]);

  const handleUpcomingFeature = useCallback((feature: string) => {
    toast.info(`${feature} đang được phát triển.`);
  }, []);

  // FIX: Hooks phải ở trên, return ở dưới (Rules of Hooks)
  if (!isOpen) return null;

  const PrivacyIcon = PRIVACY_CONFIG[privacy].icon;
  const userName = currentUser?.display_name || currentUser?.username || "Bạn";
  const userAvatar =
    (currentUser as any)?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=7c3aed&color=fff`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
        role="presentation"
      ></div>

      {/* Modal */}
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Tạo bài viết
          </h2>
          <button
            onClick={handleClose}
            aria-label="Đóng modal"
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Error */}
        {error ? (
          <div className="mx-4 mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
            {error}
          </div>
        ) : null}

        {/* User Info */}
        <div className="p-4 flex items-center gap-3">
          <img
            src={userAvatar}
            alt={userName}
            className="w-12 h-12 rounded-full object-cover"
          />
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{userName}</h3>
            <button
              onClick={() => {
                const privacies: Privacy[] = ["public", "friends", "private"];
                const idx = privacies.indexOf(privacy);
                setPrivacy(privacies[(idx + 1) % privacies.length]);
              }}
              className="flex items-center gap-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-xs font-medium text-gray-700 transition-colors mt-1"
            >
              <PrivacyIcon className="w-3 h-3" />
              <span>{PRIVACY_CONFIG[privacy].label}</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pb-4 max-h-96 overflow-y-auto">
          <textarea
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
            placeholder="Bạn đang nghĩ gì?"
            className="w-full px-4 py-3 text-lg resize-none focus:outline-none min-h-32"
            autoFocus
          />

          {/* Image Preview */}
          {previewUrls.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-2">
              {previewUrls.map((url, index) => (
                <div key={url} className="relative group">
                  <img
                    src={url}
                    alt={`Selected ${index + 1}`}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => handleRemoveImage(index)}
                    className="absolute top-2 right-2 p-1.5 bg-white hover:bg-gray-100 rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-4 h-4 text-gray-700" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Add to Post */}
        <div className="px-4 py-3 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Thêm vào bài viết
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={handleImageSelect}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors group"
                title="Thêm ảnh/video"
              >
                <ImageIcon className="w-6 h-6 text-green-500 group-hover:scale-110 transition-transform" />
              </button>
              <button
                onClick={() => handleUpcomingFeature("Thêm cảm xúc")}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors group"
                title="Thêm cảm xúc"
              >
                <Smile className="w-6 h-6 text-yellow-500 group-hover:scale-110 transition-transform" />
              </button>
              <button
                onClick={() => handleUpcomingFeature("Thêm vị trí")}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors group"
                title="Thêm vị trí"
              >
                <MapPin className="w-6 h-6 text-red-500 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handlePost}
            disabled={
              (!postText.trim() && selectedFiles.length === 0) || isSubmitting
            }
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Đang đăng...
              </>
            ) : (
              "Đăng bài"
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}

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
import apiClient from "../../services/api";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useLangText } from "../../hooks/useLangText";

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated?: () => void;
}

type Privacy = "public" | "friends" | "private";

const PRIVACY_CONFIG: Record<Privacy, { icon: typeof Globe; label: string; labelEn: string }> = {
  public: { icon: Globe, label: "Công khai", labelEn: "Public" },
  friends: { icon: Users, label: "Bạn bè", labelEn: "Friends" },
  private: { icon: Lock, label: "Chỉ mình tôi", labelEn: "Only me" },
};

const MOODS = [
  { id: "happy", label: "vui vẻ", labelEn: "happy" },
  { id: "grateful", label: "biết ơn", labelEn: "grateful" },
  { id: "excited", label: "hào hứng", labelEn: "excited" },
  { id: "relaxed", label: "thư giãn", labelEn: "relaxed" },
  { id: "focused", label: "tập trung", labelEn: "focused" },
  { id: "lucky", label: "may mắn", labelEn: "lucky" },
];

export function CreatePostModal({
  isOpen,
  onClose,
  onPostCreated,
}: CreatePostModalProps) {
  const [postText, setPostText] = useState("");
  const [privacy, setPrivacy] = useState<Privacy>("public");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [selectedMood, setSelectedMood] = useState("");
  const [isMoodPickerOpen, setIsMoodPickerOpen] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [locationDraft, setLocationDraft] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentUser = useCurrentUser();
  const text = useLangText();

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
    const moodLabel = selectedMood
      ? MOODS.find((mood) => mood.id === selectedMood)
      : null;
    const details = [
      moodLabel
        ? `${text("Đang cảm thấy", "Feeling")} ${text(moodLabel.label, moodLabel.labelEn)}`
        : "",
      locationDraft.trim()
        ? `${text("Tại", "At")} ${locationDraft.trim()}`
        : "",
    ].filter(Boolean);
    const finalContent = [postText.trim(), ...details].filter(Boolean).join("\n");

    if ((!finalContent && selectedFiles.length === 0) || isSubmitting) return;

    setIsSubmitting(true);
    setError("");

    try {
      // Dùng FormData để gửi cả text + files
      const formData = new FormData();
      formData.append("content", finalContent);
      formData.append("visibility", privacy);

      selectedFiles.forEach((file) => {
        formData.append("images", file);
      });

      await apiClient.post("/post/createPost", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // Reset form
      setPostText("");
      setSelectedFiles([]);
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
      setPreviewUrls([]);
      setPrivacy("public");
      setSelectedMood("");
      setLocationDraft("");
      setIsMoodPickerOpen(false);
      setIsLocationOpen(false);

      onPostCreated?.();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || text("Lỗi tạo bài viết!", "Could not create post."));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    postText,
    selectedFiles,
    selectedMood,
    locationDraft,
    privacy,
    isSubmitting,
    previewUrls,
    onPostCreated,
    onClose,
    text,
  ]);

  const handleClose = useCallback(() => {
    if (isSubmitting) return;
    setPostText("");
    setSelectedFiles([]);
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    setPreviewUrls([]);
    setError("");
    setSelectedMood("");
    setLocationDraft("");
    setIsMoodPickerOpen(false);
    setIsLocationOpen(false);
    onClose();
  }, [isSubmitting, previewUrls, onClose]);

  // FIX: Hooks phải ở trên, return ở dưới (Rules of Hooks)
  if (!isOpen) return null;

  const PrivacyIcon = PRIVACY_CONFIG[privacy].icon;
  const userName = currentUser?.display_name || currentUser?.username || text("Bạn", "You");
  const selectedMoodOption = selectedMood
    ? MOODS.find((mood) => mood.id === selectedMood)
    : null;
  const selectedMoodLabel = selectedMoodOption
    ? text(selectedMoodOption.label, selectedMoodOption.labelEn)
    : "";
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
            {text("Tạo bài viết", "Create post")}
          </h2>
          <button
            onClick={handleClose}
            aria-label={text("Đóng modal", "Close modal")}
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
              <span>{text(PRIVACY_CONFIG[privacy].label, PRIVACY_CONFIG[privacy].labelEn)}</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pb-4 max-h-96 overflow-y-auto">
          <textarea
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
            placeholder={text("Bạn đang nghĩ gì?", "What are you thinking?")}
            className="w-full px-4 py-3 text-lg resize-none focus:outline-none min-h-32"
            autoFocus
          />

          {(selectedMood || locationDraft.trim()) ? (
            <div className="flex flex-wrap gap-2 px-1 text-sm">
              {selectedMood ? (
                <button
                  type="button"
                  onClick={() => setSelectedMood("")}
                  className="rounded-full bg-yellow-50 px-3 py-1 font-medium text-yellow-700"
                >
                  {text("Đang cảm thấy", "Feeling")} {selectedMoodLabel} ×
                </button>
              ) : null}
              {locationDraft.trim() ? (
                <button
                  type="button"
                  onClick={() => setLocationDraft("")}
                  className="rounded-full bg-red-50 px-3 py-1 font-medium text-red-700"
                >
                  {text("Tại", "At")} {locationDraft.trim()} ×
                </button>
              ) : null}
            </div>
          ) : null}

          {isMoodPickerOpen ? (
            <div className="mt-3 flex flex-wrap gap-2 rounded-xl bg-gray-50 p-3">
              {MOODS.map((mood) => (
                <button
                  key={mood.id}
                  type="button"
                  onClick={() => {
                    setSelectedMood(mood.id);
                    setIsMoodPickerOpen(false);
                  }}
                  className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-yellow-50 hover:text-yellow-700"
                >
                  {text(mood.label, mood.labelEn)}
                </button>
              ))}
            </div>
          ) : null}

          {isLocationOpen ? (
            <div className="mt-3 rounded-xl bg-gray-50 p-3">
              <input
                value={locationDraft}
                onChange={(event) => setLocationDraft(event.target.value)}
                placeholder={text("Thêm địa điểm", "Add location")}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
              />
            </div>
          ) : null}

          {/* Image Preview */}
          {previewUrls.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-2">
              {previewUrls.map((url, index) => (
                <div key={url} className="relative group">
                  {selectedFiles[index]?.type.startsWith("video/") ? (
                    <video src={url} controls className="h-48 w-full rounded-lg bg-black object-cover" />
                  ) : (
                    <img
                      src={url}
                      alt={`Selected ${index + 1}`}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  )}
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
              {text("Thêm vào bài viết", "Add to your post")}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={handleImageSelect}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors group"
                title={text("Thêm ảnh/video", "Add photo/video")}
              >
                <ImageIcon className="w-6 h-6 text-green-500 group-hover:scale-110 transition-transform" />
              </button>
              <button
                onClick={() => {
                  setIsMoodPickerOpen((value) => !value);
                  setIsLocationOpen(false);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors group"
                title={text("Thêm cảm xúc", "Add feeling")}
              >
                <Smile className="w-6 h-6 text-yellow-500 group-hover:scale-110 transition-transform" />
              </button>
              <button
                onClick={() => {
                  setIsLocationOpen((value) => !value);
                  setIsMoodPickerOpen(false);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors group"
                title={text("Thêm vị trí", "Add location")}
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
              (!postText.trim() &&
                !selectedMood &&
                !locationDraft.trim() &&
                selectedFiles.length === 0) ||
              isSubmitting
            }
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {text("Đang đăng...", "Posting...")}
              </>
            ) : (
              text("Đăng bài", "Post")
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

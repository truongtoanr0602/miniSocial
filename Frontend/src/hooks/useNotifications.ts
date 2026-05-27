import { useState, useEffect, useCallback } from "react";
import apiClient from "../services/api";
import { useSocketEvent } from "./useSocket";

export interface INotification {
  _id: string;
  recipient_id: string;
  sender_id: {
    _id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  } | string;
  type: "like" | "comment" | "follow" | "mention" | "system";
  target_id?: string | null;
  message?: string;
  is_read: boolean;
  created_at: string;
}

/**
 * Hook quản lý notifications: fetch từ API + realtime qua Socket.IO.
 * Thay thế mock data bằng dữ liệu thật.
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch danh sách notifications từ REST API
  const fetchNotifications = useCallback(async () => {
    const token = localStorage.getItem('userToken');
    if (!token) {
      setIsLoading(false);
      return; // Không fetch khi chưa đăng nhập
    }
    try {
      setIsLoading(true);
      const response = await apiClient.get("/notifications");
      const data = response.data.data;
      // Backend trả { notifications, unreadCount, pagination }
      setNotifications(data?.notifications || data || []);
      setError(null);
    } catch (err: any) {
      // Không crash — chỉ set error state
      if (err.response?.status !== 401) {
        setError(err.response?.data?.message || "Lỗi tải thông báo");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch lần đầu khi mount
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Lắng nghe notification mới từ Socket.IO (realtime)
  // Backend emit "notification:new" trong notificationController.ts
  useSocketEvent<INotification>("notification:new", (notification) => {
    setNotifications((prev) => [notification, ...prev]);
  });

  // Đánh dấu đã đọc 1 notification
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await apiClient.patch(`/notifications/${notificationId}/read`);
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notificationId ? { ...n, is_read: true } : n,
        ),
      );
    } catch (err) {
      console.error("Lỗi đánh dấu đã đọc:", err);
    }
  }, []);

  // Đánh dấu tất cả đã đọc
  const markAllAsRead = useCallback(async () => {
    try {
      await apiClient.patch("/notifications/read-all");
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true })),
      );
    } catch (err) {
      console.error("Lỗi đánh dấu tất cả đã đọc:", err);
    }
  }, []);

  // Đếm số notification chưa đọc
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return {
    notifications,
    isLoading,
    error,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  };
}

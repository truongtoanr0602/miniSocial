import { useMemo } from "react";
import { jwtDecode } from "jwt-decode";

interface JwtPayload {
  userId: string;
  exp: number;
  iat: number;
}

interface CurrentUser {
  _id: string;
  id?: string;
  username: string;
  display_name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  [key: string]: unknown;
}

/**
 * Hook để lấy thông tin user hiện tại từ localStorage.
 * CRITICAL FIX: Kiểm tra token expiry trước khi trả về user.
 * Nếu token hết hạn → tự động xóa token + userData và trả về null.
 */
export function useCurrentUser(): CurrentUser | null {
  return useMemo(() => {
    try {
      const token = localStorage.getItem("userToken");
      if (!token) return null;

      // Kiểm tra token có hết hạn chưa
      const decoded = jwtDecode<JwtPayload>(token);
      if (decoded.exp * 1000 < Date.now()) {
        // Token đã hết hạn → clear và return null
        localStorage.removeItem("userToken");
        localStorage.removeItem("userData");
        return null;
      }

      // Token còn hạn → lấy user data
      const userData = localStorage.getItem("userData");
      if (!userData) return null;

      const parsed = JSON.parse(userData) as CurrentUser;
      return {
        ...parsed,
        _id: parsed._id || parsed.id || "",
      };
    } catch {
      // Token không hợp lệ hoặc userData bị corrupt
      localStorage.removeItem("userToken");
      localStorage.removeItem("userData");
      return null;
    }
  }, []);
}

/**
 * Lấy token hiện tại nếu còn hạn, null nếu không.
 */
export function getValidToken(): string | null {
  try {
    const token = localStorage.getItem("userToken");
    if (!token) return null;

    const decoded = jwtDecode<JwtPayload>(token);
    if (decoded.exp * 1000 < Date.now()) {
      localStorage.removeItem("userToken");
      localStorage.removeItem("userData");
      return null;
    }

    return token;
  } catch {
    localStorage.removeItem("userToken");
    localStorage.removeItem("userData");
    return null;
  }
}

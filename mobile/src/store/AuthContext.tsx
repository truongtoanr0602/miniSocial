import React, { createContext, useContext, useMemo, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { api, setToken } from "../api/client";
import { ENDPOINTS } from "../api/endpoints";
import type { IUser, ApiResponse } from "../types/models";

interface AuthContextType {
  user: IUser | null;
  token: string | null;
  login: (account: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  loginWithGoogle: (idToken: string) => Promise<{ ok: boolean; message?: string }>;
  register: (data: RegisterPayload) => Promise<{ ok: boolean; message?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface RegisterPayload {
  username: string;
  email?: string;
  phone_number?: string;
  password: string;
  display_name: string;
  otp: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<IUser | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user profile using stored token
  const fetchMyProfile = useCallback(async () => {
    try {
      const { data } = await api.get<ApiResponse<IUser>>(ENDPOINTS.MY_PROFILE);
      const profileData = data.data;
      setUser(profileData);
    } catch (e) {
      console.error("[Auth] Failed to fetch profile, clearing token:", e);
      // Token invalid or expired — clear it
      setTokenState(null);
      setToken(null);
      setUser(null);
      await SecureStore.deleteItemAsync("token");
    }
  }, []);

  // Restore token from SecureStore on mount
  useEffect(() => {
    async function loadToken() {
      try {
        const storedToken = await SecureStore.getItemAsync("token");
        if (storedToken) {
          setTokenState(storedToken);
          setToken(storedToken);
          // Fetch user profile to populate user state
          await fetchMyProfile();
        }
      } catch (e) {
        console.error("[Auth] Failed to load token:", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadToken();
  }, [fetchMyProfile]);

  const completeLogin = useCallback(async (resData: { token: string; user: IUser }) => {
    const normalizedUser = {
      ...resData.user,
      _id: resData.user._id || (resData.user as any).id,
    };

    setTokenState(resData.token);
    setToken(resData.token);
    setUser(normalizedUser);
    await SecureStore.setItemAsync("token", resData.token);
  }, []);

  const login = useCallback(async (account: string, password: string) => {
    try {
      const { data } = await api.post<ApiResponse<{ token: string; user: IUser }>>(
        ENDPOINTS.LOGIN,
        { account, password },
      );

      await completeLogin(data.data);
      return { ok: true };
    } catch (error: any) {
      const message = error.response?.data?.message || "Đăng nhập thất bại!";
      return { ok: false, message };
    }
  }, [completeLogin]);

  const loginWithGoogle = useCallback(async (idToken: string) => {
    try {
      const { data } = await api.post<ApiResponse<{ token: string; user: IUser }>>(
        ENDPOINTS.GOOGLE_LOGIN,
        { idToken },
      );

      await completeLogin(data.data);
      return { ok: true };
    } catch (error: any) {
      const message = error.response?.data?.message || "Đăng nhập Google thất bại!";
      return { ok: false, message };
    }
  }, [completeLogin]);

  const register = useCallback(async (payload: RegisterPayload) => {
    try {
      // Backend cần: username, email/phone_number, password, display_name, otp
      await api.post(ENDPOINTS.REGISTER, payload);
      // Backend register trả về success nhưng KHÔNG trả token
      // User cần login sau khi register
      return { ok: true };
    } catch (error: any) {
      const message = error.response?.data?.message || "Đăng ký thất bại!";
      return { ok: false, message };
    }
  }, []);

  const logout = useCallback(async () => {
    setTokenState(null);
    setToken(null);
    setUser(null);
    await SecureStore.deleteItemAsync("token");
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      login,
      loginWithGoogle,
      register,
      logout,
      isAuthenticated: Boolean(token),
      isLoading,
    }),
    [user, token, login, loginWithGoogle, register, logout, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

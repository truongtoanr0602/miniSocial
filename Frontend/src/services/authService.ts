import apiClient from './api';
import { disconnectSocket } from './socketService';

export const authService = {
  // Hàm Đăng nhập: Gọi bằng email hoặc số điện thoại
  login: async (account: string, password: string) => {
    const response = await apiClient.post('/auth/login', { account, password });
    return response.data.data;
  },

  // Hàm Đăng ký
  register: async (userData: any) => {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  },

  // Hàm Đăng nhập với Google
  googleLogin: async (idToken: string) => {
    const response = await apiClient.post('/auth/google', { idToken });
    return response.data;
  },

  // Hàm Đăng xuất — clear token, userData, và disconnect socket
  logout: () => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    disconnectSocket();
  }
};
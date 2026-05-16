// Frontend Vite: src/services/api.ts
import axios from 'axios';

// Đọc từ biến môi trường Vite, fallback về localhost:3000
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// THUẬT TOÁN INTERCEPTOR: Tự động đính kèm Token từ localStorage
apiClient.interceptors.request.use(
  (config) => {
    // Web dùng localStorage có sẵn, không cần async/await
    const token = localStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: xóa token khi nhận 401 (token hết hạn/invalid)
// KHÔNG auto-redirect — để router guard hoặc component xử lý
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Bỏ qua 401 từ auth endpoints (login sai mật khẩu → 401 là bình thường)
      const url = error.config?.url || '';
      const isAuthEndpoint = url.includes('/auth/');
      if (!isAuthEndpoint) {
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
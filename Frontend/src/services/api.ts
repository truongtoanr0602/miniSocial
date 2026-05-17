// Frontend Vite: src/services/api.ts
import axios from 'axios';
import env from '../config/env';

const apiClient = axios.create({
  baseURL: env.API_BASE_URL,
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
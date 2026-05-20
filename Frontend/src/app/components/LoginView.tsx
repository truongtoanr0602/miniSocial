import { useState } from "react";
import { GoogleLogin } from '@react-oauth/google';
import { Eye, EyeOff, Mail, Lock, ArrowRight } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "motion/react";
import { authService } from "../../services/authService";
import { useLangText } from "../../hooks/useLangText";


export function LoginView() {
  const text = useLangText();
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // 1. Xử lý Đăng nhập thông thường (Email hoặc Số điện thoại + Password)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const data = await authService.login(account, password);

      // Lưu cả Token và thông tin User
      localStorage.setItem('userToken', data.token);
      const normalizedUser = { ...data.user, _id: data.user._id || data.user.id };
      localStorage.setItem('userData', JSON.stringify(normalizedUser));
      
      // Security fix: không log token ra console
      navigate('/'); 
    } catch (error: any) {
      const serverMessage = error.response?.data?.message || text("Lỗi kết nối server!", "Server connection error!");
      setError(serverMessage);
    }
  };

  // 2. Xử lý Đăng nhập Google (Gộp 2 hàm cũ thành 1 cho gọn)
  const handleGoogleSuccess = async (credentialResponse: any) => {

    try {
      const idToken = credentialResponse.credential;
      
      // Gọi service gửi idToken xuống Backend
      const data = await authService.googleLogin(idToken);
      
      // Lưu "chìa khóa" vào trình duyệt
      localStorage.setItem('userToken', data.token);
      const normalizedUser = { ...data.user, _id: data.user._id || data.user.id };
      localStorage.setItem('userData', JSON.stringify(normalizedUser));
      
      // Đăng nhập Google thành công — không log dữ liệu nhạy cảm
      
      // ĐIỀU HƯỚNG VỀ TRANG CHỦ
      navigate('/'); 
    } catch (error: any) {
      console.error("Lỗi xác thực Google:", error);
      alert(error.response?.data?.message || text("Lỗi xác thực Google với Server!", "Google authentication failed on the server!"));
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      {/* Background Orbs giữ nguyên... */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-300 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md p-8 relative z-10"
      >
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-8">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-6 transform rotate-12 hover:rotate-0 transition-transform duration-300">
              <span className="text-white text-3xl font-bold">S</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{text("Chào mừng trở lại", "Welcome back")}</h2>
            <p className="text-gray-500">{text("Đăng nhập để kết nối với bạn bè", "Log in to connect with friends")}</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {/* Thông báo lỗi */}
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
                {error}
              </div>
            )}

            {/* Input Email hoặc Số điện thoại */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{text("Email hoặc số điện thoại", "Email or phone number")}</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  required
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
                  placeholder={text("Nhập email hoặc số điện thoại", "Enter email or phone number")}
                />
              </div>
            </div>

            {/* Input Mật khẩu */}
            <div>
              <div className="flex item-center justify-between mb-2">
      <label className="text-sm font-medium text-gray-700">{text("Mật khẩu", "Password")}</label>
      <Link to="/forgot-password" className="text-sm font-semibold text-purple-600 hover:text-purple-700 transition-colors">
              {text("Quên mật khẩu", "Forgot password")}
            </Link>
      
      </div>
      <div className="relative">
        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        
        <input
          type={showPassword ? "text" : "password"} // Thay đổi type dựa trên state
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full pl-12 pr-12 py-3 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
          placeholder={text("Nhập mật khẩu", "Enter password")}
        />
        {/* Nút bật/tắt mắt */}
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>
    </div>
            

            <button
              type="submit"
              className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-3 px-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 font-medium group"
            >
              <span>{text("Đăng nhập", "Log in")}</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          {/* Google Login Section */}
          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">{text("Hoặc tiếp tục với", "Or continue with")}</span>
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              <div className="w-full max-w-[250px] overflow-hidden rounded-xl border border-gray-200 hover:shadow-sm transition-all">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => alert(text("Đăng nhập Google thất bại!", "Google login failed!"))}
                  useOneTap
                  theme="outline"
                  shape="rectangular"
                  width="250"
                />
              </div>
            </div>
          </div>

          <p className="mt-8 text-center text-sm text-gray-600">
            {text("Chưa có tài khoản?", "No account yet?")}{" "}
            <Link to="/register" className="font-semibold text-purple-600 hover:text-purple-700 transition-colors">
              {text("Đăng ký ngay", "Sign up now")}
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

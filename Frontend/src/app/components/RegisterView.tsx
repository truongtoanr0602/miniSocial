import { useState } from "react";
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, AtSign } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import apiClient from "../../services/api";

// Helper function to check if a string is a phone number
const isPhoneNumber = (value: string): boolean => {
  return /(84|0[3|5|7|8|9])+([0-9]{8})\b/.test(value);
};

export function RegisterView() {
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate cơ bản trước
    if (password !== confirmPassword) {
      setError(t("auth.PASSWORD_MISMATCH"));
      return;
    }

    try {
      const isPhone = isPhoneNumber(contact);
      // Gọi API bắn OTP
      if (isPhone) {
        await apiClient.post('/auth/sendPhoneOtp', { phone_number: contact });
      } else {
        await apiClient.post('/auth/sendEmailOtp', { email: contact });
      }
      
      // Chuyển sang màn hình nhập OTP
      setStep(2);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Lỗi gửi OTP!');
    }
  };

  // Nút "Xác nhận Đăng ký" (Ở Bước 2)
  const handleFinalRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isPhone = isPhoneNumber(contact);
      
      // Gọi API đăng ký thực sự
      await apiClient.post('/auth/register', {
        username: username,
        display_name: displayName,
        password: password,
        phone_number: isPhone ? contact : undefined,
        email: !isPhone ? contact : undefined,
        otp: otp
      });

      alert("Đăng ký thành công!");
      navigate('/login');
    } catch (error: any) {
      setError(error.response?.data?.message || 'Sai mã OTP!');
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
      {/* Animated gradient orbs background */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
      <div className="absolute top-0 left-0 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 right-20 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md p-8 relative z-10"
      >
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-7">
          <div className="text-center mb-5">
            <h2 className="text-3xl font-bold text-gray-900 mb-1">Tạo tài khoản</h2>
            <p className="text-gray-500">
              {step === 1 ? "Tham gia cùng cộng đồng của chúng tôi" : "Xác thực thông tin của bạn"}
            </p>
          </div>

          {error && (
            <div className="p-3 mb-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 text-center">
              {error}
            </div>
          )}

          {/* ================= BƯỚC 1: ĐIỀN THÔNG TIN ================= */}
          {step === 1 && (
            <form onSubmit={handleRequestOtp} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên người dùng (Username)</label>
                <div className="relative">
                  <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
                    placeholder="Nhập tên người dùng"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
                    placeholder="Nhập họ và tên của bạn"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email hoặc Số điện thoại</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
                    placeholder="Nhập email hoặc số điện thoại"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-3 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    placeholder="Nhập mật khẩu"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nhập lại mật khẩu</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-3 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    placeholder="Nhập lại mật khẩu"
                  />
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
                className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-3 px-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 font-medium group mt-4"
              >
                <span>Tiếp tục để nhận OTP</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
          )}

          {/* ================= BƯỚC 2: NHẬP MÃ OTP ================= */}
          {step === 2 && (
            <form onSubmit={handleFinalRegister} className="space-y-4">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 mb-4">
                  <Mail className="w-8 h-8 text-purple-600" />
                </div>
                <p className="text-gray-600 text-sm">
                  Mã xác nhận (6 số) đã được gửi đến <br />
                  <span className="font-bold text-purple-600 text-base">{contact}</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mã OTP</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-center tracking-[0.5em] font-bold text-xl"
                  placeholder="------"
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-3 px-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 font-medium mt-2"
              >
                Xác nhận Đăng ký
              </button>

              <div className="mt-4 text-center">
                <button 
                  type="button" 
                  onClick={() => setStep(1)} 
                  className="text-sm font-semibold text-gray-500 hover:text-purple-600 transition-colors"
                >
                  Quay lại sửa thông tin
                </button>
              </div>
            </form>
          )}

          {/* Dòng chữ chuyển sang Đăng nhập luôn hiện ở dưới cùng */}
          <p className="mt-8 text-center text-sm text-gray-600">
            Đã có tài khoản?{" "}
            <Link to="/login" className="font-semibold text-purple-600 hover:text-purple-700 transition-colors">
              Đăng nhập
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

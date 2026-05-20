import { useState } from "react";
import { Mail, KeyRound, Lock } from "lucide-react"; 
import { useNavigate, Link } from "react-router-dom";
import { motion } from "motion/react";
import apiClient from "../../services/api";
import { useLangText } from "../../hooks/useLangText";


export function ForgotPassword() {
  const text = useLangText();
  // Các state quản lý dữ liệu
  const [account, setAccount] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  
  
  // Quản lý trạng thái UI
  const [step, setStep] = useState(1); // 1: Nhập Account, 2: Nhập OTP
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Kiểm tra định dạng số điện thoại (Chỉ chứa 9-11 chữ số)
  const isPhoneNumber = (input: string) => /^[0-9]{9,11}$/.test(input);

  // Xử lý Bước 1: Gửi yêu cầu
  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      if (isPhoneNumber(account)) {
        // NẾU LÀ SỐ ĐIỆN THOẠI -> GỌI API MOCK OTP
        console.log("Đang gọi API /api/auth/sendPhoneOtp với số:", account);
        console.log("Đang gọi API /api/auth/sendPhoneOtp với OTP:", otp);
        
        await apiClient.post('/auth/sendPhoneOtp', { phone_number: account });
        
        alert(text("Mã OTP đã được gửi vào số điện thoại của bạn!", "OTP has been sent to your phone number!"));
        
        // Thành công -> Chuyển sang Bước 2
       
      } else {
        // NẾU LÀ EMAIL -> Xử lý gửi link vào Email
        console.log("Xử lý gửi link reset vào Email:", account);
        
        await apiClient.post('/auth/sendEmailOtp', {
          email: account
        });
        alert(text("Link khôi phục đã được gửi vào Email của bạn!", "Recovery code has been sent to your email!"));
        

      }
       setStep(2); 
    } catch (error: any) {
      setError(error.response?.data?.message || text("Lỗi gửi yêu cầu!", "Could not send request!"));
    }   
  };

  // Xử lý Bước 2: Xác nhận OTP và Đổi mật khẩu
  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const isPhone = isPhoneNumber(account);
      // ⚡️ GỌI API THỰC TẾ XUỐNG BACKEND Ở ĐÂY
      // Truyền đúng 3 trường: phone_number, otp, và newPassword
      await apiClient.post('/auth/resetPassword', {
        phone_number: isPhone ? account : undefined,
        email: !isPhone ? account : undefined,
        otp: otp,
        newPassword: newPassword
      });
      
      // Nếu Backend không báo lỗi (status 200) -> Chuyển về trang đăng nhập
      alert(text("Đổi mật khẩu thành công! Vui lòng đăng nhập lại.", "Password changed successfully. Please log in again."));
      navigate('/login');
      
    } catch (error: any) {
      // Nếu Backend báo lỗi (Sai OTP, Hết hạn OTP...) -> Hiện lỗi màu đỏ lên màn hình
      setError(error.response?.data?.message || text("OTP không hợp lệ hoặc đã hết hạn!", "OTP is invalid or has expired!"));
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      {/* Background Orbs */}
      <div className="absolute -top-32 -left-32 w-64 h-64 bg-pink-300 rounded-full opacity-70 animate-pulse"></div>
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-300 rounded-full opacity-70 animate-pulse"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md p-8 relative z-10"
      >
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-8">
          <h2 className="text-2xl font-bold text-center mb-6">
            {step === 1 ? text("Quên mật khẩu", "Forgot password") : text("Xác nhận mã OTP", "Verify OTP")}
          </h2>  
          
          {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
          
          {/* GIAO DIỆN BƯỚC 1: NHẬP SĐT / EMAIL */}
          {step === 1 && (
            <form onSubmit={handleSendRequest} className="space-y-4">
              <div> 
                <label className="block text-sm font-medium text-gray-700 mb-1">{text("Email hoặc Số điện thoại", "Email or phone number")}</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
                    placeholder={text("VD: 0987654321 hoặc email@gmail.com", "e.g. 0987654321 or email@gmail.com")}
                  />
                </div>
              </div>
              
              <button type="submit" className="w-full flex items-center justify-center gap-2 bg-gradient-to-br from-purple-600 to-blue-600 text-white py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition-colors">
                {text("Gửi mã xác nhận", "Send verification code")}
              </button>
            </form>
          )}

          {/* GIAO DIỆN BƯỚC 2: NHẬP OTP & MẬT KHẨU MỚI */}
          {step === 2 && (
            <form onSubmit={handleVerifyAndReset} className="space-y-4">
              <p className="text-sm text-gray-600 text-center mb-4">
                {text("Mã OTP (6 số) đã được gửi đến", "The 6-digit OTP was sent to")} <br/><span className="font-bold text-purple-600">{account}</span>
              </p>

              <div> 
                <label className="block text-sm font-medium text-gray-700 mb-1">{text("Mã OTP", "OTP code")}</label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all text-center tracking-[0.5em] font-bold"
                    placeholder="------"
                  />
                </div>
              </div>

              <div> 
                <label className="block text-sm font-medium text-gray-700 mb-1">{text("Mật khẩu mới", "New password")}</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
                    placeholder={text("Nhập mật khẩu mới", "Enter new password")}
                  />
                </div>
              </div>
              
              <button type="submit" className="w-full flex items-center justify-center gap-2 bg-gradient-to-br from-purple-600 to-blue-600 text-white py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition-colors">
                {text("Đổi mật khẩu", "Change password")}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            {/* Nếu đang ở bước 2 thì hiện nút quay lại bước 1, còn ở bước 1 thì quay lại Login */}
            {step === 2 ? (
               <button onClick={() => setStep(1)} className="text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors">
                 {text("Quay lại nhập số điện thoại", "Back to account entry")}
               </button>
            ) : (
               <Link to="/login" className="text-sm font-semibold text-purple-600 hover:text-purple-700 transition-colors">
                 {text("Quay lại đăng nhập", "Back to login")}
               </Link>
            )}
          </div>

        </div>
      </motion.div>
    </div>
  );
}

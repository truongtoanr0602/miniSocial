import React, { useState } from "react";
import { Pressable, Text, TextInput, View, StyleSheet } from "react-native";
import { Mail, Lock, ArrowRight, Eye, EyeOff } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../store/AuthContext";
import { ui, palette } from "../theme";
import { ScreenGradient } from "../components/common/ScreenGradient";

// ── Zod Schema ──
const loginSchema = z.object({
  account: z
    .string()
    .min(1, "Vui lòng nhập email hoặc số điện thoại"),
  password: z
    .string()
    .min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginScreen({ navigation }: any) {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { account: "", password: "" },
  });

  const onSubmit = async (data: LoginFormData) => {
    setServerError("");
    const result = await login(data.account, data.password);
    if (!result.ok) {
      setServerError(result.message || "Đăng nhập thất bại");
    }
  };

  return (
    <ScreenGradient style={ui.page}>
      <View style={styles.header}>
        <LinearGradient
          colors={[palette.primary, palette.accent]}
          style={styles.logo}
        >
          <Text style={styles.logoText}>S</Text>
        </LinearGradient>
        <Text style={ui.title}>Chào mừng trở lại</Text>
        <Text style={ui.subtitle}>Đăng nhập để kết nối với bạn bè</Text>
      </View>

      <View style={ui.card}>
        {/* Email / Phone */}
        <View style={styles.field}>
          <Text style={styles.label}>Email hoặc số điện thoại</Text>
          <Controller
            control={control}
            name="account"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={[ui.inputWrapper, errors.account ? styles.inputError : null]}>
                <Mail color={palette.muted} size={20} />
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Nhập email hoặc số điện thoại"
                  style={ui.input}
                  autoCapitalize="none"
                  placeholderTextColor={palette.muted}
                />
              </View>
            )}
          />
          {errors.account ? (
            <Text style={styles.errorText}>{errors.account.message}</Text>
          ) : null}
        </View>

        {/* Password */}
        <View style={styles.field}>
          <View style={styles.passwordHeader}>
            <Text style={styles.label}>Mật khẩu</Text>
            <Text style={styles.forgotLink}>Quên mật khẩu</Text>
          </View>
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={[ui.inputWrapper, errors.password ? styles.inputError : null]}>
                <Lock color={palette.muted} size={20} />
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Nhập mật khẩu"
                  secureTextEntry={!showPassword}
                  style={ui.input}
                  placeholderTextColor={palette.muted}
                />
                <Pressable onPress={() => setShowPassword((prev) => !prev)}>
                  {showPassword ? (
                    <EyeOff color={palette.muted} size={20} />
                  ) : (
                    <Eye color={palette.muted} size={20} />
                  )}
                </Pressable>
              </View>
            )}
          />
          {errors.password ? (
            <Text style={styles.errorText}>{errors.password.message}</Text>
          ) : null}
        </View>

        {/* Server Error */}
        {serverError ? (
          <View style={styles.serverErrorBox}>
            <Text style={styles.serverErrorText}>{serverError}</Text>
          </View>
        ) : null}

        {/* Submit */}
        <View style={ui.buttonContainer}>
          <Pressable onPress={handleSubmit(onSubmit)} disabled={isSubmitting}>
            <LinearGradient
              colors={[palette.primary, palette.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[ui.button, isSubmitting ? styles.disabled : null]}
            >
              <Text style={ui.buttonText}>
                {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
              </Text>
              {!isSubmitting ? (
                <ArrowRight color="#fff" size={20} style={styles.arrowIcon} />
              ) : null}
            </LinearGradient>
          </Pressable>
        </View>
        
        <Pressable
          style={ui.buttonGhost}
          onPress={() => navigation.navigate("Register")}
        >
          <Text style={styles.registerLink}>
            Chưa có tài khoản? <Text style={ui.buttonGhostText}>Đăng ký ngay</Text>
          </Text>
        </Pressable>
      </View>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", marginBottom: 32 },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    transform: [{ rotate: "12deg" }],
  },
  logoText: { color: "#fff", fontSize: 32, fontWeight: "bold" },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "500", color: palette.ink, marginBottom: 8 },
  passwordHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  forgotLink: { fontSize: 14, fontWeight: "600", color: palette.primary },
  inputError: { borderColor: palette.danger },
  errorText: { color: palette.danger, fontSize: 12, marginTop: 4, marginLeft: 4 },
  serverErrorBox: {
    backgroundColor: "#fef2f2",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#fee2e2",
  },
  serverErrorText: { color: palette.danger, fontSize: 14 },
  disabled: { opacity: 0.6 },
  arrowIcon: { marginLeft: 8 },
  registerLink: { color: palette.muted, fontSize: 14 },
});

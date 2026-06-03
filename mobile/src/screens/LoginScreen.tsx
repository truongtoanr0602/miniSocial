import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View, StyleSheet } from "react-native";
import { Mail, Lock, ArrowRight, Eye, EyeOff } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../store/AuthContext";
import { useLanguage } from "../store/LanguageContext";
import {
  GOOGLE_AUTH_CONFIG,
  GOOGLE_AUTH_SCHEME,
  IS_GOOGLE_LOGIN_CONFIGURED,
} from "../api/config";
import { ui, palette } from "../theme";
import { ScreenGradient } from "../components/common/ScreenGradient";

WebBrowser.maybeCompleteAuthSession();

type LoginFormData = {
  account: string;
  password: string;
};

export default function LoginScreen({ navigation }: any) {
  const { login, loginWithGoogle } = useAuth();
  const { t } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const googleClientId =
    GOOGLE_AUTH_CONFIG.webClientId ||
    GOOGLE_AUTH_CONFIG.androidClientId ||
    GOOGLE_AUTH_CONFIG.iosClientId;
  const isExpoGo =
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  const [googleRequest, googleResponse, promptGoogleLogin] =
    Google.useIdTokenAuthRequest(
      {
        clientId: googleClientId,
        webClientId: GOOGLE_AUTH_CONFIG.webClientId || googleClientId,
        androidClientId: GOOGLE_AUTH_CONFIG.androidClientId || googleClientId,
        iosClientId: GOOGLE_AUTH_CONFIG.iosClientId || googleClientId,
        scopes: ["openid", "profile", "email"],
        selectAccount: true,
      },
      { scheme: GOOGLE_AUTH_SCHEME },
    );
  const loginSchema = useMemo(
    () =>
      z.object({
        account: z
          .string()
          .min(1, t("Vui lòng nhập email hoặc số điện thoại", "Please enter an email or phone number")),
        password: z
          .string()
          .min(6, t("Mật khẩu phải có ít nhất 6 ký tự", "Password must be at least 6 characters")),
      }),
    [t],
  );

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
      setServerError(result.message || t("Đăng nhập thất bại", "Login failed"));
    }
  };

  useEffect(() => {
    if (!googleResponse) return;

    const completeGoogleLogin = async () => {
      if (googleResponse.type !== "success") {
        setIsGoogleSubmitting(false);
        if (googleResponse.type === "error") {
          setServerError(t("Đăng nhập Google thất bại", "Google login failed"));
        }
        return;
      }

      const idToken =
        googleResponse.params?.id_token ||
        (googleResponse as any).authentication?.idToken;

      if (!idToken) {
        setIsGoogleSubmitting(false);
        setServerError(t("Không nhận được Google ID token", "Google ID token was not returned"));
        return;
      }

      const result = await loginWithGoogle(idToken);
      setIsGoogleSubmitting(false);
      if (!result.ok) {
        setServerError(result.message || t("Đăng nhập Google thất bại", "Google login failed"));
      }
    };

    void completeGoogleLogin();
  }, [googleResponse, loginWithGoogle, t]);

  const handleGooglePress = async () => {
    setServerError("");
    if (isExpoGo) {
      setServerError(
        t(
          "Google OAuth không chạy trong Expo Go. Hãy cài development build bằng npx expo run:ios hoặc EAS development build.",
          "Google OAuth does not run in Expo Go. Install a development build with npx expo run:ios or an EAS development build.",
        ),
      );
      return;
    }

    if (!IS_GOOGLE_LOGIN_CONFIGURED) {
      setServerError(
        t(
          "Chưa cấu hình Google Client ID cho mobile.",
          "Google Client ID is not configured for mobile.",
        ),
      );
      return;
    }

    setIsGoogleSubmitting(true);
    await promptGoogleLogin();
  };

  const isGoogleDisabled =
    isGoogleSubmitting ||
    isSubmitting ||
    (IS_GOOGLE_LOGIN_CONFIGURED && !googleRequest);

  return (
    <ScreenGradient style={ui.page}>
      <View style={styles.header}>
        <LinearGradient
          colors={[palette.primary, palette.accent]}
          style={styles.logo}
        >
          <Text style={styles.logoText}>S</Text>
        </LinearGradient>
        <Text style={ui.title}>{t("Chào mừng trở lại", "Welcome back")}</Text>
        <Text style={ui.subtitle}>{t("Đăng nhập để kết nối với bạn bè", "Log in to connect with friends")}</Text>
      </View>

      <View style={ui.card}>
        {/* Email / Phone */}
        <View style={styles.field}>
          <Text style={styles.label}>{t("Email hoặc số điện thoại", "Email or phone number")}</Text>
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
                  placeholder={t("Nhập email hoặc số điện thoại", "Enter email or phone number")}
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
            <Text style={styles.label}>{t("Mật khẩu", "Password")}</Text>
            <Text style={styles.forgotLink}>{t("Quên mật khẩu", "Forgot password")}</Text>
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
                  placeholder={t("Nhập mật khẩu", "Enter password")}
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
                {isSubmitting ? t("Đang đăng nhập...", "Logging in...") : t("Đăng nhập", "Log in")}
              </Text>
              {!isSubmitting ? (
                <ArrowRight color="#fff" size={20} style={styles.arrowIcon} />
              ) : null}
            </LinearGradient>
          </Pressable>
        </View>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t("Hoặc tiếp tục với", "Or continue with")}</Text>
          <View style={styles.dividerLine} />
        </View>

        <Pressable
          style={[styles.googleButton, isGoogleDisabled ? styles.disabled : null]}
          disabled={isGoogleDisabled}
          onPress={handleGooglePress}
        >
          {isGoogleSubmitting ? (
            <ActivityIndicator color={palette.ink} size="small" />
          ) : (
            <Text style={styles.googleMark}>G</Text>
          )}
          <Text style={styles.googleButtonText}>
            {isGoogleSubmitting
              ? t("Đang đăng nhập Google...", "Signing in with Google...")
              : t("Đăng nhập bằng Google", "Sign in with Google")}
          </Text>
        </Pressable>

        {isExpoGo ? (
          <Text style={styles.googleHint}>
            {t(
              "Bạn đang chạy bằng Expo Go nên Google sẽ trả lỗi redirect_uri=exp://... Hãy dùng development build để đăng nhập Google.",
              "You are running in Expo Go, so Google will reject redirect_uri=exp://... Use a development build for Google login.",
            )}
          </Text>
        ) : !IS_GOOGLE_LOGIN_CONFIGURED ? (
          <Text style={styles.googleHint}>
            {t(
              "Thêm EXPO_PUBLIC_GOOGLE_CLIENT_ID hoặc Google client ID theo nền tảng để bật chức năng này.",
              "Set EXPO_PUBLIC_GOOGLE_CLIENT_ID or platform Google client IDs to enable this.",
            )}
          </Text>
        ) : null}
        
        <Pressable
          style={ui.buttonGhost}
          onPress={() => navigation.navigate("Register")}
        >
          <Text style={styles.registerLink}>
            {t("Chưa có tài khoản?", "No account yet?")} <Text style={ui.buttonGhostText}>{t("Đăng ký ngay", "Sign up now")}</Text>
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
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: palette.line,
  },
  dividerText: {
    color: palette.muted,
    fontSize: 13,
  },
  googleButton: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  googleMark: {
    color: "#4285f4",
    fontSize: 18,
    fontWeight: "800",
  },
  googleButtonText: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: "700",
  },
  googleHint: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
    textAlign: "center",
  },
  registerLink: { color: palette.muted, fontSize: 14 },
});

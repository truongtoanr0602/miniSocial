import React, { useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { API_BASE_URL } from '../api/config';

WebBrowser.maybeCompleteAuthSession();

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

interface GoogleAuthButtonProps {
  onLoginSuccess: (token: string, user: any) => void;
}

export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({ onLoginSuccess }) => {
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || 'VUI_LONG_CAI_DAT_EXPO_PUBLIC_GOOGLE_CLIENT_ID_TRONG_ENV', 
      scopes: ['openid', 'profile', 'email'],
      responseType: AuthSession.ResponseType.IdToken,
      redirectUri: AuthSession.makeRedirectUri({
        scheme: 'minisocial',
      }),
    },
    discovery
  );

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      if (id_token) {
        handleBackendLogin(id_token);
      }
    } else if (response?.type === 'error') {
      Alert.alert('Lỗi', 'Không thể đăng nhập Google');
    }
  }, [response]);

  const handleBackendLogin = async (idToken: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();
      
      if (data.status === 'success') {
        onLoginSuccess(data.data.token, data.data.user);
      } else {
        Alert.alert('Lỗi Server', data.message || 'Đăng nhập thất bại');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Lỗi Mạng', 'Không thể kết nối Backend');
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.button, !request && styles.disabled]} 
      disabled={!request} 
      onPress={() => promptAsync()}
    >
      <Text style={styles.buttonText}>Đăng nhập bằng Google</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#DB4437', // Google Red
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
  },
  disabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

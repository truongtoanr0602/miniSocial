import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { AuthProvider } from "./src/store/AuthContext";
import { LanguageProvider } from "./src/store/LanguageContext";
import { Navigation } from "./src/navigation/RootNavigator";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function App() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AuthProvider>
          <NavigationContainer>
            <Navigation />
          </NavigationContainer>
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

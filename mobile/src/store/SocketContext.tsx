import React, { createContext, useContext, useEffect, useRef, useMemo } from "react";
import type { ReactNode } from "react";
import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";
import { BASE_URL } from "../api/config";
import { useAuth } from "./AuthContext";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = React.useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      // Disconnect if logged out
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    // Lấy token từ SecureStore để truyền vào socket auth
    const connectWithToken = async () => {
      try {
        const SecureStore = await import("expo-secure-store");
        const storedToken = await SecureStore.getItemAsync("token");
        if (!storedToken) return;

        const socket = io(BASE_URL, {
          transports: ["websocket"],
          autoConnect: true,
          auth: { token: storedToken },
        });

        socket.on("connect", () => {
          setIsConnected(true);
        });

        socket.on("disconnect", () => {
          setIsConnected(false);
        });

        socketRef.current = socket;
      } catch (e) {
        console.error("[SocketContext] Connect error:", e);
      }
    };

    connectWithToken();

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [isAuthenticated, user]);

  const value = useMemo(
    () => ({ socket: socketRef.current, isConnected }),
    [isConnected],
  );

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketContext() {
  return useContext(SocketContext);
}

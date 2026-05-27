import { useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";
import { BASE_URL } from "../api/config";

/**
 * Hook for Socket.IO connection management.
 * Connects on mount, disconnects on unmount.
 * Returns socket ref and emit helper.
 * 
 * Usage:
 * ```tsx
 * const { emit, on } = useSocket(user?._id);
 * ```
 */
export function useSocket(userId: string | undefined, token?: string | null) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!userId || !token) return;

    const socket = io(BASE_URL, {
      transports: ["websocket"],
      autoConnect: true,
      auth: { token },
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId, token]);

  const emit = useCallback((event: string, ...args: unknown[]) => {
    socketRef.current?.emit(event, ...args);
  }, []);

  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    socketRef.current?.on(event, callback);
    return () => {
      socketRef.current?.off(event, callback);
    };
  }, []);

  return { socket: socketRef, emit, on };
}

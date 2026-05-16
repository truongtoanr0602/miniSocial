import { useEffect, useRef, useCallback } from "react";
import { getSocket } from "../services/socketService";
import type { Socket } from "socket.io-client";

/**
 * Hook để sử dụng Socket.IO trong component.
 * Rule: client-event-listeners — deduplicate listeners, cleanup on unmount.
 */
export function useSocket(): Socket {
  return getSocket();
}

/**
 * Hook để lắng nghe 1 socket event.
 * Tự cleanup listener khi component unmount hoặc event thay đổi.
 * Rule: client-event-listeners — 1 listener duy nhất, không duplicate trên re-mount.
 */
export function useSocketEvent<T = unknown>(
  event: string,
  handler: (data: T) => void,
): void {
  // useRef giữ latest handler mà không thay đổi effect dependency
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const socket = getSocket();

    const wrappedHandler = (data: T) => {
      handlerRef.current(data);
    };

    socket.on(event, wrappedHandler as (...args: unknown[]) => void);

    return () => {
      socket.off(event, wrappedHandler as (...args: unknown[]) => void);
    };
  }, [event]);
}

/**
 * Hook emit socket event với stable callback.
 */
export function useSocketEmit() {
  const socket = getSocket();

  const emit = useCallback(
    <T = unknown>(event: string, data?: T, callback?: (response: unknown) => void) => {
      if (callback) {
        socket.emit(event, data, callback);
      } else {
        socket.emit(event, data);
      }
    },
    [socket],
  );

  return emit;
}

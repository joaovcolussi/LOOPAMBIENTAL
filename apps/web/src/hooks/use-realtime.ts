'use client';

import { useEffect, useRef, useState } from 'react';
import { apiBaseUrl, Message, Notification } from '../lib/api';

export type RealtimeHandlers = {
  message?: (event: { conversationId: string; message: Message }) => void;
  notification?: (notification: Notification) => void;
};

/**
 * Subscribes to the API's Server-Sent Events stream while the component is
 * mounted. EventSource reconnects on its own; screens keep their regular
 * fetches, so a dropped stream only delays updates.
 */
export function useRealtime(handlers: RealtimeHandlers) {
  const handlersRef = useRef(handlers);
  const [connected, setConnected] = useState(false);
  handlersRef.current = handlers;

  useEffect(() => {
    if (typeof window === 'undefined' || !('EventSource' in window)) return;
    const source = new EventSource(`${apiBaseUrl}/events/stream`, {
      withCredentials: true,
    });
    const parse = (raw: string) => {
      try {
        return JSON.parse(raw) as unknown;
      } catch {
        return null;
      }
    };
    source.addEventListener('ready', () => setConnected(true));
    source.addEventListener('message', (event) => {
      const data = parse((event as MessageEvent<string>).data);
      if (data && typeof data === 'object' && 'conversationId' in data)
        handlersRef.current.message?.(
          data as { conversationId: string; message: Message },
        );
    });
    source.addEventListener('notification', (event) => {
      const data = parse((event as MessageEvent<string>).data);
      if (data && typeof data === 'object' && 'id' in data)
        handlersRef.current.notification?.(data as Notification);
    });
    source.onerror = () => setConnected(false);
    return () => source.close();
  }, []);

  return { connected };
}

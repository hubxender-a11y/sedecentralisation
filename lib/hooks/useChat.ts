"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { buildAuthHeaders } from '@/lib/accessControl';
import { io } from 'socket.io-client';

export type ChatMessage = {
  id: string;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string | null;
  content?: string | null;
  isGroup?: boolean;
  groupId?: string | null;
  recipientId?: string | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentContentType?: string | null;
  createdAt?: string;
};

type UseChatOpts = {
  pollInterval?: number;
  onNewMessages?: (newItems: ChatMessage[]) => void;
};

export function useChat(conversationType: 'dm' | 'group', conversationId: string, opts?: UseChatOpts) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 200;
  const baseInterval = opts?.pollInterval ?? 8000;

  const timeoutRef = useRef<number | null>(null);
  const retryCountRef = useRef(0);
  const lastIdsRef = useRef<Set<string>>(new Set());
  const mountedRef = useRef(true);

  const clearTimer = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const scheduleNext = (delay: number) => {
    clearTimer();
    timeoutRef.current = window.setTimeout(() => runFetch(page), delay);
  };

  const handleFetched = (items: ChatMessage[]) => {
    // detect new messages compared to lastIdsRef
    const newItems = items.filter((it) => !lastIdsRef.current.has(it.id));
    if (newItems.length > 0) {
      // call callback if provided
      opts?.onNewMessages?.(newItems);
    }

    // update lastIdsRef
    lastIdsRef.current = new Set(items.map((i) => i.id));
    setMessages(items);
  };

  const runFetch = useCallback(async (p = 1) => {
    if (!mountedRef.current) return;
    setLoading(true);
    try {
      const url = `/api/chat/messages?type=${conversationType}&id=${encodeURIComponent(conversationId)}&page=${p}&pageSize=${pageSize}`;
        const headers = buildAuthHeaders();
        const res = await fetch(url, { credentials: 'same-origin', headers });
        const data = await res.json();
        if (data?.ok) {
          retryCountRef.current = 0;
          setError(null);
          handleFetched(data.items ?? []);
          // schedule next at base interval
          scheduleNext(baseInterval);
        } else {
          // treat as error
          throw new Error(data?.error ?? 'Failed to fetch messages');
        }
      } catch (e: any) {
        retryCountRef.current = Math.min(6, retryCountRef.current + 1);
        const backoff = Math.min(60000, baseInterval * Math.pow(2, retryCountRef.current));
        setError(e.message || 'Failed to fetch messages');
        scheduleNext(backoff);
      } finally {
        setLoading(false);
      }
    }, [conversationId, conversationType, baseInterval, pageSize]);

  const startPolling = useCallback(() => {
    clearTimer();
    retryCountRef.current = 0;
    // start immediate fetch
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    runFetch(page);
  }, [runFetch, page]);

  const stopPolling = useCallback(() => {
    clearTimer();
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    startPolling();
    return () => {
      mountedRef.current = false;
      stopPolling();
    };
  }, [conversationId, startPolling, stopPolling]);

  // socket.io real-time updates (optional): reuse a single socket on window and listen for chat messages
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const SOCKET_URL = (process.env.NEXT_PUBLIC_SOCKET_URL as string) || 'http://localhost:4001';
      // reuse global socket to avoid reconnects
      let socket = (window as any).__chat_socket;
      if (!socket) {
        socket = io(SOCKET_URL, { transports: ['websocket'], autoConnect: true });
        (window as any).__chat_socket = socket;
      }

      const onMessage = (msg: ChatMessage) => {
        try {
          if (msg.isGroup) {
            if (String(msg.groupId) === String(conversationId)) {
              // new group message for this conversation
              setMessages((m) => {
                if (m.find((x) => x.id === msg.id)) return m;
                lastIdsRef.current.add(msg.id);
                return [...m, msg];
              });
            }
          } else {
            // direct message: include if sender or recipient matches this conversation id
            if (String(msg.senderId) === String(conversationId) || String(msg.recipientId) === String(conversationId)) {
              setMessages((m) => {
                if (m.find((x) => x.id === msg.id)) return m;
                lastIdsRef.current.add(msg.id);
                return [...m, msg];
              });
            }
          }
        } catch (e) {
          // ignore
        }
      };

      socket.on('chat:message', onMessage);
      return () => {
        socket.off('chat:message', onMessage);
      };
    } catch (e) {
      // ignore socket errors
    }
  }, [conversationId]);

  const fetchMessages = useCallback(async (p = 1) => {
    // explicit fetch without affecting schedule
    try {
      const url = `/api/chat/messages?type=${conversationType}&id=${encodeURIComponent(conversationId)}&page=${p}&pageSize=${pageSize}`;
      const headers = buildAuthHeaders();
      const res = await fetch(url, { credentials: 'same-origin', headers });
      const data = await res.json();
      if (data?.ok) {
        handleFetched(data.items ?? []);
        return { ok: true, items: data.items };
      }
      return { ok: false, error: data?.error };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }, [conversationId, conversationType]);

  const sendMessage = useCallback(async (payload: { content?: string | null; isGroup?: boolean; groupId?: string | null; recipientId?: string | null; attachmentUrl?: string | null; attachmentName?: string | null; }) => {
    try {
      const headers = buildAuthHeaders('application/json');
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        credentials: 'same-origin',
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data?.ok) {
        // append locally
        setMessages((m) => [...m, data.item]);
        lastIdsRef.current.add(data.item.id);
        return { ok: true, item: data.item };
      }
      return { ok: false, error: data?.error };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }, []);

  const uploadFile = useCallback(async (conversationId: string, filename: string, contentBase64: string, contentType?: string, contentSize?: number) => {
    try {
      const headers = buildAuthHeaders('application/json');
      const res = await fetch('/api/chat/upload', {
        method: 'POST',
        credentials: 'same-origin',
        headers,
          body: JSON.stringify({ conversationId, filename, contentBase64, contentType, contentSize }),
      });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }, []);

  return {
    messages,
    loading,
    error,
    page,
    setPage,
    fetchMessages,
    startPolling,
    stopPolling,
    sendMessage,
    uploadFile,
  };
}

"use client";

import React, { useEffect, useState } from 'react';
import { buildAuthHeaders } from '@/lib/accessControl';

export default function NotificationBadge() {
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    let mounted = true;
    const fetchConversations = async () => {
      try {
        const res = await fetch('/api/chat/conversations', { credentials: 'same-origin', headers: buildAuthHeaders() });
        const data = await res.json();
        if (!mounted) return;
        if (data?.ok) {
          const totalUnread = (data.items ?? []).reduce((acc: number, it: any) => acc + (Number(it.unread) || 0), 0);
          setCount(totalUnread);
        }
      } catch (e) {
        // ignore
      }
    };
    fetchConversations();
    const id = window.setInterval(fetchConversations, 15000);
    return () => { mounted = false; window.clearInterval(id); };
  }, []);

  if (count === 0) return null;
  return (
    <div className="inline-flex items-center justify-center w-6 h-6 text-xs bg-red-600 text-white rounded-full">{count}</div>
  );
}

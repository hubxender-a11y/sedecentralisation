"use client";

import React, { useState } from 'react';
import ChatSidebar from '@/app/ui/chat/ChatSidebar';
import ChatWindow from '@/app/ui/chat/ChatWindow';
import ChatMenu from '@/app/ui/chat/ChatMenu';
import NotificationBadge from '@/app/ui/NotificationBadge';

const mockConversations = [
  { id: 'user-123', title: 'Jean Kabamba', unread: 2, isGroup: false },
  { id: 'dir-4', title: 'Division des Systèmes d Information', unread: 0, isGroup: true },
  { id: 'group-ops', title: 'Equipe Opérations', unread: 5, isGroup: true },
];

export default function ChatPage() {
  const [selected, setSelected] = useState(mockConversations[0]);
  const [panelOpen, setPanelOpen] = useState(true);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="px-4 py-3 bg-white border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">Messages (Exemple)</h1>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBadge />
          <ChatMenu onOpen={() => setPanelOpen((v) => !v)} />
        </div>
      </header>

      <main className="p-4 flex justify-center items-center">
        <div className="bg-white rounded shadow overflow-hidden w-full max-w-[1100px]" style={{ height: '70vh' }}>
          <div className="flex h-full">
            <ChatSidebar conversations={mockConversations} onSelect={(c) => setSelected(c)} activeId={selected.id} />
            <div className="flex-1">
              <ChatWindow conversationType={selected.isGroup ? 'group' : 'dm'} conversationId={selected.id} conversationTitle={selected.title} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

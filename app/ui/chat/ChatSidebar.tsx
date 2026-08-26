"use client";

import React from 'react';

type Conversation = { id: string; title: string; unread: number; isGroup: boolean };

type Props = {
  conversations: Conversation[];
  onSelect: (c: Conversation) => void;
  activeId?: string;
};

export default function ChatSidebar({ conversations = [], onSelect, activeId }: Props) {
  return (
    <aside className="w-72 border-r bg-white h-full">
      <div className="px-3 py-2 border-b">
        <h3 className="text-sm font-semibold">Conversations</h3>
      </div>
      <div className="overflow-auto h-[calc(100%-56px)]">
        {conversations.length === 0 ? (
          <div className="p-3 text-sm text-gray-500">Aucune conversation</div>
        ) : (
          conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c)}
              className={`w-full text-left px-3 py-2 hover:bg-gray-50 flex justify-between items-center ${activeId === c.id ? 'bg-gray-100' : ''}`}
            >
              <div>
                <div className="text-sm font-medium">{c.title}</div>
                {c.isGroup && <div className="text-xs text-gray-400">Groupe</div>}
              </div>
              {c.unread ? <div className="bg-red-600 text-white text-xs px-2 py-0.5 rounded">{c.unread}</div> : null}
            </button>
          ))
        )}
      </div>
    </aside>
  );
}

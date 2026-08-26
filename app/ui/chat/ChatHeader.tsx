"use client";

import React, { useState, useEffect } from 'react';
import ChatMenu from './ChatMenu';
import NotificationBadge from '@/app/ui/NotificationBadge';
import { buildAuthHeaders, hydrateCurrentUserFromServer } from '@/lib/accessControl';
import ChatSidebar from './ChatSidebar';
import ChatWindow from './ChatWindow';

type Conversation = { id: string; title: string; unread: number; isGroup: boolean; lastMessage?: string; lastAt?: string };

export default function ChatHeader() {
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [users, setUsers] = useState<Array<{ id: string; fullName: string; email?: string; status?: string }>>([]);
  const [userSearch, setUserSearch] = useState('');

  const fetchConversations = async () => {
    setLoading(true);
    try {
        const res = await fetch('/api/chat/conversations', { headers: buildAuthHeaders(), credentials: 'same-origin' });
      const data = await res.json();
      if (data?.ok) {
        setConversations(data.items ?? []);
        if (!selected && (data.items ?? []).length > 0) setSelected(data.items[0]);
      } else {
        // suppressed noisy error for dashboard UI
        console.debug('failed to load conversations', data?.error);
      }
    } catch (e) {
      // suppressed noisy error for dashboard UI
      console.debug('failed to load conversations', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async (force = false) => {
    try {
      if (!force && users.length > 0) return; // already loaded
      const res = await fetch('/api/admin/state', { headers: buildAuthHeaders(), credentials: 'same-origin' });
      if (!res.ok) {
        setUsers([]);
        return;
      }
      const data = await res.json();
      const list = Array.isArray(data.users) ? data.users.map((u: any) => ({ id: u.id, fullName: u.fullName, email: u.email, status: u.status })) : [];
      setUsers(list);
    } catch (e) {
      setUsers([]);
    }
  };

  useEffect(() => {
    if (!open) return;
    // try hydrating current user from server cookies, then fetch conversations
    (async () => {
      try {
        await hydrateCurrentUserFromServer();
      } catch {}
      await fetchConversations();
    })();
  }, [open]);

  // auto-load users when opening "Nouveau" modal
  useEffect(() => {
    if (showNew) {
      // load users automatically; do not force if already loaded
      fetchUsers(false);
    }
  }, [showNew]);

  const markRead = async (conv: any) => {
    try {
      await fetch('/api/chat/messages/mark-read', {
        method: 'POST',
        credentials: 'same-origin',
        headers: buildAuthHeaders('application/json'),
        body: JSON.stringify({ type: conv.isGroup ? 'group' : 'dm', id: conv.id }),
      });
      // refresh conversations
      await fetchConversations();
    } catch (e) {
      // ignore
    }
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <NotificationBadge />
        <ChatMenu onOpen={() => setOpen((v) => !v)} />
      </div>

      {open ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black opacity-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-[960px] bg-white shadow-xl flex flex-col">
            <div className="px-4 py-2 border-b flex items-center justify-between">
              <div className="font-semibold">Messages</div>
              <div className="flex items-center gap-2">
                <button onClick={() => { fetchConversations(); }} className="text-sm text-gray-600 px-2 py-1">Actualiser</button>
                <button onClick={() => setShowNew(true)} className="text-sm text-blue-600 px-2 py-1">Nouveau</button>
                <button onClick={() => setOpen(false)} className="text-sm text-gray-600 px-2 py-1">Fermer</button>
              </div>
            </div>
            <div className="flex-1 flex">
              <ChatSidebar conversations={conversations} onSelect={async (c) => { setSelected(c); await markRead(c); }} activeId={selected?.id} />
              <div className="flex-1">
                {selected ? (
                  <ChatWindow conversationType={selected.isGroup ? 'group' : 'dm'} conversationId={selected.id} conversationTitle={selected.title} />
                ) : (
                  <div className="p-6 text-gray-500">{loading ? 'Chargement...' : 'Aucune conversation'}</div>
                )}
              </div>
            </div>

            {showNew ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-white w-[640px] max-h-[70vh] overflow-auto shadow-lg rounded">
                  <div className="p-4 border-b flex items-center justify-between">
                    <div className="font-semibold">Nouvelle conversation</div>
                    <div>
                      <button onClick={() => setShowNew(false)} className="text-sm text-gray-600 px-2 py-1">Fermer</button>
                    </div>
                  </div>
                  <div className="p-4">
                    <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Rechercher un utilisateur" className="w-full p-2 border rounded" />
                    <div className="mt-3">
                      <button onClick={() => fetchUsers(true)} className="text-sm text-gray-600 px-2 py-1">Charger la liste des utilisateurs</button>
                    </div>
                    <div className="mt-3">
                      {users.filter(u => (u.fullName || '').toLowerCase().includes(userSearch.toLowerCase()) || (u.email||'').toLowerCase().includes(userSearch.toLowerCase())).map((u) => (
                        <div key={u.id} className="p-2 border-b flex items-center justify-between">
                          <div>
                            <div className="font-medium">{u.fullName}</div>
                            <div className="text-xs text-gray-500">{u.email}</div>
                          </div>
                          <div>
                            <button className="text-sm text-blue-600 px-2 py-1" onClick={async () => {
                              // create a local conversation entry and select it
                              const conv = { id: u.id, title: u.fullName || u.email || u.id, unread: 0, isGroup: false } as Conversation;
                              setSelected(conv);
                              setShowNew(false);
                              // optionally mark read or refresh
                              await fetchConversations();
                            }}>Message</button>
                          </div>
                        </div>
                      ))}
                      {users.length === 0 && <div className="text-sm text-gray-500 mt-2">Aucun utilisateur chargé</div>}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

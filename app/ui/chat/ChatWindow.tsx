"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useChat, type ChatMessage } from '@/lib/hooks/useChat';
import FileUploader from './FileUploader';
import AudioRecorder from './AudioRecorder';
import { getCurrentUserId } from '@/lib/accessControl';

type Props = {
  conversationType: 'dm' | 'group';
  conversationId: string;
  conversationTitle?: string;
  // optional styling hooks
  myBubbleClass?: string;
  otherBubbleClass?: string;
  avatarSize?: number; // px
  showAvatar?: boolean;
};

export default function ChatWindow({ conversationType, conversationId, conversationTitle, myBubbleClass, otherBubbleClass, avatarSize = 32, showAvatar = true }: Props) {
  const { messages, loading, error, sendMessage, uploadFile, fetchMessages } = useChat(conversationType, conversationId, { pollInterval: 8000 });
  const [text, setText] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    // read current user id from local storage (client side)
    try {
      const id = getCurrentUserId();
      setCurrentUserId(id);
    } catch {
      setCurrentUserId(null);
    }
  }, []);


  useEffect(() => {
    // scroll to bottom on messages update
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const doSend = async () => {
    // client-side validation
    setLocalError(null);
    const sendingToGroup = conversationType === 'group';
    if (sendingToGroup) {
      if (!conversationId) {
        setLocalError('Identifiant du groupe manquant.');
        return;
      }
    } else {
      if (!conversationId) {
        setLocalError('Identifiant du destinataire manquant.');
        return;
      }
    }

    if (!text.trim()) {
      setLocalError('Le message est vide. Écrivez un message ou joignez un fichier.');
      return;
    }

    try {
      const res = await sendMessage({ content: text, isGroup: sendingToGroup, groupId: sendingToGroup ? conversationId : undefined, recipientId: !sendingToGroup ? conversationId : undefined });
      if (!res?.ok) {
        setLocalError(res?.error || 'Erreur lors de l’envoi du message');
        return;
      }
      setText('');
      setLocalError(null);
      // fetchMessages(); // poll will pick up
    } catch (e: any) {
      setLocalError(e?.message || 'Erreur lors de l’envoi du message');
    }
  };

  const onUploaded = async (url: string, name: string) => {
    await sendMessage({ content: null, isGroup: conversationType === 'group', groupId: conversationType === 'group' ? conversationId : undefined, recipientId: conversationType === 'dm' ? conversationId : undefined, attachmentUrl: url, attachmentName: name });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2 border-b flex items-center justify-between">
        <div>
          <div className="font-semibold">{conversationTitle ?? 'Conversation'}</div>
          <div className="text-xs text-gray-500">{conversationType === 'group' ? 'Groupe' : 'Message direct'}</div>
        </div>
      </div>

      <div ref={listRef} className="flex-1 overflow-auto p-4 space-y-3 bg-gray-50 flex flex-col items-center">
        {loading && <div className="text-sm text-gray-500">Chargement...</div>}
        {error && <div className="text-sm text-red-500">{error}</div>}
        {localError && <div className="text-sm text-red-500">{localError}</div>}
        {messages.map((m: ChatMessage) => {
          const isMine = Boolean(currentUserId && m.senderId && String(m.senderId) === String(currentUserId));

          const contentType = (m.attachmentContentType ?? '').toString();
          const filename = m.attachmentName ?? '';

          let isAudio = false;
          let isImage = false;
          if (contentType) {
            isAudio = contentType.startsWith('audio/');
            isImage = contentType.startsWith('image/');
          } else {
            isAudio = /\.(mp3|wav|ogg|webm|m4a)$/i.test(filename) || /\.(mp3|wav|ogg|webm|m4a)$/i.test(String(m.attachmentUrl ?? ''));
            isImage = /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(filename) || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(String(m.attachmentUrl ?? ''));
          }

          const defaultMine = 'bg-indigo-100 rounded-xl shadow-md ring-1 ring-indigo-200 p-3 text-right';
          const defaultOther = 'bg-white rounded-lg shadow-sm p-3 text-left';
          const bubbleClass = isMine ? (myBubbleClass ?? defaultMine) : (otherBubbleClass ?? defaultOther);

          // container aligns bubble left or right within the centered column
          const containerJustify = isMine ? 'justify-end' : 'justify-start';

          return (
            <div key={m.id} className={`w-full flex ${containerJustify}`}>
              {/* avatar for others on left */}
              {!isMine && showAvatar ? (
                <img src={m.senderAvatar ?? '/avatar-placeholder.png'} alt={m.senderName ?? 'User'} width={avatarSize} height={avatarSize} className="rounded-full mr-3 object-cover" />
              ) : null}

              <div className={`w-full max-w-xl`}> 
                <div className={`${bubbleClass}`}>
                  <div className="text-xs text-gray-500">{m.senderName} • {m.createdAt ? new Date(m.createdAt).toLocaleString() : ''}</div>
                  {m.content ? <div className="mt-1 text-sm break-words">{m.content}</div> : null}

                  {m.attachmentUrl ? (
                    <div className="mt-3 flex justify-center">
                      {isAudio ? (
                        <audio controls className="mx-auto">
                          <source src={m.attachmentUrl} />
                          Votre navigateur ne supporte pas la lecture audio.
                        </audio>
                      ) : isImage ? (
                        <img src={m.attachmentUrl} alt={m.attachmentName ?? 'Image'} className="mx-auto max-h-60 object-contain rounded" />
                      ) : (
                        <a className="text-indigo-600 underline text-sm" href={m.attachmentUrl} target="_blank" rel="noreferrer">{m.attachmentName ?? 'Pièce jointe'}</a>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* avatar for mine on right */}
              {isMine && showAvatar ? (
                <img src={m.senderAvatar ?? '/avatar-placeholder.png'} alt={m.senderName ?? 'User'} width={avatarSize} height={avatarSize} className="rounded-full ml-3 object-cover" />
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="p-3 border-t bg-white">
        <div className="flex items-center gap-2">
          <FileUploader conversationId={conversationId} onUploaded={onUploaded} uploadFn={uploadFile} />
          <AudioRecorder conversationId={conversationId} onUploaded={onUploaded} uploadFn={uploadFile} />
          <input
            className="flex-1 border rounded px-3 py-2 text-sm"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Écrire un message..."
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void doSend(); } }}
          />
          <button onClick={() => void doSend()} className="px-3 py-2 bg-indigo-600 text-white rounded">Envoyer</button>
        </div>
      </div>
    </div>
  );
}

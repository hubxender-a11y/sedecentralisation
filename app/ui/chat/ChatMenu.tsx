"use client";

import React from 'react';

type Props = {
  onOpen: () => void;
};

export default function ChatMenu({ onOpen }: Props) {
  return (
    <button
      onClick={onOpen}
      className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 focus:outline-none"
      title="Ouvrir Messages"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.86L3 20l1.14-3.12A7.97 7.97 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
      Messages
    </button>
  );
}

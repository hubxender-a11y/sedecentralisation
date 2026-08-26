"use client";

import React, { useEffect, useRef, useState } from 'react';

type Props = {
  conversationId: string;
  onUploaded: (url: string, name: string) => void;
  uploadFn: (conversationId: string, filename: string, contentBase64: string, contentType?: string, contentSize?: number) => Promise<any>;
  maxRecordingMs?: number;
};

export default function AudioRecorder({ conversationId, onUploaded, uploadFn, maxRecordingMs = 2 * 60 * 1000 }: Props) {
  const [recording, setRecording] = useState(false);
  const [mediaSupported, setMediaSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function') {
      setMediaSupported(true);
    }
  }, []);

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType: mime as any });
      mediaRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        try {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          const arrayBuffer = await blob.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          const b64 = btoa(String.fromCharCode(...bytes));
          const filename = `audio_${Date.now()}.webm`;
          const res = await uploadFn(conversationId, filename, b64, blob.type, bytes.length);
          if (res?.ok) {
            onUploaded(res.url, res.name);
          } else {
            setError(res?.error ?? 'Upload failed');
          }
        } catch (e: any) {
          setError(e?.message ?? 'Recording/upload failed');
        }
      };
      recorder.start();
      setRecording(true);
      // auto-stop after maxRecordingMs
      setTimeout(() => {
        if (mediaRef.current && mediaRef.current.state === 'recording') mediaRef.current.stop();
      }, maxRecordingMs);
    } catch (e: any) {
      setError(e?.message ?? 'Microphone access denied');
    }
  };

  const stop = () => {
    try {
      if (mediaRef.current && mediaRef.current.state === 'recording') {
        mediaRef.current.stop();
        // stop tracks
        const tracks = (mediaRef.current as any).stream?.getTracks?.();
        if (tracks && tracks.length) tracks.forEach((t: any) => t.stop());
      }
    } catch (e) {
      // ignore
    }
    setRecording(false);
  };

  if (!mediaSupported) return null;

  return (
    <div className="flex items-center gap-2">
      {!recording ? (
        <button onClick={() => void start()} className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200 text-sm">Enregistrer audio</button>
      ) : (
        <button onClick={() => stop()} className="px-2 py-1 bg-red-500 text-white rounded text-sm">Arrêter</button>
      )}
      {error && <div className="text-xs text-red-600">{error}</div>}
    </div>
  );
}

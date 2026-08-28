import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const AGENT_DOCUMENTS_BUCKET = 'agent-documents';
export const CHAT_ATTACHMENTS_BUCKET = 'chat-attachments';

let client: SupabaseClient | null = null;
let bucketReady: Promise<void> | null = null;

function getSupabaseAdmin() {
  if (client) return client;

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error('Configuration Supabase Storage manquante.');
  }

  client = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return client;
}

export async function ensureAgentDocumentsBucket() {
  if (!bucketReady) {
    bucketReady = (async () => {
      const supabase = getSupabaseAdmin();
      const { error } = await supabase.storage.createBucket(AGENT_DOCUMENTS_BUCKET, {
        public: false,
        fileSizeLimit: '20MB',
      });
      if (error && !/already exists|duplicate/i.test(error.message)) {
        throw new Error(`Initialisation du bucket Supabase impossible: ${error.message}`);
      }
    })();
  }
  await bucketReady;
}

export async function uploadAgentDocument(storagePath: string, body: ArrayBuffer, contentType: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage
    .from(AGENT_DOCUMENTS_BUCKET)
    .upload(storagePath, body, { contentType, upsert: false });

  if (error) throw new Error(`Upload Supabase Storage impossible: ${error.message}`);
}

export async function downloadAgentDocument(storagePath: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage.from(AGENT_DOCUMENTS_BUCKET).download(storagePath);
  if (error || !data) throw new Error(error?.message || 'Document introuvable dans Supabase Storage.');
  return data;
}

async function ensurePrivateBucket(bucketName: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage.createBucket(bucketName, {
    public: false,
    fileSizeLimit: '20MB',
  });
  if (error && !/already exists|duplicate/i.test(error.message)) {
    throw new Error(`Initialisation du bucket Supabase impossible: ${error.message}`);
  }
}

export async function ensureChatAttachmentsBucket() {
  await ensurePrivateBucket(CHAT_ATTACHMENTS_BUCKET);
}

export async function uploadChatAttachment(storagePath: string, body: ArrayBuffer, contentType: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage.from(CHAT_ATTACHMENTS_BUCKET).upload(storagePath, body, { contentType, upsert: false });
  if (error) throw new Error(`Upload Supabase Storage impossible: ${error.message}`);
}

export async function downloadChatAttachment(storagePath: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage.from(CHAT_ATTACHMENTS_BUCKET).download(storagePath);
  if (error || !data) throw new Error(error?.message || 'Pièce jointe introuvable.');
  return data;
}

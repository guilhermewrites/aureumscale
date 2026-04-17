import { supabase } from './supabaseClient';

const BUCKET = 'post-thumbnails';

let bucketEnsured = false;
async function ensureBucket() {
  if (!supabase || bucketEnsured) return;
  try {
    const { data } = await supabase.storage.getBucket(BUCKET);
    if (!data) {
      await supabase.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: 524288000, // 500 MB (allows MP4s)
      });
    }
    bucketEnsured = true;
  } catch {
    // Bucket may already exist from another session — treat as success.
    bucketEnsured = true;
  }
}

export async function uploadPostThumbnail(file: File, userId: string): Promise<string | null> {
  if (!supabase) return null;
  await ensureBucket();
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: true,
  });
  if (error) {
    console.error('Thumbnail upload error:', error);
    return null;
  }
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export function isVideoUrl(url: string): boolean {
  if (!url) return false;
  const u = url.toLowerCase();
  return u.endsWith('.mp4') || u.endsWith('.mov') || u.endsWith('.webm') || u.endsWith('.m4v');
}

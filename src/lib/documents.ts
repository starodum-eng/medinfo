import { decode } from 'base64-arraybuffer';

import { supabase } from '@/lib/supabase';
import type { DocumentRow } from '@/types/db';

// Расширение файла по MIME-типу (для имени объекта в Storage).
function extFromMime(mime: string | undefined | null): string {
  switch (mime) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/heic':
      return 'heic';
    default:
      return 'jpg';
  }
}

type UploadArgs = {
  userId: string;
  base64: string;
  mimeType?: string | null;
};

/**
 * Загружает фото анализа в приватный бакет `documents` по пути
 * `{userId}/{timestamp}.{ext}` и создаёт строку documents (status='pending').
 * RLS Storage и таблицы требуют, чтобы путь и user_id принадлежали текущему
 * пользователю. Возвращает созданную строку documents.
 */
export async function uploadDocument({
  userId,
  base64,
  mimeType,
}: UploadArgs): Promise<DocumentRow> {
  const ext = extFromMime(mimeType);
  const storagePath = `${userId}/${Date.now()}.${ext}`;
  const contentType = mimeType ?? 'image/jpeg';

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, decode(base64), { contentType, upsert: false });
  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data, error: insertError } = await supabase
    .from('documents')
    .insert({
      user_id: userId,
      storage_path: storagePath,
      doc_type: 'lab_numeric',
      status: 'pending',
    })
    .select('*')
    .single();

  if (insertError || !data) {
    // Строку создать не удалось — убираем уже загруженный файл, чтобы не копить сирот.
    await supabase.storage.from('documents').remove([storagePath]);
    throw new Error(insertError?.message ?? 'Не удалось сохранить документ.');
  }

  return data;
}

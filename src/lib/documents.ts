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

export type ProcessResult = {
  ok: true;
  results_count: number;
  red_flags_count: number;
};

// Достаёт настоящий текст ошибки из ответа Edge Function.
// FunctionsHttpError кладёт тело (с нашим { error }) в error.context: Response.
async function readInvokeError(error: unknown): Promise<string> {
  const ctx = (error as { context?: unknown })?.context;
  if (ctx && typeof (ctx as Response).text === 'function') {
    try {
      const raw = await (ctx as Response).text();
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.error) return String(parsed.error);
      } catch {
        // тело не JSON — вернём как есть ниже
      }
      if (raw) return raw.slice(0, 300);
    } catch {
      // не удалось прочитать тело — падаем на message
    }
  }
  return (error as Error)?.message || 'Не удалось распознать анализ.';
}

/**
 * Запускает распознавание документа Edge Function'ом `process-document`.
 * JWT пользователя пробрасывается автоматически (invoke берёт его из сессии),
 * поэтому функция работает под RLS и видит только свои данные.
 * Бросает Error с ПОНЯТНЫМ сообщением (реальная причина из тела ответа).
 */
export async function processDocument(documentId: string): Promise<ProcessResult> {
  console.log('[processDocument] invoke process-document, document_id =', documentId);

  const { data, error } = await supabase.functions.invoke<ProcessResult | { error: string }>(
    'process-document',
    { body: { document_id: documentId } },
  );

  console.log('[processDocument] response', { data, error });

  if (error) {
    const message = await readInvokeError(error);
    console.error('[processDocument] invoke error:', message, error);
    throw new Error(message);
  }
  if (!data || 'error' in data) {
    const message = (data as { error?: string })?.error ?? 'Не удалось распознать анализ.';
    console.error('[processDocument] function returned error body:', message);
    throw new Error(message);
  }
  return data;
}

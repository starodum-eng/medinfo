import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * Показывает, заданы ли ключи Supabase. Используется экранами-заглушками,
 * чтобы дружелюбно подсказать про `.env`, а не падать при старте.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Плейсхолдеры не дают createClient упасть, когда `.env` ещё не заполнен.
// Реальная работа с Supabase появится в следующих задачах.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'public-anon-key-placeholder',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      // OTP по email — deep linking настроим на этапе авторизации.
      detectSessionInUrl: false,
    },
  },
);

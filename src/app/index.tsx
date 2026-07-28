import { Redirect } from 'expo-router';

// Точка входа. Реальная проверка сессии Supabase появится на этапе авторизации.
// Пока стартуем с экрана «Вход».
export default function Index() {
  return <Redirect href="/login" />;
}

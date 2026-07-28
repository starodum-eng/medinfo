import { Redirect } from 'expo-router';

import { useAuth } from '@/lib/auth';

// Точка входа. Пока восстанавливается сессия — корневой layout показывает лоадер,
// поэтому здесь просто выбираем, куда направить пользователя.
export default function Index() {
  const { session } = useAuth();
  return <Redirect href={session ? '/(tabs)' : '/login'} />;
}

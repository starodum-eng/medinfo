import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { AuthProvider, useAuth } from '@/lib/auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

function RootNavigator() {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const theme = useTheme();

  useEffect(() => {
    if (isLoading) return;

    // «Экраны входа» — это login и корневой редирект (index, segments[0] === undefined).
    // Всё остальное (вкладки, разбор документа) доступно только с сессией.
    const seg0 = segments[0];
    const onAuthScreen = seg0 === undefined || seg0 === 'login';

    if (!session && !onAuthScreen) {
      // Нет сессии на защищённом экране — выкидываем на вход.
      router.replace('/login');
    } else if (session && onAuthScreen) {
      // Есть сессия, но мы на входе/редиректе — уводим во вкладки.
      router.replace('/(tabs)');
    }
  }, [session, isLoading, segments, router]);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.background,
        }}>
        <ActivityIndicator color={theme.tint} />
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="document/[id]"
        options={{
          title: 'Анализ',
          // Явная кнопка «Назад»: возвращаемся в историю, а если экран открыли
          // через replace (из «Добавить») и назад некуда — уводим во вкладки.
          headerBackVisible: false,
          headerLeft: () => (
            <Pressable
              accessibilityRole="button"
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
              style={{ paddingVertical: 6, paddingRight: 16 }}>
              <Text style={{ color: theme.tint, fontSize: 16 }}>‹ Назад</Text>
            </Pressable>
          ),
        }}
      />
      <Stack.Screen
        name="dynamics/[analyte]"
        options={{
          title: 'Динамика',
          headerBackVisible: false,
          headerLeft: () => (
            <Pressable
              accessibilityRole="button"
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
              style={{ paddingVertical: 6, paddingRight: 16 }}>
              <Text style={{ color: theme.tint, fontSize: 16 }}>‹ Назад</Text>
            </Pressable>
          ),
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { isSupabaseConfigured } from '@/lib/supabase';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function LoginScreen() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <Screen scroll={false} contentStyle={styles.content}>
      <ThemedText type="subtitle" style={styles.title}>
        HealthVault
      </ThemedText>
      <ThemedText type="default" themeColor="textSecondary" style={styles.subtitle}>
        Личная медкарта: храните анализы и понимайте их простым языком.
      </ThemedText>

      {/* Заглушка. Полноценный вход по email + OTP появится на этапе авторизации. */}
      <Pressable
        accessibilityRole="button"
        style={[styles.button, { backgroundColor: theme.tint }]}
        onPress={() => router.replace('/(tabs)')}>
        <ThemedText style={styles.buttonText}>Войти (заглушка)</ThemedText>
      </Pressable>

      {!isSupabaseConfigured && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
          Ключи Supabase не заданы. Скопируйте .env.example в .env и заполните
          EXPO_PUBLIC_SUPABASE_URL и EXPO_PUBLIC_SUPABASE_ANON_KEY.
        </ThemedText>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
  button: {
    marginTop: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  hint: {
    textAlign: 'center',
  },
});

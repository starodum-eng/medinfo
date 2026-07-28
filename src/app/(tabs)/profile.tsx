import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { Disclaimer } from '@/components/disclaimer';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    // onAuthStateChange в корневом layout вернёт на экран входа.
  }

  return (
    <Screen>
      <ThemedText type="subtitle">Профиль</ThemedText>

      <ThemedText type="small" themeColor="textSecondary">
        Вы вошли как
      </ThemedText>
      <ThemedText type="default">{session?.user.email ?? '—'}</ThemedText>

      <ThemedText type="default" themeColor="textSecondary">
        Здесь будут ваши данные и настройки. Каждый пользователь видит только
        свои данные.
      </ThemedText>

      <Disclaimer />

      <Pressable
        accessibilityRole="button"
        disabled={signingOut}
        style={[styles.button, { borderColor: theme.border, opacity: signingOut ? 0.6 : 1 }]}
        onPress={signOut}>
        {signingOut ? (
          <ActivityIndicator color={theme.textSecondary} />
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            Выйти
          </ThemedText>
        )}
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  button: {
    marginTop: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
});

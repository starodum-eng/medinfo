import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { Disclaimer } from '@/components/disclaimer';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function ProfileScreen() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <Screen>
      <ThemedText type="subtitle">Профиль</ThemedText>
      <ThemedText type="default" themeColor="textSecondary">
        Здесь будут ваши данные и настройки. Каждый пользователь видит только
        свои данные.
      </ThemedText>
      <Disclaimer />

      {/* Заглушка выхода. Реальный signOut появится на этапе авторизации. */}
      <Pressable
        accessibilityRole="button"
        style={[styles.button, { borderColor: theme.border }]}
        onPress={() => router.replace('/login')}>
        <ThemedText type="small" themeColor="textSecondary">
          Выйти
        </ThemedText>
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

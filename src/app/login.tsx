import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

// Временный вход по email + паролю (MVP, пока не подключён SMTP для OTP).
// Подтверждение e-mail в проекте отключено → после регистрации пользователь
// сразу залогинен, и guard в корневом layout уводит во вкладки.
export default function LoginScreen() {
  const theme = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputStyle = [
    styles.input,
    { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement },
  ];

  function validate(): string | null {
    if (!email.trim()) return 'Введите e-mail.';
    if (!password) return 'Введите пароль.';
    if (password.length < 6) return 'Пароль должен быть не короче 6 символов.';
    return null;
  }

  // Приводим типовые ошибки Supabase к понятному русскому тексту.
  function humanError(message: string): string {
    const m = message.toLowerCase();
    if (m.includes('invalid login credentials')) return 'Неверный e-mail или пароль.';
    if (m.includes('user already registered') || m.includes('already been registered')) {
      return 'Такой e-mail уже зарегистрирован. Нажмите «Войти».';
    }
    if (m.includes('password should be at least')) {
      return 'Пароль должен быть не короче 6 символов.';
    }
    if (m.includes('unable to validate email') || m.includes('invalid email')) {
      return 'Проверьте, правильно ли введён e-mail.';
    }
    return 'Не удалось выполнить запрос. Проверьте данные и попробуйте ещё раз.';
  }

  async function signIn() {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (signInError) {
      setError(humanError(signInError.message));
      return;
    }
    // Успех: onAuthStateChange в корневом layout уведёт во вкладки.
  }

  async function signUp() {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (signUpError) {
      setError(humanError(signUpError.message));
      return;
    }
    // Подтверждение e-mail отключено → сессия создаётся сразу. Если её нет,
    // значит подтверждение включено в настройках проекта — подскажем.
    if (!data.session) {
      setError('Аккаунт создан. Подтвердите e-mail или войдите по паролю.');
    }
    // При наличии сессии onAuthStateChange уведёт во вкладки.
  }

  return (
    <Screen scroll={false} contentStyle={styles.content}>
      <ThemedText type="subtitle" style={styles.centered}>
        HealthVault
      </ThemedText>
      <ThemedText type="default" themeColor="textSecondary" style={styles.centered}>
        Личная медкарта: храните анализы и понимайте их простым языком.
      </ThemedText>

      {!isSupabaseConfigured ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
          Ключи Supabase не заданы. Скопируйте .env.example в .env и заполните
          EXPO_PUBLIC_SUPABASE_URL и EXPO_PUBLIC_SUPABASE_ANON_KEY, затем
          перезапустите приложение.
        </ThemedText>
      ) : (
        <View style={styles.form}>
          <ThemedText type="small" themeColor="textSecondary">
            Войдите по e-mail и паролю или зарегистрируйтесь.
          </ThemedText>

          <TextInput
            style={inputStyle}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            editable={!loading}
          />

          <TextInput
            style={inputStyle}
            value={password}
            onChangeText={setPassword}
            placeholder="Пароль (минимум 6 символов)"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            textContentType="password"
            editable={!loading}
            onSubmitEditing={signIn}
          />

          {error && (
            <ThemedText type="small" style={{ color: theme.warning }}>
              {error}
            </ThemedText>
          )}

          <Pressable
            accessibilityRole="button"
            disabled={loading}
            style={[styles.button, { backgroundColor: theme.tint, opacity: loading ? 0.6 : 1 }]}
            onPress={signIn}>
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <ThemedText style={styles.buttonText}>Войти</ThemedText>
            )}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={loading}
            style={[styles.buttonOutline, { borderColor: theme.tint, opacity: loading ? 0.6 : 1 }]}
            onPress={signUp}>
            <ThemedText style={[styles.buttonOutlineText, { color: theme.tint }]}>
              Зарегистрироваться
            </ThemedText>
          </Pressable>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  centered: {
    textAlign: 'center',
  },
  form: {
    marginTop: Spacing.three,
    gap: Spacing.two,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  button: {
    marginTop: Spacing.one,
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
  buttonOutline: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  buttonOutlineText: {
    fontWeight: '600',
    fontSize: 16,
  },
});

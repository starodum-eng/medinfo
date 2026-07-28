import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

type Phase = 'email' | 'code';

export default function LoginScreen() {
  const theme = useTheme();

  const [phase, setPhase] = useState<Phase>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputStyle = [
    styles.input,
    { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement },
  ];

  async function sendCode() {
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Введите e-mail.');
      return;
    }
    setError(null);
    setLoading(true);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (otpError) {
      setError('Не удалось отправить код. Проверьте e-mail и попробуйте ещё раз.');
      return;
    }
    setCode('');
    setPhase('code');
  }

  async function verifyCode() {
    const token = code.trim();
    if (token.length !== 6) {
      setError('Код состоит из 6 цифр.');
      return;
    }
    setError(null);
    setLoading(true);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token,
      type: 'email',
    });
    setLoading(false);
    if (verifyError) {
      setError('Неверный или просроченный код. Проверьте цифры или запросите новый.');
      return;
    }
    // Успех: onAuthStateChange в корневом layout уведёт во вкладки.
  }

  function backToEmail() {
    setError(null);
    setCode('');
    setPhase('email');
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
          {phase === 'email' ? (
            <>
              <ThemedText type="small" themeColor="textSecondary">
                Введите e-mail — пришлём 6-значный код для входа.
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
                onSubmitEditing={sendCode}
              />
            </>
          ) : (
            <>
              <ThemedText type="small" themeColor="textSecondary">
                Код отправлен на {email.trim()}. Введите 6 цифр из письма.
              </ThemedText>
              <TextInput
                style={inputStyle}
                value={code}
                onChangeText={(t) => setCode(t.replace(/[^0-9]/g, '').slice(0, 6))}
                placeholder="000000"
                placeholderTextColor={theme.textSecondary}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                maxLength={6}
                editable={!loading}
                onSubmitEditing={verifyCode}
              />
            </>
          )}

          {error && (
            <ThemedText type="small" style={{ color: theme.warning }}>
              {error}
            </ThemedText>
          )}

          <Pressable
            accessibilityRole="button"
            disabled={loading}
            style={[styles.button, { backgroundColor: theme.tint, opacity: loading ? 0.6 : 1 }]}
            onPress={phase === 'email' ? sendCode : verifyCode}>
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <ThemedText style={styles.buttonText}>
                {phase === 'email' ? 'Получить код' : 'Войти'}
              </ThemedText>
            )}
          </Pressable>

          {phase === 'code' && !loading && (
            <Pressable accessibilityRole="button" onPress={backToEmail} style={styles.linkButton}>
              <ThemedText type="small" themeColor="textSecondary">
                Изменить e-mail
              </ThemedText>
            </Pressable>
          )}
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
  linkButton: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
});

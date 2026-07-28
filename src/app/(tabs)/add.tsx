import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { uploadDocument } from '@/lib/documents';

type Picked = { uri: string; base64: string; mimeType?: string | null };

export default function AddScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { session } = useAuth();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  function reset() {
    setError(null);
    setDone(false);
    setPreviewUri(null);
  }

  async function pick(source: 'camera' | 'library'): Promise<Picked | null> {
    // Спрашиваем разрешение под конкретный источник.
    const perm =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError(
        source === 'camera'
          ? 'Нет доступа к камере. Разрешите его в настройках.'
          : 'Нет доступа к фото. Разрешите его в настройках.',
      );
      return null;
    }

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsEditing: true, // ручной кроп бумажного бланка
      quality: 0.8,
      base64: true,
    };
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

    if (result.canceled) return null;
    const asset = result.assets[0];
    if (!asset?.base64) {
      setError('Не удалось прочитать изображение. Попробуйте другое фото.');
      return null;
    }
    return { uri: asset.uri, base64: asset.base64, mimeType: asset.mimeType };
  }

  async function handleAdd(source: 'camera' | 'library') {
    if (!session) return;
    reset();
    const picked = await pick(source);
    if (!picked) return;

    setPreviewUri(picked.uri);
    setBusy(true);
    try {
      await uploadDocument({
        userId: session.user.id,
        base64: picked.base64,
        mimeType: picked.mimeType,
      });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить анализ.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <ThemedText type="subtitle">Добавить анализ</ThemedText>
      <ThemedText type="default" themeColor="textSecondary">
        Сфотографируйте бумажный бланк анализа или выберите фото из галереи.
        Распознавание показателей появится на следующем этапе.
      </ThemedText>

      {previewUri && (
        <Image source={{ uri: previewUri }} style={styles.preview} resizeMode="cover" />
      )}

      {busy ? (
        <View style={styles.state}>
          <ActivityIndicator color={theme.tint} />
          <ThemedText type="small" themeColor="textSecondary">
            Загружаем…
          </ThemedText>
        </View>
      ) : done ? (
        <View style={styles.state}>
          <ThemedText type="default" style={{ color: theme.tint }}>
            Анализ загружен. Он появится в истории со статусом «в обработке».
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            style={[styles.button, { backgroundColor: theme.tint }]}
            onPress={() => router.push('/(tabs)')}>
            <ThemedText style={styles.buttonText}>Перейти в историю</ThemedText>
          </Pressable>
          <Pressable accessibilityRole="button" style={styles.linkButton} onPress={reset}>
            <ThemedText type="small" themeColor="textSecondary">
              Добавить ещё
            </ThemedText>
          </Pressable>
        </View>
      ) : (
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            style={[styles.button, { backgroundColor: theme.tint }]}
            onPress={() => handleAdd('camera')}>
            <ThemedText style={styles.buttonText}>Сфотографировать</ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={[styles.buttonOutline, { borderColor: theme.tint }]}
            onPress={() => handleAdd('library')}>
            <ThemedText style={[styles.buttonOutlineText, { color: theme.tint }]}>
              Выбрать из галереи
            </ThemedText>
          </Pressable>
        </View>
      )}

      {error && (
        <ThemedText type="small" style={{ color: theme.warning }}>
          {error}
        </ThemedText>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  state: {
    gap: Spacing.two,
    marginTop: Spacing.two,
    alignItems: 'flex-start',
  },
  preview: {
    width: '100%',
    height: 220,
    borderRadius: Spacing.three,
  },
  button: {
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
  linkButton: {
    paddingVertical: Spacing.two,
  },
});

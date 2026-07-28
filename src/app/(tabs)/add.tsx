import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { processDocument, uploadDocument } from '@/lib/documents';

type Picked = { uri: string; base64: string; mimeType?: string | null };
type Phase = 'idle' | 'uploading' | 'processing' | 'error';

export default function AddScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { session } = useAuth();

  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  // id уже загруженного документа — чтобы «Повторить» не грузил файл заново.
  const [docId, setDocId] = useState<string | null>(null);

  function reset() {
    setPhase('idle');
    setError(null);
    setPreviewUri(null);
    setDocId(null);
  }

  async function pick(source: 'camera' | 'library'): Promise<Picked | null> {
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

  // Распознаём и уходим на разбор документа. Ошибку показываем с «Повторить».
  async function runProcessing(id: string) {
    setPhase('processing');
    setError(null);
    try {
      await processDocument(id);
      router.replace(`/document/${id}`);
      reset();
    } catch (e) {
      setError(
        (e instanceof Error ? e.message : '') ||
          'Не удалось распознать анализ. Попробуйте ещё раз.',
      );
      setPhase('error');
    }
  }

  async function handleAdd(source: 'camera' | 'library') {
    if (!session) return;
    setError(null);
    const picked = await pick(source);
    if (!picked) return;

    setPreviewUri(picked.uri);
    setPhase('uploading');
    try {
      const doc = await uploadDocument({
        userId: session.user.id,
        base64: picked.base64,
        mimeType: picked.mimeType,
      });
      setDocId(doc.id);
      await runProcessing(doc.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить анализ.');
      setPhase('error');
    }
  }

  const busy = phase === 'uploading' || phase === 'processing';

  return (
    <Screen>
      <ThemedText type="subtitle">Добавить анализ</ThemedText>
      <ThemedText type="default" themeColor="textSecondary">
        Сфотографируйте бумажный бланк анализа или выберите фото из галереи.
        Приложение распознает показатели и объяснит их простым языком.
      </ThemedText>

      {previewUri && (
        <Image source={{ uri: previewUri }} style={styles.preview} resizeMode="cover" />
      )}

      {busy ? (
        <View style={styles.state}>
          <ActivityIndicator color={theme.tint} />
          <ThemedText type="small" themeColor="textSecondary">
            {phase === 'uploading' ? 'Загружаем…' : 'Распознаём анализ…'}
          </ThemedText>
        </View>
      ) : phase === 'error' ? (
        <View style={styles.state}>
          <ThemedText type="small" style={{ color: theme.warning }}>
            {error}
          </ThemedText>
          {docId ? (
            // Файл уже загружен — повторяем только распознавание.
            <Pressable
              accessibilityRole="button"
              style={[styles.button, { backgroundColor: theme.tint }]}
              onPress={() => runProcessing(docId)}>
              <ThemedText style={styles.buttonText}>Повторить</ThemedText>
            </Pressable>
          ) : null}
          <View style={styles.rowLinks}>
            {docId && (
              <Pressable
                accessibilityRole="button"
                style={styles.linkButton}
                onPress={() => {
                  router.replace(`/document/${docId}`);
                  reset();
                }}>
                <ThemedText type="small" themeColor="textSecondary">
                  Открыть документ
                </ThemedText>
              </Pressable>
            )}
            <Pressable accessibilityRole="button" style={styles.linkButton} onPress={reset}>
              <ThemedText type="small" themeColor="textSecondary">
                Начать заново
              </ThemedText>
            </Pressable>
          </View>
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
  rowLinks: {
    flexDirection: 'row',
    gap: Spacing.four,
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
    alignSelf: 'stretch',
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
    alignSelf: 'stretch',
  },
  buttonOutlineText: {
    fontWeight: '600',
    fontSize: 16,
  },
  linkButton: {
    paddingVertical: Spacing.two,
  },
});

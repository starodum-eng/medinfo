import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { Disclaimer } from '@/components/disclaimer';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import type { DocumentRow } from '@/types/db';

export default function HistoryScreen() {
  const theme = useTheme();
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    // Типизированный запрос: строки приходят как DocumentRow[]. RLS вернёт только свои.
    const { data, error: qError } = await supabase
      .from('documents')
      .select('*')
      .order('taken_at', { ascending: false });
    if (qError) {
      setError('Не удалось загрузить историю. Потяните, чтобы обновить позже.');
      setDocuments([]);
    } else {
      setDocuments(data ?? []);
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <Screen>
      <ThemedText type="subtitle">История</ThemedText>
      <Disclaimer />

      {loading ? (
        <View style={styles.state}>
          <ActivityIndicator color={theme.tint} />
        </View>
      ) : error ? (
        <ThemedText type="default" style={{ color: theme.warning }}>
          {error}
        </ThemedText>
      ) : documents.length === 0 ? (
        <ThemedText type="default" themeColor="textSecondary" style={styles.placeholder}>
          Здесь появится история ваших анализов и графики динамики показателей.
          Пока данных нет — добавьте первый анализ на вкладке «Добавить».
        </ThemedText>
      ) : (
        documents.map((doc) => (
          <View
            key={doc.id}
            style={[styles.card, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="default">{doc.taken_at ?? 'Дата не указана'}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Статус: {doc.status}
            </ThemedText>
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  state: {
    paddingVertical: Spacing.four,
    alignItems: 'center',
  },
  placeholder: {
    marginTop: Spacing.one,
  },
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.one,
  },
});

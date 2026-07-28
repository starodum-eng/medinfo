import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Disclaimer } from '@/components/disclaimer';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { statusLabel } from '@/lib/labels';
import { supabase } from '@/lib/supabase';
import type { DocumentRow } from '@/types/db';

type DocCard = DocumentRow & { resultsCount: number; hasUrgent: boolean; hasFlag: boolean };

export default function HistoryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [docs, setDocs] = useState<DocCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    // Документы + сводка по показателям и красным флагам (всё под RLS — только свои).
    const [docsRes, resRes, flagRes] = await Promise.all([
      supabase.from('documents').select('*').order('uploaded_at', { ascending: false }),
      supabase.from('lab_results').select('document_id'),
      supabase.from('red_flags').select('document_id, severity'),
    ]);

    if (docsRes.error) {
      setError('Не удалось загрузить историю. Попробуйте позже.');
      setDocs([]);
      setLoading(false);
      return;
    }

    const counts = new Map<string, number>();
    for (const row of resRes.data ?? []) {
      counts.set(row.document_id, (counts.get(row.document_id) ?? 0) + 1);
    }
    const urgentDocs = new Set<string>();
    const flaggedDocs = new Set<string>();
    for (const f of flagRes.data ?? []) {
      if (!f.document_id) continue;
      flaggedDocs.add(f.document_id);
      if (f.severity === 'urgent') urgentDocs.add(f.document_id);
    }

    setDocs(
      (docsRes.data ?? []).map((d) => ({
        ...d,
        resultsCount: counts.get(d.id) ?? 0,
        hasUrgent: urgentDocs.has(d.id),
        hasFlag: flaggedDocs.has(d.id),
      })),
    );
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
      ) : docs.length === 0 ? (
        <ThemedText type="default" themeColor="textSecondary" style={styles.placeholder}>
          Здесь появится история ваших анализов. Пока данных нет — добавьте
          первый анализ на вкладке «Добавить».
        </ThemedText>
      ) : (
        docs.map((doc) => {
          const icon = doc.hasUrgent ? '⚠️' : doc.hasFlag ? '❗' : '';
          return (
            <Pressable
              key={doc.id}
              accessibilityRole="button"
              onPress={() => router.push(`/document/${doc.id}`)}
              style={[
                styles.card,
                { borderColor: doc.hasUrgent ? theme.danger : theme.border, backgroundColor: theme.backgroundElement },
              ]}>
              <View style={styles.cardHeader}>
                <ThemedText type="default" style={styles.date}>
                  {doc.taken_at ?? 'Дата не указана'}
                </ThemedText>
                {icon ? <ThemedText style={styles.icon}>{icon}</ThemedText> : null}
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                {statusLabel(doc.status)}
                {doc.status === 'processed' ? ` · показателей: ${doc.resultsCount}` : ''}
              </ThemedText>
            </Pressable>
          );
        })
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  date: {
    fontWeight: '600',
  },
  icon: {
    fontSize: 16,
  },
});

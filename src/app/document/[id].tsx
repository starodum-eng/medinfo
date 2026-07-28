import { useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Disclaimer } from '@/components/disclaimer';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { processDocument } from '@/lib/documents';
import { flagColor, flagLabel, statusLabel } from '@/lib/labels';
import { supabase } from '@/lib/supabase';
import type { DocumentRow, LabResult, RedFlag } from '@/types/db';

export default function DocumentDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [doc, setDoc] = useState<DocumentRow | null>(null);
  const [results, setResults] = useState<LabResult[]>([]);
  const [redFlags, setRedFlags] = useState<RedFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    // Всё типизированно и под RLS — вернутся только свои строки.
    const [docRes, resRes, flagRes] = await Promise.all([
      supabase.from('documents').select('*').eq('id', id).single(),
      supabase.from('lab_results').select('*').eq('document_id', id).order('analyte_name'),
      supabase.from('red_flags').select('*').eq('document_id', id).order('severity'),
    ]);
    if (docRes.error || !docRes.data) {
      setError('Документ не найден.');
      setLoading(false);
      return;
    }
    setDoc(docRes.data);
    setResults(resRes.data ?? []);
    setRedFlags(flagRes.data ?? []);
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function runProcessing() {
    if (!id) return;
    setProcessing(true);
    setError(null);
    try {
      await processDocument(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось распознать анализ.');
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <Screen scroll={false} contentStyle={styles.center}>
        <ActivityIndicator color={theme.tint} />
      </Screen>
    );
  }

  if (error && !doc) {
    return (
      <Screen>
        <ThemedText type="default" style={{ color: theme.warning }}>
          {error}
        </ThemedText>
      </Screen>
    );
  }

  const urgent = redFlags.filter((f) => f.severity === 'urgent');
  const warns = redFlags.filter((f) => f.severity === 'warn');
  const isProcessed = doc?.status === 'processed';

  return (
    <Screen>
      {/* Заметный баннер «к врачу» при срочных красных флагах. */}
      {urgent.length > 0 && (
        <View style={[styles.banner, { backgroundColor: theme.dangerBackground, borderColor: theme.danger }]}>
          <ThemedText type="default" style={[styles.bannerTitle, { color: theme.danger }]}>
            Обратитесь к врачу
          </ThemedText>
          {urgent.map((f) => (
            <ThemedText key={f.id} type="small" style={{ color: theme.danger }}>
              {f.message}
            </ThemedText>
          ))}
        </View>
      )}

      <ThemedText type="subtitle">
        {doc?.taken_at ? `Анализ от ${doc.taken_at}` : 'Анализ'}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Статус: {doc ? statusLabel(doc.status) : '—'}
        {isProcessed ? ` · показателей: ${results.length}` : ''}
      </ThemedText>

      {/* Умеренные предупреждения (warn) — спокойным тоном. */}
      {warns.length > 0 && (
        <View style={[styles.warnBox, { backgroundColor: theme.warningBackground, borderColor: theme.warning }]}>
          {warns.map((f) => (
            <ThemedText key={f.id} type="small" style={{ color: theme.warning }}>
              {f.message}
            </ThemedText>
          ))}
        </View>
      )}

      {/* Не обработан / ошибка — предлагаем запустить распознавание. */}
      {doc && doc.status !== 'processed' && (
        <View style={styles.state}>
          {doc.status === 'failed' && (
            <ThemedText type="small" style={{ color: theme.warning }}>
              Прошлая попытка распознавания не удалась.
            </ThemedText>
          )}
          <Pressable
            accessibilityRole="button"
            disabled={processing}
            style={[styles.button, { backgroundColor: theme.tint, opacity: processing ? 0.6 : 1 }]}
            onPress={runProcessing}>
            {processing ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <ThemedText style={styles.buttonText}>
                {doc.status === 'failed' ? 'Повторить распознавание' : 'Обработать'}
              </ThemedText>
            )}
          </Pressable>
        </View>
      )}

      {error && doc && (
        <ThemedText type="small" style={{ color: theme.warning }}>
          {error}
        </ThemedText>
      )}

      {/* Показатели */}
      {isProcessed && results.length === 0 && (
        <ThemedText type="default" themeColor="textSecondary">
          Не удалось выделить показатели на этом фото. Попробуйте более чёткий
          снимок бумажного бланка.
        </ThemedText>
      )}

      {results.map((r) => {
        const color = flagColor(r.flag, theme);
        const valueStr =
          r.value !== null ? `${r.value}${r.unit ? ` ${r.unit}` : ''}` : (r.value_text ?? '—');
        const refStr =
          r.ref_low !== null || r.ref_high !== null
            ? `Референс: ${r.ref_low ?? '—'}–${r.ref_high ?? '—'}${r.unit ? ` ${r.unit}` : ''}`
            : null;
        return (
          <View
            key={r.id}
            style={[styles.card, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
            <View style={styles.cardHeader}>
              <ThemedText type="default" style={styles.analyte}>
                {r.analyte_name}
              </ThemedText>
              <View style={[styles.badge, { borderColor: color }]}>
                <ThemedText type="small" style={{ color }}>
                  {flagLabel(r.flag)}
                </ThemedText>
              </View>
            </View>
            <ThemedText type="default" style={{ color }}>
              {valueStr}
            </ThemedText>
            {refStr && (
              <ThemedText type="small" themeColor="textSecondary">
                {refStr}
              </ThemedText>
            )}
            {r.explanation && (
              <ThemedText type="small" themeColor="textSecondary">
                {r.explanation}
              </ThemedText>
            )}
          </View>
        );
      })}

      <Disclaimer />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    gap: Spacing.one,
  },
  bannerTitle: {
    fontWeight: '700',
  },
  warnBox: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.one,
  },
  state: {
    gap: Spacing.two,
    alignItems: 'flex-start',
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
    gap: Spacing.two,
  },
  analyte: {
    flex: 1,
    fontWeight: '600',
  },
  badge: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
});

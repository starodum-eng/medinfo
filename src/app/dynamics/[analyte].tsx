import { useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Disclaimer } from '@/components/disclaimer';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { TrendChart, type TrendPoint } from '@/components/trend-chart';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { flagColor, flagLabel } from '@/lib/labels';
import { supabase } from '@/lib/supabase';
import type { LabResult } from '@/types/db';

export default function AnalyteDynamicsScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ analyte: string | string[] }>();
  const raw = Array.isArray(params.analyte) ? params.analyte[0] : params.analyte;
  const analyte = raw ? decodeURIComponent(raw) : '';

  const [rows, setRows] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!analyte) {
      setError('Показатель не указан.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: qErr } = await supabase
      .from('lab_results')
      .select('*')
      .eq('analyte_name', analyte)
      .order('measured_at', { ascending: true });
    if (qErr) {
      setError('Не удалось загрузить данные показателя.');
      setRows([]);
    } else {
      setRows(data ?? []);
    }
    setLoading(false);
  }, [analyte]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading) {
    return (
      <Screen scroll={false} contentStyle={styles.center}>
        <ActivityIndicator color={theme.tint} />
      </Screen>
    );
  }

  // Для графика нужны числовые значения с датой.
  const numeric = rows.filter((r) => r.value !== null && r.measured_at);
  const points: TrendPoint[] = numeric.map((r) => ({
    y: r.value as number,
    date: r.measured_at,
    flag: r.flag,
  }));
  const latest = rows.length ? rows[rows.length - 1] : null;
  const unit = latest?.unit ?? numeric[numeric.length - 1]?.unit ?? null;
  const refLow = latest?.ref_low ?? null;
  const refHigh = latest?.ref_high ?? null;

  return (
    <Screen>
      <ThemedText type="subtitle">{analyte || 'Показатель'}</ThemedText>

      {error ? (
        <ThemedText type="default" style={{ color: theme.warning }}>
          {error}
        </ThemedText>
      ) : rows.length === 0 ? (
        <ThemedText type="default" themeColor="textSecondary">
          Нет данных по этому показателю.
        </ThemedText>
      ) : (
        <>
          {(refLow !== null || refHigh !== null) && (
            <ThemedText type="small" themeColor="textSecondary">
              Референс: {refLow ?? '—'}–{refHigh ?? '—'}
              {unit ? ` ${unit}` : ''}
            </ThemedText>
          )}

          {points.length >= 2 ? (
            <TrendChart points={points} unit={unit} refLow={refLow} refHigh={refHigh} />
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              Для графика нужно минимум два измерения с числовым значением. Пока
              есть {points.length === 1 ? 'одно' : 'ни одного'} — добавьте ещё
              анализ с этим показателем.
            </ThemedText>
          )}

          {/* Все измерения списком, свежие сверху */}
          {[...rows].reverse().map((r) => {
            const color = flagColor(r.flag, theme);
            const valueStr =
              r.value !== null ? `${r.value}${r.unit ? ` ${r.unit}` : ''}` : (r.value_text ?? '—');
            return (
              <View
                key={r.id}
                style={[styles.row, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
                <View style={styles.rowLeft}>
                  <ThemedText type="default" style={{ color }}>
                    {valueStr}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {r.measured_at ?? 'дата не указана'}
                  </ThemedText>
                </View>
                <View style={[styles.badge, { borderColor: color }]}>
                  <ThemedText type="small" style={{ color }}>
                    {flagLabel(r.flag)}
                  </ThemedText>
                </View>
              </View>
            );
          })}
        </>
      )}

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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  rowLeft: {
    gap: 2,
  },
  badge: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
});

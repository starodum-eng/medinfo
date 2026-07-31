import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { flagColor, flagLabel } from '@/lib/labels';
import { supabase } from '@/lib/supabase';
import type { LabFlag } from '@/types/db';

type AnalyteSummary = {
  name: string;
  count: number;
  latestValue: number | null;
  latestText: string | null;
  unit: string | null;
  flag: LabFlag;
  latestDate: string | null;
};

export default function DynamicsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [items, setItems] = useState<AnalyteSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: qErr } = await supabase
      .from('lab_results')
      .select('analyte_name, value, value_text, unit, flag, measured_at')
      .order('measured_at', { ascending: true });

    if (qErr) {
      setError('Не удалось загрузить показатели. Попробуйте позже.');
      setItems([]);
      setLoading(false);
      return;
    }

    // Группируем по названию показателя, берём последнее измерение как «текущее».
    const byName = new Map<string, AnalyteSummary>();
    for (const r of data ?? []) {
      const prev = byName.get(r.analyte_name);
      if (!prev) {
        byName.set(r.analyte_name, {
          name: r.analyte_name,
          count: 1,
          latestValue: r.value,
          latestText: r.value_text,
          unit: r.unit,
          flag: r.flag,
          latestDate: r.measured_at,
        });
      } else {
        prev.count += 1;
        // data отсортирована по возрастанию даты → последняя строка и есть свежая.
        prev.latestValue = r.value;
        prev.latestText = r.value_text;
        prev.unit = r.unit;
        prev.flag = r.flag;
        prev.latestDate = r.measured_at;
      }
    }
    const list = [...byName.values()].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    setItems(list);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <Screen>
      <ThemedText type="subtitle">Динамика</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Показатели из ваших анализов. Нажмите, чтобы увидеть график изменений во времени.
      </ThemedText>

      {loading ? (
        <View style={styles.state}>
          <ActivityIndicator color={theme.tint} />
        </View>
      ) : error ? (
        <ThemedText type="default" style={{ color: theme.warning }}>
          {error}
        </ThemedText>
      ) : items.length === 0 ? (
        <ThemedText type="default" themeColor="textSecondary" style={styles.placeholder}>
          Пока нет распознанных показателей. Добавьте анализ на вкладке «Добавить».
        </ThemedText>
      ) : (
        items.map((it) => {
          const color = flagColor(it.flag, theme);
          const valueStr =
            it.latestValue !== null
              ? `${it.latestValue}${it.unit ? ` ${it.unit}` : ''}`
              : (it.latestText ?? '—');
          return (
            <Pressable
              key={it.name}
              accessibilityRole="button"
              onPress={() => router.push(`/dynamics/${encodeURIComponent(it.name)}`)}
              style={[styles.card, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
              <View style={styles.rowTop}>
                <ThemedText type="default" style={styles.name}>
                  {it.name}
                </ThemedText>
                <ThemedText style={styles.chevron} themeColor="textSecondary">
                  ›
                </ThemedText>
              </View>
              <View style={styles.rowBottom}>
                <ThemedText type="default" style={{ color }}>
                  {valueStr}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {it.count === 1 ? '1 измерение' : `${it.count} измерений`} · {flagLabel(it.flag)}
                </ThemedText>
              </View>
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
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  name: {
    fontWeight: '600',
    flex: 1,
  },
  chevron: {
    fontSize: 22,
  },
});

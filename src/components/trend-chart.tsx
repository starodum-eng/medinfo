import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { flagColor } from '@/lib/labels';
import { useTheme } from '@/hooks/use-theme';
import type { LabFlag } from '@/types/db';

export type TrendPoint = { y: number; date: string | null; flag: LabFlag };

type Props = {
  points: TrendPoint[]; // отсортированы по дате по возрастанию
  unit?: string | null;
  refLow?: number | null;
  refHigh?: number | null;
};

const H = 200;
const PAD_L = 40;
const PAD_R = 14;
const PAD_T = 14;
const PAD_B = 26;

function fmt(n: number): string {
  // Компактно: целые без дробей, иначе до 2 знаков.
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

/**
 * Простой линейный график динамики показателя во времени на react-native-svg
 * (работает и на нативе, и на web). Референсный коридор — светлая полоса,
 * точки окрашены по флагу (норма/отклонение/критично).
 */
export function TrendChart({ points, unit, refLow, refHigh }: Props) {
  const theme = useTheme();
  const [w, setW] = useState(0);

  const n = points.length;
  const values = points.map((p) => p.y);
  const candidates = [...values];
  if (typeof refLow === 'number') candidates.push(refLow);
  if (typeof refHigh === 'number') candidates.push(refHigh);
  let min = Math.min(...candidates);
  let max = Math.max(...candidates);
  if (min === max) {
    // Плоская линия — раздвигаем, чтобы было видно.
    min -= 1;
    max += 1;
  }
  const pad = (max - min) * 0.1;
  min -= pad;
  max += pad;

  const plotW = Math.max(w - PAD_L - PAD_R, 1);
  const plotH = H - PAD_T - PAD_B;
  const x = (i: number) => (n === 1 ? PAD_L + plotW / 2 : PAD_L + (i / (n - 1)) * plotW);
  const y = (v: number) => PAD_T + (1 - (v - min) / (max - min)) * plotH;

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.y).toFixed(1)}`)
    .join(' ');

  const hasBand = typeof refLow === 'number' && typeof refHigh === 'number';

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ width: '100%' }}>
      {w > 0 && (
        <Svg width={w} height={H}>
          {/* Референсный коридор */}
          {hasBand && (
            <Rect
              x={PAD_L}
              y={y(refHigh as number)}
              width={plotW}
              height={Math.max(y(refLow as number) - y(refHigh as number), 0)}
              fill={theme.ok}
              opacity={0.12}
            />
          )}
          {/* Рамка области графика (низ и лево) */}
          <Line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + plotH} stroke={theme.border} strokeWidth={1} />
          <Line
            x1={PAD_L}
            y1={PAD_T + plotH}
            x2={PAD_L + plotW}
            y2={PAD_T + plotH}
            stroke={theme.border}
            strokeWidth={1}
          />

          {/* Линия тренда */}
          {n > 1 && <Path d={linePath} stroke={theme.tint} strokeWidth={2} fill="none" />}

          {/* Точки, окрашенные по флагу */}
          {points.map((p, i) => (
            <Circle key={i} cx={x(i)} cy={y(p.y)} r={4} fill={flagColor(p.flag, theme)} />
          ))}

          {/* Подписи оси Y: макс сверху, мин снизу */}
          <SvgText x={PAD_L - 6} y={PAD_T + 4} fontSize={10} fill={theme.textSecondary} textAnchor="end">
            {fmt(max)}
          </SvgText>
          <SvgText x={PAD_L - 6} y={PAD_T + plotH} fontSize={10} fill={theme.textSecondary} textAnchor="end">
            {fmt(min)}
          </SvgText>

          {/* Подписи оси X: первая и последняя дата */}
          {points[0]?.date && (
            <SvgText x={x(0)} y={H - 8} fontSize={10} fill={theme.textSecondary} textAnchor="start">
              {points[0].date}
            </SvgText>
          )}
          {n > 1 && points[n - 1]?.date && (
            <SvgText x={PAD_L + plotW} y={H - 8} fontSize={10} fill={theme.textSecondary} textAnchor="end">
              {points[n - 1].date}
            </SvgText>
          )}

          {/* Единицы измерения в углу */}
          {unit ? (
            <SvgText x={PAD_L} y={PAD_T - 4} fontSize={10} fill={theme.textSecondary} textAnchor="start">
              {unit}
            </SvgText>
          ) : null}
        </Svg>
      )}
    </View>
  );
}

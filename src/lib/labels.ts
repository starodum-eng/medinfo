import type { Colors } from '@/constants/theme';
import type { DocumentStatus, LabFlag } from '@/types/db';

// Ключи темы, но значения — просто string, чтобы подходили и light, и dark
// (в theme.ts значения заданы литералами `as const`).
type ThemeColors = { [K in keyof (typeof Colors)['light']]: string };

// Человеческое русское название флага показателя.
export function flagLabel(flag: LabFlag): string {
  switch (flag) {
    case 'normal':
      return 'норма';
    case 'low':
      return 'ниже нормы';
    case 'high':
      return 'выше нормы';
    case 'critical_low':
      return 'сильно ниже нормы';
    case 'critical_high':
      return 'сильно выше нормы';
    default:
      return 'без оценки';
  }
}

// Цвет метки флага: норма — зелёный, отклонение — янтарный, критическое — красный.
export function flagColor(flag: LabFlag, theme: ThemeColors): string {
  switch (flag) {
    case 'normal':
      return theme.ok;
    case 'low':
    case 'high':
      return theme.warning;
    case 'critical_low':
    case 'critical_high':
      return theme.danger;
    default:
      return theme.textSecondary;
  }
}

// Русский статус документа.
export function statusLabel(status: DocumentStatus): string {
  switch (status) {
    case 'pending':
      return 'ожидает обработки';
    case 'processed':
      return 'обработан';
    case 'failed':
      return 'ошибка обработки';
  }
}

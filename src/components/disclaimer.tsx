import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Ключевой дисклеймер продукта. Приложение — это информация и хранилище,
 * а не диагноз и не замена врачу. Показывается на ключевых экранах.
 * Текст менять нельзя без явного согласования — это несущая стена продукта.
 */
export const DISCLAIMER_TEXT =
  'Это информация, не диагноз и не замена консультации врача.';

export function Disclaimer() {
  const theme = useTheme();

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.container,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
      ]}>
      <ThemedText style={styles.icon}>ⓘ</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.text}>
        {DISCLAIMER_TEXT}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
  },
  icon: {
    fontSize: 16,
  },
  text: {
    flex: 1,
  },
});

import { ScrollView, StyleSheet, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

type ScreenProps = {
  children: React.ReactNode;
  /** Прокручивать содержимое (для длинных экранов). По умолчанию — да. */
  scroll?: boolean;
  contentStyle?: ViewStyle;
};

/**
 * Единая обёртка экрана: фон по теме, безопасные отступы, ограничение ширины
 * на планшетах/вебе. Используется всеми экранами-заглушками.
 */
export function Screen({ children, scroll = true, contentStyle }: ScreenProps) {
  const inner = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.content, contentStyle]}
      keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    <ThemedView style={[styles.content, styles.flex, contentStyle]}>{children}</ThemedView>
  );

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        {inner}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
});

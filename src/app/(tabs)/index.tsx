import { StyleSheet } from 'react-native';

import { Disclaimer } from '@/components/disclaimer';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';

export default function HistoryScreen() {
  return (
    <Screen>
      <ThemedText type="subtitle">История</ThemedText>
      <Disclaimer />
      <ThemedText type="default" themeColor="textSecondary" style={styles.placeholder}>
        Здесь появится история ваших анализов и графики динамики показателей.
        Пока данных нет — добавьте первый анализ на вкладке «Добавить».
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    marginTop: 8,
  },
});

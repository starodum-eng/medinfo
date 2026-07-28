import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';

export default function RemindersScreen() {
  return (
    <Screen>
      <ThemedText type="subtitle">Напоминания</ThemedText>
      <ThemedText type="default" themeColor="textSecondary">
        Здесь будут напоминания пересдать анализ, о приёме лекарств и визите
        к врачу. Пуш-уведомления подключим на этапе напоминаний.
      </ThemedText>
    </Screen>
  );
}

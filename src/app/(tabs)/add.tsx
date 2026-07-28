import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';

export default function AddScreen() {
  return (
    <Screen>
      <ThemedText type="subtitle">Добавить анализ</ThemedText>
      <ThemedText type="default" themeColor="textSecondary">
        Здесь можно будет сфотографировать бумажный анализ или загрузить фото.
        Распознавание показателей появится на следующем этапе.
      </ThemedText>
    </Screen>
  );
}

# HealthVault

Мобильное приложение: личная медкарта + переводчик анализов на простой язык + напоминания.
Пользователь фотографирует бумажный анализ, приложение распознаёт показатели, объясняет их
простым языком, хранит историю и строит графики динамики.

> **Важно:** приложение — это информация и хранилище (personal health record), а **не диагноз и
> не замена консультации врача**. Полные правила продукта — в [`CLAUDE.md`](./CLAUDE.md).

## Стек

- **Клиент:** React Native + Expo (TypeScript), навигация — expo-router.
- **Бэкенд:** Supabase (Postgres + Auth + Storage + Edge Functions).
- Распознавание анализов (Gemini Flash), пуши (Expo Notifications) и графики подключаются
  на следующих этапах.

## Запуск

```bash
# 1. Установить зависимости
npm install

# 2. Настроить окружение
cp .env.example .env
# затем заполнить EXPO_PUBLIC_SUPABASE_URL и EXPO_PUBLIC_SUPABASE_ANON_KEY

# 3. Запустить дев-сервер Expo
npx expo start
```

После запуска откройте приложение в Expo Go (QR-код в терминале), в эмуляторе iOS/Android
(`i` / `a`) или в браузере (`w`).

## Структура

```
src/
├── app/                  # маршруты expo-router
│   ├── _layout.tsx       # корневой Stack (login + tabs)
│   ├── index.tsx         # редирект на /login
│   ├── login.tsx         # экран «Вход» (заглушка)
│   └── (tabs)/           # нижние вкладки
│       ├── index.tsx     # «Главная» — история (+ дисклеймер)
│       ├── add.tsx       # «Добавить анализ»
│       ├── reminders.tsx # «Напоминания»
│       └── profile.tsx   # «Профиль» (+ дисклеймер)
├── components/           # Disclaimer, Screen, ThemedText/ThemedView
├── constants/theme.ts    # цвета, отступы, шрифты
├── hooks/                # useTheme, useColorScheme
└── lib/supabase.ts       # клиент Supabase (ключи из EXPO_PUBLIC_*)
```

## Переменные окружения

| Переменная | Описание |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | URL проекта Supabase |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Публичный anon-ключ (безопасен для клиента при включённом RLS) |

Секретные ключи (service_role, Gemini API) в клиент **не** попадают — только в секреты
Supabase Edge Functions.

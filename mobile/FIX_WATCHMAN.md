# 🔧 Исправление ошибки watchman

## Проблема:
```
Error: std::__1::system_error: open: Operation not permitted
```

Это ошибка прав доступа watchman к директории проекта.

## ✅ Решение:

### Способ 1: Перезапустить watchman (уже сделано)

```bash
watchman watch-del '/Users/rakhat/Documents/webhosting/wwp-inventory/mobile'
watchman watch-project '/Users/rakhat/Documents/webhosting/wwp-inventory/mobile'
```

### Способ 2: Настроить права доступа

Если проблема сохраняется, проверьте права доступа к директории:

```bash
# Проверить права
ls -la /Users/rakhat/Documents/webhosting/wwp-inventory/mobile

# Установить правильные права (если нужно)
chmod -R u+rw /Users/rakhat/Documents/webhosting/wwp-inventory/mobile
```

### Способ 3: Перезапустить watchman сервис

```bash
watchman shutdown-server
watchman watch-project '/Users/rakhat/Documents/webhosting/wwp-inventory/mobile'
```

### Способ 4: Отключить watchman (временное решение)

Можно запустить Expo без watchman:

```bash
npx expo start --tunnel --android --no-watchman
```

Или установить переменную окружения:
```bash
export EXPO_NO_WATCHMAN=1
npx expo start --tunnel --android
```

## 📝 Также установлен @expo/ngrok

Для tunnel режима был установлен `@expo/ngrok@^4.1.0` - это необходимо для работы tunnel.

## 🚀 После исправления:

Запустите Expo заново:
```bash
cd mobile
npx expo start --tunnel --android
```

Теперь должно работать без ошибок!




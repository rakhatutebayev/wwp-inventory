#!/bin/bash

# Скрипт для запуска Android эмулятора и приложения

set -e

echo "🚀 Запуск Android эмулятора для WWP Inventory"
echo ""

# Проверка наличия Android SDK
if [ -z "$ANDROID_HOME" ]; then
    echo "❌ ANDROID_HOME не установлен!"
    echo "Добавьте в ~/.zshrc:"
    echo "export ANDROID_HOME=\$HOME/Library/Android/sdk"
    echo "export PATH=\$PATH:\$ANDROID_HOME/emulator"
    echo "export PATH=\$PATH:\$ANDROID_HOME/platform-tools"
    exit 1
fi

# Проверка наличия adb
if ! command -v adb &> /dev/null; then
    echo "❌ adb не найден в PATH!"
    echo "Убедитесь, что Android SDK установлен и PATH настроен правильно"
    exit 1
fi

# Проверка наличия emulator
if ! command -v emulator &> /dev/null; then
    echo "❌ emulator не найден в PATH!"
    echo "Убедитесь, что Android Emulator установлен через Android Studio"
    exit 1
fi

# Получение списка доступных эмуляторов
AVDS=$(emulator -list-avds)

if [ -z "$AVDS" ]; then
    echo "❌ Не найдено ни одного эмулятора!"
    echo "Создайте эмулятор через Android Studio: Tools → Device Manager → Create Device"
    exit 1
fi

# Проверка запущенных эмуляторов
RUNNING_DEVICES=$(adb devices | grep "emulator" | wc -l | tr -d ' ')

if [ "$RUNNING_DEVICES" -gt 0 ]; then
    echo "✅ Найден запущенный эмулятор"
    adb devices
else
    echo "📱 Доступные эмуляторы:"
    echo "$AVDS" | nl
    echo ""
    
    # Использование первого доступного эмулятора
    FIRST_AVD=$(echo "$AVDS" | head -n 1)
    echo "🚀 Запускаю эмулятор: $FIRST_AVD"
    echo ""
    
    # Запуск эмулятора в фоне
    emulator -avd "$FIRST_AVD" > /dev/null 2>&1 &
    EMULATOR_PID=$!
    
    echo "⏳ Ожидание загрузки эмулятора..."
    
    # Ожидание загрузки эмулятора (максимум 120 секунд)
    TIMEOUT=120
    ELAPSED=0
    while [ $ELAPSED -lt $TIMEOUT ]; do
        if adb devices | grep -q "emulator.*device"; then
            echo "✅ Эмулятор готов!"
            break
        fi
        sleep 2
        ELAPSED=$((ELAPSED + 2))
        echo -n "."
    done
    echo ""
    
    if [ $ELAPSED -ge $TIMEOUT ]; then
        echo "❌ Таймаут ожидания эмулятора"
        kill $EMULATOR_PID 2>/dev/null || true
        exit 1
    fi
fi

# Переход в папку mobile
cd "$(dirname "$0")"

# Проверка наличия node_modules
if [ ! -d "node_modules" ]; then
    echo "📦 Установка зависимостей..."
    npm install
fi

# Запуск Expo с Android
echo ""
echo "🚀 Запуск приложения..."
echo ""
npm run android




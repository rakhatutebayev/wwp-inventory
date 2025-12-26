#!/bin/bash

# Скрипт для сборки и установки APK на эмулятор без Expo Go

set -e

source ~/.zshrc

echo "🔨 Сборка APK для Android эмулятора"
echo ""

cd "$(dirname "$0")"

# Проверка эмулятора
if ! adb devices | grep -q "emulator.*device"; then
    echo "❌ Эмулятор не запущен!"
    echo "Запустите эмулятор и попробуйте снова"
    exit 1
fi

echo "✅ Эмулятор найден"
echo ""

# Проверка EAS CLI
if ! command -v eas &> /dev/null; then
    echo "📦 Установка EAS CLI..."
    npm install -g eas-cli
fi

echo "🔨 Начинаю сборку APK..."
echo "⚠️  Это может занять несколько минут..."
echo ""

# Сборка development APK локально
eas build --platform android --profile development --local --non-interactive || {
    echo ""
    echo "❌ Локальная сборка не удалась"
    echo ""
    echo "💡 Альтернативный способ:"
    echo "   1. Запустите: eas build --platform android --profile development"
    echo "   2. Дождитесь завершения сборки в облаке"
    echo "   3. Скачайте APK и установите: adb install <путь_к_apk>"
    exit 1
}

# Поиск собранного APK
APK_FILE=$(find . -name "*.apk" -type f -newer package.json | head -1)

if [ -z "$APK_FILE" ]; then
    APK_FILE=$(find . -name "*.apk" -type f | head -1)
fi

if [ -z "$APK_FILE" ]; then
    echo "❌ APK файл не найден"
    echo "Проверьте вывод сборки выше"
    exit 1
fi

echo ""
echo "✅ APK собран: $APK_FILE"
echo ""

# Установка на эмулятор
echo "📱 Установка APK на эмулятор..."
adb install -r "$APK_FILE"

echo ""
echo "✅ Приложение установлено!"
echo ""
echo "🚀 Запуск приложения..."
adb shell monkey -p com.wwp.inventory -c android.intent.category.LAUNCHER 1

echo ""
echo "🎉 Готово! Приложение должно открыться на эмуляторе"
echo ""




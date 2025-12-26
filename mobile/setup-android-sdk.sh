#!/bin/bash

# Скрипт для автоматической установки Android SDK компонентов

set -e

echo "🔧 Настройка Android SDK для WWP Inventory"
echo ""

# Проверка переменных окружения
if [ -z "$ANDROID_HOME" ]; then
    echo "⚠️  ANDROID_HOME не установлен. Загружаю переменные из ~/.zshrc..."
    source ~/.zshrc 2>/dev/null || true
    
    if [ -z "$ANDROID_HOME" ]; then
        export ANDROID_HOME=$HOME/Library/Android/sdk
        export PATH=$PATH:$ANDROID_HOME/emulator
        export PATH=$PATH:$ANDROID_HOME/platform-tools
        export PATH=$PATH:$ANDROID_HOME/tools
        export PATH=$PATH:$ANDROID_HOME/tools/bin
    fi
fi

echo "📁 ANDROID_HOME: $ANDROID_HOME"
echo ""

# Проверка наличия SDK директории
if [ ! -d "$ANDROID_HOME" ]; then
    echo "⚠️  Android SDK еще не создан."
    echo ""
    echo "📋 Для создания SDK выполните следующие шаги:"
    echo ""
    echo "1. Откройте Android Studio:"
    echo "   open -a 'Android Studio'"
    echo ""
    echo "2. При первом запуске:"
    echo "   - Выберите 'Standard' установку"
    echo "   - Дождитесь загрузки компонентов SDK"
    echo "   - Нажмите 'Finish'"
    echo ""
    echo "3. После завершения настройки запустите этот скрипт снова:"
    echo "   ./setup-android-sdk.sh"
    echo ""
    exit 1
fi

# Проверка наличия sdkmanager
SDKMANAGER="$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager"
if [ ! -f "$SDKMANAGER" ]; then
    # Пробуем альтернативные пути
    SDKMANAGER="$ANDROID_HOME/tools/bin/sdkmanager"
    if [ ! -f "$SDKMANAGER" ]; then
        echo "❌ sdkmanager не найден!"
        echo "Установите Command-line Tools через Android Studio:"
        echo "Android Studio → Settings → Appearance & Behavior → System Settings → Android SDK → SDK Tools → Android SDK Command-line Tools"
        exit 1
    fi
fi

echo "✅ Найден sdkmanager: $SDKMANAGER"
echo ""

# Принятие лицензий
echo "📝 Принятие лицензий..."
yes | $SDKMANAGER --licenses > /dev/null 2>&1 || {
    echo "⚠️  Не удалось автоматически принять лицензии"
    echo "Запустите вручную: $SDKMANAGER --licenses"
}

# Установка необходимых компонентов
echo "📦 Установка Android SDK компонентов..."
echo ""

# Платформы
echo "📱 Установка Android Platform (API 33)..."
$SDKMANAGER "platforms;android-33" || echo "⚠️  Не удалось установить API 33"

echo "📱 Установка Android Platform (API 34)..."
$SDKMANAGER "platforms;android-34" || echo "⚠️  Не удалось установить API 34"

# Build Tools
echo "🔨 Установка Build Tools..."
$SDKMANAGER "build-tools;34.0.0" || echo "⚠️  Не удалось установить Build Tools 34.0.0"

# Platform Tools
echo "🛠️  Установка Platform Tools..."
$SDKMANAGER "platform-tools" || echo "⚠️  Не удалось установить Platform Tools"

# Emulator
echo "📱 Установка Android Emulator..."
$SDKMANAGER "emulator" || echo "⚠️  Не удалось установить Emulator"

# System Images
echo "💾 Установка System Images..."
echo "  - Android 13 (API 33) x86_64..."
$SDKMANAGER "system-images;android-33;google_apis;x86_64" || echo "⚠️  Не удалось установить Android 13 x86_64"

echo "  - Android 14 (API 34) x86_64..."
$SDKMANAGER "system-images;android-34;google_apis;x86_64" || echo "⚠️  Не удалось установить Android 14 x86_64"

# Для Apple Silicon Mac
if [[ $(uname -m) == "arm64" ]]; then
    echo "🍎 Обнаружен Apple Silicon, установка ARM64 образов..."
    echo "  - Android 13 (API 33) arm64-v8a..."
    $SDKMANAGER "system-images;android-33;google_apis;arm64-v8a" || echo "⚠️  Не удалось установить Android 13 arm64"
    
    echo "  - Android 14 (API 34) arm64-v8a..."
    $SDKMANAGER "system-images;android-34;google_apis;arm64-v8a" || echo "⚠️  Не удалось установить Android 14 arm64"
fi

echo ""
echo "✅ Установка компонентов завершена!"
echo ""

# Проверка установленных компонентов
echo "📋 Проверка установленных компонентов:"
$SDKMANAGER --list_installed | grep -E "(platforms|build-tools|platform-tools|emulator|system-images)" || true

echo ""
echo "🎉 Настройка SDK завершена!"
echo ""
echo "📱 Теперь создайте эмулятор:"
echo "   1. Откройте Android Studio"
echo "   2. Tools → Device Manager → Create Device"
echo "   3. Выберите устройство (например, Pixel 5)"
echo "   4. Выберите системный образ (Android 13 или 14)"
echo "   5. Нажмите Finish"
echo ""
echo "🚀 Затем запустите приложение:"
echo "   cd mobile && ./start-android.sh"
echo ""




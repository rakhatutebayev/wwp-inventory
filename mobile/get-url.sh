#!/bin/bash

# Скрипт для получения реального Expo URL

cd "$(dirname "$0")"

echo "🔍 Получаю Expo URL..."
echo ""

# Проверить запущен ли Expo
if ! lsof -ti:8081 > /dev/null 2>&1; then
    echo "⚠️  Expo не запущен. Запускаю..."
    npx expo start --tunnel > /tmp/expo-output.log 2>&1 &
    EXPO_PID=$!
    echo "⏳ Ожидание запуска tunnel (30-60 секунд)..."
    sleep 40
else
    echo "✅ Expo уже запущен"
fi

# Попытаться получить URL несколькими способами
echo ""
echo "📋 Получаю URL..."

# Способ 1: Через статусный endpoint
URL1=$(curl -s http://localhost:8081/ 2>/dev/null | python3 -c "import sys, json; data=json.load(sys.stdin); print('exp://' + data.get('expoGo', {}).get('debuggerHost', ''))" 2>/dev/null)

# Способ 2: Через grep в выводе
URL2=$(curl -s http://localhost:8081/ 2>/dev/null | grep -oE "exp://[a-zA-Z0-9-]+\.tunnel\.exp\.direct[^\"]*" | head -1)

# Способ 3: Через лог файл
URL3=$(grep -oE "exp://[a-zA-Z0-9-]+\.tunnel\.exp\.direct[^\"]*" /tmp/expo-output.log 2>/dev/null | head -1)

# Выбрать первый доступный URL
REAL_URL="${URL1:-${URL2:-${URL3}}}"

if [ -n "$REAL_URL" ]; then
    echo ""
    echo "✅ Реальный Expo URL:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "$REAL_URL"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📋 Скопируйте этот URL и используйте в Expo Go или в generate-qr.html"
    echo ""
    
    # Обновить HTML файл если существует
    if [ -f "generate-qr.html" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|value=\"exp://.*\"|value=\"$REAL_URL\"|g" generate-qr.html
        else
            sed -i "s|value=\"exp://.*\"|value=\"$REAL_URL\"|g" generate-qr.html
        fi
        echo "✅ Обновил generate-qr.html с новым URL"
    fi
else
    IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')
    echo ""
    echo "⚠️  Tunnel URL еще не готов. Используйте LAN URL:"
    echo "exp://$IP:8081"
    echo ""
    echo "Или подождите еще 30 секунд и запустите скрипт снова"
fi




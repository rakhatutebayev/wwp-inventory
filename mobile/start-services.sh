#!/bin/bash

# Скрипт для запуска всех необходимых сервисов

set -e

cd "$(dirname "$0")/.."

echo "🚀 Запуск сервисов для мобильной версии"
echo ""

# Проверка backend
if ! lsof -ti:8000 > /dev/null 2>&1; then
    echo "📦 Запуск backend..."
    cd backend
    if [ ! -d "venv" ]; then
        echo "⚠️  Виртуальное окружение не найдено. Создаю..."
        python3 -m venv venv
    fi
    source venv/bin/activate
    pip install -q -r requirements.txt 2>/dev/null || true
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
    BACKEND_PID=$!
    echo "✅ Backend запущен (PID: $BACKEND_PID)"
    cd ..
else
    echo "✅ Backend уже запущен на порту 8000"
fi

# Проверка Expo
if ! lsof -ti:8081 > /dev/null 2>&1; then
    echo ""
    echo "📱 Запуск Expo..."
    cd mobile
    EXPO_NO_WATCHMAN=1 npx expo start --android &
    EXPO_PID=$!
    echo "✅ Expo запущен (PID: $EXPO_PID)"
    cd ..
else
    echo "✅ Expo уже запущен на порту 8081"
fi

echo ""
echo "✅ Все сервисы запущены!"
echo ""
echo "📋 Статус:"
echo "   - Backend: http://localhost:8000"
echo "   - Expo: http://localhost:8081"
echo ""
echo "📱 Для подключения с эмулятора используйте URL:"
IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')
echo "   exp://$IP:8081"
echo ""
echo "💡 Для остановки сервисов нажмите Ctrl+C или выполните:"
echo "   lsof -ti:8000 | xargs kill -9"
echo "   lsof -ti:8081 | xargs kill -9"



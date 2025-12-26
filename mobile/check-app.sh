#!/bin/bash

source ~/.zshrc

echo "🔍 Проверка статуса приложения"
echo ""

echo "1. Проверка эмулятора:"
adb devices
echo ""

echo "2. Проверка Expo процесса:"
lsof -ti:8081 && echo "✅ Expo запущен на порту 8081" || echo "❌ Expo не запущен"
echo ""

echo "3. Проверка установленных пакетов Expo:"
adb shell pm list packages | grep expo
echo ""

echo "4. Текущее активное приложение:"
adb shell "dumpsys window windows | grep -E 'mCurrentFocus'" | head -1
echo ""

echo "5. Попытка открыть приложение:"
IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')
echo "IP адрес: $IP"
echo "URL: exp://$IP:8081"
echo ""

adb shell am start -a android.intent.action.VIEW -d "exp://$IP:8081"
echo ""

echo "6. Проверка логов (последние 5 строк с expo/error):"
adb logcat -d | grep -iE "(expo|error|exception)" | tail -5
echo ""

echo "✅ Проверка завершена"
echo ""
echo "📱 Если приложение не видно:"
echo "   1. Откройте Expo Go на эмуляторе вручную"
echo "   2. Введите URL: exp://$IP:8081"
echo "   3. Или отсканируйте QR код из терминала где запущен Expo"




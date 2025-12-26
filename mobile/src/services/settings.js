import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'

const SETTINGS_KEY = 'app_settings'
const DEFAULT_HOST_IP = '192.168.11.153'
const DEFAULT_PORT = '8000'
const DEFAULT_PROTOCOL = 'http'

// Дефолтные настройки
const getDefaultSettings = () => {
  // Для iOS симулятора используем localhost
  if (Platform.OS === 'ios') {
    return {
      apiHost: 'localhost',
      apiPort: DEFAULT_PORT,
      protocol: DEFAULT_PROTOCOL,
      autoDetect: true, // Автоматическое определение для разработки
    }
  }
  
  // Для Android
  return {
    apiHost: DEFAULT_HOST_IP,
    apiPort: DEFAULT_PORT,
    protocol: DEFAULT_PROTOCOL,
    autoDetect: true, // Автоматическое определение для разработки
  }
}

// Получить настройки
export const getSettings = async () => {
  try {
    const stored = await AsyncStorage.getItem(SETTINGS_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
    return getDefaultSettings()
  } catch (error) {
    console.error('Error getting settings:', error)
    return getDefaultSettings()
  }
}

// Сохранить настройки
export const saveSettings = async (settings) => {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    return true
  } catch (error) {
    console.error('Error saving settings:', error)
    return false
  }
}

// Получить API URL из настроек
export const getApiUrl = async () => {
  const settings = await getSettings()
  
  // Если включено автоматическое определение (для разработки)
  if (settings.autoDetect) {
    if (Platform.OS === 'ios') {
      return 'http://localhost:8000'
    } else if (Platform.OS === 'android') {
      // Для Android эмулятора используем 10.0.2.2 (специальный IP для доступа к хосту)
      // Для реального устройства нужно использовать IP компьютера в локальной сети
      // Проверяем, запущен ли на эмуляторе (можно улучшить проверку)
      return `http://10.0.2.2:${DEFAULT_PORT}`
    }
    return `http://${DEFAULT_HOST_IP}:${DEFAULT_PORT}`
  }
  
  // Используем настройки пользователя
  const host = settings.apiHost || DEFAULT_HOST_IP
  const port = settings.apiPort || DEFAULT_PORT
  const protocol = settings.protocol || DEFAULT_PROTOCOL
  
  // Если порт стандартный (80 для http, 443 для https), не добавляем его в URL
  const portPart = 
    (protocol === 'http' && port === '80') || 
    (protocol === 'https' && port === '443')
      ? '' 
      : `:${port}`
  
  return `${protocol}://${host}${portPart}`
}

// Сбросить настройки к дефолтным
export const resetSettings = async () => {
  try {
    const defaultSettings = getDefaultSettings()
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(defaultSettings))
    return defaultSettings
  } catch (error) {
    console.error('Error resetting settings:', error)
    return getDefaultSettings()
  }
}



import AsyncStorage from '@react-native-async-storage/async-storage'
import ru from './locales/ru'
import en from './locales/en'

const LOCALE_KEY = 'app_locale'
const DEFAULT_LOCALE = 'ru'

const translations = {
  ru,
  en,
}

let currentLocale = DEFAULT_LOCALE

// Загрузить сохраненный язык
export const loadLocale = async () => {
  try {
    const saved = await AsyncStorage.getItem(LOCALE_KEY)
    if (saved && translations[saved]) {
      currentLocale = saved
      return saved
    }
    return DEFAULT_LOCALE
  } catch (error) {
    console.error('Error loading locale:', error)
    return DEFAULT_LOCALE
  }
}

// Сохранить язык
export const saveLocale = async (locale) => {
  try {
    if (translations[locale]) {
      await AsyncStorage.setItem(LOCALE_KEY, locale)
      currentLocale = locale
      return true
    }
    return false
  } catch (error) {
    console.error('Error saving locale:', error)
    return false
  }
}

// Получить текущий язык
export const getLocale = () => currentLocale

// Получить перевод
export const t = (key, params = {}) => {
  const keys = key.split('.')
  let value = translations[currentLocale] || translations[DEFAULT_LOCALE]
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k]
    } else {
      // Если перевод не найден, пробуем русский
      value = translations[DEFAULT_LOCALE]
      for (const k2 of keys) {
        if (value && typeof value === 'object' && k2 in value) {
          value = value[k2]
        } else {
          return key // Возвращаем ключ, если перевод не найден
        }
      }
      break
    }
  }
  
  // Если значение строка, заменяем параметры
  if (typeof value === 'string' && Object.keys(params).length > 0) {
    return value.replace(/\{(\w+)\}/g, (match, key) => params[key] || match)
  }
  
  return typeof value === 'string' ? value : key
}

// Инициализация при загрузке модуля
loadLocale().then(locale => {
  currentLocale = locale
})

export default {
  t,
  getLocale,
  setLocale: saveLocale,
  loadLocale,
  availableLocales: Object.keys(translations),
}


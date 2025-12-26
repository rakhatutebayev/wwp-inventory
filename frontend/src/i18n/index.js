import ru from './locales/ru'
import en from './locales/en'

const translations = {
  ru,
  en,
}

let currentLocale = localStorage.getItem('app_locale') || 'ru'

export const t = (key, params = {}) => {
  const keys = key.split('.')
  let value = translations[currentLocale] || translations.ru
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k]
    } else {
      // Fallback to Russian
      value = translations.ru
      for (const k2 of keys) {
        if (value && typeof value === 'object' && k2 in value) {
          value = value[k2]
        } else {
          return key
        }
      }
      break
    }
  }
  
  if (typeof value === 'string' && Object.keys(params).length > 0) {
    return value.replace(/\{(\w+)\}/g, (match, key) => params[key] || match)
  }
  
  return typeof value === 'string' ? value : key
}

export const setLocale = (locale) => {
  if (translations[locale]) {
    currentLocale = locale
    localStorage.setItem('app_locale', locale)
    window.dispatchEvent(new Event('localechange'))
    return true
  }
  return false
}

export const getLocale = () => currentLocale

export default {
  t,
  setLocale,
  getLocale,
  availableLocales: Object.keys(translations),
}


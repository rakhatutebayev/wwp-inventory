import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import i18n, { loadLocale, saveLocale } from '../i18n'
import ruTranslations from '../i18n/locales/ru'
import enTranslations from '../i18n/locales/en'

const LocaleContext = createContext()

export const useLocale = () => {
  const context = useContext(LocaleContext)
  if (!context) {
    throw new Error('useLocale must be used within LocaleProvider')
  }
  return context
}

export const LocaleProvider = ({ children }) => {
  const [locale, setLocaleState] = useState('ru')
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const initLocale = async () => {
      const loadedLocale = await loadLocale()
      setLocaleState(loadedLocale)
      setLoading(false)
    }
    initLocale()
  }, [])

  const setLocale = useCallback(async (newLocale) => {
    const success = await saveLocale(newLocale)
    if (success) {
      setLocaleState(newLocale)
      // Принудительно обновляем ключ для перезагрузки компонентов
      setReloadKey(prev => prev + 1)
    }
    return success
  }, [])

  // Мемоизируем функцию t для производительности
  const t = useCallback((key, params = {}) => {
    const keys = key.split('.')
    
    const translationsMap = {
      ru: ruTranslations,
      en: enTranslations,
    }
    
    let translations = translationsMap[locale] || ruTranslations
    let value = translations
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k]
      } else {
        // Fallback to Russian
        value = ruTranslations
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
  }, [locale])

  const value = useMemo(() => ({
    locale,
    setLocale,
    t,
    loading,
    reloadKey,
  }), [locale, setLocale, t, loading, reloadKey])

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  )
}


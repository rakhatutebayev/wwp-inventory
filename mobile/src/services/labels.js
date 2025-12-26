import api from './api'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const labelService = {
  getPrintUrl: async (deviceId, format = '38x21') => {
    // Получаем токен из AsyncStorage для авторизации
    const token = await AsyncStorage.getItem('token')
    const baseUrl = api.defaults.baseURL
    const url = `${baseUrl}/api/labels/print?device_ids=${deviceId}&format=${format}`
    
    // Добавляем токен в URL для авторизации (временное решение)
    // В идеале нужно использовать WebView с заголовками
    if (token) {
      return `${url}&token=${encodeURIComponent(token)}`
    }
    return url
  },
  
  getPrintUrlMultiple: async (deviceIds, format = '38x21') => {
    const token = await AsyncStorage.getItem('token')
    const baseUrl = api.defaults.baseURL
    const idsString = Array.isArray(deviceIds) ? deviceIds.join(',') : deviceIds
    const url = `${baseUrl}/api/labels/print?device_ids=${idsString}&format=${format}`
    
    if (token) {
      return `${url}&token=${encodeURIComponent(token)}`
    }
    return url
  },
}


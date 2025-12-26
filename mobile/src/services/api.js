import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { reset } from './navigation'
import { getApiUrl as getApiUrlFromSettings } from './settings'

import { Platform } from 'react-native'

// Динамическое получение API URL из настроек
const getDefaultApiUrl = () => {
  const HOST_IP = '192.168.11.153'
  
  if (Platform.OS === 'ios') {
    return 'http://localhost:8000'
  } else if (Platform.OS === 'android') {
    // Для Android эмулятора используем 10.0.2.2
    // Для реального устройства используем IP компьютера
    return `http://10.0.2.2:8000`
  }
  return `http://${HOST_IP}:8000`
}

// Получаем API URL из настроек (всегда свежие значения)
const getApiUrl = async () => {
  try {
    return await getApiUrlFromSettings()
  } catch (error) {
    console.error('Error getting API URL from settings:', error)
    return getDefaultApiUrl()
  }
}

// Инициализируем API URL синхронно (для первого создания axios instance)
// Это будет переопределено в interceptor'е
const API_BASE_URL = getDefaultApiUrl()

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token to requests and update baseURL from settings
api.interceptors.request.use(async (config) => {
  // Обновляем baseURL из настроек перед каждым запросом
  try {
    const apiUrl = await getApiUrl()
    config.baseURL = apiUrl
  } catch (error) {
    console.error('Error updating API URL:', error)
  }
  
  const token = await AsyncStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Функция для обновления baseURL (можно вызвать после изменения настроек)
export const updateApiBaseURL = async () => {
  try {
    const apiUrl = await getApiUrl()
    api.defaults.baseURL = apiUrl
    return apiUrl
  } catch (error) {
    console.error('Error updating API base URL:', error)
    return null
  }
}

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('token')
      // Перенаправляем на экран входа
      reset('Login')
    }
    return Promise.reject(error)
  }
)

export default api


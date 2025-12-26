import api from './api'

export const inventoryService = {
  // Сессии инвентаризации
  getSessions: async (status = null) => {
    const params = status ? { status } : {}
    const response = await api.get('/api/inventory/sessions', { params })
    return response.data
  },
  
  getSession: async (sessionId) => {
    const response = await api.get(`/api/inventory/sessions/${sessionId}`)
    return response.data
  },
  
  createSession: async (data) => {
    const response = await api.post('/api/inventory/sessions', data)
    return response.data
  },
  
  updateSession: async (sessionId, data) => {
    const response = await api.put(`/api/inventory/sessions/${sessionId}`, data)
    return response.data
  },
  
  // Устройства в сессии
  getSessionDevices: async (sessionId, checked = null) => {
    const params = checked !== null ? { checked } : {}
    const response = await api.get(`/api/inventory/sessions/${sessionId}/devices`, { params })
    return response.data
  },
  
  // Статистика
  getSessionStatistics: async (sessionId) => {
    const response = await api.get(`/api/inventory/sessions/${sessionId}/statistics`)
    return response.data
  },
  
  // Отметка устройства
  checkDevice: async (sessionId, deviceId, checked = true, notes = null) => {
    const response = await api.post(`/api/inventory/sessions/${sessionId}/records`, {
      device_id: deviceId,
      checked,
      notes,
    })
    return response.data
  },
}



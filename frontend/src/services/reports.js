import api from './api'

export const reportService = {
  getDevices: async (params = {}) => {
    const response = await api.get('/api/reports/devices', { params })
    return response.data
  },
  
  exportDevices: async (params = {}) => {
    const response = await api.get('/api/reports/devices/export', {
      params,
      responseType: 'blob',
    })
    return response.data
  },
  
  getLocations: async (params = {}) => {
    const response = await api.get('/api/reports/locations', { params })
    return response.data
  },
}




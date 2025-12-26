import api from './api'

export const movementService = {
  getAll: async (params = {}) => {
    const response = await api.get('/api/movements', { params })
    return response.data
  },
  
  create: async (data) => {
    const response = await api.post('/api/movements', data)
    return response.data
  },
  
  getByDevice: async (deviceId) => {
    const response = await api.get('/api/movements', { params: { device_id: deviceId } })
    return response.data
  },
}




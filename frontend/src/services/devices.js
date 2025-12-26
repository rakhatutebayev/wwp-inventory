import api from './api'

export const deviceService = {
  getAll: async (params = {}) => {
    const response = await api.get('/api/devices', { params })
    return response.data
  },
  
  getById: async (id) => {
    const response = await api.get(`/api/devices/${id}`)
    return response.data
  },
  
  getByInventoryNumber: async (inventoryNumber) => {
    const response = await api.get(`/api/devices/by-inventory/${inventoryNumber}`)
    return response.data
  },
  
  create: async (data) => {
    const response = await api.post('/api/devices', data)
    return response.data
  },
  
  update: async (id, data) => {
    const response = await api.put(`/api/devices/${id}`, data)
    return response.data
  },
  
  delete: async (id) => {
    await api.delete(`/api/devices/${id}`)
  },
}


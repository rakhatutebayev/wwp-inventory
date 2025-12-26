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
  
  create: async (data) => {
    const response = await api.post('/api/devices', data)
    return response.data
  },
  
  getByInventoryNumber: async (inventoryNumber) => {
    const devices = await api.get('/api/devices')
    return devices.data.find(d => d.inventory_number === inventoryNumber)
  },
}



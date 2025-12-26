import api from './api'

export const reportService = {
  getLocations: async (locationType = null) => {
    const params = locationType ? { location_type: locationType } : {}
    const response = await api.get('/api/reports/locations', { params })
    return response.data
  },
  
  getDevices: async (filters = {}) => {
    const response = await api.get('/api/reports/devices', { params: filters })
    return response.data
  },
}




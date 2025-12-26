import api from './api'

export const referenceService = {
  getDeviceTypes: async () => {
    const response = await api.get('/api/device-types')
    return response.data
  },
  
  createDeviceType: async (data) => {
    const response = await api.post('/api/device-types', data)
    return response.data
  },
  
  getBrands: async () => {
    const response = await api.get('/api/brands')
    return response.data
  },
  
  createBrand: async (data) => {
    const response = await api.post('/api/brands', data)
    return response.data
  },
  
  getModels: async (brandId = null) => {
    const params = brandId ? { brand_id: brandId } : {}
    const response = await api.get('/api/models', { params })
    return response.data
  },
  
  createModel: async (data) => {
    const response = await api.post('/api/models', data)
    return response.data
  },
  
  getEmployees: async () => {
    const response = await api.get('/api/employees')
    return response.data
  },
  
  createEmployee: async (data) => {
    const response = await api.post('/api/employees', data)
    return response.data
  },
  
  getWarehouses: async () => {
    const response = await api.get('/api/warehouses')
    return response.data
  },
  
  createWarehouse: async (data) => {
    const response = await api.post('/api/warehouses', data)
    return response.data
  },
  
  getCompanies: async () => {
    const response = await api.get('/api/companies')
    return response.data
  },
  
  createCompany: async (data) => {
    const response = await api.post('/api/companies', data)
    return response.data
  },
}



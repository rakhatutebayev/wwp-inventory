import api from './api'

export const referenceService = {
  // Companies
  getCompanies: async () => {
    const response = await api.get('/api/companies')
    return response.data
  },
  
  createCompany: async (data) => {
    const response = await api.post('/api/companies', data)
    return response.data
  },
  
  updateCompany: async (id, data) => {
    const response = await api.put(`/api/companies/${id}`, data)
    return response.data
  },
  
  deleteCompany: async (id) => {
    await api.delete(`/api/companies/${id}`)
  },
  
  // Device Types
  getDeviceTypes: async () => {
    const response = await api.get('/api/device-types')
    return response.data
  },
  
  createDeviceType: async (data) => {
    const response = await api.post('/api/device-types', data)
    return response.data
  },
  
  updateDeviceType: async (id, data) => {
    const response = await api.put(`/api/device-types/${id}`, data)
    return response.data
  },
  
  deleteDeviceType: async (id) => {
    await api.delete(`/api/device-types/${id}`)
  },
  
  // Brands
  getBrands: async () => {
    const response = await api.get('/api/brands')
    return response.data
  },
  
  createBrand: async (data) => {
    const response = await api.post('/api/brands', data)
    return response.data
  },
  
  updateBrand: async (id, data) => {
    const response = await api.put(`/api/brands/${id}`, data)
    return response.data
  },
  
  deleteBrand: async (id) => {
    await api.delete(`/api/brands/${id}`)
  },
  
  // Models
  getModels: async (brandId = null) => {
    const params = brandId ? { brand_id: brandId } : {}
    const response = await api.get('/api/models', { params })
    return response.data
  },
  
  createModel: async (data) => {
    const response = await api.post('/api/models', data)
    return response.data
  },
  
  updateModel: async (id, data) => {
    const response = await api.put(`/api/models/${id}`, data)
    return response.data
  },
  
  deleteModel: async (id) => {
    await api.delete(`/api/models/${id}`)
  },
  
  // Employees
  getEmployees: async () => {
    const response = await api.get('/api/employees')
    return response.data
  },
  
  getEmployeeDevices: async (employeeId) => {
    const response = await api.get(`/api/employees/${employeeId}/devices`)
    return response.data
  },
  
  createEmployee: async (data) => {
    const response = await api.post('/api/employees', data)
    return response.data
  },
  
  updateEmployee: async (id, data) => {
    const response = await api.put(`/api/employees/${id}`, data)
    return response.data
  },
  
  deleteEmployee: async (id) => {
    await api.delete(`/api/employees/${id}`)
  },
  
  // Warehouses
  getWarehouses: async () => {
    const response = await api.get('/api/warehouses')
    return response.data
  },
  
  createWarehouse: async (data) => {
    const response = await api.post('/api/warehouses', data)
    return response.data
  },
  
  updateWarehouse: async (id, data) => {
    const response = await api.put(`/api/warehouses/${id}`, data)
    return response.data
  },
  
  deleteWarehouse: async (id) => {
    await api.delete(`/api/warehouses/${id}`)
  },
}


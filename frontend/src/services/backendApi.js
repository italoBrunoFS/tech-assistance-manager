import { api } from '../lib/api';

export const backendApi = {
  auth: {
    login: (payload) => api.post('/auth/login', payload),
    bootstrap: (payload) => api.post('/auth/bootstrap', payload),
    me: () => api.get('/auth/me')
  },
  clients: {
    list: () => api.get('/clients'),
    create: (payload) => api.post('/clients', payload),
    update: (id, payload) => api.put(`/clients/${id}`, payload),
    remove: (id) => api.delete(`/clients/${id}`),
    searchByEmail: (email) => api.get('/clients/search/email', { params: { email } }),
    searchByPhone: (telefone) => api.get('/clients/search/phone', { params: { telefone } }),
    searchByName: (nome) => api.get('/clients/search/name', { params: { nome } })
  },
  equipment: {
    list: () => api.get('/equipment'),
    search: (params) => api.get('/equipment/search', { params }),
    create: (payload) => api.post('/equipment', payload),
    update: (id, payload) => api.put(`/equipment/${id}`, payload),
    remove: (id) => api.delete(`/equipment/${id}`),
    historyById: (id) => api.get(`/equipment/${id}/history`),
    historyBySerial: (serial) => api.get(`/equipment/serial/${serial}/history`)
  },
  os: {
    list: () => api.get('/os'),
    search: (params) => api.get('/os/search', { params }),
    create: (payload) => api.post('/os', payload),
    addPart: (id, payload) => api.post(`/os/${id}/parts`, payload),
    patchStatus: (id, payload) => api.patch(`/os/${id}/status`, payload),
    patchLabor: (id, payload) => api.patch(`/os/${id}/labor`, payload),
    patchDescription: (id, payload) => api.patch(`/os/${id}/description`, payload),
    getPublicStatus: (id, accessToken) =>
      api.get(`/os/${id}/status`, { params: { access_token: accessToken } }),
    getPublicPhotos: (id, accessToken) =>
      api.get(`/os/${id}/photos`, { params: { access_token: accessToken } }),
    getPublicUpdates: (id, accessToken) =>
      api.get(`/os/${id}/updates`, { params: { access_token: accessToken } }),
    generatePdf: (id) => api.get(`/os/${id}/pdf`, { responseType: 'blob' })
  },
  payment: {
    list: () => api.get('/payment'),
    create: (payload) => api.post('/payment', payload)
  },
  part: {
    list: () => api.get('/part'),
    create: (payload) => api.post('/part', payload),
    update: (id, payload) => api.put(`/part/${id}`, payload),
    remove: (id) => api.delete(`/part/${id}`)
  },
  employees: {
    list: () => api.get('/employees'),
    create: (payload) => api.post('/employees', payload),
    update: (id, payload) => api.put(`/employees/${id}`, payload),
    updateAccessLevel: (id, payload) => api.patch(`/employees/${id}/access-level`, payload),
    remove: (id) => api.delete(`/employees/${id}`)
  },
  cargo: {
    list: () => api.get('/cargo'),
    create: (payload) => api.post('/cargo', payload)
  },
  photo: {
    listByOs: (id) => api.get(`/photo/${id}`),
    upload: (payload) =>
      api.post('/photo/upload', payload, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }),
    create: (payload) => api.post('/photo', payload),
    remove: (id) => api.delete(`/photo/${id}`)
  },
  notification: {
    create: (payload) => api.post('/notification', payload)
  },
  reports: {
    totalRevenue: () => api.get('/reports/revenue'),
    monthlyRevenue: () => api.get('/reports/revenue/monthly'),
    revenueByPeriod: (params) => api.get('/reports/revenue/period', { params }),
    ordersByStatus: () => api.get('/reports/orders/status'),
    ordersSummary: () => api.get('/reports/orders/summary'),
    mostUsedParts: () => api.get('/reports/parts/most-used'),
    averageTicket: () => api.get('/reports/ticket-average'),
    generateAllOrdersPdf: () =>
      api.get('/reports/orders/pdf', {
        responseType: 'blob'
      })
  }
};

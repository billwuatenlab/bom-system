const BASE_URL = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export const api = {
  // Dashboard
  getDashboard: () => request<any>('/dashboard'),

  // Materials
  getMaterials: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ data: any[]; total: number; page: number; pageSize: number }>(`/materials${qs}`);
  },
  getCategories: (search?: string) => {
    const qs = search ? '?search=' + encodeURIComponent(search) : '';
    return request<any>(`/materials/categories${qs}`);
  },
  getMaterialsByCategory: (category: string) => request<any[]>(`/materials/by-category/${encodeURIComponent(category)}`),
  getCategoryMeta: () => request<Record<string, { displayName: string; description?: string }>>('/materials/category-meta'),
  updateCategoryMeta: (code: string, data: { displayName: string; description?: string }) =>
    request<any>(`/materials/category-meta/${encodeURIComponent(code)}`, { method: 'PUT', body: JSON.stringify(data) }),
  getAttachmentStats: () => request<{
    categories: Record<string, { photoCount: number; docCount: number; totalSize: number }>;
    items: Record<string, { photoCount: number; docCount: number; totalSize: number }>;
  }>('/materials/attachment-stats'),
  getMaterial: (id: string) => request<any>(`/materials/${id}`),
  createMaterial: (data: any) => request<any>('/materials', { method: 'POST', body: JSON.stringify(data) }),
  updateMaterial: (id: string, data: any) => request<any>(`/materials/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMaterial: (id: string) => request<any>(`/materials/${id}`, { method: 'DELETE' }),
  importExcel: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return fetch(`${BASE_URL}/materials/import`, { method: 'POST', body: form }).then((r) => r.json());
  },

  // BOM
  getBomTree: () => request<any[]>('/bom/tree'),
  getBomTreeFor: (id: string) => request<any>(`/bom/tree/${id}`),
  addBomRelation: (data: any) => request<any>('/bom', { method: 'POST', body: JSON.stringify(data) }),
  deleteBomRelation: (id: number) => request<any>(`/bom/${id}`, { method: 'DELETE' }),

  // Inventory
  getTransactions: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any[]>(`/inventory${qs}`);
  },
  createTransaction: (data: any) => request<any>('/inventory', { method: 'POST', body: JSON.stringify(data) }),

  // Users
  login: (email: string, password: string) => request<any>('/users/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  getUsers: () => request<any[]>('/users'),
  createUser: (data: any) => request<any>('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: number, data: any) => request<any>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Image upload
  uploadMaterialImage: (id: string, file: File) => {
    const form = new FormData();
    form.append('image', file);
    return fetch(`${BASE_URL}/materials/${encodeURIComponent(id)}/image`, { method: 'POST', body: form }).then(r => r.json());
  },

  // Document upload
  uploadMaterialDocument: (id: string, file: File) => {
    const form = new FormData();
    form.append('document', file);
    return fetch(`${BASE_URL}/materials/${encodeURIComponent(id)}/documents`, { method: 'POST', body: form }).then(r => r.json());
  },
  deleteMaterialDocument: (id: string, url: string) =>
    request<any>(`/materials/${encodeURIComponent(id)}/documents`, { method: 'DELETE', body: JSON.stringify({ url }) }),
  getMaterialStorage: (id: string) => request<any>(`/materials/${encodeURIComponent(id)}/storage`),

  // Deploy
  getDeployStatus: () => request<any>('/deploy/status'),
  triggerDeploy: () => request<any>('/deploy', { method: 'POST' }),

  // Logs
  getLogs: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any[]>(`/logs${qs}`);
  },

  // Exchange rates
  getExchangeRates: () => request<any>('/exchange'),
  convertToTWD: (amount: number, from: string) =>
    request<any>('/exchange/convert', { method: 'POST', body: JSON.stringify({ amount, from }) }),

  // Health
  health: () => request<any>('/health'),
};

const API_BASE = import.meta.env.VITE_API_URL ?? '';

async function fetchJSON(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  listMaterials: (params = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
    });
    return fetchJSON(`/api/materials?${q.toString()}`);
  },

  getMaterial: (id) => fetchJSON(`/api/materials/${id}`),

  previewMaterial: (id) => `${API_BASE}/api/materials/${id}/preview`,

  createMaterial: (formData) => fetchJSON('/api/materials', {
    method: 'POST',
    body: formData,
  }),

  downloadMaterial: (id) => `${API_BASE}/api/materials/${id}/download`,

  checkDuplicate: (filename) => fetchJSON(`/api/materials/check-duplicate?filename=${encodeURIComponent(filename)}`),

  getDepartments: () => fetchJSON('/api/departments'),
  getCourses: () => fetchJSON('/api/courses'),
  getTags: () => fetchJSON('/api/tags'),

  // Course Packages
  listPackages: (params = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
    });
    return fetchJSON(`/api/packages?${q.toString()}`);
  },

  getPackage: (id) => fetchJSON(`/api/packages/${id}`),

  getPackageItems: (id) => fetchJSON(`/api/packages/${id}/items`),

  downloadPackage: (id) => `${API_BASE}/api/packages/${id}/download`,

  previewPackageItem: (id, path) => `${API_BASE}/api/packages/${id}/preview/${encodeURIComponent(path)}`,

  getPackageCourses: () => fetchJSON('/api/packages/courses'),
};

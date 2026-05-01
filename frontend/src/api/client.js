const API_BASE = import.meta.env.VITE_API_URL ?? '';

async function fetchJSON(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const fetchOpts = { ...options };
  // Don't set Content-Type for FormData; browser sets it with boundary
  if (fetchOpts.body instanceof FormData) {
    delete fetchOpts.headers;
  }
  const res = await fetch(url, fetchOpts);
  if (!res.ok) {
    const text = await res.text();
    let err;
    try {
      const parsed = JSON.parse(text);
      err = parsed.error || parsed.message || text;
    } catch {
      err = text || `HTTP ${res.status}`;
    }
    throw new Error(err);
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

  createZipPackage: (formData) => fetchJSON('/api/packages', {
    method: 'POST',
    body: formData,
  }),
};

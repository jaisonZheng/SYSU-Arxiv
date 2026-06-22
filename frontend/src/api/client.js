const API_BASE = import.meta.env.VITE_API_URL ?? '';

async function fetchJSON(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const fetchOpts = { ...options };
  // Don't set Content-Type for FormData; browser sets it with boundary
  if (fetchOpts.body instanceof FormData) {
    delete fetchOpts.headers;
  }
  // Automatically attach Authorization header if token exists
  const token = localStorage.getItem('token');
  if (token) {
    fetchOpts.headers = {
      ...(fetchOpts.headers || {}),
      Authorization: `Bearer ${token}`,
    };
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
    const error = new Error(err);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

/**
 * Download a file with authentication via query token.
 * Returns the download URL with token appended (for window.open).
 */
function getDownloadUrl(baseUrl) {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('unauthorized');
  const sep = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${sep}token=${encodeURIComponent(token)}`;
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

  downloadMaterial: (id) => {
    const url = `${API_BASE}/api/materials/${id}/download`;
    return getDownloadUrl(url);
  },

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

  downloadPackage: (id) => {
    const url = `${API_BASE}/api/packages/${id}/download`;
    return getDownloadUrl(url);
  },

  previewPackageItem: (id, path) => `${API_BASE}/api/packages/${id}/preview/${encodeURIComponent(path)}`,

  getPackageCourses: () => fetchJSON('/api/packages/courses'),

  createZipPackage: (formData) => fetchJSON('/api/packages', {
    method: 'POST',
    body: formData,
  }),

  // Thanks
  thankMaterial: (id) => fetchJSON(`/api/materials/${id}/thank`, { method: 'POST' }),
  thankPackage: (id) => fetchJSON(`/api/packages/${id}/thank`, { method: 'POST' }),

  // Stats
  getTotalDownloads: () => fetchJSON('/api/stats/downloads'),
  getTotalUploads: () => fetchJSON('/api/stats/uploads'),
  getTotalThanks: () => fetchJSON('/api/stats/thanks'),

  // ========== Auth ==========
  sendCode: (email) => fetchJSON('/api/auth/send-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  }),

  register: (data) => fetchJSON('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),

  login: (data) => fetchJSON('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),

  getMe: () => fetchJSON('/api/auth/me'),

  // ========== Me ==========
  getMyDownloads: () => fetchJSON('/api/me/downloads'),
  getMyUploads: () => fetchJSON('/api/me/uploads'),
  getMyQuota: () => fetchJSON('/api/me/quota'),

  updateProfile: (nickname) => fetchJSON('/api/me/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname }),
  }),

  updateAvatar: (formData) => fetchJSON('/api/me/avatar', {
    method: 'POST',
    body: formData,
  }),

  updatePassword: (old_password, new_password) => fetchJSON('/api/me/password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ old_password, new_password }),
  }),

  updateEmail: (new_email, code) => fetchJSON('/api/me/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ new_email, code }),
  }),
};

/**
 * Helper: trigger browser download from a URL.
 * Creates a temporary <a> tag and clicks it.
 */
export function triggerDownload(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || '';
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Helper: check if user is logged in.
 */
export function isLoggedIn() {
  return !!localStorage.getItem('token');
}

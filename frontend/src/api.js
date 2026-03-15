const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

let csrfToken = null;

export function getApiBase() {
  return API_BASE;
}

export async function ensureCsrfToken() {
  if (csrfToken) return csrfToken;

  const res = await fetch(`${API_BASE}/csrf-token`, {
    method: 'GET',
    credentials: 'include'
  });

  const data = await res.json();
  csrfToken = data?.csrfToken ?? null;
  return csrfToken;
}

export function setCsrfToken(token) {
  csrfToken = token;
}

async function request(path, { method = 'GET', body, csrf = false } = {}) {
  const headers = {};

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (csrf) {
    const t = await ensureCsrfToken();
    if (t) headers['X-CSRF-Token'] = t;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  let data = null;
  const ct = res.headers.get('content-type') ?? '';

  if (ct.includes('application/json')) {
    data = await res.json().catch(() => null);
  } else {
    data = await res.text().catch(() => null);
  }

  if (!res.ok) {
    const msg = data?.message || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  // auth
  getSession: () => request('/login'),

  login: async (username, password) => {
    const data = await request('/login', {
      method: 'POST',
      body: { username, password }
    });

    if (data?.csrfToken) {
      setCsrfToken(data.csrfToken);
    }

    return data;
  },

  logout: () => request('/login', { method: 'DELETE' }),

  // users
  register: (payload) => request('/users', {
    method: 'POST',
    body: payload
  }),

  // forums
  getForums: () => request('/forums'),
  getForumById: (id) => request(`/forums/by-id/${encodeURIComponent(id)}`),
  getForumByName: (name) => request(`/forums/by-name/${encodeURIComponent(name)}`),
  getForumBySlug: (slug) => request(`/forums/by-slug/${encodeURIComponent(slug)}`),

  createForum: (name) =>
    request('/forum', {
      method: 'POST',
      body: { name },
      csrf: true
    }),

  // threads
  getThreads: () => request('/threads'),
  getThreadsInForum: (forumId) => request(`/forums/${encodeURIComponent(forumId)}/threads`),

  // legacy create
  createThread: (payload) =>
    request('/threads', {
      method: 'POST',
      body: payload,
      csrf: true
    }),

  // id-based create
  createThreadInForum: (forumId, payload) =>
    request(`/forums/${encodeURIComponent(forumId)}/threads`, {
      method: 'POST',
      body: payload,
      csrf: true
    }),

  getThreadByTitle: (title) => request(`/threads/by-title/${encodeURIComponent(title)}`),
  getThreadById: (id) => request(`/threads/by-id/${encodeURIComponent(id)}`),

  updateThread: (threadId, payload) =>
    request(`/threads/${encodeURIComponent(threadId)}`, {
      method: 'PATCH',
      body: payload,
      csrf: true
    }),

  setThreadVisibility: (id, visibility) =>
    request(`/threads/${encodeURIComponent(id)}/visibility`, {
      method: 'PATCH',
      body: { visibility },
      csrf: true
    }),

  // members / moderators
  addThreadMember: (threadId, userId) =>
    request(`/threads/${encodeURIComponent(threadId)}/members`, {
      method: 'POST',
      body: { userId: Number(userId) },
      csrf: true
    }),

  removeThreadMember: (threadId, userId) =>
    request(`/threads/${encodeURIComponent(threadId)}/members/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      csrf: true
    }),

  assignModerator: (threadId, userId) =>
    request(`/threads/${encodeURIComponent(threadId)}/moderators`, {
      method: 'POST',
      body: { userId: Number(userId) },
      csrf: true
    }),

  revokeModerator: (threadId, userId) =>
    request(`/threads/${encodeURIComponent(threadId)}/moderators/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      csrf: true
    }),

  // posts
  createPostInThread: (threadId, text) =>
    request(`/threads/${encodeURIComponent(threadId)}/posts`, {
      method: 'POST',
      body: { text },
      csrf: true
    }),

  updatePost: (postId, text) =>
    request(`/posts/${encodeURIComponent(postId)}`, {
      method: 'PATCH',
      body: { text },
      csrf: true
    }),

  deletePost: (postId) =>
    request(`/posts/${encodeURIComponent(postId)}`, {
      method: 'DELETE',
      csrf: true
    })
};
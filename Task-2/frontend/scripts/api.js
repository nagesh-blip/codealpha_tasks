/* ==========================================================================
   api.js — central place for every fetch() call the frontend makes.
   All other page scripts call the functions exported on window.api.
   ========================================================================== */

const API_BASE_URL = 'http://127.0.0.1:8000/api';

/* ---------- token helpers ------------------------------------------------ */

function getAccessToken() {
  return localStorage.getItem('access_token');
}

function getRefreshToken() {
  return localStorage.getItem('refresh_token');
}

function setTokens(access, refresh) {
  localStorage.setItem('access_token', access);
  if (refresh) localStorage.setItem('refresh_token', refresh);
}

function clearTokens() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('current_user');
}

function getCurrentUser() {
  const raw = localStorage.getItem('current_user');
  return raw ? JSON.parse(raw) : null;
}

function setCurrentUser(user) {
  localStorage.setItem('current_user', JSON.stringify(user));
}

function isLoggedIn() {
  return Boolean(getAccessToken());
}

/* Redirect helpers used at the top of every page script. */
function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = 'login.html';
  }
}

function redirectIfLoggedIn() {
  if (isLoggedIn()) {
    window.location.href = 'dashboard.html';
  }
}

function logout() {
  clearTokens();
  window.location.href = 'login.html';
}

/* ---------- low-level request wrapper ------------------------------------ */

/**
 * Performs a fetch() call against the API, attaching the auth header and
 * automatically retrying once with a refreshed access token if the first
 * attempt comes back as 401 Unauthorized.
 */
async function request(path, { method = 'GET', body, auth = true, isRetry = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (networkError) {
    throw new ApiError(
      'Could not reach the server. Check that the Django backend is running.',
      0,
      null
    );
  }

  if (response.status === 401 && auth && !isRetry) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      return request(path, { method, body, auth, isRetry: true });
    }
    clearTokens();
    window.location.href = 'login.html';
    return;
  }

  if (response.status === 204) {
    return null;
  }

  let data = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = null;
    }
  }

  if (!response.ok) {
    throw new ApiError(extractErrorMessage(data), response.status, data);
  }

  return data;
}

async function tryRefreshToken() {
  const refresh = getRefreshToken();
  if (!refresh) return false;
  try {
    const response = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });
    if (!response.ok) return false;
    const data = await response.json();
    setTokens(data.access, null);
    return true;
  } catch (e) {
    return false;
  }
}

/** Turns a DRF error payload into one readable string for the UI. */
function extractErrorMessage(data) {
  if (!data) return 'Something went wrong. Please try again.';
  if (typeof data === 'string') return data;
  if (data.detail) return data.detail;

  const parts = [];
  for (const key of Object.keys(data)) {
    const value = data[key];
    const text = Array.isArray(value) ? value.join(' ') : String(value);
    parts.push(key === 'non_field_errors' ? text : `${key}: ${text}`);
  }
  return parts.length ? parts.join(' | ') : 'Something went wrong. Please try again.';
}

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

/* ---------- auth endpoints ------------------------------------------------ */

function register(payload) {
  return request('/auth/register/', { method: 'POST', body: payload, auth: false });
}

async function login(username, password) {
  const data = await request('/auth/login/', {
    method: 'POST',
    body: { username, password },
    auth: false,
  });
  setTokens(data.access, data.refresh);
  setCurrentUser(data.user);
  return data.user;
}

function getProfile() {
  return request('/auth/profile/');
}

function updateProfile(payload) {
  return request('/auth/profile/', { method: 'PATCH', body: payload });
}

/* ---------- project endpoints --------------------------------------------- */

function getProjects() {
  return request('/projects/');
}

function getProject(projectId) {
  return request(`/projects/${projectId}/`);
}

function createProject(payload) {
  return request('/projects/', { method: 'POST', body: payload });
}

function updateProject(projectId, payload) {
  return request(`/projects/${projectId}/`, { method: 'PATCH', body: payload });
}

function deleteProject(projectId) {
  return request(`/projects/${projectId}/`, { method: 'DELETE' });
}

function getProjectMembers(projectId) {
  return request(`/projects/${projectId}/members/`);
}

function addProjectMember(projectId, username) {
  return request(`/projects/${projectId}/members/`, { method: 'POST', body: { username } });
}

function removeProjectMember(projectId, userId) {
  return request(`/projects/${projectId}/members/${userId}/`, { method: 'DELETE' });
}

/* ---------- task endpoints -------------------------------------------------- */

function getTasks(projectId) {
  return request(`/projects/${projectId}/tasks/`);
}

function createTask(projectId, payload) {
  return request(`/projects/${projectId}/tasks/`, { method: 'POST', body: payload });
}

function updateTask(taskId, payload) {
  return request(`/tasks/${taskId}/`, { method: 'PATCH', body: payload });
}

function deleteTask(taskId) {
  return request(`/tasks/${taskId}/`, { method: 'DELETE' });
}

/* ---------- comment endpoints ------------------------------------------------ */

function getComments(taskId) {
  return request(`/tasks/${taskId}/comments/`);
}

function createComment(taskId, content) {
  return request(`/tasks/${taskId}/comments/`, { method: 'POST', body: { content } });
}

function updateComment(commentId, content) {
  return request(`/comments/${commentId}/`, { method: 'PATCH', body: { content } });
}

function deleteComment(commentId) {
  return request(`/comments/${commentId}/`, { method: 'DELETE' });
}

/* ---------- export ---------------------------------------------------------- */

window.api = {
  ApiError,
  requireAuth,
  redirectIfLoggedIn,
  logout,
  isLoggedIn,
  getCurrentUser,
  setCurrentUser,
  register,
  login,
  getProfile,
  updateProfile,
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  getProjectMembers,
  addProjectMember,
  removeProjectMember,
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  getComments,
  createComment,
  updateComment,
  deleteComment,
};

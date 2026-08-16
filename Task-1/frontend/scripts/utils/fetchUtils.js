/*
  fetchUtils.js

  Small helper functions that wrap the native fetch() call.
  Every API call in this app goes through here so that:
  - the auth token is automatically attached (when the user is logged in)
  - errors coming back from Django REST Framework are turned into a
    single, easy-to-read message
*/

export const API_BASE_URL = 'https://codealpha-tasks-nw99.onrender.com/api';
export function getAuthToken() {
  return localStorage.getItem('authToken');
}

export function saveSession(token, username) {
  localStorage.setItem('authToken', token);
  localStorage.setItem('currentUsername', username);
}

export function clearSession() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUsername');
}

export function getCurrentUsername() {
  return localStorage.getItem('currentUsername');
}

export function isLoggedIn() {
  return Boolean(getAuthToken());
}

/*
  requestJson()
  Use this for requests that send/receive plain JSON (no file upload).
*/
export async function requestJson(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Token ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  return handleResponse(response);
}

/*
  requestFormData()
  Use this for requests that upload a file (avatar or post image),
  since file uploads need FormData instead of a JSON string.
*/
export async function requestFormData(path, formData, method = 'POST') {
  const headers = {};

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Token ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: formData
  });

  return handleResponse(response);
}

async function handleResponse(response) {
  // 204 No Content / empty body responses
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const message = extractErrorMessage(data);
    throw new Error(message);
  }

  return data;
}

function extractErrorMessage(data) {
  if (data.error) {
    return data.error;
  }

  // Django REST Framework validation errors look like:
  // { "username": ["This username is already taken."] }
  const firstKey = Object.keys(data)[0];
  if (firstKey && Array.isArray(data[firstKey])) {
    return data[firstKey][0];
  }

  return 'Something went wrong. Please try again.';
}

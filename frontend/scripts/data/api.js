/*
  api.js

  Every function here talks to the Django backend and returns
  a Promise of the parsed JSON response. Pages import from this
  module instead of calling fetch() directly.
*/

import { requestJson, requestFormData } from '../utils/fetchUtils.js';

/* ---------------------- Auth ---------------------- */

export function registerUser(username, email, password) {
  return requestJson('/auth/register/', {
    method: 'POST',
    body: { username, email, password }
  });
}

export function loginUser(username, password) {
  return requestJson('/auth/login/', {
    method: 'POST',
    body: { username, password }
  });
}

export function logoutUser() {
  return requestJson('/auth/logout/', {
    method: 'POST'
  });
}

/* -------------------- Profiles -------------------- */

export function getMyProfile() {
  return requestJson('/users/me/');
}

export function getUserProfile(username) {
  return requestJson(`/users/${encodeURIComponent(username)}/`);
}

export function updateMyProfile({ bio, avatarFile }) {
  const formData = new FormData();
  if (bio !== undefined) {
    formData.append('bio', bio);
  }
  if (avatarFile) {
    formData.append('avatar', avatarFile);
  }
  return requestFormData('/users/me/', formData, 'PUT');
}

export function searchUsers(query) {
  return requestJson(`/users/search/?q=${encodeURIComponent(query)}`);
}

export function toggleFollow(username) {
  return requestJson(`/users/${encodeURIComponent(username)}/follow/`, {
    method: 'POST'
  });
}

/* ---------------------- Posts ---------------------- */

export function getAllPosts() {
  return requestJson('/posts/');
}

export function getPostsByUsername(username) {
  return requestJson(`/posts/?username=${encodeURIComponent(username)}`);
}

export function createPost({ caption, imageFile }) {
  const formData = new FormData();
  formData.append('caption', caption);
  if (imageFile) {
    formData.append('image', imageFile);
  }
  return requestFormData('/posts/', formData, 'POST');
}

export function deletePost(postId) {
  return requestJson(`/posts/${postId}/`, {
    method: 'DELETE'
  });
}

export function toggleLike(postId) {
  return requestJson(`/posts/${postId}/like/`, {
    method: 'POST'
  });
}

/* -------------------- Comments -------------------- */

export function getComments(postId) {
  return requestJson(`/posts/${postId}/comments/`);
}

export function addComment(postId, text) {
  return requestJson(`/posts/${postId}/comments/`, {
    method: 'POST',
    body: { text }
  });
}

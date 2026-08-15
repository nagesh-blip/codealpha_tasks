/* profile.js — view/edit the logged-in user's profile on profile.html */

window.api.requireAuth();

const form = document.getElementById('profile-form');
const alertBox = document.getElementById('form-alert');
const successBox = document.getElementById('form-success');
const saveBtn = document.getElementById('save-btn');
const navAvatar = document.getElementById('nav-avatar');
const profileAvatar = document.getElementById('profile-avatar');

function initial(text) {
  return (text || '?').trim().charAt(0).toUpperCase() || '?';
}

function showError(message) {
  successBox.classList.remove('is-visible');
  alertBox.textContent = message;
  alertBox.classList.add('is-visible');
}

function showSuccess(message) {
  alertBox.classList.remove('is-visible');
  successBox.textContent = message;
  successBox.classList.add('is-visible');
}

function fillForm(profile) {
  document.getElementById('username').value = profile.username;
  document.getElementById('first_name').value = profile.first_name || '';
  document.getElementById('last_name').value = profile.last_name || '';
  document.getElementById('email').value = profile.email || '';
  const label = initial(profile.first_name || profile.username);
  navAvatar.textContent = label;
  profileAvatar.textContent = label;
}

async function loadProfile() {
  try {
    const profile = await window.api.getProfile();
    window.api.setCurrentUser(profile);
    fillForm(profile);
  } catch (error) {
    showError(error.message || 'Could not load your profile.');
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  alertBox.classList.remove('is-visible');
  successBox.classList.remove('is-visible');

  const payload = {
    first_name: document.getElementById('first_name').value.trim(),
    last_name: document.getElementById('last_name').value.trim(),
    email: document.getElementById('email').value.trim(),
  };

  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';

  try {
    const profile = await window.api.updateProfile(payload);
    window.api.setCurrentUser(profile);
    fillForm(profile);
    showSuccess('Profile updated.');
  } catch (error) {
    showError(error.message || 'Could not save your profile.');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save changes';
  }
});

document.getElementById('logout-btn').addEventListener('click', window.api.logout);

loadProfile();

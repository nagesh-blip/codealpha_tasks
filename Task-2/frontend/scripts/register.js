/* register.js — handles the registration form on register.html */

window.api.redirectIfLoggedIn();

const form = document.getElementById('register-form');
const alertBox = document.getElementById('form-alert');
const submitBtn = document.getElementById('submit-btn');

function showError(message) {
  alertBox.textContent = message;
  alertBox.classList.add('is-visible');
}

function hideError() {
  alertBox.classList.remove('is-visible');
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideError();

  const payload = {
    first_name: document.getElementById('first_name').value.trim(),
    last_name: document.getElementById('last_name').value.trim(),
    username: document.getElementById('username').value.trim(),
    email: document.getElementById('email').value.trim(),
    password: document.getElementById('password').value,
    password2: document.getElementById('password2').value,
  };

  if (!payload.username || !payload.email || !payload.password || !payload.password2) {
    showError('Please fill in all required fields.');
    return;
  }

  if (payload.password !== payload.password2) {
    showError('Passwords do not match.');
    return;
  }

  if (payload.password.length < 8) {
    showError('Password must be at least 8 characters long.');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating account…';

  try {
    const data = await window.api.register(payload);
    window.api.setCurrentUser(data.user);
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    window.location.href = 'dashboard.html';
  } catch (error) {
    showError(error.message || 'Could not create your account. Please try again.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create account';
  }
});

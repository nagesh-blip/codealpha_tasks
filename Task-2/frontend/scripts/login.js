/* login.js — handles the login form on login.html */

window.api.redirectIfLoggedIn();

const form = document.getElementById('login-form');
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

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  if (!username || !password) {
    showError('Please enter your username and password.');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Logging in…';

  try {
    await window.api.login(username, password);
    window.location.href = 'dashboard.html';
  } catch (error) {
    if (error instanceof window.api.ApiError && error.status === 401) {
      showError('Incorrect username or password.');
    } else {
      showError(error.message || 'Could not log in. Please try again.');
    }
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Log in';
  }
});

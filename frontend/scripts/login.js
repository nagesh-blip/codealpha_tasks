import { loginUser } from './data/api.js';
import { saveSession, isLoggedIn } from './utils/fetchUtils.js';

// If already logged in, skip the login page
if (isLoggedIn()) {
  window.location.href = 'index.html';
}

const loginForm = document.querySelector('#js-login-form');
const usernameInput = document.querySelector('#js-username-input');
const passwordInput = document.querySelector('#js-password-input');
const loginButton = document.querySelector('#js-login-button');
const errorBanner = document.querySelector('#js-error-banner');

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideError();

  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (!username || !password) {
    showError('Please enter both a username and a password.');
    return;
  }

  setLoading(true);

  try {
    const data = await loginUser(username, password);
    saveSession(data.token, data.username);
    window.location.href = 'index.html';
  } catch (error) {
    showError(error.message);
    setLoading(false);
  }
});

function setLoading(isLoading) {
  loginButton.disabled = isLoading;
  loginButton.textContent = isLoading ? 'Logging In...' : 'Log In';
}

function showError(message) {
  errorBanner.textContent = message;
  errorBanner.classList.add('error-banner-visible');
}

function hideError() {
  errorBanner.textContent = '';
  errorBanner.classList.remove('error-banner-visible');
}

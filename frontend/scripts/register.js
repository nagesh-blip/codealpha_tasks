import { registerUser } from './data/api.js';
import { saveSession, isLoggedIn } from './utils/fetchUtils.js';

// If already logged in, skip the register page
if (isLoggedIn()) {
  window.location.href = 'index.html';
}

const registerForm = document.querySelector('#js-register-form');
const usernameInput = document.querySelector('#js-username-input');
const emailInput = document.querySelector('#js-email-input');
const passwordInput = document.querySelector('#js-password-input');
const registerButton = document.querySelector('#js-register-button');
const errorBanner = document.querySelector('#js-error-banner');

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideError();

  const username = usernameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!username || !password) {
    showError('Please choose a username and a password.');
    return;
  }

  if (password.length < 6) {
    showError('Password must be at least 6 characters long.');
    return;
  }

  setLoading(true);

  try {
    const data = await registerUser(username, email, password);
    saveSession(data.token, data.username);
    window.location.href = 'index.html';
  } catch (error) {
    showError(error.message);
    setLoading(false);
  }
});

function setLoading(isLoading) {
  registerButton.disabled = isLoading;
  registerButton.textContent = isLoading ? 'Creating Account...' : 'Sign Up';
}

function showError(message) {
  errorBanner.textContent = message;
  errorBanner.classList.add('error-banner-visible');
}

function hideError() {
  errorBanner.textContent = '';
  errorBanner.classList.remove('error-banner-visible');
}

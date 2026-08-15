/*
  headerUtils.js

  The header (logo, search box, nav links, logout button) looks the
  same on every page. This module wires up its behavior so home.js
  and profile.js don't have to repeat the same code.
*/

import { searchUsers } from '../data/api.js';
import { clearSession, getCurrentUsername } from './fetchUtils.js';
import { getAvatarUrl, escapeHtml } from './formatUtils.js';

export function setupHeader() {
  setupProfileLink();
  setupLogoutButton();
  setupSearch();
}

function setupProfileLink() {
  const myProfileLink = document.querySelector('#js-my-profile-link');
  if (!myProfileLink) {
    return;
  }
  const username = getCurrentUsername();
  myProfileLink.href = `profile.html?username=${encodeURIComponent(username)}`;
}

function setupLogoutButton() {
  const logoutButton = document.querySelector('#js-logout-button');
  if (!logoutButton) {
    return;
  }

  logoutButton.addEventListener('click', () => {
    // We clear the session locally right away so the user is never
    // stuck if the logout request itself fails (e.g. network issue).
    clearSession();
    window.location.href = 'login.html';
  });
}

function setupSearch() {
  const searchInput = document.querySelector('#js-search-input');
  const searchResults = document.querySelector('#js-search-results');

  if (!searchInput || !searchResults) {
    return;
  }

  let debounceTimer = null;

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim();

    clearTimeout(debounceTimer);

    if (!query) {
      hideResults();
      return;
    }

    debounceTimer = setTimeout(() => {
      runSearch(query);
    }, 300);
  });

  document.addEventListener('click', (event) => {
    const clickedInsideSearch = event.target.closest('.header-search');
    if (!clickedInsideSearch) {
      hideResults();
    }
  });

  async function runSearch(query) {
    try {
      const users = await searchUsers(query);
      renderResults(users);
    } catch (error) {
      searchResults.innerHTML = `<div class="header-search-empty">${escapeHtml(error.message)}</div>`;
      showResults();
    }
  }

  function renderResults(users) {
    if (users.length === 0) {
      searchResults.innerHTML = `<div class="header-search-empty">No users found.</div>`;
      showResults();
      return;
    }

    const resultsHtml = users
      .map((user) => {
        return `
          <a href="profile.html?username=${encodeURIComponent(user.username)}" class="header-search-result">
            <img class="header-search-result-avatar" src="${getAvatarUrl(user.avatar)}" alt="${escapeHtml(user.username)}">
            <span>${escapeHtml(user.username)}</span>
          </a>
        `;
      })
      .join('');

    searchResults.innerHTML = resultsHtml;
    showResults();
  }

  function showResults() {
    searchResults.classList.add('header-search-results-visible');
  }

  function hideResults() {
    searchResults.classList.remove('header-search-results-visible');
  }
}

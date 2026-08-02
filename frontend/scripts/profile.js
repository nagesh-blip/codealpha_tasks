import { getPostsByUsername, getUserProfile, toggleFollow, updateMyProfile } from './data/api.js';
import { getCurrentUsername, isLoggedIn } from './utils/fetchUtils.js';
import { escapeHtml, getAvatarUrl } from './utils/formatUtils.js';
import { setupHeader } from './utils/headerUtils.js';
import { attachPostListEvents, createPostCardHtml } from './utils/postRenderer.js';

// Guard this page: only logged-in users may view profiles
if (!isLoggedIn()) {
  window.location.href = 'login.html';
}

const errorBanner = document.querySelector('#js-error-banner');
const loadingSpinner = document.querySelector('#js-loading-spinner');

const profileHeader = document.querySelector('#js-profile-header');
const profileAvatar = document.querySelector('#js-profile-avatar');
const profileUsername = document.querySelector('#js-profile-username');
const profileBio = document.querySelector('#js-profile-bio');
const postsCountEl = document.querySelector('#js-posts-count');
const followersCountEl = document.querySelector('#js-followers-count');
const followingCountEl = document.querySelector('#js-following-count');
const followButton = document.querySelector('#js-follow-button');
const editProfileButton = document.querySelector('#js-edit-profile-button');

const editProfileBox = document.querySelector('#js-edit-profile-box');
const editProfileForm = document.querySelector('#js-edit-profile-form');
const editAvatarInput = document.querySelector('#js-edit-avatar-input');
const editAvatarPreview = document.querySelector('#js-edit-avatar-preview');
const editBioInput = document.querySelector('#js-edit-bio-input');
const saveProfileButton = document.querySelector('#js-save-profile-button');
const cancelEditButton = document.querySelector('#js-cancel-edit-button');

const profilePostsList = document.querySelector('#js-profile-posts-list');

let selectedAvatarFile = null;

// Which profile are we viewing? ?username=someone, or our own by default
const urlParams = new URLSearchParams(window.location.search);
const viewedUsername = urlParams.get('username') || getCurrentUsername();

setupHeader();
attachPostListEvents(profilePostsList);
loadProfile();

async function loadProfile() {
  showLoading(true);
  hideError();
  profileHeader.style.display = 'none';

  try {
    const [profile, posts] = await Promise.all([
      getUserProfile(viewedUsername),
      getPostsByUsername(viewedUsername)
    ]);

    renderProfile(profile);
    renderPosts(posts);
  } catch (error) {
    showError(error.message);
  } finally {
    showLoading(false);
  }
}

function renderProfile(profile) {
  profileHeader.style.display = 'flex';

  profileAvatar.src = getAvatarUrl(profile.avatar);
  profileUsername.textContent = profile.username;
  profileBio.textContent = profile.bio || 'No bio yet.';
  postsCountEl.textContent = profile.posts_count;
  followersCountEl.textContent = profile.followers_count;
  followingCountEl.textContent = profile.following_count;

  if (profile.is_own_profile) {
    editProfileButton.style.display = 'inline-block';
    followButton.style.display = 'none';
    setupEditProfile(profile);
  } else {
    editProfileButton.style.display = 'none';
    followButton.style.display = 'inline-block';
    renderFollowButton(profile.is_following);
    followButton.onclick = () => handleToggleFollow(profile.username);
  }
}

// -------------------- Follow / Unfollow --------------------

function renderFollowButton(isFollowing) {
  followButton.textContent = isFollowing ? 'Following' : 'Follow';
  followButton.classList.toggle('profile-follow-button-following', isFollowing);
}

async function handleToggleFollow(username) {
  followButton.disabled = true;
  try {
    const result = await toggleFollow(username);
    renderFollowButton(result.is_following);
    followersCountEl.textContent = result.followers_count;
  } catch (error) {
    showError(error.message);
  } finally {
    followButton.disabled = false;
  }
}

// -------------------- Edit profile --------------------

function setupEditProfile(profile) {
  editProfileButton.onclick = () => {
    editBioInput.value = profile.bio || '';
    editAvatarPreview.src = getAvatarUrl(profile.avatar);
    editProfileBox.classList.add('edit-profile-box-visible');
  };

  cancelEditButton.onclick = () => {
    editProfileBox.classList.remove('edit-profile-box-visible');
    selectedAvatarFile = null;
    editAvatarInput.value = '';
  };
}

editAvatarInput.addEventListener('change', () => {
  const file = editAvatarInput.files[0];
  if (!file) {
    return;
  }

  selectedAvatarFile = file;

  const reader = new FileReader();
  reader.addEventListener('load', () => {
    editAvatarPreview.src = reader.result;
  });
  reader.readAsDataURL(file);
});

editProfileForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideError();

  saveProfileButton.disabled = true;
  saveProfileButton.textContent = 'Saving...';

  try {
    const updatedProfile = await updateMyProfile({
      bio: editBioInput.value.trim(),
      avatarFile: selectedAvatarFile
    });

    renderProfile(updatedProfile);
    editProfileBox.classList.remove('edit-profile-box-visible');
    selectedAvatarFile = null;
    editAvatarInput.value = '';
  } catch (error) {
    showError(error.message);
  } finally {
    saveProfileButton.disabled = false;
    saveProfileButton.textContent = 'Save Changes';
  }
});

// -------------------- Posts --------------------

function renderPosts(posts) {
  if (posts.length === 0) {
    profilePostsList.innerHTML = `
      <div class="empty-state">
        No posts yet.
      </div>
    `;
    return;
  }

  const postsHtml = posts.map((post) => createPostCardHtml(post)).join('');
  profilePostsList.innerHTML = postsHtml;
}

// -------------------- Helpers --------------------

function showLoading(isLoading) {
  loadingSpinner.classList.toggle('spinner-visible', isLoading);
}

function showError(message) {
  errorBanner.textContent = escapeHtml(message);
  errorBanner.classList.add('error-banner-visible');
}

function hideError() {
  errorBanner.textContent = '';
  errorBanner.classList.remove('error-banner-visible');
}

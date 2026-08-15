import { createPost, getAllPosts } from './data/api.js';
import { isLoggedIn } from './utils/fetchUtils.js';
import { setupHeader } from './utils/headerUtils.js';
import { attachPostListEvents, createPostCardHtml } from './utils/postRenderer.js';

// Guard this page: only logged-in users may see the feed
if (!isLoggedIn()) {
  window.location.href = 'login.html';
}

const errorBanner = document.querySelector('#js-error-banner');
const loadingSpinner = document.querySelector('#js-loading-spinner');
const postsList = document.querySelector('#js-posts-list');

const createPostForm = document.querySelector('#js-create-post-form');
const captionInput = document.querySelector('#js-post-caption-input');
const imageInput = document.querySelector('#js-post-image-input');
const imagePreview = document.querySelector('#js-post-image-preview');
const imageFilenameLabel = document.querySelector('#js-post-image-filename');
const submitButton = document.querySelector('#js-post-submit-button');

let selectedImageFile = null;

setupHeader();
attachPostListEvents(postsList);
loadFeed();

// -------------------- Create post --------------------

imageInput.addEventListener('change', () => {
  const file = imageInput.files[0];
  if (!file) {
    return;
  }

  selectedImageFile = file;
  imageFilenameLabel.textContent = file.name;

  const reader = new FileReader();
  reader.addEventListener('load', () => {
    imagePreview.src = reader.result;
    imagePreview.style.display = 'block';
  });
  reader.readAsDataURL(file);
});

createPostForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideError();

  const caption = captionInput.value.trim();

  if (!caption && !selectedImageFile) {
    showError('Write something or add a photo before posting.');
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = 'Posting...';

  try {
    const newPost = await createPost({ caption, imageFile: selectedImageFile });
    postsList.insertAdjacentHTML('afterbegin', createPostCardHtml(newPost));
    resetCreatePostForm();
  } catch (error) {
    showError(error.message);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Post';
  }
});

function resetCreatePostForm() {
  createPostForm.reset();
  selectedImageFile = null;
  imageInput.value = '';
  imageFilenameLabel.textContent = '';
  imagePreview.src = '';
  imagePreview.style.display = 'none';
}

// -------------------- Load feed --------------------

async function loadFeed() {
  showLoading(true);
  hideError();

  try {
    const posts = await getAllPosts();
    renderPosts(posts);
  } catch (error) {
    showError(error.message);
  } finally {
    showLoading(false);
  }
}

function renderPosts(posts) {
  if (posts.length === 0) {
    postsList.innerHTML = `
      <div class="empty-state">
        No posts yet. Be the first to share something!
      </div>
    `;
    return;
  }

  const postsHtml = posts.map((post) => createPostCardHtml(post)).join('');
  postsList.innerHTML = postsHtml;
}

// -------------------- Helpers --------------------

function showLoading(isLoading) {
  loadingSpinner.classList.toggle('spinner-visible', isLoading);
}

function showError(message) {
  errorBanner.textContent = message;
  errorBanner.classList.add('error-banner-visible');
}

function hideError() {
  errorBanner.textContent = '';
  errorBanner.classList.remove('error-banner-visible');
}

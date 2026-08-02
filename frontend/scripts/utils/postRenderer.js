/*
  postRenderer.js

  Builds the HTML for a single post card (and its comments), and wires
  up click/submit events for liking, deleting, and commenting.
  Used by both home.js (main feed) and profile.js (a user's posts).
*/

import { addComment, deletePost, getComments, toggleLike } from '../data/api.js';
import { escapeHtml, formatTimeAgo, getAvatarUrl } from './formatUtils.js';

export function createPostCardHtml(post) {
  const likeButtonClass = post.is_liked
    ? 'post-card-action-button post-card-like-button post-card-like-button-active'
    : 'post-card-action-button post-card-like-button';
  const likeIcon = post.is_liked ? '❤️' : '🤍';

  const imageHtml = post.image
    ? `<img class="post-card-image" src="${post.image}" alt="Post image">`
    : '';

  const deleteButtonHtml = post.is_own_post
    ? `<button class="post-card-delete-button" data-action="delete-post">Delete</button>`
    : '';

  return `
    <article class="post-card" data-post-id="${post.id}">
      <div class="post-card-header">
        <img class="post-card-avatar" src="${getAvatarUrl(post.author_avatar)}" alt="${escapeHtml(post.author_username)}">
        <div class="post-card-author-info">
          <a href="profile.html?username=${encodeURIComponent(post.author_username)}" class="post-card-username">
            ${escapeHtml(post.author_username)}
          </a>
          <div class="post-card-timestamp">${formatTimeAgo(post.created_at)}</div>
        </div>
        ${deleteButtonHtml}
      </div>

      ${post.caption ? `<p class="post-card-caption">${escapeHtml(post.caption)}</p>` : ''}
      ${imageHtml}

      <div class="post-card-actions">
        <button class="${likeButtonClass}" data-action="toggle-like">
          <span data-role="like-icon">${likeIcon}</span>
          <span data-role="like-count">${post.likes_count}</span> Likes
        </button>
        <button class="post-card-action-button" data-action="toggle-comments">
          💬 <span data-role="comment-count">${post.comments_count}</span> Comments
        </button>
      </div>

      <div class="post-card-comments" data-role="comments-section">
        <div data-role="comments-list"></div>
        <form class="comment-form" data-role="comment-form">
          <input type="text" class="comment-form-input" placeholder="Write a comment..." maxlength="300" required>
          <button type="submit" class="comment-form-submit-button">Send</button>
        </form>
      </div>
    </article>
  `;
}

function createCommentHtml(comment) {
  return `
    <div class="comment-item">
      <img class="comment-item-avatar" src="${getAvatarUrl(comment.author_avatar)}" alt="${escapeHtml(comment.author_username)}">
      <div class="comment-item-text">
        <span class="comment-item-username">${escapeHtml(comment.author_username)}</span>
        <span>${escapeHtml(comment.text)}</span>
      </div>
    </div>
  `;
}

/*
  attachPostListEvents()
  Sets up event delegation on the container that holds all post cards,
  so we only need one set of listeners no matter how many posts render.
*/
export function attachPostListEvents(listContainer) {
  listContainer.addEventListener('click', async (event) => {
    const likeButton = event.target.closest('[data-action="toggle-like"]');
    if (likeButton) {
      await handleToggleLike(likeButton);
      return;
    }

    const deleteButton = event.target.closest('[data-action="delete-post"]');
    if (deleteButton) {
      await handleDeletePost(deleteButton);
      return;
    }

    const commentsToggleButton = event.target.closest('[data-action="toggle-comments"]');
    if (commentsToggleButton) {
      await handleToggleComments(commentsToggleButton);
      return;
    }
  });

  listContainer.addEventListener('submit', async (event) => {
    const commentForm = event.target.closest('[data-role="comment-form"]');
    if (commentForm) {
      event.preventDefault();
      await handleAddComment(commentForm);
    }
  });
}

async function handleToggleLike(likeButton) {
  const postCard = likeButton.closest('.post-card');
  const postId = postCard.dataset.postId;

  likeButton.disabled = true;
  try {
    const result = await toggleLike(postId);
    likeButton.classList.toggle('post-card-like-button-active', result.is_liked);
    likeButton.querySelector('[data-role="like-icon"]').textContent = result.is_liked ? '❤️' : '🤍';
    likeButton.querySelector('[data-role="like-count"]').textContent = result.likes_count;
  } catch (error) {
    alert(error.message);
  } finally {
    likeButton.disabled = false;
  }
}

async function handleDeletePost(deleteButton) {
  const postCard = deleteButton.closest('.post-card');
  const postId = postCard.dataset.postId;

  const confirmed = confirm('Delete this post? This cannot be undone.');
  if (!confirmed) {
    return;
  }

  deleteButton.disabled = true;
  try {
    await deletePost(postId);
    postCard.remove();
  } catch (error) {
    alert(error.message);
    deleteButton.disabled = false;
  }
}

async function handleToggleComments(toggleButton) {
  const postCard = toggleButton.closest('.post-card');
  const postId = postCard.dataset.postId;
  const commentsSection = postCard.querySelector('[data-role="comments-section"]');
  const commentsList = postCard.querySelector('[data-role="comments-list"]');

  const isVisible = commentsSection.classList.contains('post-card-comments-visible');

  if (isVisible) {
    commentsSection.classList.remove('post-card-comments-visible');
    return;
  }

  commentsSection.classList.add('post-card-comments-visible');

  // Only fetch comments the first time this section is opened
  if (commentsList.dataset.loaded === 'true') {
    return;
  }

  commentsList.innerHTML = '<p class="header-search-empty">Loading comments...</p>';

  try {
    const comments = await getComments(postId);
    commentsList.innerHTML = comments.length
      ? comments.map(createCommentHtml).join('')
      : '<p class="header-search-empty">No comments yet. Be the first!</p>';
    commentsList.dataset.loaded = 'true';
  } catch (error) {
    commentsList.innerHTML = `<p class="header-search-empty">${escapeHtml(error.message)}</p>`;
  }
}

async function handleAddComment(commentForm) {
  const postCard = commentForm.closest('.post-card');
  const postId = postCard.dataset.postId;
  const input = commentForm.querySelector('.comment-form-input');
  const text = input.value.trim();

  if (!text) {
    return;
  }

  const submitButton = commentForm.querySelector('.comment-form-submit-button');
  submitButton.disabled = true;

  try {
    const newComment = await addComment(postId, text);

    const commentsList = postCard.querySelector('[data-role="comments-list"]');
    const emptyMessage = commentsList.querySelector('.header-search-empty');
    if (emptyMessage) {
      emptyMessage.remove();
    }
    commentsList.insertAdjacentHTML('beforeend', createCommentHtml(newComment));
    commentsList.dataset.loaded = 'true';

    const commentCountEl = postCard.querySelector('[data-role="comment-count"]');
    commentCountEl.textContent = Number(commentCountEl.textContent) + 1;

    input.value = '';
  } catch (error) {
    alert(error.message);
  } finally {
    submitButton.disabled = false;
  }
}

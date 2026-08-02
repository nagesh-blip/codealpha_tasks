/*
  formatUtils.js

  Small formatting helpers used when building post/comment HTML.
*/

export function formatTimeAgo(dateString) {
  const postDate = new Date(dateString);
  const secondsAgo = Math.floor((Date.now() - postDate.getTime()) / 1000);

  if (secondsAgo < 60) {
    return 'just now';
  }

  const minutesAgo = Math.floor(secondsAgo / 60);
  if (minutesAgo < 60) {
    return `${minutesAgo}m ago`;
  }

  const hoursAgo = Math.floor(minutesAgo / 60);
  if (hoursAgo < 24) {
    return `${hoursAgo}h ago`;
  }

  const daysAgo = Math.floor(hoursAgo / 24);
  if (daysAgo < 7) {
    return `${daysAgo}d ago`;
  }

  return postDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function getInitials(username) {
  return username ? username.charAt(0).toUpperCase() : '?';
}

export function getAvatarUrl(avatarUrl) {
  // Falls back to a local placeholder image when the user has no avatar
  return avatarUrl || 'images/default-avatar.png';
}

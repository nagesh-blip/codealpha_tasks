/* dashboard.js — project list + create-project modal for dashboard.html */

window.api.requireAuth();

const pageAlert = document.getElementById('page-alert');
const loadingEl = document.getElementById('loading');
const emptyStateEl = document.getElementById('empty-state');
const gridEl = document.getElementById('project-grid');
const welcomeHeading = document.getElementById('welcome-heading');
const navAvatar = document.getElementById('nav-avatar');

const modalOverlay = document.getElementById('project-modal-overlay');
const projectForm = document.getElementById('project-form');
const projectFormAlert = document.getElementById('project-form-alert');
const saveBtn = document.getElementById('project-save-btn');

function initial(text) {
  return (text || '?').trim().charAt(0).toUpperCase() || '?';
}

function showPageError(message) {
  pageAlert.textContent = message;
  pageAlert.classList.add('is-visible');
}

function setupUserChrome() {
  const user = window.api.getCurrentUser();
  if (user) {
    navAvatar.textContent = initial(user.first_name || user.username);
    welcomeHeading.textContent = `Welcome back, ${user.first_name || user.username}`;
  }
}

function renderProjects(projects) {
  gridEl.innerHTML = '';
  if (projects.length === 0) {
    emptyStateEl.style.display = 'block';
    gridEl.style.display = 'none';
    return;
  }
  emptyStateEl.style.display = 'none';
  gridEl.style.display = 'grid';

  projects.forEach((project) => {
    const card = document.createElement('div');
    card.className = 'card project-card';
    card.tabIndex = 0;

    const membersHtml = project.members
      .slice(0, 4)
      .map((m) => `<div class="member-chip" title="${escapeHtml(m.username)}">${initial(m.first_name || m.username)}</div>`)
      .join('');

    card.innerHTML = `
      <h3>${escapeHtml(project.name)}</h3>
      <p class="project-desc">${escapeHtml(project.description || 'No description yet.')}</p>
      <div class="project-meta">
        <span>${project.task_count} task${project.task_count === 1 ? '' : 's'}</span>
        <div class="member-stack">${membersHtml}</div>
      </div>
    `;
    card.addEventListener('click', () => {
      window.location.href = `project.html?id=${project.id}`;
    });
    card.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') window.location.href = `project.html?id=${project.id}`;
    });
    gridEl.appendChild(card);
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function loadProjects() {
  loadingEl.style.display = 'block';
  gridEl.style.display = 'none';
  emptyStateEl.style.display = 'none';
  try {
    const projects = await window.api.getProjects();
    renderProjects(projects);
  } catch (error) {
    showPageError(error.message || 'Could not load your projects.');
  } finally {
    loadingEl.style.display = 'none';
  }
}

/* ---------- modal wiring ---------- */

function openModal() {
  projectForm.reset();
  projectFormAlert.classList.remove('is-visible');
  modalOverlay.classList.add('is-open');
  document.getElementById('project-name').focus();
}

function closeModal() {
  modalOverlay.classList.remove('is-open');
}

document.getElementById('new-project-btn').addEventListener('click', openModal);
document.getElementById('empty-new-project-btn').addEventListener('click', openModal);
document.getElementById('project-modal-close').addEventListener('click', closeModal);
document.getElementById('project-cancel-btn').addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

projectForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  projectFormAlert.classList.remove('is-visible');

  const name = document.getElementById('project-name').value.trim();
  const description = document.getElementById('project-description').value.trim();

  if (!name) {
    projectFormAlert.textContent = 'Project name is required.';
    projectFormAlert.classList.add('is-visible');
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = 'Creating…';

  try {
    const project = await window.api.createProject({ name, description });
    closeModal();
    window.location.href = `project.html?id=${project.id}`;
  } catch (error) {
    projectFormAlert.textContent = error.message || 'Could not create the project.';
    projectFormAlert.classList.add('is-visible');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Create project';
  }
});

document.getElementById('logout-btn').addEventListener('click', window.api.logout);

setupUserChrome();
loadProjects();

/* project.js — project board: tasks, task detail + comments, members, project edit */

window.api.requireAuth();

/* ---------- state ---------- */

const projectId = new URLSearchParams(window.location.search).get('id');
let project = null;
let tasks = [];
let currentUser = window.api.getCurrentUser();
let editingTaskId = null; // null while the task modal is in "create" mode

/* ---------- dom refs ---------- */

const pageAlert = document.getElementById('page-alert');
const loadingEl = document.getElementById('loading');
const contentEl = document.getElementById('project-content');
const navAvatar = document.getElementById('nav-avatar');

const taskModalOverlay = document.getElementById('task-modal-overlay');
const taskForm = document.getElementById('task-form');
const taskFormAlert = document.getElementById('task-form-alert');
const taskModalTitle = document.getElementById('task-modal-title');
const taskDeleteBtn = document.getElementById('task-delete-btn');
const taskCommentsSection = document.getElementById('task-comments-section');
const commentList = document.getElementById('comment-list');
const commentForm = document.getElementById('comment-form');
const commentInput = document.getElementById('comment-input');

const membersModalOverlay = document.getElementById('members-modal-overlay');
const membersList = document.getElementById('members-list');
const membersFormAlert = document.getElementById('members-form-alert');
const addMemberForm = document.getElementById('add-member-form');

const editProjectModalOverlay = document.getElementById('edit-project-modal-overlay');
const editProjectForm = document.getElementById('edit-project-form');
const editProjectAlert = document.getElementById('edit-project-alert');

/* ---------- helpers ---------- */

function initial(text) {
  return (text || '?').trim().charAt(0).toUpperCase() || '?';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text == null ? '' : text;
  return div.innerHTML;
}

function displayName(user) {
  if (!user) return 'Unknown';
  return user.first_name ? user.first_name : user.username;
}

function isOwner() {
  return Boolean(project && currentUser && project.owner.id === currentUser.id);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatDateTime(value) {
  const date = new Date(value);
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function showPageError(message) {
  pageAlert.textContent = message;
  pageAlert.classList.add('is-visible');
}

/* ---------- initial load ---------- */

async function init() {
  if (!projectId) {
    window.location.href = 'dashboard.html';
    return;
  }
  if (currentUser) {
    navAvatar.textContent = initial(currentUser.first_name || currentUser.username);
  }

  try {
    const [projectData, taskData] = await Promise.all([
      window.api.getProject(projectId),
      window.api.getTasks(projectId),
    ]);
    project = projectData;
    tasks = taskData;
    if (!currentUser) {
      currentUser = await window.api.getProfile();
      window.api.setCurrentUser(currentUser);
      navAvatar.textContent = initial(currentUser.first_name || currentUser.username);
    }
    renderProjectHeader();
    renderBoard();
    loadingEl.style.display = 'none';
    contentEl.style.display = 'block';
  } catch (error) {
    loadingEl.style.display = 'none';
    if (error instanceof window.api.ApiError && (error.status === 403 || error.status === 404)) {
      showPageError("You don't have access to this project, or it doesn't exist.");
    } else {
      showPageError(error.message || 'Could not load this project.');
    }
  }
}

async function refreshProject() {
  project = await window.api.getProject(projectId);
  renderProjectHeader();
}

async function refreshTasks() {
  tasks = await window.api.getTasks(projectId);
  renderBoard();
}

/* ---------- header / members bar ---------- */

function renderProjectHeader() {
  document.getElementById('project-name').textContent = project.name;
  document.getElementById('project-description').textContent = project.description || 'No description yet.';
  document.title = `${project.name} — Project Board`;

  const stack = document.getElementById('member-stack');
  stack.innerHTML = project.members
    .slice(0, 5)
    .map((m) => `<div class="member-chip" title="${escapeHtml(m.username)}">${initial(m.first_name || m.username)}</div>`)
    .join('');

  document.getElementById('member-count-label').textContent =
    `${project.members.length} member${project.members.length === 1 ? '' : 's'}`;

  document.getElementById('edit-project-btn').style.display = isOwner() ? 'inline-flex' : 'none';
}

/* ---------- board ---------- */

function renderBoard() {
  const columns = { todo: [], in_progress: [], done: [] };
  tasks.forEach((task) => {
    if (columns[task.status]) columns[task.status].push(task);
  });

  Object.keys(columns).forEach((status) => {
    const body = document.getElementById(`column-${status}`);
    const count = document.getElementById(`count-${status}`);
    count.textContent = columns[status].length;
    body.innerHTML = '';

    if (columns[status].length === 0) {
      const empty = document.createElement('p');
      empty.className = 'due-date';
      empty.style.textAlign = 'center';
      empty.style.padding = '12px 0';
      empty.textContent = 'No tasks here.';
      body.appendChild(empty);
      return;
    }

    columns[status].forEach((task) => {
      const card = document.createElement('div');
      card.className = 'task-card';
      card.tabIndex = 0;

      const overdue = task.due_date && task.due_date < todayIso() && task.status !== 'done';
      const dueHtml = task.due_date
        ? `<span class="due-date ${overdue ? 'is-overdue' : ''}">${overdue ? 'Overdue ' : 'Due '}${formatDate(task.due_date)}</span>`
        : '<span class="due-date">No due date</span>';
      const assigneeHtml = task.assigned_to
        ? `<div class="task-assignee" title="${escapeHtml(displayName(task.assigned_to))}">${initial(task.assigned_to.first_name || task.assigned_to.username)}</div>`
        : '';

      card.innerHTML = `
        <div class="task-title">${escapeHtml(task.title)}</div>
        <span class="badge badge-priority-${task.priority}">${task.priority}</span>
        <div class="task-meta">
          ${dueHtml}
          ${assigneeHtml}
        </div>
      `;
      card.addEventListener('click', () => openTaskModal('edit', task));
      body.appendChild(card);
    });
  });
}

/* ---------- task modal ---------- */

function populateAssigneeSelect(selectedId) {
  const select = document.getElementById('task-assignee');
  select.innerHTML = '<option value="">Unassigned</option>';
  project.members.forEach((member) => {
    const opt = document.createElement('option');
    opt.value = member.id;
    opt.textContent = `${displayName(member)} (${member.username})`;
    if (selectedId && member.id === selectedId) opt.selected = true;
    select.appendChild(opt);
  });
}

function openTaskModal(mode, task) {
  taskFormAlert.classList.remove('is-visible');
  taskForm.reset();
  editingTaskId = task ? task.id : null;

  if (mode === 'create') {
    taskModalTitle.textContent = 'New task';
    taskCommentsSection.style.display = 'none';
    taskDeleteBtn.style.display = 'none';
    document.getElementById('task-status').value = 'todo';
    document.getElementById('task-priority').value = 'medium';
    populateAssigneeSelect(null);
  } else {
    taskModalTitle.textContent = 'Edit task';
    taskCommentsSection.style.display = 'block';
    document.getElementById('task-title').value = task.title;
    document.getElementById('task-description').value = task.description || '';
    document.getElementById('task-status').value = task.status;
    document.getElementById('task-priority').value = task.priority;
    document.getElementById('task-due-date').value = task.due_date || '';
    populateAssigneeSelect(task.assigned_to ? task.assigned_to.id : null);

    const canDelete = currentUser.id === task.created_by.id || currentUser.id === project.owner.id;
    taskDeleteBtn.style.display = canDelete ? 'inline-flex' : 'none';

    loadComments(task.id);
  }

  taskModalOverlay.classList.add('is-open');
  document.getElementById('task-title').focus();
}

function closeTaskModal() {
  taskModalOverlay.classList.remove('is-open');
  editingTaskId = null;
  commentList.innerHTML = '';
}

document.getElementById('add-task-btn').addEventListener('click', () => openTaskModal('create', null));
document.getElementById('task-modal-close').addEventListener('click', closeTaskModal);
document.getElementById('task-cancel-btn').addEventListener('click', closeTaskModal);
taskModalOverlay.addEventListener('click', (e) => {
  if (e.target === taskModalOverlay) closeTaskModal();
});

taskForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  taskFormAlert.classList.remove('is-visible');

  const title = document.getElementById('task-title').value.trim();
  if (!title) {
    taskFormAlert.textContent = 'Task title is required.';
    taskFormAlert.classList.add('is-visible');
    return;
  }

  const assigneeValue = document.getElementById('task-assignee').value;
  const payload = {
    title,
    description: document.getElementById('task-description').value.trim(),
    status: document.getElementById('task-status').value,
    priority: document.getElementById('task-priority').value,
    due_date: document.getElementById('task-due-date').value || null,
    assigned_to_id: assigneeValue ? Number(assigneeValue) : null,
  };

  const saveBtn = document.getElementById('task-save-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';

  try {
    if (editingTaskId) {
      await window.api.updateTask(editingTaskId, payload);
    } else {
      await window.api.createTask(projectId, payload);
    }
    closeTaskModal();
    await refreshTasks();
  } catch (error) {
    taskFormAlert.textContent = error.message || 'Could not save this task.';
    taskFormAlert.classList.add('is-visible');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save task';
  }
});

taskDeleteBtn.addEventListener('click', async () => {
  if (!editingTaskId) return;
  if (!confirm('Delete this task? This cannot be undone.')) return;
  try {
    await window.api.deleteTask(editingTaskId);
    closeTaskModal();
    await refreshTasks();
  } catch (error) {
    taskFormAlert.textContent = error.message || 'Could not delete this task.';
    taskFormAlert.classList.add('is-visible');
  }
});

/* ---------- comments ---------- */

async function loadComments(taskId) {
  commentList.innerHTML = '<p class="due-date">Loading comments…</p>';
  try {
    const comments = await window.api.getComments(taskId);
    renderComments(comments);
  } catch (error) {
    commentList.innerHTML = `<p class="due-date">${escapeHtml(error.message || 'Could not load comments.')}</p>`;
  }
}

function renderComments(comments) {
  if (comments.length === 0) {
    commentList.innerHTML = '<p class="due-date">No comments yet. Start the conversation below.</p>';
    return;
  }
  commentList.innerHTML = '';
  comments.forEach((comment) => {
    const el = document.createElement('div');
    el.className = 'comment';
    el.dataset.commentId = comment.id;
    el.innerHTML = `
      <div class="comment-head">
        <span class="comment-author">${escapeHtml(displayName(comment.user))}</span>
        <span class="comment-time">${formatDateTime(comment.created_at)}</span>
      </div>
      <div class="comment-body">${escapeHtml(comment.content)}</div>
      ${comment.can_edit ? `
        <div class="comment-actions">
          <button type="button" data-action="edit">Edit</button>
          <button type="button" data-action="delete">Delete</button>
        </div>` : ''}
    `;
    commentList.appendChild(el);
  });
}

document.getElementById('comment-post-btn').addEventListener('click', async () => {  const content = commentInput.value.trim();
  if (!content || !editingTaskId) return;
  try {
    await window.api.createComment(editingTaskId, content);
    commentInput.value = '';
    await loadComments(editingTaskId);
  } catch (error) {
    taskFormAlert.textContent = error.message || 'Could not post your comment.';
    taskFormAlert.classList.add('is-visible');
  }
});

commentList.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const commentEl = button.closest('.comment');
  const commentId = commentEl.dataset.commentId;

  if (button.dataset.action === 'delete') {
    if (!confirm('Delete this comment?')) return;
    try {
      await window.api.deleteComment(commentId);
      await loadComments(editingTaskId);
    } catch (error) {
      alert(error.message || 'Could not delete this comment.');
    }
    return;
  }

  if (button.dataset.action === 'edit') {
    const bodyEl = commentEl.querySelector('.comment-body');
    const currentText = bodyEl.textContent;
    commentEl.innerHTML = `
      <div class="field" style="margin-bottom:8px;">
        <textarea class="edit-comment-input">${escapeHtml(currentText)}</textarea>
      </div>
      <div class="comment-actions">
        <button type="button" data-action="save">Save</button>
        <button type="button" data-action="cancel">Cancel</button>
      </div>
    `;
    commentEl.querySelector('.edit-comment-input').focus();
    return;
  }

  if (button.dataset.action === 'cancel') {
    await loadComments(editingTaskId);
    return;
  }

  if (button.dataset.action === 'save') {
    const newText = commentEl.querySelector('.edit-comment-input').value.trim();
    if (!newText) return;
    try {
      await window.api.updateComment(commentId, newText);
      await loadComments(editingTaskId);
    } catch (error) {
      alert(error.message || 'Could not update this comment.');
    }
  }
});

/* ---------- members modal ---------- */

function renderMembersList() {
  membersList.innerHTML = '';
  project.members.forEach((member) => {
    const row = document.createElement('div');
    row.className = 'member-row';
    const ownerBadge = member.id === project.owner.id ? '<span class="badge badge-priority-low">Owner</span>' : '';
    row.innerHTML = `
      <div class="who">
        <div class="member-chip" style="margin-left:0;">${initial(member.first_name || member.username)}</div>
        <span>${escapeHtml(displayName(member))} <span class="due-date">@${escapeHtml(member.username)}</span></span>
        ${ownerBadge}
      </div>
    `;
    if (isOwner() && member.id !== project.owner.id) {
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'btn btn-sm btn-danger';
      removeBtn.textContent = 'Remove';
      removeBtn.addEventListener('click', () => removeMember(member.id));
      row.appendChild(removeBtn);
    }
    membersList.appendChild(row);
  });
}

async function removeMember(userId) {
  if (!confirm('Remove this member from the project?')) return;
  try {
    await window.api.removeProjectMember(projectId, userId);
    await refreshProject();
    renderMembersList();
  } catch (error) {
    membersFormAlert.textContent = error.message || 'Could not remove this member.';
    membersFormAlert.classList.add('is-visible');
  }
}

function openMembersModal() {
  membersFormAlert.classList.remove('is-visible');
  addMemberForm.style.display = isOwner() ? 'flex' : 'none';
  renderMembersList();
  membersModalOverlay.classList.add('is-open');
}

function closeMembersModal() {
  membersModalOverlay.classList.remove('is-open');
}

document.getElementById('manage-members-btn').addEventListener('click', openMembersModal);
document.getElementById('members-modal-close').addEventListener('click', closeMembersModal);
membersModalOverlay.addEventListener('click', (e) => {
  if (e.target === membersModalOverlay) closeMembersModal();
});

addMemberForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  membersFormAlert.classList.remove('is-visible');
  const input = document.getElementById('new-member-username');
  const username = input.value.trim();
  if (!username) return;
  try {
    await window.api.addProjectMember(projectId, username);
    input.value = '';
    await refreshProject();
    renderMembersList();
  } catch (error) {
    membersFormAlert.textContent = error.message || 'Could not add this member.';
    membersFormAlert.classList.add('is-visible');
  }
});

/* ---------- edit project modal ---------- */

function openEditProjectModal() {
  if (!isOwner()) return;
  editProjectAlert.classList.remove('is-visible');
  document.getElementById('edit-project-name').value = project.name;
  document.getElementById('edit-project-description').value = project.description || '';
  editProjectModalOverlay.classList.add('is-open');
}

function closeEditProjectModal() {
  editProjectModalOverlay.classList.remove('is-open');
}

document.getElementById('edit-project-btn').addEventListener('click', openEditProjectModal);
document.getElementById('edit-project-modal-close').addEventListener('click', closeEditProjectModal);
document.getElementById('edit-project-cancel-btn').addEventListener('click', closeEditProjectModal);
editProjectModalOverlay.addEventListener('click', (e) => {
  if (e.target === editProjectModalOverlay) closeEditProjectModal();
});

editProjectForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  editProjectAlert.classList.remove('is-visible');
  const name = document.getElementById('edit-project-name').value.trim();
  if (!name) {
    editProjectAlert.textContent = 'Project name is required.';
    editProjectAlert.classList.add('is-visible');
    return;
  }
  const description = document.getElementById('edit-project-description').value.trim();
  const saveBtn = document.getElementById('edit-project-save-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';
  try {
    await window.api.updateProject(projectId, { name, description });
    await refreshProject();
    closeEditProjectModal();
  } catch (error) {
    editProjectAlert.textContent = error.message || 'Could not save this project.';
    editProjectAlert.classList.add('is-visible');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save changes';
  }
});

document.getElementById('delete-project-btn').addEventListener('click', async () => {
  if (!confirm('Delete this project and all of its tasks? This cannot be undone.')) return;
  try {
    await window.api.deleteProject(projectId);
    window.location.href = 'dashboard.html';
  } catch (error) {
    editProjectAlert.textContent = error.message || 'Could not delete this project.';
    editProjectAlert.classList.add('is-visible');
  }
});

document.getElementById('logout-btn').addEventListener('click', window.api.logout);

init();

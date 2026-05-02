'use strict';

// ─── Auto-detect API base URL ─────────────────────────────────────────────────
// If opened via VS Code Live Server (port 5500 or file://), point to Express.
// If served by Express itself (port 3000), use relative path.
const API = (window.location.port === '5500' || window.location.protocol === 'file:')
  ? 'http://localhost:3000/api'
  : '/api';


// ─── State ───────────────────────────────────────────────────────────────────
let token = localStorage.getItem('token') || null;
let currentUser = JSON.parse(localStorage.getItem('user') || 'null');
let allTasks = [];
let currentFilter = 'all';
let currentSort = 'newest';
let deleteTargetId = null;

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const authPage = document.getElementById('auth-page');
const dashPage = document.getElementById('dashboard-page');

const loginSection   = document.getElementById('login-section');
const registerSection = document.getElementById('register-section');
const loginForm      = document.getElementById('login-form');
const registerForm   = document.getElementById('register-form');
const loginError     = document.getElementById('login-error');
const registerError  = document.getElementById('register-error');

const goRegisterLink = document.getElementById('go-register');
const goLoginLink    = document.getElementById('go-login');

const taskList      = document.getElementById('task-list');
const taskEmpty     = document.getElementById('task-empty');
const searchInput   = document.getElementById('search-input');
const sortSelect    = document.getElementById('sort-select');

const taskModal     = document.getElementById('task-modal');
const taskForm      = document.getElementById('task-form');
const modalHeading  = document.getElementById('modal-heading');
const taskIdField   = document.getElementById('task-id');
const taskTitleF    = document.getElementById('task-title');
const taskDescF     = document.getElementById('task-desc');
const taskDueF      = document.getElementById('task-due');
const taskStatusF   = document.getElementById('task-status');

const confirmModal  = document.getElementById('confirm-modal');
const confirmDelBtn = document.getElementById('confirm-delete-btn');

// ─── Init ─────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  if (token && currentUser) {
    showDashboard();
    loadTasks();
  } else {
    showAuth();
  }
  bindEvents();
});

// ─── Bind Events ──────────────────────────────────────────────────────────────
function bindEvents() {
  // Auth toggles
  goRegisterLink?.addEventListener('click', e => { e.preventDefault(); switchAuthSection('register'); });
  goLoginLink?.addEventListener('click',    e => { e.preventDefault(); switchAuthSection('login'); });

  // Auth forms
  loginForm?.addEventListener('submit',    handleLogin);
  registerForm?.addEventListener('submit', handleRegister);

  // Password toggles
  document.querySelectorAll('.pwd-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const inp = btn.previousElementSibling;
      const icon = btn.querySelector('i');
      if (inp.type === 'password') { inp.type = 'text'; icon.className = 'fa-regular fa-eye-slash'; }
      else { inp.type = 'password'; icon.className = 'fa-regular fa-eye'; }
    });
  });

  // Logout
  document.getElementById('logout-btn')?.addEventListener('click', handleLogout);

  // Open task modal
  ['sidebar-create-btn','topbar-add-btn','empty-add-btn'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => openTaskModal());
  });

  // Task form submit
  taskForm?.addEventListener('submit', handleTaskSubmit);

  // Modal close
  document.getElementById('modal-close-btn')?.addEventListener('click',  closeTaskModal);
  document.getElementById('modal-cancel-btn')?.addEventListener('click', closeTaskModal);
  taskModal?.addEventListener('click', e => { if (e.target === taskModal) closeTaskModal(); });

  // Confirm delete modal
  document.getElementById('confirm-close-btn')?.addEventListener('click',  closeConfirmModal);
  document.getElementById('confirm-cancel-btn')?.addEventListener('click', closeConfirmModal);
  confirmModal?.addEventListener('click', e => { if (e.target === confirmModal) closeConfirmModal(); });
  confirmDelBtn?.addEventListener('click', executeDelete);

  // Filter tabs
  document.querySelectorAll('.ftab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ftab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderTasks();
    });
  });

  // Sidebar filter links
  document.querySelectorAll('.filter-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      link.classList.add('active');
      currentFilter = link.dataset.filter;
      // sync tab
      document.querySelectorAll('.ftab').forEach(b => {
        b.classList.toggle('active', b.dataset.filter === currentFilter);
      });
      renderTasks();
    });
  });

  // Sort
  sortSelect?.addEventListener('change', () => {
    currentSort = sortSelect.value;
    renderTasks();
  });

  // Search
  searchInput?.addEventListener('input', () => renderTasks());

  // Mobile sidebar
  document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.toggle('open');
  });
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
function switchAuthSection(which) {
  loginSection.classList.toggle('active', which === 'login');
  registerSection.classList.toggle('active', which === 'register');
  loginError.classList.add('hidden');
  registerError.classList.add('hidden');
}

async function handleLogin(e) {
  e.preventDefault();
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  setSubmitLoading('login-submit-btn', true);
  try {
    const data = await apiFetch('/auth/login', 'POST', { email, password });
    onAuthSuccess(data);
  } catch(err) {
    showFieldError(loginError, err.message || 'Invalid credentials');
  } finally {
    setSubmitLoading('login-submit-btn', false);
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const name     = document.getElementById('reg-name').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  setSubmitLoading('register-submit-btn', true);
  try {
    const data = await apiFetch('/auth/register', 'POST', { name, email, password });
    onAuthSuccess(data);
  } catch(err) {
    showFieldError(registerError, err.message || 'Registration failed');
  } finally {
    setSubmitLoading('register-submit-btn', false);
  }
}

function onAuthSuccess(data) {
  token = data.token;
  currentUser = data.user;
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(currentUser));
  showDashboard();
  loadTasks();
  showToast('Welcome back, ' + currentUser.name + '! 👋', 'success');
}

function handleLogout() {
  token = null; currentUser = null;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  allTasks = [];
  showAuth();
  showToast('Logged out successfully', 'info');
}

// ─── View Switching ───────────────────────────────────────────────────────────
function showAuth() {
  authPage.classList.add('active');
  dashPage.classList.remove('active');
  switchAuthSection('login');
}

function showDashboard() {
  authPage.classList.remove('active');
  dashPage.classList.add('active');
  if (currentUser) {
    const initial = currentUser.name?.charAt(0).toUpperCase() || 'U';
    document.getElementById('sidebar-avatar').textContent = initial;
    document.getElementById('sidebar-user-name').textContent = currentUser.name || 'User';
  }
}

// ─── Tasks API ────────────────────────────────────────────────────────────────
async function loadTasks() {
  try {
    allTasks = await apiFetch('/tasks', 'GET');
    renderTasks();
    updateStats();
  } catch(err) {
    if (err.status === 401) handleLogout();
    else showToast('Failed to load tasks', 'error');
  }
}

async function handleTaskSubmit(e) {
  e.preventDefault();
  const id     = taskIdField.value;
  const body   = {
    title:       taskTitleF.value.trim(),
    description: taskDescF.value.trim(),
    dueDate:     taskDueF.value || null,
    status:      taskStatusF.value
  };
  if (!body.title) { showToast('Task title is required', 'error'); return; }
  try {
    if (id) {
      const updated = await apiFetch('/tasks/' + id, 'PUT', body);
      allTasks = allTasks.map(t => t._id === id ? updated : t);
      showToast('Task updated successfully', 'success');
    } else {
      const created = await apiFetch('/tasks', 'POST', body);
      allTasks.unshift(created);
      showToast('Task created! 🎉', 'success');
    }
    closeTaskModal();
    renderTasks();
    updateStats();
  } catch(err) {
    showToast(err.message || 'Failed to save task', 'error');
  }
}

async function toggleStatus(id) {
  const task = allTasks.find(t => t._id === id);
  if (!task) return;
  const newStatus = task.status === 'Pending' ? 'Completed' : 'Pending';
  try {
    const updated = await apiFetch('/tasks/' + id, 'PUT', { status: newStatus });
    allTasks = allTasks.map(t => t._id === id ? updated : t);
    renderTasks();
    updateStats();
    showToast(newStatus === 'Completed' ? 'Task completed! ✅' : 'Task marked as pending', 'success');
  } catch(err) {
    showToast('Failed to update task', 'error');
  }
}

function promptDelete(id) {
  deleteTargetId = id;
  confirmModal.classList.add('active');
}

async function executeDelete() {
  if (!deleteTargetId) return;
  try {
    await apiFetch('/tasks/' + deleteTargetId, 'DELETE');
    allTasks = allTasks.filter(t => t._id !== deleteTargetId);
    closeConfirmModal();
    renderTasks();
    updateStats();
    showToast('Task deleted', 'info');
  } catch(err) {
    showToast('Failed to delete task', 'error');
  }
}

// ─── Render ───────────────────────────────────────────────────────────────────
function renderTasks() {
  const search = searchInput?.value.toLowerCase().trim() || '';
  let tasks = allTasks.filter(t => {
    if (currentFilter === 'pending'   && t.status !== 'Pending')   return false;
    if (currentFilter === 'completed' && t.status !== 'Completed') return false;
    if (search && !t.title.toLowerCase().includes(search) && !(t.description||'').toLowerCase().includes(search)) return false;
    return true;
  });

  // Sort
  tasks = sortTasks(tasks);

  // Update pending badge
  const pendingCount = allTasks.filter(t => t.status === 'Pending').length;
  const badge = document.getElementById('pending-count');
  if (badge) { badge.textContent = pendingCount; badge.style.display = pendingCount ? '' : 'none'; }

  if (tasks.length === 0) {
    taskList.innerHTML = '';
    taskEmpty.classList.remove('hidden');
  } else {
    taskEmpty.classList.add('hidden');
    taskList.innerHTML = tasks.map(taskRowHTML).join('');
  }
}

function sortTasks(tasks) {
  return [...tasks].sort((a, b) => {
    if (currentSort === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
    if (currentSort === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
    if (currentSort === 'due') {
      if (!a.dueDate) return 1; if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    }
    if (currentSort === 'name') return a.title.localeCompare(b.title);
    return 0;
  });
}

function taskRowHTML(task) {
  const isCompleted = task.status === 'Completed';
  const { dueTxt, dueCls } = formatDue(task.dueDate, isCompleted);
  const descTxt = task.description ? escHTML(task.description) : '<span style="color:#c0c6cc">—</span>';
  return `
  <div class="task-row ${isCompleted ? 'completed' : ''}" data-id="${task._id}">
    <button class="task-check-btn" onclick="toggleStatus('${task._id}')" title="${isCompleted ? 'Mark pending' : 'Mark complete'}">
      <i class="fa-solid fa-check"></i>
    </button>
    <div class="task-name">${escHTML(task.title)}</div>
    <div class="task-desc-cell" title="${escHTML(task.description||'')}">${descTxt}</div>
    <div class="task-due-cell ${dueCls}">
      ${task.dueDate ? '<i class="fa-regular fa-calendar"></i>' : ''} ${dueTxt}
    </div>
    <div class="task-status-cell">
      <span class="status-pill ${isCompleted ? 'completed' : 'pending'}">
        ${isCompleted ? '✅ Completed' : '⏳ Pending'}
      </span>
    </div>
    <div class="task-row-actions">
      <button class="row-action-btn" onclick="openTaskModal('${task._id}')" title="Edit"><i class="fa-solid fa-pen"></i></button>
      <button class="row-action-btn del" onclick="promptDelete('${task._id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
    </div>
  </div>`;
}

function formatDue(dueDate, isCompleted) {
  if (!dueDate) return { dueTxt: 'No due date', dueCls: '' };
  const due  = new Date(dueDate);
  const now  = new Date();
  const diff = Math.ceil((due - now) / 86400000);
  const opts = { month: 'short', day: 'numeric' };
  const dueTxt = due.toLocaleDateString(undefined, opts);
  let dueCls = '';
  if (!isCompleted) {
    if (diff < 0)      dueCls = 'overdue';
    else if (diff <= 2) dueCls = 'soon';
  }
  return { dueTxt, dueCls };
}

// ─── Chart instances ──────────────────────────────────────────────────────────
let donutChart = null;
let barChart   = null;

function updateStats() {
  const total     = allTasks.length;
  const completed = allTasks.filter(t => t.status === 'Completed').length;
  const pending   = allTasks.filter(t => t.status === 'Pending').length;
  const now = new Date();
  const overdue   = allTasks.filter(t => t.status === 'Pending' && t.dueDate && new Date(t.dueDate) < now).length;

  // Stat cards
  document.getElementById('stat-total').textContent     = total;
  document.getElementById('stat-completed').textContent = completed;
  document.getElementById('stat-pending').textContent   = pending;
  document.getElementById('stat-overdue').textContent   = overdue;

  // Update charts
  updateCharts(total, completed, pending);
}

function updateCharts(total, completed, pending) {
  // ── Donut total label ──
  const donutTotalEl = document.getElementById('donut-total');
  if (donutTotalEl) donutTotalEl.textContent = total;

  // ── Completion rate ──
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const pctEl  = document.getElementById('completion-pct');
  const barEl  = document.getElementById('completion-bar');
  const cComp  = document.getElementById('c-completed');
  const cPend  = document.getElementById('c-pending');
  if (pctEl)  pctEl.textContent  = pct + '%';
  if (barEl)  barEl.style.width  = pct + '%';
  if (cComp)  cComp.textContent  = completed;
  if (cPend)  cPend.textContent  = pending;

  // ── Donut Chart ──
  const donutCanvas = document.getElementById('taskDonutChart');
  if (donutCanvas) {
    const donutData = {
      labels: ['Pending', 'Completed'],
      datasets: [{
        data: total === 0 ? [1, 0] : [pending, completed],
        backgroundColor: total === 0 ? ['#e8ecee', '#e8ecee'] : ['#f1bd6c', '#00a47b'],
        borderWidth: 0,
        hoverOffset: 6
      }]
    };
    if (donutChart) {
      donutChart.data = donutData;
      donutChart.update();
    } else {
      donutChart = new Chart(donutCanvas, {
        type: 'doughnut',
        data: donutData,
        options: {
          cutout: '72%',
          plugins: { legend: { display: false }, tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.label}: ${ctx.parsed} tasks`
            }
          }},
          animation: { animateRotate: true, duration: 600 }
        }
      });
    }
  }

  // ── Bar Chart (Pending vs Completed) ──
  const barCanvas = document.getElementById('statusBarChart');
  if (barCanvas) {
    const barData = {
      labels: ['Total', 'Pending', 'Completed', 'Overdue'],
      datasets: [{
        label: 'Tasks',
        data: [
          total,
          pending,
          completed,
          allTasks.filter(t => t.status === 'Pending' && t.dueDate && new Date(t.dueDate) < new Date()).length
        ],
        backgroundColor: ['#5c84f1cc', '#f1bd6ccc', '#00a47bcc', '#f06a6acc'],
        borderRadius: 6,
        borderSkipped: false,
      }]
    };
    if (barChart) {
      barChart.data = barData;
      barChart.update();
    } else {
      barChart = new Chart(barCanvas, {
        type: 'bar',
        data: barData,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#6f7782' } },
            y: { beginAtZero: true, grid: { color: '#f0f1f2' }, ticks: { font: { size: 11 }, color: '#6f7782', stepSize: 1 } }
          },
          animation: { duration: 500 }
        }
      });
    }
  }
}


// ─── Modal Helpers ────────────────────────────────────────────────────────────
function openTaskModal(id = null) {
  taskForm.reset();
  taskIdField.value = '';
  if (id) {
    const t = allTasks.find(t => t._id === id);
    if (!t) return;
    modalHeading.textContent = 'Edit Task';
    taskIdField.value  = t._id;
    taskTitleF.value   = t.title;
    taskDescF.value    = t.description || '';
    taskDueF.value     = t.dueDate ? t.dueDate.split('T')[0] : '';
    taskStatusF.value  = t.status;
  } else {
    modalHeading.textContent = 'New Task';
  }
  taskModal.classList.add('active');
  setTimeout(() => taskTitleF.focus(), 80);
}

function closeTaskModal() { taskModal.classList.remove('active'); }
function closeConfirmModal() { confirmModal.classList.remove('active'); deleteTargetId = null; }

// Expose to inline onclick handlers
window.toggleStatus  = toggleStatus;
window.promptDelete  = promptDelete;
window.openTaskModal = openTaskModal;

// ─── API Fetch Helper ─────────────────────────────────────────────────────────
async function apiFetch(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }
  };
  if (body && method !== 'GET') opts.body = JSON.stringify(body);
  const res = await fetch(API + path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const err = new Error(data.msg || 'Request failed'); err.status = res.status; throw err; }
  return data;
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i> ${msg}`;
  container.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateY(12px)'; el.style.transition = '0.3s'; setTimeout(() => el.remove(), 300); }, 3200);
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────
function setSubmitLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  btn.style.opacity = loading ? '0.7' : '1';
}

function showFieldError(el, msg) {
  el.textContent = msg;
  el.classList.remove('hidden');
}

function escHTML(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// ============================================================
//  DevTask — Programmer's To-Do App  |  app.js
// ============================================================

(function () {
  'use strict';

  // ---------- State ----------
  const STORAGE_KEY = 'devtask_tasks';
  const ACTIVITY_KEY = 'devtask_activity';
  let tasks = loadTasks();
  let activityLog = loadActivity();
  let currentView = 'dashboard';
  let calendarDate = new Date();
  let editingTaskId = null;
  let currentFilter = 'all';
  let currentSort = 'priority';
  let todaySort = localStorage.getItem('devtask_today_sort') || 'priority';
  let searchQuery = '';

  // ---------- DOM References ----------
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const sidebar = $('#sidebar');
  const menuToggle = $('#menu-toggle');
  const viewTitle = $('#view-title');
  const navBtns = $$('.nav-btn');
  const views = $$('.view');

  // Modal
  const modalOverlay = $('#modal-overlay');
  const taskForm = $('#task-form');
  const taskTitleInput = $('#task-title');
  const taskDescInput = $('#task-desc');
  const taskDateInput = $('#task-date');
  const taskPriorityInput = $('#task-priority');
  const taskTagsInput = $('#task-tags');
  const taskIdInput = $('#task-id');
  const modalTitle = $('#modal-title');
  const btnSubmit = $('#btn-submit');
  const taskFileInput = $('#task-file-input');
  const taskMediaUrl = $('#task-media-url');
  const btnAddMediaUrl = $('#btn-add-media-url');
  const mediaPreviewList = $('#media-preview-list');
  const mediaLightboxOverlay = $('#media-lightbox-overlay');
  const lightboxClose = $('#lightbox-close');
  const lightboxContent = $('#lightbox-content');
  let currentAttachments = [];

  // Icon picker
  const iconPreview = $('#icon-preview');
  const emojiGrid = $('#emoji-grid');
  const btnToggleEmojis = $('#btn-toggle-emojis');
  const btnRemoveIcon = $('#btn-remove-icon');
  const iconFileInput = $('#icon-file-input');
  let currentIcon = { type: 'emoji', value: '📝' };

  const EMOJI_LIST = [
    '📝','📋','🎯','🚀','💡','🔥','⚡','✨','🎨','🛠️',
    '📦','📚','🧪','🔬','🔧','💻','🖥️','📱','🌐','🗂️',
    '📌','🏷️','📎','🗃️','🧩','🎮','🎵','🎬','📷','🔒',
    '🏆','⭐','💎','🌈','🍀','🐛','🦋','🌸','🌊','🔮',
    '📐','✏️','🖊️','📓','🗒️','🧭','⏰','📅','🗓️','💼',
    '🎒','🧲','🔋','💾','📡','🛡️','🎁','🏗️','🔑','🧠'
  ];

  // Day modal
  const dayModalOverlay = $('#day-modal-overlay');
  const dayModalDate = $('#day-modal-date');
  const dayModalTasks = $('#day-modal-tasks');
  const dayModalAdd = $('#day-modal-add');

  // Calendar
  const calendarGrid = $('#calendar-grid');
  const calMonthYear = $('#cal-month-year');

  // Dashboard
  const todayTasksEl = $('#today-tasks');
  const upcomingTasksEl = $('#upcoming-tasks');
  const recentActivityEl = $('#recent-activity');
  const todayDateEl = $('#today-date');
  const todaySortSelect = $('#today-sort-select');

  // Stats
  const statTotal = $('#stat-total');
  const statCompleted = $('#stat-completed');
  const statPending = $('#stat-pending');

  // Tasks view
  const tasksList = $('#tasks-list');
  const filterBtns = $$('.filter-btn');
  const sortSelect = $('#sort-select');
  const searchInput = $('#search-input');

  // ---------- Utilities ----------
  function generateId() {
    return 'task_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  function formatDateShort(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function todayString() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function dateToString(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function timeAgo(timestamp) {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };

  // ---------- Storage ----------
  function loadTasks() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }

  function loadActivity() {
    try {
      return JSON.parse(localStorage.getItem(ACTIVITY_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveActivity() {
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activityLog));
  }

  function logActivity(type, taskTitle) {
    activityLog.unshift({ type, title: taskTitle, time: Date.now() });
    if (activityLog.length > 50) activityLog.length = 50;
    saveActivity();
  }

  // ---------- Toast ----------
  function showToast(message, type = 'success') {
    const container = $('#toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ---------- Navigation ----------
  function switchView(viewName) {
    currentView = viewName;
    navBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.view === viewName));
    views.forEach(v => v.classList.toggle('active', v.id === `view-${viewName}`));

    const titles = { dashboard: 'Dashboard', calendar: 'Calendar', tasks: 'All Tasks' };
    viewTitle.textContent = titles[viewName] || viewName;

    if (viewName === 'dashboard') renderDashboard();
    if (viewName === 'calendar') renderCalendar();
    if (viewName === 'tasks') renderTasksList();

    // Close mobile sidebar
    sidebar.classList.remove('open');
  }

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });

  // Close sidebar on outside click (mobile)
  document.addEventListener('click', (e) => {
    if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== menuToggle) {
      sidebar.classList.remove('open');
    }
  });

  // ---------- Modal ----------
  // Populate emoji grid once
  function populateEmojiGrid() {
    if (!emojiGrid) return;
    emojiGrid.innerHTML = EMOJI_LIST.map(e => `<button type="button" class="emoji-btn" data-emoji="${e}">${e}</button>`).join('');
    emojiGrid.querySelectorAll('.emoji-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentIcon = { type: 'emoji', value: btn.dataset.emoji };
        renderIconPreview();
        emojiGrid.classList.remove('open');
      });
    });
  }
  populateEmojiGrid();

  function renderIconPreview() {
    if (!iconPreview) return;
    if (currentIcon.type === 'image') {
      iconPreview.innerHTML = `<img src="${currentIcon.value}" alt="icon">`;
    } else {
      iconPreview.textContent = currentIcon.value;
    }
  }

  if (btnToggleEmojis) {
    btnToggleEmojis.addEventListener('click', () => {
      emojiGrid.classList.toggle('open');
    });
  }

  if (btnRemoveIcon) {
    btnRemoveIcon.addEventListener('click', () => {
      currentIcon = { type: 'emoji', value: '📝' };
      renderIconPreview();
      emojiGrid.classList.remove('open');
    });
  }

  if (iconFileInput) {
    iconFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file || !file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        // Compress for localStorage
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxW = 128;
          let w = img.width, h = img.height;
          if (w > maxW) { h = Math.round((h * maxW) / w); w = maxW; }
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          currentIcon = { type: 'image', value: canvas.toDataURL('image/jpeg', 0.8) };
          renderIconPreview();
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
      iconFileInput.value = '';
      emojiGrid.classList.remove('open');
    });
  }

  if (iconPreview) {
    iconPreview.addEventListener('click', () => {
      emojiGrid.classList.toggle('open');
    });
  }

  function openModal(task = null) {
    if (task) {
      editingTaskId = task.id;
      modalTitle.innerHTML = '<span class="accent">&gt;</span> edit_task<span class="cursor-blink">█</span>';
      btnSubmit.innerHTML = '<span class="code-keyword">await</span> update()';
      taskTitleInput.value = task.title;
      taskDescInput.value = task.description || '';
      taskDateInput.value = task.date;
      taskPriorityInput.value = task.priority;
      taskTagsInput.value = (task.tags || []).join(', ');
      taskIdInput.value = task.id;
      currentAttachments = task.attachments ? [...task.attachments] : [];
      currentIcon = task.icon ? { ...task.icon } : { type: 'emoji', value: '📝' };
    } else {
      editingTaskId = null;
      modalTitle.innerHTML = '<span class="accent">&gt;</span> new_task<span class="cursor-blink">█</span>';
      btnSubmit.innerHTML = '<span class="code-keyword">await</span> save()';
      taskForm.reset();
      taskDateInput.value = todayString();
      taskIdInput.value = '';
      currentAttachments = [];
      currentIcon = { type: 'emoji', value: '📝' };
    }
    renderIconPreview();
    if (emojiGrid) emojiGrid.classList.remove('open');
    renderMediaPreviewList();
    modalOverlay.classList.add('open');
    setTimeout(() => taskTitleInput.focus(), 200);
  }

  function closeModal() {
    modalOverlay.classList.remove('open');
    editingTaskId = null;
  }

  $('#btn-add-task').addEventListener('click', () => openModal());
  $('#modal-close').addEventListener('click', closeModal);
  $('#btn-cancel').addEventListener('click', closeModal);

  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  // ---------- Media Helpers ----------
  function renderMediaPreviewList() {
    if (!mediaPreviewList) return;
    if (currentAttachments.length === 0) {
      mediaPreviewList.innerHTML = '';
      return;
    }
    mediaPreviewList.innerHTML = currentAttachments.map((att, i) => {
      const isVideo = att.type === 'video';
      const content = isVideo
        ? `<video src="${att.url}"></video>`
        : `<img src="${att.url}" alt="preview">`;
      return `
        <div class="media-thumb-box">
          ${content}
          <button type="button" class="media-thumb-del" onclick="removeAttachment(${i})" title="Remove">×</button>
        </div>
      `;
    }).join('');
  }

  window.removeAttachment = function(i) {
    currentAttachments.splice(i, 1);
    renderMediaPreviewList();
  };

  if (taskFileInput) {
    taskFileInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files || []);
      files.forEach(file => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            compressImage(ev.target.result, (compressedUrl) => {
              currentAttachments.push({ type: 'image', url: compressedUrl, name: file.name });
              renderMediaPreviewList();
            });
          };
          reader.readAsDataURL(file);
        } else if (file.type.startsWith('video/')) {
          if (file.size > 1500000) {
            showToast('Video > 1.5MB! Use a video link instead for browser storage.', 'info');
            return;
          }
          const reader = new FileReader();
          reader.onload = (ev) => {
            currentAttachments.push({ type: 'video', url: ev.target.result, name: file.name });
            renderMediaPreviewList();
          };
          reader.readAsDataURL(file);
        }
      });
      taskFileInput.value = '';
    });
  }

  function compressImage(dataUrl, callback) {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxW = 500;
      let w = img.width;
      let h = img.height;
      if (w > maxW) {
        h = Math.round((h * maxW) / w);
        w = maxW;
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      callback(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.src = dataUrl;
  }

  if (btnAddMediaUrl) {
    btnAddMediaUrl.addEventListener('click', () => {
      const url = (taskMediaUrl.value || '').trim();
      if (!url) return;
      const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(url) || url.includes('/video');
      currentAttachments.push({ type: isVideo ? 'video' : 'image', url, name: 'URL' });
      taskMediaUrl.value = '';
      renderMediaPreviewList();
    });
  }

  window.openLightbox = function(type, url) {
    if (!mediaLightboxOverlay || !lightboxContent) return;
    lightboxContent.innerHTML = type === 'video'
      ? `<video src="${url}" controls autoplay></video>`
      : `<img src="${url}" alt="Attachment full size">`;
    mediaLightboxOverlay.classList.add('open');
  };

  if (lightboxClose && mediaLightboxOverlay) {
    lightboxClose.addEventListener('click', () => mediaLightboxOverlay.classList.remove('open'));
    mediaLightboxOverlay.addEventListener('click', (e) => {
      if (e.target === mediaLightboxOverlay) {
        mediaLightboxOverlay.classList.remove('open');
        lightboxContent.innerHTML = '';
      }
    });
  }

  // Day modal
  function openDayModal(dateStr) {
    const dayTasks = tasks.filter(t => t.date === dateStr);
    dayModalDate.textContent = formatDate(dateStr);

    if (dayTasks.length === 0) {
      dayModalTasks.innerHTML = '<div class="empty-state"><span class="empty-icon">📭</span><p>No tasks for this day</p></div>';
    } else {
      dayModalTasks.innerHTML = dayTasks.map(t => createTaskItemHTML(t)).join('');
      attachTaskListeners(dayModalTasks);
    }

    dayModalAdd.onclick = () => {
      closeDayModal();
      openModal();
      taskDateInput.value = dateStr;
    };

    dayModalOverlay.classList.add('open');
  }

  function closeDayModal() {
    dayModalOverlay.classList.remove('open');
  }

  $('#day-modal-close').addEventListener('click', closeDayModal);
  dayModalOverlay.addEventListener('click', (e) => {
    if (e.target === dayModalOverlay) closeDayModal();
  });

  // ---------- Task CRUD ----------
  taskForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const title = taskTitleInput.value.trim();
    const description = taskDescInput.value.trim();
    const date = taskDateInput.value;
    const priority = taskPriorityInput.value;
    const tagsRaw = taskTagsInput.value.trim();
    const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

    if (!title || !date) return;

    if (editingTaskId) {
      const idx = tasks.findIndex(t => t.id === editingTaskId);
      if (idx !== -1) {
        tasks[idx] = { ...tasks[idx], title, description, date, priority, tags, icon: { ...currentIcon }, attachments: [...currentAttachments], updatedAt: Date.now() };
        logActivity('updated', title);
        showToast(`Task "${title}" updated`, 'info');
      }
    } else {
      const newTask = {
        id: generateId(),
        title,
        description,
        date,
        priority,
        tags,
        icon: { ...currentIcon },
        attachments: [...currentAttachments],
        completed: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      tasks.push(newTask);
      logActivity('created', title);
      showToast(`Task "${title}" created`, 'success');
    }

    saveTasks();
    closeModal();
    refreshCurrentView();
  });

  function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
      task.completed = !task.completed;
      task.updatedAt = Date.now();
      logActivity(task.completed ? 'completed' : 'reopened', task.title);
      saveTasks();
      showToast(task.completed ? `"${task.title}" completed ✓` : `"${task.title}" reopened`, task.completed ? 'success' : 'info');
      refreshCurrentView();
    }
  }

  function deleteTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
      tasks = tasks.filter(t => t.id !== id);
      logActivity('deleted', task.title);
      saveTasks();
      showToast(`"${task.title}" deleted`, 'error');
      refreshCurrentView();
      closeDayModal();
    }
  }

  function editTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
      closeDayModal();
      openModal(task);
    }
  }

  // ---------- Task Item HTML ----------
  function createTaskItemHTML(task, options = {}) {
    const tagsHTML = (task.tags || []).map(t => `<span class="task-tag">#${t}</span>`).join('');
    const attachmentsHTML = (task.attachments && task.attachments.length > 0)
      ? `<div class="task-attachments-gallery">${task.attachments.map(att => {
          const isVideo = att.type === 'video';
          const thumbContent = isVideo
            ? `<video src="${att.url}"></video><span class="video-play-badge">▶</span>`
            : `<img src="${att.url}" alt="attachment" loading="lazy">`;
          return `<div class="task-media-thumb" onclick="openLightbox('${att.type}', '${att.url.replace(/'/g, "\\'")}')" title="Click to view full size">${thumbContent}</div>`;
        }).join('')}</div>`
      : '';

    const moveBtnsHTML = options.showMoveBtns ? `
      <button class="task-action-btn move-up" aria-label="Move task up (do earlier)" title="Move Up (Do Earlier)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>
      </button>
      <button class="task-action-btn move-down" aria-label="Move task down (do later)" title="Move Down (Do Later)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
    ` : '';

    const iconData = task.icon || { type: 'emoji', value: '📝' };
    const iconHTML = iconData.type === 'image'
      ? `<div class="task-icon"><img src="${iconData.value}" alt="icon"></div>`
      : `<div class="task-icon">${iconData.value}</div>`;

    return `
      <div class="task-item priority-${task.priority} ${task.completed ? 'completed' : ''}" data-id="${task.id}">
        <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} aria-label="Toggle ${task.title}">
        ${iconHTML}
        <div class="task-content">
          <div class="task-title">${linkify(escapeHTML(task.title))}</div>
          ${task.description ? `<div class="task-desc-preview">${linkify(escapeHTML(task.description))}</div>` : ''}
          <div class="task-meta">
            <span class="task-date-label">${formatDateShort(task.date)}</span>
            <span class="task-priority-badge ${task.priority}">${task.priority}</span>
            ${tagsHTML}
          </div>
          ${attachmentsHTML}
        </div>
        <div class="task-actions">
          ${moveBtnsHTML}
          <button class="task-action-btn edit" aria-label="Edit task" title="Edit">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="task-action-btn delete" aria-label="Delete task" title="Delete">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          </button>
        </div>
      </div>
    `;
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function linkify(str) {
    if (!str) return '';
    const urlRegex = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/g;
    return str.replace(urlRegex, (url) => {
      let href = url;
      if (url.startsWith('www.')) {
        href = 'https://' + url;
      }
      return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="task-link" onclick="event.stopPropagation()">${url}</a>`;
    });
  }

  function attachTaskListeners(container, listArray = null) {
    container.querySelectorAll('.task-item').forEach(item => {
      const id = item.dataset.id;
      const checkbox = item.querySelector('.task-checkbox');
      const editBtn = item.querySelector('.task-action-btn.edit');
      const deleteBtn = item.querySelector('.task-action-btn.delete');
      const moveUpBtn = item.querySelector('.task-action-btn.move-up');
      const moveDownBtn = item.querySelector('.task-action-btn.move-down');

      checkbox.addEventListener('change', () => toggleTask(id));
      editBtn.addEventListener('click', (e) => { e.stopPropagation(); editTask(id); });
      deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); deleteTask(id); });

      if (moveUpBtn && listArray) {
        moveUpBtn.addEventListener('click', (e) => { e.stopPropagation(); moveTaskOrder(id, -1, listArray); });
      }
      if (moveDownBtn && listArray) {
        moveDownBtn.addEventListener('click', (e) => { e.stopPropagation(); moveTaskOrder(id, 1, listArray); });
      }
    });
  }

  function moveTaskOrder(id, direction, listArray) {
    const idx = listArray.findIndex(t => t.id === id);
    if (idx === -1) return;
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= listArray.length) return;

    const temp = listArray[idx];
    listArray[idx] = listArray[targetIdx];
    listArray[targetIdx] = temp;

    listArray.forEach((t, i) => {
      const mainTask = tasks.find(x => x.id === t.id);
      if (mainTask) mainTask.order = i;
    });

    saveTasks();
    refreshCurrentView();
    showToast(direction === -1 ? 'Moved earlier ↑' : 'Moved later ↓', 'info');
  }

  // ---------- Dashboard ----------
  function renderDashboard() {
    const today = todayString();
    todayDateEl.textContent = formatDate(today);

    // Today's tasks
    let todayTasks = tasks.filter(t => t.date === today);
    if (todaySort === 'priority') {
      todayTasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    } else if (todaySort === 'manual') {
      todayTasks.sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
    }
    if (todayTasks.length === 0) {
      todayTasksEl.innerHTML = '<div class="empty-state"><span class="empty-icon">📋</span><p>No tasks for today</p><span class="hint">Press <kbd>N</kbd> to create one</span></div>';
    } else {
      todayTasksEl.innerHTML = todayTasks.map(t => createTaskItemHTML(t, { showMoveBtns: todaySort === 'manual' })).join('');
      attachTaskListeners(todayTasksEl, todayTasks);
    }
    if (todaySortSelect) {
      todaySortSelect.value = todaySort;
      todaySortSelect.onchange = () => {
        todaySort = todaySortSelect.value;
        localStorage.setItem('devtask_today_sort', todaySort);
        renderDashboard();
      };
    }

    // Upcoming tasks (next 7 days, excluding today)
    const upcoming = tasks
      .filter(t => t.date > today && !t.completed)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 8);

    if (upcoming.length === 0) {
      upcomingTasksEl.innerHTML = '<div class="empty-state"><span class="empty-icon">🚀</span><p>No upcoming tasks</p></div>';
    } else {
      upcomingTasksEl.innerHTML = upcoming.map(t => createTaskItemHTML(t)).join('');
      attachTaskListeners(upcomingTasksEl);
    }

    // Priority breakdown
    const pendingTasks = tasks.filter(t => !t.completed);
    const total = pendingTasks.length || 1;
    const counts = { urgent: 0, high: 0, medium: 0, low: 0 };
    pendingTasks.forEach(t => { counts[t.priority] = (counts[t.priority] || 0) + 1; });

    Object.keys(counts).forEach(p => {
      $(`#bar-${p}`).style.width = `${(counts[p] / total) * 100}%`;
      $(`#count-${p}`).textContent = counts[p];
    });

    // Recent activity
    if (activityLog.length === 0) {
      recentActivityEl.innerHTML = '<div class="empty-state"><span class="empty-icon">📝</span><p>No recent activity</p></div>';
    } else {
      const typeLabels = {
        created: 'Created',
        completed: 'Completed',
        deleted: 'Deleted',
        updated: 'Updated',
        reopened: 'Reopened'
      };
      const dotClass = {
        created: 'created',
        completed: 'completed',
        deleted: 'deleted',
        updated: 'created',
        reopened: 'created'
      };

      recentActivityEl.innerHTML = activityLog.slice(0, 10).map(a => `
        <div class="activity-item">
          <div class="activity-dot ${dotClass[a.type] || 'created'}"></div>
          <div class="activity-text">
            <strong>${typeLabels[a.type] || a.type}</strong> "${linkify(escapeHTML(a.title))}"
            <span class="activity-time">${timeAgo(a.time)}</span>
          </div>
        </div>
      `).join('');
    }

    updateStats();
  }

  // ---------- Calendar ----------
  function renderCalendar() {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const today = todayString();

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    calMonthYear.textContent = `${monthNames[month]} ${year}`;

    // Build calendar grid
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    let html = '';

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      html += createCalDay(day, dateStr, true, today);
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      html += createCalDay(day, dateStr, false, today);
    }

    // Next month days
    const totalCells = firstDay + daysInMonth;
    const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let day = 1; day <= remaining; day++) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      html += createCalDay(day, dateStr, true, today);
    }

    calendarGrid.innerHTML = html;

    // Add click listeners
    calendarGrid.querySelectorAll('.cal-day').forEach(dayEl => {
      dayEl.addEventListener('click', () => {
        openDayModal(dayEl.dataset.date);
      });
    });
  }

  function createCalDay(day, dateStr, isOther, today) {
    const dayTasks = tasks.filter(t => t.date === dateStr);
    const isToday = dateStr === today;
    const maxVisible = 3;

    let tasksHTML = '';
    dayTasks.slice(0, maxVisible).forEach(t => {
      tasksHTML += `<div class="cal-task-dot ${t.priority} ${t.completed ? 'completed-dot' : ''}">${escapeHTML(t.title)}</div>`;
    });
    if (dayTasks.length > maxVisible) {
      tasksHTML += `<div class="cal-more">+${dayTasks.length - maxVisible} more</div>`;
    }

    return `
      <div class="cal-day ${isOther ? 'other-month' : ''} ${isToday ? 'today' : ''}" data-date="${dateStr}">
        <div class="cal-day-number">${day}</div>
        ${tasksHTML}
      </div>
    `;
  }

  // Calendar navigation
  $('#cal-prev').addEventListener('click', () => {
    calendarDate.setMonth(calendarDate.getMonth() - 1);
    renderCalendar();
  });

  $('#cal-next').addEventListener('click', () => {
    calendarDate.setMonth(calendarDate.getMonth() + 1);
    renderCalendar();
  });

  $('#cal-today-btn').addEventListener('click', () => {
    calendarDate = new Date();
    renderCalendar();
  });

  // ---------- Tasks List View ----------
  function renderTasksList() {
    let filtered = [...tasks];

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        (t.title || '').toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        (t.priority || '').toLowerCase().includes(q) ||
        (t.date || '').includes(q) ||
        (t.tags || []).some(tag => (tag || '').toLowerCase().includes(q))
      );
    }

    // Filter
    if (currentFilter === 'pending') filtered = filtered.filter(t => !t.completed);
    if (currentFilter === 'completed') filtered = filtered.filter(t => t.completed);

    // Sort
    switch (currentSort) {
      case 'date-asc':
        filtered.sort((a, b) => a.date.localeCompare(b.date));
        break;
      case 'date-desc':
        filtered.sort((a, b) => b.date.localeCompare(a.date));
        break;
      case 'priority':
        filtered.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
        break;
      case 'manual':
        filtered.sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
        break;
      case 'name':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }

    if (filtered.length === 0) {
      tasksList.innerHTML = '<div class="empty-state"><span class="empty-icon">✨</span><p>No tasks found</p><span class="hint">Try adjusting your filters</span></div>';
    } else {
      tasksList.innerHTML = filtered.map(t => createTaskItemHTML(t, { showMoveBtns: currentSort === 'manual' })).join('');
      attachTaskListeners(tasksList, filtered);
    }

    updateStats();
  }

  // Filters
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderTasksList();
    });
  });

  // Sort
  sortSelect.addEventListener('change', () => {
    currentSort = sortSelect.value;
    renderTasksList();
  });

  // Search
  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value.trim();
    if (currentView !== 'tasks') {
      switchView('tasks');
    } else {
      renderTasksList();
    }
  });

  searchInput.addEventListener('focus', () => {
    if (currentView !== 'tasks' && searchInput.value.trim()) {
      switchView('tasks');
    }
  });

  // ---------- Stats ----------
  function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;

    statTotal.textContent = total;
    statCompleted.textContent = completed;
    statPending.textContent = pending;
  }

  // ---------- Refresh ----------
  function refreshCurrentView() {
    if (currentView === 'dashboard') renderDashboard();
    if (currentView === 'calendar') renderCalendar();
    if (currentView === 'tasks') renderTasksList();
    updateStats();
  }

  // ---------- Keyboard Shortcuts ----------
  document.addEventListener('keydown', (e) => {
    // Close modals on Escape
    if (e.key === 'Escape') {
      if (modalOverlay.classList.contains('open')) closeModal();
      if (dayModalOverlay.classList.contains('open')) closeDayModal();
    }

    // Don't trigger shortcuts when typing in inputs
    if (e.target.matches('input, textarea, select')) return;

    // N = New task
    if (e.key === 'n' || e.key === 'N') {
      e.preventDefault();
      openModal();
    }

    // 1, 2, 3 = Switch views
    if (e.key === '1') switchView('dashboard');
    if (e.key === '2') switchView('calendar');
    if (e.key === '3') switchView('tasks');

    // / = Focus search
    if (e.key === '/') {
      e.preventDefault();
      switchView('tasks');
      searchInput.focus();
    }
  });

  // ---------- Notion-style Quote & Personal Photo ----------
  function initQuoteAndPhoto() {
    // 1. Quote Callout
    const quoteEmoji = $('#quote-emoji');
    const quoteText = $('#quote-text');
    const QUOTE_EMOJIS = ['💡', '✨', '🎯', '🔥', '🚀', '🌟', '💭', '🌱', '👑', '💫'];

    if (quoteEmoji && quoteText) {
      const savedQuote = localStorage.getItem('devtask_quote');
      if (savedQuote) {
        try {
          const { emoji, text } = JSON.parse(savedQuote);
          if (emoji) quoteEmoji.textContent = emoji;
          if (text) quoteText.textContent = text;
        } catch (e) {}
      }

      const saveQuote = () => {
        localStorage.setItem('devtask_quote', JSON.stringify({
          emoji: quoteEmoji.textContent,
          text: quoteText.textContent
        }));
      };

      quoteEmoji.addEventListener('click', () => {
        const currentIdx = QUOTE_EMOJIS.indexOf(quoteEmoji.textContent);
        const nextIdx = (currentIdx + 1) % QUOTE_EMOJIS.length;
        quoteEmoji.textContent = QUOTE_EMOJIS[nextIdx];
        saveQuote();
      });

      quoteText.addEventListener('input', saveQuote);
    }

    // 2. Personal Photo next to calendar
    const photoArea = $('#personal-photo-area');
    const photoInput = $('#personal-photo-input');
    const photoImg = $('#personal-photo-img');
    const photoPlaceholder = $('#photo-placeholder');
    const btnRemovePhoto = $('#btn-remove-photo');

    const updatePhotoUI = (dataUrl) => {
      if (dataUrl) {
        photoImg.src = dataUrl;
        photoImg.style.display = 'block';
        photoPlaceholder.style.display = 'none';
        btnRemovePhoto.style.display = 'flex';
      } else {
        photoImg.src = '';
        photoImg.style.display = 'none';
        photoPlaceholder.style.display = 'flex';
        btnRemovePhoto.style.display = 'none';
      }
    };

    const savedPhoto = localStorage.getItem('devtask_personal_photo');
    if (savedPhoto) {
      updatePhotoUI(savedPhoto);
    }

    if (photoArea && photoInput) {
      photoArea.addEventListener('click', (e) => {
        if (e.target.closest('#btn-remove-photo')) return;
        photoInput.click();
      });

      photoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const maxW = 600;
            let w = img.width, h = img.height;
            if (w > maxW) { h = Math.round((h * maxW) / w); w = maxW; }
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            localStorage.setItem('devtask_personal_photo', dataUrl);
            updatePhotoUI(dataUrl);
            showToast('Personal photo added!', 'success');
          };
          img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
        photoInput.value = '';
      });
    }

    if (btnRemovePhoto) {
      btnRemovePhoto.addEventListener('click', (e) => {
        e.stopPropagation();
        localStorage.removeItem('devtask_personal_photo');
        updatePhotoUI(null);
        showToast('Personal photo removed', 'info');
      });
    }
  }

  // ---------- Init ----------
  function init() {
    // Set today's date as default
    taskDateInput.value = todayString();

    // Render initial view
    renderDashboard();
    updateStats();
    initQuoteAndPhoto();
  }

  init();

})();

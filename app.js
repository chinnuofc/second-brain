/**
 * SECOND BRAIN - Main Application
 * AI-Powered Personal Productivity System
 */

// ============================================
// DATA STORE (localStorage)
// ============================================

const DB_KEY = 'secondBrain';

const defaultData = {
    inbox: [],
    projects: [],
    tasks: [],
    ideas: [],
    contacts: [],
    settings: {
        darkMode: true,
        apiKey: ''
    }
};

function loadData() {
    try {
        const stored = localStorage.getItem(DB_KEY);
        if (stored) {
            return { ...defaultData, ...JSON.parse(stored) };
        }
    } catch (e) {
        console.error('Error loading data:', e);
    }
    return defaultData;
}

function saveData(data) {
    try {
        localStorage.setItem(DB_KEY, JSON.stringify(data));
    } catch (e) {
        console.error('Error saving data:', e);
    }
}

// Global state
let state = loadData();

// ============================================
// UTILITY FUNCTIONS
// ============================================

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatDate(date) {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;

    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateTime(date) {
    return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
}

function formatTime() {
    return new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

function getDueStatus(dueDate) {
    if (!dueDate) return '';
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    const diff = due - today;
    if (diff < 0) return 'overdue';
    if (diff === 0) return 'today';
    return '';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: '✓',
        error: '✕',
        info: 'ℹ',
        warning: '⚠'
    };

    toast.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================
// NAVIGATION & ROUTING
// ============================================

let currentPage = 'dashboard';

const pages = {
    dashboard: renderDashboard,
    inbox: renderInbox,
    projects: renderProjects,
    tasks: renderTasks,
    ideas: renderIdeas,
    contacts: renderContacts
};

function navigateTo(page) {
    if (!pages[page]) return;

    currentPage = page;

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });

    // Update page title
    const titles = {
        dashboard: 'Dashboard',
        inbox: 'Inbox',
        projects: 'Projects',
        tasks: 'Tasks',
        ideas: 'Ideas',
        contacts: 'Contacts'
    };
    document.getElementById('pageTitle').textContent = titles[page] || page;

    // Render page content
    pages[page]();

    // Close mobile menu if open
    closeMobileMenu();
}

// ============================================
// DASHBOARD PAGE
// ============================================

function renderDashboard() {
    const content = document.getElementById('pageContent');

    const todayTasks = state.tasks.filter(t => {
        if (t.completed) return false;
        const due = getDueStatus(t.dueDate);
        return due === 'today' || due === 'overdue';
    });

    const activeProjects = state.projects.filter(p => p.status === 'active').length;
    const pendingInbox = state.inbox.filter(i => i.status !== 'done').length;
    const totalIdeas = state.ideas.length;

    // Generate AI briefing
    const briefing = generateMorningBriefing();

    content.innerHTML = `
    <div class="dashboard-grid">
      <!-- Morning Briefing -->
      <div class="card briefing-card">
        <div class="card-header">
          <h3 class="card-title">☀️ Good ${getTimeOfDay()}!</h3>
          <span style="color: var(--text-muted); font-size: 14px;">${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
        </div>
        <div class="briefing-content">
          ${briefing}
        </div>
      </div>
      
      <!-- Stats -->
      <div class="stat-card">
        <div class="stat-icon">📥</div>
        <div class="stat-content">
          <div class="stat-value">${pendingInbox}</div>
          <div class="stat-label">Items in Inbox</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">✅</div>
        <div class="stat-content">
          <div class="stat-value">${todayTasks.length}</div>
          <div class="stat-label">Tasks Due Today</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">📋</div>
        <div class="stat-content">
          <div class="stat-value">${activeProjects}</div>
          <div class="stat-label">Active Projects</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">💡</div>
        <div class="stat-content">
          <div class="stat-value">${totalIdeas}</div>
          <div class="stat-label">Ideas Captured</div>
        </div>
      </div>
      
      <!-- Recent Inbox -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">📥 Recent Captures</h3>
          <button class="btn-small" onclick="navigateTo('inbox')">View All</button>
        </div>
        <div class="inbox-preview">
          ${renderRecentInbox()}
        </div>
      </div>
      
      <!-- Upcoming Tasks -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">✅ Upcoming Tasks</h3>
          <button class="btn-small" onclick="navigateTo('tasks')">View All</button>
        </div>
        <div class="tasks-preview">
          ${renderUpcomingTasks()}
        </div>
      </div>
    </div>
  `;
}

function getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
}

function generateMorningBriefing() {
    const todayTasks = state.tasks.filter(t => !t.completed && getDueStatus(t.dueDate) === 'today');
    const overdueTasks = state.tasks.filter(t => !t.completed && getDueStatus(t.dueDate) === 'overdue');
    const highPriority = state.tasks.filter(t => !t.completed && t.priority === 'high');
    const newInbox = state.inbox.filter(i => i.status === 'new');

    let html = '<div class="briefing-section">';

    if (highPriority.length > 0) {
        html += `
      <h4>🎯 Top Priority</h4>
      <ul class="briefing-list">
        ${highPriority.slice(0, 3).map(t => `
          <li>
            <span class="priority-indicator priority-high"></span>
            ${escapeHtml(t.text)}
          </li>
        `).join('')}
      </ul>
    `;
    }

    if (overdueTasks.length > 0) {
        html += `
      <h4>⚠️ Overdue (${overdueTasks.length})</h4>
      <ul class="briefing-list">
        ${overdueTasks.slice(0, 3).map(t => `
          <li style="color: var(--danger);">
            ⏰ ${escapeHtml(t.text)}
          </li>
        `).join('')}
      </ul>
    `;
    }

    if (todayTasks.length > 0) {
        html += `
      <h4>📅 Due Today (${todayTasks.length})</h4>
      <ul class="briefing-list">
        ${todayTasks.slice(0, 5).map(t => `<li>• ${escapeHtml(t.text)}</li>`).join('')}
      </ul>
    `;
    }

    if (newInbox.length > 0) {
        html += `<p style="margin-top: 16px; color: var(--text-secondary);">📥 ${newInbox.length} new items in inbox need processing</p>`;
    }

    if (highPriority.length === 0 && overdueTasks.length === 0 && todayTasks.length === 0 && newInbox.length === 0) {
        html += `
      <p style="font-size: 18px;">🎉 You're all caught up!</p>
      <p style="color: var(--text-secondary);">No urgent tasks or pending items. Great job!</p>
    `;
    }

    html += '</div>';
    return html;
}

function renderRecentInbox() {
    const recent = state.inbox.slice(-5).reverse();

    if (recent.length === 0) {
        return '<p style="color: var(--text-muted); text-align: center; padding: 20px;">No items yet. Press Ctrl+K to capture!</p>';
    }

    return recent.map(item => `
    <div class="inbox-item" style="margin-bottom: 8px; padding: 12px;">
      <span class="inbox-type">${getTypeIcon(item.type)}</span>
      <div class="inbox-content">
        <div class="inbox-text">${escapeHtml(item.text)}</div>
        <div class="inbox-meta">${formatDate(item.createdAt)}</div>
      </div>
    </div>
  `).join('');
}

function renderUpcomingTasks() {
    const upcoming = state.tasks
        .filter(t => !t.completed)
        .sort((a, b) => {
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate) - new Date(b.dueDate);
        })
        .slice(0, 5);

    if (upcoming.length === 0) {
        return '<p style="color: var(--text-muted); text-align: center; padding: 20px;">No tasks yet. Add one!</p>';
    }

    return upcoming.map(task => {
        const dueStatus = getDueStatus(task.dueDate);
        return `
      <div class="task-item" style="margin-bottom: 8px;">
        <div class="task-checkbox ${task.completed ? 'checked' : ''}" onclick="toggleTask('${task.id}')"></div>
        <div class="task-content">
          <div class="task-text">${escapeHtml(task.text)}</div>
          <div class="task-meta">
            ${task.dueDate ? `<span class="task-due ${dueStatus}">${formatDate(task.dueDate)}</span>` : ''}
            ${task.priority ? `<span class="priority-indicator priority-${task.priority}"></span>` : ''}
          </div>
        </div>
      </div>
    `;
    }).join('');
}

function getTypeIcon(type) {
    const icons = {
        thought: '💭',
        task: '✅',
        idea: '💡',
        link: '🔗',
        note: '📝'
    };
    return icons[type] || '📝';
}

// ============================================
// INBOX PAGE
// ============================================

function renderInbox() {
    const content = document.getElementById('pageContent');

    const items = [...state.inbox].reverse();

    content.innerHTML = `
    <div class="inbox-container">
      <div class="add-item-bar">
        <input type="text" id="inboxInput" placeholder="Quick capture... (or press Ctrl+K)" onkeydown="if(event.key==='Enter') addToInbox()">
        <button class="btn-primary" onclick="addToInbox()">Add</button>
      </div>
      
      ${items.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">📥</div>
          <div class="empty-title">Inbox Empty</div>
          <div class="empty-text">Your captured thoughts will appear here. Press <kbd>Ctrl+K</kbd> to quick capture!</div>
        </div>
      ` : `
        <div class="inbox-list">
          ${items.map(item => renderInboxItem(item)).join('')}
        </div>
      `}
    </div>
  `;

    updateInboxBadge();
}

function renderInboxItem(item) {
    return `
    <div class="inbox-item" data-id="${item.id}">
      <span class="inbox-type">${getTypeIcon(item.type)}</span>
      <div class="inbox-content">
        <div class="inbox-text">${escapeHtml(item.text)}</div>
        <div class="inbox-meta">
          <span>${formatDate(item.createdAt)}</span>
          <span>•</span>
          <span>${item.type}</span>
          ${item.aiSummary ? `<span>• AI: ${escapeHtml(item.aiSummary)}</span>` : ''}
        </div>
      </div>
      <div class="inbox-actions">
        <button class="btn-icon" onclick="convertInboxToTask('${item.id}')" title="Convert to Task">✅</button>
        <button class="btn-icon" onclick="convertInboxToIdea('${item.id}')" title="Convert to Idea">💡</button>
        <button class="btn-icon" onclick="deleteInboxItem('${item.id}')" title="Delete">🗑️</button>
      </div>
    </div>
  `;
}

function addToInbox(text = null, type = 'thought') {
    const input = document.getElementById('inboxInput');
    const itemText = text || (input ? input.value.trim() : '');

    if (!itemText) return;

    const item = {
        id: generateId(),
        text: itemText,
        type: type,
        status: 'new',
        createdAt: new Date().toISOString(),
        aiSummary: ''
    };

    state.inbox.push(item);
    saveData(state);

    if (input) input.value = '';

    if (currentPage === 'inbox') {
        renderInbox();
    } else if (currentPage === 'dashboard') {
        renderDashboard();
    }

    updateInboxBadge();
    showToast('Captured!', 'success');

    // Simulate AI classification
    setTimeout(() => classifyInboxItem(item.id), 500);
}

function classifyInboxItem(id) {
    const item = state.inbox.find(i => i.id === id);
    if (!item) return;

    // Simple classification based on keywords
    const text = item.text.toLowerCase();

    if (text.includes('task:') || text.includes('todo:') || text.includes('need to') || text.includes('must') || text.includes('should')) {
        item.type = 'task';
    } else if (text.includes('idea:') || text.includes('what if') || text.includes('maybe') || text.includes('could')) {
        item.type = 'idea';
    } else if (text.includes('http://') || text.includes('https://') || text.includes('.com') || text.includes('.org')) {
        item.type = 'link';
    }

    // Generate basic summary
    if (item.text.length > 50) {
        item.aiSummary = item.text.substring(0, 47) + '...';
    }

    saveData(state);
    if (currentPage === 'inbox') renderInbox();
}

function convertInboxToTask(id) {
    const item = state.inbox.find(i => i.id === id);
    if (!item) return;

    const task = {
        id: generateId(),
        text: item.text,
        completed: false,
        priority: 'medium',
        dueDate: null,
        project: null,
        context: [],
        createdAt: new Date().toISOString()
    };

    state.tasks.push(task);
    state.inbox = state.inbox.filter(i => i.id !== id);
    saveData(state);

    renderInbox();
    updateInboxBadge();
    showToast('Converted to task!', 'success');
}

function convertInboxToIdea(id) {
    const item = state.inbox.find(i => i.id === id);
    if (!item) return;

    const idea = {
        id: generateId(),
        text: item.text,
        category: 'general',
        potential: 2,
        status: 'new',
        createdAt: new Date().toISOString()
    };

    state.ideas.push(idea);
    state.inbox = state.inbox.filter(i => i.id !== id);
    saveData(state);

    renderInbox();
    updateInboxBadge();
    showToast('Converted to idea!', 'success');
}

function deleteInboxItem(id) {
    state.inbox = state.inbox.filter(i => i.id !== id);
    saveData(state);
    renderInbox();
    updateInboxBadge();
    showToast('Deleted', 'info');
}

function updateInboxBadge() {
    const badge = document.getElementById('inboxBadge');
    const count = state.inbox.filter(i => i.status !== 'done').length;
    badge.textContent = count;
    badge.dataset.count = count;
}

// ============================================
// TASKS PAGE
// ============================================

let taskFilter = 'all';

function renderTasks() {
    const content = document.getElementById('pageContent');

    let filteredTasks = state.tasks;

    if (taskFilter === 'active') {
        filteredTasks = state.tasks.filter(t => !t.completed);
    } else if (taskFilter === 'completed') {
        filteredTasks = state.tasks.filter(t => t.completed);
    } else if (taskFilter === 'today') {
        filteredTasks = state.tasks.filter(t => !t.completed && getDueStatus(t.dueDate) === 'today');
    }

    // Sort: active first, then by due date, then by priority
    filteredTasks = [...filteredTasks].sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        if (a.priority === 'high' && b.priority !== 'high') return -1;
        if (b.priority === 'high' && a.priority !== 'high') return 1;
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
    });

    content.innerHTML = `
    <div class="tasks-header">
      <div class="filter-tabs">
        <button class="filter-tab ${taskFilter === 'all' ? 'active' : ''}" onclick="setTaskFilter('all')">All</button>
        <button class="filter-tab ${taskFilter === 'active' ? 'active' : ''}" onclick="setTaskFilter('active')">Active</button>
        <button class="filter-tab ${taskFilter === 'today' ? 'active' : ''}" onclick="setTaskFilter('today')">Today</button>
        <button class="filter-tab ${taskFilter === 'completed' ? 'active' : ''}" onclick="setTaskFilter('completed')">Done</button>
      </div>
      <button class="btn-primary" onclick="showAddTaskModal()">+ Add Task</button>
    </div>
    
    <div class="add-item-bar">
      <input type="text" id="quickTaskInput" placeholder="Add a quick task..." onkeydown="if(event.key==='Enter') addQuickTask()">
      <button class="btn-secondary" onclick="addQuickTask()">Add</button>
    </div>
    
    ${filteredTasks.length === 0 ? `
      <div class="empty-state">
        <div class="empty-icon">✅</div>
        <div class="empty-title">No Tasks</div>
        <div class="empty-text">${taskFilter === 'completed' ? 'No completed tasks yet.' : 'Add a task to get started!'}</div>
      </div>
    ` : `
      <div class="task-list">
        ${filteredTasks.map(task => renderTaskItem(task)).join('')}
      </div>
    `}
  `;
}

function renderTaskItem(task) {
    const dueStatus = getDueStatus(task.dueDate);

    return `
    <div class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}">
      ${task.priority ? `<span class="priority-indicator priority-${task.priority}"></span>` : ''}
      <div class="task-checkbox ${task.completed ? 'checked' : ''}" onclick="toggleTask('${task.id}')"></div>
      <div class="task-content">
        <div class="task-text">${escapeHtml(task.text)}</div>
        <div class="task-meta">
          ${task.dueDate ? `<span class="task-due ${dueStatus}">${dueStatus === 'overdue' ? '⚠️ ' : ''}${formatDate(task.dueDate)}</span>` : ''}
          ${task.project ? `<span style="color: var(--accent-primary);">📋 ${escapeHtml(task.project)}</span>` : ''}
        </div>
      </div>
      <div class="inbox-actions" style="opacity: 1;">
        <button class="btn-icon" onclick="editTask('${task.id}')" title="Edit">✏️</button>
        <button class="btn-icon" onclick="deleteTask('${task.id}')" title="Delete">🗑️</button>
      </div>
    </div>
  `;
}

function setTaskFilter(filter) {
    taskFilter = filter;
    renderTasks();
}

function addQuickTask() {
    const input = document.getElementById('quickTaskInput');
    const text = input.value.trim();

    if (!text) return;

    const task = {
        id: generateId(),
        text: text,
        completed: false,
        priority: 'medium',
        dueDate: null,
        project: null,
        context: [],
        createdAt: new Date().toISOString()
    };

    state.tasks.push(task);
    saveData(state);

    input.value = '';
    renderTasks();
    showToast('Task added!', 'success');
}

function toggleTask(id) {
    const task = state.tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        task.completedAt = task.completed ? new Date().toISOString() : null;
        saveData(state);

        if (currentPage === 'tasks') {
            renderTasks();
        } else {
            renderDashboard();
        }

        if (task.completed) {
            showToast('Task completed! 🎉', 'success');
        }
    }
}

function deleteTask(id) {
    state.tasks = state.tasks.filter(t => t.id !== id);
    saveData(state);
    renderTasks();
    showToast('Task deleted', 'info');
}

function showAddTaskModal() {
    // For simplicity, using prompt - could be enhanced to a proper modal
    const text = prompt('Enter task:');
    if (text && text.trim()) {
        const task = {
            id: generateId(),
            text: text.trim(),
            completed: false,
            priority: 'medium',
            dueDate: null,
            project: null,
            context: [],
            createdAt: new Date().toISOString()
        };

        state.tasks.push(task);
        saveData(state);
        renderTasks();
        showToast('Task added!', 'success');
    }
}

function editTask(id) {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;

    const newText = prompt('Edit task:', task.text);
    if (newText && newText.trim()) {
        task.text = newText.trim();
        saveData(state);
        renderTasks();
        showToast('Task updated!', 'success');
    }
}

// ============================================
// PROJECTS PAGE
// ============================================

function renderProjects() {
    const content = document.getElementById('pageContent');

    content.innerHTML = `
    <div class="tasks-header">
      <div class="filter-tabs">
        <button class="filter-tab active">All</button>
        <button class="filter-tab">Active</button>
        <button class="filter-tab">Completed</button>
      </div>
      <button class="btn-primary" onclick="addProject()">+ New Project</button>
    </div>
    
    ${state.projects.length === 0 ? `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <div class="empty-title">No Projects</div>
        <div class="empty-text">Create a project to organize your tasks!</div>
        <button class="btn-primary" onclick="addProject()">Create First Project</button>
      </div>
    ` : `
      <div class="projects-grid">
        ${state.projects.map(project => renderProjectCard(project)).join('')}
      </div>
    `}
  `;
}

function renderProjectCard(project) {
    const statusClass = {
        'active': 'status-active',
        'on-hold': 'status-on-hold',
        'completed': 'status-completed'
    };

    return `
    <div class="project-card" onclick="viewProject('${project.id}')">
      <div class="project-header">
        <h3 class="project-title">${escapeHtml(project.name)}</h3>
        <span class="project-status ${statusClass[project.status] || ''}">${project.status}</span>
      </div>
      ${project.description ? `<p style="color: var(--text-secondary); font-size: 14px; margin-bottom: 16px;">${escapeHtml(project.description)}</p>` : ''}
      <div class="project-progress">
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${project.progress || 0}%"></div>
        </div>
        <div class="progress-text">${project.progress || 0}% complete</div>
      </div>
      <div class="project-meta">
        <span>📅 ${formatDate(project.createdAt)}</span>
        <span>${project.tasks || 0} tasks</span>
      </div>
    </div>
  `;
}

function addProject() {
    const name = prompt('Project name:');
    if (!name || !name.trim()) return;

    const project = {
        id: generateId(),
        name: name.trim(),
        description: '',
        status: 'active',
        progress: 0,
        tasks: 0,
        createdAt: new Date().toISOString()
    };

    state.projects.push(project);
    saveData(state);
    renderProjects();
    showToast('Project created!', 'success');
}

function viewProject(id) {
    showToast('Project details coming soon!', 'info');
}

// ============================================
// IDEAS PAGE
// ============================================

function renderIdeas() {
    const content = document.getElementById('pageContent');

    content.innerHTML = `
    <div class="tasks-header">
      <div class="filter-tabs">
        <button class="filter-tab active">All</button>
        <button class="filter-tab">Business</button>
        <button class="filter-tab">Creative</button>
        <button class="filter-tab">Personal</button>
      </div>
      <button class="btn-primary" onclick="addIdea()">+ Add Idea</button>
    </div>
    
    ${state.ideas.length === 0 ? `
      <div class="empty-state">
        <div class="empty-icon">💡</div>
        <div class="empty-title">No Ideas Yet</div>
        <div class="empty-text">Capture your brilliant ideas here!</div>
        <button class="btn-primary" onclick="addIdea()">Add First Idea</button>
      </div>
    ` : `
      <div class="ideas-grid">
        ${state.ideas.map(idea => renderIdeaCard(idea)).join('')}
      </div>
    `}
  `;
}

function renderIdeaCard(idea) {
    const stars = '⭐'.repeat(idea.potential || 1);

    return `
    <div class="idea-card">
      <div class="idea-header">
        <span class="idea-category">${idea.category || 'general'}</span>
        <span class="idea-rating">${stars}</span>
      </div>
      <p class="idea-text">${escapeHtml(idea.text)}</p>
      <div class="idea-footer">
        <span>${formatDate(idea.createdAt)}</span>
        <div>
          <button class="btn-icon" onclick="deleteIdea('${idea.id}')" title="Delete">🗑️</button>
        </div>
      </div>
    </div>
  `;
}

function addIdea() {
    const text = prompt('Your idea:');
    if (!text || !text.trim()) return;

    const idea = {
        id: generateId(),
        text: text.trim(),
        category: 'general',
        potential: 2,
        status: 'new',
        createdAt: new Date().toISOString()
    };

    state.ideas.push(idea);
    saveData(state);
    renderIdeas();
    showToast('Idea captured! 💡', 'success');
}

function deleteIdea(id) {
    state.ideas = state.ideas.filter(i => i.id !== id);
    saveData(state);
    renderIdeas();
    showToast('Idea deleted', 'info');
}

// ============================================
// CONTACTS PAGE
// ============================================

function renderContacts() {
    const content = document.getElementById('pageContent');

    content.innerHTML = `
    <div class="tasks-header">
      <div class="filter-tabs">
        <button class="filter-tab active">All</button>
        <button class="filter-tab">Work</button>
        <button class="filter-tab">Personal</button>
        <button class="filter-tab">Follow-up</button>
      </div>
      <button class="btn-primary" onclick="addContact()">+ Add Contact</button>
    </div>
    
    ${state.contacts.length === 0 ? `
      <div class="empty-state">
        <div class="empty-icon">👥</div>
        <div class="empty-title">No Contacts</div>
        <div class="empty-text">Add contacts to track relationships and follow-ups!</div>
        <button class="btn-primary" onclick="addContact()">Add First Contact</button>
      </div>
    ` : `
      <div class="contacts-grid">
        ${state.contacts.map(contact => renderContactCard(contact)).join('')}
      </div>
    `}
  `;
}

function renderContactCard(contact) {
    const initials = contact.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const needsFollowUp = contact.nextFollowUp && new Date(contact.nextFollowUp) <= new Date();

    return `
    <div class="contact-card">
      <div class="contact-avatar">${initials}</div>
      <div class="contact-info">
        <div class="contact-name">${escapeHtml(contact.name)}</div>
        ${contact.company ? `<div class="contact-company">${escapeHtml(contact.company)}</div>` : ''}
        <div class="contact-meta">
          <span class="contact-tag">${contact.relationship || 'Other'}</span>
          ${needsFollowUp ? '<span class="contact-tag follow-up">⏰ Follow up</span>' : ''}
          ${contact.lastContact ? `<span class="contact-tag">Last: ${formatDate(contact.lastContact)}</span>` : ''}
        </div>
      </div>
    </div>
  `;
}

function addContact() {
    const name = prompt('Contact name:');
    if (!name || !name.trim()) return;

    const contact = {
        id: generateId(),
        name: name.trim(),
        company: '',
        relationship: 'network',
        email: '',
        phone: '',
        lastContact: null,
        nextFollowUp: null,
        notes: '',
        createdAt: new Date().toISOString()
    };

    state.contacts.push(contact);
    saveData(state);
    renderContacts();
    showToast('Contact added!', 'success');
}

// ============================================
// QUICK CAPTURE MODAL
// ============================================

function openCaptureModal() {
    const modal = document.getElementById('captureModal');
    modal.classList.add('open');
    setTimeout(() => {
        document.getElementById('captureInput').focus();
    }, 100);
}

function closeCaptureModal() {
    const modal = document.getElementById('captureModal');
    modal.classList.remove('open');
    document.getElementById('captureInput').value = '';
}

function initCaptureModal() {
    const modal = document.getElementById('captureModal');
    const input = document.getElementById('captureInput');
    const typeButtons = document.querySelectorAll('.type-btn');
    const fabBtn = document.getElementById('fabBtn');

    let selectedType = 'thought';

    // FAB click
    fabBtn.addEventListener('click', openCaptureModal);

    // Type selection
    typeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            typeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedType = btn.dataset.type;
        });
    });

    // Input handling
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && input.value.trim()) {
            addToInbox(input.value.trim(), selectedType);
            closeCaptureModal();
        } else if (e.key === 'Escape') {
            closeCaptureModal();
        }
    });

    // Close on overlay click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeCaptureModal();
        }
    });

    // Keyboard shortcut
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            openCaptureModal();
        }
        if (e.key === 'Escape' && modal.classList.contains('open')) {
            closeCaptureModal();
        }
    });
}

// ============================================
// AI ASSISTANT
// ============================================

function initAIPanel() {
    const aiToggle = document.getElementById('aiToggle');
    const aiPanel = document.getElementById('aiPanel');
    const aiClose = document.getElementById('aiClose');
    const aiInput = document.getElementById('aiInput');
    const aiSend = document.getElementById('aiSend');
    const saveApiKey = document.getElementById('saveApiKey');
    const quickActions = document.querySelectorAll('.quick-action');

    aiToggle.addEventListener('click', () => {
        aiPanel.classList.add('open');
        document.querySelector('.main-content').classList.add('ai-open');
    });

    aiClose.addEventListener('click', () => {
        aiPanel.classList.remove('open');
        document.querySelector('.main-content').classList.remove('ai-open');
    });

    aiSend.addEventListener('click', () => sendAiMessage());

    aiInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            sendAiMessage();
        }
    });

    saveApiKey.addEventListener('click', () => {
        const key = document.getElementById('apiKeyInput').value;
        state.settings.apiKey = key;
        saveData(state);
        showToast('API key saved!', 'success');
    });

    quickActions.forEach(btn => {
        btn.addEventListener('click', () => {
            handleQuickAction(btn.dataset.action);
        });
    });

    // Load saved API key
    if (state.settings.apiKey) {
        document.getElementById('apiKeyInput').value = state.settings.apiKey;
    }
}

function sendAiMessage() {
    const input = document.getElementById('aiInput');
    const message = input.value.trim();

    if (!message) return;

    addChatMessage(message, 'user');
    input.value = '';

    // Process with AI
    processAiMessage(message);
}

function addChatMessage(text, role) {
    const container = document.getElementById('aiMessages');
    const div = document.createElement('div');
    div.className = `ai-message ${role}`;
    div.innerHTML = `<p>${escapeHtml(text)}</p>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

async function processAiMessage(message) {
    // Check if we have an API key and should use real AI
    if (state.settings.apiKey) {
        try {
            const response = await callOpenAI(message);
            addChatMessage(response, 'assistant');
            return;
        } catch (e) {
            console.error('AI API error:', e);
        }
    }

    // Fallback to simulated responses
    const responses = getSimulatedResponse(message);
    setTimeout(() => {
        addChatMessage(responses, 'assistant');
    }, 500);
}

async function callOpenAI(message) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${state.settings.apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: 'You are a helpful productivity assistant for a second brain app. Help users organize their thoughts, prioritize tasks, and expand on their ideas. Be concise and actionable.'
                },
                { role: 'user', content: message }
            ],
            max_tokens: 500
        })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.choices[0].message.content;
}

function getSimulatedResponse(message) {
    const msg = message.toLowerCase();

    if (msg.includes('prioritize') || msg.includes('priority')) {
        const highPriority = state.tasks.filter(t => !t.completed && t.priority === 'high');
        if (highPriority.length > 0) {
            return `Based on your tasks, here are your top priorities:\n\n${highPriority.slice(0, 3).map((t, i) => `${i + 1}. ${t.text}`).join('\n')}\n\nFocus on these first for maximum impact.`;
        }
        return `You don't have any high-priority tasks right now. Consider reviewing your task list and marking important items as high priority.`;
    }

    if (msg.includes('summarize') || msg.includes('summary') || msg.includes('today')) {
        const todayTasks = state.tasks.filter(t => !t.completed && getDueStatus(t.dueDate) === 'today');
        const inboxCount = state.inbox.length;
        return `📊 Here's your summary:\n\n• ${todayTasks.length} tasks due today\n• ${inboxCount} items in inbox\n• ${state.projects.filter(p => p.status === 'active').length} active projects\n\nFocus on completing today's tasks and processing your inbox during your next break.`;
    }

    if (msg.includes('idea') || msg.includes('expand')) {
        if (state.ideas.length > 0) {
            const idea = state.ideas[state.ideas.length - 1];
            return `Looking at your latest idea: "${idea.text}"\n\nHere are some ways to develop it:\n\n1. Break it into smaller action items\n2. Research similar existing solutions\n3. Identify the first small step you could take\n4. Consider who might benefit from this\n\nWould you like me to help explore any of these angles?`;
        }
        return `You haven't captured any ideas yet. Try adding some with the 💡 button!`;
    }

    if (msg.includes('help') || msg.includes('what can')) {
        return `I can help you with:\n\n📝 Summarize - Get an overview of your day\n🎯 Prioritize - Identify what to focus on\n💡 Expand - Develop your ideas further\n📊 Review - Analyze your productivity\n\nTry asking: "What should I focus on today?" or "Summarize my tasks"`;
    }

    return `I understand you're asking about: "${message}"\n\nI'm running in offline mode without an API key. Add your OpenAI API key in settings for full AI capabilities!\n\nIn the meantime, try asking me to:\n• Summarize your day\n• Prioritize your tasks\n• Expand on your ideas`;
}

function handleQuickAction(action) {
    const prompts = {
        summarize: 'Give me a summary of my tasks and inbox for today',
        prioritize: 'Help me prioritize my tasks',
        expand: 'Help me expand on my latest idea'
    };

    const message = prompts[action] || action;
    addChatMessage(message, 'user');
    processAiMessage(message);
}

// ============================================
// SETTINGS
// ============================================

function initSettings() {
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const settingsClose = document.getElementById('settingsClose');
    const exportBtn = document.getElementById('exportData');
    const importBtn = document.getElementById('importData');
    const importFile = document.getElementById('importFile');
    const clearBtn = document.getElementById('clearData');
    const darkModeToggle = document.getElementById('darkModeToggle');
    const installBtn = document.getElementById('installBtn');

    settingsBtn.addEventListener('click', () => {
        settingsModal.classList.add('open');
    });

    settingsClose.addEventListener('click', () => {
        settingsModal.classList.remove('open');
    });

    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.classList.remove('open');
        }
    });

    // Export
    exportBtn.addEventListener('click', () => {
        const data = JSON.stringify(state, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `second-brain-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Data exported!', 'success');
    });

    // Import
    importBtn.addEventListener('click', () => importFile.click());

    importFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                state = { ...defaultData, ...data };
                saveData(state);
                navigateTo('dashboard');
                showToast('Data imported!', 'success');
            } catch (err) {
                showToast('Invalid file format', 'error');
            }
        };
        reader.readAsText(file);
    });

    // Clear
    clearBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to delete ALL data? This cannot be undone!')) {
            state = { ...defaultData };
            saveData(state);
            navigateTo('dashboard');
            showToast('All data cleared', 'info');
        }
    });

    // PWA Install
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installBtn.style.display = 'block';
        document.getElementById('installNote').style.display = 'none';
    });

    installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            showToast('App installed!', 'success');
        }
        deferredPrompt = null;
        installBtn.style.display = 'none';
    });
}

// ============================================
// MOBILE MENU
// ============================================

function initMobileMenu() {
    const menuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');

    menuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });
}

function closeMobileMenu() {
    document.getElementById('sidebar').classList.remove('open');
}

// ============================================
// NAVIGATION
// ============================================

function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            navigateTo(item.dataset.page);
        });
    });
}

// ============================================
// SEARCH
// ============================================

function initSearch() {
    const searchInput = document.getElementById('searchInput');

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const query = searchInput.value.trim().toLowerCase();
            if (query) performSearch(query);
        }
    });

    // Keyboard shortcut
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === '/') {
            e.preventDefault();
            searchInput.focus();
        }
    });
}

function performSearch(query) {
    // Search across all data
    const results = [];

    state.inbox.forEach(item => {
        if (item.text.toLowerCase().includes(query)) {
            results.push({ type: 'inbox', item });
        }
    });

    state.tasks.forEach(item => {
        if (item.text.toLowerCase().includes(query)) {
            results.push({ type: 'task', item });
        }
    });

    state.ideas.forEach(item => {
        if (item.text.toLowerCase().includes(query)) {
            results.push({ type: 'idea', item });
        }
    });

    if (results.length === 0) {
        showToast('No results found', 'info');
    } else {
        showToast(`Found ${results.length} result(s)`, 'success');
        // Could expand this to show a search results page
    }
}

// ============================================
// TIME DISPLAY
// ============================================

function updateTime() {
    const timeEl = document.getElementById('currentTime');
    if (timeEl) {
        timeEl.textContent = formatTime();
    }
}

// ============================================
// SERVICE WORKER REGISTRATION
// ============================================

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker registered'))
            .catch(err => console.log('Service Worker registration failed:', err));
    }
}

// ============================================
// URL PARAMETERS HANDLING
// ============================================

function handleUrlParams() {
    const params = new URLSearchParams(window.location.search);

    if (params.get('action') === 'capture') {
        setTimeout(openCaptureModal, 100);
    }

    const page = params.get('page');
    if (page && pages[page]) {
        navigateTo(page);
    }
}

// ============================================
// INITIALIZATION
// ============================================

function init() {
    // Register service worker for PWA
    registerServiceWorker();

    // Initialize components
    initNavigation();
    initCaptureModal();
    initAIPanel();
    initSettings();
    initMobileMenu();
    initSearch();

    // Update time
    updateTime();
    setInterval(updateTime, 60000);

    // Update inbox badge
    updateInboxBadge();

    // Handle URL params
    handleUrlParams();

    // Render initial page
    navigateTo('dashboard');

    console.log('🧠 Second Brain initialized!');
}

// Make functions globally accessible
window.navigateTo = navigateTo;
window.addToInbox = addToInbox;
window.convertInboxToTask = convertInboxToTask;
window.convertInboxToIdea = convertInboxToIdea;
window.deleteInboxItem = deleteInboxItem;
window.toggleTask = toggleTask;
window.deleteTask = deleteTask;
window.editTask = editTask;
window.addQuickTask = addQuickTask;
window.showAddTaskModal = showAddTaskModal;
window.setTaskFilter = setTaskFilter;
window.addProject = addProject;
window.viewProject = viewProject;
window.addIdea = addIdea;
window.deleteIdea = deleteIdea;
window.addContact = addContact;

// Start app
document.addEventListener('DOMContentLoaded', init);

// ═══════════════════════════════════════════
//  SecureTask — main.js (version avec API)
// ═══════════════════════════════════════════

const API = 'https://securetask2-z6kh.vercel.app/api';
// ─── AUTH ───
function isLoggedIn() {
    return !!localStorage.getItem('securetask_logged');
}

function requireAuth() {
    if (!isLoggedIn()) window.location.href = 'connexion.html';
}

function getUser() {
    return JSON.parse(localStorage.getItem('securetask_user') || '{}');
}

function logout() {
    localStorage.removeItem('securetask_logged');
    localStorage.removeItem('securetask_user');
    window.location.href = 'connexion.html';
}

// ─── LOGIN ───
function initLogin() {
    const form = document.getElementById('login-form');
    if (!form) return;

    form.addEventListener('submit', async e => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errEl = document.getElementById('login-error');

        try {
            const res = await fetch(`${API}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (data.success) {
                localStorage.setItem('securetask_logged', '1');
                localStorage.setItem('securetask_user', JSON.stringify({
                    nom: data.user.nom,
                    email: data.user.email,
                    role: data.user.role,
                    initiales: data.user.nom.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                }));
                window.location.href = 'index.html';
            } else {
                errEl.style.display = 'block';
                errEl.textContent = data.message;
            }
        } catch (err) {
            errEl.style.display = 'block';
            errEl.textContent = 'Erreur de connexion au serveur.';
        }
    });
}

// ─── REGISTER ───

function initRegister() {
    const form = document.getElementById('register-form');
    if (!form) return;

    form.addEventListener('submit', async e => {
        e.preventDefault();

        const nom      = document.getElementById('nom').value.trim();
        const email    = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirm     = document.getElementById('confirm-password').value;
        const role        = document.getElementById('role').value.trim();
        const codeAcces   = document.getElementById('code-acces').value.trim().toUpperCase();   

        const errEl = document.getElementById('register-error');
        const sucEl = document.getElementById('register-success');

        errEl.style.display = 'none';
        sucEl.style.display = 'none';
        
        // Vérification code d'accès
        if (codeAcces !== 'AABB-AABB-1234') {
            errEl.style.display = 'block';
            errEl.textContent = 'Code d\'accès invalide.';
            return;
        }
        // Vérification rôle
        if (!role) {
            errEl.style.display = 'block';
            errEl.textContent = 'Veuillez sélectionner un rôle.';
            return;
        }
        // Vérification mot de passe
        if (password !== confirm) {
            errEl.style.display = 'block';
            errEl.textContent = 'Les mots de passe ne correspondent pas.';
            return;
        }

        // Vérification longueur
        if (password.length < 6) {
            errEl.style.display = 'block';
            errEl.textContent = 'Le mot de passe doit contenir au moins 6 caractères.';
            return;
        }

        try {
            const res = await fetch(`${API}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    nom,
                    email,
                    password,
                    role
                })
            });

            const data = await res.json();

            if (data.success) {
                sucEl.style.display = 'block';
                sucEl.textContent = 'Compte créé avec succès !';

                setTimeout(() => {
                    window.location.href = 'connexion.html';
                }, 1500);

            } else {
                errEl.style.display = 'block';
                errEl.textContent = data.message || 'Erreur lors de la création.';
            }

        } catch (err) {
            console.error(err);

            errEl.style.display = 'block';
            errEl.textContent = 'Erreur serveur.';
        }
    });
}
// ─── TÂCHES ───
async function loadTasks() {
    try {
        const res = await fetch(`${API}/taches`);
        const tasks = await res.json();
        // Convertir le format base de données → format application
        return tasks.map(t => ({
            id: t.id,
            titre: t.titre,
            description: t.description,
            priorite: t.priorite,
            echeance: t.echeance ? t.echeance.split('T')[0] : '',
            assigneA: t.assigne_a,
            statut: t.statut,
            labels: t.labels ? t.labels.split(', ') : []
        }));
    } catch (err) {
        console.error('Erreur chargement tâches:', err);
        return [];
    }
}

async function saveTask(task) {
    try {
        const res = await fetch(`${API}/taches`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(task)
        });
        return await res.json();
    } catch (err) {
        console.error('Erreur sauvegarde:', err);
    }
}

async function deleteTask(id) {
    try {
        await fetch(`${API}/taches/${id}`, { method: 'DELETE' });
        showToast('Tâche supprimée.', 'info');
    } catch (err) {
        console.error('Erreur suppression:', err);
    }
}

async function updateTaskStatus(id, newStatus) {
    try {
        await fetch(`${API}/taches/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ statut: newStatus })
        });
    } catch (err) {
        console.error('Erreur mise à jour:', err);
    }
}

function filterTasks(tasks, priority, status, search) {
    let filtered = [...tasks];
    if (priority && priority !== 'Tout') filtered = filtered.filter(t => t.priorite === priority);
    if (status && status !== 'Tout') filtered = filtered.filter(t => t.statut === status);
    if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(t => t.titre.toLowerCase().includes(q));
    }
    return filtered;
}

// ─── HELPERS ───
function prioriteBadge(p) {
    const map = { 'Critique': 'critique', 'Élevée': 'elevee', 'Moyenne': 'moyenne', 'Basse': 'basse' };
    const icons = { 'Critique': '🔴', 'Élevée': '🟠', 'Moyenne': '🟢', 'Basse': '⚪' };
    return `<span class="badge badge-${map[p] || 'basse'}">${icons[p] || ''} ${p}</span>`;
}

function statutBadge(s) {
    const map = { 'À faire': 'afaire', 'En cours': 'encours', 'Validé': 'valide', 'Terminé': 'termine' };
    return `<span class="badge badge-${map[s] || 'afaire'}">${s}</span>`;
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function initials(name) {
    if (!name || name === 'Non assigné') return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function avatarColor(name) {
    const colors = ['#2563eb', '#7c3aed', '#db2777', '#059669', '#d97706', '#dc2626'];
    let hash = 0;
    for (let c of (name || '')) hash = (hash + c.charCodeAt(0)) % colors.length;
    return colors[hash];
}

function prioriteClass(p) {
    return { 'Critique': 'critique', 'Élevée': 'elevee', 'Moyenne': 'moyenne', 'Basse': 'basse' }[p] || 'basse';
}

function isNearDeadline(dateStr) {
    if (!dateStr) return false;
    const due = new Date(dateStr);
    const now = new Date();
    const diff = (due - now) / (1000 * 60 * 60 * 24);
    return diff <= 3 && diff >= 0;
}

function setEl(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

// ─── TOAST ───
function showToast(msg, type = 'success') {
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type]}</span> ${msg}`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'all 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ─── SIDEBAR ───
function initSidebar() {
    const user = getUser();
    const initialsEl = document.getElementById('user-initials');
    const nameEl = document.getElementById('user-name');
    const roleEl = document.getElementById('user-role');
    if (initialsEl) initialsEl.textContent = user.initiales || '?';
    if (nameEl) nameEl.textContent = user.nom || 'Utilisateur';
    if (roleEl) roleEl.textContent = user.role || '';

    const hamburger = document.getElementById('hamburger');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    if (hamburger && sidebar) {
        hamburger.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            overlay && overlay.classList.toggle('open');
        });
    }
    if (overlay) {
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('open');
        });
    }

    const darkToggle = document.getElementById('dark-toggle');
    if (darkToggle) {
        const isDark = localStorage.getItem('securetask_dark') === '1';
        if (isDark) document.body.classList.add('dark-mode');
        darkToggle.textContent = isDark ? '☀️' : '🌙';
        darkToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const now = document.body.classList.contains('dark-mode');
            localStorage.setItem('securetask_dark', now ? '1' : '0');
            darkToggle.textContent = now ? '☀️' : '🌙';
        });
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
}

// ─── DASHBOARD ───
async function renderDashboard() {
    const tasks = await loadTasks();
    const user = getUser();

    const greeting = document.getElementById('greeting');
    if (greeting) greeting.textContent = `Bonjour, ${user.nom} ! 👋`;

    const critiques = tasks.filter(t => t.priorite === 'Critique' && t.statut !== 'Terminé');
    const enCours = tasks.filter(t => t.statut === 'En cours');
    const prochaines = tasks.filter(t => isNearDeadline(t.echeance) && t.statut !== 'Terminé');

    setEl('stat-critique', critiques.length);
    setEl('stat-encours', enCours.length);
    setEl('stat-echeance', prochaines.length);

    const subEl = document.getElementById('greeting-sub');
    if (subEl) {
        subEl.textContent = critiques.length > 0
            ? `Tu as ${critiques.length} tâche(s) critique(s) à traiter.`
            : "Tout est sous contrôle aujourd'hui.";
    }

    const myTasks = tasks.filter(t => t.assigneA === user.nom || t.assigneA === 'Toi').slice(0, 5);
    const listEl = document.getElementById('my-tasks-list');
    if (listEl) {
        listEl.innerHTML = myTasks.length === 0
            ? '<div class="empty-state"><div class="empty-icon">🎉</div><p>Aucune tâche assignée !</p></div>'
            : myTasks.map(t => `
                <div class="task-item">
                    <div class="priority-dot ${prioriteClass(t.priorite)}"></div>
                    <div class="task-info">
                        <div class="task-title">${t.titre}</div>
                        <div class="task-meta">${t.statut}</div>
                    </div>
                    ${prioriteBadge(t.priorite)}
                    <div class="task-deadline">${formatDate(t.echeance)}</div>
                </div>`).join('');
    }

    const recentEl = document.getElementById('recent-tasks-list');
    if (recentEl) {
        recentEl.innerHTML = tasks.slice(0, 3).map(t => `
            <div class="task-item">
                <div class="priority-dot ${prioriteClass(t.priorite)}"></div>
                <div class="task-info">
                    <div class="task-title">${t.titre}</div>
                    <div class="task-meta">Assigné à ${t.assigneA}</div>
                </div>
                ${statutBadge(t.statut)}
                <div class="task-deadline">${formatDate(t.echeance)}</div>
            </div>`).join('');
    }
}

// ─── KANBAN ───
let draggedId = null;

async function renderKanban() {
    const tasks = await loadTasks();
    const columns = ['À faire', 'En cours', 'Validé', 'Terminé'];
    const colIds = { 'À faire': 'afaire', 'En cours': 'encours', 'Validé': 'valide', 'Terminé': 'termine' };

    columns.forEach(col => {
        const colId = colIds[col];
        const el = document.getElementById(`col-${colId}`);
        const countEl = document.getElementById(`count-${colId}`);
        if (!el) return;

        const colTasks = tasks.filter(t => t.statut === col);
        if (countEl) countEl.textContent = colTasks.length;

        el.innerHTML = colTasks.map(t => `
            <div class="kanban-card" draggable="true" data-id="${t.id}">
                <div class="card-priority">
                    ${prioriteBadge(t.priorite)}
                    <button class="card-advance-btn" onclick="advanceTask(${t.id}, '${t.statut}')">⟳</button>
                </div>
                <div class="card-title">${t.titre}</div>
                <div class="card-footer">
                    <div class="card-assignee">
                        <div class="mini-avatar" style="background:${avatarColor(t.assigneA)}">${initials(t.assigneA)}</div>
                        ${t.assigneA}
                    </div>
                    <div class="card-date">${formatDate(t.echeance)}</div>
                </div>
            </div>`).join('');

        el.querySelectorAll('.kanban-card').forEach(card => {
            card.addEventListener('dragstart', e => {
                draggedId = parseInt(card.dataset.id);
                card.classList.add('dragging');
            });
            card.addEventListener('dragend', () => card.classList.remove('dragging'));
        });
    });
}

function initDragDrop() {
    document.querySelectorAll('.kanban-cards').forEach(zone => {
        zone.addEventListener('dragover', e => {
            e.preventDefault();
            zone.closest('.kanban-column').classList.add('drag-over');
        });
        zone.addEventListener('dragleave', () => {
            zone.closest('.kanban-column').classList.remove('drag-over');
        });
        zone.addEventListener('drop', async e => {
            e.preventDefault();
            const col = zone.closest('.kanban-column');
            col.classList.remove('drag-over');
            const newStatus = col.dataset.statut;
            if (draggedId && newStatus) {
                await updateTaskStatus(draggedId, newStatus);
                await renderKanban();
                showToast(`Tâche déplacée → "${newStatus}"`, 'success');
            }
        });
    });
}

async function advanceTask(id, currentStatus) {
    const flow = ['À faire', 'En cours', 'Validé', 'Terminé'];
    const idx = flow.indexOf(currentStatus);
    if (idx < flow.length - 1) {
        const next = flow[idx + 1];
        await updateTaskStatus(id, next);
        await renderKanban();
        showToast(`Tâche avancée → ${next}`, 'success');
    } else {
        showToast('La tâche est déjà terminée.', 'info');
    }
}

// ─── TASK LIST ───
async function renderTaskList(tasks) {
    const tbody = document.getElementById('tasks-tbody');
    if (!tbody) return;

    if (tasks.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-3);">Aucune tâche trouvée.</td></tr>`;
        return;
    }

    tbody.innerHTML = tasks.map(t => `
        <tr>
            <td><div class="task-name">${t.titre}</div></td>
            <td>${prioriteBadge(t.priorite)}</td>
            <td style="font-family:var(--mono);font-size:13px;">${formatDate(t.echeance)}</td>
            <td>
                <div style="display:flex;align-items:center;gap:6px;">
                    <div class="mini-avatar" style="background:${avatarColor(t.assigneA)}">${initials(t.assigneA)}</div>
                    ${t.assigneA}
                </div>
            </td>
            <td>${statutBadge(t.statut)}</td>
            <td>
                <div style="display:flex;gap:6px;">
                    <button class="btn btn-danger btn-sm" onclick="confirmDelete(${t.id})">Supprimer</button>
                </div>
            </td>
        </tr>`).join('');
}

async function confirmDelete(id) {
    if (confirm('Supprimer cette tâche ?')) {
        await deleteTask(id);
        const tasks = await loadTasks();
        renderTaskList(tasks);
    }
}

function initTaskListFilters(allTasks) {
    const go = () => {
        const filtered = filterTasks(
            allTasks,
            document.getElementById('filter-priorite')?.value,
            document.getElementById('filter-statut')?.value,
            document.getElementById('filter-search')?.value
        );
        renderTaskList(filtered);
    };
    document.getElementById('filter-priorite')?.addEventListener('change', go);
    document.getElementById('filter-statut')?.addEventListener('change', go);
    document.getElementById('filter-search')?.addEventListener('input', go);
}

// ─── CALENDAR ───
let calYear, calMonth;

async function renderCalendar(year, month) {
    const tasks = await loadTasks();
    const now = new Date();
    calYear = year ?? now.getFullYear();
    calMonth = month ?? now.getMonth();

    const monthNames = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    const titleEl = document.getElementById('cal-month-title');
    if (titleEl) titleEl.textContent = `${monthNames[calMonth]} ${calYear}`;

    const grid = document.getElementById('cal-grid');
    if (!grid) return;

    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;

    let html = '';
    for (let i = startOffset - 1; i >= 0; i--) {
        html += `<div class="cal-day other-month"><div class="cal-day-num">${new Date(calYear, calMonth, 0).getDate() - i}</div></div>`;
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${calYear}-${String(calMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const dayTasks = tasks.filter(t => t.echeance && t.echeance.startsWith(dateStr));
        const isToday = d === now.getDate() && calMonth === now.getMonth() && calYear === now.getFullYear();

        html += `<div class="cal-day${isToday ? ' today' : ''}" onclick="openDayModal('${dateStr}')">
            <div class="cal-day-num">${d}</div>
            ${dayTasks.slice(0, 2).map(t => `<span class="cal-task-pill ${prioriteClass(t.priorite)}">${t.titre}</span>`).join('')}
            ${dayTasks.length > 2 ? `<span style="font-size:10px;color:var(--text-3);">+${dayTasks.length - 2} autres</span>` : ''}
        </div>`;
    }

    grid.innerHTML = html;
}

async function openDayModal(dateStr) {
    const tasks = await loadTasks();
    const dayTasks = tasks.filter(t => t.echeance && t.echeance.startsWith(dateStr));
    const modal = document.getElementById('day-modal');
    const title = document.getElementById('day-modal-title');
    const list = document.getElementById('day-modal-list');
    if (!modal) return;

    const d = new Date(dateStr + 'T00:00:00');
    title.textContent = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

    list.innerHTML = dayTasks.length === 0
        ? '<div class="empty-state"><div class="empty-icon">📅</div><p>Aucune tâche ce jour.</p></div>'
        : dayTasks.map(t => `
            <div class="task-item">
                <div class="priority-dot ${prioriteClass(t.priorite)}"></div>
                <div class="task-info">
                    <div class="task-title">${t.titre}</div>
                    <div class="task-meta">${t.assigneA}</div>
                </div>
                ${prioriteBadge(t.priorite)}
            </div>`).join('');

    modal.classList.add('open');
}

// ─── NOUVELLE TÂCHE ───
function initNewTaskForm() {
    document.querySelectorAll('.checkbox-label').forEach(label => {
        label.addEventListener('click', () => {
            const input = label.querySelector('input');
            input.checked = !input.checked;
            label.classList.toggle('checked', input.checked);
        });
    });

    const form = document.getElementById('new-task-form');
    if (!form) return;

    form.addEventListener('submit', async e => {
        e.preventDefault();
        const titre = document.getElementById('titre')?.value.trim();
        const echeance = document.getElementById('echeance')?.value;

        if (!titre) { showToast('Le titre est obligatoire.', 'error'); return; }
        if (!echeance) { showToast("L'échéance est obligatoire.", 'error'); return; }

        const labels = Array.from(document.querySelectorAll('.label-checkbox:checked')).map(i => i.value);

        const task = {
            titre,
            description: document.getElementById('description')?.value || '',
            priorite: document.getElementById('priorite')?.value || 'Moyenne',
            echeance,
            assigneA: document.getElementById('assigne')?.value || 'Non assigné',
            statut: 'À faire',
            labels
        };

        await saveTask(task);
        showToast('Tâche créée avec succès !', 'success');
        setTimeout(() => window.location.href = 'taches.html', 1000);
    });
}

// ─── ÉQUIPE ───
async function renderTeam() {
    try {
        const res = await fetch(`${API}/users`);
        const users = await res.json();
        const tasks = await loadTasks();

        const grid = document.getElementById('team-grid');
        if (!grid) return;

        grid.innerHTML = users.map(u => {
            const memberTasks = tasks.filter(t => t.assigneA === u.nom);
            const open = memberTasks.filter(t => t.statut !== 'Terminé').length;
            return `
                <div class="team-card">
                    <div class="team-avatar" style="background:${avatarColor(u.nom)}">${initials(u.nom)}</div>
                    <div class="team-name">${u.nom}</div>
                    <div class="team-role">${u.role}</div>
                    <div class="team-tasks">${open} tâche(s) en cours · ${memberTasks.length} total</div>
                    <div style="margin-top:8px;font-size:11px;color:var(--text-3);">${u.email}</div>
                </div>`;
        }).join('');
    } catch (err) {
        console.error('Erreur équipe:', err);
    }
}

// ─── MODALS ───
function initModals() {
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => btn.closest('.modal-overlay')?.classList.remove('open'));
    });
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', e => {
            if (e.target === overlay) overlay.classList.remove('open');
        });
    });
}

// ─── INIT ───
document.addEventListener('DOMContentLoaded', async () => {
    if (localStorage.getItem('securetask_dark') === '1') {
        document.body.classList.add('dark-mode');
    }

    const page = document.body.dataset.page;

    if (page === 'login')    { initLogin();    return; }
    if (page === 'register') { initRegister(); return; } 

    requireAuth();
    initSidebar();
    initModals();

    if (page === 'dashboard') await renderDashboard();
    if (page === 'kanban') { await renderKanban(); initDragDrop(); }
    if (page === 'taches') {
        const tasks = await loadTasks();
        await renderTaskList(tasks);
        initTaskListFilters(tasks);
    }
    if (page === 'calendrier') {
        await renderCalendar();
        document.getElementById('cal-prev')?.addEventListener('click', async () => {
            calMonth--;
            if (calMonth < 0) { calMonth = 11; calYear--; }
            await renderCalendar(calYear, calMonth);
        });
        document.getElementById('cal-next')?.addEventListener('click', async () => {
            calMonth++;
            if (calMonth > 11) { calMonth = 0; calYear++; }
            await renderCalendar(calYear, calMonth);
        });
    }
    if (page === 'nouvelle-tache') initNewTaskForm();
    if (page === 'equipe') await renderTeam();
});
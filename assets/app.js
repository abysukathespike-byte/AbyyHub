
// ===================== FIREBASE =====================
const firebaseConfig = {
    apiKey: "AIzaSyBx7iNsKzUjiZh-cVnfw3Tl8AYPz_xjH7A",
    authDomain: "ratt-ceee0.firebaseapp.com",
    databaseURL: "https://ratt-ceee0-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "ratt-ceee0",
    storageBucket: "ratt-ceee0.firebasestorage.app",
    messagingSenderId: "767485162301",
    appId: "1:767485162301:web:c32d5f18d8662559db8b54"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const storage = firebase.storage();

// ===================== GLOBAL VARS =====================
let currentUser = null;
let currentScripts = [];
let currentExecutors = [];
let isSidebarEventInitialized = false;
let chatListener = null;
let chatCooldown = false;
let chatBadgeCount = 0;
let lastReadTimestamp = 0;
let allChatMessages = [];
let chatReportedMessages = [];
let onlineUsers = {};

const EXECUTOR_LIST = ['Synapse X', 'Fluxus', 'Krnl', 'Script-Ware', 'Hydrogen', 'Arceus X', 'Delta', 'JJSploit', 'Codex', 'Valyse', 'Solara', 'Vega X', 'Oxygen U', 'Comet', 'Nihon', 'Zenith', 'Trigon Evo', 'Seliware', 'Krampus', 'Exoliner', 'Spy X', 'Nixware', 'Cryptic', 'Fizur', 'Volt', 'Raikou', 'Slink', 'Aurora', 'Sirhurt', 'ProtoSmasher', 'Sentinel', 'Calamari', 'Electron', 'Proxo', 'Tsuinami', 'Script-Ware M', 'Fluxus Mobile', 'Krnl Mobile', 'Nihon Mobile', 'Nebula'];

const BAD_WORDS = ['anjing', 'bangsat', 'kontol', 'memek', 'pepek', 'ngentot', 'jancok', 'asu', 'bajingan', 'goblok', 'tolol', 'bodoh', 'idiot', 'sial', 'setan', 'kampret', 'brengsek', 'nyebelin', 'keparat', 'sinting', 'culun', 'lucah', 'porno'];

// ===================== HELPERS =====================
function escapeHtml(str) {
    if (str === undefined || str === null) return '';
    return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function showToast(msg, type) {
    type = type || 'success';
    const t = document.getElementById('toast');
    const icon = { success: 'fa-circle-check', error: 'fa-circle-exclamation', info: 'fa-circle-info' }[type] || 'fa-circle-check';
    t.className = 'toast toast-' + type;
    t.querySelector('i').className = 'fas ' + icon;
    document.getElementById('toast-msg').textContent = msg;
    requestAnimationFrame(() => t.classList.add('show'));
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 3000);
}
function closeModal(id) { const m = document.getElementById(id); if (m) m.classList.remove('active'); }
function closeAnyOpenModals() { document.querySelectorAll('.modal-overlay.active').forEach(m => { if (m.id === 'generic-modal' || m.id === 'upload-modal') m.classList.remove('active'); else m.remove(); }); }

function showConfirm(message, opts) {
    opts = opts || {};
    return new Promise(resolve => {
        const m = document.getElementById('generic-modal');
        m.innerHTML = `<div class="modal-content"><div class="modal-header"><h3 class="modal-title"><i class="fas fa-triangle-exclamation"></i> ${escapeHtml(opts.title || 'Konfirmasi')}</h3></div><p class="modal-body-text">${escapeHtml(message)}</p><div class="modal-actions"><button class="btn-ghost" id="confirm-cancel">Batal</button><button class="btn-primary ${opts.danger ? 'btn-danger' : ''}" id="confirm-ok">${escapeHtml(opts.okLabel || 'Ya, lanjutkan')}</button></div></div>`;
        m.classList.add('active');
        document.getElementById('confirm-cancel').onclick = () => { m.classList.remove('active'); resolve(false); };
        document.getElementById('confirm-ok').onclick = () => { m.classList.remove('active'); resolve(true); };
    });
}
function showPrompt(title, placeholder) {
    return new Promise(resolve => {
        const m = document.getElementById('generic-modal');
        m.innerHTML = `<div class="modal-content"><div class="modal-header"><h3 class="modal-title"><i class="fas fa-pen"></i> ${escapeHtml(title)}</h3><button class="modal-close" id="prompt-x"><i class="fas fa-xmark"></i></button></div><div class="form-group"><textarea id="prompt-input" placeholder="${escapeHtml(placeholder || '')}" style="min-height:90px;"></textarea></div><div class="modal-actions"><button class="btn-ghost" id="prompt-cancel">Batal</button><button class="btn-primary" id="prompt-ok">Kirim</button></div></div>`;
        m.classList.add('active');
        const input = document.getElementById('prompt-input'); input.focus();
        const done = val => { m.classList.remove('active'); resolve(val); };
        document.getElementById('prompt-x').onclick = () => done(null);
        document.getElementById('prompt-cancel').onclick = () => done(null);
        document.getElementById('prompt-ok').onclick = () => { const v = input.value.trim(); if (!v) { showToast('Isi dulu ya', 'error'); return; } done(v); };
    });
}
function filterBadWords(text) {
    let filtered = text;
    BAD_WORDS.forEach(word => {
        const regex = new RegExp(word, 'gi');
        filtered = filtered.replace(regex, '***');
    });
    return filtered;
}
function formatTime(timestamp) {
    const d = new Date(timestamp);
    return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
}
function getInitials(name) {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
}
function getTagClass(tag) {
    const t = tag.toLowerCase();
    if (t === 'verified') return 'verified';
    if (t === 'starshub') return 'starshub';
    if (t === 'staff') return 'staff';
    if (t === 'contributor') return 'contributor';
    return 'custom';
}

// ===================== NETWORK CANVAS =====================
function initNetworkAnimation() {
    const canvas = document.getElementById('network-canvas');
    const ctx = canvas.getContext('2d');
    let particles = [];
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    function createParticles() { particles = []; for (let i = 0; i < 60; i++) particles.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.6, size: Math.random() * 2 + 0.5 }); }
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => { p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > canvas.width) p.vx *= -1; if (p.y < 0 || p.y > canvas.height) p.vy *= -1; ctx.fillStyle = `rgba(124,92,255,${0.3 + Math.sin(Date.now() / 2000 + p.x) * 0.1})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); });
        for (let i = 0; i < particles.length; i++) for (let j = i + 1; j < particles.length; j++) { const dx = particles[i].x - particles[j].x; const dy = particles[i].y - particles[j].y; const dist = Math.sqrt(dx*dx + dy*dy); if (dist < 130) { ctx.strokeStyle = `rgba(124,92,255,${0.08 - dist/130*0.08})`; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y); ctx.stroke(); } }
        requestAnimationFrame(draw);
    }
    window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; createParticles(); });
    createParticles(); draw();
}

// ===================== DEVICE INFO =====================
function getDeviceName() {
    const ua = navigator.userAgent;
    const patterns = [
        [/SM-A515F/, 'Samsung Galaxy A51'], [/SM-A525/, 'Samsung Galaxy A52'], [/SM-A526/, 'Samsung Galaxy A52 5G'],
        [/SM-A72\d/, 'Samsung Galaxy A72'], [/SM-A32\d/, 'Samsung Galaxy A32'], [/SM-G991/, 'Samsung Galaxy S21'],
        [/SM-S901/, 'Samsung Galaxy S22'], [/SM-S908/, 'Samsung Galaxy S22 Ultra'], [/SM-S911/, 'Samsung Galaxy S23'],
        [/Redmi Note \d+\w*/, m => m[0]], [/Redmi/, 'Xiaomi Redmi'], [/POCO \w+/, m => 'Xiaomi ' + m[0]],
        [/iPhone \d+[\w,]*/, m => 'Apple ' + m[0]], [/iPad/, 'Apple iPad'], [/Pixel \w+/, m => 'Google ' + m[0]],
        [/OPPO \w+/, m => m[0]], [/vivo \w+/, m => m[0]], [/realme \w+/, m => m[0]], [/Infinix \w+/, m => m[0]],
        [/Tecno \w+/, m => m[0]], [/Huawei \w+/, m => m[0]], [/Nokia \w+/, m => m[0]], [/ASUS \w+/, m => m[0]],
        [/Sony \w+/, m => m[0]], [/OnePlus \w+/, m => m[0]], [/Windows/, 'Windows PC'], [/Macintosh/, 'Mac']
    ];
    for (const [re, val] of patterns) { const m = ua.match(re); if (m) return typeof val === 'function' ? val(m) : val; }
    return 'Perangkat tidak dikenal';
}
function getOSVersion() {
    const ua = navigator.userAgent;
    let m;
    if ((m = ua.match(/Android (\d+(?:\.\d+)?)/))) return 'Android ' + m[1];
    if ((m = ua.match(/iPhone OS (\d+(?:\.\d+)?)/))) return 'iOS ' + m[1].replace(/_/g, '.');
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Macintosh')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    return 'Tidak diketahui';
}
function getBatteryInfo() {
    const el = document.getElementById('device-battery');
    if (navigator.getBattery) {
        navigator.getBattery().then(b => {
            function update() { el.textContent = Math.round(b.level * 100) + '%' + (b.charging ? ' · Mengisi' : ''); }
            update(); b.addEventListener('levelchange', update); b.addEventListener('chargingchange', update);
        }).catch(() => el.textContent = 'Tidak tersedia');
    } else el.textContent = 'Tidak didukung';
}
function getPing() {
    const el = document.getElementById('device-ping');
    if (!el) return;
    const start = performance.now();
    fetch('https://ratt-ceee0-default-rtdb.asia-southeast1.firebasedatabase.app/.json').then(() => {
        const ping = Math.round(performance.now() - start);
        if (ping < 100) el.innerHTML = `<span class="ping-indicator ping-green"></span> ${ping}ms · Optimal`;
        else if (ping < 200) el.innerHTML = `<span class="ping-indicator ping-yellow"></span> ${ping}ms · Cukup`;
        else el.innerHTML = `<span class="ping-indicator ping-red"></span> ${ping}ms · Lambat`;
    }).catch(() => el.innerHTML = `<span class="ping-indicator ping-red"></span> Gagal`);
}
let pingInterval = null;
function initDeviceInfo() {
    document.getElementById('device-name').textContent = getDeviceName();
    document.getElementById('device-os').textContent = getOSVersion();
    getBatteryInfo(); getPing();
    clearInterval(pingInterval); pingInterval = setInterval(getPing, 5000);
}

// ===================== LOADING SCREEN =====================
function showLoadingScreen() {
    document.getElementById('loading-screen').classList.add('show');
}
function hideLoadingScreen() {
    document.getElementById('loading-screen').classList.remove('show');
}

// ===================== AUTH =====================
function switchAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    document.getElementById('auth-error').classList.remove('show');
    if (tab === 'login') { document.getElementById('tab-login').classList.add('active'); document.getElementById('login-form').classList.add('active'); }
    else { document.getElementById('tab-register').classList.add('active'); document.getElementById('register-form').classList.add('active'); }
}
function showAuthError(msg) { const e = document.getElementById('auth-error'); e.textContent = msg; e.classList.add('show'); clearTimeout(e._t); e._t = setTimeout(() => e.classList.remove('show'), 5000); }

function setBtnLoading(id, loading, label) {
    const b = document.getElementById(id);
    if (!b) return;
    b.disabled = loading;
    if (loading) { b.dataset.label = b.innerHTML; b.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> ' + (label || 'Memproses...'); }
    else if (b.dataset.label) { b.innerHTML = b.dataset.label; }
}

function handleRegister() {
    db.ref('config/registerEnabled').once('value').then(s => {
        if (s.val() === false) { showAuthError('Pendaftaran sedang ditutup oleh admin.'); return; }
        const u = document.getElementById('register-username').value.trim();
        const p = document.getElementById('register-password').value.trim();
        if (!u || !p) { showAuthError('Username dan password wajib diisi!'); return; }
        if (u.length < 3) { showAuthError('Username minimal 3 karakter!'); return; }
        if (!/^[a-zA-Z0-9_]+$/.test(u)) { showAuthError('Username hanya boleh huruf, angka, dan underscore!'); return; }
        if (p.length < 4) { showAuthError('Password minimal 4 karakter!'); return; }
        setBtnLoading('register-btn', true, 'Mendaftarkan...');
        db.ref('users/' + u).once('value').then(s => {
            if (s.exists()) { setBtnLoading('register-btn', false); showAuthError('Username sudah digunakan!'); return; }
            const data = { username: u, password: p, role: 'member', bio: '', followers: 0, following: 0, likesReceived: 0, createdAt: Date.now(), verified: false, warnings: 0, banned: false, scriptsCount: 0, tags: [], tiktok: '', youtube: '', instagram: '', discord: '', website: '', phone: '' };
            db.ref('users/' + u).set(data).then(() => {
                localStorage.setItem('abyyhub_user', JSON.stringify({ username: u, password: p }));
                currentUser = data;
                showLoadingScreen();
                setTimeout(() => { loadApp(); hideLoadingScreen(); }, 1200);
            }).catch(() => { setBtnLoading('register-btn', false); showAuthError('Gagal mendaftar, coba lagi.'); });
        }).catch(() => { setBtnLoading('register-btn', false); showAuthError('Tidak bisa terhubung ke server.'); });
    });
}

function handleLogin() {
    const u = document.getElementById('login-username').value.trim();
    const p = document.getElementById('login-password').value.trim();
    if (!u || !p) { showAuthError('Username dan password wajib diisi!'); return; }
    setBtnLoading('login-btn', true, 'Masuk...');
    db.ref('users/' + u).once('value').then(s => {
        if (!s.exists()) { setBtnLoading('login-btn', false); showAuthError('Username tidak ditemukan!'); return; }
        const data = s.val();
        if (data.banned) { setBtnLoading('login-btn', false); showAuthError('Akun kamu telah di-ban.'); return; }
        if (data.password !== p) { setBtnLoading('login-btn', false); showAuthError('Password salah!'); return; }
        localStorage.setItem('abyyhub_user', JSON.stringify({ username: u, password: p }));
        currentUser = data;
        showLoadingScreen();
        setTimeout(() => { loadApp(); hideLoadingScreen(); }, 1200);
    }).catch(() => { setBtnLoading('login-btn', false); showAuthError('Tidak bisa terhubung ke server.'); });
}

function loadApp() {
    if (!currentUser) {
        localStorage.removeItem('abyyhub_user');
        document.getElementById('auth-page').style.display = 'flex';
        document.getElementById('app').style.display = 'none';
        return;
    }
    db.ref('config/maintenance').once('value').then(s => {
        const maintenance = !!s.val();
        if (maintenance && currentUser.role !== 'dev') {
            document.getElementById('auth-page').style.display = 'none';
            document.getElementById('maintenance-page').style.display = 'flex';
            return;
        }
        document.getElementById('auth-page').style.display = 'none';
        document.getElementById('maintenance-page').style.display = 'none';
        document.getElementById('app').style.display = 'block';
        initNetworkAnimation();
        loadNews(); loadExecutors(); loadLeaderboard(); loadProfile(); setupSidebar(); setupBannerGreeting(); initDeviceInfo();
        initChat();
        if (!isSidebarEventInitialized) {
            initSidebarEvents();
            isSidebarEventInitialized = true;
        }
    });
}
function logout() { localStorage.removeItem('abyyhub_user'); location.reload(); }

// ===================== SIDEBAR / NAV =====================
function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
}
function openSidebar() {
    document.getElementById('sidebar').classList.add('open');
}
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar.classList.contains('open')) {
        closeSidebar();
    } else {
        openSidebar();
    }
}
function initSidebarEvents() {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle-btn');
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    const profileMini = document.querySelectorAll('[data-page="profile"]');
    const logoutBtn = document.getElementById('logout-btn');

    if (sidebar) {
        sidebar.addEventListener('click', function(e) {
            e.stopPropagation();
        }, false);
    }

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            toggleSidebar();
        }, false);
    }

    sidebarLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const page = this.getAttribute('data-page');
            if (page) {
                e.preventDefault();
                e.stopPropagation();
                if (page === 'chat') {
                    chatBadgeCount = 0;
                    document.getElementById('chat-badge').style.display = 'none';
                    document.getElementById('chat-badge').textContent = '0';
                }
                navigate(page);
            }
        }, false);
    });

    profileMini.forEach(el => {
        el.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            navigate('profile');
        }, false);
    });

    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            logout();
        }, false);
    }
}
function setupBannerGreeting() {
    if (!currentUser) return;
    const hour = new Date().getHours();
    let greeting = 'Halo';
    let emoji = '✨';
    if (hour < 12) { greeting = `Pagi, ${currentUser.username}!`; emoji = '🌅'; }
    else if (hour < 17) { greeting = `Siang, ${currentUser.username}!`; emoji = '☀️'; }
    else if (hour < 21) { greeting = `Malam, ${currentUser.username}!`; emoji = '🌙'; }
    else { greeting = `Malam Malam, ${currentUser.username}!`; emoji = '🌌'; }
    document.getElementById('banner-greeting').textContent = greeting;
    document.getElementById('banner-icon').textContent = emoji;
}
function setupSidebar() {
    if (!currentUser) return;
    document.getElementById('sidebar-username').textContent = currentUser.username;
    document.getElementById('sidebar-role').textContent = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
    if (currentUser.avatarUrl) document.getElementById('sidebar-profile-pic').innerHTML = `<img src="${currentUser.avatarUrl}" alt="">`;
    if (['vip', 'admin', 'dev'].includes(currentUser.role)) { document.getElementById('nav-create').style.display = 'flex'; document.getElementById('section-create').style.display = 'block'; }
    if (currentUser.role === 'dev') { document.getElementById('nav-devpanel').style.display = 'flex'; document.getElementById('section-admin').style.display = 'block'; }
}
function navigate(page) {
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    document.getElementById('page-' + page).style.display = 'block';
    document.querySelectorAll('.sidebar-link').forEach(a => a.classList.remove('active'));
    const nav = document.getElementById('nav-' + page); if (nav) nav.classList.add('active');
    if (window.innerWidth < 768) closeSidebar();
    window.scrollTo(0, 0);
    if (page === 'scripts') loadAllScripts();
    else if (page === 'executors') loadExecutors();
    else if (page === 'leaderboard') loadLeaderboard();
    else if (page === 'profile') loadProfile();
    else if (page === 'devpanel') loadDevPanel();
   
    else if (page === 'tips') loadTips();
    else if (page === 'home') loadNews();
    else if (page === 'chat') { loadChatMessages(); }
}

// ===================== NEWS =====================
function loadNews() {
    const el = document.getElementById('news-list');
    el.innerHTML = '<div class="loading-inline"><i class="fas fa-circle-notch fa-spin"></i> Memuat berita...</div>';
    db.ref('news').orderByChild('timestamp').limitToLast(20).once('value').then(s => {
        if (!s.exists()) { el.innerHTML = emptyState('fa-newspaper', 'Belum ada berita', 'Berita terbaru akan muncul di sini.'); return; }
        const arr = []; s.forEach(c => arr.push({ id: c.key, ...c.val() })); arr.reverse();
        el.innerHTML = arr.map(n => `<div class="news-card"><div class="news-card-title">${escapeHtml(n.title)}</div><div class="news-card-date">${new Date(n.timestamp || 0).toLocaleDateString('id-ID')} · ${new Date(n.timestamp || 0).toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'})}</div><div class="news-card-content">${escapeHtml(n.content)}</div></div>`).join('');
    }).catch(() => el.innerHTML = emptyState('fa-triangle-exclamation', 'Gagal memuat', 'Coba refresh halaman.'));
}
function emptyState(icon, title, desc) {
    return `<div class="empty-state"><i class="fas ${icon}"></i><div class="empty-state-title">${escapeHtml(title)}</div><div class="empty-state-desc">${escapeHtml(desc)}</div></div>`;
}

// ===================== SCRIPTS =====================
function loadAllScripts() {
    const el = document.getElementById('scripts-list');
    el.innerHTML = '<div class="loading-inline"><i class="fas fa-circle-notch fa-spin"></i> Memuat semua script...</div>';
    db.ref('scripts').once('value').then(s => {
        currentScripts = []; s.forEach(c => { const v = c.val(); currentScripts.push({ id: c.key, ...v }); });
        currentScripts.reverse();
        if (!currentScripts.length) { el.innerHTML = emptyState('fa-code', 'Belum ada script', 'Klik tombol + untuk upload script pertama.'); return; }
        el.innerHTML = currentScripts.map(createScriptCard).join('');
    }).catch(() => el.innerHTML = emptyState('fa-triangle-exclamation', 'Gagal memuat', 'Coba refresh halaman.'));
}
function createScriptCard(script) {
    let img = '<div class="script-card-image"><i class="fas fa-code"></i></div>';
    if (script.imageUrl) img = `<div class="script-card-image"><img src="${script.imageUrl}" alt="" loading="lazy" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-code\\'></i>'"></div>`;
    let ex = '';
    if (script.executors && script.executors.length) ex = script.executors.slice(0, 5).map(e => `<span class="executor-badge">${escapeHtml(e)}</span>`).join('') + (script.executors.length > 5 ? `<span class="executor-badge">+${script.executors.length - 5}</span>` : '');
    let takedownBadge = script.takedown ? '<span class="status-badge status-takedown"><i class="fas fa-ban"></i> Takedown</span>' : '';
    return `<div class="script-card" onclick="openScriptDetail('${script.id}')">
        ${img}
        <div class="script-card-title">${escapeHtml(script.title)} ${takedownBadge}</div>
        <div class="script-card-desc clamp-2">${escapeHtml(script.desc || 'Tidak ada deskripsi')}</div>
        <div class="script-card-executor">${ex}</div>
        <div class="script-card-meta">
            <div class="script-card-stats"><span><i class="fas fa-heart"></i> ${script.likes || 0}</span><span><i class="fas fa-star"></i> ${script.rating || 0}</span></div>
            <span class="script-card-author truncate">${escapeHtml(script.username)}</span>
        </div>
    </div>`;
}
function searchScripts(q) {
    const query = q.trim().toLowerCase();
    const el = document.getElementById('scripts-list');
    if (!query) {
        if (currentScripts.length) {
            el.innerHTML = currentScripts.map(createScriptCard).join('');
        } else {
            el.innerHTML = emptyState('fa-code', 'Belum ada script', 'Klik tombol + untuk upload script pertama.');
        }
        return;
    }
    const f = currentScripts.filter(sc => (sc.title || '').toLowerCase().includes(query) || (sc.desc || '').toLowerCase().includes(query) || (sc.hashtags || '').toLowerCase().includes(query) || (sc.executors && sc.executors.some(e => e.toLowerCase().includes(query))));
    el.innerHTML = f.length ? f.map(createScriptCard).join('') : emptyState('fa-magnifying-glass', 'Tidak ditemukan', 'Coba kata kunci lain.');
}
function openScriptDetail(id) {
    db.ref('scripts/' + id).once('value').then(s => {
        const sc = s.val(); if (!sc) { showToast('Script tidak ditemukan', 'error'); return; }
        const modal = document.createElement('div'); modal.className = 'modal-overlay active';
        let img = '';
        if (sc.imageUrl) img = `<div class="script-card-image" style="height:170px;margin-bottom:14px;"><img src="${sc.imageUrl}" alt=""></div>`;
        let ex = ''; if (sc.executors) ex = sc.executors.map(e => `<span class="executor-badge">${escapeHtml(e)}</span>`).join('');
        let takedownStatus = sc.takedown ? `<div style="background:var(--red-soft);padding:10px;border-radius:8px;margin-bottom:12px;color:var(--red);"><i class="fas fa-ban"></i> Script ini telah ditakedown. Alasan: ${escapeHtml(sc.takedownReason || 'Tidak disebutkan')}</div>` : '';
        let del = '';
        if (currentUser && (currentUser.username === sc.username || currentUser.role === 'dev')) del = `<button class="btn-ghost btn-danger" style="margin-top:10px;" onclick="deleteScript('${id}')"><i class="fas fa-trash"></i> Hapus Script</button>`;
        modal.innerHTML = `<div class="modal-content wide">
            <div class="modal-header"><h3 class="modal-title"><i class="fas fa-code"></i> ${escapeHtml(sc.title)}</h3><button class="modal-close" onclick="this.closest('.modal-overlay').remove()"><i class="fas fa-xmark"></i></button></div>
            ${img}
            ${takedownStatus}
            <p class="modal-body-text">${escapeHtml(sc.desc || '')}</p>
            <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;">${ex}</div>
            <div class="script-detail-code"><pre>${escapeHtml(sc.code || '')}</pre></div>
            <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap;">
                <button class="btn-ghost" style="width:auto;flex:1;" onclick="copyCode('${id}')"><i class="fas fa-copy"></i> Salin</button>
                <button class="btn-ghost" style="width:auto;flex:1;color:var(--green);" onclick="likeScript('${id}', this)"><i class="fas fa-heart"></i> ${sc.likes || 0}</button>
                <button class="btn-ghost" style="width:auto;flex:1;color:var(--red);" onclick="dislikeScript('${id}', this)"><i class="fas fa-thumbs-down"></i> ${sc.dislikes || 0}</button>
            </div>
            ${del}
            <button class="btn-ghost" style="margin-top:10px;" onclick="reportScript('${id}')"><i class="fas fa-flag"></i> Laporkan</button>
        </div>`;
        document.body.appendChild(modal);
    }).catch(() => showToast('Gagal memuat script', 'error'));
}
function copyCode(id) {
    const sc = currentScripts.find(s => s.id === id);
    const codeGetter = sc ? Promise.resolve(sc.code) : db.ref('scripts/' + id + '/code').once('value').then(s => s.val());
    codeGetter.then(code => { if (!code) { showToast('Tidak ada kode untuk disalin', 'error'); return; } navigator.clipboard.writeText(code).then(() => showToast('Script disalin ke clipboard')).catch(() => showToast('Gagal menyalin', 'error')); });
}
function likeScript(id, btn) {
    if (btn) btn.disabled = true;
    db.ref('scripts/' + id + '/likes').transaction(v => (v || 0) + 1).then(() => { showToast('Terima kasih atas like-nya'); if (btn) btn.innerHTML = `<i class="fas fa-heart"></i> ${(parseInt(btn.textContent) || 0) + 1}`; }).finally(() => { if (btn) btn.disabled = false; });
}
function dislikeScript(id, btn) {
    if (btn) btn.disabled = true;
    db.ref('scripts/' + id + '/dislikes').transaction(v => (v || 0) + 1).then(() => showToast('Masukan tercatat', 'info')).finally(() => { if (btn) btn.disabled = false; });
}
async function deleteScript(id) {
    const ok = await showConfirm('Script yang dihapus tidak bisa dikembalikan.', { title: 'Hapus script ini?', okLabel: 'Hapus', danger: true });
    if (!ok) return;
    db.ref('scripts/' + id).remove().then(() => { 
        showToast('Script dihapus'); 
        document.querySelectorAll('.modal-overlay').forEach(m => { if (m.id !== 'upload-modal' && m.id !== 'generic-modal') m.remove(); }); 
        loadAllScripts(); 
        if (document.getElementById('page-profile').style.display !== 'none') loadProfile();
    }).catch(() => showToast('Gagal menghapus', 'error'));
}
async function reportScript(id) {
    const reason = await showPrompt('Laporkan script', 'Jelaskan alasan kamu melaporkan script ini...');
    if (!reason) return;
    db.ref('reports').push({ scriptId: id, reportedBy: currentUser.username, reason, timestamp: Date.now(), resolved: false }).then(() => showToast('Laporan terkirim, terima kasih')).catch(() => showToast('Gagal mengirim laporan', 'error'));
}

// ===================== UPLOAD =====================
function openUploadModal() {
    db.ref('config/uploadEnabled').once('value').then(s => {
        if (s.val() === false) { showToast('Upload script sedang ditutup oleh admin.', 'error'); return; }
        document.getElementById('upload-title').value = '';
        document.getElementById('upload-desc').value = '';
        document.getElementById('upload-code').value = '';
        document.getElementById('upload-hashtags').value = '';
        document.getElementById('upload-preview').innerHTML = '<i class="fas fa-image"></i>';
        document.getElementById('upload-image-input').value = '';
        const el = document.getElementById('executor-checkboxes'); el.innerHTML = '';
        EXECUTOR_LIST.forEach(e => {
            const label = document.createElement('label');
            label.className = 'executor-checkbox';
            label.innerHTML = `<input type="checkbox" value="${escapeHtml(e)}"> ${escapeHtml(e)}`;
            label.onclick = function(e) {
                e.stopPropagation();
                this.classList.toggle('checked');
                const cb = this.querySelector('input');
                cb.checked = !cb.checked;
            };
            el.appendChild(label);
        });
        document.getElementById('upload-modal').classList.add('active');
    });
}
function handleUploadImage(input) {
    if (!input.files[0]) return;
    const r = new FileReader();
    r.onload = e => document.getElementById('upload-preview').innerHTML = `<img src="${e.target.result}" alt="">`;
    r.readAsDataURL(input.files[0]);
}
function submitScript() {
    const t = document.getElementById('upload-title').value.trim();
    const d = document.getElementById('upload-desc').value.trim();
    const c = document.getElementById('upload-code').value.trim();
    const h = document.getElementById('upload-hashtags').value.trim();
    const imgInput = document.getElementById('upload-image-input');
    const ex = []; document.querySelectorAll('.executor-checkbox input:checked').forEach(x => ex.push(x.value));
    if (!t) { showToast('Judul wajib diisi', 'error'); return; }
    if (!c) { showToast('Isi script wajib diisi', 'error'); return; }
    if (!imgInput.files[0]) { showToast('Foto sampul wajib diupload', 'error'); return; }
    if (!ex.length) { showToast('Pilih minimal 1 executor yang support', 'error'); return; }
    setBtnLoading('submit-script-btn', true, 'Mengupload...');
    const file = imgInput.files[0];
    storage.ref('scripts/' + Date.now() + '_' + file.name).put(file)
        .then(s => s.ref.getDownloadURL())
        .then(url => {
            return db.ref('scripts').push({ 
                title: t, desc: d, code: c, hashtags: h, executors: ex, 
                imageUrl: url, username: currentUser.username, 
                likes: 0, dislikes: 0, rating: 0, 
                timestamp: Date.now(), takedown: false 
            });
        })
        .then(() => { 
            return db.ref('users/' + currentUser.username + '/scriptsCount').transaction(v => (v || 0) + 1);
        })
        .then(() => { 
            showToast('Script berhasil diupload'); 
            closeModal('upload-modal'); 
            loadAllScripts();
            currentUser.scriptsCount = (currentUser.scriptsCount || 0) + 1;
            setBtnLoading('submit-script-btn', false);
        })
        .catch((err) => { 
            console.error('Upload error:', err);
            showToast('Gagal upload: ' + (err.message || 'coba lagi'), 'error'); 
            setBtnLoading('submit-script-btn', false);
        });
}

// ===================== EXECUTORS =====================
function loadExecutors() {
    const el = document.getElementById('executors-list');
    el.innerHTML = '<div class="loading-inline"><i class="fas fa-circle-notch fa-spin"></i> Memuat executor...</div>';
    db.ref('executors').once('value').then(s => {
        currentExecutors = []; s.forEach(c => currentExecutors.push({ id: c.key, ...c.val() }));
        if (!currentExecutors.length) { el.innerHTML = emptyState('fa-download', 'Belum ada executor', 'Executor akan ditambahkan oleh tim DewwHub.'); return; }
        el.innerHTML = currentExecutors.map(e => {
            let img = '<div class="executor-card-image"><i class="fas fa-download"></i></div>';
            if (e.imageUrl) img = `<div class="executor-card-image"><img src="${e.imageUrl}" alt=""></div>`;
            return `<div class="executor-card" onclick="openExecutorDetail('${e.id}')">${img}<div class="executor-card-name">${escapeHtml(e.name)}</div><div class="executor-card-desc">${escapeHtml(e.desc || '')}</div></div>`;
        }).join('');
    }).catch(() => el.innerHTML = emptyState('fa-triangle-exclamation', 'Gagal memuat', 'Coba refresh halaman.'));
}
function openExecutorDetail(id) {
    db.ref('executors/' + id).once('value').then(s => {
        const e = s.val(); if (!e) { showToast('Executor tidak ditemukan', 'error'); return; }
        const modal = document.createElement('div'); modal.className = 'modal-overlay active';
        modal.innerHTML = `<div class="modal-content">
            <div class="modal-header"><h3 class="modal-title"><i class="fas fa-download"></i> ${escapeHtml(e.name)}</h3><button class="modal-close" onclick="this.closest('.modal-overlay').remove()"><i class="fas fa-xmark"></i></button></div>
            <p class="modal-body-text">${escapeHtml(e.desc || 'Tidak ada deskripsi.')}</p>
            <p class="modal-body-text"><strong style="color:var(--text);">Platform:</strong> ${escapeHtml(e.platform || 'PC')}</p>
            <p class="modal-body-text"><strong style="color:var(--text);">Versi:</strong> ${escapeHtml(e.version || 'Latest')}</p>
            ${e.downloadUrl ? `<button class="btn-primary" style="margin-top:10px;" onclick="window.open('${encodeURI(e.downloadUrl)}','_blank')"><i class="fas fa-download"></i> Download (${e.downloads || 0})</button>` : ''}
            <button class="btn-ghost" style="margin-top:10px;" onclick="requestUpdate('${id}')"><i class="fas fa-arrows-rotate"></i> Request Update</button>
        </div>`;
        document.body.appendChild(modal);
    }).catch(() => showToast('Gagal memuat executor', 'error'));
}
function requestUpdate(id) { db.ref('updateRequests').push({ executorId: id, requestedBy: currentUser.username, timestamp: Date.now() }).then(() => showToast('Request update terkirim')).catch(() => showToast('Gagal mengirim request', 'error')); }

// ===================== LEADERBOARD =====================
function loadLeaderboard() {
    const el = document.getElementById('leaderboard-list');
    el.innerHTML = '<div class="loading-inline"><i class="fas fa-circle-notch fa-spin"></i> Memuat leaderboard...</div>';
    db.ref('users').once('value').then(s => {
        const arr = []; s.forEach(c => arr.push({ username: c.key, ...c.val() }));
        arr.sort((a, b) => (b.likesReceived || 0) - (a.likesReceived || 0));
        const top = arr.slice(0, 10);
        if (!top.length) { el.innerHTML = emptyState('fa-crown', 'Belum ada data', 'Leaderboard akan terisi seiring aktivitas komunitas.'); return; }
        el.innerHTML = top.map((u, i) => {
            const rankClass = i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : '';
            const rankIcon = i < 3 ? '<i class="fas fa-crown"></i>' : (i + 1);
            return `<div class="leaderboard-item"><div class="leaderboard-rank ${rankClass}">${rankIcon}</div><div class="leaderboard-user"><div class="leaderboard-username truncate">${escapeHtml(u.username)}</div><div class="leaderboard-stats">${u.followers || 0} followers</div></div><div class="leaderboard-likes"><i class="fas fa-heart"></i> ${u.likesReceived || 0}</div></div>`;
        }).join('');
    }).catch(() => el.innerHTML = emptyState('fa-triangle-exclamation', 'Gagal memuat', 'Coba refresh halaman.'));
}

// ===================== PROFILE =====================
function loadProfile() {
    if (!currentUser) return;
    const el = document.getElementById('profile-content');
    let av = '<div class="profile-mini-avatar" style="width:74px;height:74px;font-size:26px;margin:0 auto;"><i class="fas fa-user"></i></div>';
    if (currentUser.avatarUrl) av = `<div class="profile-mini-avatar" style="width:74px;height:74px;margin:0 auto;"><img src="${currentUser.avatarUrl}" alt=""></div>`;
    let v = currentUser.verified ? '<span class="verified-badge"><i class="fas fa-circle-check"></i> Verified</span>' : '';
    let tags = (currentUser.tags || []).map(t => {
        let cls = 'executor-badge';
        let style = '';
        if (t === 'Verified') { cls += ' verified-badge'; style = 'background:var(--blue-soft);color:var(--blue);'; }
        else if (t === 'StarsHub') { cls += ' status-badge status-verified'; style = 'background:var(--amber-soft);color:var(--amber);'; }
        else if (t === 'Staff') { style = 'background:var(--green-soft);color:var(--green);'; }
        else if (t === 'Contributor') { style = 'background:var(--accent-soft);color:var(--accent-light);'; }
        return `<span class="${cls}" style="${style}">${escapeHtml(t)}</span>`;
    }).join(' ');
    let social = '';
    if (currentUser.tiktok) social += `<a href="https://tiktok.com/@${escapeHtml(currentUser.tiktok)}" target="_blank" style="color:var(--text-muted);font-size:18px;transition:var(--transition);"><i class="fab fa-tiktok"></i></a> `;
    if (currentUser.youtube) social += `<a href="https://youtube.com/@${escapeHtml(currentUser.youtube)}" target="_blank" style="color:var(--text-muted);font-size:18px;transition:var(--transition);"><i class="fab fa-youtube"></i></a> `;
    if (currentUser.instagram) social += `<a href="https://instagram.com/${escapeHtml(currentUser.instagram)}" target="_blank" style="color:var(--text-muted);font-size:18px;transition:var(--transition);"><i class="fab fa-instagram"></i></a> `;
    if (currentUser.discord) social += `<span style="color:var(--text-muted);font-size:18px;"><i class="fab fa-discord"></i> ${escapeHtml(currentUser.discord)}</span> `;
    if (currentUser.website) social += `<a href="${escapeHtml(currentUser.website)}" target="_blank" style="color:var(--text-muted);font-size:18px;transition:var(--transition);"><i class="fas fa-globe"></i></a> `;
    if (currentUser.phone) social += `<span style="color:var(--text-muted);font-size:14px;"><i class="fas fa-phone"></i> ${escapeHtml(currentUser.phone)}</span> `;

    let dev = currentUser.role === 'dev' ? `<button class="btn-ghost" style="margin-top:10px;" onclick="navigate('devpanel')"><i class="fas fa-gauge-high"></i> Buka Dev Panel</button>` : '';
    el.innerHTML = `<div style="background:var(--bg-elevated);padding:26px 20px;border-radius:var(--radius-lg);text-align:center;border:1px solid var(--line);">
        ${av}
        <h2 style="margin-top:12px;font-size:17px;">${escapeHtml(currentUser.username)} ${v}</h2>
        <div style="margin-top:6px;">${tags}</div>
        <p style="color:var(--text-muted);font-size:13px;margin-top:4px;max-width:400px;margin-left:auto;margin-right:auto;">${escapeHtml(currentUser.bio || 'Belum ada bio.')}</p>
        ${social ? `<div style="margin-top:10px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">${social}</div>` : ''}
        <div style="display:flex;justify-content:center;gap:34px;margin-top:18px;">
            <div><div style="font-size:19px;font-weight:800;color:var(--accent-light);">${currentUser.scriptsCount || 0}</div><div style="font-size:11px;color:var(--text-muted);">Scripts</div></div>
            <div><div style="font-size:19px;font-weight:800;color:var(--accent-light);">${currentUser.followers || 0}</div><div style="font-size:11px;color:var(--text-muted);">Followers</div></div>
            <div><div style="font-size:19px;font-weight:800;color:var(--accent-light);">${currentUser.likesReceived || 0}</div><div style="font-size:11px;color:var(--text-muted);">Likes</div></div>
        </div>
        <div style="display:flex;gap:10px;justify-content:center;margin-top:18px;flex-wrap:wrap;">
            <button class="btn-small btn-ghost" style="width:auto;" onclick="showUserMenu()"><i class="fas fa-pen"></i> Edit profil</button>
            <button class="btn-small btn-ghost" style="width:auto;" onclick="logout()"><i class="fas fa-arrow-right-from-bracket"></i> Keluar</button>
        </div>
        ${dev}
    </div>
    <h3 class="section-heading"><i class="fas fa-code"></i> Script saya</h3>
    <div class="scripts-grid" id="user-scripts"></div>`;
    db.ref('scripts').orderByChild('username').equalTo(currentUser.username).once('value').then(s => {
        const us = document.getElementById('user-scripts');
        if (!s.exists()) { us.innerHTML = emptyState('fa-code', 'Belum ada script', 'Script yang kamu upload akan tampil di sini.'); return; }
        const arr = []; s.forEach(c => arr.push({ id: c.key, ...c.val() }));
        us.innerHTML = arr.map(createScriptCard).join('');
    });
}
function showUserMenu() {
    const modal = document.createElement('div'); modal.className = 'modal-overlay active';
    modal.innerHTML = `<div class="modal-content">
        <div class="modal-header"><h3 class="modal-title"><i class="fas fa-pen"></i> Edit Profil</h3><button class="modal-close" onclick="this.closest('.modal-overlay').remove()"><i class="fas fa-xmark"></i></button></div>
        <div class="form-group"><label>Bio</label><textarea id="edit-bio" maxlength="150">${escapeHtml(currentUser.bio || '')}</textarea></div>
        <div class="form-group" style="margin-top:12px;"><label>Foto profil</label><input type="file" id="avatar-input" accept="image/*" onchange="uploadAvatar(this)"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px;">
            <div class="form-group"><label>TikTok</label><input type="text" id="edit-tiktok" value="${escapeHtml(currentUser.tiktok || '')}" placeholder="@username"></div>
            <div class="form-group"><label>YouTube</label><input type="text" id="edit-youtube" value="${escapeHtml(currentUser.youtube || '')}" placeholder="@channel"></div>
            <div class="form-group"><label>Instagram</label><input type="text" id="edit-instagram" value="${escapeHtml(currentUser.instagram || '')}" placeholder="@username"></div>
            <div class="form-group"><label>Discord</label><input type="text" id="edit-discord" value="${escapeHtml(currentUser.discord || '')}" placeholder="username#1234"></div>
            <div class="form-group"><label>Website</label><input type="text" id="edit-website" value="${escapeHtml(currentUser.website || '')}" placeholder="https://..."></div>
            <div class="form-group"><label>No Telepon</label><input type="text" id="edit-phone" value="${escapeHtml(currentUser.phone || '')}" placeholder="0812..."></div>
        </div>
        <button class="btn-primary" style="margin-top:16px;" id="save-profile-btn" onclick="saveProfileFull()"><i class="fas fa-floppy-disk"></i> Simpan</button>
    </div>`;
    document.body.appendChild(modal);
}
function saveProfileFull() {
    const bio = document.getElementById('edit-bio').value.trim();
    const tiktok = document.getElementById('edit-tiktok').value.trim();
    const youtube = document.getElementById('edit-youtube').value.trim();
    const instagram = document.getElementById('edit-instagram').value.trim();
    const discord = document.getElementById('edit-discord').value.trim();
    const website = document.getElementById('edit-website').value.trim();
    const phone = document.getElementById('edit-phone').value.trim();
    if (!document.getElementById('save-profile-btn')) return;
    setBtnLoading('save-profile-btn', true, 'Menyimpan...');
    const updates = { bio, tiktok, youtube, instagram, discord, website, phone };
    db.ref('users/' + currentUser.username).update(updates).then(() => {
        Object.assign(currentUser, updates);
        showToast('Profil disimpan');
        loadProfile();
        const modal = document.querySelector('.modal-overlay.active');
        if (modal) modal.remove();
        setBtnLoading('save-profile-btn', false);
    }).catch(() => { showToast('Gagal menyimpan', 'error'); setBtnLoading('save-profile-btn', false); });
}
function uploadAvatar(input) {
    if (!input.files[0]) return;
    const file = input.files[0];
    setBtnLoading('save-profile-btn', true, 'Upload foto...');
    storage.ref('avatars/' + currentUser.username).put(file)
        .then(s => s.ref.getDownloadURL())
        .then(url => {
            return db.ref('users/' + currentUser.username + '/avatarUrl').set(url)
                .then(() => url);
        })
        .then(url => { 
            currentUser.avatarUrl = url; 
            loadProfile(); 
            setupSidebar(); 
            showToast('Foto profil diupload');
            setBtnLoading('save-profile-btn', false);
            const modal = document.querySelector('.modal-overlay.active');
            if (modal) modal.remove();
        })
        .catch(() => { 
            showToast('Gagal upload foto', 'error'); 
            setBtnLoading('save-profile-btn', false);
        });
}

// ===================== TIPS =====================
function loadTips() {
    const el = document.getElementById('tips-content');
    el.innerHTML = `<div style="padding:0;display:flex;flex-direction:column;gap:0;">
        <div class="tips-section">
            <div class="tips-section-title"><i class="fas fa-badge-check"></i> Badge & Status</div>
            <div class="tips-grid">
                <div class="tips-item">
                    <div class="tips-item-title"><i class="fas fa-badge-check" style="color:var(--blue);"></i> Verified</div>
                    <div class="tips-item-desc">Akun telah diverifikasi oleh tim DewwHub sebagai anggota terpercaya dan kredibel dalam komunitas.</div>
                </div>
                <div class="tips-item">
                    <div class="tips-item-title"><i class="fas fa-star" style="color:var(--amber);"></i> StarsHub</div>
                    <div class="tips-item-desc">Penghargaan khusus untuk kontributor dengan engagement dan interaksi tertinggi di komunitas DewwHub.</div>
                </div>
                <div class="tips-item">
                    <div class="tips-item-title"><i class="fas fa-shield" style="color:var(--green);"></i> Staff</div>
                    <div class="tips-item-desc">Tim resmi DewwHub yang mengelola komunitas, memoderasi konten, dan memastikan kualitas forum tetap baik.</div>
                </div>
                <div class="tips-item">
                    <div class="tips-item-title"><i class="fas fa-code" style="color:var(--accent);"></i> Contributor</div>
                    <div class="tips-item-desc">Kontributor aktif yang secara rutin berbagi script berkualitas dan memberikan kontribusi positif kepada komunitas.</div>
                </div>
            </div>
        </div>

        <div class="tips-section">
            <div class="tips-section-title"><i class="fas fa-user-tag"></i> Role & Permissions</div>
            <div class="tips-grid">
                <div class="tips-item">
                    <div class="tips-item-title"><i class="fas fa-user" style="color:var(--text-muted);"></i> Member</div>
                    <div class="tips-item-desc"><strong>Role dasar untuk semua pengguna.</strong> Kemampuan: Download executor, melihat script, bergabung chat komunitas, like/dislike script.</div>
                    <div class="tips-badge-group" style="margin-top:8px;">
                        <span class="tips-inline-badge"><i class="fas fa-check"></i> View Scripts</span>
                        <span class="tips-inline-badge"><i class="fas fa-check"></i> Chat Access</span>
                        <span class="tips-inline-badge"><i class="fas fa-check"></i> Download</span>
                    </div>
                </div>
                <div class="tips-item">
                    <div class="tips-item-title"><i class="fas fa-crown" style="color:var(--amber);"></i> VIP</div>
                    <div class="tips-item-desc"><strong>Tier membership eksklusif dengan akses fitur premium.</strong> Kemampuan: Upload script, menggunakan AI Script Generator (Generate tab), priority support, badge eksklusif.</div>
                    <div class="tips-badge-group" style="margin-top:8px;">
                        <span class="tips-inline-badge"><i class="fas fa-star"></i> Upload Scripts</span>
                        <span class="tips-inline-badge"><i class="fas fa-wand-magic-sparkles"></i> AI Generator</span>
                        <span class="tips-inline-badge"><i class="fas fa-badge-check"></i> Priority Support</span>
                    </div>
                </div>
                <div class="tips-item">
                    <div class="tips-item-title"><i class="fas fa-shield-halved" style="color:var(--blue);"></i> Admin</div>
                    <div class="tips-item-desc"><strong>Role moderator dengan tanggung jawab besar.</strong> Kemampuan: Moderasi konten, kelola user, hapus post tidak sesuai, edit announce, manage reports, akses mod panel.</div>
                    <div class="tips-badge-group" style="margin-top:8px;">
                        <span class="tips-inline-badge"><i class="fas fa-gavel"></i> Moderation</span>
                        <span class="tips-inline-badge"><i class="fas fa-trash"></i> Delete Posts</span>
                        <span class="tips-inline-badge"><i class="fas fa-cog"></i> Mod Panel</span>
                    </div>
                </div>
                <div class="tips-item">
                    <div class="tips-item-title"><i class="fas fa-code-branch" style="color:var(--green);"></i> Developer</div>
                    <div class="tips-item-desc"><strong>Role developer dengan akses tertinggi ke sistem.</strong> Kemampuan: Kelola executor, manage API, akses Dev Panel penuh, monitor logs, advanced analytics, infrastructure control.</div>
                    <div class="tips-badge-group" style="margin-top:8px;">
                        <span class="tips-inline-badge"><i class="fas fa-server"></i> Dev Panel</span>
                        <span class="tips-inline-badge"><i class="fas fa-code"></i> API Management</span>
                        <span class="tips-inline-badge"><i class="fas fa-chart-line"></i> Analytics</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="tips-section">
            <div class="tips-section-title"><i class="fas fa-download"></i> Supported Executors</div>
            <div class="tips-grid">
                <div class="tips-item">
                    <div class="tips-item-title"><i class="fas fa-gem" style="color:var(--blue);"></i> Synapse X</div>
                    <div class="tips-item-desc">Premium executor paling populer di komunitas Roblox. Fitur lengkap, update rutin, stabilitas tinggi, support API ekstensif, dan performa yang sangat baik untuk script kompleks.</div>
                </div>
                <div class="tips-item">
                    <div class="tips-item-title"><i class="fas fa-bolt" style="color:var(--amber);"></i> Krnl</div>
                    <div class="tips-item-desc">Free executor terbaik dengan performa yang setara premium. Cocok untuk casual users, update regular, community support kuat, dan kompatibilitas script yang sangat bagus.</div>
                </div>
                <div class="tips-item">
                    <div class="tips-item-title"><i class="fas fa-wind" style="color:var(--accent);"></i> Oxygen U</div>
                    <div class="tips-item-desc">Mid-tier executor dengan harga terjangkau dan fitur komprehensif. Balance sempurna antara performa dan biaya, update konsisten, dan dukungan komunitas yang solid.</div>
                </div>
                <div class="tips-item">
                    <div class="tips-item-title"><i class="fas fa-globe" style="color:var(--green);"></i> Universal</div>
                    <div class="tips-item-desc">Script yang kompatibel dengan SEMUA executor yang ada. Diperlukan untuk maksimal compatibility, menggunakan fitur-fitur standar Lua, tidak ada dependencies khusus executor.</div>
                </div>
            </div>
        </div>

        <div class="tips-section">
            <div class="tips-section-title"><i class="fas fa-lightbulb"></i> Tips Upload & Create Script</div>
            <div style="display:flex;flex-direction:column;gap:10px;">
                <div class="tips-item">
                    <div class="tips-item-title"><i class="fas fa-check-circle" style="color:var(--green);"></i> Deskripsi Detail & Jelas</div>
                    <div class="tips-item-desc">Jelaskan fitur script dengan rinci - user akan lebih mudah memahami fungsi dan lebih tertarik untuk menggunakan script Anda. Gunakan bullet points untuk kemudahan dibaca.</div>
                </div>
                <div class="tips-item">
                    <div class="tips-item-title"><i class="fas fa-flask" style="color:var(--accent);"></i> Test Sebelum Upload</div>
                    <div class="tips-item-desc">WAJIB test script di executor target sebelum upload ke platform. Pastikan tidak ada error, semua fitur berfungsi, dan performa acceptable. Cegah bad reviews.</div>
                </div>
                <div class="tips-item">
                    <div class="tips-item-title"><i class="fas fa-sync-alt" style="color:var(--blue);"></i> Update Regular</div>
                    <div class="tips-item-desc">Perbarui script secara berkala - fix bug, tambah fitur, improve performa. User menghargai developer yang responsif dan aktif maintain script mereka.</div>
                </div>
                <div class="tips-item">
                    <div class="tips-item-title"><i class="fas fa-code" style="color:var(--amber);"></i> Kode yang Clean & Organized</div>
                    <div class="tips-item-desc">Tulis kode dengan struktur baik, comments jelas, dan naming convention konsisten. Kode berkualitas mendapat rating lebih tinggi dari komunitas.</div>
                </div>
                <div class="tips-item">
                    <div class="tips-item-title"><i class="fas fa-shield-alt" style="color:var(--green);"></i> Hindari Malware & Scam</div>
                    <div class="tips-item-desc">DILARANG keras upload script yang berisi malware, trojan, atau scam. Pelanggar akan di-ban permanen dan script dihapus. Jaga kepercayaan komunitas!</div>
                </div>
            </div>
        </div>

        <div class="tips-section">
            <div class="tips-section-title"><i class="fas fa-graduation-cap"></i> Best Practices</div>
            <div style="display:flex;flex-direction:column;gap:10px;">
                <div class="tips-item">
                    <div class="tips-item-title"><i class="fas fa-info-circle" style="color:var(--blue);"></i> Communicative Support</div>
                    <div class="tips-item-desc">Responsif terhadap feedback user - jawab pertanyaan, terima saran, dan fix issue dengan cepat. Developer yang bisa berkomunikasi baik akan disukai komunitas.</div>
                </div>
                <div class="tips-item">
                    <div class="tips-item-title"><i class="fas fa-book" style="color:var(--accent);"></i> Documentation</div>
                    <div class="tips-item-desc">Buat dokumentasi singkat tentang cara menggunakan script - mana fitur utama, bagaimana setting, keyboard shortcuts, etc. Bantu user memaksimalkan script Anda.</div>
                </div>
                <div class="tips-item">
                    <div class="tips-item-title"><i class="fas fa-users" style="color:var(--green);"></i> Community Engagement</div>
                    <div class="tips-item-desc">Aktif di chat komunitas, bantu user lain, share tips & tricks. Developer yang terlibat komunitas akan naik tier faster dan get more credibility.</div>
                </div>
            </div>
        </div>
    </div>`;
}

// ============================================================
// ===================== GLOBAL CHAT ==========================
// ============================================================

function initChat() {
    // Update online status
    const userRef = db.ref('users/' + currentUser.username + '/online');
    userRef.set(true);
    userRef.onDisconnect().set(false);

    // Listen for online users
    db.ref('users').on('value', snapshot => {
        let count = 0;
        snapshot.forEach(child => {
            if (child.val().online === true) count++;
        });
        document.getElementById('online-count').textContent = count;
    });

    // Listen for new messages (realtime)
    if (chatListener) chatListener.off();
    chatListener = db.ref('chat').orderByChild('timestamp').limitToLast(100);
    chatListener.on('value', snapshot => {
        allChatMessages = [];
        snapshot.forEach(child => {
            allChatMessages.push({ id: child.key, ...child.val() });
        });
        allChatMessages.sort((a, b) => a.timestamp - b.timestamp);
        if (document.getElementById('page-chat').style.display !== 'none') {
            renderChatMessages();
        }
        updateChatBadge();
    });

    // Listen for chat reports
    db.ref('chatReports').on('value', snapshot => {
        chatReportedMessages = [];
        snapshot.forEach(child => {
            chatReportedMessages.push({ id: child.key, ...child.val() });
        });
    });

    // Load initial messages
    loadChatMessages();

    // Check for mentions & badge
    db.ref('chat').orderByChild('timestamp').startAt(lastReadTimestamp || 0).on('child_added', snapshot => {
        const msg = snapshot.val();
        if (msg && msg.timestamp > lastReadTimestamp && msg.username !== currentUser.username) {
            if (msg.text && msg.text.includes('@' + currentUser.username)) {
                chatBadgeCount++;
                document.getElementById('chat-badge').style.display = 'inline-block';
                document.getElementById('chat-badge').textContent = chatBadgeCount;
            }
        }
    });
}

function loadChatMessages() {
    renderChatMessages();
}

function renderChatMessages() {
    const container = document.getElementById('chat-messages');
    if (!allChatMessages.length) {
        container.innerHTML = emptyState('fa-comment', 'Belum ada pesan', 'Jadilah yang pertama chat!');
        return;
    }
    container.innerHTML = allChatMessages.map(msg => createChatMessageHTML(msg)).join('');
    container.scrollTop = container.scrollHeight;
}

function createChatMessageHTML(msg) {
    const isSelf = msg.username === currentUser.username;
    const isDeleted = msg.deleted === true;
    const deletedBy = msg.deletedBy || '';
    
    // Get user data for avatar and tags
    let avatarHtml = '<i class="fas fa-user"></i>';
    let usernameDisplay = escapeHtml(msg.username);
    let tagsHtml = '';
    let isOnline = false;

    // We'll use a placeholder for user data - will be filled async
    // For now, use basic data
    if (msg.avatarUrl) {
        avatarHtml = `<img src="${msg.avatarUrl}" alt="">`;
    }

    // Tags from message data (sent with message)
    if (msg.tags && msg.tags.length) {
        tagsHtml = msg.tags.map(t => {
            let cls = 'tag-badge';
            let style = '';
            const tl = t.toLowerCase();
            if (tl === 'verified') { cls += ' verified'; style = 'background:var(--blue-soft);color:var(--blue);'; }
            else if (tl === 'starshub') { cls += ' starshub'; style = 'background:var(--amber-soft);color:var(--amber);'; }
            else if (tl === 'staff') { cls += ' staff'; style = 'background:var(--green-soft);color:var(--green);'; }
            else if (tl === 'contributor') { cls += ' contributor'; style = 'background:var(--accent-soft);color:var(--accent-light);'; }
            return `<span class="${cls}" style="${style}">${escapeHtml(t)}</span>`;
        }).join('');
    }

    // Online status dot - check from onlineUsers
    const onlineDot = `<span class="online-dot ${msg.online ? 'online' : 'offline'}"></span>`;

    // Process text with mentions
    let textHtml = escapeHtml(msg.text || '');
    // Highlight mentions
    const mentionRegex = /@(\w+)/g;
    textHtml = textHtml.replace(mentionRegex, (match, username) => {
        if (username === currentUser.username) {
            return `<span class="mention">${match}</span>`;
        }
        return match;
    });

    // Filter bad words
    textHtml = filterBadWords(textHtml);

    // Time
    const timeHtml = `<span class="chat-message-time">${formatTime(msg.timestamp)}${isDeleted ? ' <span class="deleted-by">⚠️ Dihapus oleh ' + escapeHtml(deletedBy) + '</span>' : ''}${msg.edited ? ' <span class="edited">(diedit)</span>' : ''}</span>`;

    // Actions (edit/delete for own messages, delete for admin)
    let actionsHtml = '';
    if (!isDeleted) {
        if (isSelf) {
            actionsHtml = `<div class="chat-message-actions">
                <button onclick="editChatMessage('${msg.id}')"><i class="fas fa-pen"></i></button>
                <button class="danger" onclick="deleteOwnChatMessage('${msg.id}')"><i class="fas fa-trash"></i></button>
            </div>`;
        }
        if (currentUser.role === 'dev' || currentUser.role === 'admin') {
            actionsHtml += `<div class="chat-message-actions">
                <button class="danger" onclick="adminDeleteChatMessage('${msg.id}')"><i class="fas fa-trash-alt"></i></button>
                <button onclick="reportChatMessage('${msg.id}')"><i class="fas fa-flag"></i></button>
            </div>`;
        }
        // Report button for everyone
        if (!isSelf && currentUser.role !== 'dev' && currentUser.role !== 'admin') {
            actionsHtml += `<div class="chat-message-actions">
                <button onclick="reportChatMessage('${msg.id}')"><i class="fas fa-flag"></i></button>
            </div>`;
        }
    }

    const messageClass = isSelf ? 'chat-message self' : 'chat-message';
    const bubbleContent = isDeleted ? 
        `<div class="chat-message-text" style="color:var(--text-faint);font-style:italic;">Pesan telah dihapus oleh ${escapeHtml(deletedBy)}</div>${timeHtml}` :
        `<div class="chat-message-text">${textHtml}</div>${timeHtml}`;

    return `<div class="${messageClass}" id="msg-${msg.id}">
        <div class="chat-message-avatar">
            ${avatarHtml}
            ${onlineDot}
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;flex:1;">
            <div class="chat-message-bubble">
                <div class="chat-message-name">
                    ${usernameDisplay}
                    ${tagsHtml}
                </div>
                ${bubbleContent}
            </div>
            ${actionsHtml}
        </div>
    </div>`;
}

async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;
    if (chatCooldown) {
        showToast('Jangan spam! Tunggu 5 detik', 'error');
        return;
    }
    if (text.length > 200) {
        showToast('Maksimal 200 karakter', 'error');
        return;
    }

    // Filter bad words
    const filteredText = filterBadWords(text);

    // Get user data for message
    const userData = await db.ref('users/' + currentUser.username).once('value');
    const user = userData.val() || {};

    const msgData = {
        username: currentUser.username,
        text: filteredText,
        timestamp: Date.now(),
        avatarUrl: currentUser.avatarUrl || '',
        tags: currentUser.tags || [],
        online: true,
        edited: false,
        deleted: false,
        deletedBy: ''
    };

    db.ref('chat').push(msgData).then(() => {
        input.value = '';
        chatCooldown = true;
        document.getElementById('chat-send-btn').disabled = true;
        document.getElementById('chat-input').disabled = true;
        const msgEl = document.getElementById('chat-cooldown-msg');
        msgEl.style.display = 'block';
        let countdown = 5;
        msgEl.textContent = `Jangan spam! Tunggu ${countdown} detik`;
        const timer = setInterval(() => {
            countdown--;
            if (countdown <= 0) {
                clearInterval(timer);
                chatCooldown = false;
                document.getElementById('chat-send-btn').disabled = false;
                document.getElementById('chat-input').disabled = false;
                msgEl.style.display = 'none';
            } else {
                msgEl.textContent = `Jangan spam! Tunggu ${countdown} detik`;
            }
        }, 1000);
    }).catch(() => showToast('Gagal kirim pesan', 'error'));
}

function updateChatBadge() {
    // Check for unread messages with mentions
    if (!currentUser) return;
    db.ref('chat').orderByChild('timestamp').startAt(lastReadTimestamp || 0).once('value', snapshot => {
        let count = 0;
        snapshot.forEach(child => {
            const msg = child.val();
            if (msg && msg.timestamp > lastReadTimestamp && msg.username !== currentUser.username) {
                if (msg.text && msg.text.includes('@' + currentUser.username)) {
                    count++;
                }
            }
        });
        chatBadgeCount = count;
        if (count > 0) {
            document.getElementById('chat-badge').style.display = 'inline-block';
            document.getElementById('chat-badge').textContent = count;
        } else {
            document.getElementById('chat-badge').style.display = 'none';
        }
    });
}

function editChatMessage(msgId) {
    const msg = allChatMessages.find(m => m.id === msgId);
    if (!msg || msg.username !== currentUser.username) return;
    showPrompt('Edit pesan', msg.text).then(newText => {
        if (!newText || newText === msg.text) return;
        const filtered = filterBadWords(newText);
        db.ref('chat/' + msgId).update({ text: filtered, edited: true }).then(() => {
            showToast('Pesan diupdate');
        }).catch(() => showToast('Gagal update', 'error'));
    });
}

function deleteOwnChatMessage(msgId) {
    const msg = allChatMessages.find(m => m.id === msgId);
    if (!msg || msg.username !== currentUser.username) return;
    showConfirm('Hapus pesan ini?', { title: 'Hapus Pesan', okLabel: 'Hapus', danger: true }).then(ok => {
        if (!ok) return;
        db.ref('chat/' + msgId).update({ deleted: true, deletedBy: currentUser.username }).then(() => {
            showToast('Pesan dihapus');
        }).catch(() => showToast('Gagal hapus', 'error'));
    });
}

function adminDeleteChatMessage(msgId) {
    if (currentUser.role !== 'dev' && currentUser.role !== 'admin') return;
    showPrompt('Alasan hapus pesan (opsional)', '').then(reason => {
        const deletedBy = currentUser.username + (reason ? ' (' + reason + ')' : '');
        db.ref('chat/' + msgId).update({ deleted: true, deletedBy: deletedBy }).then(() => {
            showToast('Pesan dihapus oleh admin');
        }).catch(() => showToast('Gagal hapus', 'error'));
    });
}

function reportChatMessage(msgId) {
    showPrompt('Laporkan pesan ini', 'Jelaskan alasan kamu melaporkan pesan ini...').then(reason => {
        if (!reason) return;
        db.ref('chatReports').push({ 
            messageId: msgId, 
            reportedBy: currentUser.username, 
            reason, 
            timestamp: Date.now(),
            resolved: false 
        }).then(() => {
            showToast('Laporan terkirim');
        }).catch(() => showToast('Gagal lapor', 'error'));
    });
}

// ============================================================
// ===================== DEV PANEL ============================
// ============================================================

function loadDevPanel() {
    if (!currentUser || currentUser.role !== 'dev') { showToast('Halaman ini khusus Dev', 'error'); navigate('home'); return; }
    const el = document.getElementById('dev-panel-content');
    el.innerHTML = '<div class="loading-inline"><i class="fas fa-circle-notch fa-spin"></i> Memuat statistik...</div>';
    Promise.all([
        db.ref('users').once('value'), 
        db.ref('scripts').once('value'), 
        db.ref('executors').once('value'), 
        db.ref('reports').once('value'),
        db.ref('news').once('value'),
        db.ref('config').once('value'),
        db.ref('chat').once('value'),
        db.ref('chatReports').once('value')
    ]).then(([su, ss, se, sr, sn, sc, sch, scr]) => {
        const totalUsers = su.numChildren(), totalScripts = ss.numChildren(), totalExecutors = se.numChildren(), totalReports = sr.numChildren(), totalNews = sn.numChildren(), totalChat = sch.numChildren(), totalChatReports = scr.numChildren();
        const config = sc.val() || {};
        el.innerHTML = `
        <div class="dev-panel-stats">
            <div class="dev-stat"><div class="dev-stat-value">${totalUsers}</div><div class="dev-stat-label">Users</div></div>
            <div class="dev-stat"><div class="dev-stat-value">${totalScripts}</div><div class="dev-stat-label">Scripts</div></div>
            <div class="dev-stat"><div class="dev-stat-value">${totalExecutors}</div><div class="dev-stat-label">Executors</div></div>
            <div class="dev-stat"><div class="dev-stat-value">${totalReports}</div><div class="dev-stat-label">Reports</div></div>
            <div class="dev-stat"><div class="dev-stat-value">${totalNews}</div><div class="dev-stat-label">News</div></div>
            <div class="dev-stat"><div class="dev-stat-value">${totalChat}</div><div class="dev-stat-label">Chat Messages</div></div>
            <div class="dev-stat"><div class="dev-stat-value">${totalChatReports}</div><div class="dev-stat-label">Chat Reports</div></div>
        </div>
        <div class="dev-panel-menu">
            <div class="dev-panel-item" onclick="showManageScripts()"><i class="fas fa-code"></i> Kelola Script</div>
            <div class="dev-panel-item" onclick="showManageUsers()"><i class="fas fa-users"></i> Kelola User</div>
            <div class="dev-panel-item" onclick="showManageDatabase()"><i class="fas fa-database"></i> Kelola Database</div>
            <div class="dev-panel-item" onclick="showManageServer()"><i class="fas fa-server"></i> Kelola Server</div>
            <div class="dev-panel-item" onclick="showManageNews()"><i class="fas fa-newspaper"></i> Kelola News</div>
            <div class="dev-panel-item" onclick="showExecutorManagement()"><i class="fas fa-download"></i> Kelola Executors</div>
            <div class="dev-panel-item" onclick="showMaintenanceToggle()"><i class="fas fa-screwdriver-wrench"></i> Maintenance Mode</div>
            <div class="dev-panel-item" onclick="showReportList()"><i class="fas fa-flag"></i> Kelola Reports</div>
            <div class="dev-panel-item" onclick="showManageChat()"><i class="fas fa-comment"></i> Kelola Global Chat</div>
        </div>`;
    }).catch(() => el.innerHTML = emptyState('fa-triangle-exclamation', 'Gagal memuat', 'Coba refresh halaman.'));
}

// ===== KELOLA CHAT =====
function showManageChat() {
    const modal = document.createElement('div'); modal.className = 'modal-overlay active';
    modal.innerHTML = `<div class="modal-content wide"><div class="modal-header"><h3 class="modal-title"><i class="fas fa-comment"></i> Kelola Global Chat</h3><button class="modal-close" onclick="this.closest('.modal-overlay').remove()"><i class="fas fa-xmark"></i></button></div>
        <div style="margin-bottom:16px;">
            <h4 style="font-size:13px;font-weight:700;margin-bottom:8px;">Kata Kasar (filter)</h4>
            <div style="display:flex;gap:8px;margin-bottom:8px;">
                <input type="text" id="add-badword-input" placeholder="Tambah kata kasar" style="flex:1;padding:8px 12px;border-radius:8px;border:1px solid var(--line);background:var(--bg-surface);color:var(--text);">
                <button class="btn-primary" style="width:auto;padding:8px 16px;" onclick="addBadWord()">Tambah</button>
                <button class="btn-ghost" style="width:auto;padding:8px 16px;" onclick="resetBadWords()">Reset Default</button>
            </div>
            <div id="badwords-list" style="display:flex;flex-wrap:wrap;gap:6px;padding:8px;background:var(--bg-surface);border-radius:8px;min-height:40px;"></div>
        </div>
        <div>
            <h4 style="font-size:13px;font-weight:700;margin-bottom:8px;">Laporan Chat</h4>
            <div id="chat-reports-list"><div class="loading-inline"><i class="fas fa-circle-notch fa-spin"></i> Memuat...</div></div>
        </div>
        <div style="margin-top:16px;">
            <h4 style="font-size:13px;font-weight:700;margin-bottom:8px;">Cari & Hapus Pesan</h4>
            <div style="display:flex;gap:8px;">
                <input type="text" id="search-chat-input" placeholder="Cari pesan (username atau teks)" style="flex:1;padding:8px 12px;border-radius:8px;border:1px solid var(--line);background:var(--bg-surface);color:var(--text);">
                <button class="btn-primary" style="width:auto;padding:8px 16px;" onclick="searchChatMessages()">Cari</button>
                <button class="btn-ghost" style="width:auto;padding:8px 16px;" onclick="clearChatSearch()">Clear</button>
            </div>
            <div id="chat-search-results" style="margin-top:8px;max-height:200px;overflow-y:auto;"></div>
        </div>
    </div>`;
    document.body.appendChild(modal);
    loadBadWords();
    loadChatReports();
}

function loadBadWords() {
    const el = document.getElementById('badwords-list');
    db.ref('config/badWords').once('value').then(s => {
        const words = s.val() || BAD_WORDS;
        el.innerHTML = words.map(w => `<span style="background:var(--bg-surface-2);padding:4px 10px;border-radius:6px;font-size:12px;display:inline-flex;align-items:center;gap:6px;">${escapeHtml(w)} <button onclick="removeBadWord('${escapeHtml(w)}')" style="color:var(--red);font-size:12px;"><i class="fas fa-times"></i></button></span>`).join('');
    });
}

function addBadWord() {
    const input = document.getElementById('add-badword-input');
    const word = input.value.trim().toLowerCase();
    if (!word) { showToast('Masukkan kata', 'error'); return; }
    db.ref('config/badWords').transaction(arr => {
        arr = arr || BAD_WORDS.slice();
        if (arr.includes(word)) return arr;
        arr.push(word);
        return arr;
    }).then(() => {
        showToast('Kata ditambahkan');
        input.value = '';
        loadBadWords();
    }).catch(() => showToast('Gagal', 'error'));
}

function removeBadWord(word) {
    db.ref('config/badWords').transaction(arr => {
        arr = arr || BAD_WORDS.slice();
        return arr.filter(w => w !== word);
    }).then(() => {
        showToast('Kata dihapus');
        loadBadWords();
    }).catch(() => showToast('Gagal', 'error'));
}

function resetBadWords() {
    showConfirm('Reset ke daftar kata kasar default?', { title: 'Reset Filter', okLabel: 'Reset' }).then(ok => {
        if (!ok) return;
        db.ref('config/badWords').set(BAD_WORDS.slice()).then(() => {
            showToast('Reset berhasil');
            loadBadWords();
        }).catch(() => showToast('Gagal reset', 'error'));
    });
}

function loadChatReports() {
    const el = document.getElementById('chat-reports-list');
    db.ref('chatReports').once('value').then(s => {
        if (!s.exists()) { el.innerHTML = '<p style="color:var(--text-muted);font-size:13px;">Tidak ada laporan chat.</p>'; return; }
        let html = '';
        s.forEach(c => {
            const r = c.val();
            html += `<div class="admin-row"><div class="admin-row-info"><div class="admin-row-title">${escapeHtml(r.reportedBy)}</div><div class="admin-row-sub">${escapeHtml(r.reason)}</div></div><div class="admin-row-actions"><button class="btn-small btn-danger" onclick="resolveChatReport('${c.key}','${r.messageId}')">Resolve</button></div></div>`;
        });
        el.innerHTML = html;
    });
}

function resolveChatReport(reportKey, msgId) {
    showConfirm('Tandai laporan ini selesai?', { title: 'Resolve Report', okLabel: 'Ya' }).then(ok => {
        if (!ok) return;
        db.ref('chatReports/' + reportKey).remove().then(() => {
            showToast('Laporan resolved');
            loadChatReports();
        }).catch(() => showToast('Gagal', 'error'));
    });
}

function searchChatMessages() {
    const query = document.getElementById('search-chat-input').value.trim().toLowerCase();
    const el = document.getElementById('chat-search-results');
    if (!query) { el.innerHTML = '<p style="color:var(--text-muted);font-size:13px;">Masukkan kata kunci</p>'; return; }
    db.ref('chat').orderByChild('timestamp').limitToLast(200).once('value').then(s => {
        let results = [];
        s.forEach(c => {
            const msg = c.val();
            if (!msg.deleted) {
                const text = (msg.text || '').toLowerCase();
                const username = (msg.username || '').toLowerCase();
                if (text.includes(query) || username.includes(query)) {
                    results.push({ id: c.key, ...msg });
                }
            }
        });
        if (!results.length) { el.innerHTML = '<p style="color:var(--text-muted);font-size:13px;">Tidak ditemukan</p>'; return; }
        el.innerHTML = results.slice(0, 20).map(msg => `
            <div class="admin-row"><div class="admin-row-info"><div class="admin-row-title">${escapeHtml(msg.username)}</div><div class="admin-row-sub">${escapeHtml(msg.text)}</div></div><div class="admin-row-actions"><button class="btn-small btn-danger" onclick="adminDeleteChatMessageFromSearch('${msg.id}')">Hapus</button></div></div>
        `).join('');
    });
}

function clearChatSearch() {
    document.getElementById('search-chat-input').value = '';
    document.getElementById('chat-search-results').innerHTML = '';
}

function adminDeleteChatMessageFromSearch(msgId) {
    showPrompt('Alasan hapus pesan', '').then(reason => {
        const deletedBy = currentUser.username + (reason ? ' (' + reason + ')' : '');
        db.ref('chat/' + msgId).update({ deleted: true, deletedBy: deletedBy }).then(() => {
            showToast('Pesan dihapus');
            searchChatMessages();
        }).catch(() => showToast('Gagal hapus', 'error'));
    });
}

// ===== KELOLA SCRIPT =====
function showManageScripts() {
    const modal = document.createElement('div'); modal.className = 'modal-overlay active';
    modal.innerHTML = `<div class="modal-content wide"><div class="modal-header"><h3 class="modal-title"><i class="fas fa-code"></i> Kelola Script</h3><button class="modal-close" onclick="this.closest('.modal-overlay').remove()"><i class="fas fa-xmark"></i></button></div><div id="manage-scripts-body"><div class="loading-inline"><i class="fas fa-circle-notch fa-spin"></i> Memuat...</div></div></div>`;
    document.body.appendChild(modal);
    db.ref('scripts').once('value').then(s => {
        const body = modal.querySelector('#manage-scripts-body');
        if (!s.exists()) { body.innerHTML = emptyState('fa-code', 'Belum ada script', ''); return; }
        let html = '';
        s.forEach(c => {
            const sc = c.val();
            const status = sc.takedown ? '<span class="status-badge status-takedown">Takedown</span>' : '<span class="status-badge status-verified">Aktif</span>';
            html += `<div class="admin-row"><div class="admin-row-info"><div class="admin-row-title">${escapeHtml(sc.title)} ${status}</div><div class="admin-row-sub">${escapeHtml(sc.username)} · ${sc.likes || 0} likes</div></div><div class="admin-row-actions">
                <button class="btn-small ${sc.takedown ? 'btn-ghost' : 'btn-danger'}" onclick="toggleTakedownScript('${c.key}', ${!!sc.takedown})">${sc.takedown ? 'Untakedown' : 'Takedown'}</button>
                <button class="btn-small btn-danger" onclick="deleteScriptDev('${c.key}')">Hapus</button>
            </div></div>`;
        });
        body.innerHTML = html;
    });
}
function toggleTakedownScript(id, currentlyTakedown) {
    showConfirm(currentlyTakedown ? 'Batalkan takedown script ini?' : 'Takedown script ini?', { title: currentlyTakedown ? 'Untakedown' : 'Takedown', okLabel: currentlyTakedown ? 'Ya, batalkan' : 'Ya, takedown', danger: !currentlyTakedown }).then(ok => {
        if (!ok) return;
        db.ref('scripts/' + id + '/takedown').set(!currentlyTakedown).then(() => {
            if (!currentlyTakedown) {
                return showPrompt('Alasan takedown', 'Jelaskan alasan script ini ditakedown...').then(reason => {
                    if (reason) return db.ref('scripts/' + id + '/takedownReason').set(reason);
                });
            } else {
                return db.ref('scripts/' + id + '/takedownReason').remove();
            }
        }).then(() => {
            showToast(currentlyTakedown ? 'Script diuntakedown' : 'Script ditakedown');
            document.querySelector('.modal-overlay.active')?.remove();
            showManageScripts();
            loadAllScripts();
        }).catch(() => showToast('Gagal', 'error'));
    });
}
function deleteScriptDev(id) {
    showConfirm('Script akan dihapus permanen.', { title: 'Hapus script?', okLabel: 'Hapus', danger: true }).then(ok => {
        if (!ok) return;
        db.ref('scripts/' + id).remove().then(() => {
            showToast('Script dihapus');
            document.querySelector('.modal-overlay.active')?.remove();
            showManageScripts();
            loadAllScripts();
        }).catch(() => showToast('Gagal menghapus', 'error'));
    });
}

// ===== KELOLA USER =====
function showManageUsers() {
    const modal = document.createElement('div'); modal.className = 'modal-overlay active';
    modal.innerHTML = `<div class="modal-content wide"><div class="modal-header"><h3 class="modal-title"><i class="fas fa-users"></i> Kelola User</h3><button class="modal-close" onclick="this.closest('.modal-overlay').remove()"><i class="fas fa-xmark"></i></button></div><div id="manage-users-body"><div class="loading-inline"><i class="fas fa-circle-notch fa-spin"></i> Memuat...</div></div></div>`;
    document.body.appendChild(modal);
    db.ref('users').once('value').then(s => {
        const body = modal.querySelector('#manage-users-body');
        if (!s.exists()) { body.innerHTML = emptyState('fa-users', 'Belum ada user', ''); return; }
        let html = '';
        s.forEach(c => {
            const u = c.val();
            const tags = (u.tags || []).map(t => {
                let cls = 'executor-badge';
                let style = 'font-size:9px;padding:2px 8px;';
                if (t === 'Verified') { cls += ' verified-badge'; style += 'background:var(--blue-soft);color:var(--blue);'; }
                else if (t === 'StarsHub') { cls += ' status-badge status-verified'; style += 'background:var(--amber-soft);color:var(--amber);'; }
                else if (t === 'Staff') { style += 'background:var(--green-soft);color:var(--green);'; }
                else if (t === 'Contributor') { style += 'background:var(--accent-soft);color:var(--accent-light);'; }
                return `<span class="${cls}" style="${style}">${escapeHtml(t)}</span>`;
            }).join(' ');
            html += `<div class="admin-row"><div class="admin-row-info"><div class="admin-row-title">${escapeHtml(u.username)} ${u.banned ? '<span style="color:var(--red);">(banned)</span>' : ''}</div><div class="admin-row-sub">${u.role} · ${u.likesReceived || 0} likes · ${tags}</div></div><div class="admin-row-actions">
                <select class="role-select" onchange="setUserRoleDev('${c.key}', this.value)">
                    ${['member','vip','admin','dev'].map(r => `<option value="${r}" ${u.role === r ? 'selected' : ''}>${r}</option>`).join('')}
                </select>
                <button class="btn-small ${u.banned ? 'btn-ghost' : 'btn-danger'}" onclick="toggleBanUserDev('${c.key}', ${!!u.banned})">${u.banned ? 'Unban' : 'Ban'}</button>
                <button class="btn-small btn-ghost" onclick="manageUserTags('${c.key}')"><i class="fas fa-tag"></i></button>
            </div></div>`;
        });
        body.innerHTML = html;
    });
}
function setUserRoleDev(username, role) { 
    db.ref('users/' + username + '/role').set(role).then(() => showToast('Role diperbarui')).catch(() => showToast('Gagal', 'error')); 
}
function toggleBanUserDev(username, currentlyBanned) {
    const action = currentlyBanned ? 'Unban' : 'Ban';
    showConfirm(currentlyBanned ? 'User ini akan bisa login kembali.' : 'User ini tidak akan bisa login lagi.', { title: action + ' user?', okLabel: action, danger: !currentlyBanned }).then(ok => {
        if (!ok) return;
        db.ref('users/' + username + '/banned').set(!currentlyBanned).then(() => {
            showToast(currentlyBanned ? 'User di-unban' : 'User di-ban');
            document.querySelector('.modal-overlay.active')?.remove();
            showManageUsers();
        }).catch(() => showToast('Gagal', 'error'));
    });
}
function manageUserTags(username) {
    const modal = document.createElement('div'); modal.className = 'modal-overlay active';
    modal.innerHTML = `<div class="modal-content"><div class="modal-header"><h3 class="modal-title"><i class="fas fa-tag"></i> Kelola Tag - ${escapeHtml(username)}</h3><button class="modal-close" onclick="this.closest('.modal-overlay').remove()"><i class="fas fa-xmark"></i></button></div>
        <div style="margin-bottom:12px;">
            <label style="font-size:12px;color:var(--text-muted);font-weight:600;">Template Official</label>
            <div class="tag-templates">
                <span class="tag-template verified" onclick="applyTagTemplate('${username}', 'Verified')"><i class="fas fa-circle-check"></i> Verified</span>
                <span class="tag-template starshub" onclick="applyTagTemplate('${username}', 'StarsHub')"><i class="fas fa-star"></i> StarsHub</span>
                <span class="tag-template staff" onclick="applyTagTemplate('${username}', 'Staff')"><i class="fas fa-shield-halved"></i> Staff</span>
                <span class="tag-template contributor" onclick="applyTagTemplate('${username}', 'Contributor')"><i class="fas fa-handshake"></i> Contributor</span>
            </div>
        </div>
        <div class="form-group"><label>Tambah Tag Custom</label><input type="text" id="add-tag-input" placeholder="Contoh: Legend, Creator"></div>
        <button class="btn-primary" style="margin-top:8px;" onclick="addTagToUser('${username}')"><i class="fas fa-plus"></i> Tambah Tag</button>
        <div id="user-tags-list" style="margin-top:16px;"></div>
    </div>`;
    document.body.appendChild(modal);
    refreshUserTags(username);
}
function applyTagTemplate(username, tag) {
    db.ref('users/' + username + '/tags').transaction(arr => {
        arr = arr || [];
        if (arr.includes(tag)) return arr;
        arr.push(tag);
        return arr;
    }).then(() => {
        showToast('Tag ' + tag + ' ditambahkan');
        refreshUserTags(username);
    }).catch(() => showToast('Gagal', 'error'));
}
function refreshUserTags(username) {
    db.ref('users/' + username + '/tags').once('value').then(s => {
        const el = document.getElementById('user-tags-list');
        const tags = s.val() || [];
        if (!tags.length) { el.innerHTML = '<p style="color:var(--text-muted);font-size:13px;">Belum ada tag.</p>'; return; }
        el.innerHTML = tags.map(t => {
            let cls = 'executor-badge';
            let style = '';
            if (t === 'Verified') { cls += ' verified-badge'; style = 'background:var(--blue-soft);color:var(--blue);'; }
            else if (t === 'StarsHub') { cls += ' status-badge status-verified'; style = 'background:var(--amber-soft);color:var(--amber);'; }
            else if (t === 'Staff') { style = 'background:var(--green-soft);color:var(--green);'; }
            else if (t === 'Contributor') { style = 'background:var(--accent-soft);color:var(--accent-light);'; }
            return `<div class="admin-row"><span class="${cls}" style="${style}">${escapeHtml(t)}</span><button class="btn-small btn-danger" onclick="removeTagFromUser('${username}','${escapeHtml(t)}')">Hapus</button></div>`;
        }).join('');
    });
}
function addTagToUser(username) {
    const input = document.getElementById('add-tag-input');
    const tag = input.value.trim();
    if (!tag) { showToast('Masukkan tag', 'error'); return; }
    db.ref('users/' + username + '/tags').transaction(arr => {
        arr = arr || [];
        if (arr.includes(tag)) return arr;
        arr.push(tag);
        return arr;
    }).then(() => {
        showToast('Tag ditambahkan');
        input.value = '';
        refreshUserTags(username);
    }).catch(() => showToast('Gagal', 'error'));
}
function removeTagFromUser(username, tag) {
    db.ref('users/' + username + '/tags').transaction(arr => {
        arr = arr || [];
        return arr.filter(t => t !== tag);
    }).then(() => {
        showToast('Tag dihapus');
        refreshUserTags(username);
    }).catch(() => showToast('Gagal', 'error'));
}

// ===== KELOLA DATABASE =====
function showManageDatabase() {
    const modal = document.createElement('div'); modal.className = 'modal-overlay active';
    modal.innerHTML = `<div class="modal-content"><div class="modal-header"><h3 class="modal-title"><i class="fas fa-database"></i> Kelola Database</h3><button class="modal-close" onclick="this.closest('.modal-overlay').remove()"><i class="fas fa-xmark"></i></button></div>
        <div class="dev-panel-menu">
            <div class="dev-panel-item" onclick="exportDatabase()"><i class="fas fa-download"></i> Backup Database</div>
            <div class="dev-panel-item" onclick="loadDatabase()"><i class="fas fa-upload"></i> Load Database</div>
            <div class="dev-panel-item" onclick="resetDatabase()" style="color:var(--red);"><i class="fas fa-trash"></i> Reset Database</div>
        </div>
    </div>`;
    document.body.appendChild(modal);
}
function exportDatabase() {
    showToast('Menyiapkan backup...', 'info');
    db.ref().once('value').then(s => {
        const data = s.val() || {};
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `abyyhub-backup-${Date.now()}.json`;
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
        showToast('Backup database berhasil diunduh');
    }).catch(() => showToast('Gagal membuat backup', 'error'));
}
function loadDatabase() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(ev) {
            try {
                const data = JSON.parse(ev.target.result);
                showConfirm('Data yang ada akan diganti dengan file backup. Lanjutkan?', { title: 'Load Database', okLabel: 'Ya, load' }).then(ok => {
                    if (!ok) return;
                    db.ref().set(data).then(() => {
                        showToast('Database berhasil di-load');
                        document.querySelector('.modal-overlay.active')?.remove();
                    }).catch(() => showToast('Gagal load database', 'error'));
                });
            } catch (err) {
                showToast('File tidak valid', 'error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}
function resetDatabase() {
    showConfirm('SEMUA DATA akan dihapus permanen! Yakin?', { title: '⚠️ Reset Database', okLabel: 'Ya, reset semua!', danger: true }).then(ok => {
        if (!ok) return;
        showConfirm('KONFIRMASI AKHIR: Semua data akan hilang!', { title: '⚠️ KONFIRMASI AKHIR', okLabel: 'RESET SEKARANG', danger: true }).then(ok2 => {
            if (!ok2) return;
            db.ref().set({}).then(() => {
                showToast('Database telah di-reset');
                document.querySelector('.modal-overlay.active')?.remove();
                setTimeout(() => location.reload(), 1000);
            }).catch(() => showToast('Gagal reset', 'error'));
        });
    });
}

// ===== KELOLA SERVER =====
function showManageServer() {
    Promise.all([
        db.ref('config/registerEnabled').once('value'),
        db.ref('config/uploadEnabled').once('value')
    ]).then(([reg, up]) => {
        const registerOn = reg.val() !== false;
        const uploadOn = up.val() !== false;
        const modal = document.createElement('div'); modal.className = 'modal-overlay active';
        modal.innerHTML = `<div class="modal-content"><div class="modal-header"><h3 class="modal-title"><i class="fas fa-server"></i> Kelola Server</h3><button class="modal-close" onclick="this.closest('.modal-overlay').remove()"><i class="fas fa-xmark"></i></button></div>
            <div class="admin-row"><div class="admin-row-info"><div class="admin-row-title">Registrasi User</div><div class="admin-row-sub">${registerOn ? 'Aktif' : 'Nonaktif'}</div></div><div class="toggle-switch ${registerOn ? 'on' : ''}" onclick="toggleServerSetting('registerEnabled', this)"><div class="toggle-switch-knob"></div></div></div>
            <div class="admin-row"><div class="admin-row-info"><div class="admin-row-title">Upload Script</div><div class="admin-row-sub">${uploadOn ? 'Aktif' : 'Nonaktif'}</div></div><div class="toggle-switch ${uploadOn ? 'on' : ''}" onclick="toggleServerSetting('uploadEnabled', this)"><div class="toggle-switch-knob"></div></div></div>
        </div>`;
        document.body.appendChild(modal);
    });
}
function toggleServerSetting(setting, el) {
    const willBeOn = !el.classList.contains('on');
    db.ref('config/' + setting).set(willBeOn).then(() => {
        el.classList.toggle('on');
        showToast(willBeOn ? setting + ' diaktifkan' : setting + ' dinonaktifkan', willBeOn ? 'success' : 'info');
    }).catch(() => showToast('Gagal mengubah', 'error'));
}

// ===== KELOLA NEWS =====
function showManageNews() {
    const modal = document.createElement('div'); modal.className = 'modal-overlay active';
    modal.innerHTML = `<div class="modal-content wide"><div class="modal-header"><h3 class="modal-title"><i class="fas fa-newspaper"></i> Kelola News</h3><button class="modal-close" onclick="this.closest('.modal-overlay').remove()"><i class="fas fa-xmark"></i></button></div>
        <button class="btn-primary" style="margin-bottom:14px;" onclick="showAddNewsForm()"><i class="fas fa-plus"></i> Tambah News</button>
        <div id="manage-news-body"><div class="loading-inline"><i class="fas fa-circle-notch fa-spin"></i> Memuat...</div></div></div>`;
    document.body.appendChild(modal);
    refreshNewsList();
}
function refreshNewsList() {
    db.ref('news').orderByChild('timestamp').once('value').then(s => {
        const body = document.getElementById('manage-news-body');
        if (!body) return;
        if (!s.exists()) { body.innerHTML = emptyState('fa-newspaper', 'Belum ada news', 'Tambahkan news pertama.'); return; }
        let html = '';
        s.forEach(c => { const n = c.val(); html += `<div class="admin-row"><div class="admin-row-info"><div class="admin-row-title">${escapeHtml(n.title)}</div><div class="admin-row-sub">${new Date(n.timestamp || 0).toLocaleDateString('id-ID')}</div></div><div class="admin-row-actions"><button class="btn-small btn-danger" onclick="deleteNews('${c.key}')">Hapus</button></div></div>`; });
        body.innerHTML = html;
    });
}
function showAddNewsForm() {
    const modal = document.createElement('div'); modal.className = 'modal-overlay active';
    modal.innerHTML = `<div class="modal-content"><div class="modal-header"><h3 class="modal-title"><i class="fas fa-plus"></i> Tambah News</h3><button class="modal-close" onclick="this.closest('.modal-overlay').remove()"><i class="fas fa-xmark"></i></button></div>
        <div class="form-group"><label>Judul</label><input type="text" id="news-title" placeholder="Judul berita"></div>
        <div class="form-group" style="margin-top:12px;"><label>Isi</label><textarea id="news-content" placeholder="Isi berita..." style="min-height:100px;"></textarea></div>
        <button class="btn-primary" style="margin-top:12px;" onclick="addNews()"><i class="fas fa-save"></i> Simpan News</button>
    </div>`;
    document.body.appendChild(modal);
}
function addNews() {
    const title = document.getElementById('news-title').value.trim();
    const content = document.getElementById('news-content').value.trim();
    if (!title || !content) { showToast('Judul dan isi wajib diisi', 'error'); return; }
    db.ref('news').push({ title, content, timestamp: Date.now() }).then(() => {
        showToast('News berhasil ditambahkan');
        document.querySelector('.modal-overlay.active')?.remove();
        refreshNewsList();
        loadNews();
    }).catch(() => showToast('Gagal menambah news', 'error'));
}
function deleteNews(id) {
    showConfirm('Hapus news ini?', { title: 'Hapus News', okLabel: 'Hapus', danger: true }).then(ok => {
        if (!ok) return;
        db.ref('news/' + id).remove().then(() => {
            showToast('News dihapus');
            refreshNewsList();
            loadNews();
        }).catch(() => showToast('Gagal menghapus', 'error'));
    });
}

// ===== REPORTS =====
function showReportList() {
    const modal = document.createElement('div'); modal.className = 'modal-overlay active';
    modal.innerHTML = `<div class="modal-content"><div class="modal-header"><h3 class="modal-title"><i class="fas fa-flag"></i> Kelola Reports</h3><button class="modal-close" onclick="this.closest('.modal-overlay').remove()"><i class="fas fa-xmark"></i></button></div><div id="report-list-body"><div class="loading-inline"><i class="fas fa-circle-notch fa-spin"></i> Memuat...</div></div></div>`;
    document.body.appendChild(modal);
    db.ref('reports').once('value').then(s => {
        const body = modal.querySelector('#report-list-body');
        if (!s.exists()) { body.innerHTML = emptyState('fa-circle-check', 'Tidak ada laporan', 'Semua bersih untuk saat ini.'); return; }
        let html = '';
        s.forEach(c => { const r = c.val(); html += `<div class="admin-row" style="cursor:default;align-items:flex-start;"><div class="admin-row-info"><div class="admin-row-title">${escapeHtml(r.reportedBy)}</div><div class="admin-row-sub" style="white-space:normal;">${escapeHtml(r.reason)}</div></div><div class="admin-row-actions"><button class="btn-small btn-danger" onclick="takedownScriptDev('${r.scriptId}','${c.key}')">Takedown</button><button class="btn-small btn-ghost" style="width:auto;" onclick="dismissReportDev('${c.key}')">Abaikan</button></div></div>`; });
        body.innerHTML = html;
    });
}
function takedownScriptDev(scriptId, reportKey) {
    showPrompt('Alasan takedown', 'Jelaskan alasan script ini ditakedown...').then(reason => {
        if (!reason) return;
        db.ref('scripts/' + scriptId).update({ takedown: true, takedownReason: reason }).then(() => {
            if (reportKey) db.ref('reports/' + reportKey).remove();
            showToast('Script berhasil ditakedown');
            document.querySelector('.modal-overlay.active')?.remove();
            loadAllScripts();
            showReportList();
        }).catch(() => showToast('Gagal', 'error'));
    });
}
function dismissReportDev(reportKey) { 
    db.ref('reports/' + reportKey).remove().then(() => { 
        showToast('Laporan diabaikan', 'info'); 
        document.querySelector('.modal-overlay.active')?.remove();
        showReportList();
    }); 
}

// ===== EXECUTOR MANAGEMENT =====
function showExecutorManagement() {
    const modal = document.createElement('div'); modal.className = 'modal-overlay active'; modal.id = 'executor-mgmt-modal';
    modal.innerHTML = `<div class="modal-content wide"><div class="modal-header"><h3 class="modal-title"><i class="fas fa-download"></i> Kelola Executors</h3><button class="modal-close" onclick="document.getElementById('executor-mgmt-modal').remove()"><i class="fas fa-xmark"></i></button></div>
        <button class="btn-primary" style="margin-bottom:14px;" onclick="showExecutorForm()"><i class="fas fa-plus"></i> Tambah Executor</button>
        <div id="executor-mgmt-body"><div class="loading-inline"><i class="fas fa-circle-notch fa-spin"></i> Memuat...</div></div></div>`;
    document.body.appendChild(modal);
    refreshExecutorMgmtList();
}
function refreshExecutorMgmtList() {
    db.ref('executors').once('value', s => {
        const body = document.getElementById('executor-mgmt-body');
        if (!body) return;
        if (!s.exists()) { body.innerHTML = emptyState('fa-download', 'Belum ada executor', 'Tambahkan executor pertama.'); return; }
        let html = '';
        s.forEach(c => { const e = c.val(); html += `<div class="admin-row"><div class="admin-row-info"><div class="admin-row-title">${escapeHtml(e.name)}</div><div class="admin-row-sub">${escapeHtml(e.platform || 'PC')} · v${escapeHtml(e.version || '-')}</div></div><div class="admin-row-actions"><button class="btn-small btn-ghost" style="width:auto;" onclick='showExecutorForm(${JSON.stringify(c.key)})'>Edit</button><button class="btn-small btn-danger" onclick="deleteExecutorDev('${c.key}')">Hapus</button></div></div>`; });
        body.innerHTML = html;
    }, err => console.error('Error loading executors:', err));
}
function showExecutorForm(id) {
    const editing = !!id;
    const done = data => {
        const m = document.getElementById('generic-modal');
        if (m) m.classList.remove('active');
        const ref = editing ? db.ref('executors/' + id) : db.ref('executors').push();
        (editing ? ref.update(data) : ref.set(data)).then(() => { 
            showToast(editing ? 'Executor diperbarui' : 'Executor ditambahkan'); 
            setTimeout(() => {
                refreshExecutorMgmtList();
                loadExecutors();
            }, 300);
        }).catch(err => { 
            console.error('Save error:', err);
            showToast('Gagal menyimpan executor', 'error'); 
        });
    };
    const render = (existing) => {
        const m = document.getElementById('generic-modal');
        m.innerHTML = `<div class="modal-content"><div class="modal-header"><h3 class="modal-title"><i class="fas fa-plus"></i> ${editing ? 'Edit' : 'Tambah'} Executor</h3><button class="modal-close" id="exform-x"><i class="fas fa-xmark"></i></button></div>
            <div class="form-group"><label>Nama</label><input type="text" id="exf-name" value="${escapeHtml(existing.name || '')}"></div>
            <div class="form-group" style="margin-top:12px;"><label>Deskripsi</label><textarea id="exf-desc">${escapeHtml(existing.desc || '')}</textarea></div>
            <div class="form-group" style="margin-top:12px;"><label>Platform</label><input type="text" id="exf-platform" value="${escapeHtml(existing.platform || 'PC')}"></div>
            <div class="form-group" style="margin-top:12px;"><label>Versi</label><input type="text" id="exf-version" value="${escapeHtml(existing.version || '')}"></div>
            <div class="form-group" style="margin-top:12px;"><label>Link download</label><input type="text" id="exf-url" value="${escapeHtml(existing.downloadUrl || '')}"></div>
            <div class="modal-actions"><button class="btn-ghost" id="exform-cancel">Batal</button><button class="btn-primary" id="exform-save">Simpan</button></div>
        </div>`;
        m.classList.add('active');
        document.getElementById('exform-x').onclick = () => m.classList.remove('active');
        document.getElementById('exform-cancel').onclick = () => m.classList.remove('active');
        document.getElementById('exform-save').onclick = () => {
            const name = document.getElementById('exf-name').value.trim();
            if (!name) { showToast('Nama executor wajib diisi', 'error'); return; }
            done({ name, desc: document.getElementById('exf-desc').value.trim(), platform: document.getElementById('exf-platform').value.trim() || 'PC', version: document.getElementById('exf-version').value.trim() || 'Latest', downloadUrl: document.getElementById('exf-url').value.trim(), downloads: existing.downloads || 0, imageUrl: existing.imageUrl || '' });
        };
    };
    if (editing) db.ref('executors/' + id).once('value').then(s => render(s.val() || {})).catch(err => { console.error('Edit error:', err); showToast('Gagal memuat executor', 'error'); }); 
    else render({});
}
function deleteExecutorDev(id) {
    showConfirm('Executor ini akan dihapus permanen.', { title: 'Hapus executor?', okLabel: 'Hapus', danger: true }).then(ok => {
        if (!ok) return;
        db.ref('executors/' + id).remove().then(() => { showToast('Executor dihapus'); refreshExecutorMgmtList(); loadExecutors(); }).catch(() => showToast('Gagal menghapus', 'error'));
    });
}

// ===== MAINTENANCE =====
function showMaintenanceToggle() {
    db.ref('config/maintenance').once('value').then(s => {
        const isOn = !!s.val();
        const modal = document.createElement('div'); modal.className = 'modal-overlay active';
        modal.innerHTML = `<div class="modal-content"><div class="modal-header"><h3 class="modal-title"><i class="fas fa-screwdriver-wrench"></i> Maintenance Mode</h3><button class="modal-close" onclick="this.closest('.modal-overlay').remove()"><i class="fas fa-xmark"></i></button></div>
            <p class="modal-body-text">Saat aktif, hanya akun Dev yang bisa mengakses DewwHub. User lain akan melihat halaman maintenance.</p>
            <div class="admin-row" style="cursor:default;margin-top:8px;"><div class="admin-row-info"><div class="admin-row-title">Status maintenance</div><div class="admin-row-sub">${isOn ? 'Sedang aktif' : 'Tidak aktif'}</div></div><div class="toggle-switch ${isOn ? 'on' : ''}" id="maintenance-toggle-switch" onclick="toggleMaintenanceDev(this)"><div class="toggle-switch-knob"></div></div></div>
        </div>`;
        document.body.appendChild(modal);
    });
}
function toggleMaintenanceDev(el) {
    const willBeOn = !el.classList.contains('on');
    db.ref('config/maintenance').set(willBeOn).then(() => { el.classList.toggle('on'); showToast(willBeOn ? 'Maintenance mode diaktifkan' : 'Maintenance mode dimatikan', willBeOn ? 'info' : 'success'); }).catch(() => showToast('Gagal mengubah status', 'error'));
}

// ===================== INIT =====================
window.onload = function () {
    showLoadingScreen();
    const saved = localStorage.getItem('abyyhub_user');
    const autoHideTimeout = setTimeout(() => {
        hideLoadingScreen();
        if (!currentUser) {
            document.getElementById('auth-page').style.display = 'flex';
            document.getElementById('app').style.display = 'none';
        }
    }, 5000);
    
    if (saved) {
        try {
            const u = JSON.parse(saved);
            db.ref('users/' + u.username).once('value').then(s => {
                if (s.exists()) {
                    const d = s.val();
                    if (!d.banned && d.password === u.password) { 
                        currentUser = d; 
                        clearTimeout(autoHideTimeout);
                        setTimeout(() => { loadApp(); hideLoadingScreen(); }, 800);
                        return; 
                    }
                }
                localStorage.removeItem('abyyhub_user');
                clearTimeout(autoHideTimeout);
                hideLoadingScreen();
                document.getElementById('auth-page').style.display = 'flex';
                document.getElementById('app').style.display = 'none';
            }).catch(err => {
                console.error('DB Error:', err);
                clearTimeout(autoHideTimeout);
                localStorage.removeItem('abyyhub_user');
                hideLoadingScreen();
                document.getElementById('auth-page').style.display = 'flex';
                document.getElementById('app').style.display = 'none';
                showAuthError('Tidak bisa terhubung ke server. Coba lagi.');
            });
        } catch (e) { 
            clearTimeout(autoHideTimeout);
            localStorage.removeItem('abyyhub_user');
            hideLoadingScreen();
            document.getElementById('auth-page').style.display = 'flex';
            document.getElementById('app').style.display = 'none';
        }
    } else {
        clearTimeout(autoHideTimeout);
        hideLoadingScreen();
        document.getElementById('auth-page').style.display = 'flex';
        document.getElementById('app').style.display = 'none';
    }
};

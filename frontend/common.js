function showToast(message, duration = 1800) {
  if (!message) return;
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'fixed bottom-4 left-1/2 -translate-x-1/2 bg-black/80 text-white text-sm px-4 py-2 rounded-full shadow-xl opacity-0 pointer-events-none z-50 transition-all duration-300';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.remove('opacity-0');
  toast.classList.add('opacity-100');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    toast.classList.remove('opacity-100');
    toast.classList.add('opacity-0');
  }, duration);
}

function isMobile() {
  return window.innerWidth < 768;
}

function safeNavigate(url) {
  window.location.href = url;
}

function formatDateYMD(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function nearestTaskGroup(task) {
  if (!task.dueAt) return '以后';
  const now = new Date();
  const due = new Date(task.dueAt);
  const diff = due.setHours(0,0,0,0) - new Date(now.setHours(0,0,0,0));
  const day = 24*60*60*1000;
  if (diff <= 0) return '今日待办';
  if (diff <= day) return '明日待办';
  if (diff <= 7*day) return '未来7天';
  return '以后';
}

// ===== 统计计算函数 (BUG-20, BUG-23) =====

function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function getWeekEnd(date = new Date()) {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return end;
}

function isDateInRange(date, start, end) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const s = new Date(start);
  s.setHours(0, 0, 0, 0);
  const e = new Date(end);
  e.setHours(23, 59, 59, 999);
  return d >= s && d <= e;
}

function isSameDay(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

function getWeeklyStats() {
  if (!AppState || !AppState.tasks) return null;
  
  const weekStart = getWeekStart();
  const weekEnd = getWeekEnd();
  
  // 计算本周完成的任务数
  const completedTasks = (AppState.tasks || []).filter(t => 
    t.status === 'completed'
  ).length;
  
  // 计算本周的番茄记录
  const weekSessions = (AppState.pomodoroSessions || []).filter(session => {
    if (!session.startedAt) return false;
    const sessionDate = new Date(session.startedAt);
    return isDateInRange(sessionDate, weekStart, weekEnd);
  });
  
  const totalSessions = weekSessions.length;
  const totalMinutes = weekSessions.reduce((sum, s) => 
    sum + (s.actualMinutes || (s.plannedMinutes || 25)), 0
  );
  
  // 计算最长连续专注番茄数
  let maxContinuousPomodoros = 0;
  let currentStreak = 0;
  let lastSessionTime = null;
  
  // 按开始时间排序
  const sortedSessions = [...weekSessions].sort((a, b) => 
    new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
  );
  
  for (const session of sortedSessions) {
    if (session.mode === 'focus' && session.completed) {
      const sessionTime = new Date(session.startedAt).getTime();
      
      if (lastSessionTime === null) {
        currentStreak = 1;
      } else {
        // 如果两个番茄之间间隔小于30分钟，认为是连续的
        const timeDiff = (sessionTime - lastSessionTime) / (1000 * 60); // 分钟
        if (timeDiff <= 30) {
          currentStreak++;
        } else {
          maxContinuousPomodoros = Math.max(maxContinuousPomodoros, currentStreak);
          currentStreak = 1;
        }
      }
      
      lastSessionTime = sessionTime;
      maxContinuousPomodoros = Math.max(maxContinuousPomodoros, currentStreak);
    }
  }
  
  // 计算效率评分（基于完成任务数和番茄数）
  const taskScore = Math.min(completedTasks * 3, 50);
  const pomodoroScore = Math.min(totalSessions * 2, 30);
  const continuityBonus = Math.min(maxContinuousPomodoros * 5, 20);
  const effectivenessScore = Math.floor(taskScore + pomodoroScore + continuityBonus);
  
  return {
    completedTasks: completedTasks,
    totalFocusMinutes: totalMinutes,
    totalPomodoros: totalSessions,
    maxContinuousPomodoros: maxContinuousPomodoros,
    effectivenessScore: Math.min(effectivenessScore, 100)
  };
}

function resolveApiBase() {
  var explicitBase = window.__API_BASE__;
  if (explicitBase) {
    return String(explicitBase).replace(/\/$/, '');
  }

  try {
    var storedBase = localStorage.getItem('apiBase');
    if (storedBase) {
      return String(storedBase).replace(/\/$/, '');
    }
  } catch (e) { /* ignore localStorage read errors */ }

  var locationInfo = window.location || {};
  var hostname = (locationInfo.hostname || '').toLowerCase();
  var protocol = locationInfo.protocol || 'http:';
  var origin = locationInfo.origin || '';

  // Local dev defaults to backend 8080 unless explicitly overridden.
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return protocol + '//' + hostname + ':8080';
  }

  if (origin && origin !== 'null' && !/^file:/i.test(origin)) {
    return origin.replace(/\/$/, '');
  }

  return 'http://localhost:8080';
}

// 全局 API 请求封装：自动携带 Authorization header（从 localStorage 读取 token）
function apiRequest(path, options) {
  options = options || {};
  var base = resolveApiBase();
  var url = path.startsWith('http') ? path : (base + path);
  var headers = options.headers || {};
  headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  var token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }
  options.headers = headers;
  return fetch(url, options).then(function (res) {
    return res.json().catch(function () { return { status: res.status }; }).then(function (body) {
      return { status: res.status, body: body };
    });
  });
}

// 统一的身份检查：在页面加载时调用，若无 token 或 token 无效则清理并跳转登录页
function checkAuthOnLoad(opts) {
  opts = opts || {};
  var redirect = typeof opts.redirect === 'undefined' ? true : !!opts.redirect;
  var silent = !!opts.silent;

  var token = null;
  try { token = localStorage.getItem('token'); } catch (e) { token = null; }
  if (!token) {
    if (!silent) console.warn('auth: no token found');
    // clear any app state and optionally redirect
    try { localStorage.removeItem('token'); } catch (e) {}
    if (window.AppState && typeof window.AppState.logout === 'function') window.AppState.logout();
    if (redirect) safeNavigate('登录页面.html');
    return Promise.reject(new Error('no-token'));
  }

  // If this is a local dev/demo token or dev flag is set, skip remote validation
  try {
    var devFlag = localStorage.getItem('devSkipAuth');
    if ((token && String(token).startsWith('dev-')) || devFlag === '1') {
      if (!silent) console.info('auth: dev token detected, skipping remote validation');
      return Promise.resolve(window.AppState && window.AppState.user ? window.AppState.user : {});
    }
  } catch (e) { /* ignore localStorage errors */ }

  // validate token by calling /api/me (non-blocking but will redirect on 401)
  return apiRequest('/api/me', { method: 'GET' }).then(function (resp) {
    if (resp && resp.status === 200 && resp.body && resp.body.code === 200) {
      // token valid
      if (!silent) console.info('auth: token valid');
      return Promise.resolve(resp.body.data);
    }
    // invalid token
    if (!silent) console.warn('auth: token invalid or expired', resp);
    try { localStorage.removeItem('token'); } catch (e) {}
    if (window.AppState && typeof window.AppState.logout === 'function') window.AppState.logout();
    if (redirect) safeNavigate('登录页面.html');
    return Promise.reject(new Error('invalid-token'));
  }).catch(function (err) {
    // network or parse error: assume token might be invalid
    if (!silent) console.warn('auth: validation failed', err);
    // If status is 401 returned as body.status, handle similarly
    try { localStorage.removeItem('token'); } catch (e) {}
    if (window.AppState && typeof window.AppState.logout === 'function') window.AppState.logout();
    if (redirect) safeNavigate('登录页面.html');
    return Promise.reject(err || new Error('auth-check-failed'));
  });
}

function getCheckinStats() {
  if (!AppState || !AppState.checkins) {
    return {
      currentStreak: 0,
      maxStreak: 0,
      monthCheckins: 0,
      weekCheckins: 0,
      typeDistribution: { '学习': 0, '运动': 0, '早起': 0, '阅读': 0 }
    };
  }
  
  const checkins = AppState.checkins || [];
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const weekStart = getWeekStart();
  const weekEnd = getWeekEnd();
  
  // 计算当前连续打卡天数
  let currentStreak = 0;
  let checkDate = new Date(today);
  checkDate.setHours(0, 0, 0, 0);
  
  // 倒序遍历，计算连续天数
  while (true) {
    const found = checkins.some(c => isSameDay(new Date(c.date), checkDate));
    if (found) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }
  
  // 计算历史最长打卡
  let maxStreak = 0;
  let tempStreak = 0;
  const sortedCheckins = [...checkins].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  let prevDate = null;
  for (const checkin of sortedCheckins) {
    const curDate = new Date(checkin.date);
    curDate.setHours(0, 0, 0, 0);
    
    if (!prevDate) {
      tempStreak = 1;
    } else {
      const prevD = new Date(prevDate);
      prevD.setDate(prevD.getDate() + 1);
      if (isSameDay(curDate, prevD)) {
        tempStreak++;
      } else {
        maxStreak = Math.max(maxStreak, tempStreak);
        tempStreak = 1;
      }
    }
    prevDate = curDate;
  }
  maxStreak = Math.max(maxStreak, tempStreak);
  
  // 统计本月、本周打卡数
  const monthCheckins = checkins.filter(c => 
    isDateInRange(new Date(c.date), monthStart, monthEnd)
  ).length;
  
  const weekCheckins = checkins.filter(c => 
    isDateInRange(new Date(c.date), weekStart, weekEnd)
  ).length;
  
  // 统计打卡类型分布
  const typeDistribution = { '学习': 0, '运动': 0, '早起': 0, '阅读': 0 };
  checkins.forEach(c => {
    if (c.type && typeDistribution.hasOwnProperty(c.type)) {
      typeDistribution[c.type]++;
    }
  });
  
  return {
    currentStreak: currentStreak,
    maxStreak: maxStreak,
    monthCheckins: monthCheckins,
    weekCheckins: weekCheckins,
    typeDistribution: typeDistribution,
    totalCheckins: checkins.length
  };
}

function ensureUnifiedBottomTabStyle() {
  if (document.getElementById('unified-bottom-tab-style')) return;
  var style = document.createElement('style');
  style.id = 'unified-bottom-tab-style';
  style.textContent = `
  :root {
    --unified-tab-space: 114px;
  }
  body.has-unified-bottom-tab {
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
  body.has-unified-bottom-tab .unified-bottom-content-offset {
    padding-bottom: calc(var(--unified-tab-space) + 10px + env(safe-area-inset-bottom, 0px)) !important;
    scroll-padding-bottom: calc(var(--unified-tab-space) + 10px + env(safe-area-inset-bottom, 0px)) !important;
  }
  html.unified-tab-preparing footer.glass-tab {
    opacity: 0 !important;
    pointer-events: none !important;
    transform: translateY(8px);
  }
  footer.unified-bottom-tab-source {
    display: none !important;
  }
  .unified-bottom-tab-dock {
    position: fixed;
    left: 50%;
    transform: translateX(-50%);
    bottom: calc(10px + env(safe-area-inset-bottom, 0px));
    width: fit-content;
    max-width: calc(100vw - 28px);
    z-index: 80;
    transition: opacity 260ms ease, transform 260ms ease;
    animation: unified-tab-rise 320ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  .unified-bottom-tab-dock.unified-bottom-tab-dock-hidden {
    opacity: 0;
    pointer-events: none;
    transform: translateX(-50%) translateY(10px);
  }
  .unified-bottom-tab-dock .unified-tab-row {
    display: flex !important;
    align-items: stretch !important;
    justify-content: center !important;
    gap: 14px !important;
    width: fit-content;
    max-width: calc(100vw - 28px);
    padding: 10px 18px;
    border-radius: 9999px;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.08));
    border: 1px solid rgba(255, 255, 255, 0.28);
    box-shadow: 0 18px 42px rgba(15, 23, 42, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.52), inset 0 -1px 0 rgba(255, 255, 255, 0.14);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
  }
  .unified-bottom-tab-dock .unified-tab-item {
    position: relative;
    flex: 0 0 auto;
    display: flex !important;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    min-width: 72px;
    min-height: 58px;
    padding: 7px 7px !important;
    border-radius: 16px !important;
    color: rgb(71, 85, 105) !important;
    text-decoration: none !important;
    transition: transform 220ms ease, color 220ms ease, filter 220ms ease;
    overflow: hidden;
    -webkit-tap-highlight-color: transparent;
  }
  .unified-bottom-tab-dock .unified-tab-item::before {
    content: "";
    position: absolute;
    inset: 2px;
    border-radius: 14px;
    background: transparent;
    opacity: 0;
  }
  .unified-bottom-tab-dock .unified-tab-item:hover {
    transform: translateY(-1.5px);
    filter: saturate(1.03);
  }
  .unified-bottom-tab-dock .unified-tab-item:focus,
  .unified-bottom-tab-dock .unified-tab-item:focus-visible,
  .unified-bottom-tab-dock .unified-tab-item:active {
    outline: none !important;
    box-shadow: none !important;
  }
  .unified-bottom-tab-dock .unified-tab-icon,
  .unified-bottom-tab-dock .unified-tab-label {
    position: relative;
    z-index: 1;
  }
  .unified-bottom-tab-dock .unified-tab-icon {
    width: 32px;
    height: 32px;
    border-radius: 999px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 15px;
    background: rgba(255, 255, 255, 0.12);
    box-shadow: none;
    transition: background 220ms ease, color 220ms ease, box-shadow 220ms ease, transform 220ms ease;
  }
  .unified-bottom-tab-dock .unified-tab-label {
    font-size: 11px;
    line-height: 1.05;
    font-weight: 600;
    letter-spacing: 0.18px;
    white-space: nowrap;
  }
  .unified-bottom-tab-dock .unified-tab-item.active {
    color: rgb(37, 99, 235) !important;
    transform: translateY(-2px);
  }
  .unified-bottom-tab-dock .unified-tab-item.active .unified-tab-icon {
    color: rgb(37, 99, 235);
    background: rgba(255, 255, 255, 0.18);
    box-shadow: 0 6px 14px rgba(37, 99, 235, 0.1);
    transform: translateY(-0.5px) scale(1.02);
  }
  .unified-bottom-tab-dock .tab-indicator {
    display: none !important;
  }
  @keyframes unified-tab-rise {
    from { opacity: 0; transform: translateX(-50%) translateY(10px); }
    to { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
  @media (max-width: 420px) {
    .unified-bottom-tab-dock {
      max-width: calc(100vw - 16px);
    }
    .unified-bottom-tab-dock .unified-tab-row {
      max-width: calc(100vw - 16px);
      padding: 8px 12px;
      gap: 8px !important;
    }
    .unified-bottom-tab-dock .unified-tab-item {
      min-width: 58px;
      padding: 6px 4px !important;
    }
    .unified-bottom-tab-dock .unified-tab-label {
      font-size: 10px;
      letter-spacing: 0;
    }
    .unified-bottom-tab-dock .unified-tab-icon {
      width: 30px;
      height: 30px;
      font-size: 14px;
    }
  }
  `;
  document.head.appendChild(style);
}

function syncUnifiedBottomTabSpace() {
  var docks = document.querySelectorAll('.unified-bottom-tab-dock');
  if (!docks.length) return;
  var maxHeight = 0;
  docks.forEach(function (dock) {
    var h = Math.ceil(dock.getBoundingClientRect().height || 0);
    if (h > maxHeight) maxHeight = h;
  });
  document.documentElement.style.setProperty('--unified-tab-space', String(maxHeight + 24) + 'px');
}

function clearUnifiedBottomContentOffset() {
  document.querySelectorAll('.unified-bottom-content-offset').forEach(function (el) {
    el.classList.remove('unified-bottom-content-offset');
  });
}

function syncUnifiedBottomContentOffset() {
  clearUnifiedBottomContentOffset();
  if (!document.body.classList.contains('has-unified-bottom-tab')) return;
  if (!document.querySelector('.unified-bottom-tab-dock')) return;

  var candidates = [];
  var paneRoot = document.querySelector('body > div.flex.flex-1.overflow-hidden') || document.querySelector('body > div.flex.flex-1');

  if (paneRoot) {
    Array.prototype.slice.call(paneRoot.children).forEach(function (el) {
      if (!el) return;
      var rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      var cls = el.className || '';
      var computed = window.getComputedStyle(el);
      var isScrollable = cls.indexOf('overflow-y-auto') !== -1 || /auto|scroll/.test(computed.overflowY || '');
      var isPaneTag = /^(main|aside|section|article|div)$/i.test(el.tagName || '');
      if (isPaneTag && isScrollable) candidates.push(el);
    });
  }

  var main = document.querySelector('body > main') || document.querySelector('main');
  if (main && candidates.indexOf(main) === -1) candidates.push(main);

  if (!candidates.length) {
    var fallback = document.querySelector('body > .container') || document.querySelector('body > .app') || document.querySelector('main');
    if (fallback) candidates.push(fallback);
  }

  candidates.forEach(function (el) {
    if (el) el.classList.add('unified-bottom-content-offset');
  });
}

function decorateUnifiedTabs(root) {
  if (!root) return;
  var tabs = Array.prototype.slice.call(root.querySelectorAll('.tab-item'));
  tabs.forEach(function (tab) {
    if (tab.classList.contains('text-primary') && !tab.classList.contains('active')) {
      tab.classList.add('active');
    }
    tab.classList.add('unified-tab-item');
    tab.classList.remove('bg-primary/10', 'hover:bg-primary/10', 'rounded-lg');

    var icon = tab.querySelector('i');
    if (icon) icon.classList.add('unified-tab-icon');

    var label = tab.querySelector('span:not(.tab-indicator)');
    if (label) label.classList.add('unified-tab-label');
  });
}

function initUnifiedBottomTabs() {
  var footers = document.querySelectorAll('footer.glass-tab');
  if (!footers.length) {
    document.documentElement.classList.remove('unified-tab-preparing');
    return;
  }

  ensureUnifiedBottomTabStyle();
  document.body.classList.add('has-unified-bottom-tab');

  document.querySelectorAll('.unified-bottom-tab-dock').forEach(function (el) { el.remove(); });

  footers.forEach(function (footer) {
    footer.classList.add('unified-bottom-tab-source');

    var row = footer.querySelector('.container');
    if (!row) return;

    var rowClone = row.cloneNode(true);
    rowClone.classList.add('unified-tab-row');
    rowClone.classList.remove('justify-around', 'items-center');

    decorateUnifiedTabs(rowClone);

    var dock = document.createElement('div');
    dock.className = 'unified-bottom-tab-dock';
    if (document.documentElement.classList.contains('defer-unified-tab')) {
      dock.classList.add('unified-bottom-tab-dock-hidden');
    }
    dock.appendChild(rowClone);
    document.body.appendChild(dock);

    // Remove source footer entirely to avoid any full-width overlay side effects.
    try { footer.remove(); } catch (e) { footer.classList.add('unified-bottom-tab-source'); }
  });

  syncUnifiedBottomTabSpace();
  syncUnifiedBottomContentOffset();
  document.documentElement.classList.remove('unified-tab-preparing');
}

ensureUnifiedBottomTabStyle();
document.documentElement.classList.add('unified-tab-preparing');

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initUnifiedBottomTabs);
} else {
  initUnifiedBottomTabs();
}
window.addEventListener('resize', syncUnifiedBottomTabSpace);
window.addEventListener('resize', syncUnifiedBottomContentOffset);
window.addEventListener('load', function () {
  document.documentElement.classList.remove('unified-tab-preparing');
});

function showUnifiedBottomTabDock() {
  document.documentElement.classList.remove('defer-unified-tab');
  document.querySelectorAll('.unified-bottom-tab-dock').forEach(function (dock) {
    dock.classList.remove('unified-bottom-tab-dock-hidden');
  });
  syncUnifiedBottomContentOffset();
}

function hideUnifiedBottomTabDock() {
  document.documentElement.classList.add('defer-unified-tab');
  document.querySelectorAll('.unified-bottom-tab-dock').forEach(function (dock) {
    dock.classList.add('unified-bottom-tab-dock-hidden');
  });
  clearUnifiedBottomContentOffset();
}

window.showUnifiedBottomTabDock = showUnifiedBottomTabDock;
window.hideUnifiedBottomTabDock = hideUnifiedBottomTabDock;

function ensureUnifiedTopHeaderStyle() {
  if (document.getElementById('unified-top-header-style')) return;
  var style = document.createElement('style');
  style.id = 'unified-top-header-style';
  style.textContent = `
  :root {
    --unified-top-header-space: 72px;
  }
  body.has-unified-top-header {
    padding-top: 0 !important;
  }
  body.has-unified-top-header .unified-top-content-offset {
    padding-top: calc(var(--unified-top-header-space) + env(safe-area-inset-top, 0px)) !important;
    margin-top: 0 !important;
    scroll-padding-top: calc(var(--unified-top-header-space) + env(safe-area-inset-top, 0px));
  }
  body.has-unified-top-header .unified-top-content-offset-shift {
    padding-top: calc(var(--unified-top-header-space) + var(--unified-top-extra-shift, 0px) + env(safe-area-inset-top, 0px)) !important;
    margin-top: 0 !important;
    scroll-padding-top: calc(var(--unified-top-header-space) + var(--unified-top-extra-shift, 0px) + env(safe-area-inset-top, 0px));
  }
  body.has-unified-top-header .unified-top-pane-offset {
    padding-top: calc(var(--unified-top-header-space) + var(--unified-top-extra-shift, 0px) + env(safe-area-inset-top, 0px)) !important;
    scroll-padding-top: calc(var(--unified-top-header-space) + var(--unified-top-extra-shift, 0px) + env(safe-area-inset-top, 0px));
  }
  body.has-unified-top-header .unified-top-content-offset.unified-top-content-offset-extra {
    padding-top: calc(var(--unified-top-header-space) + var(--unified-top-extra-shift, 0px) + env(safe-area-inset-top, 0px)) !important;
    scroll-padding-top: calc(var(--unified-top-header-space) + var(--unified-top-extra-shift, 0px) + env(safe-area-inset-top, 0px));
  }
  html.unified-top-preparing header.sticky.top-0 {
    opacity: 0 !important;
    pointer-events: none !important;
    transform: translateY(-8px);
  }
  header.unified-top-header-source {
    display: none !important;
  }
  .unified-top-header-dock {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 90;
    pointer-events: none;
  }
  .unified-top-header-dock .unified-top-header-shell {
    pointer-events: auto;
    width: 100% !important;
    margin: 0 !important;
    border-radius: 0 !important;
    border: 1px solid rgba(255, 255, 255, 0.28) !important;
    box-sizing: border-box !important;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.08)) !important;
    backdrop-filter: blur(24px) saturate(180%) !important;
    -webkit-backdrop-filter: blur(24px) saturate(180%) !important;
    box-shadow: 0 18px 42px rgba(15, 23, 42, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.52), inset 0 -1px 0 rgba(255, 255, 255, 0.14) !important;
    overflow: visible;
  }
  `;
  document.head.appendChild(style);
}

function syncUnifiedTopHeaderSpace() {
  var docks = document.querySelectorAll('.unified-top-header-dock .unified-top-header-shell');
  if (!docks.length) return;
  var maxHeight = 0;
  docks.forEach(function (header) {
    var h = Math.ceil(header.getBoundingClientRect().height || 0);
    if (h > maxHeight) maxHeight = h;
  });
  if (maxHeight > 0) {
    document.documentElement.style.setProperty('--unified-top-header-space', String(maxHeight) + 'px');
  }
}

function syncUnifiedTopContentOffset() {
  document.querySelectorAll('.unified-top-content-offset, .unified-top-content-offset-shift, .unified-top-content-offset-extra, .unified-top-pane-offset').forEach(function (el) {
    el.classList.remove('unified-top-content-offset');
    el.classList.remove('unified-top-content-offset-shift');
    el.classList.remove('unified-top-content-offset-extra');
    el.classList.remove('unified-top-pane-offset');
    el.style.removeProperty('--unified-top-extra-shift');
  });

  var path = '';
  try { path = decodeURIComponent((window.location && window.location.pathname) || ''); } catch (e) { path = (window.location && window.location.pathname) || ''; }

  var isPaneOffsetPage =
    path.indexOf('待办页面') !== -1 ||
    path.indexOf('番茄钟页面') !== -1 ||
    path.indexOf('数据周报页面') !== -1;
  var paneRoot = null;
  if (isPaneOffsetPage) {
    paneRoot = document.querySelector('body > div.flex.flex-1.overflow-hidden') || document.querySelector('body > div.flex.flex-1');
  }

  var target = null;
  if (isPaneOffsetPage) target = paneRoot;
  if (!target) {
    target = Array.prototype.slice.call(document.querySelectorAll('body > main, main'))
      .find(function (el) {
        var rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }) || null;
  }
  if (!target) {
    target = document.querySelector('body > .container') || document.querySelector('body > .app');
  }

  if (isPaneOffsetPage && paneRoot) {
    var paneExtraShift = 0;
    var panes = Array.prototype.slice.call(paneRoot.children).filter(function (el) {
      if (!el) return false;
      var rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    if (!panes.length) panes = [paneRoot];
    panes.forEach(function (pane) {
      pane.classList.add('unified-top-pane-offset');
      pane.style.setProperty('--unified-top-extra-shift', String(paneExtraShift) + 'px');
    });
    return;
  }

  if (target) {
    target.classList.add('unified-top-content-offset');
  }
}

function initUnifiedTopHeaders() {
  var headers = document.querySelectorAll('body > header.sticky.top-0');
  if (!headers.length) {
    document.documentElement.classList.remove('unified-top-preparing');
    return;
  }

  ensureUnifiedTopHeaderStyle();
  document.body.classList.add('has-unified-top-header');
  document.querySelectorAll('.unified-top-header-dock').forEach(function (el) { el.remove(); });

  headers.forEach(function (header) {
    var clone = header.cloneNode(true);
    clone.classList.remove('sticky', 'top-0');
    clone.className = clone.className
      .split(/\s+/)
      .filter(function (cls) {
        return cls && !/^(glass|glass-|bg-|backdrop-|border|border-|shadow|shadow-)/.test(cls);
      })
      .join(' ');
    clone.classList.add('unified-top-header-shell');

    if (header.id) {
      clone.id = header.id;
      header.removeAttribute('id');
    }

    var dock = document.createElement('div');
    dock.className = 'unified-top-header-dock';
    dock.appendChild(clone);
    document.body.appendChild(dock);

    try { header.remove(); } catch (e) { header.classList.add('unified-top-header-source'); }
  });

  syncUnifiedTopHeaderSpace();
  syncUnifiedTopContentOffset();
  initUnifiedAvatarDropdowns();
  document.documentElement.classList.remove('unified-top-preparing');
}

ensureUnifiedTopHeaderStyle();
document.documentElement.classList.add('unified-top-preparing');

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initUnifiedTopHeaders);
} else {
  initUnifiedTopHeaders();
}
window.addEventListener('resize', syncUnifiedTopHeaderSpace);
window.addEventListener('resize', syncUnifiedTopContentOffset);

function ensureUnifiedAvatarDropdownStyle() {
  if (document.getElementById('unified-avatar-dropdown-style')) return;
  var style = document.createElement('style');
  style.id = 'unified-avatar-dropdown-style';
  style.textContent = `
  :root {
    --unified-avatar-hover-bg: rgba(255, 107, 107, 0.14);
    --unified-avatar-hover-color: #ff6b6b;
  }
  .unified-avatar-trigger-group {
    position: relative !important;
  }
  .unified-avatar-trigger-group .unified-avatar-menu {
    display: block !important;
    position: absolute !important;
    right: 0 !important;
    top: 100% !important;
    margin-top: 8px !important;
    width: 12rem !important;
    border-radius: 0.75rem !important;
    padding: 0.5rem 0 !important;
    z-index: 120 !important;
    opacity: 0 !important;
    visibility: hidden !important;
    transform: translateY(6px) scale(0.98) !important;
    transition: opacity 220ms ease, transform 220ms ease, visibility 0s linear 220ms !important;
    pointer-events: none !important;
  }
  .unified-avatar-trigger-group.unified-avatar-open .unified-avatar-menu {
    opacity: 1 !important;
    visibility: visible !important;
    transform: translateY(0) scale(1) !important;
    transition-delay: 0s !important;
    pointer-events: auto !important;
  }
  .unified-avatar-trigger-group .unified-avatar-menu a {
    display: block;
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    line-height: 1.25rem;
    transition: color 180ms ease, background-color 180ms ease;
  }
  .unified-avatar-trigger-group .unified-avatar-menu a:not(.text-danger):hover,
  .unified-avatar-trigger-group .unified-avatar-menu a:not(.text-danger):focus-visible {
    background: var(--unified-avatar-hover-bg) !important;
    color: var(--unified-avatar-hover-color) !important;
    outline: none !important;
  }
  .unified-avatar-trigger-group .unified-avatar-menu a:not(.text-danger):hover i,
  .unified-avatar-trigger-group .unified-avatar-menu a:not(.text-danger):focus-visible i {
    color: var(--unified-avatar-hover-color) !important;
  }
  .unified-avatar-trigger-group .unified-avatar-chevron {
    transition: transform 280ms ease !important;
  }
  .unified-avatar-trigger-group.unified-avatar-open .unified-avatar-chevron {
    transform: rotate(180deg) !important;
  }
  `;
  document.head.appendChild(style);
}

function applyUnifiedAvatarDropdownTheme() {
  var path = '';
  try { path = decodeURIComponent((window.location && window.location.pathname) || ''); } catch (e) { path = (window.location && window.location.pathname) || ''; }

  var theme = {
    bg: 'rgba(79, 70, 229, 0.14)',
    color: '#4F46E5'
  };

  if (path.indexOf('番茄钟页面') !== -1) {
    theme = { bg: 'rgba(255, 107, 107, 0.16)', color: '#FF6B6B' };
  } else if (path.indexOf('日历页面') !== -1) {
    theme = { bg: 'rgba(245, 158, 11, 0.16)', color: '#F59E0B' };
  } else if (path.indexOf('打卡页面') !== -1) {
    theme = { bg: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6' };
  } else if (
    path.indexOf('待办页面') !== -1 ||
    path.indexOf('数据周报页面') !== -1 ||
    path.indexOf('个人中心页面') !== -1
  ) {
    theme = { bg: 'rgba(79, 70, 229, 0.14)', color: '#4F46E5' };
  }

  document.documentElement.style.setProperty('--unified-avatar-hover-bg', theme.bg);
  document.documentElement.style.setProperty('--unified-avatar-hover-color', theme.color);
}

function isAvatarMenu(menu) {
  if (!menu) return false;
  if (menu.id === 'user-dropdown') return true;
  if (menu.classList && menu.classList.contains('user-dropdown')) return true;
  if (menu.querySelector('a[href*="个人中心页面.html"]')) return true;
  var text = (menu.textContent || '').replace(/\s+/g, '');
  return text.indexOf('个人中心') !== -1 && text.indexOf('退出登录') !== -1;
}

function initUnifiedAvatarDropdowns() {
  ensureUnifiedAvatarDropdownStyle();
  applyUnifiedAvatarDropdownTheme();

  var roots = document.querySelectorAll('.unified-top-header-shell, header.sticky.top-0, header');
  roots.forEach(function (root) {
    var menus = root.querySelectorAll('div.user-dropdown, #user-dropdown, div.absolute.right-0');
    menus.forEach(function (menu) {
      if (!isAvatarMenu(menu)) return;

      var group = menu.closest('.relative') || menu.parentElement;
      if (!group) return;

      var trigger = group.querySelector('button') || group.querySelector('[role="button"]');
      if (!trigger) return;

      group.classList.add('unified-avatar-trigger-group');
      menu.classList.add('unified-avatar-menu');
      menu.classList.remove('hidden', 'invisible', 'opacity-0');
      menu.style.pointerEvents = '';

      var chevron = trigger.querySelector('.fa-chevron-down');
      if (chevron) chevron.classList.add('unified-avatar-chevron');

      if (group.dataset.unifiedAvatarBound === '1') return;
      group.dataset.unifiedAvatarBound = '1';

      var closeTimer = null;
      var closeDelay = 320; // keep dropdown visible a bit longer after cursor leaves

      function openMenu() {
        if (closeTimer) {
          clearTimeout(closeTimer);
          closeTimer = null;
        }
        group.classList.add('unified-avatar-open');
      }

      function closeMenuWithDelay() {
        if (closeTimer) clearTimeout(closeTimer);
        closeTimer = setTimeout(function () {
          group.classList.remove('unified-avatar-open');
        }, closeDelay);
      }

      function closeNow() {
        if (closeTimer) {
          clearTimeout(closeTimer);
          closeTimer = null;
        }
        group.classList.remove('unified-avatar-open');
      }

      group.addEventListener('mouseenter', openMenu);
      group.addEventListener('mouseleave', closeMenuWithDelay);
      group.addEventListener('focusin', openMenu);
      group.addEventListener('focusout', function () {
        closeMenuWithDelay();
      });

      trigger.addEventListener('click', function (e) {
        e.preventDefault();
        if (group.classList.contains('unified-avatar-open')) {
          closeNow();
        } else {
          openMenu();
        }
      });

      document.addEventListener('click', function (e) {
        if (!group.contains(e.target)) closeNow();
      });
    });
  });
}

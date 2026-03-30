function ensureUnifiedToastStyle() {
  if (document.getElementById('unified-toast-style')) return;
  var style = document.createElement('style');
  style.id = 'unified-toast-style';
  style.textContent = `
  .unified-toast-container {
    position: fixed;
    top: 24px;
    right: 24px;
    z-index: 100000;
    display: flex;
    flex-direction: column;
    gap: 10px;
    pointer-events: none;
    max-width: min(360px, calc(100vw - 20px));
  }
  .unified-toast {
    min-width: 280px;
    max-width: min(360px, calc(100vw - 20px));
    padding: 14px 16px;
    border-radius: 16px;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.68);
    border-left: 4px solid var(--toast-accent, #4F46E5);
    background: linear-gradient(90deg, var(--toast-bg, rgba(79, 70, 229, 0.12)), rgba(255, 255, 255, 0.95));
    backdrop-filter: blur(24px) saturate(200%);
    -webkit-backdrop-filter: blur(24px) saturate(200%);
    opacity: 0;
    transform: translateX(120px);
    transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    pointer-events: auto;
  }
  .unified-toast.show {
    opacity: 1;
    transform: translateX(0);
  }
  .unified-toast.hide {
    opacity: 0;
    transform: translateX(120px);
  }
  .unified-toast-inner {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .unified-toast-icon {
    width: 30px;
    height: 30px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--toast-accent, #4F46E5);
    background: var(--toast-accent-soft, rgba(79, 70, 229, 0.16));
    flex-shrink: 0;
  }
  .unified-toast-text {
    color: #374151;
    font-size: 13px;
    line-height: 1.45;
    font-weight: 500;
    word-break: break-word;
    flex: 1;
  }
  @media (max-width: 640px) {
    .unified-toast-container {
      top: 14px;
      right: 12px;
      left: 12px;
      max-width: none;
    }
    .unified-toast {
      min-width: 0;
      max-width: none;
    }
  }
  `;
  document.head.appendChild(style);
}

function getUnifiedToastThemeByPath() {
  var path = '';
  try { path = decodeURIComponent((window.location && window.location.pathname) || ''); } catch (e) { path = (window.location && window.location.pathname) || ''; }

  var preset = {
    info: '#4F46E5',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444'
  };

  if (path.indexOf('番茄钟页面') !== -1) {
    preset.info = '#FF6B6B';
    preset.success = '#34D399';
    preset.warning = '#FB923C';
    preset.error = '#EF4444';
  } else if (path.indexOf('日历页面') !== -1) {
    preset.info = '#FFB347';
    preset.success = '#F59E0B';
    preset.warning = '#FB923C';
    preset.error = '#EF4444';
  } else if (path.indexOf('打卡页面') !== -1) {
    preset.info = '#3B82F6';
    preset.success = '#10B981';
    preset.warning = '#F59E0B';
    preset.error = '#EF4444';
  } else if (path.indexOf('个人中心页面') !== -1) {
    preset.info = '#7C3AED';
    preset.success = '#22C55E';
    preset.warning = '#F59E0B';
    preset.error = '#EF4444';
  }

  return preset;
}

function normalizeToastType(type) {
  var t = (type || 'info').toString().toLowerCase();
  if (t === 'danger') return 'error';
  if (t === 'warn') return 'warning';
  if (t !== 'success' && t !== 'info' && t !== 'warning' && t !== 'error') return 'info';
  return t;
}

function hexToRgba(hex, alpha) {
  var h = String(hex || '').replace('#', '').trim();
  if (h.length === 3) {
    h = h.split('').map(function (c) { return c + c; }).join('');
  }
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return 'rgba(79, 70, 229, ' + String(alpha) + ')';
  var r = parseInt(h.slice(0, 2), 16);
  var g = parseInt(h.slice(2, 4), 16);
  var b = parseInt(h.slice(4, 6), 16);
  return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + String(alpha) + ')';
}

function getUnifiedToastContainer() {
  var container = document.getElementById('unified-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'unified-toast-container';
    container.className = 'unified-toast-container';
    document.body.appendChild(container);
  }
  return container;
}

function showToast(message, typeOrDuration, duration) {
  if (!message) return;
  ensureUnifiedToastStyle();

  var type = 'info';
  var life = 3000;

  if (typeof typeOrDuration === 'number') {
    life = typeOrDuration;
  } else if (typeof typeOrDuration === 'string') {
    type = normalizeToastType(typeOrDuration);
  }
  if (typeof duration === 'number') {
    life = duration;
  }

  var palette = getUnifiedToastThemeByPath();
  var accent = palette[type] || palette.info;

  var iconClass = 'fa-info-circle';
  if (type === 'success') iconClass = 'fa-check-circle';
  if (type === 'warning') iconClass = 'fa-exclamation-triangle';
  if (type === 'error') iconClass = 'fa-exclamation-circle';

  var container = getUnifiedToastContainer();
  var toast = document.createElement('div');
  toast.className = 'unified-toast unified-toast-' + type;
  toast.style.setProperty('--toast-accent', accent);
  toast.style.setProperty('--toast-bg', hexToRgba(accent, 0.16));
  toast.style.setProperty('--toast-accent-soft', hexToRgba(accent, 0.16));

  var inner = document.createElement('div');
  inner.className = 'unified-toast-inner';

  var icon = document.createElement('span');
  icon.className = 'unified-toast-icon';
  icon.innerHTML = '<i class="fas ' + iconClass + '"></i>';

  var text = document.createElement('span');
  text.className = 'unified-toast-text';
  text.textContent = String(message);

  inner.appendChild(icon);
  inner.appendChild(text);
  toast.appendChild(inner);
  container.appendChild(toast);

  requestAnimationFrame(function () {
    toast.classList.add('show');
  });

  var hide = function () {
    toast.classList.remove('show');
    toast.classList.add('hide');
    setTimeout(function () {
      if (toast && toast.parentNode) toast.remove();
    }, 420);
  };

  setTimeout(hide, Math.max(1200, life));
}

if (typeof window !== 'undefined') {
  window.__unifiedShowToast = showToast;
}

function isMobile() {
  return window.innerWidth < 768;
}

function getUnifiedPageKeyFromPath() {
  var path = '';
  try { path = decodeURIComponent((window.location && window.location.pathname) || ''); } catch (e) { path = (window.location && window.location.pathname) || ''; }
  if (path.indexOf('待办页面') !== -1) return 'todo';
  if (path.indexOf('日历页面') !== -1) return 'calendar';
  if (path.indexOf('番茄钟页面') !== -1) return 'pomodoro';
  if (path.indexOf('数据周报页面') !== -1) return 'report';
  if (path.indexOf('打卡页面') !== -1) return 'checkin';
  if (path.indexOf('个人中心页面') !== -1) return 'profile';
  return '';
}

function shouldEnableUnifiedDarkMode(pageKey) {
  return pageKey === 'todo' ||
    pageKey === 'calendar' ||
    pageKey === 'pomodoro' ||
    pageKey === 'report' ||
    pageKey === 'checkin' ||
    pageKey === 'profile';
}

var UNIFIED_DARK_PAGE_CLASS_LIST = [
  'unified-page-todo',
  'unified-page-calendar',
  'unified-page-pomodoro',
  'unified-page-report',
  'unified-page-checkin',
  'unified-page-profile'
];

function applyUnifiedDarkModeClassByTheme(themeMode) {
  var root = document.documentElement;
  if (!root) return;

  var pageKey = getUnifiedPageKeyFromPath();
  var canUseUnifiedDark = shouldEnableUnifiedDarkMode(pageKey);

  UNIFIED_DARK_PAGE_CLASS_LIST.forEach(function (cls) {
    root.classList.remove(cls);
  });

  if (!canUseUnifiedDark) {
    root.classList.remove('unified-dark-mode');
    return;
  }

  root.classList.add('unified-page-' + pageKey);
  if (themeMode === 'night') {
    root.classList.add('unified-dark-mode');
  } else {
    root.classList.remove('unified-dark-mode');
  }
}

function ensureUnifiedDarkThemeStyle() {
  if (document.getElementById('unified-dark-theme-style')) return;
  var style = document.createElement('style');
  style.id = 'unified-dark-theme-style';
  style.textContent = `
  html.unified-dark-mode {
    --ud-bg-start: #121826;
    --ud-bg-end: #1A2130;
    --ud-surface-rgb: 35, 43, 59;
    --ud-surface: rgba(35, 43, 59, 0.8);
    --ud-surface-soft: rgba(26, 33, 48, 0.78);
    --ud-border: #2D3748;
    --ud-title: #F0F2F5;
    --ud-text: #B0B7C3;
    --ud-muted: #717A8A;
    --ud-accent: #4A6CF7;
    --ud-work: #4A6CF7;
    --ud-study: #8B5CF6;
    --ud-life: #EC4899;
    --ud-health: #10B981;
    --ud-success: #10B981;
    --ud-warning: #F59E0B;
    --ud-danger: #EF4444;
  }
  html.unified-dark-mode body {
    background: linear-gradient(135deg, var(--ud-bg-start) 0%, var(--ud-bg-end) 100%) !important;
    color: var(--ud-text) !important;
  }
  html.unified-dark-mode .bg-orb {
    opacity: 0.08 !important;
    filter: blur(120px) saturate(80%) !important;
  }
  html.unified-dark-mode .glass,
  html.unified-dark-mode .glass-strong,
  html.unified-dark-mode .glass-max,
  html.unified-dark-mode .glass-card,
  html.unified-dark-mode .modal-content,
  html.unified-dark-mode .confirm-modal-card,
  html.unified-dark-mode .task-card,
  html.unified-dark-mode .stat-card,
  html.unified-dark-mode .chart-container,
  html.unified-dark-mode .suggestion-card,
  html.unified-dark-mode .tip-item,
  html.unified-dark-mode .stat-row,
  html.unified-dark-mode .achievement-row,
  html.unified-dark-mode .user-card,
  html.unified-dark-mode .setting-item,
  html.unified-dark-mode .task-pool-item,
  html.unified-dark-mode .stat-box,
  html.unified-dark-mode .time-slot-card,
  html.unified-dark-mode .social-icon,
  html.unified-dark-mode .calendar-container,
  html.unified-dark-mode .detail-datetime-panel {
    background: var(--ud-surface) !important;
    border-color: var(--ud-border) !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05) !important;
  }
  html.unified-dark-mode .glass-header,
  html.unified-dark-mode .glass-tab,
  html.unified-dark-mode .unified-top-header-dock .unified-top-header-shell,
  html.unified-dark-mode .unified-bottom-tab-dock .unified-tab-row {
    background: rgba(var(--ud-surface-rgb), 0.8) !important;
    border-color: var(--ud-border) !important;
    backdrop-filter: blur(20px) saturate(130%) !important;
    -webkit-backdrop-filter: blur(20px) saturate(130%) !important;
  }
  html.unified-dark-mode .unified-bottom-tab-dock .unified-tab-row::before,
  html.unified-dark-mode .unified-bottom-tab-dock .unified-tab-row::after {
    opacity: 0.5 !important;
  }
  html.unified-dark-mode .unified-bottom-tab-dock .unified-tab-item {
    color: var(--ud-text) !important;
  }
  html.unified-dark-mode .unified-bottom-tab-dock .unified-tab-item.active {
    color: var(--ud-title) !important;
    background: transparent !important;
  }
  html.unified-dark-mode .unified-bottom-tab-dock .unified-tab-item.active .unified-tab-icon {
    color: var(--ud-title) !important;
    background: rgba(255, 255, 255, 0.12) !important;
    box-shadow: none !important;
  }
  html.unified-dark-mode .unified-bottom-tab-dock .unified-tab-item.active .unified-tab-label {
    color: var(--ud-title) !important;
    text-shadow: none;
  }
  html.unified-dark-mode .text-gray-900,
  html.unified-dark-mode .text-gray-800,
  html.unified-dark-mode .text-slate-900,
  html.unified-dark-mode .text-slate-800,
  html.unified-dark-mode .text-dark {
    color: var(--ud-title) !important;
  }
  html.unified-dark-mode .text-gray-700,
  html.unified-dark-mode .text-gray-600,
  html.unified-dark-mode .text-slate-700,
  html.unified-dark-mode .text-slate-600 {
    color: var(--ud-text) !important;
  }
  html.unified-dark-mode .text-gray-500,
  html.unified-dark-mode .text-gray-400,
  html.unified-dark-mode .text-slate-500,
  html.unified-dark-mode .text-slate-400 {
    color: var(--ud-muted) !important;
  }
  html.unified-dark-mode .text-primary { color: var(--ud-accent) !important; }
  html.unified-dark-mode .text-success { color: var(--ud-success) !important; }
  html.unified-dark-mode .text-warning { color: var(--ud-warning) !important; }
  html.unified-dark-mode .text-danger { color: var(--ud-danger) !important; }

  html.unified-dark-mode .border-gray-100,
  html.unified-dark-mode .border-gray-200,
  html.unified-dark-mode .border-gray-300,
  html.unified-dark-mode .border-gray-400,
  html.unified-dark-mode .border-white,
  html.unified-dark-mode .border-white\\/40,
  html.unified-dark-mode .border-white\\/50,
  html.unified-dark-mode .border-white\\/55,
  html.unified-dark-mode .border-white\\/60,
  html.unified-dark-mode .border-white\\/70 {
    border-color: var(--ud-border) !important;
  }
  html.unified-dark-mode .bg-white,
  html.unified-dark-mode .bg-white\\/50,
  html.unified-dark-mode .bg-white\\/55,
  html.unified-dark-mode .bg-white\\/60,
  html.unified-dark-mode .bg-white\\/65,
  html.unified-dark-mode .bg-white\\/70,
  html.unified-dark-mode .bg-white\\/75,
  html.unified-dark-mode .bg-white\\/80,
  html.unified-dark-mode .bg-white\\/85,
  html.unified-dark-mode .bg-white\\/90,
  html.unified-dark-mode .bg-white\\/95,
  html.unified-dark-mode .bg-gray-50,
  html.unified-dark-mode .bg-gray-50\\/50,
  html.unified-dark-mode .bg-gray-50\\/60,
  html.unified-dark-mode .bg-gray-50\\/70,
  html.unified-dark-mode .bg-gray-50\\/80,
  html.unified-dark-mode .bg-gray-100,
  html.unified-dark-mode .bg-gray-100\\/50,
  html.unified-dark-mode .bg-gray-100\\/60,
  html.unified-dark-mode .bg-gray-100\\/70,
  html.unified-dark-mode .bg-gray-100\\/80 {
    background: rgba(var(--ud-surface-rgb), 0.72) !important;
  }
  html.unified-dark-mode .bg-blue-100 { background: rgba(74, 108, 247, 0.2) !important; }
  html.unified-dark-mode .bg-amber-100 { background: rgba(245, 158, 11, 0.22) !important; }
  html.unified-dark-mode .bg-emerald-100 { background: rgba(16, 185, 129, 0.2) !important; }
  html.unified-dark-mode .text-blue-700 { color: #AFC3FF !important; }
  html.unified-dark-mode .text-amber-700 { color: #FCD34D !important; }
  html.unified-dark-mode .text-emerald-700 { color: #86EFAC !important; }

  html.unified-dark-mode input,
  html.unified-dark-mode textarea,
  html.unified-dark-mode select,
  html.unified-dark-mode .glass-input,
  html.unified-dark-mode .input-glass,
  html.unified-dark-mode .modal-input,
  html.unified-dark-mode .custom-select-trigger,
  html.unified-dark-mode .custom-select-dropdown,
  html.unified-dark-mode .custom-select-option,
  html.unified-dark-mode .datetime-select-trigger,
  html.unified-dark-mode .datetime-select-menu,
  html.unified-dark-mode .task-select-dropdown {
    background: var(--ud-surface-soft) !important;
    color: var(--ud-title) !important;
    border-color: var(--ud-border) !important;
  }
  html.unified-dark-mode input::placeholder,
  html.unified-dark-mode textarea::placeholder {
    color: var(--ud-muted) !important;
  }
  html.unified-dark-mode input:focus,
  html.unified-dark-mode textarea:focus,
  html.unified-dark-mode select:focus,
  html.unified-dark-mode .glass-input:focus,
  html.unified-dark-mode .input-glass:focus,
  html.unified-dark-mode .datetime-select-trigger:hover {
    border-color: rgba(74, 108, 247, 0.58) !important;
    box-shadow: 0 0 0 3px rgba(74, 108, 247, 0.16) !important;
  }
  html.unified-dark-mode .btn-primary,
  html.unified-dark-mode .btn-primary-glass,
  html.unified-dark-mode .checkin-btn,
  html.unified-dark-mode .view-btn.active,
  html.unified-dark-mode .mode-btn.active,
  html.unified-dark-mode .priority-btn.active {
    background: var(--ud-accent) !important;
    border-color: rgba(74, 108, 247, 0.85) !important;
    color: var(--ud-title) !important;
    box-shadow: 0 8px 20px rgba(74, 108, 247, 0.24) !important;
  }
  html.unified-dark-mode footer.glass-tab .tab-item.active {
    background: transparent !important;
    border-color: transparent !important;
    box-shadow: none !important;
  }
  html.unified-dark-mode .btn-glass,
  html.unified-dark-mode .btn-secondary-glass,
  html.unified-dark-mode .mode-btn:not(.active),
  html.unified-dark-mode .priority-btn,
  html.unified-dark-mode .modal-priority-btn,
  html.unified-dark-mode .datetime-quick-btn,
  html.unified-dark-mode .datetime-calendar-action,
  html.unified-dark-mode .datetime-calendar-nav,
  html.unified-dark-mode .datetime-time-pill,
  html.unified-dark-mode .calendar-nav-btn {
    background: rgba(45, 55, 72, 0.78) !important;
    color: var(--ud-text) !important;
    border-color: var(--ud-border) !important;
  }
  html.unified-dark-mode button:hover,
  html.unified-dark-mode .btn-primary:hover,
  html.unified-dark-mode .btn-primary-glass:hover,
  html.unified-dark-mode .checkin-btn:hover,
  html.unified-dark-mode .tab-item:hover {
    filter: brightness(1.1) !important;
  }
  html.unified-dark-mode .btn-primary:hover,
  html.unified-dark-mode .btn-primary-glass:hover {
    border-color: rgba(74, 108, 247, 0.92) !important;
    box-shadow: 0 10px 24px rgba(74, 108, 247, 0.28) !important;
  }
  html.unified-dark-mode .btn-glass:hover,
  html.unified-dark-mode .view-btn.btn-glass:hover,
  html.unified-dark-mode .calendar-nav-btn:hover,
  html.unified-dark-mode .btn-soft:hover,
  html.unified-dark-mode .btn-soft-danger:hover,
  html.unified-dark-mode .icon-soft-danger:hover {
    background: rgba(45, 55, 72, 0.92) !important;
    border-color: rgba(74, 108, 247, 0.48) !important;
    color: var(--ud-title) !important;
    box-shadow: 0 8px 20px rgba(74, 108, 247, 0.18) !important;
  }
  html.unified-dark-mode .type-btn:not(.selected) {
    background: rgba(26, 33, 48, 0.72) !important;
    border-color: var(--ud-border) !important;
    color: var(--ud-text) !important;
  }
  html.unified-dark-mode .type-btn:not(.selected) i {
    color: #90A0B8 !important;
  }
  html.unified-dark-mode .type-btn:not(.selected):hover {
    background: rgba(74, 108, 247, 0.14) !important;
    border-color: rgba(74, 108, 247, 0.46) !important;
    color: var(--ud-title) !important;
  }
  html.unified-dark-mode .type-btn:not(.selected):hover i {
    color: #CFE0FF !important;
  }
  html.unified-dark-mode button:active {
    filter: brightness(0.95) !important;
  }
  html.unified-dark-mode .hover\\:bg-primary\\/5:hover,
  html.unified-dark-mode .hover\\:bg-primary\\/10:hover,
  html.unified-dark-mode .hover\\:bg-primary\\/15:hover,
  html.unified-dark-mode .hover\\:bg-primary\\/20:hover {
    background-color: rgba(74, 108, 247, 0.18) !important;
  }
  html.unified-dark-mode .hover\\:bg-danger\\/5:hover,
  html.unified-dark-mode .hover\\:bg-danger\\/10:hover {
    background-color: rgba(239, 68, 68, 0.16) !important;
  }
  html.unified-dark-mode .hover\\:bg-gray-50:hover,
  html.unified-dark-mode .hover\\:bg-gray-100:hover,
  html.unified-dark-mode .hover\\:bg-white:hover {
    background-color: rgba(45, 55, 72, 0.82) !important;
  }
  html.unified-dark-mode [class*="hover:bg-primary/"]:hover {
    background-color: rgba(74, 108, 247, 0.18) !important;
  }
  html.unified-dark-mode [class*="hover:bg-danger/"]:hover {
    background-color: rgba(239, 68, 68, 0.16) !important;
  }
  html.unified-dark-mode [class*="hover:bg-gray-50"]:hover,
  html.unified-dark-mode [class*="hover:bg-gray-100"]:hover,
  html.unified-dark-mode [class*="hover:bg-white"]:hover {
    background-color: rgba(45, 55, 72, 0.82) !important;
  }
  html.unified-dark-mode [class*="hover:border-primary"]:hover {
    border-color: rgba(74, 108, 247, 0.52) !important;
  }
  html.unified-dark-mode [class*="hover:border-gray-"]:hover {
    border-color: rgba(74, 85, 104, 0.75) !important;
  }
  html.unified-dark-mode [class*="hover:text-primary/"]:hover {
    color: #D9E2FF !important;
  }
  html.unified-dark-mode [class*="hover:text-primary"]:hover {
    color: #D9E2FF !important;
  }
  html.unified-dark-mode [class*="hover:text-secondary"]:hover {
    color: #D9E2FF !important;
  }
  html.unified-dark-mode .hover\\:border-primary:hover {
    border-color: rgba(74, 108, 247, 0.52) !important;
  }
  html.unified-dark-mode .hover\\:text-gray-700:hover,
  html.unified-dark-mode .hover\\:text-gray-800:hover {
    color: var(--ud-title) !important;
  }
  html.unified-dark-mode .btn-social {
    background: rgba(35, 43, 59, 0.72) !important;
    border-color: var(--ud-border) !important;
  }
  html.unified-dark-mode .btn-social:hover {
    background: rgba(45, 55, 72, 0.9) !important;
    border-color: rgba(74, 108, 247, 0.45) !important;
  }
  html.unified-dark-mode .btn-social .social-text {
    color: var(--ud-text) !important;
  }
  html.unified-dark-mode .task-detail-section {
    background: rgba(35, 43, 59, 0.78) !important;
    border-color: var(--ud-border) !important;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04) !important;
  }
  html.unified-dark-mode .task-detail-section .text-gray-700,
  html.unified-dark-mode .task-detail-section .text-gray-600,
  html.unified-dark-mode .task-detail-section .text-gray-500 {
    color: var(--ud-text) !important;
  }
  html.unified-dark-mode .detail-datetime-trigger {
    background: rgba(45, 55, 72, 0.78) !important;
    border-color: var(--ud-border) !important;
    color: var(--ud-title) !important;
  }
  html.unified-dark-mode .detail-datetime-trigger:hover {
    background: rgba(45, 55, 72, 0.9) !important;
    border-color: rgba(74, 108, 247, 0.52) !important;
    box-shadow: 0 8px 20px rgba(74, 108, 247, 0.2) !important;
  }
  html.unified-dark-mode .detail-datetime-trigger i,
  html.unified-dark-mode .detail-datetime-trigger i:last-child {
    color: var(--ud-muted) !important;
  }
  html.unified-dark-mode .detail-datetime-panel {
    background: rgba(26, 33, 48, 0.97) !important;
    border-color: var(--ud-border) !important;
    box-shadow: 0 16px 34px rgba(0, 0, 0, 0.32) !important;
  }
  html.unified-dark-mode .datetime-select-trigger {
    background: rgba(45, 55, 72, 0.84) !important;
    border-color: var(--ud-border) !important;
    color: var(--ud-title) !important;
  }
  html.unified-dark-mode .datetime-select-trigger:hover {
    background: rgba(45, 55, 72, 0.92) !important;
    border-color: rgba(74, 108, 247, 0.55) !important;
    box-shadow: 0 0 0 3px rgba(74, 108, 247, 0.16) !important;
  }
  html.unified-dark-mode .datetime-select-trigger i {
    color: var(--ud-muted) !important;
  }
  html.unified-dark-mode .datetime-select-menu {
    background: rgba(26, 33, 48, 0.98) !important;
    border-color: var(--ud-border) !important;
    box-shadow: 0 14px 30px rgba(0, 0, 0, 0.35) !important;
  }
  html.unified-dark-mode .datetime-select-option {
    color: var(--ud-text) !important;
    background: transparent !important;
  }
  html.unified-dark-mode .datetime-select-option:hover {
    background: rgba(74, 108, 247, 0.16) !important;
    color: var(--ud-title) !important;
  }
  html.unified-dark-mode .datetime-select-option.active {
    background: rgba(74, 108, 247, 0.24) !important;
    color: #D9E2FF !important;
  }
  html.unified-dark-mode .datetime-calendar-weekday {
    color: var(--ud-muted) !important;
  }
  html.unified-dark-mode .datetime-calendar-day {
    color: var(--ud-text) !important;
  }
  html.unified-dark-mode .datetime-calendar-day:hover {
    border-color: rgba(74, 108, 247, 0.45) !important;
    background: rgba(74, 108, 247, 0.16) !important;
    color: var(--ud-title) !important;
  }
  html.unified-dark-mode .datetime-calendar-day.today {
    border-color: rgba(74, 108, 247, 0.65) !important;
    background: rgba(74, 108, 247, 0.2) !important;
    color: #D9E2FF !important;
  }
  html.unified-dark-mode .datetime-calendar-day.selected {
    border-color: rgba(74, 108, 247, 0.9) !important;
    background: rgba(74, 108, 247, 0.28) !important;
    color: #EDF3FF !important;
    box-shadow: 0 0 0 1px rgba(74, 108, 247, 0.35) !important;
  }
  html.unified-dark-mode .datetime-calendar-actions,
  html.unified-dark-mode .datetime-time-options {
    border-top-color: var(--ud-border) !important;
  }
  html.unified-dark-mode .datetime-calendar-action,
  html.unified-dark-mode .datetime-time-pill,
  html.unified-dark-mode .datetime-quick-btn,
  html.unified-dark-mode .datetime-calendar-nav {
    background: rgba(45, 55, 72, 0.84) !important;
    border-color: var(--ud-border) !important;
    color: var(--ud-text) !important;
  }
  html.unified-dark-mode .datetime-calendar-action:hover,
  html.unified-dark-mode .datetime-time-pill:hover,
  html.unified-dark-mode .datetime-quick-btn:hover,
  html.unified-dark-mode .datetime-calendar-nav:hover {
    background: rgba(74, 108, 247, 0.16) !important;
    border-color: rgba(74, 108, 247, 0.52) !important;
    color: var(--ud-title) !important;
  }
  html.unified-dark-mode .datetime-time-field {
    background: rgba(45, 55, 72, 0.86) !important;
    border-color: var(--ud-border) !important;
    color: var(--ud-title) !important;
  }
  html.unified-dark-mode .datetime-time-field:focus {
    border-color: rgba(74, 108, 247, 0.58) !important;
    box-shadow: 0 0 0 3px rgba(74, 108, 247, 0.16) !important;
  }
  html.unified-dark-mode .subtask-item {
    background: rgba(45, 55, 72, 0.72) !important;
    border-color: var(--ud-border) !important;
  }
  html.unified-dark-mode .subtask-item:hover {
    background: rgba(45, 55, 72, 0.9) !important;
    border-color: rgba(74, 108, 247, 0.48) !important;
    box-shadow: 0 6px 16px rgba(74, 108, 247, 0.18) !important;
  }
  html.unified-dark-mode .subtask-action {
    background: rgba(26, 33, 48, 0.86) !important;
    border-color: var(--ud-border) !important;
    color: var(--ud-muted) !important;
  }
  html.unified-dark-mode .subtask-action:hover {
    background: rgba(74, 108, 247, 0.16) !important;
    border-color: rgba(74, 108, 247, 0.45) !important;
    color: #D9E2FF !important;
  }
  html.unified-dark-mode .subtask-compose {
    background: rgba(45, 55, 72, 0.82) !important;
    border-color: var(--ud-border) !important;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04) !important;
  }
  html.unified-dark-mode .subtask-compose:focus-within {
    border-color: rgba(74, 108, 247, 0.56) !important;
    box-shadow: 0 0 0 3px rgba(74, 108, 247, 0.16) !important;
  }
  html.unified-dark-mode .subtask-compose-input {
    color: var(--ud-title) !important;
  }
  html.unified-dark-mode .subtask-compose-input::placeholder {
    color: var(--ud-muted) !important;
  }
  html.unified-dark-mode .subtask-compose-btn {
    background: var(--ud-accent) !important;
    box-shadow: 0 8px 18px rgba(74, 108, 247, 0.24) !important;
  }
  html.unified-dark-mode .subtask-compose-btn:hover {
    box-shadow: 0 12px 24px rgba(74, 108, 247, 0.32) !important;
  }
  html.unified-dark-mode .btn-soft-danger {
    background: rgba(239, 68, 68, 0.14) !important;
    border-color: rgba(239, 68, 68, 0.36) !important;
    color: #FEB2B2 !important;
    box-shadow: none !important;
  }
  html.unified-dark-mode .btn-soft-danger:hover {
    background: rgba(239, 68, 68, 0.2) !important;
    border-color: rgba(239, 68, 68, 0.5) !important;
    color: #FECACA !important;
    box-shadow: 0 8px 20px rgba(239, 68, 68, 0.2) !important;
  }
  html.unified-dark-mode .glow-effect::before {
    background: linear-gradient(45deg, rgba(74, 108, 247, 0.42), rgba(74, 108, 247, 0.2), rgba(74, 108, 247, 0.42)) !important;
  }
  html.unified-dark-mode .glow-effect:hover::before {
    opacity: 0.72 !important;
  }
  html.unified-dark-mode .btn-primary.glow-effect::before,
  html.unified-dark-mode .checkin-btn.glow-effect::before {
    display: none !important;
  }

  html.unified-dark-mode .tag-work { background: rgba(74, 108, 247, 0.2) !important; color: #9DB2FF !important; border-color: rgba(74, 108, 247, 0.45) !important; }
  html.unified-dark-mode .tag-study { background: rgba(139, 92, 246, 0.2) !important; color: #C9AEFF !important; border-color: rgba(139, 92, 246, 0.45) !important; }
  html.unified-dark-mode .tag-life { background: rgba(236, 72, 153, 0.2) !important; color: #FFB8DF !important; border-color: rgba(236, 72, 153, 0.45) !important; }
  html.unified-dark-mode .tag-health { background: rgba(16, 185, 129, 0.2) !important; color: #99F6D0 !important; border-color: rgba(16, 185, 129, 0.45) !important; }
  html.unified-dark-mode .text-task-work { color: #9DB2FF !important; }
  html.unified-dark-mode .text-task-study { color: #C9AEFF !important; }
  html.unified-dark-mode .text-task-life { color: #FFB8DF !important; }
  html.unified-dark-mode .text-task-health { color: #99F6D0 !important; }
  html.unified-dark-mode .bg-task-work\\/10 { background: rgba(74, 108, 247, 0.16) !important; }
  html.unified-dark-mode .bg-task-study\\/10 { background: rgba(139, 92, 246, 0.16) !important; }
  html.unified-dark-mode .bg-task-life\\/10 { background: rgba(236, 72, 153, 0.16) !important; }
  html.unified-dark-mode .bg-task-health\\/10 { background: rgba(16, 185, 129, 0.16) !important; }

  html.unified-dark-mode.unified-page-todo aside {
    background: rgba(26, 33, 48, 0.9) !important;
    border-color: var(--ud-border) !important;
  }
  html.unified-dark-mode.unified-page-todo .sidebar-item {
    color: var(--ud-text) !important;
    border-color: transparent !important;
  }
  html.unified-dark-mode.unified-page-todo .sidebar-item:hover {
    background: rgba(45, 55, 72, 0.78) !important;
    color: var(--ud-title) !important;
  }
  html.unified-dark-mode.unified-page-todo .sidebar-item-active,
  html.unified-dark-mode.unified-page-todo .sidebar-item.active {
    background: rgba(35, 43, 59, 0.92) !important;
    color: var(--ud-title) !important;
    border-color: rgba(74, 108, 247, 0.38) !important;
    box-shadow: inset 3px 0 0 var(--ud-accent);
  }
  html.unified-dark-mode.unified-page-todo .task-card {
    background: rgba(35, 43, 59, 0.84) !important;
    border-color: var(--ud-border) !important;
  }

  html.unified-dark-mode.unified-page-calendar .calendar-cell {
    background: rgba(26, 33, 48, 0.86) !important;
    border-color: var(--ud-border) !important;
    color: var(--ud-text) !important;
  }
  html.unified-dark-mode.unified-page-calendar .calendar-cell.other-month {
    color: var(--ud-muted) !important;
    opacity: 0.78;
  }
  html.unified-dark-mode.unified-page-calendar .calendar-cell.today {
    border-color: rgba(74, 108, 247, 0.75) !important;
    background: rgba(74, 108, 247, 0.22) !important;
    color: var(--ud-title) !important;
  }
  html.unified-dark-mode.unified-page-calendar .calendar-cell:hover {
    background: rgba(45, 55, 72, 0.86) !important;
    border-color: rgba(74, 108, 247, 0.46) !important;
    box-shadow: 0 10px 24px rgba(74, 108, 247, 0.18) !important;
    transform: translateY(-2px);
  }
  html.unified-dark-mode.unified-page-calendar .task-pool-item {
    background: rgba(35, 43, 59, 0.82) !important;
    border-color: var(--ud-border) !important;
  }
  html.unified-dark-mode.unified-page-calendar .category-chip {
    background: rgba(45, 55, 72, 0.76) !important;
    border-color: rgba(74, 108, 247, 0.2) !important;
  }
  html.unified-dark-mode.unified-page-calendar .category-chip:hover {
    background: rgba(74, 108, 247, 0.18) !important;
    border-color: rgba(74, 108, 247, 0.46) !important;
    box-shadow: 0 8px 18px rgba(74, 108, 247, 0.18) !important;
  }
  html.unified-dark-mode.unified-page-calendar .category-chip-label {
    color: var(--ud-text) !important;
  }
  html.unified-dark-mode.unified-page-calendar .category-chip:hover .category-chip-label {
    color: var(--ud-title) !important;
  }
  html.unified-dark-mode.unified-page-calendar .category-chip-dot {
    box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.68), 0 4px 12px rgba(0, 0, 0, 0.26) !important;
  }
  html.unified-dark-mode.unified-page-calendar .card-hover:hover {
    box-shadow: 0 12px 30px rgba(74, 108, 247, 0.18) !important;
  }
  html.unified-dark-mode.unified-page-calendar .btn-primary,
  html.unified-dark-mode.unified-page-calendar .btn-primary.glow-effect,
  html.unified-dark-mode.unified-page-calendar .view-btn.active.btn-primary {
    background: var(--ud-accent) !important;
    border-color: rgba(74, 108, 247, 0.82) !important;
    box-shadow: 0 8px 20px rgba(74, 108, 247, 0.24) !important;
    color: var(--ud-title) !important;
  }
  html.unified-dark-mode.unified-page-calendar #today-btn.btn-primary,
  html.unified-dark-mode.unified-page-calendar .view-btn.active.btn-primary {
    filter: none !important;
  }
  html.unified-dark-mode.unified-page-calendar .btn-primary:hover,
  html.unified-dark-mode.unified-page-calendar .view-btn.active.btn-primary:hover,
  html.unified-dark-mode.unified-page-calendar .calendar-nav-btn:hover {
    background: rgba(74, 108, 247, 0.26) !important;
    border-color: rgba(74, 108, 247, 0.65) !important;
    box-shadow: 0 10px 24px rgba(74, 108, 247, 0.24) !important;
    color: var(--ud-title) !important;
  }
  html.unified-dark-mode.unified-page-calendar #detail-datetime-clear {
    background: rgba(45, 55, 72, 0.84) !important;
    border-color: var(--ud-border) !important;
    color: var(--ud-text) !important;
  }
  html.unified-dark-mode.unified-page-calendar #detail-datetime-clear:hover {
    background: rgba(74, 108, 247, 0.16) !important;
    border-color: rgba(74, 108, 247, 0.52) !important;
    color: var(--ud-title) !important;
  }

  html.unified-dark-mode.unified-page-pomodoro .task-card,
  html.unified-dark-mode.unified-page-pomodoro #task-cards .task-card {
    background: rgba(35, 43, 59, 0.84) !important;
    border-color: var(--ud-border) !important;
  }
  html.unified-dark-mode.unified-page-pomodoro .mode-btn:not(.active) {
    background: rgba(45, 55, 72, 0.82) !important;
    color: var(--ud-text) !important;
  }
  html.unified-dark-mode.unified-page-pomodoro .stat-box {
    background: rgba(45, 55, 72, 0.78) !important;
    border-color: var(--ud-border) !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.04) !important;
  }
  html.unified-dark-mode.unified-page-pomodoro aside .p-4 > div {
    background: rgba(35, 43, 59, 0.84) !important;
    border-color: var(--ud-border) !important;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.04) !important;
  }
  html.unified-dark-mode.unified-page-pomodoro #mode-tip {
    color: var(--ud-muted) !important;
  }

  html.unified-dark-mode.unified-page-report .chart-container,
  html.unified-dark-mode.unified-page-report #task-trend-chart,
  html.unified-dark-mode.unified-page-report #category-pie-chart,
  html.unified-dark-mode.unified-page-report #focus-bar-chart,
  html.unified-dark-mode.unified-page-report #focus-heatmap {
    background: rgba(35, 43, 59, 0.8) !important;
    border-color: var(--ud-border) !important;
  }
  html.unified-dark-mode.unified-page-report .stat-card .icon-wrapper {
    background: rgba(45, 55, 72, 0.86) !important;
    border: 1px solid var(--ud-border) !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.24) !important;
  }
  html.unified-dark-mode.unified-page-report .stat-card .icon-wrapper .text-success { color: var(--ud-success) !important; }
  html.unified-dark-mode.unified-page-report .stat-card .icon-wrapper .text-primary { color: var(--ud-accent) !important; }
  html.unified-dark-mode.unified-page-report .stat-card .icon-wrapper .text-danger { color: var(--ud-danger) !important; }
  html.unified-dark-mode.unified-page-report .stat-card .icon-wrapper .text-warning { color: var(--ud-warning) !important; }
  html.unified-dark-mode.unified-page-report .stat-card .icon-wrapper .text-secondary { color: #BDA8FF !important; }

  html.unified-dark-mode.unified-page-checkin .calendar-day {
    border-color: var(--ud-border) !important;
    background: rgba(26, 33, 48, 0.86) !important;
    color: var(--ud-text) !important;
  }
  html.unified-dark-mode.unified-page-checkin .calendar-day.today {
    border-color: rgba(74, 108, 247, 0.75) !important;
    background: rgba(74, 108, 247, 0.24) !important;
    color: var(--ud-title) !important;
    box-shadow: 0 6px 14px rgba(74, 108, 247, 0.26), inset 0 1px 0 rgba(255, 255, 255, 0.12) !important;
  }
  html.unified-dark-mode.unified-page-checkin .calendar-day.checked {
    border-color: rgba(16, 185, 129, 0.52) !important;
    background: rgba(16, 185, 129, 0.18) !important;
    color: #A7F3D0 !important;
  }
  html.unified-dark-mode.unified-page-checkin .bg-blue-50.text-blue-600 {
    background: rgba(74, 108, 247, 0.14) !important;
    color: #B7C8FF !important;
    border: 1px solid rgba(74, 108, 247, 0.34) !important;
  }
  html.unified-dark-mode.unified-page-checkin .bg-teal-50.text-teal-600 {
    background: rgba(16, 185, 129, 0.14) !important;
    color: #A7F3D0 !important;
    border: 1px solid rgba(16, 185, 129, 0.34) !important;
  }
  html.unified-dark-mode.unified-page-checkin .bg-blue-50.text-blue-600 .bg-blue-400 {
    background-color: rgba(96, 165, 250, 0.86) !important;
  }
  html.unified-dark-mode.unified-page-checkin .bg-teal-50.text-teal-600 .bg-teal-500 {
    background-color: rgba(45, 212, 191, 0.86) !important;
  }
  html.unified-dark-mode.unified-page-checkin .calendar-day:hover:not(.empty):not(.today) {
    border-color: rgba(74, 108, 247, 0.55) !important;
    background: rgba(74, 108, 247, 0.18) !important;
    color: var(--ud-title) !important;
    box-shadow: 0 8px 16px rgba(74, 108, 247, 0.18) !important;
  }
  html.unified-dark-mode.unified-page-checkin .calendar-day.empty {
    background: transparent !important;
    color: var(--ud-muted) !important;
  }
  html.unified-dark-mode.unified-page-calendar .calendar-cell.today {
    box-shadow: 0 6px 20px rgba(74, 108, 247, 0.26), inset 0 1px 0 rgba(255, 255, 255, 0.12) !important;
  }

  html.unified-dark-mode.unified-page-profile .custom-checkbox {
    background: rgba(45, 55, 72, 0.85) !important;
    border-color: var(--ud-border) !important;
  }
  html.unified-dark-mode.unified-page-profile .custom-checkbox:checked {
    background: var(--ud-accent) !important;
    border-color: var(--ud-accent) !important;
  }
  html.unified-dark-mode.unified-page-profile .theme-btn[data-theme="night"] {
    background: var(--ud-accent) !important;
    border-color: rgba(74, 108, 247, 0.82) !important;
    color: var(--ud-title) !important;
  }
  `;
  document.head.appendChild(style);
}

function initUnifiedDarkTheme() {
  var pageKey = getUnifiedPageKeyFromPath();
  if (!shouldEnableUnifiedDarkMode(pageKey)) return;
  ensureUnifiedDarkThemeStyle();
  applyUnifiedDarkModeClassByTheme(normalizeUnifiedThemeMode(resolveUnifiedThemeMode()));
}

var __unifiedPageTransitionLock = false;

function ensureUnifiedPageTransitionStyle() {
  if (document.getElementById('unified-page-transition-style')) return;
  var style = document.createElement('style');
  style.id = 'unified-page-transition-style';
  style.textContent = `
  :root {
    --unified-page-transition-duration: 260ms;
    --unified-page-transition-ease: cubic-bezier(0.22, 1, 0.36, 1);
  }
  html.unified-page-enter body {
    opacity: 0;
    transform: none;
  }
  html.unified-page-ready body {
    opacity: 1;
    transform: none;
    transition: opacity var(--unified-page-transition-duration) var(--unified-page-transition-ease);
  }
  html.unified-page-leaving body {
    opacity: 0;
    transform: none;
    transition: opacity var(--unified-page-transition-duration) var(--unified-page-transition-ease);
  }
  .view-btn,
  [data-view],
  .priority-btn,
  .modal-priority-btn,
  .modal-tag-btn {
    transition:
      transform 220ms ease,
      filter 220ms ease,
      box-shadow 220ms ease;
  }
  .view-btn:hover,
  [data-view]:hover,
  .priority-btn:hover,
  .modal-priority-btn:hover,
  .modal-tag-btn:hover {
    transform: translateY(-1px);
    filter: saturate(1.06);
  }
  .unified-switch-enter {
    animation: unifiedSwitchEnter 260ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  @keyframes unifiedSwitchEnter {
    from { opacity: 0; transform: translateY(10px) scale(0.995); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  @media (prefers-reduced-motion: reduce) {
    html.unified-page-ready body,
    html.unified-page-leaving body,
    html.unified-page-enter body {
      transition: none !important;
      transform: none !important;
      opacity: 1 !important;
    }
    .unified-switch-enter {
      animation: none !important;
    }
  }
  `;
  document.head.appendChild(style);
}

function markUnifiedPageEnter() {
  var root = document.documentElement;
  root.classList.add('unified-page-enter');
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      root.classList.add('unified-page-ready');
      root.classList.remove('unified-page-enter');
    });
  });
}

function runUnifiedSwitchEnterAnimation(el) {
  if (!el) return;
  if (el.dataset && el.dataset.unifiedSwitchAnimating === '1') return;
  if (el.dataset) el.dataset.unifiedSwitchAnimating = '1';
  el.classList.remove('unified-switch-enter');
  void el.offsetWidth;
  el.classList.add('unified-switch-enter');
  window.setTimeout(function () {
    if (el && el.dataset) delete el.dataset.unifiedSwitchAnimating;
  }, 0);
}

function navigateWithTransition(url) {
  if (!url) return;
  ensureUnifiedPageTransitionStyle();
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.location.href = url;
    return;
  }
  if (__unifiedPageTransitionLock) return;
  __unifiedPageTransitionLock = true;
  var root = document.documentElement;
  root.classList.add('unified-page-ready');
  root.classList.add('unified-page-leaving');
  window.setTimeout(function () {
    window.location.href = url;
  }, 120);
}

function initUnifiedPageTransitions() {
  if (window.__unifiedPageTransitionsInited) return;
  window.__unifiedPageTransitionsInited = true;
  ensureUnifiedPageTransitionStyle();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', markUnifiedPageEnter);
  } else {
    markUnifiedPageEnter();
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var link = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!link) return;
    if (link.hasAttribute('download')) return;
    var target = (link.getAttribute('target') || '').toLowerCase();
    if (target && target !== '_self') return;
    var href = link.getAttribute('href') || '';
    if (!href || href.charAt(0) === '#') return;
    if (/^(mailto|tel|javascript):/i.test(href)) return;

    var parsed;
    try {
      parsed = new URL(href, window.location.href);
    } catch (err) {
      return;
    }
    if (parsed.origin !== window.location.origin) return;
    if (
      parsed.pathname === window.location.pathname &&
      parsed.search === window.location.search &&
      parsed.hash &&
      parsed.hash !== '#'
    ) {
      return;
    }
    e.preventDefault();
    navigateWithTransition(parsed.href);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      document.querySelectorAll('.calendar-view:not(.hidden), .tab-pane:not(.hidden), .view-panel:not(.hidden)').forEach(function (el) {
        runUnifiedSwitchEnterAnimation(el);
      });
      if (window.MutationObserver && document.body) {
        var observer = new MutationObserver(function (mutations) {
          mutations.forEach(function (mutation) {
            if (mutation.type !== 'attributes' || mutation.attributeName !== 'class') return;
            var target = mutation.target;
            if (!target || !target.matches) return;
            if (!target.matches('.calendar-view, .tab-pane, .view-panel, [data-switch-panel]')) return;
            if (target.classList.contains('hidden')) return;
            var oldClass = typeof mutation.oldValue === 'string' ? mutation.oldValue : '';
            var wasHidden = /\bhidden\b/.test(oldClass);
            if (!wasHidden) return;
            if (target.dataset && target.dataset.unifiedSwitchAnimating === '1') return;
            runUnifiedSwitchEnterAnimation(target);
          });
        });
        observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'], attributeOldValue: true });
      }
    });
  } else {
    document.querySelectorAll('.calendar-view:not(.hidden), .tab-pane:not(.hidden), .view-panel:not(.hidden)').forEach(function (el) {
      runUnifiedSwitchEnterAnimation(el);
    });
    if (window.MutationObserver && document.body) {
      var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
          if (mutation.type !== 'attributes' || mutation.attributeName !== 'class') return;
          var target = mutation.target;
          if (!target || !target.matches) return;
          if (!target.matches('.calendar-view, .tab-pane, .view-panel, [data-switch-panel]')) return;
          if (target.classList.contains('hidden')) return;
          var oldClass = typeof mutation.oldValue === 'string' ? mutation.oldValue : '';
          var wasHidden = /\bhidden\b/.test(oldClass);
          if (!wasHidden) return;
          if (target.dataset && target.dataset.unifiedSwitchAnimating === '1') return;
          runUnifiedSwitchEnterAnimation(target);
        });
      });
      observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'], attributeOldValue: true });
    }
  }
}

function safeNavigate(url) {
  navigateWithTransition(url);
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

function normalizeApiBaseCandidate(base) {
  var value = String(base == null ? '' : base).trim();
  if (!value) return '';
  var lowered = value.toLowerCase();
  if (lowered === 'undefined' || lowered === 'null') return '';
  return value.replace(/\/$/, '');
}

function resolveApiBase() {
  var explicitBase = normalizeApiBaseCandidate(window.__API_BASE__);
  if (explicitBase) {
    return explicitBase;
  }

  try {
    var storedBase = normalizeApiBaseCandidate(localStorage.getItem('apiBase'));
    if (storedBase) {
      return storedBase;
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
  var timeoutMs = typeof options.timeoutMs === 'number' ? options.timeoutMs : 10000;
  // 优先级：window.__API_BASE__ > localStorage.apiBase > 同源；同源失败时自动回退 localhost:8080
  var explicitBase = normalizeApiBaseCandidate(window.__API_BASE__);
  var storedBase = '';
  try {
    storedBase = normalizeApiBaseCandidate(localStorage.getItem('apiBase'));
  } catch (e) {
    storedBase = '';
  }

  var candidateBases = [];
  if (explicitBase) candidateBases.push(explicitBase);
  if (storedBase && candidateBases.indexOf(storedBase) === -1) candidateBases.push(storedBase);

  var protocol = (window.location && window.location.protocol) || '';
  var hostname = ((window.location && window.location.hostname) || '').toLowerCase();
  var isLocalRuntime = hostname === 'localhost' || hostname === '127.0.0.1';
  var hasExplicitPort = /:\d+$/.test((window.location && window.location.host) || '');
  if (!explicitBase && !storedBase && (protocol === 'http:' || protocol === 'https:')) {
    candidateBases.push(window.location.origin);
  }
  if (!isLocalRuntime && (protocol === 'http:' || protocol === 'https:')) {
    var backupOrigin = hasExplicitPort
      ? window.location.origin.replace(/:\d+$/, ':7833')
      : window.location.origin + ':7833';
    if (candidateBases.indexOf(backupOrigin) === -1) candidateBases.push(backupOrigin);
  }
  if (isLocalRuntime && candidateBases.indexOf('http://localhost:8080') === -1) {
    candidateBases.push('http://localhost:8080');
  }

  function sanitizeBase(base) {
    return String(base || '').replace(/\/+$/, '');
  }

  function parseResponse(res) {
    var contentType = (res.headers && res.headers.get && res.headers.get('content-type')) || '';
    if (contentType.indexOf('application/json') > -1) {
      return res.json().catch(function () { return { status: res.status }; }).then(function (body) {
        return { status: res.status, body: body };
      });
    }
    return res.text().then(function (text) {
      return { status: res.status, body: { status: res.status, rawText: text } };
    }).catch(function () {
      return { status: res.status, body: { status: res.status } };
    });
  }

  function shouldFallback(resp) {
    if (!path || path.indexOf('/api/') !== 0) return false;
    if (!resp) return true;
    if (resp.status === 401 || resp.status === 403) return false;
    if (resp.status >= 500) return true;
    if (resp.status === 404 || resp.status === 405) return true;
    if (!resp.body) return true;
    // 非标准 Result 结构（例如静态服务返回 HTML）时允许回退重试
    if (typeof resp.body.code === 'undefined' && typeof resp.body.message === 'undefined') return true;
    return false;
  }

  function fetchWithTimeout(url, reqOptions) {
    if (!window.AbortController || !timeoutMs || timeoutMs <= 0) {
      return fetch(url, reqOptions);
    }
    var controller = new AbortController();
    var timer = setTimeout(function () {
      try { controller.abort(); } catch (e) {}
    }, timeoutMs);
    var merged = Object.assign({}, reqOptions, { signal: controller.signal });
    return fetch(url, merged).finally(function () {
      clearTimeout(timer);
    });
  }

  var headers = options.headers || {};
  headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  var token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }
  options.headers = headers;

  if (path.startsWith('http')) {
    return fetchWithTimeout(path, options).then(parseResponse).catch(function (err) {
      return { status: 0, body: { message: err && err.name === 'AbortError' ? 'Request timeout' : 'Network error' } };
    });
  }

  var idx = 0;
  function tryNext(lastResp) {
    if (idx >= candidateBases.length) {
      return Promise.resolve(lastResp || { status: 0, body: { message: 'Network error' } });
    }
    var base = sanitizeBase(candidateBases[idx++]);
    var url = base + path;
    return fetchWithTimeout(url, options).then(parseResponse).then(function (resp) {
      if (idx < candidateBases.length && shouldFallback(resp)) {
        return tryNext(resp);
      }
      return resp;
    }).catch(function (err) {
      if (err && err.name === 'AbortError') {
        return tryNext({ status: 0, body: { message: 'Request timeout' } });
      }
      return tryNext(lastResp);
    });
  }

  return tryNext();
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

  // validate token by calling /api/me. Only explicit auth failures (401/403) should force logout.
  return apiRequest('/api/me', { method: 'GET' }).then(function (resp) {
    if (resp && resp.status === 200 && resp.body && resp.body.code === 200) {
      // token valid
      try {
        var u = resp.body.data || {};
        if (window.AppState) {
          var normalizedUser = {
            id: u.id,
            name: u.nickname || u.email || '',
            email: u.email || '',
            phone: u.phone || '',
            avatar: u.avatarUrl || '',
            level: typeof u.level === 'number' ? u.level : 1,
            exp: typeof u.exp === 'number' ? u.exp : 0,
            twoStepEnabled: !!u.twoStepEnabled,
            securityPhone: u.securityPhone || u.phone || '',
            wechatBound: !!u.wechatBound,
            appleBound: !!u.appleBound,
            googleBound: !!u.googleBound
          };

          if (typeof window.AppState.switchUser === 'function') {
            window.AppState.switchUser(normalizedUser);
          } else {
            window.AppState.user = Object.assign({}, window.AppState.user || {}, normalizedUser);
            if (typeof window.AppState.save === 'function') window.AppState.save();
          }
        }
      } catch (e) {}
      if (!silent) console.info('auth: token valid');
      return Promise.resolve(resp.body.data);
    }
    // Only explicit auth failures should clear token.
    if (resp && (resp.status === 401 || resp.status === 403)) {
      if (!silent) console.warn('auth: token invalid or expired', resp);
      try { localStorage.removeItem('token'); } catch (e) {}
      if (window.AppState && typeof window.AppState.logout === 'function') window.AppState.logout();
      if (redirect) safeNavigate('登录页面.html');
      return Promise.reject(new Error('invalid-token'));
    }

    // For network/service exceptions, keep local session to preserve local usability.
    if (!silent) console.warn('auth: validation degraded, keeping local session', resp);
    return Promise.resolve(window.AppState && window.AppState.user ? window.AppState.user : {});
  }).catch(function (err) {
    // Unexpected runtime error: keep local session to avoid blocking local pages.
    if (!silent) console.warn('auth: validation failed, keeping local session', err);
    return Promise.resolve(window.AppState && window.AppState.user ? window.AppState.user : {});
  });
}

function getAiServiceConfig() {
  var baseUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
  var token = '';
  var model = 'qwen2.5-vl-72b-instruct';
  try {
    baseUrl = localStorage.getItem('aiApiBaseUrl') || baseUrl;
    token = localStorage.getItem('aiApiToken') || token;
    model = localStorage.getItem('aiApiModel') || model;
  } catch (e) { /* ignore localStorage errors */ }
  return {
    baseUrl: String(baseUrl || '').replace(/\/$/, ''),
    token: String(token || '').trim(),
    model: String(model || 'qwen2.5-vl-72b-instruct').trim() || 'qwen2.5-vl-72b-instruct'
  };
}

function callAiChatCompletion(messages, options) {
  options = options || {};
  var cfg = getAiServiceConfig();

  function callDirectProvider() {
    if (!cfg.token) {
      return Promise.reject(new Error('ai-token-missing'));
    }
    var endpoint = cfg.baseUrl + '/chat/completions';
    return fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + cfg.token
      },
      body: JSON.stringify({
        model: options.model || cfg.model,
        temperature: typeof options.temperature === 'number' ? options.temperature : 0.4,
        max_tokens: typeof options.maxTokens === 'number' ? options.maxTokens : 800,
        messages: Array.isArray(messages) ? messages : []
      })
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) {
        if (!res.ok) {
          var msg = body && body.error && body.error.message ? body.error.message : ('AI 请求失败: ' + res.status);
          throw new Error(msg);
        }
        var content = body && body.choices && body.choices[0] && body.choices[0].message && body.choices[0].message.content;
        if (!content) throw new Error('AI 返回内容为空');
        return String(content);
      });
    });
  }

  return apiRequest('/api/ai/chat', {
    method: 'POST',
    body: JSON.stringify({
      model: options.model || cfg.model,
      temperature: typeof options.temperature === 'number' ? options.temperature : 0.4,
      maxTokens: typeof options.maxTokens === 'number' ? options.maxTokens : 800,
      messages: Array.isArray(messages) ? messages : []
    })
  }).then(function (res) {
    if (res && res.status === 200 && res.body && res.body.code === 200 && res.body.data && res.body.data.content) {
      return String(res.body.data.content);
    }
    var msg = res && res.body && res.body.message ? res.body.message : 'AI 代理请求失败';
    throw new Error(msg);
  }).catch(function () {
    return callDirectProvider();
  });
}

function parseAiJsonContent(content) {
  var text = String(content || '').trim();
  if (!text) throw new Error('AI 内容为空');

  // Support markdown code fences.
  var fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence && fence[1]) text = fence[1].trim();

  return JSON.parse(text);
}

window.AiService = {
  getConfig: getAiServiceConfig,
  chat: callAiChatCompletion,
  parseJson: parseAiJsonContent
};

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
    position: relative;
    isolation: isolate;
    display: flex !important;
    align-items: stretch !important;
    justify-content: center !important;
    gap: 14px !important;
    width: fit-content;
    max-width: calc(100vw - 28px);
    padding: 10px 18px;
    border-radius: 9999px;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.015), rgba(255, 255, 255, 0.006));
    border: 1px solid rgba(255, 255, 255, 0.28);
    box-shadow: 0 18px 42px rgba(15, 23, 42, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.52), inset 0 -1px 0 rgba(255, 255, 255, 0.14);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
  }
  .unified-bottom-tab-dock .unified-tab-row::before {
    content: "";
    position: absolute;
    inset: -12px -18px -10px -18px;
    border-radius: 9999px;
    background:
      radial-gradient(120% 90% at 50% 48%, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0.1) 42%, rgba(255, 255, 255, 0) 76%),
      radial-gradient(120% 75% at 50% 100%, rgba(15, 23, 42, 0.1) 0%, rgba(15, 23, 42, 0) 72%);
    filter: blur(9px);
    opacity: 0.9;
    pointer-events: none;
    z-index: -2;
  }
  .unified-bottom-tab-dock .unified-tab-row::after {
    content: "";
    position: absolute;
    inset: 1px;
    border-radius: inherit;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0.16) 46%, rgba(15, 23, 42, 0.1) 100%);
    mix-blend-mode: screen;
    opacity: 0.55;
    pointer-events: none;
    z-index: -1;
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
    transition: background 220ms ease, color 220ms ease, box-shadow 220ms ease, transform 220ms ease, filter 220ms ease;
  }
  .unified-bottom-tab-dock .unified-tab-label {
    font-size: 11px;
    line-height: 1.05;
    font-weight: 600;
    letter-spacing: 0.18px;
    white-space: nowrap;
    transition: text-shadow 220ms ease, filter 220ms ease;
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
  .unified-bottom-tab-dock .unified-tab-item:not(.active):hover .unified-tab-icon {
    filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.4));
  }
  .unified-bottom-tab-dock .unified-tab-item:not(.active):hover .unified-tab-label {
    text-shadow: 0 0 6px rgba(255, 255, 255, 0.36);
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

function ensureUnifiedMobileAdaptationStyle() {
  if (document.getElementById('unified-mobile-adaptation-style')) return;
  var style = document.createElement('style');
  style.id = 'unified-mobile-adaptation-style';
  style.textContent = `
  @media (max-width: 768px) {
    html, body {
      width: 100%;
      max-width: 100%;
      overflow-x: hidden !important;
    }
    body {
      min-width: 0;
    }

    .unified-top-header-dock .unified-top-header-shell .container,
    .unified-top-header-dock .unified-top-header-shell > div:first-child {
      padding: 8px 10px !important;
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
      flex-wrap: wrap !important;
    }
    .unified-top-header-dock .unified-top-header-shell .container > *,
    .unified-top-header-dock .unified-top-header-shell > div:first-child > * {
      min-width: 0;
    }
    .unified-top-header-dock .unified-top-header-shell .container > :nth-child(1),
    .unified-top-header-dock .unified-top-header-shell > div:first-child > :nth-child(1) {
      order: 1;
      flex: 1 1 auto;
    }
    .unified-top-header-dock .unified-top-header-shell .container > :nth-child(3),
    .unified-top-header-dock .unified-top-header-shell > div:first-child > :nth-child(3) {
      order: 2;
      flex: 0 0 auto;
      margin-left: auto;
    }
    .unified-top-header-dock .unified-top-header-shell .container > :nth-child(2),
    .unified-top-header-dock .unified-top-header-shell > div:first-child > :nth-child(2) {
      order: 3;
      flex: 1 1 100%;
      width: 100%;
      overflow-x: auto;
      overflow-y: hidden;
      white-space: nowrap;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      padding-bottom: 2px;
    }
    .unified-top-header-dock .unified-top-header-shell .container > :nth-child(2)::-webkit-scrollbar,
    .unified-top-header-dock .unified-top-header-shell > div:first-child > :nth-child(2)::-webkit-scrollbar {
      display: none;
    }
    .unified-top-header-dock .unified-top-header-shell h1,
    .unified-top-header-dock .unified-top-header-shell .text-lg,
    .unified-top-header-dock .unified-top-header-shell .text-xl {
      font-size: 16px !important;
      line-height: 1.25 !important;
    }
    .unified-top-header-dock .unified-top-header-shell .btn-primary,
    .unified-top-header-dock .unified-top-header-shell .btn-glass,
    .unified-top-header-dock .unified-top-header-shell .glass-card,
    .unified-top-header-dock .unified-top-header-shell .custom-select-trigger {
      padding: 6px 10px !important;
      border-radius: 10px !important;
      font-size: 12px !important;
    }

    .unified-bottom-tab-dock {
      left: 0 !important;
      right: 0 !important;
      width: auto !important;
      max-width: none !important;
      transform: none !important;
      padding: 0 8px;
      bottom: calc(8px + env(safe-area-inset-bottom, 0px));
    }
    .unified-bottom-tab-dock.unified-bottom-tab-dock-hidden {
      transform: translateY(10px) !important;
    }
    .unified-bottom-tab-dock .unified-tab-row {
      width: 100% !important;
      max-width: none !important;
      justify-content: space-between !important;
      gap: 2px !important;
      padding: 8px 6px !important;
      border-radius: 20px !important;
    }
    .unified-bottom-tab-dock .unified-tab-item {
      flex: 1 1 0 !important;
      min-width: 0 !important;
      padding: 6px 2px !important;
      border-radius: 12px !important;
    }
    .unified-bottom-tab-dock .unified-tab-label {
      font-size: 10px !important;
    }

    main,
    section,
    article,
    .glass-card,
    .glass-max,
    .chart-container,
    .task-card,
    .calendar-container {
      min-width: 0 !important;
      max-width: 100% !important;
    }
    main.overflow-x-visible,
    main[style*="overflow-x: visible"] {
      overflow-x: hidden !important;
    }
    img,
    canvas,
    svg {
      max-width: 100%;
      height: auto;
    }
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
  // Guardrail: avoid abnormal huge offset caused by browser/render quirks.
  maxHeight = Math.max(48, Math.min(maxHeight, 180));
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
ensureUnifiedMobileAdaptationStyle();
ensureUnifiedDropdownTransitionStyle();
initUnifiedDarkTheme();
initUnifiedPageTransitions();
document.documentElement.classList.add('unified-top-preparing');

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initUnifiedTopHeaders);
} else {
  initUnifiedTopHeaders();
}
window.addEventListener('resize', syncUnifiedTopHeaderSpace);
window.addEventListener('resize', syncUnifiedTopContentOffset);

function ensureUnifiedDropdownTransitionStyle() {
  var existing = document.getElementById('unified-dropdown-transition-style');
  if (existing) {
    if (existing.parentNode === document.head) {
      document.head.appendChild(existing);
    }
    return;
  }

  var style = document.createElement('style');
  style.id = 'unified-dropdown-transition-style';
  style.textContent = `
  :root {
    --unified-dropdown-open-duration: 300ms;
    --unified-dropdown-open-ease: cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }
  .custom-select-dropdown,
  .dropdown-menu,
  .unified-avatar-trigger-group .unified-avatar-menu {
    display: block !important;
    opacity: 0 !important;
    visibility: hidden !important;
    pointer-events: none !important;
    max-height: 0 !important;
    overflow: hidden !important;
    transform: translateY(-10px) !important;
    transition:
      opacity var(--unified-dropdown-open-duration) var(--unified-dropdown-open-ease),
      transform var(--unified-dropdown-open-duration) var(--unified-dropdown-open-ease),
      max-height var(--unified-dropdown-open-duration) var(--unified-dropdown-open-ease),
      visibility 0s linear var(--unified-dropdown-open-duration) !important;
  }
  .dropdown-menu.hidden {
    display: block !important;
  }
  .custom-select-dropdown.show,
  .dropdown-menu.show,
  .unified-avatar-trigger-group.unified-avatar-open .unified-avatar-menu {
    opacity: 1 !important;
    visibility: visible !important;
    pointer-events: auto !important;
    max-height: min(320px, 60vh) !important;
    transform: translateY(0) !important;
    transition-delay: 0s !important;
  }
  .datetime-select-menu.show {
    overflow-y: auto !important;
    overflow-x: hidden !important;
  }
  .datetime-select-menu.date-calendar-menu.show {
    max-height: none !important;
    overflow: visible !important;
  }
  .datetime-select-menu.time-custom-menu.show {
    overflow: hidden !important;
  }
  .custom-select-dropdown .custom-select-option,
  .dropdown-menu .dropdown-item,
  .dropdown-menu .datetime-select-option,
  .dropdown-menu > a,
  .unified-avatar-trigger-group .unified-avatar-menu a {
    opacity: 0;
    transform: translateX(-10px);
  }
  .custom-select-dropdown.show .custom-select-option,
  .dropdown-menu.show .dropdown-item,
  .dropdown-menu.show .datetime-select-option,
  .dropdown-menu.show > a,
  .unified-avatar-trigger-group.unified-avatar-open .unified-avatar-menu a {
    animation: unifiedDropdownOptionSlideIn 0.3s ease-out forwards;
  }
  .custom-select-dropdown.show > :nth-child(1),
  .dropdown-menu.show > :nth-child(1),
  .unified-avatar-trigger-group.unified-avatar-open .unified-avatar-menu > :nth-child(1) { animation-delay: 0.05s; }
  .custom-select-dropdown.show > :nth-child(2),
  .dropdown-menu.show > :nth-child(2),
  .unified-avatar-trigger-group.unified-avatar-open .unified-avatar-menu > :nth-child(2) { animation-delay: 0.1s; }
  .custom-select-dropdown.show > :nth-child(3),
  .dropdown-menu.show > :nth-child(3),
  .unified-avatar-trigger-group.unified-avatar-open .unified-avatar-menu > :nth-child(3) { animation-delay: 0.15s; }
  .custom-select-dropdown.show > :nth-child(4),
  .dropdown-menu.show > :nth-child(4),
  .unified-avatar-trigger-group.unified-avatar-open .unified-avatar-menu > :nth-child(4) { animation-delay: 0.2s; }
  .custom-select-dropdown.show > :nth-child(5),
  .dropdown-menu.show > :nth-child(5),
  .unified-avatar-trigger-group.unified-avatar-open .unified-avatar-menu > :nth-child(5) { animation-delay: 0.25s; }
  .custom-select-dropdown.show > :nth-child(n+6),
  .dropdown-menu.show > :nth-child(n+6),
  .unified-avatar-trigger-group.unified-avatar-open .unified-avatar-menu > :nth-child(n+6) { animation-delay: 0.3s; }
  @keyframes unifiedDropdownOptionSlideIn {
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  `;
  document.head.appendChild(style);
}

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
    background: rgba(255, 255, 255, 0.95) !important;
    backdrop-filter: blur(24px) saturate(180%) !important;
    -webkit-backdrop-filter: blur(24px) saturate(180%) !important;
    border: 1px solid rgba(255, 255, 255, 0.72) !important;
    box-shadow: 0 18px 42px rgba(15, 23, 42, 0.14) !important;
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
    color: #374151 !important;
    transition: color 180ms ease, background-color 180ms ease;
  }
  .unified-avatar-trigger-group .unified-avatar-menu a i {
    color: #6b7280 !important;
  }
  .unified-avatar-trigger-group .unified-avatar-menu .text-gray-800 {
    color: #1f2937 !important;
  }
  .unified-avatar-trigger-group .unified-avatar-menu .text-gray-700,
  .unified-avatar-trigger-group .unified-avatar-menu .text-gray-600,
  .unified-avatar-trigger-group .unified-avatar-menu .text-gray-500 {
    color: #6b7280 !important;
  }
  .unified-avatar-trigger-group .unified-avatar-menu .border-t,
  .unified-avatar-trigger-group .unified-avatar-menu .border-b,
  .unified-avatar-trigger-group .unified-avatar-menu .border-gray-100,
  .unified-avatar-trigger-group .unified-avatar-menu .border-gray-200 {
    border-color: rgba(226, 232, 240, 0.75) !important;
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
  html.unified-dark-mode .unified-avatar-trigger-group .unified-avatar-menu {
    background: rgba(26, 33, 48, 0.96) !important;
    border-color: var(--ud-border) !important;
    box-shadow: 0 16px 34px rgba(0, 0, 0, 0.34) !important;
  }
  html.unified-dark-mode .unified-avatar-trigger-group .unified-avatar-menu a {
    color: var(--ud-text) !important;
  }
  html.unified-dark-mode .unified-avatar-trigger-group .unified-avatar-menu a i {
    color: var(--ud-muted) !important;
  }
  html.unified-dark-mode .unified-avatar-trigger-group .unified-avatar-menu .text-gray-800,
  html.unified-dark-mode .unified-avatar-trigger-group .unified-avatar-menu .text-gray-700,
  html.unified-dark-mode .unified-avatar-trigger-group .unified-avatar-menu .font-medium {
    color: var(--ud-title) !important;
  }
  html.unified-dark-mode .unified-avatar-trigger-group .unified-avatar-menu .text-gray-600,
  html.unified-dark-mode .unified-avatar-trigger-group .unified-avatar-menu .text-gray-500 {
    color: var(--ud-muted) !important;
  }
  html.unified-dark-mode .unified-avatar-trigger-group .unified-avatar-menu .border-t,
  html.unified-dark-mode .unified-avatar-trigger-group .unified-avatar-menu .border-b,
  html.unified-dark-mode .unified-avatar-trigger-group .unified-avatar-menu .border-gray-100,
  html.unified-dark-mode .unified-avatar-trigger-group .unified-avatar-menu .border-gray-200 {
    border-color: var(--ud-border) !important;
  }
  `;
  document.head.appendChild(style);
}

function applyUnifiedAvatarDropdownTheme() {
  var path = '';
  try { path = decodeURIComponent((window.location && window.location.pathname) || ''); } catch (e) { path = (window.location && window.location.pathname) || ''; }
  var isUnifiedDark = document.documentElement && document.documentElement.classList.contains('unified-dark-mode');

  var theme = {
    bg: 'rgba(79, 70, 229, 0.14)',
    color: '#4F46E5'
  };

  if (isUnifiedDark) {
    theme = { bg: 'rgba(74, 108, 247, 0.2)', color: '#D9E2FF' };
  } else if (path.indexOf('番茄钟页面') !== -1) {
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
  ensureUnifiedDropdownTransitionStyle();

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

function ensureUnifiedThemeStyle() {
  if (document.getElementById('unified-theme-style')) return;
  var style = document.createElement('style');
  style.id = 'unified-theme-style';
  style.textContent = `
  body.theme-light {
    color-scheme: light;
  }
  html:not(.unified-dark-mode) body.theme-light [class*="hover:bg-primary/"]:hover {
    background-color: rgba(59, 130, 246, 0.12) !important;
  }
  html:not(.unified-dark-mode) body.theme-light [class*="hover:bg-danger/"]:hover {
    background-color: rgba(239, 68, 68, 0.1) !important;
  }
  html:not(.unified-dark-mode) body.theme-light [class*="hover:bg-gray-50"]:hover,
  html:not(.unified-dark-mode) body.theme-light [class*="hover:bg-gray-100"]:hover,
  html:not(.unified-dark-mode) body.theme-light [class*="hover:bg-white"]:hover {
    background-color: rgba(15, 23, 42, 0.05) !important;
  }
  html:not(.unified-dark-mode) body.theme-light [class*="hover:border-primary"]:hover {
    border-color: rgba(59, 130, 246, 0.45) !important;
  }
  html:not(.unified-dark-mode) body.theme-light [class*="hover:border-gray-"]:hover {
    border-color: rgba(148, 163, 184, 0.5) !important;
  }
  html:not(.unified-dark-mode) body.theme-light .btn-social {
    background: rgba(255, 255, 255, 0.95) !important;
    border-color: rgba(209, 213, 219, 0.9) !important;
  }
  html:not(.unified-dark-mode) body.theme-light .btn-social:hover {
    background: rgba(255, 255, 255, 1) !important;
    box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08) !important;
  }
  html:not(.unified-dark-mode) body.theme-light .btn-social .social-text {
    color: #4b5563 !important;
  }
  html:not(.unified-dark-mode) body.theme-light .auth-alt-divider {
    background: rgba(255, 255, 255, 0.98) !important;
    color: #4b5563 !important;
    border-color: rgba(209, 213, 219, 0.9) !important;
  }
  html:not(.unified-dark-mode) body.theme-light .auth-switch-note {
    color: #374151 !important;
  }
  body.theme-night {
    color-scheme: dark;
    --night-bg-0: #0b1220;
    --night-bg-1: #111827;
    --night-bg-2: #162032;
    --night-surface-0: rgba(19, 27, 40, 0.72);
    --night-surface-1: rgba(24, 35, 52, 0.8);
    --night-surface-2: rgba(30, 44, 64, 0.88);
    --night-border: rgba(148, 163, 184, 0.26);
    --night-text-main: #f1f5f9;
    --night-text-sub: #cbd5e1;
    --night-text-muted: #a8b5c9;
    background: radial-gradient(1200px 600px at 10% -10%, #1a2740 0%, transparent 50%), radial-gradient(1000px 560px at 100% 0%, #1d2438 0%, transparent 55%), linear-gradient(135deg, var(--night-bg-0) 0%, var(--night-bg-1) 48%, var(--night-bg-2) 100%) !important;
    color: var(--night-text-main) !important;
  }
  body.theme-night .bg-orb {
    opacity: 0.08 !important;
  }
  body.theme-night .glass,
  body.theme-night .glass-input,
  body.theme-night .input-glass,
  body.theme-night .custom-select,
  body.theme-night .custom-checkbox,
  body.theme-night .custom-select-trigger,
  body.theme-night .task-card,
  body.theme-night .stat-card,
  body.theme-night .card-shadow,
  body.theme-night .card-hover {
    background: var(--night-surface-0) !important;
    border-color: var(--night-border) !important;
    color: var(--night-text-main) !important;
    box-shadow: 0 8px 22px rgba(0, 0, 0, 0.2);
  }
  body.theme-night .glass-strong,
  body.theme-night .glass-max,
  body.theme-night .glass-header,
  body.theme-night .glass-card,
  body.theme-night .glass-tab,
  body.theme-night .user-card,
  body.theme-night .setting-item,
  body.theme-night .custom-select-dropdown,
  body.theme-night .modal-content,
  body.theme-night .confirm-modal-card,
  body.theme-night .notification-toast {
    background: var(--night-surface-1) !important;
    border-color: var(--night-border) !important;
    color: var(--night-text-main) !important;
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.28);
  }
  body.theme-night .setting-item:hover,
  body.theme-night .task-card:hover,
  body.theme-night .card-hover:hover {
    background: rgba(30, 41, 59, 0.62) !important;
  }
  body.theme-night .text-gray-900,
  body.theme-night .text-gray-800,
  body.theme-night .text-gray-700,
  body.theme-night .text-gray-600,
  body.theme-night .text-black,
  body.theme-night .text-dark {
    color: var(--night-text-main) !important;
  }
  body.theme-night .text-gray-500,
  body.theme-night .text-gray-400 {
    color: var(--night-text-sub) !important;
  }
  body.theme-night .text-xs,
  body.theme-night .text-sm {
    color: var(--night-text-sub);
  }
  body.theme-night p,
  body.theme-night li,
  body.theme-night label,
  body.theme-night .unified-toast-text,
  body.theme-night .subtask-item span {
    color: var(--night-text-sub) !important;
  }
  body.theme-night h1,
  body.theme-night h2,
  body.theme-night h3,
  body.theme-night h4,
  body.theme-night .font-semibold,
  body.theme-night .font-bold {
    color: var(--night-text-main) !important;
  }
  body.theme-night .bg-white,
  body.theme-night .bg-white\/95,
  body.theme-night .bg-white\/90,
  body.theme-night .bg-white\/85,
  body.theme-night .bg-white\/80,
  body.theme-night .bg-white\/70,
  body.theme-night .bg-gray-50,
  body.theme-night .bg-gray-100,
  body.theme-night .bg-light {
    background-color: var(--night-surface-0) !important;
    color: var(--night-text-main) !important;
  }
  body.theme-night .border-gray-100,
  body.theme-night .border-gray-200,
  body.theme-night .border-gray-300,
  body.theme-night .border-white,
  body.theme-night .border-white\/50,
  body.theme-night .border-white\/40,
  body.theme-night .border-white\/30,
  body.theme-night .border-white\/20 {
    border-color: var(--night-border) !important;
  }
  body.theme-night input,
  body.theme-night textarea,
  body.theme-night select,
  body.theme-night .input-glass,
  body.theme-night .glass-input,
  body.theme-night .modal-input,
  body.theme-night .custom-select,
  body.theme-night .custom-checkbox {
    background: var(--night-surface-2) !important;
    color: var(--night-text-main) !important;
    border-color: rgba(148, 163, 184, 0.34) !important;
  }
  body.theme-night input::placeholder,
  body.theme-night textarea::placeholder {
    color: var(--night-text-muted) !important;
  }
  body.theme-night .custom-select-option {
    color: var(--night-text-main) !important;
  }
  body.theme-night .custom-select-option:hover,
  body.theme-night .custom-select-option.selected,
  body.theme-night .dropdown-menu a:hover {
    background: rgba(71, 85, 105, 0.55) !important;
    color: #e2e8f0 !important;
  }
  body.theme-night .btn-secondary-glass {
    background: var(--night-surface-1) !important;
    color: var(--night-text-main) !important;
    border-color: var(--night-border) !important;
  }
  body.theme-night .task-actions .task-action-btn,
  body.theme-night .btn-secondary-glass.text-danger,
  body.theme-night .text-danger {
    color: #fca5a5 !important;
  }
  body.theme-night .bg-primary,
  body.theme-night .bg-secondary,
  body.theme-night .btn-primary,
  body.theme-night .btn-primary-glass,
  body.theme-night .text-primary.bg-white,
  body.theme-night .theme-btn.bg-primary {
    background: #3b4f6c !important;
    color: #f8fafc !important;
    border-color: rgba(148, 163, 184, 0.34) !important;
    box-shadow: none !important;
  }
  body.theme-night .hover\:bg-primary\/10:hover,
  body.theme-night .hover\:bg-primary\/15:hover,
  body.theme-night .hover\:bg-primary\/20:hover,
  body.theme-night .bg-primary\/10,
  body.theme-night .bg-primary\/5,
  body.theme-night .bg-secondary\/10,
  body.theme-night .bg-info\/10,
  body.theme-night .bg-success\/10,
  body.theme-night .bg-warning\/10,
  body.theme-night .bg-danger\/10 {
    background-color: rgba(71, 85, 105, 0.42) !important;
  }
  body.theme-night .hover\:bg-gray-50:hover,
  body.theme-night .hover\:bg-gray-100:hover,
  body.theme-night .hover\:bg-white:hover {
    background-color: rgba(51, 65, 85, 0.66) !important;
  }
  body.theme-night [class*="hover:bg-primary/"]:hover {
    background-color: rgba(71, 85, 105, 0.5) !important;
  }
  body.theme-night [class*="hover:bg-danger/"]:hover {
    background-color: rgba(239, 68, 68, 0.16) !important;
  }
  body.theme-night [class*="hover:bg-gray-50"]:hover,
  body.theme-night [class*="hover:bg-gray-100"]:hover,
  body.theme-night [class*="hover:bg-white"]:hover {
    background-color: rgba(51, 65, 85, 0.66) !important;
  }
  body.theme-night [class*="hover:border-primary"]:hover {
    border-color: rgba(148, 163, 184, 0.46) !important;
  }
  body.theme-night [class*="hover:border-gray-"]:hover {
    border-color: rgba(148, 163, 184, 0.46) !important;
  }
  body.theme-night [class*="hover:text-primary"]:hover {
    color: #E2E8F0 !important;
  }
  body.theme-night [class*="hover:text-secondary"]:hover {
    color: #E2E8F0 !important;
  }
  body.theme-night .btn-social {
    background: rgba(30, 41, 59, 0.68) !important;
    border-color: rgba(148, 163, 184, 0.35) !important;
  }
  body.theme-night .btn-social:hover {
    background: rgba(51, 65, 85, 0.82) !important;
  }
  body.theme-night .btn-social .social-text {
    color: var(--night-text-sub) !important;
  }
  body.theme-night .auth-alt-divider {
    background: rgba(15, 23, 42, 0.62) !important;
    color: #d1d5db !important;
    border-color: rgba(148, 163, 184, 0.35) !important;
  }
  body.theme-night .auth-switch-note {
    color: #d1d5db !important;
  }
  body.theme-night .text-primary,
  body.theme-night .text-secondary,
  body.theme-night .text-info,
  body.theme-night .text-success,
  body.theme-night .text-warning,
  body.theme-night .text-danger {
    color: #dbe7f8 !important;
  }
  body.theme-night .badge-level {
    background: rgba(71, 85, 105, 0.5) !important;
    color: #eef2ff !important;
    border-color: rgba(148, 163, 184, 0.3) !important;
  }
  body.theme-night .progress-bar::after,
  body.theme-night .stat-card::before,
  body.theme-night .chart-container::before {
    opacity: 0.2 !important;
  }
  `;
  document.head.appendChild(style);
}

function normalizeUnifiedThemeMode(mode) {
  var m = String(mode || '').toLowerCase();
  if (m === 'dark' || m === 'night') return 'night';
  return 'light';
}

function resolveUnifiedThemeMode() {
  var theme = '';

  try {
    if (window.AppState && window.AppState.settings && window.AppState.settings.theme) {
      theme = window.AppState.settings.theme;
    }
  } catch (e) {}

  if (!theme) {
    try {
      var activeUserKey = localStorage.getItem('ringnote_active_user_v1');
      var v2Key = activeUserKey ? ('ringnote_app_state_v2::' + activeUserKey) : '';
      var raw = v2Key ? localStorage.getItem(v2Key) : localStorage.getItem('ringnote_app_state_v1');
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.settings && parsed.settings.theme) {
          theme = parsed.settings.theme;
        }
      }
    } catch (e) {}
  }

  return normalizeUnifiedThemeMode(theme || 'light');
}

function applyUnifiedThemeMode(mode) {
  var normalized = normalizeUnifiedThemeMode(mode);
  var body = document.body;
  applyUnifiedDarkModeClassByTheme(normalized);
  if (!body) return normalized;
  var isUnifiedDark = document.documentElement.classList.contains('unified-dark-mode');
  body.classList.remove('theme-light', 'theme-dark', 'theme-night');
  if (isUnifiedDark) {
    body.classList.add('theme-light');
    return normalized;
  }
  body.classList.add(normalized === 'night' ? 'theme-night' : 'theme-light');
  return normalized;
}

function initUnifiedThemeMode() {
  ensureUnifiedThemeStyle();
  var mode = resolveUnifiedThemeMode();
  applyUnifiedThemeMode(mode);
}

if (typeof window !== 'undefined') {
  window.applyUnifiedThemeMode = applyUnifiedThemeMode;
  window.setUnifiedThemeMode = function (mode) {
    var normalized = applyUnifiedThemeMode(mode);
    try {
      if (window.AppState && window.AppState.settings) {
        window.AppState.settings.theme = normalized;
        if (typeof window.AppState.save === 'function') window.AppState.save();
      } else {
        var activeUserKey = localStorage.getItem('ringnote_active_user_v1');
        var v2Key = activeUserKey ? ('ringnote_app_state_v2::' + activeUserKey) : '';
        var raw = v2Key ? localStorage.getItem(v2Key) : localStorage.getItem('ringnote_app_state_v1');
        var parsed = raw ? JSON.parse(raw) : {};
        parsed.settings = parsed.settings || {};
        parsed.settings.theme = normalized;
        if (v2Key) {
          localStorage.setItem(v2Key, JSON.stringify(parsed));
        }
        localStorage.setItem('ringnote_app_state_v1', JSON.stringify(parsed));
      }
    } catch (e) {}
    return normalized;
  };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initUnifiedThemeMode);
} else {
  initUnifiedThemeMode();
}

var UNIFIED_UI_PREF_KEY = 'ringnote_ui_preferences_v1';

function getUnifiedUiPreferenceDefaults() {
  return {
    theme: resolveUnifiedThemeMode(),
    fontScale: 100,
    reduceMotion: false,
    hideHeaderBadges: false
  };
}

function clampUnifiedFontScale(value) {
  var n = Number(value);
  if (!isFinite(n)) return 100;
  return Math.max(90, Math.min(115, Math.round(n / 5) * 5));
}

function normalizeUnifiedUiPreferences(raw) {
  var defaults = getUnifiedUiPreferenceDefaults();
  var src = raw || {};
  return {
    theme: normalizeUnifiedThemeMode(src.theme || defaults.theme),
    fontScale: clampUnifiedFontScale(src.fontScale),
    reduceMotion: !!src.reduceMotion,
    hideHeaderBadges: !!src.hideHeaderBadges
  };
}

function getUnifiedUiPreferences() {
  var parsed = null;
  try {
    var raw = localStorage.getItem(UNIFIED_UI_PREF_KEY);
    if (raw) parsed = JSON.parse(raw);
  } catch (e) {
    parsed = null;
  }

  var fromState = null;
  try {
    if (window.AppState && window.AppState.settings && window.AppState.settings.uiPreferences) {
      fromState = window.AppState.settings.uiPreferences;
    }
  } catch (e) {
    fromState = null;
  }

  return normalizeUnifiedUiPreferences(Object.assign({}, parsed || {}, fromState || {}));
}

function saveUnifiedUiPreferences(prefs) {
  var normalized = normalizeUnifiedUiPreferences(prefs);
  try {
    localStorage.setItem(UNIFIED_UI_PREF_KEY, JSON.stringify(normalized));
  } catch (e) {}

  try {
    if (window.AppState && window.AppState.settings) {
      window.AppState.settings.uiPreferences = Object.assign({}, normalized);
      if (typeof window.AppState.save === 'function') window.AppState.save();
    }
  } catch (e) {}

  return normalized;
}

function applyUnifiedUiPreferences(prefs) {
  var normalized = normalizeUnifiedUiPreferences(prefs);
  var root = document.documentElement;
  if (root) {
    root.style.fontSize = String(normalized.fontScale) + '%';
    root.classList.toggle('unified-reduce-motion', !!normalized.reduceMotion);
    root.classList.toggle('unified-hide-header-badges', !!normalized.hideHeaderBadges);
  }
  window.setUnifiedThemeMode(normalized.theme);
  return normalized;
}

function ensureUnifiedSettingsPanelStyle() {
  if (document.getElementById('unified-settings-panel-style')) return;
  var style = document.createElement('style');
  style.id = 'unified-settings-panel-style';
  style.textContent = `
  .unified-hide-header-badges .badge-count {
    display: none !important;
  }
  .unified-reduce-motion *,
  .unified-reduce-motion *::before,
  .unified-reduce-motion *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  .unified-settings-mask {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.46);
    backdrop-filter: blur(3px);
    -webkit-backdrop-filter: blur(3px);
    z-index: 100050;
    display: none;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }
  .unified-settings-mask.open {
    display: flex;
  }
  .unified-settings-panel {
    width: min(560px, 100%);
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.68);
    background: rgba(255, 255, 255, 0.95);
    box-shadow: 0 26px 60px rgba(15, 23, 42, 0.24);
    overflow: hidden;
  }
  .unified-settings-head {
    padding: 18px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid rgba(226, 232, 240, 0.9);
  }
  .unified-settings-title {
    font-size: 17px;
    font-weight: 700;
    color: #0f172a;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .unified-settings-close {
    width: 34px;
    height: 34px;
    border-radius: 999px;
    border: 1px solid rgba(203, 213, 225, 0.7);
    color: #64748b;
    background: rgba(255, 255, 255, 0.85);
  }
  .unified-settings-body {
    padding: 18px 20px 16px;
    display: grid;
    gap: 14px;
  }
  .unified-setting-row {
    border: 1px solid rgba(226, 232, 240, 0.8);
    border-radius: 14px;
    padding: 12px;
    background: rgba(248, 250, 252, 0.72);
  }
  .unified-setting-row-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .unified-setting-name {
    color: #0f172a;
    font-weight: 600;
    font-size: 14px;
  }
  .unified-setting-desc {
    color: #64748b;
    font-size: 12px;
    margin-top: 2px;
  }
  .unified-theme-switch {
    margin-top: 10px;
    display: flex;
    gap: 8px;
  }
  .unified-theme-option {
    border: 1px solid rgba(203, 213, 225, 0.8);
    background: rgba(255, 255, 255, 0.9);
    border-radius: 10px;
    padding: 7px 12px;
    font-size: 13px;
    color: #475569;
    cursor: pointer;
  }
  .unified-theme-option.active {
    border-color: rgba(79, 70, 229, 0.5);
    background: rgba(79, 70, 229, 0.12);
    color: #4338ca;
    font-weight: 600;
  }
  .unified-setting-range {
    width: 100%;
    margin-top: 10px;
    accent-color: #4f46e5;
  }
  .unified-toggle {
    position: relative;
    width: 46px;
    height: 26px;
    border-radius: 999px;
    border: 1px solid rgba(203, 213, 225, 0.85);
    background: rgba(226, 232, 240, 0.9);
    transition: background-color 220ms ease, border-color 220ms ease;
    cursor: pointer;
  }
  .unified-toggle::after {
    content: '';
    position: absolute;
    width: 20px;
    height: 20px;
    border-radius: 999px;
    top: 2px;
    left: 2px;
    background: #fff;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.22);
    transition: transform 220ms ease;
  }
  .unified-toggle.on {
    background: rgba(79, 70, 229, 0.2);
    border-color: rgba(79, 70, 229, 0.55);
  }
  .unified-toggle.on::after {
    transform: translateX(20px);
  }
  .unified-settings-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 2px;
  }
  .unified-settings-btn {
    border: 1px solid rgba(203, 213, 225, 0.8);
    background: rgba(255, 255, 255, 0.95);
    color: #475569;
    border-radius: 10px;
    padding: 8px 12px;
    font-size: 13px;
    cursor: pointer;
  }
  .unified-settings-btn.primary {
    border-color: rgba(79, 70, 229, 0.5);
    background: rgba(79, 70, 229, 0.12);
    color: #4338ca;
    font-weight: 600;
  }
  html.unified-dark-mode .unified-settings-panel {
    background: rgba(26, 33, 48, 0.96);
    border-color: var(--ud-border);
  }
  html.unified-dark-mode .unified-settings-head {
    border-bottom-color: var(--ud-border);
  }
  html.unified-dark-mode .unified-settings-title,
  html.unified-dark-mode .unified-setting-name {
    color: var(--ud-title);
  }
  html.unified-dark-mode .unified-setting-desc {
    color: var(--ud-muted);
  }
  html.unified-dark-mode .unified-settings-close,
  html.unified-dark-mode .unified-theme-option,
  html.unified-dark-mode .unified-settings-btn {
    background: rgba(45, 55, 72, 0.86);
    border-color: var(--ud-border);
    color: var(--ud-text);
  }
  html.unified-dark-mode .unified-theme-option.active,
  html.unified-dark-mode .unified-settings-btn.primary {
    background: rgba(74, 108, 247, 0.24);
    border-color: rgba(74, 108, 247, 0.58);
    color: #d9e2ff;
  }
  html.unified-dark-mode .unified-setting-row {
    background: rgba(35, 43, 59, 0.8);
    border-color: var(--ud-border);
  }
  html.unified-dark-mode .unified-toggle {
    background: rgba(45, 55, 72, 0.88);
    border-color: var(--ud-border);
  }
  html.unified-dark-mode .unified-toggle.on {
    background: rgba(74, 108, 247, 0.28);
    border-color: rgba(74, 108, 247, 0.62);
  }
  @media (max-width: 640px) {
    .unified-settings-mask {
      padding: 10px;
      align-items: flex-end;
    }
    .unified-settings-panel {
      border-radius: 18px 18px 0 0;
      width: 100%;
    }
  }
  `;
  document.head.appendChild(style);
}

function ensureUnifiedSettingsPanelDom() {
  var existing = document.getElementById('unified-settings-mask');
  if (existing) return existing;

  var mask = document.createElement('div');
  mask.id = 'unified-settings-mask';
  mask.className = 'unified-settings-mask';
  mask.innerHTML = `
  <div class="unified-settings-panel" role="dialog" aria-modal="true" aria-labelledby="unified-settings-title">
    <div class="unified-settings-head">
      <div class="unified-settings-title" id="unified-settings-title"><i class="fas fa-sliders-h"></i><span>头部设置</span></div>
      <button type="button" class="unified-settings-close" data-action="close-unified-settings" aria-label="关闭设置"><i class="fas fa-times"></i></button>
    </div>
    <div class="unified-settings-body">
      <div class="unified-setting-row">
        <div class="unified-setting-row-top">
          <div>
            <div class="unified-setting-name">主题模式</div>
            <div class="unified-setting-desc">切换浅色/夜间模式</div>
          </div>
        </div>
        <div class="unified-theme-switch">
          <button type="button" class="unified-theme-option" data-theme-value="light">浅色</button>
          <button type="button" class="unified-theme-option" data-theme-value="night">夜间</button>
        </div>
      </div>

      <div class="unified-setting-row">
        <div class="unified-setting-row-top">
          <div>
            <div class="unified-setting-name">字体比例 <span id="unified-font-scale-value">100%</span></div>
            <div class="unified-setting-desc">统一调整全站文字尺寸</div>
          </div>
        </div>
        <input id="unified-font-scale-range" class="unified-setting-range" type="range" min="90" max="115" step="5" value="100" />
      </div>

      <div class="unified-setting-row">
        <div class="unified-setting-row-top">
          <div>
            <div class="unified-setting-name">减少动效</div>
            <div class="unified-setting-desc">降低动画与过渡效果，减轻视觉干扰</div>
          </div>
          <button type="button" class="unified-toggle" id="unified-reduce-motion-toggle" aria-label="切换减少动效"></button>
        </div>
      </div>

      <div class="unified-setting-row">
        <div class="unified-setting-row-top">
          <div>
            <div class="unified-setting-name">隐藏头部提醒红点</div>
            <div class="unified-setting-desc">仅隐藏红点，不影响功能本身</div>
          </div>
          <button type="button" class="unified-toggle" id="unified-hide-badges-toggle" aria-label="切换提醒红点"></button>
        </div>
      </div>

      <div class="unified-settings-actions">
        <button type="button" class="unified-settings-btn" id="unified-settings-reset-btn">恢复默认</button>
        <button type="button" class="unified-settings-btn" id="unified-settings-profile-btn">高级设置</button>
        <button type="button" class="unified-settings-btn primary" id="unified-settings-save-btn">保存并应用</button>
      </div>
    </div>
  </div>
  `;
  document.body.appendChild(mask);
  return mask;
}

function isUnifiedHeaderSettingsTarget(el) {
  if (!el) return false;
  var action = el.getAttribute ? (el.getAttribute('data-action') || '') : '';
  if (action === 'open-settings') return true;

  var inHeader = !!(el.closest && el.closest('.unified-top-header-shell, header.sticky.top-0, header'));
  if (!inHeader) return false;

  var inDropdown = !!(el.closest && el.closest('.unified-avatar-menu, #user-dropdown, .dropdown-menu'));
  if (!inDropdown) return false;

  var txt = (el.textContent || '').replace(/\s+/g, '');
  if (txt.indexOf('设置') === -1) return false;

  var logoutText = txt.indexOf('退出登录') !== -1;
  if (logoutText) return false;
  return true;
}

function updateUnifiedSettingsPanelUi(prefs) {
  var normalized = normalizeUnifiedUiPreferences(prefs);
  var mask = ensureUnifiedSettingsPanelDom();
  if (!mask) return;

  var themeButtons = mask.querySelectorAll('.unified-theme-option');
  themeButtons.forEach(function (btn) {
    var mode = btn.getAttribute('data-theme-value');
    btn.classList.toggle('active', mode === normalized.theme);
  });

  var range = mask.querySelector('#unified-font-scale-range');
  var fontText = mask.querySelector('#unified-font-scale-value');
  if (range) range.value = String(normalized.fontScale);
  if (fontText) fontText.textContent = String(normalized.fontScale) + '%';

  var motionToggle = mask.querySelector('#unified-reduce-motion-toggle');
  if (motionToggle) motionToggle.classList.toggle('on', !!normalized.reduceMotion);

  var badgeToggle = mask.querySelector('#unified-hide-badges-toggle');
  if (badgeToggle) badgeToggle.classList.toggle('on', !!normalized.hideHeaderBadges);

  mask.dataset.uiPrefs = JSON.stringify(normalized);
}

function readDraftUnifiedSettingsPrefs() {
  var mask = ensureUnifiedSettingsPanelDom();
  if (!mask) return getUnifiedUiPreferences();
  try {
    if (mask.dataset.uiPrefs) {
      return normalizeUnifiedUiPreferences(JSON.parse(mask.dataset.uiPrefs));
    }
  } catch (e) {}
  return getUnifiedUiPreferences();
}

function openUnifiedSettingsPanel() {
  ensureUnifiedSettingsPanelStyle();
  var prefs = getUnifiedUiPreferences();
  updateUnifiedSettingsPanelUi(prefs);

  var mask = ensureUnifiedSettingsPanelDom();
  if (!mask) return;
  mask.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeUnifiedSettingsPanel() {
  var mask = document.getElementById('unified-settings-mask');
  if (!mask) return;
  mask.classList.remove('open');
  document.body.style.overflow = '';
}

function bindUnifiedSettingsPanelEvents() {
  if (document.documentElement.dataset.unifiedSettingsBound === '1') return;
  document.documentElement.dataset.unifiedSettingsBound = '1';

  document.addEventListener('click', function (e) {
    var trigger = e.target && e.target.closest ? e.target.closest('a,button,[role="button"]') : null;
    if (!trigger) return;

    if (isUnifiedHeaderSettingsTarget(trigger)) {
      e.preventDefault();
      openUnifiedSettingsPanel();
      return;
    }

    if (trigger.getAttribute('data-action') === 'close-unified-settings') {
      e.preventDefault();
      closeUnifiedSettingsPanel();
      return;
    }

    if (trigger.matches('.unified-theme-option')) {
      var mode = trigger.getAttribute('data-theme-value') || 'light';
      var draft = readDraftUnifiedSettingsPrefs();
      draft.theme = mode;
      updateUnifiedSettingsPanelUi(draft);
      return;
    }

    if (trigger.id === 'unified-reduce-motion-toggle') {
      var draftMotion = readDraftUnifiedSettingsPrefs();
      draftMotion.reduceMotion = !draftMotion.reduceMotion;
      updateUnifiedSettingsPanelUi(draftMotion);
      return;
    }

    if (trigger.id === 'unified-hide-badges-toggle') {
      var draftBadges = readDraftUnifiedSettingsPrefs();
      draftBadges.hideHeaderBadges = !draftBadges.hideHeaderBadges;
      updateUnifiedSettingsPanelUi(draftBadges);
      return;
    }

    if (trigger.id === 'unified-settings-reset-btn') {
      var defaults = getUnifiedUiPreferenceDefaults();
      defaults.theme = 'light';
      defaults.fontScale = 100;
      updateUnifiedSettingsPanelUi(defaults);
      return;
    }

    if (trigger.id === 'unified-settings-profile-btn') {
      closeUnifiedSettingsPanel();
      safeNavigate('个人中心页面.html');
      return;
    }

    if (trigger.id === 'unified-settings-save-btn') {
      var draftSave = readDraftUnifiedSettingsPrefs();
      var saved = saveUnifiedUiPreferences(draftSave);
      applyUnifiedUiPreferences(saved);
      if (typeof showToast === 'function') showToast('设置已保存', 'success');
      closeUnifiedSettingsPanel();
    }
  });

  document.addEventListener('input', function (e) {
    var target = e.target;
    if (!target || target.id !== 'unified-font-scale-range') return;
    var draft = readDraftUnifiedSettingsPrefs();
    draft.fontScale = clampUnifiedFontScale(target.value);
    updateUnifiedSettingsPanelUi(draft);
  });

  document.addEventListener('click', function (e) {
    var mask = document.getElementById('unified-settings-mask');
    if (!mask || !mask.classList.contains('open')) return;
    if (e.target === mask) closeUnifiedSettingsPanel();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var mask = document.getElementById('unified-settings-mask');
    if (mask && mask.classList.contains('open')) {
      closeUnifiedSettingsPanel();
    }
  });
}

function initUnifiedHeaderSettings() {
  ensureUnifiedSettingsPanelStyle();
  ensureUnifiedSettingsPanelDom();
  bindUnifiedSettingsPanelEvents();
  applyUnifiedUiPreferences(getUnifiedUiPreferences());
}

if (typeof window !== 'undefined') {
  window.openUnifiedSettingsPanel = openUnifiedSettingsPanel;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initUnifiedHeaderSettings);
} else {
  initUnifiedHeaderSettings();
}

var UNIFIED_APP_STATE_KEY = 'ringnote_app_state_v1';
var UNIFIED_IDENTITY_SYNC_KEY = 'ringnote_identity_sync_tick';

function getUnifiedStateSnapshot() {
  var parsed = null;
  try {
    var raw = localStorage.getItem(UNIFIED_APP_STATE_KEY);
    if (raw) parsed = JSON.parse(raw);
  } catch (e) {
    parsed = null;
  }
  return parsed || {};
}

function getUnifiedUserProfile() {
  var fallback = {
    name: '轻悦用户',
    avatar: 'https://design.gemcoder.com/staticResource/echoAiSystemImages/99c1d122b882a0f5d07d17e3e9038dda.png'
  };
  var user = null;
  try {
    if (window.AppState && window.AppState.user) user = window.AppState.user;
  } catch (e) {
    user = null;
  }
  if (!user) {
    var state = getUnifiedStateSnapshot();
    user = state && state.user ? state.user : null;
  }
  return {
    name: (user && user.name) || fallback.name,
    avatar: (user && user.avatar) || fallback.avatar,
    email: (user && user.email) || '',
    phone: (user && user.phone) || ''
  };
}

function refreshUnifiedUserIdentityUi() {
  var user = getUnifiedUserProfile();

  var headerNames = document.querySelectorAll('.header-user-name');
  headerNames.forEach(function (el) {
    el.textContent = user.name;
  });

  var headerAvatars = document.querySelectorAll('.header-user-avatar');
  headerAvatars.forEach(function (img) {
    if (img && user.avatar) {
      img.src = user.avatar;
    }
  });

  var roots = document.querySelectorAll('.unified-top-header-shell, header.sticky.top-0, header');
  roots.forEach(function (root) {
    var menus = root.querySelectorAll('div.user-dropdown, #user-dropdown, div.absolute.right-0');
    menus.forEach(function (menu) {
      if (!isAvatarMenu(menu)) return;
      var group = menu.closest('.relative') || menu.parentElement;
      if (!group) return;
      var trigger = group.querySelector('button') || group.querySelector('[role="button"]');
      if (!trigger) return;

      var avatar = trigger.querySelector('img');
      if (avatar && user.avatar) {
        avatar.src = user.avatar;
      }

      var nameSpan = null;
      var spans = trigger.querySelectorAll('span');
      spans.forEach(function (span) {
        if (nameSpan) return;
        if (span.querySelector('*')) return;
        var text = (span.textContent || '').trim();
        if (!text) return;
        nameSpan = span;
      });
      if (nameSpan) nameSpan.textContent = user.name;
    });
  });
}

function notifyIdentityUpdated(reason) {
  try {
    localStorage.setItem(UNIFIED_IDENTITY_SYNC_KEY, String(Date.now()));
  } catch (e) {}

  try {
    var evt = new CustomEvent('ringnote:identity-updated', {
      detail: { reason: reason || 'manual', ts: Date.now() }
    });
    window.dispatchEvent(evt);
  } catch (e) {
    // ignore browsers without CustomEvent constructor
  }

  refreshUnifiedUserIdentityUi();
}

function isUnifiedLogoutTarget(el) {
  if (!el) return false;

  var id = (el.id || '').trim();
  if (
    id === 'global-logout' ||
    id === 'todo-logout-link' ||
    id === 'logout-btn-top' ||
    id === 'profile-logout' ||
    id === 'admin-logout'
  ) {
    return true;
  }

  var action = (el.getAttribute && el.getAttribute('data-action')) || '';
  if (action === 'logout') return true;

  var tag = (el.tagName || '').toUpperCase();
  if (tag !== 'A') return false;

  var href = (el.getAttribute('href') || '').trim();
  var text = (el.textContent || '').replace(/\s+/g, '');
  if (text.indexOf('退出登录') !== -1) return true;
  if (href.indexOf('登录页面.html') !== -1) return true;

  return false;
}

function performUnifiedLogoutFlow() {
  if (window.AppState && typeof window.AppState.logout === 'function') {
    window.AppState.logout();
  }
  try { localStorage.removeItem('todoTasks'); } catch (e) {}
  try { localStorage.removeItem('todoTags'); } catch (e) {}
  try { localStorage.removeItem('todoPendingCreates_v1'); } catch (e) {}
  if (typeof showToast === 'function') {
    showToast('已退出登录');
  }
  setTimeout(function () {
    safeNavigate('登录页面.html');
  }, 250);
}

function initUnifiedLogoutBindings() {
  if (document.documentElement.dataset.unifiedLogoutBound === '1') return;
  document.documentElement.dataset.unifiedLogoutBound = '1';

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented) return;
    var trigger = e.target && e.target.closest
      ? e.target.closest('a,button,[role="button"]')
      : null;
    if (!trigger) return;
    if (!isUnifiedLogoutTarget(trigger)) return;

    e.preventDefault();
    performUnifiedLogoutFlow();
  }, false);
}

function initUnifiedIdentitySync() {
  refreshUnifiedUserIdentityUi();
  initUnifiedLogoutBindings();
  window.addEventListener('storage', function (e) {
    if (!e) return;
    var k = String(e.key || '');
    if (
      k === UNIFIED_APP_STATE_KEY ||
      k === UNIFIED_IDENTITY_SYNC_KEY ||
      k === 'ringnote_active_user_v1' ||
      k.indexOf('ringnote_app_state_v2::') === 0
    ) {
      refreshUnifiedUserIdentityUi();
    }
  });
  window.addEventListener('ringnote:identity-updated', function () {
    refreshUnifiedUserIdentityUi();
  });
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) refreshUnifiedUserIdentityUi();
  });
  window.addEventListener('load', refreshUnifiedUserIdentityUi);
}

if (typeof window !== 'undefined') {
  window.refreshUnifiedUserIdentityUi = refreshUnifiedUserIdentityUi;
  window.notifyIdentityUpdated = notifyIdentityUpdated;
  window.performUnifiedLogoutFlow = performUnifiedLogoutFlow;
  window.initUnifiedLogoutBindings = initUnifiedLogoutBindings;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initUnifiedIdentitySync);
} else {
  initUnifiedIdentitySync();
}

// ✅ 跨页面数据同步：监听 localStorage 变化
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('storage', function (e) {
    if (!e || !e.key) return;
    var isAppStateUpdate =
      e.key === 'ringnote_app_state_v1' ||
      e.key === 'ringnote_active_user_v1' ||
      String(e.key).indexOf('ringnote_app_state_v2::') === 0;
    if (!isAppStateUpdate) return; // 只关注 AppState 更新
    
    // 当 AppState 在另一个标签页被更新时，重新加载到当前页面的 AppState
    if (typeof AppState !== 'undefined' && AppState.init) {
      try {
        AppState.init();
        
        // 触发一个自定义事件，让各页面知道数据已更新
        if (typeof window.CustomEvent !== 'undefined') {
          var evt = new CustomEvent('appstate-updated', { detail: { key: e.key } });
          window.dispatchEvent(evt);
        }
      } catch (err) {
        console.warn('跨页面同步失败:', err);
      }
    }
  }, false);
}

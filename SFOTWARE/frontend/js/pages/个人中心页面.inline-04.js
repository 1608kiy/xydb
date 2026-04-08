var hasAnimatedExpBar = false;
var activeTabName = 'overview';

function applyProfileMobileRandomBackground() {
  try {
    var body = document.body;
    if (!body || !body.classList || !body.classList.contains('profile-page')) return;

    var mobileLike = false;
    if (window.matchMedia && window.matchMedia('(max-width: 900px)').matches) {
      mobileLike = true;
    } else {
      var width = Number(window.innerWidth || 0);
      mobileLike = width > 0 && width <= 1024;
    }
    if (!mobileLike) return;

    if (body.getAttribute('data-profile-random-bg-ready') === '1') return;
    if (body.getAttribute('data-profile-random-bg-loading') === '1') return;

    body.setAttribute('data-profile-random-bg-loading', '1');
    body.style.setProperty('background', 'linear-gradient(165deg, rgba(197, 218, 236, 0.78), rgba(170, 198, 220, 0.72))', 'important');
    body.style.setProperty('background-image', 'none', 'important');
    body.style.setProperty('background-size', 'cover', 'important');
    body.style.setProperty('background-position', 'center', 'important');
    body.style.setProperty('background-attachment', 'fixed', 'important');

    var seed = String(Date.now()) + '-' + String(Math.floor(Math.random() * 1000000));
    var imageUrl = 'https://picsum.photos/seed/ringnote-profile-' + encodeURIComponent(seed) + '/900/1600';

    var probe = new Image();
    probe.decoding = 'async';
    probe.onload = function () {
      body.style.setProperty('background', "url('" + imageUrl + "') center/cover fixed", 'important');
      body.style.setProperty('background-image', "url('" + imageUrl + "')", 'important');
      body.style.setProperty('background-size', 'cover', 'important');
      body.style.setProperty('background-position', 'center', 'important');
      body.style.setProperty('background-attachment', 'fixed', 'important');
      body.setAttribute('data-profile-random-bg-seed', seed);
      body.setAttribute('data-profile-random-bg-ready', '1');
      body.removeAttribute('data-profile-random-bg-loading');
    };
    probe.onerror = function () {
      body.removeAttribute('data-profile-random-bg-loading');
    };
    probe.src = imageUrl;
  } catch (err) {}
}
function showToast(message, type) {
  if (window.__unifiedShowToast) {
    window.__unifiedShowToast(message, type || 'success');
  }
}

function maskPhoneNumber(phone) {
  if (!phone || phone.length !== 11) return phone || '';
  return phone.substring(0, 3) + '****' + phone.substring(7);
}

function getAvatarFallbackDataUrl(size) {
  var s = Number(size || 120);
  var center = Math.floor(s / 2);
  var svg = ''
    + '<svg xmlns="http://www.w3.org/2000/svg" width="' + s + '" height="' + s + '" viewBox="0 0 ' + s + ' ' + s + '">'
    + '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'
    + '<stop offset="0%" stop-color="#ff9b72"/><stop offset="100%" stop-color="#9b8cff"/>'
    + '</linearGradient></defs>'
    + '<circle cx="' + center + '" cy="' + center + '" r="' + center + '" fill="url(#g)"/>'
    + '<circle cx="' + center + '" cy="' + Math.floor(s * 0.38) + '" r="' + Math.floor(s * 0.16) + '" fill="rgba(255,255,255,0.92)"/>'
    + '<path d="M' + Math.floor(s * 0.22) + ' ' + Math.floor(s * 0.86)
    + 'c' + Math.floor(s * 0.05) + '-' + Math.floor(s * 0.14)
    + ' ' + Math.floor(s * 0.17) + '-' + Math.floor(s * 0.24)
    + ' ' + Math.floor(s * 0.28) + '-' + Math.floor(s * 0.24)
    + 's' + Math.floor(s * 0.24) + ' ' + Math.floor(s * 0.1)
    + ' ' + Math.floor(s * 0.28) + ' ' + Math.floor(s * 0.24)
    + '" fill="rgba(255,255,255,0.92)"/>'
    + '</svg>';
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

function safeAvatarSrc(src, fallbackSize) {
  var value = String(src || '').trim();
  if (!value || value === 'null' || value === 'undefined') {
    return getAvatarFallbackDataUrl(fallbackSize);
  }
  return value;
}

function safeFormatDate(ts) {
  if (!ts) return '从未更新';
  var d = new Date(ts);
  if (isNaN(d.getTime())) return '从未更新';
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function toDashWhenEmpty(value, suffix) {
  if (!value) return '-';
  return String(value) + (suffix || '');
}

function applyStatValueDisplay(el, valueText, isEmpty) {
  if (!el) return;
  el.textContent = valueText;
  el.classList.toggle('stat-empty', !!isEmpty);
}

function animateExpBarTo(percent) {
  var expBar = document.getElementById('exp-bar');
  var bubble = document.getElementById('exp-progress-bubble');
  if (!expBar) return;
  expBar.style.width = '0%';
  if (bubble) {
    bubble.style.left = '0%';
    bubble.textContent = '0%';
  }
  window.requestAnimationFrame(function () {
    window.setTimeout(function () {
      expBar.style.transition = 'width 800ms ease-out';
      expBar.style.width = percent + '%';
      if (bubble) {
        bubble.style.transition = 'left 800ms ease-out';
        bubble.style.left = percent + '%';
        bubble.textContent = percent + '%';
      }
    }, 50);
  });
}

function updateTabIndicator(tabName) {
  var nav = document.querySelector('.profile-tab-nav');
  var indicator = document.getElementById('profile-tab-indicator');
  var activeBtn = document.querySelector('.profile-tab-btn[data-tab="' + tabName + '"]');
  if (!nav || !indicator || !activeBtn) return;
  var navRect = nav.getBoundingClientRect();
  var btnRect = activeBtn.getBoundingClientRect();
  indicator.style.width = btnRect.width + 'px';
  indicator.style.transform = 'translateX(' + (btnRect.left - navRect.left) + 'px)';
}

function switchProfileTab(tabName) {
  var buttons = document.querySelectorAll('.profile-tab-btn[data-tab]');
  var panes = document.querySelectorAll('.profile-tab-pane');

  buttons.forEach(function (btn) {
    var matched = btn.getAttribute('data-tab') === tabName;
    btn.classList.toggle('active', matched);
    btn.setAttribute('aria-selected', matched ? 'true' : 'false');
  });

  panes.forEach(function (pane) {
    var paneName = pane.id.replace('tab-', '');
    var matched = paneName === tabName;
    pane.classList.toggle('hidden', !matched);
    if (matched) {
      pane.classList.remove('tab-fade-in');
      void pane.offsetWidth;
      pane.classList.add('tab-fade-in');
    }
  });

  activeTabName = tabName;
  updateTabIndicator(tabName);

  if (tabName === 'growth' && !hasAnimatedExpBar) {
    var expPct = Number((document.getElementById('exp-bar') || {}).dataset.target || '0');
    animateExpBarTo(expPct);
    hasAnimatedExpBar = true;
  }
}

function bindTabs() {
  var tabButtons = document.querySelectorAll('.profile-tab-btn[data-tab]');
  tabButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      switchProfileTab(btn.getAttribute('data-tab'));
    });
  });
  window.addEventListener('resize', function () {
    updateTabIndicator(activeTabName);
  });
}

function bindAchievementFilter() {
  var filterButtons = document.querySelectorAll('.achievement-filter-btn[data-filter]');
  var badges = Array.prototype.slice.call(document.querySelectorAll('#achievement-grid .achievement-badge'));
  var empty = document.getElementById('achievement-empty');

  function apply(filter) {
    var shown = 0;
    badges.forEach(function (badge) {
      var category = badge.getAttribute('data-category');
      var matched = filter === 'all' || category === filter;
      badge.style.display = matched ? 'block' : 'none';
      if (matched) shown += 1;
    });
    if (empty) empty.style.display = shown === 0 ? 'block' : 'none';
  }

  filterButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filterButtons.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      apply(btn.getAttribute('data-filter'));
    });
  });

  apply('all');
}

function bindOverviewJump() {
  var jumpBtn = document.getElementById('go-growth-tab-btn');
  if (!jumpBtn) return;
  jumpBtn.addEventListener('click', function () {
    switchProfileTab('growth');
    var wall = document.getElementById('profile-achievement-module');
    if (wall) wall.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function bindStartFocusAction() {
  var startBtn = document.getElementById('start-focus-btn');
  if (!startBtn) return;
  startBtn.addEventListener('click', function () {
    if (typeof safeNavigate === 'function') safeNavigate('番茄钟页面.html');
    else window.location.href = '番茄钟页面.html';
  });
}

function buildBackendUserPatch(patch) {
  var p = patch || {};
  var backend = {};
  if (typeof p.name !== 'undefined') backend.nickname = p.name;
  if (typeof p.email !== 'undefined') backend.email = p.email;
  if (typeof p.phone !== 'undefined') backend.phone = p.phone;
  if (typeof p.avatar !== 'undefined') backend.avatarUrl = p.avatar;
  if (typeof p.securityPhone !== 'undefined') backend.securityPhone = p.securityPhone;
  if (typeof p.passwordUpdatedAt !== 'undefined') backend.passwordUpdatedAt = p.passwordUpdatedAt;
  if (typeof p.twoStepEnabled !== 'undefined') backend.twoStepEnabled = p.twoStepEnabled;
  return backend;
}

function normalizeUserFromBackend(me) {
  var u = me || {};
  return {
    id: u.id,
    name: u.nickname || u.name,
    email: u.email,
    phone: u.phone,
    avatar: u.avatarUrl || u.avatar,
    securityPhone: u.securityPhone,
    passwordUpdatedAt: u.passwordUpdatedAt,
    twoStepEnabled: typeof u.twoStepEnabled === 'boolean' ? u.twoStepEnabled : undefined,
    level: typeof u.level === 'number' ? u.level : undefined,
    exp: typeof u.exp === 'number' ? u.exp : undefined
  };
}

function applyUserPatch(patch, opts) {
  var options = opts || {};
  var userPatch = patch || {};
  if (!Object.keys(userPatch).length) return Promise.resolve(false);

  var backendPatch = buildBackendUserPatch(userPatch);
  var commitLocal = function (serverPatch) {
    AppState.user = AppState.user || {};
    Object.assign(AppState.user, userPatch, serverPatch || {});
    if (AppState.save) AppState.save();
    syncProfileIdentityUi();
    syncSecurityUi();
    updateDataStatistics();
  };

  if (!Object.keys(backendPatch).length) {
    commitLocal({});
    if (options.successMessage) showToast(options.successMessage, 'success');
    return Promise.resolve(true);
  }

  return apiRequest('/api/me', {
    method: 'PUT',
    timeoutMs: 8000,
    body: JSON.stringify(backendPatch)
  }).then(function (res) {
    var ok = !!(res && res.status === 200 && res.body && res.body.code === 200);
    if (!ok) throw new Error((res && res.body && res.body.message) || '资料更新失败');
    commitLocal(normalizeUserFromBackend((res.body && res.body.data) || {}));
    if (options.successMessage) showToast(options.successMessage, 'success');
    return true;
  }).catch(function (err) {
    showToast((err && err.message) || '资料更新失败，请稍后重试', 'error');
    return false;
  });
}

window.__profileApplyUserPatch = applyUserPatch;

function syncProfileIdentityUi() {
  var u = AppState.user || {};
  var displayName = u.name || '轻悦用户';
  var displayEmail = u.email || 'demo@ringnote.com';
  var displayPhone = u.phone || '';

  var userName = document.getElementById('user-name');
  var userEmail = document.getElementById('user-email');
  var userPhone = document.getElementById('user-phone');
  var profileAvatar = document.getElementById('profile-avatar');

  if (userName) userName.value = displayName;
  if (userEmail) userEmail.textContent = displayEmail;
  if (userPhone) userPhone.textContent = displayPhone ? maskPhoneNumber(displayPhone) : '未绑定';
  if (profileAvatar) {
    profileAvatar.src = safeAvatarSrc(u.avatar || profileAvatar.src, 160);
    profileAvatar.onerror = function () {
      profileAvatar.onerror = null;
      profileAvatar.src = getAvatarFallbackDataUrl(160);
    };
  }

  var headerUserName = document.querySelector('.header-user-name');
  var headerAvatar = document.querySelector('.header-user-avatar');
  if (headerUserName) headerUserName.textContent = displayName;
  if (headerAvatar) {
    headerAvatar.src = safeAvatarSrc(u.avatar || headerAvatar.src, 96);
    headerAvatar.onerror = function () {
      headerAvatar.onerror = null;
      headerAvatar.src = getAvatarFallbackDataUrl(96);
    };
  }
}

function syncSecurityUi() {
  var u = AppState.user || {};
  var passwordTip = document.getElementById('password-updated-tip');
  var securityPhoneTip = document.getElementById('security-phone-tip');
  var twoStepStatus = document.getElementById('two-step-status');
  var twoStepBtn = document.getElementById('two-step-btn');

  if (passwordTip) {
    passwordTip.textContent = '上次修改：' + safeFormatDate(u.passwordUpdatedAt);
  }
  if (securityPhoneTip) {
    var p = u.securityPhone || u.phone || '';
    securityPhoneTip.textContent = p ? ('安全手机号：' + maskPhoneNumber(p)) : '用于登录、找回密码和安全验证';
  }
  if (twoStepStatus) {
    twoStepStatus.textContent = u.twoStepEnabled ? '状态：已开启' : '状态：未开启';
  }
  if (twoStepBtn) {
    twoStepBtn.textContent = u.twoStepEnabled ? '已开启' : '去开启';
  }
}

function renderExpProfile(totalExp) {
  var userLevelTag = document.getElementById('user-level-tag');
  var expText = document.getElementById('exp-text');
  var expBar = document.getElementById('exp-bar');
  var expNextText = document.getElementById('exp-next-text');

  var exp = Math.max(0, Number(totalExp || 0));
  var level = Math.floor(exp / 1000) + 1;
  var expInLevel = exp % 1000;
  var remain = 1000 - expInLevel;
  var pct = Math.min(100, Math.round((expInLevel / 1000) * 100));

  AppState.user = AppState.user || {};
  AppState.user.level = level;
  AppState.user.exp = expInLevel;
  if (AppState.save) AppState.save();

  if (userLevelTag) userLevelTag.innerHTML = '<i class="fas fa-crown mr-1"></i>LV.' + level;
  if (expText) expText.textContent = expInLevel + ' / 1000';
  if (expNextText) expNextText.textContent = '当前 LV.' + level + '，距离下一级还需 ' + remain + ' 经验值';
  if (expBar) {
    expBar.dataset.target = String(pct);
  }
}

function updateDataStatistics() {
  var stats = getCheckinStats();
  var completedTasks = (AppState.tasks || []).filter(function (t) { return t.status === 'completed'; }).length;
  var totalFocusMinutes = (AppState.pomodoroSessions || []).reduce(function (sum, s) {
    return sum + (s.actualMinutes || 0);
  }, 0);
  var totalPomodoros = (AppState.pomodoroSessions || []).filter(function (s) { return s.completed; }).length;
  var maxStreak = Number((stats && stats.maxStreak) || 0);

  var focusHours = Math.round((totalFocusMinutes / 60) * 10) / 10;
  var hasData = completedTasks > 0 || totalFocusMinutes > 0 || totalPomodoros > 0 || maxStreak > 0;

  var completedTasksEl = document.getElementById('stat-completed-tasks');
  var focusHoursEl = document.getElementById('stat-focus-hours');
  var maxStreakEl = document.getElementById('stat-max-streak');
  var totalPomodorosEl = document.getElementById('stat-total-pomodoros');
  var statsEmpty = document.getElementById('profile-stats-empty');

  applyStatValueDisplay(completedTasksEl, toDashWhenEmpty(completedTasks), completedTasks === 0);
  applyStatValueDisplay(focusHoursEl, toDashWhenEmpty(focusHours, ' h'), focusHours === 0);
  applyStatValueDisplay(maxStreakEl, toDashWhenEmpty(maxStreak, ' 天'), maxStreak === 0);
  applyStatValueDisplay(totalPomodorosEl, toDashWhenEmpty(totalPomodoros), totalPomodoros === 0);
  if (statsEmpty) statsEmpty.style.display = hasData ? 'none' : 'block';

  renderExpProfile(completedTasks * 10 + totalPomodoros * 3 + maxStreak * 5);
}

function bindProfileActions() {
  var userName = document.getElementById('user-name');
  var changeAvatarBtn = document.getElementById('change-avatar-btn');
  var avatarFileInput = document.getElementById('avatar-file-input');
  var changePasswordBtn = document.getElementById('change-password-btn');
  var bindPhoneBtn = document.getElementById('bind-phone-btn');
  var twoStepBtn = document.getElementById('two-step-btn');

  if (userName) {
    userName.addEventListener('blur', function () {
      var newName = String(userName.value || '').trim();
      if (!newName) {
        showToast('昵称不能为空', 'error');
        syncProfileIdentityUi();
        return;
      }
      applyUserPatch({ name: newName }, { successMessage: '昵称已保存' });
    });
  }

  if (changeAvatarBtn && avatarFileInput) {
    changeAvatarBtn.addEventListener('click', function () {
      avatarFileInput.click();
    });
    avatarFileInput.addEventListener('change', function () {
      var file = this.files && this.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (e) {
        applyUserPatch({ avatar: e.target.result }, { successMessage: '头像已更新' });
      };
      reader.readAsDataURL(file);
    });
  }

  if (changePasswordBtn) {
    changePasswordBtn.addEventListener('click', function () {
      var pass = window.prompt('请输入新密码（至少6位）', '');
      if (pass === null) return;
      pass = String(pass || '').trim();
      if (pass.length < 6) {
        showToast('密码长度不足 6 位', 'error');
        return;
      }
      applyUserPatch({ passwordUpdatedAt: new Date().toISOString() }, { successMessage: '密码已更新' });
    });
  }

  if (bindPhoneBtn) {
    bindPhoneBtn.addEventListener('click', function () {
      var current = (AppState.user && AppState.user.phone) || '';
      var next = window.prompt('请输入 11 位手机号', current);
      if (next === null) return;
      next = String(next || '').trim();
      if (!/^1[3-9]\d{9}$/.test(next)) {
        showToast('手机号格式不正确', 'error');
        return;
      }
      applyUserPatch({ phone: next, securityPhone: next }, { successMessage: '手机号已更新' });
    });
  }

  if (twoStepBtn) {
    twoStepBtn.addEventListener('click', function () {
      if (AppState.user && AppState.user.twoStepEnabled) {
        showToast('两步验证已开启');
        return;
      }
      applyUserPatch({ twoStepEnabled: true }, { successMessage: '两步验证已开启' });
    });
  }
}

function bindActionPressFeedback() {
  var actionButtons = document.querySelectorAll('.action-press, .settings-action-btn');
  actionButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      btn.classList.add('is-pressed');
      window.setTimeout(function () {
        btn.classList.remove('is-pressed');
      }, 80);
    });
  });
}

function bindDangerSheet() {
  var sheet = document.getElementById('danger-bottom-sheet');
  var mask = document.getElementById('danger-sheet-mask');
  var title = document.getElementById('danger-sheet-title');
  var desc = document.getElementById('danger-sheet-desc');
  var confirmWrap = document.getElementById('danger-sheet-confirm-wrap');
  var confirmInput = document.getElementById('danger-confirm-input');
  var cancelBtn = document.getElementById('danger-sheet-cancel');
  var confirmBtn = document.getElementById('danger-sheet-confirm');

  var clearAllDataBtn = document.getElementById('clear-all-data-btn');
  var deleteAccountBtn = document.getElementById('delete-account-btn');
  var logoutBtn = document.getElementById('logout-btn');

  var onConfirm = null;
  var mode = 'none';

  function closeSheet() {
    if (!sheet) return;
    sheet.classList.add('hidden');
    sheet.setAttribute('aria-hidden', 'true');
    if (confirmInput) confirmInput.value = '';
    if (confirmBtn) confirmBtn.disabled = true;
    onConfirm = null;
    mode = 'none';
  }

  function refreshConfirmState() {
    if (!confirmBtn) return;
    if (mode === 'need-confirm') {
      confirmBtn.disabled = String((confirmInput && confirmInput.value) || '').trim() !== '确认';
      return;
    }
    confirmBtn.disabled = false;
  }

  function openSheet(options) {
    var opts = options || {};
    if (!sheet) return;
    if (title) title.textContent = opts.title || '确认操作';
    if (desc) desc.textContent = opts.desc || '请确认是否继续。';

    mode = opts.mode || 'none';
    if (confirmWrap) confirmWrap.classList.toggle('hidden', mode !== 'need-confirm');

    onConfirm = typeof opts.onConfirm === 'function' ? opts.onConfirm : null;
    sheet.classList.remove('hidden');
    sheet.setAttribute('aria-hidden', 'false');
    refreshConfirmState();
  }

  if (confirmInput) confirmInput.addEventListener('input', refreshConfirmState);
  if (cancelBtn) cancelBtn.addEventListener('click', closeSheet);
  if (mask) mask.addEventListener('click', closeSheet);

  if (confirmBtn) {
    confirmBtn.addEventListener('click', function () {
      if (confirmBtn.disabled) return;
      var action = onConfirm;
      closeSheet();
      if (typeof action === 'function') action();
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      AppState.logout();
      showToast('已退出登录');
      window.setTimeout(function () {
        if (typeof safeNavigate === 'function') safeNavigate('登录页面.html');
        else window.location.href = '登录页面.html';
      }, 320);
    });
  }

  if (clearAllDataBtn) {
    clearAllDataBtn.addEventListener('click', function () {
      openSheet({
        title: '清除所有数据',
        desc: '此操作会删除本地所有任务、专注与打卡记录，且不可恢复。',
        mode: 'need-confirm',
        onConfirm: function () {
          var currentUserKey = 'guest';
          try {
            if (typeof AppState.getCurrentUserKey === 'function') {
              currentUserKey = AppState.getCurrentUserKey() || 'guest';
            }
          } catch (e) {
            currentUserKey = 'guest';
          }
          try { localStorage.removeItem('ringnote_app_state_v2::' + currentUserKey); } catch (e) {}
          try { localStorage.removeItem('ringnote_app_state_v1'); } catch (e) {}
          AppState.reset();
          updateDataStatistics();
          showToast('所有数据已清除');
        }
      });
    });
  }

  if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener('click', function () {
      openSheet({
        title: '注销账号',
        desc: '此操作将清空当前设备上的账号信息与应用数据，并退出登录。',
        mode: 'need-confirm',
        onConfirm: function () {
          localStorage.clear();
          showToast('账号已注销');
          window.setTimeout(function () {
            if (typeof safeNavigate === 'function') safeNavigate('注册页面.html');
            else window.location.href = '注册页面.html';
          }, 360);
        }
      });
    });
  }
}

function bootstrapProfilePage() {
  applyProfileMobileRandomBackground();
  var authSyncPromise = Promise.resolve();
  if (typeof checkAuthOnLoad === 'function') {
    authSyncPromise = checkAuthOnLoad().catch(function () {});
  }

  AppState.init();
  renderHeader('profile');
  renderFooter('profile');
  bindGlobalLogout();

  bindTabs();
  bindAchievementFilter();
  bindOverviewJump();
  bindStartFocusAction();
  bindProfileActions();
  bindActionPressFeedback();
  bindDangerSheet();

  syncProfileIdentityUi();
  syncSecurityUi();
  updateDataStatistics();
  switchProfileTab('overview');

  authSyncPromise.then(function () {
    AppState.init();
    syncProfileIdentityUi();
    syncSecurityUi();
    updateDataStatistics();
  });

  window.addEventListener('storage', function (e) {
    if (!e) return;
    var key = String(e.key || '');
    if (
      key === 'ringnote_app_state_v1' ||
      key === 'ringnote_active_user_v1' ||
      key.indexOf('ringnote_app_state_v2::') === 0
    ) {
      AppState.init();
      syncProfileIdentityUi();
      syncSecurityUi();
      updateDataStatistics();
    }
  });

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) {
      applyProfileMobileRandomBackground();
      AppState.init();
      syncProfileIdentityUi();
      syncSecurityUi();
      updateDataStatistics();
    }
  });
}

document.addEventListener('DOMContentLoaded', bootstrapProfilePage);

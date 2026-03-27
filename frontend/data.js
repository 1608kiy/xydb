// 共享全局数据状态与 localStorage（按用户隔离）
const LEGACY_STORAGE_KEY = 'qingyue_todo_app_state_v1';
const STORAGE_KEY_PREFIX = 'qingyue_todo_app_state_v2::';
const ACTIVE_USER_KEY = 'qingyue_active_user_v1';
const STORAGE_HYGIENE_FLAG_KEY = 'qingyue_storage_hygiene_v1';

const defaultState = {
  user: {
    id: 'u1',
    name: '轻悦用户',
    email: 'demo@qingyue.com',
    phone: '13800000000',
    level: 1,
    exp: 0,
    avatar: 'https://design.gemcoder.com/staticResource/echoAiSystemImages/99c1d122b882a0f5d07d17e3e9038dda.png'
  },
  tasks: [
    { id: 't1', title: '完成项目提案PPT', description: '准备市场与预算', dueAt: null, status: 'pending', priority: 'high', labels: ['工作'], estimate: 2, createdAt: new Date().toISOString(), subTasks: [
      { id: 'st1', title: '收集市场数据', completed: true },
      { id: 'st2', title: '分析竞争对手', completed: true },
      { id: 'st3', title: '制定技术方案', completed: false },
      { id: 'st4', title: '估算项目预算', completed: false },
      { id: 'st5', title: '制作演示PPT', completed: false }
    ] },
    { id: 't2', title: '学习React Hooks', description: '读完官方文档', dueAt: null, status: 'pending', priority: 'medium', labels: ['学习'], estimate: 2, createdAt: new Date().toISOString(), subTasks: [] }
  ],
  pomodoroSessions: [],
  checkins: [],
  settings: {
    theme: 'light',
    notifications: {
      taskReminder: true,
      pomodoroEnd: true,
      dailyReport: false
    },
    pomodoro: {
      focus: 25,
      shortBreak: 5,
      longBreak: 15,
      longBreakInterval: 4,
      autoStartBreak: true,
      autoStartNext: false,
      focusModeMute: true
    },
    calendar: {
      weekStart: 'monday',
      defaultView: 'month',
      showLunar: true
    }
  },
  labels: [
    { id: 'work', name: '工作', color: '#3B82F6' },
    { id: 'study', name: '学习', color: '#8B5CF6' },
    { id: 'life', name: '生活', color: '#EC4899' },
    { id: 'health', name: '健康', color: '#10B981' }
  ]
};

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sanitizeIdentityFragment(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_@.-]/g, '_');
}

function parseJwtSubject(token) {
  try {
    var parts = String(token || '').split('.');
    if (parts.length < 2) return '';
    var payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (payload.length % 4) payload += '=';
    var decoded = atob(payload);
    var parsed = JSON.parse(decoded);
    return String(parsed && parsed.sub ? parsed.sub : '').trim();
  } catch (e) {
    return '';
  }
}

function deriveUserStorageKey(profile) {
  var p = profile || {};
  var id = sanitizeIdentityFragment(p.id);
  if (id) return 'id:' + id;
  var email = sanitizeIdentityFragment(p.email);
  if (email) return 'email:' + email;
  var phone = sanitizeIdentityFragment(p.phone);
  if (phone) return 'phone:' + phone;
  var name = sanitizeIdentityFragment(p.name);
  if (name) return 'name:' + name;
  return 'guest';
}

function isValidUserStorageKey(userKey) {
  var key = String(userKey || '').trim().toLowerCase();
  if (!key) return false;
  if (key === 'guest') return true;
  return /^(id|email|phone|name):[a-z0-9_@.-]+$/.test(key);
}

function normalizeStoredUserStorageKey(rawKey) {
  var key = String(rawKey || '').trim().toLowerCase();
  if (!key) return '';
  if (isValidUserStorageKey(key)) return key;

  // 兼容早期错误清洗：email_xxx@a.com => email:xxx@a.com
  var patched = key
    .replace(/^id_/, 'id:')
    .replace(/^email_/, 'email:')
    .replace(/^phone_/, 'phone:')
    .replace(/^name_/, 'name:');
  if (isValidUserStorageKey(patched)) return patched;
  return '';
}

function buildDefaultStateForUser(profile) {
  var state = deepClone(defaultState);
  state.user = Object.assign({}, state.user || {}, profile || {});
  return state;
}

const AppState = {
  user: null,
  tasks: [],
  pomodoroSessions: [],
  checkins: [],
  settings: {},
  labels: [],
  currentUserKey: 'guest',

  getStorageKeyForUserKey(userKey) {
    return STORAGE_KEY_PREFIX + String(userKey || 'guest');
  },

  getCurrentUserKey() {
    return this.currentUserKey || 'guest';
  },

  getActiveStorageKey() {
    return this.getStorageKeyForUserKey(this.getCurrentUserKey());
  },

  resolveCurrentUserKey(userHint) {
    if (userHint) {
      return deriveUserStorageKey(userHint);
    }

    try {
      var token = localStorage.getItem('token');
      var sub = parseJwtSubject(token);
      if (sub) {
        return deriveUserStorageKey({ email: sub });
      }
    } catch (e) {}

    try {
      var active = normalizeStoredUserStorageKey(localStorage.getItem(ACTIVE_USER_KEY));
      if (active) return active;
    } catch (e) {}

    try {
      var legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacyRaw) {
        var legacyParsed = JSON.parse(legacyRaw);
        if (legacyParsed && legacyParsed.user) {
          return deriveUserStorageKey(legacyParsed.user);
        }
      }
    } catch (e) {}

    return 'guest';
  },

  loadStateByUserKey(userKey, userHint) {
    var key = this.getStorageKeyForUserKey(userKey);
    var parsed = null;

    try {
      var raw = localStorage.getItem(key);
      if (raw) parsed = JSON.parse(raw);
    } catch (e) {
      parsed = null;
    }

    if (!parsed) {
      try {
        var legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacyRaw) {
          var legacyParsed = JSON.parse(legacyRaw);
          var legacyUserKey = deriveUserStorageKey((legacyParsed && legacyParsed.user) || {});
          if (legacyUserKey === userKey) {
            parsed = legacyParsed;
          }
        }
      } catch (e) {
        parsed = null;
      }
    }

    if (!parsed || typeof parsed !== 'object') {
      parsed = buildDefaultStateForUser(userHint);
    }

    parsed.user = Object.assign({}, defaultState.user, parsed.user || {}, userHint || {});
    if (userHint && userHint.email && !userHint.phone) {
      parsed.user.phone = '';
    }
    parsed.tasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];
    parsed.pomodoroSessions = Array.isArray(parsed.pomodoroSessions) ? parsed.pomodoroSessions : [];
    parsed.checkins = Array.isArray(parsed.checkins) ? parsed.checkins : [];
    parsed.settings = parsed.settings && typeof parsed.settings === 'object'
      ? Object.assign({}, deepClone(defaultState.settings), parsed.settings)
      : deepClone(defaultState.settings);
    parsed.labels = Array.isArray(parsed.labels) ? parsed.labels : deepClone(defaultState.labels);

    return parsed;
  },

  applyLoadedState(parsed, userKey) {
    this.currentUserKey = String(userKey || 'guest');
    this.user = parsed.user || null;
    this.tasks = parsed.tasks || [];
    this.pomodoroSessions = parsed.pomodoroSessions || [];
    this.checkins = parsed.checkins || [];
    this.settings = parsed.settings || deepClone(defaultState.settings);
    this.labels = parsed.labels || deepClone(defaultState.labels);
  },

  runStorageHygiene(force) {
    var shouldRun = !!force;
    if (!shouldRun) {
      try {
        shouldRun = !localStorage.getItem(STORAGE_HYGIENE_FLAG_KEY);
      } catch (e) {
        shouldRun = false;
      }
    }
    if (!shouldRun) return;

    var toRemove = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (!key) continue;

        if (
          key === 'todoTasks' ||
          key === 'todoTags' ||
          key === 'todoPendingCreates_v1' ||
          key.indexOf('todoTasks::') === 0 ||
          key.indexOf('todoTags::') === 0 ||
          key.indexOf('todoPendingCreates_v1::') === 0
        ) {
          toRemove.push(key);
          continue;
        }

        if (key.indexOf(STORAGE_KEY_PREFIX) === 0) {
          var userPart = key.slice(STORAGE_KEY_PREFIX.length);
          if (!isValidUserStorageKey(userPart)) {
            toRemove.push(key);
            continue;
          }
          try {
            var raw = localStorage.getItem(key);
            var parsed = raw ? JSON.parse(raw) : null;
            if (!parsed || typeof parsed !== 'object') {
              toRemove.push(key);
            }
          } catch (e) {
            toRemove.push(key);
          }
        }
      }
    } catch (e) {
      toRemove = [];
    }

    for (var j = 0; j < toRemove.length; j++) {
      try { localStorage.removeItem(toRemove[j]); } catch (e) {}
    }

    try {
      var active = normalizeStoredUserStorageKey(localStorage.getItem(ACTIVE_USER_KEY));
      if (!active) {
        localStorage.removeItem(ACTIVE_USER_KEY);
      } else {
        localStorage.setItem(ACTIVE_USER_KEY, active);
      }
    } catch (e) {}

    try { localStorage.setItem(STORAGE_HYGIENE_FLAG_KEY, String(Date.now())); } catch (e) {}
  },

  init(userHint) {
    this.runStorageHygiene(false);
    var inferredHint = userHint || null;
    if (!inferredHint) {
      try {
        var token = localStorage.getItem('token');
        var sub = parseJwtSubject(token);
        if (sub) {
          var profile = { email: sub };
          var phoneMatch = String(sub).match(/^(1\d{10})@mobile\.local$/i);
          if (phoneMatch) {
            profile.phone = phoneMatch[1];
            profile.name = '用户' + profile.phone.slice(-4);
          } else {
            profile.name = String(sub).split('@')[0] || sub;
          }
          inferredHint = profile;
        }
      } catch (e) {}
    }

    var userKey = this.resolveCurrentUserKey(inferredHint);
    var parsed = this.loadStateByUserKey(userKey, inferredHint);
    this.applyLoadedState(parsed, userKey);
    try { localStorage.setItem(ACTIVE_USER_KEY, userKey); } catch (e) {}
    this.save();
    return this;
  },

  switchUser(userHint) {
    this.runStorageHygiene(false);
    var userKey = deriveUserStorageKey(userHint || {});
    var parsed = this.loadStateByUserKey(userKey, userHint || {});
    this.applyLoadedState(parsed, userKey);
    try { localStorage.setItem(ACTIVE_USER_KEY, userKey); } catch (e) {}
    this.save();

    // 清理旧的全局兜底缓存，避免账号切换时误读上一个用户草稿
    try { localStorage.removeItem('todoTasks'); } catch (e) {}
    try { localStorage.removeItem('todoTags'); } catch (e) {}
    try { localStorage.removeItem('todoPendingCreates_v1'); } catch (e) {}

    return this;
  },

  reset() {
    var state = buildDefaultStateForUser(this.user || {});
    this.user = state.user;
    this.tasks = state.tasks;
    this.pomodoroSessions = [];
    this.checkins = [];
    this.settings = deepClone(defaultState.settings);
    this.labels = deepClone(defaultState.labels);
    this.save();
  },

  save() {
    var payload = {
      user: this.user,
      tasks: this.tasks,
      pomodoroSessions: this.pomodoroSessions,
      checkins: this.checkins,
      settings: this.settings,
      labels: this.labels
    };

    var activeKey = this.getActiveStorageKey();
    try {
      localStorage.setItem(activeKey, JSON.stringify(payload));
    } catch (e) {}

    // 兼容旧逻辑（主题、跨页刷新等模块仍在读取 legacy key）
    try {
      localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {}

    try {
      var u = this.user || {};
      var hasIdentity = !!(u.id || u.email || u.phone || u.name);
      if (hasIdentity) {
        localStorage.setItem(ACTIVE_USER_KEY, this.getCurrentUserKey());
      } else {
        localStorage.removeItem(ACTIVE_USER_KEY);
      }
    } catch (e) {}
  },

  logout() {
    this.user = null;
    this.currentUserKey = 'guest';
    try { localStorage.removeItem('token'); } catch (e) {}
    try { localStorage.removeItem('devSkipAuth'); } catch (e) {}
    try { sessionStorage.setItem('skipLoginAutoRedirect', '1'); } catch (e) {}
    try { localStorage.removeItem(ACTIVE_USER_KEY); } catch (e) {}
    this.save();
  }
};

function generateId(prefix = 'id') {
  return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
}

function getTodayIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

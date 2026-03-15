// 共享全局数据状态与 localStorage
const STORAGE_KEY = 'qingyue_todo_app_state_v1';

const defaultState = {
  user: {
    id: 'u1',
    name: '轻悦用户',
    email: 'demo@qingyue.com',
    phone: '13800000000',
    level: 3,
    exp: 860,
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
    theme: 'system',
    themeColor: 'blue',
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

const AppState = {
  user: null,
  tasks: [],
  pomodoroSessions: [],
  checkins: [],
  settings: {},
  labels: [],
  init() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        this.user = parsed.user || defaultState.user;
        this.tasks = parsed.tasks || [];
        this.pomodoroSessions = parsed.pomodoroSessions || [];
        this.checkins = parsed.checkins || [];
        this.settings = parsed.settings || defaultState.settings;
        this.labels = parsed.labels || defaultState.labels;
      } catch (err) {
        console.warn('state parse failed', err);
        this.reset();
      }
    } else {
      this.reset();
    }
    return this;
  },
  reset() {
    this.user = defaultState.user;
    this.tasks = defaultState.tasks.slice();
    this.pomodoroSessions = [];
    this.checkins = [];
    this.settings = JSON.parse(JSON.stringify(defaultState.settings));
    this.labels = defaultState.labels.slice();
    this.save();
  },
  save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      user: this.user,
      tasks: this.tasks,
      pomodoroSessions: this.pomodoroSessions,
      checkins: this.checkins,
      settings: this.settings,
      labels: this.labels
    }));
  },
  logout() {
    this.user = null;
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

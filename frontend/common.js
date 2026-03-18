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

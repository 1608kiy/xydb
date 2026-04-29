
      // 日期显示
      function setCurrentDate() {
        var now = new Date();
        var options = {
          month: 'long',
          day: 'numeric',
          weekday: 'long'
        };
        var dateString = now.toLocaleDateString('zh-CN', options);
        var el = document.getElementById('current-date');
        if (el) {
          el.textContent = '今天 ' + dateString;
        }
      }
      window.addEventListener('load', setCurrentDate);

      // 消息提示
      function showMessage(message, type = 'info') {
        if (window.__unifiedShowToast) {
          window.__unifiedShowToast(message, type || 'info');
        }
      }

      // 番茄钟逻辑
      document.addEventListener('DOMContentLoaded', function () {
        if (typeof checkAuthOnLoad === 'function') { checkAuthOnLoad().catch(function(){}); }
        AppState.init();
        
        class PomodoroTimer {
          constructor() {
            const pomodoroSettings = (AppState.settings && AppState.settings.pomodoro) || { focus: 25, shortBreak: 5, longBreak: 15, autoStartFocus: false, autoStartBreak: false };
            this.config = {
              modes: {
                focus: { label: '专注', seconds: pomodoroSettings.focus * 60, color: 'from-primary to-secondary' },
                short: { label: '短休息', seconds: pomodoroSettings.shortBreak * 60, color: 'from-info to-blue-400' },
                long: { label: '长休息', seconds: pomodoroSettings.longBreak * 60, color: 'from-success to-green-400' }
              },
              autoStartNext: false,
              autoStartFocus: pomodoroSettings.autoStartFocus,
              autoStartBreak: pomodoroSettings.autoStartBreak
            };
            this.state = {
              currentMode: 'focus',
              timeLeft: 25 * 60,
              isRunning: false,
              timerId: null,
              selectedTaskId: '',
              sessionTaskName: '',
              todayPomodoro: 0,
              cycle: 0,
              pomodoroIndex: 0,
              history: []
            };
            this.tasks = this.loadTasksFromAppState();
            this.dom = {
              timerDisplay: document.getElementById('timer-display'),
              startBtn: document.getElementById('start-btn'),
              startBtnText: document.getElementById('start-btn-text'),
              resetBtn: document.getElementById('reset-btn'),
              modeBtns: Array.from(document.querySelectorAll('.mode-btn')),
              currentModeLabel: document.getElementById('current-mode-label'),
              progressCircle: document.getElementById('progress-circle'),
              taskSelect: document.getElementById('task-select'),
              taskSelectContainer: document.getElementById('task-select-container'),
              taskSelectDisplay: document.getElementById('task-select-display'),
              taskSelectText: document.getElementById('task-select-text'),
              taskSelectOptions: document.getElementById('task-select-options'),
              taskSelectArrow: document.querySelector('.task-select-arrow'),
              currentTaskLabel: document.getElementById('current-task-label'),
              todayCountEl: document.getElementById('today-count'),
              cycleCountEl: document.getElementById('cycle-count'),
              pomodoroCountEl: document.getElementById('pomodoro-count'),
              sessionHistory: document.getElementById('session-history'),
              clearHistoryBtn: document.getElementById('clear-history-btn'),
              taskCards: document.getElementById('task-cards'),
              mobileTaskBtn: document.getElementById('mobile-task-btn'),
              mobileTaskModal: document.getElementById('mobile-task-modal'),
              mobileTaskList: document.getElementById('mobile-task-list'),
              mobileTaskClose: document.getElementById('mobile-task-close'),
              toast: document.getElementById('toast'),
              autoStartToggle: document.getElementById('auto-start-toggle'),
              summaryToday: document.getElementById('summary-today'),
              summaryCycle: document.getElementById('summary-cycle'),
              summarySuggest: document.getElementById('summary-suggest'),
              modeTip: document.getElementById('mode-tip'),
              streakDisplay: document.getElementById('streak-display'),
              totalPomodoro: document.getElementById('total-pomodoro')
            };
            this.notificationEnabled = false;
            this.isDropdownOpen = false;
            this.init();
          }

          loadTasksFromAppState() {
            if (!AppState || !Array.isArray(AppState.tasks) || AppState.tasks.length === 0) {
              return [];
            }
            return AppState.tasks
              .filter((t) => String(t.status || '').toLowerCase() === 'pending')
              .map((t) => ({
                id: t.id,
                name: t.title || t.name || '未命名任务',
                category: (t.labels && t.labels.length > 0) ? String(t.labels[0]).toLowerCase() : 'work',
                estimate: t.estimate || 1
              }));
          }

          ensureStateContainers() {
            if (!Array.isArray(AppState.tasks)) AppState.tasks = [];
            if (!Array.isArray(AppState.pomodoroSessions)) AppState.pomodoroSessions = [];
            if (!AppState.settings || typeof AppState.settings !== 'object') AppState.settings = {};
            if (!AppState.settings.pomodoro || typeof AppState.settings.pomodoro !== 'object') {
              AppState.settings.pomodoro = {};
            }
          }

          syncTasksFromAppState(options = {}) {
            this.tasks = this.loadTasksFromAppState();

            const exists = this.tasks.some((task) => String(task.id) === String(this.state.selectedTaskId));
            if (!exists) {
              this.state.selectedTaskId = '';
            }

            this.renderTasks();
            this.renderTaskOptions();

            if (!options.skipSave) {
              this.saveStorage();
            }
          }

          init() {
            this.ensureStateContainers();
            this.loadStorage();
            this.syncTasksFromAppState({ skipSave: true });
            this.bindEvents();
            this.updateModeButtons();
            this.setMode(this.state.currentMode, false);
            this.updateTimerUI();
            this.updateStatsUI();
            this.checkNotificationPermission();
            this.updateAchievementStats();
          }

          loadStorage() {
            try {
              const saved = JSON.parse(localStorage.getItem('pomodoroState') || '{}');
              if (saved.todayPomodoro != null) this.state.todayPomodoro = saved.todayPomodoro;
              if (saved.cycle != null) this.state.cycle = saved.cycle;
              if (saved.pomodoroIndex != null) this.state.pomodoroIndex = saved.pomodoroIndex;
              if (Array.isArray(saved.history)) this.state.history = saved.history;
              if (saved.currentMode) this.state.currentMode = saved.currentMode;
              if (saved.timeLeft != null) this.state.timeLeft = saved.timeLeft;
              if (Object.prototype.hasOwnProperty.call(saved, 'selectedTaskId')) this.state.selectedTaskId = saved.selectedTaskId;
              if (saved.autoStartFocus != null) this.config.autoStartFocus = saved.autoStartFocus;
              if (saved.autoStartBreak != null) this.config.autoStartBreak = saved.autoStartBreak;
              if (this.dom.autoStartToggle) this.dom.autoStartToggle.checked = this.config.autoStartFocus;
            } catch (e) {
              console.warn('加载本地数据失败', e);
            }
          }

          saveStorage() {
            localStorage.setItem(
              'pomodoroState',
              JSON.stringify({
                todayPomodoro: this.state.todayPomodoro,
                cycle: this.state.cycle,
                pomodoroIndex: this.state.pomodoroIndex,
                history: this.state.history,
                currentMode: this.state.currentMode,
                timeLeft: this.state.timeLeft,
                selectedTaskId: this.state.selectedTaskId,
                autoStartFocus: this.config.autoStartFocus,
                autoStartBreak: this.config.autoStartBreak
              })
            );
          }

          formatTime(seconds) {
            const m = String(Math.floor(seconds / 60)).padStart(2, '0');
            const s = String(seconds % 60).padStart(2, '0');
            return `${m}:${s}`;
          }

          showToast(message) {
            showMessage(message, 'success');
          }

          checkNotificationPermission() {
            if (!('Notification' in window)) {
              this.notificationEnabled = false;
              return;
            }
            this.notificationEnabled = Notification.permission === 'granted';
          }

          notify(title, body) {
            if (this.notificationEnabled) {
              try {
                new Notification(title, { body });
                return;
              } catch (e) {
                this.notificationEnabled = false;
              }
            }
            this.showToast(`${title} ${body}`);
          }

          renderTasks() {
            if (!this.dom.taskCards) return;
            this.dom.taskCards.innerHTML = '';

            if (!this.tasks.length) {
              const empty = document.createElement('div');
              empty.className = 'text-xs text-gray-500 glass border border-dashed border-white/35 rounded-xl px-3 py-4 text-center';
              empty.textContent = '暂无待办任务，去待办页面创建后即可在这里绑定番茄钟。';
              this.dom.taskCards.appendChild(empty);
              this.renderMobileTaskList();
              return;
            }

            this.tasks.forEach((task) => {
              const card = document.createElement('div');
              card.className = 'task-card';
              card.dataset.taskId = task.id;
              const tagClass = {
                work: 'bg-blue-100 text-blue-700',
                study: 'bg-purple-100 text-purple-700',
                life: 'bg-pink-100 text-pink-700',
                health: 'bg-green-100 text-green-700'
              }[task.category] || 'bg-gray-100 text-gray-700';

              card.innerHTML = `
                <div class="flex justify-between items-center">
                  <span class="text-sm font-medium text-gray-800">${task.name}</span>
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${tagClass}">${task.category}</span>
                </div>
                <div class="text-xs text-gray-500 mt-1">预计 ${task.estimate} 个番茄</div>
              `;
              if (String(this.state.selectedTaskId) === String(task.id)) {
                card.classList.add('selected');
              }
              card.addEventListener('click', () => this.onTaskClick(task.id));
              this.dom.taskCards.appendChild(card);
            });
            this.renderMobileTaskList();
          }

          renderMobileTaskList() {
            if (!this.dom.mobileTaskList) return;
            this.dom.mobileTaskList.innerHTML = '';

            if (!this.tasks.length) {
              const empty = document.createElement('div');
              empty.className = 'text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-4 text-center';
              empty.textContent = '暂无待办任务';
              this.dom.mobileTaskList.appendChild(empty);
              return;
            }

            this.tasks.forEach((task) => {
              const btn = document.createElement('button');
              btn.type = 'button';
              btn.className = 'w-full text-left border border-gray-200 rounded-xl p-3 mb-2 hover:border-primary hover:bg-primary/5 transition-all duration-300';
              btn.innerHTML = `
                <div class="font-medium text-gray-800">${task.name}</div>
                <div class="text-xs text-gray-500 mt-1">预计 ${task.estimate} 个番茄</div>
              `;
              btn.addEventListener('click', () => {
                this.selectTask(task.id);
                this.dom.mobileTaskModal.classList.add('hidden');
              });
              this.dom.mobileTaskList.appendChild(btn);
            });
          }

          renderTaskOptions() {
            if (!this.dom.taskSelectOptions) return;

            let optionsHtml = '<div class="task-select-option" data-value="">不选择任务，仅计时</div>';
            this.tasks.forEach((task) => {
              const selected = String(task.id) === String(this.state.selectedTaskId) ? 'selected' : '';
              optionsHtml += `<div class="task-select-option ${selected}" data-value="${task.id}">${task.name}</div>`;
            });

            this.dom.taskSelectOptions.innerHTML = optionsHtml;
            this.updateCurrentTaskLabel();

            if (this.dom.taskSelect) {
              this.dom.taskSelect.innerHTML = '<option value="">不选择任务，仅计时</option>';
              this.tasks.forEach((task) => {
                const option = document.createElement('option');
                option.value = task.id;
                option.textContent = task.name;
                this.dom.taskSelect.appendChild(option);
              });
              this.dom.taskSelect.value = this.state.selectedTaskId || '';
            }
          }

          updateCurrentTaskLabel() {
            const selected = this.tasks.find((t) => String(t.id) === String(this.state.selectedTaskId));
            const taskName = selected ? selected.name : '不选择任务，仅计时';
            if (this.dom.taskSelectText) {
              this.dom.taskSelectText.textContent = taskName;
            }
            if (this.dom.currentTaskLabel) {
              this.dom.currentTaskLabel.textContent = selected ? selected.name : '未选择任务';
            }
          }

          toggleDropdown() {
            if (!this.dom.taskSelectContainer || !this.dom.taskSelectOptions) return;
            this.isDropdownOpen = !this.isDropdownOpen;
            if (this.isDropdownOpen) {
              this.dom.taskSelectContainer.classList.add('open');
            } else {
              this.dom.taskSelectContainer.classList.remove('open');
            }
          }

          closeDropdown() {
            if (!this.dom.taskSelectContainer || !this.dom.taskSelectOptions) return;
            this.isDropdownOpen = false;
            this.dom.taskSelectContainer.classList.remove('open');
          }

          updateTimerUI() {
            if (!this.dom.timerDisplay || !this.dom.progressCircle) return;
            this.dom.timerDisplay.textContent = this.formatTime(this.state.timeLeft);
            const total = this.config.modes[this.state.currentMode].seconds;
            const progress = 1 - this.state.timeLeft / total;
            const degrees = progress * 360;
            this.dom.progressCircle.style.transform = `rotate(${degrees - 90}deg)`;

            if (this.state.timeLeft <= 10 && this.state.currentMode === 'focus' && this.state.isRunning) {
              this.dom.timerDisplay.classList.add('text-danger', 'animate-pulse');
            } else {
              this.dom.timerDisplay.classList.remove('text-danger', 'animate-pulse');
            }
          }

          updateStatsUI() {
            if (this.dom.todayCountEl) this.dom.todayCountEl.textContent = String(this.state.todayPomodoro);
            if (this.dom.cycleCountEl) this.dom.cycleCountEl.textContent = String(this.state.cycle);
            if (this.dom.pomodoroCountEl) this.dom.pomodoroCountEl.textContent = String(this.state.pomodoroIndex);
            this.updateSummary();
          }

          updateSummary() {
            if (!this.dom.summaryToday || !this.dom.summaryCycle || !this.dom.summarySuggest) return;
            this.dom.summaryToday.textContent = `${this.state.todayPomodoro} 个`;
            this.dom.summaryCycle.textContent = `第 ${this.state.cycle + 1} 轮`;
            this.dom.summarySuggest.textContent = this.state.currentMode === 'focus' ? '完成后休息' : '继续保持';
          }

          updateAchievementStats() {
            if (!this.dom.streakDisplay || !this.dom.totalPomodoro) return;
            const totalPomodoros = AppState.pomodoroSessions ? AppState.pomodoroSessions.length : 0;
            this.dom.totalPomodoro.textContent = `${totalPomodoros} 个`;
            this.dom.streakDisplay.textContent = `${this.state.cycle} 天`;
          }

          updateModeButtons() {
            const focusBtn = document.querySelector('.mode-btn[data-mode="focus"]');
            const shortBtn = document.querySelector('.mode-btn[data-mode="short"]');
            const longBtn = document.querySelector('.mode-btn[data-mode="long"]');
            
            const focusMinutes = this.config.modes.focus.seconds / 60;
            const shortMinutes = this.config.modes.short.seconds / 60;
            const longMinutes = this.config.modes.long.seconds / 60;
            
            if (focusBtn) {
              focusBtn.innerHTML = `<i class="fas fa-fire mr-1"></i>专注 ${focusMinutes}'`;
            }
            if (shortBtn) {
              shortBtn.innerHTML = `<i class="fas fa-coffee mr-1"></i>短休 ${shortMinutes}'`;
            }
            if (longBtn) {
              longBtn.innerHTML = `<i class="fas fa-bed mr-1"></i>长休 ${longMinutes}'`;
            }
          }

          setMode(mode, resetTime = true) {
            if (!this.config.modes[mode]) return;
            if (this.state.isRunning) {
              this.stop();
            }
            this.state.currentMode = mode;
            if (resetTime) {
              this.state.timeLeft = this.config.modes[mode].seconds;
            }
            this.dom.modeBtns.forEach((btn) => {
              const m = btn.dataset.mode;
              if (m === mode) {
                btn.classList.add('active');
              } else {
                btn.classList.remove('active');
              }
            });
            if (this.dom.currentModeLabel) {
              this.dom.currentModeLabel.textContent = this.config.modes[mode].label;
            }
            if (this.dom.modeTip) {
              this.dom.modeTip.textContent = `当前：${this.config.modes[mode].label}`;
            }
            
            // ✅ 添加外圈平滑旋转动画
            if (this.dom.progressCircle) {
              this.dom.progressCircle.classList.add('mode-changing');
              setTimeout(() => {
                this.dom.progressCircle.classList.remove('mode-changing');
              }, 600);
            }
            
            this.updateTimerUI();
            this.saveStorage();
          }

          start() {
            if (this.state.isRunning) return;
            if (this.state.timeLeft <= 0) {
              this.state.timeLeft = this.config.modes[this.state.currentMode].seconds;
            }
            this.state.isRunning = true;
            if ('Notification' in window && Notification.permission === 'default') {
              Notification.requestPermission().then((p) => {
                this.notificationEnabled = p === 'granted';
              });
            }
            this.state.sessionTaskName = this.getTaskNameById(this.state.selectedTaskId) || '未关联任务';
            if (this.dom.taskSelect) this.dom.taskSelect.disabled = true;
            this.setTaskCardsDisabled(true);
            this.dom.startBtn.innerHTML = '<i class="fas fa-pause"></i><span class="ml-2" id="start-btn-text">暂停</span>';
            this.state.timerId = setInterval(() => {
              this.state.timeLeft -= 1;
              if (this.state.timeLeft <= 0) {
                this.state.timeLeft = 0;
                this.updateTimerUI();
                this.completeCurrentSession();
                return;
              }
              this.updateTimerUI();
            }, 1000);
          }

          stop() {
            if (this.state.timerId) {
              clearInterval(this.state.timerId);
              this.state.timerId = null;
            }
            this.state.isRunning = false;
            this.dom.startBtn.innerHTML = '<i class="fas fa-play"></i><span class="ml-2" id="start-btn-text">开始</span>';
            if (this.dom.taskSelect) this.dom.taskSelect.disabled = false;
            this.setTaskCardsDisabled(false);
            this.saveStorage();
          }

          reset() {
            this.stop();
            this.state.timeLeft = this.config.modes[this.state.currentMode].seconds;
            this.updateTimerUI();
          }

          completeCurrentSession() {
            this.stop();
            if (this.state.currentMode === 'focus') {
              this.state.todayPomodoro += 1;
              this.state.pomodoroIndex += 1;
              const nowText = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
              const taskName = this.state.sessionTaskName;
              const record = `${nowText} - 完成 1 个番茄（${taskName}）`;
              this.state.history.unshift(record);
              if (this.state.history.length > 50) this.state.history.pop();
              if (this.state.pomodoroIndex % 4 === 0) {
                this.state.cycle += 1;
                this.showToast('已完成 4 个专注，建议长休息 🎉');
              }
              
              const pomodoroSession = {
                id: generateId('p'),
                taskId: this.state.selectedTaskId || null,
                mode: 'focus',
                plannedMinutes: this.config.modes['focus'].seconds / 60,
                actualMinutes: this.config.modes['focus'].seconds / 60,
                startedAt: new Date(Date.now() - this.config.modes['focus'].seconds * 1000).toISOString(),
                endedAt: new Date().toISOString(),
                completed: true
              };
              if (!Array.isArray(AppState.pomodoroSessions)) AppState.pomodoroSessions = [];
              AppState.pomodoroSessions.push(pomodoroSession);
              AppState.save();
              // 仅保存到本地，后端不提供这个接口
              
              this.updateHistoryUI();
              this.updateStatsUI();
              this.updateAchievementStats();
              this.notify('番茄完成', `完成 ${taskName} 的一个番茄`);
            }
            this.saveStorage();

            if (this.state.currentMode === 'focus' && this.config.autoStartBreak) {
              const nextMode = this.state.pomodoroIndex % 4 === 0 ? 'long' : 'short';
              this.setMode(nextMode);
              this.start();
            } else if (this.state.currentMode !== 'focus' && this.config.autoStartFocus) {
              this.setMode('focus');
              this.start();
            } else {
              if (this.state.currentMode === 'focus') {
                const nextMode = this.state.pomodoroIndex % 4 === 0 ? 'long' : 'short';
                this.setMode(nextMode);
              }
            }
          }

          clearHistory() {
            this.state.history = [];
            this.state.todayPomodoro = 0;
            this.state.cycle = 0;
            this.state.pomodoroIndex = 0;
            this.state.timeLeft = this.config.modes[this.state.currentMode].seconds;
            this.updateStatsUI();
            this.updateHistoryUI();
            this.updateTimerUI();
            this.saveStorage();
            showMessage('记录已清空', 'warning');
          }

          updateHistoryUI() {
            if (!this.dom.sessionHistory) return;
            this.dom.sessionHistory.innerHTML = '';
            if (this.state.history.length === 0) {
              const li = document.createElement('li');
              li.className = 'text-gray-400 text-center py-4 bg-primary/5 rounded-lg';
              li.textContent = '暂无记录';
              this.dom.sessionHistory.appendChild(li);
              return;
            }
            this.state.history.forEach((record) => {
              const li = document.createElement('li');
              li.className = 'flex items-start px-3 py-2 bg-gray-50/50 rounded-lg slide-up';
              li.innerHTML = `<i class="fas fa-check-circle text-success mr-2 mt-0.5"></i><span>${record}</span>`;
              this.dom.sessionHistory.appendChild(li);
            });
          }

          onTaskClick(taskId) {
            if (this.state.isRunning) return;
            this.selectTask(taskId);
          }

          selectTask(taskId) {
            this.state.selectedTaskId = taskId;
            if (this.dom.taskSelect) this.dom.taskSelect.value = taskId;
            this.updateCurrentTaskLabel();
            this.renderTasks();
            this.renderTaskOptions();
            this.closeDropdown();
            this.saveStorage();
          }

          getTaskNameById(id) {
            return this.tasks.find((t) => t.id === id)?.name;
          }

          setTaskCardsDisabled(disabled) {
            if (!this.dom.taskCards) return;
            this.dom.taskCards.querySelectorAll('[data-task-id]').forEach((card) => {
              card.style.pointerEvents = disabled ? 'none' : 'auto';
              card.style.opacity = disabled ? '0.6' : '1';
            });
          }

          bindEvents() {
            this.dom.modeBtns.forEach((btn) => {
              btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                this.setMode(mode, true);
              });
            });

            this.dom.startBtn.addEventListener('click', () => {
              if (this.state.isRunning) {
                this.stop();
              } else {
                this.start();
              }
            });

            this.dom.resetBtn.addEventListener('click', () => {
              this.reset();
            });

            if (this.dom.taskSelectDisplay) {
              this.dom.taskSelectDisplay.addEventListener('click', () => {
                if (!this.state.isRunning) {
                  this.toggleDropdown();
                }
              });
              this.dom.taskSelectDisplay.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (!this.state.isRunning) {
                    this.toggleDropdown();
                  }
                }
              });
            }

            if (this.dom.taskSelectOptions) {
              this.dom.taskSelectOptions.addEventListener('click', (e) => {
                const option = e.target.closest('.task-select-option');
                if (option && !option.classList.contains('is-disabled') && !this.state.isRunning) {
                  const value = option.dataset.value;
                  this.selectTask(value);
                }
              });
            }

            document.addEventListener('click', (e) => {
              if (this.dom.taskSelectContainer && !this.dom.taskSelectContainer.contains(e.target)) {
                this.closeDropdown();
              }
            });

            if (this.dom.clearHistoryBtn) {
              this.dom.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
            }

            if (this.dom.mobileTaskBtn) {
              this.dom.mobileTaskBtn.addEventListener('click', () => {
                this.dom.mobileTaskModal.classList.remove('hidden');
              });
            }

            if (this.dom.mobileTaskClose) {
              this.dom.mobileTaskClose.addEventListener('click', () => {
                this.dom.mobileTaskModal.classList.add('hidden');
              });
            }

            if (this.dom.mobileTaskModal) {
              this.dom.mobileTaskModal.addEventListener('click', (e) => {
                if (e.target === this.dom.mobileTaskModal) {
                  this.dom.mobileTaskModal.classList.add('hidden');
                }
              });
            }

            if (this.dom.autoStartToggle) {
              this.dom.autoStartToggle.addEventListener('change', () => {
                this.config.autoStartFocus = this.dom.autoStartToggle.checked;
                this.config.autoStartBreak = this.dom.autoStartToggle.checked;

                if (!AppState.settings || typeof AppState.settings !== 'object') AppState.settings = {};
                if (!AppState.settings.pomodoro || typeof AppState.settings.pomodoro !== 'object') {
                  AppState.settings.pomodoro = {};
                }

                AppState.settings.pomodoro.autoStartFocus = this.config.autoStartFocus;
                AppState.settings.pomodoro.autoStartBreak = this.config.autoStartBreak;
                AppState.save();
                this.saveStorage();
                showMessage(this.config.autoStartFocus ? '已开启自动开始' : '已关闭自动开始', 'info');
              });
            }

            const refreshTasks = () => {
              try {
                AppState.init();
                this.syncTasksFromAppState({ skipSave: true });
              } catch (e) {
                console.warn('同步任务列表失败', e);
              }
            };

            window.addEventListener('storage', (e) => {
              if (!e || !e.key) {
                refreshTasks();
                return;
              }
              var key = String(e.key);
              if (
                key === 'ringnote_app_state_v1' ||
                key === 'ringnote_active_user_v1' ||
                key.indexOf('ringnote_app_state_v2::') === 0
              ) {
                refreshTasks();
              }
            });

            document.addEventListener('visibilitychange', () => {
              if (!document.hidden) {
                refreshTasks();
              }
            });
          }
        }

        window.__pomodoroTimerInstance = new PomodoroTimer();
        renderHeader('pomodoro');
        renderFooter('pomodoro');
        bindGlobalLogout();
      });
      
      // ✅ 监听其他页面的 AppState 更新（跨页面同步）
      window.addEventListener('appstate-updated', function (e) {
        if (window.__pomodoroTimerInstance) {
          window.__pomodoroTimerInstance.syncTasksFromAppState();
          window.__pomodoroTimerInstance.renderTasks();
          if (window.__unifiedShowToast) {
            window.__unifiedShowToast('🍅 任务列表已刷新', 'info');
          }
        }
      }, false);
    

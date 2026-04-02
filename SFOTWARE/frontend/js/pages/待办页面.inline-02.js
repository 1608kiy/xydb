

// ... existing code ...

    // ==================== 鍏ㄥ眬鍙橀噺 ====================
    var tasks = { today: [], tomorrow: [] };
    var tags = [
      { key: 'work', name: '工作', color: 'task-work' },
      { key: 'study', name: '学习', color: 'task-study' },
      { key: 'life', name: '生活', color: 'task-life' },
      { key: 'health', name: '健康', color: 'task-health' }
    ];
    var currentEditingTask = null;
    var selectedModalPriority = 'medium';
    var selectedModalTag = 'work';
    var selectedDetailPriority = 'medium';
    var selectedTagColor = 'task-work';
    var selectedBatchTasks = [];
    var currentMainFilter = 'all';
    var currentTagFilter = null;
    var currentSearchKeyword = '';
    var currentSortMode = 'time';
    var isBatchMode = false;
    var pendingCreateQueue = [];
    var syncingPendingCreates = false;
    var PENDING_CREATE_KEY = 'todoPendingCreates_v1';

    function getPendingCreateStorageKey() {
      try {
        if (window.AppState && typeof window.AppState.getCurrentUserKey === 'function') {
          return PENDING_CREATE_KEY + '::' + window.AppState.getCurrentUserKey();
        }
      } catch (e) {}
      return PENDING_CREATE_KEY;
    }

    function getLegacyTodoTasksKey() {
      try {
        if (window.AppState && typeof window.AppState.getCurrentUserKey === 'function') {
          return 'todoTasks::' + window.AppState.getCurrentUserKey();
        }
      } catch (e) {}
      return 'todoTasks';
    }

    function getLegacyTodoTagsKey() {
      try {
        if (window.AppState && typeof window.AppState.getCurrentUserKey === 'function') {
          return 'todoTags::' + window.AppState.getCurrentUserKey();
        }
      } catch (e) {}
      return 'todoTags';
    }

    // ==================== 工具函数 ====================
    function showToast(message, type) {
      if (window.__unifiedShowToast) {
        window.__unifiedShowToast(message, type || 'success');
      }
    }

    function getSharedAppState() {
      if (typeof AppState !== 'undefined' && AppState) return AppState;
      if (typeof window !== 'undefined' && window.AppState) return window.AppState;
      return null;
    }

    function escapeHtml(text) {
      return String(text == null ? '' : text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function normalizeTaskSubtasks(task) {
      if (!task) return [];
      var raw = [];
      if (Array.isArray(task.subtasks)) raw = task.subtasks;
      else if (Array.isArray(task.subTasks)) raw = task.subTasks;
      else raw = [];
      return raw.map(function (s) {
        if (typeof s === 'string') return { title: s, completed: false };
        return {
          title: (s && (s.title || s.text || s.name) ? String(s.title || s.text || s.name) : '').trim(),
          completed: !!(s && (s.completed || s.done))
        };
      }).filter(function (s) {
        return !!s.title;
      });
    }

    function ensureTaskSubtasks(task) {
      if (!task) return [];
      var normalized = normalizeTaskSubtasks(task);
      task.subtasks = normalized;
      if (Object.prototype.hasOwnProperty.call(task, 'subTasks')) {
        task.subTasks = normalized.slice();
      }
      return normalized;
    }

    function toLocalDatetimeValue(value) {
      if (!value) return '';
      var date = value instanceof Date ? value : new Date(value);
      if (isNaN(date.getTime())) return '';
      var y = date.getFullYear();
      var m = String(date.getMonth() + 1).padStart(2, '0');
      var d = String(date.getDate()).padStart(2, '0');
      var hh = String(date.getHours()).padStart(2, '0');
      var mm = String(date.getMinutes()).padStart(2, '0');
      return y + '-' + m + '-' + d + 'T' + hh + ':' + mm;
    }

    function formatDatetimeDisplay(localValue) {
      if (!localValue) return '未设置截止时间';
      var date = new Date(localValue);
      if (isNaN(date.getTime())) return '未设置截止时间';
      var opts = { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };
      return date.toLocaleString('zh-CN', opts).replace(/\//g, '-');
    }

    function formatDetailDateLabel(dateValue) {
      if (!dateValue) return '选择日期';
      var date = new Date(dateValue + 'T00:00:00');
      if (isNaN(date.getTime())) return '选择日期';
      var week = ['日', '一', '二', '三', '四', '五', '六'];
      return dateValue.replace(/-/g, '/') + ' 周' + week[date.getDay()];
    }

    function formatDetailTimeLabel(timeValue) {
      if (!timeValue) return '选择时间';
      return String(timeValue).slice(0, 5);
    }

    var detailDateMenuView = null;
    var modalDateMenuView = null;

    function parseDateValueYMD(value) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return null;
      var parsed = new Date(String(value) + 'T00:00:00');
      if (isNaN(parsed.getTime())) return null;
      return parsed;
    }

    function toDateValueYMD(date) {
      if (!(date instanceof Date) || isNaN(date.getTime())) return '';
      var y = date.getFullYear();
      var m = String(date.getMonth() + 1).padStart(2, '0');
      var d = String(date.getDate()).padStart(2, '0');
      return y + '-' + m + '-' + d;
    }

    function normalizeDateMenuMonth(date) {
      if (!(date instanceof Date) || isNaN(date.getTime())) {
        var now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
      }
      return new Date(date.getFullYear(), date.getMonth(), 1);
    }

    function shiftDateMenuMonth(baseDate, offset) {
      var next = normalizeDateMenuMonth(baseDate);
      next.setMonth(next.getMonth() + offset);
      return normalizeDateMenuMonth(next);
    }

    function shiftDateMenuYear(baseDate, offset) {
      var next = normalizeDateMenuMonth(baseDate);
      next.setFullYear(next.getFullYear() + offset);
      return normalizeDateMenuMonth(next);
    }

    function resolveDateMenuView(selectedValue, currentView, preferCurrent) {
      if (preferCurrent && currentView instanceof Date && !isNaN(currentView.getTime())) {
        return normalizeDateMenuMonth(currentView);
      }
      var selected = parseDateValueYMD(selectedValue);
      if (selected) return new Date(selected.getFullYear(), selected.getMonth(), 1);
      return normalizeDateMenuMonth(currentView);
    }

    function buildDateCalendarMenuHtml(selectedValue, viewDate) {
      var monthView = normalizeDateMenuMonth(viewDate);
      var title = monthView.getFullYear() + '年' + String(monthView.getMonth() + 1).padStart(2, '0') + '月';
      var selected = selectedValue || '';
      var today = toDateValueYMD(new Date());
      var weekLabels = ['日', '一', '二', '三', '四', '五', '六'];

      var firstOfMonth = new Date(monthView.getFullYear(), monthView.getMonth(), 1);
      var gridStart = new Date(firstOfMonth);
      gridStart.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());

      var dayCells = '';
      for (var idx = 0; idx < 42; idx++) {
        var cellDate = new Date(gridStart);
        cellDate.setDate(gridStart.getDate() + idx);
        var dateValue = toDateValueYMD(cellDate);
        var classes = ['datetime-calendar-day'];
        if (cellDate.getMonth() !== monthView.getMonth()) classes.push('other-month');
        if (dateValue === today) classes.push('today');
        if (dateValue === selected) classes.push('selected');
        dayCells += '<button type="button" class="' + classes.join(' ') + '" data-date="' + dateValue + '">' + cellDate.getDate() + '</button>';
      }

      var weekdays = weekLabels.map(function (label) {
        return '<div class="datetime-calendar-weekday">' + label + '</div>';
      }).join('');

      return '' +
        '<div class="datetime-calendar">' +
          '<div class="datetime-calendar-header">' +
            '<div class="datetime-calendar-navs">' +
              '<button type="button" class="datetime-calendar-nav" data-calendar-action="change-year" data-step="-1" aria-label="上一年"><i class="fas fa-angle-double-left"></i></button>' +
              '<button type="button" class="datetime-calendar-nav" data-calendar-action="change-month" data-step="-1" aria-label="上个月"><i class="fas fa-angle-left"></i></button>' +
            '</div>' +
            '<button type="button" class="datetime-calendar-title" data-calendar-action="jump-current">' + title + '</button>' +
            '<div class="datetime-calendar-navs">' +
              '<button type="button" class="datetime-calendar-nav" data-calendar-action="change-month" data-step="1" aria-label="下个月"><i class="fas fa-angle-right"></i></button>' +
              '<button type="button" class="datetime-calendar-nav" data-calendar-action="change-year" data-step="1" aria-label="下一年"><i class="fas fa-angle-double-right"></i></button>' +
            '</div>' +
          '</div>' +
          '<div class="datetime-calendar-weekdays">' + weekdays + '</div>' +
          '<div class="datetime-calendar-grid">' + dayCells + '</div>' +
          '<div class="datetime-calendar-actions">' +
            '<button type="button" class="datetime-calendar-action" data-calendar-action="pick-today">今天</button>' +
            '<button type="button" class="datetime-calendar-action" data-calendar-action="clear-date">清空</button>' +
          '</div>' +
        '</div>';
    }

    function buildDetailTimeOptions() {
      var options = [];
      for (var hour = 0; hour < 24; hour++) {
        for (var minute = 0; minute < 60; minute += 15) {
          var value = String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0');
          options.push({ value: value, label: value });
        }
      }
      return options;
    }

    function normalizeTimeValue(value) {
      var raw = String(value || '').trim();
      var match = raw.match(/^(\d{1,2}):(\d{1,2})/);
      if (!match) return '';
      var hour = parseInt(match[1], 10);
      var minute = parseInt(match[2], 10);
      if (isNaN(hour) || isNaN(minute)) return '';
      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return '';
      return String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0');
    }

    function buildTimeMenuHtml(selectedValue) {
      var normalized = normalizeTimeValue(selectedValue) || '09:00';
      var hour = normalized.slice(0, 2);
      var minute = normalized.slice(3, 5);
      var quickHours = ['08', '09', '12', '14', '18', '21'];
      var quickMinutes = ['00', '15', '30', '45'];
      var quickHourHtml = quickHours.map(function (h) {
        return '<button type="button" class="datetime-time-pill" data-time-action="set-hour" data-hour="' + h + '">' + h + ' 时</button>';
      }).join('');
      var quickMinuteHtml = quickMinutes.map(function (m) {
        return '<button type="button" class="datetime-time-pill" data-time-action="set-minute" data-minute="' + m + '">' + m + ' 分</button>';
      }).join('');
      var optionsHtml = buildDetailTimeOptions().map(function (opt) {
        return '<button type="button" class="datetime-select-option' + (opt.value === normalized ? ' active' : '') + '" data-value="' + opt.value + '">' + opt.label + '</button>';
      }).join('');
      return '' +
        '<div class="datetime-time-panel">' +
          '<div class="datetime-time-custom">' +
            '<input class="datetime-time-field" type="number" min="0" max="23" data-time-input="hour" value="' + hour + '" />' +
            '<span class="datetime-time-sep">:</span>' +
            '<input class="datetime-time-field" type="number" min="0" max="59" data-time-input="minute" value="' + minute + '" />' +
            '<button type="button" class="datetime-time-pill" data-time-action="apply-custom">确定</button>' +
            '<button type="button" class="datetime-time-pill" data-time-action="pick-now">现在</button>' +
          '</div>' +
          '<div class="datetime-time-quick-row">' + quickHourHtml + '</div>' +
          '<div class="datetime-time-quick-row">' + quickMinuteHtml + '</div>' +
          '<div class="datetime-time-options">' + optionsHtml + '</div>' +
        '</div>';
    }

    function coerceTimeFromMenu(menu) {
      if (!menu) return '';
      var hourInput = menu.querySelector('[data-time-input="hour"]');
      var minuteInput = menu.querySelector('[data-time-input="minute"]');
      var hour = parseInt(hourInput ? hourInput.value : '', 10);
      var minute = parseInt(minuteInput ? minuteInput.value : '', 10);
      if (isNaN(hour) || isNaN(minute)) return '';
      hour = Math.max(0, Math.min(23, hour));
      minute = Math.max(0, Math.min(59, minute));
      return String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0');
    }

    function renderDetailDateMenu(keepView) {
      var menu = document.getElementById('detail-date-menu');
      var input = document.getElementById('detail-date-input');
      if (!menu || !input) return;
      var selected = input.value || '';
      detailDateMenuView = resolveDateMenuView(selected, detailDateMenuView, !!keepView);
      menu.classList.add('date-calendar-menu');
      menu.classList.remove('time-custom-menu');
      menu.innerHTML = buildDateCalendarMenuHtml(selected, detailDateMenuView);
    }

    function renderDetailTimeMenu() {
      var menu = document.getElementById('detail-time-menu');
      var input = document.getElementById('detail-time-input');
      if (!menu || !input) return;
      var selected = normalizeTimeValue(input.value || '');
      menu.classList.remove('date-calendar-menu');
      menu.classList.add('time-custom-menu');
      menu.innerHTML = buildTimeMenuHtml(selected);
    }

    function syncModalDateTimeLabels() {
      var modalDateInput = document.getElementById('modal-date');
      var modalTimeInput = document.getElementById('modal-time');
      var modalDateText = document.getElementById('modal-date-text');
      var modalTimeText = document.getElementById('modal-time-text');
      if (modalDateText) modalDateText.textContent = formatDetailDateLabel(modalDateInput ? modalDateInput.value : '');
      if (modalTimeText) modalTimeText.textContent = formatDetailTimeLabel(modalTimeInput ? modalTimeInput.value : '');
    }

    function renderModalDateMenu(keepView) {
      var menu = document.getElementById('modal-date-menu');
      var input = document.getElementById('modal-date');
      if (!menu || !input) return;
      var selected = input.value || '';
      modalDateMenuView = resolveDateMenuView(selected, modalDateMenuView, !!keepView);
      menu.classList.add('date-calendar-menu');
      menu.classList.remove('time-custom-menu');
      menu.innerHTML = buildDateCalendarMenuHtml(selected, modalDateMenuView);
    }

    function renderModalTimeMenu() {
      var menu = document.getElementById('modal-time-menu');
      var input = document.getElementById('modal-time');
      if (!menu || !input) return;
      var selected = normalizeTimeValue(input.value || '');
      menu.classList.remove('date-calendar-menu');
      menu.classList.add('time-custom-menu');
      menu.innerHTML = buildTimeMenuHtml(selected);
    }

    function refreshModalDateTimeSelectors() {
      syncModalDateTimeLabels();
      renderModalDateMenu();
      renderModalTimeMenu();
    }

    function closeModalDateTimeMenus() {
      toggleDatetimeSelectMenu('modal-date-shell', 'modal-date-menu', false);
      toggleDatetimeSelectMenu('modal-time-shell', 'modal-time-menu', false);
    }

    function toggleDatetimeSelectMenu(shellId, menuId, forceOpen) {
      var shell = document.getElementById(shellId);
      var menu = document.getElementById(menuId);
      if (!shell || !menu) return;
      var shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !menu.classList.contains('show');
      if (shouldOpen) {
        menu.classList.add('show');
        shell.classList.add('open');
        return;
      }
      menu.classList.remove('show');
      shell.classList.remove('open');
    }

    function closeDetailDateTimeMenus() {
      toggleDatetimeSelectMenu('detail-date-shell', 'detail-date-menu', false);
      toggleDatetimeSelectMenu('detail-time-shell', 'detail-time-menu', false);
    }

    function setDetailDatetimeFromValue(localValue) {
      var hidden = document.getElementById('detail-datetime');
      var dateInput = document.getElementById('detail-date-input');
      var timeInput = document.getElementById('detail-time-input');
      var dateText = document.getElementById('detail-date-text');
      var timeText = document.getElementById('detail-time-text');
      if (hidden) hidden.value = localValue || '';
      if (dateInput) dateInput.value = localValue ? localValue.slice(0, 10) : '';
      if (timeInput) timeInput.value = localValue ? localValue.slice(11, 16) : '';
      var text = document.getElementById('detail-datetime-text');
      if (text) text.textContent = formatDatetimeDisplay(localValue);
      if (dateText) dateText.textContent = formatDetailDateLabel(dateInput ? dateInput.value : '');
      if (timeText) timeText.textContent = formatDetailTimeLabel(timeInput ? timeInput.value : '');
      renderDetailDateMenu();
      renderDetailTimeMenu();
    }

    function updateDetailDatetimeFromSplitInputs() {
      var dateInput = document.getElementById('detail-date-input');
      var timeInput = document.getElementById('detail-time-input');
      var dateVal = dateInput ? dateInput.value : '';
      var timeVal = timeInput ? timeInput.value : '';
      if (!dateVal) {
        setDetailDatetimeFromValue('');
        return;
      }
      if (!timeVal) timeVal = '09:00';
      setDetailDatetimeFromValue(dateVal + 'T' + timeVal.slice(0, 5));
    }

    function closeDetailDatetimePanel() {
      var shell = document.getElementById('detail-datetime-shell');
      if (shell) shell.classList.remove('open');
      closeDetailDateTimeMenus();
    }

    function toggleDetailDatetimePanel(forceOpen) {
      var shell = document.getElementById('detail-datetime-shell');
      if (!shell) return;
      var shouldOpen = (typeof forceOpen === 'boolean') ? forceOpen : !shell.classList.contains('open');
      if (shouldOpen) shell.classList.add('open');
      else shell.classList.remove('open');
    }

    function applyQuickDueDate(mode) {
      var now = new Date();
      if (mode === 'clear') {
        setDetailDatetimeFromValue('');
        closeDetailDatetimePanel();
        return;
      }
      if (mode === 'tomorrow') now.setDate(now.getDate() + 1);
      var y = now.getFullYear();
      var m = String(now.getMonth() + 1).padStart(2, '0');
      var d = String(now.getDate()).padStart(2, '0');
      setDetailDatetimeFromValue(y + '-' + m + '-' + d + 'T09:00');
      closeDetailDatetimePanel();
    }

    function copyTextToClipboard(text) {
      var plain = String(text == null ? '' : text);
      if (!plain) return Promise.reject(new Error('empty'));
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(plain);
      }
      return new Promise(function (resolve, reject) {
        try {
          var input = document.createElement('textarea');
          input.value = plain;
          input.setAttribute('readonly', 'readonly');
          input.style.position = 'fixed';
          input.style.opacity = '0';
          document.body.appendChild(input);
          input.select();
          var ok = document.execCommand('copy');
          input.remove();
          if (ok) resolve();
          else reject(new Error('copy-failed'));
        } catch (err) {
          reject(err);
        }
      });
    }

    function buildTaskExportText(task) {
      if (!task) return '';
      ensureTaskSubtasks(task);
      var lines = [];
      lines.push('任务：' + (task.title || '未命名'));
      if (task.description) lines.push('描述：' + task.description);
      lines.push('优先级：' + ({ high: '高', medium: '中', low: '低' }[task.priority] || '中'));
      lines.push('截止时间：' + (task.dueAt ? formatDatetimeDisplay(toLocalDatetimeValue(task.dueAt)) : '未设置'));
      if (task.subtasks && task.subtasks.length) {
        lines.push('子任务：');
        task.subtasks.forEach(function (s, idx) {
          lines.push('  ' + (idx + 1) + '. ' + (s.completed ? '[已完成] ' : '[待办] ') + s.title);
        });
      }
      return lines.join('\n');
    }

    function shareOrCopyText(text, successMessage) {
      if (navigator.share) {
        return navigator.share({ title: '任务详情', text: text }).then(function () {
          showToast(successMessage || '任务已分享');
        }).catch(function () {
          return copyTextToClipboard(text).then(function () {
            showToast('分享内容已复制');
          });
        });
      }
      return copyTextToClipboard(text).then(function () {
        showToast('分享内容已复制');
      });
    }

    function syncCurrentSubtasksToServer() {
      if (!currentEditingTask || !currentEditingTask.id || isLocalTaskId(currentEditingTask.id)) {
        saveToLocalStorage();
        return Promise.resolve(true);
      }
      ensureTaskSubtasks(currentEditingTask);
      var payload = currentEditingTask.subtasks.map(function (s) {
        return { title: s.title || s.text || '', completed: !!s.completed };
      });
      return apiRequest('/api/tasks/' + currentEditingTask.id + '/subtasks', {
        method: 'PUT',
        body: JSON.stringify(payload)
      }).then(function (resp) {
        if (resp.status === 200 && resp.body && resp.body.code === 200) {
          saveToLocalStorage();
          return true;
        }
        throw new Error((resp.body && resp.body.message) || '子任务同步失败');
      });
    }

    function saveToLocalStorage() {
      // 统一使用 AppState 保存，确保跨页面同步
      try {
        // 灏嗗綋鍓嶉〉闈㈢殑浠诲姟鍚堝苟鍥?AppState
        var allTasks = (tasks.today || []).concat(tasks.tomorrow || []);
        var sharedState = getSharedAppState();
        if (sharedState && typeof sharedState.save === 'function') {
          sharedState.tasks = allTasks;
          sharedState.save();
          localStorage.setItem(getLegacyTodoTagsKey(), JSON.stringify(tags));
        } else {
          // 鍥為€€鍒版棫 key锛岄伩鍏?data.js 寮傚父鏃舵棤娉曚繚瀛?
          localStorage.setItem(getLegacyTodoTasksKey(), JSON.stringify(tasks));
          localStorage.setItem(getLegacyTodoTagsKey(), JSON.stringify(tags));
        }
      } catch (e) { console.error('保存失败:', e); }
    }
    function savePendingQueue() {
      try {
        localStorage.setItem(getPendingCreateStorageKey(), JSON.stringify(pendingCreateQueue));
        updateSyncStatusBadge();
      } catch (e) { console.error('待同步队列保存失败', e); }
    }

    function loadPendingQueue() {
      try {
        var raw = localStorage.getItem(getPendingCreateStorageKey());
        pendingCreateQueue = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(pendingCreateQueue)) pendingCreateQueue = [];
      } catch (e) {
        console.error('待同步队列加载失败', e);
        pendingCreateQueue = [];
      }
      updateSyncStatusBadge();
    }

    function updateSyncStatusBadge(mode) {
      var badge = document.getElementById('sync-status-badge');
      if (!badge) return;

      var pendingCount = pendingCreateQueue.length;
      var status = mode || (syncingPendingCreates ? 'syncing' : (pendingCount > 0 ? 'pending' : 'synced'));

      if (status === 'syncing') {
        badge.className = 'sync-status-text';
        badge.innerHTML = '<i class="fas fa-arrows-rotate animate-spin mr-1"></i>同步中' + (pendingCount > 0 ? '（' + pendingCount + '）' : '');
        return;
      }

      if (status === 'pending') {
        badge.className = 'sync-status-text';
        badge.innerHTML = '<i class="fas fa-cloud-arrow-up mr-1"></i>待同步（' + pendingCount + '）';
        return;
      }

      badge.className = 'sync-status-text';
      badge.innerHTML = '<i class="fas fa-check-circle mr-1"></i>已同步';
    }

    function normalizeServerTask(created, fallbackTag) {
      if (!created) return null;
      created.completed = (created.status === 'completed');
      created.time = created.dueAt ? (created.dueAt.split('T')[1] || '').replace(/:00$/, '') : '';
      ensureTaskSubtasks(created);
      try {
        if (typeof created.tags === 'string' && created.tags.trim()) {
          var parsed = JSON.parse(created.tags);
          created.tag = Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : (fallbackTag || null);
        } else if (Array.isArray(created.tags)) {
          created.tag = created.tags.length > 0 ? created.tags[0] : (fallbackTag || null);
        } else {
          created.tag = fallbackTag || created.tag || null;
        }
      } catch (e) {
        created.tag = fallbackTag || created.tag || null;
      }
      return created;
    }

    function replaceLocalTaskById(localId, serverTask) {
      var i = tasks.today.findIndex(function (t) { return String(t.id) === String(localId); });
      if (i > -1) {
        tasks.today[i] = serverTask;
        return true;
      }
      var j = tasks.tomorrow.findIndex(function (t) { return String(t.id) === String(localId); });
      if (j > -1) {
        tasks.tomorrow[j] = serverTask;
        return true;
      }
      return false;
    }

    function removePendingByLocalId(localId) {
      pendingCreateQueue = pendingCreateQueue.filter(function (q) {
        return String(q.localId) !== String(localId);
      });
      savePendingQueue();
    }

    function syncOfflineTasksToServer(silent) {
      if (syncingPendingCreates) return Promise.resolve();
      if (!pendingCreateQueue || pendingCreateQueue.length === 0) return Promise.resolve();
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return Promise.resolve();

      syncingPendingCreates = true;
      updateSyncStatusBadge('syncing');
      var succeeded = 0;

      var chain = Promise.resolve();
      pendingCreateQueue.slice().forEach(function (item) {
        chain = chain.then(function () {
          return apiRequest('/api/tasks', {
            method: 'POST',
            body: JSON.stringify(item.payload)
          }).then(function (resp) {
            if (!(resp.status === 200 && resp.body && resp.body.code === 200 && resp.body.data)) {
              throw new Error((resp.body && resp.body.message) || '同步失败');
            }

            var created = normalizeServerTask(resp.body.data, item.fallbackTag);
            replaceLocalTaskById(item.localId, created);

            pendingCreateQueue = pendingCreateQueue.filter(function (q) {
              return String(q.localId) !== String(item.localId);
            });
            savePendingQueue();
            succeeded++;
          });
        });
      });

      return chain.catch(function (err) {
        console.warn('离线任务同步中断:', err);
      }).finally(function () {
        syncingPendingCreates = false;
        updateSyncStatusBadge();
        renderTaskLists();
        updateCountStats();
        // 鍚屾 AppState 纭繚璺ㄩ〉闈㈡洿鏂?
        var allTasks = (tasks.today || []).concat(tasks.tomorrow || []);
        AppState.tasks = allTasks;
        AppState.save();
        if (!silent && succeeded > 0) {
          showToast('已自动同步 ' + succeeded + ' 条离线任务');
        }
      });
    }

    function isLocalTaskId(id) {
      return String(id || '').indexOf('local_') === 0;
    }

    // ============ 后端交互 ============
    function fetchTasksFromServer() {
      return apiRequest('/api/tasks', { method: 'GET' }).then(function (resp) {
        if (resp.status === 200 && resp.body && resp.body.code === 200) {
          // expect body.data to be an array
          var list = resp.body.data || [];
          // normalize and split into today/tomorrow by dueAt
          tasks.today = [];
          tasks.tomorrow = [];
          var todayStr = new Date().toISOString().slice(0, 10);
          list.forEach(function (t) {
            // normalize server model to client fields
            t.completed = (t.status === 'completed');
            t.time = t.dueAt ? (t.dueAt.split('T')[1] || '').replace(/:00$/, '') : '';
            ensureTaskSubtasks(t);
            // normalize tags: backend stores tags as JSON string or may return array
            try {
              if (typeof t.tags === 'string' && t.tags.trim()) {
                var parsed = JSON.parse(t.tags);
                t.tag = Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : null;
              } else if (Array.isArray(t.tags)) {
                t.tag = t.tags.length > 0 ? t.tags[0] : null;
              } else if (t.tag) {
                // already present
              } else {
                t.tag = null;
              }
            } catch (e) {
              t.tag = null;
            }

            var due = t.dueAt ? t.dueAt.split('T')[0] : null;
            if (due === todayStr) tasks.today.push(t);
            else tasks.tomorrow.push(t);
          });
          renderTaskLists();
          updateCountStats();
        } else {
          console.warn('获取任务失败', resp);
        }
      }).catch(function (err) { 
        console.error('fetchTasksFromServer error', err);
        showToast('任务同步失败，请检查网络或后端服务', 'error');
        return Promise.resolve();
      });
    }

    function updateTaskStatusOnServer(taskId, status) {
      return apiRequest('/api/tasks/' + taskId, {
        method: 'PUT',
        body: JSON.stringify({ status: status })
      }).then(function (resp) {
        if (resp.status === 200 && resp.body && resp.body.code === 200) return resp.body.data;
        throw new Error((resp.body && resp.body.message) || '更新失败');
      });
    }

    // 鏇存柊浠诲姟锛堥儴鍒嗘垨鍏ㄩ儴瀛楁锛?
    function updateTaskOnServer(taskId, payload) {
      return apiRequest('/api/tasks/' + taskId, {
        method: 'PUT',
        body: JSON.stringify(payload)
      }).then(function (resp) {
        if (resp.status === 200 && resp.body && resp.body.code === 200) return resp.body.data;
        throw new Error((resp.body && resp.body.message) || '更新失败');
      });
    }

    function createTagOnServer(tagName) {
      return apiRequest('/api/tags', {
        method: 'POST',
        body: JSON.stringify({ name: tagName })
      }).then(function (resp) {
        if (!(resp && (resp.status === 200 || resp.status === 201) && resp.body && resp.body.code === 200)) {
          throw new Error((resp && resp.body && resp.body.message) || '创建标签失败');
        }
        return (resp.body && resp.body.data) || {};
      });
    }

    // 鍒囨崲浠诲姟瀹屾垚鐘舵€侊紙鏈湴 UI 璋冪敤锛?
    function toggleTaskCompleteServer(taskId, isComplete, listName) {
      var newStatus = isComplete ? 'completed' : 'pending';
      updateTaskStatusOnServer(taskId, newStatus).then(function (updated) {
        // update local copy
        var list = (listName === 'today') ? tasks.today : tasks.tomorrow;
        var t = list.find(function (x) { return String(x.id) === String(taskId); });
        if (t) {
          t.status = (updated && updated.status) ? updated.status : newStatus;
          t.completed = (t.status === 'completed');
        }
        renderTaskLists();
        updateCountStats();
        showToast('已更新任务状态');
      }).catch(function (err) {
        console.error(err);
        showToast('更新任务状态失败', 'error');
        renderTaskLists();
      });
    }

    function loadFromLocalStorage() {
      // 缁熶竴浠?AppState 鍔犺浇锛屼繚璇佹暟鎹竴鑷存€?
      try {
        var allTasks = [];
        var sharedState = getSharedAppState();
        if (sharedState && Array.isArray(sharedState.tasks)) {
          allTasks = sharedState.tasks;
        } else {
          var saved = localStorage.getItem(getLegacyTodoTasksKey());
          if (saved) {
            var legacy = JSON.parse(saved);
            if (legacy && typeof legacy === 'object') {
              tasks = legacy;
            }
          }
          var savedTags = localStorage.getItem(getLegacyTodoTagsKey());
          if (savedTags) {
            var legacyTags = JSON.parse(savedTags);
            if (Array.isArray(legacyTags)) tags = legacyTags;
          }
          if (!tasks || typeof tasks !== 'object') tasks = { today: [], tomorrow: [] };
          if (!Array.isArray(tasks.today)) tasks.today = [];
          if (!Array.isArray(tasks.tomorrow)) tasks.tomorrow = [];
          tasks.today.forEach(function (t) { ensureTaskSubtasks(t); });
          tasks.tomorrow.forEach(function (t) { ensureTaskSubtasks(t); });
          return;
        }
        var todayStr = new Date().toISOString().slice(0, 10);
        tasks = { today: [], tomorrow: [] };
        
        allTasks.forEach(function (t) {
          ensureTaskSubtasks(t);
          var due = t.dueAt ? t.dueAt.split('T')[0] : null;
          if (due === todayStr) {
            tasks.today.push(t);
          } else {
            tasks.tomorrow.push(t);
          }
        });
        
        if (!Array.isArray(tasks.today)) tasks.today = [];
        if (!Array.isArray(tasks.tomorrow)) tasks.tomorrow = [];
      } catch (e) { console.error('加载失败:', e); }
    }

    function getTagName(tagKey) {
      var tag = tags.find(function (t) { return t.key === tagKey; });
      return tag ? tag.name : tagKey;
    }

    function normalizeTagTone(tagColor) {
      var raw = String(tagColor || '').trim().toLowerCase();
      if (!raw) return 'work';
      raw = raw.replace(/^bg-/, '');
      if (raw.indexOf('task-') === 0) raw = raw.slice(5);
      if (raw === 'work' || raw === 'study' || raw === 'life' || raw === 'health' || raw === 'primary' || raw === 'secondary') {
        return raw;
      }
      return 'primary';
    }

    function getTagVisualMeta(tagKey) {
      var tag = tags.find(function (t) { return t.key === tagKey; });
      var tone = normalizeTagTone(tag ? tag.color : 'task-work');
      var keyIcons = { work: 'fa-briefcase', study: 'fa-book', life: 'fa-home', health: 'fa-heart' };
      var toneIcons = {
        work: 'fa-briefcase',
        study: 'fa-book',
        life: 'fa-home',
        health: 'fa-heart',
        primary: 'fa-tag',
        secondary: 'fa-bookmark'
      };
      return {
        tone: tone,
        icon: keyIcons[String(tagKey || '').toLowerCase()] || toneIcons[tone] || 'fa-tag'
      };
    }

    function getTagColor(tagKey) {
      return getTagVisualMeta(tagKey).tone;
    }

    function getTagIcon(tagKey) {
      return getTagVisualMeta(tagKey).icon;
    }

    function getPriorityRank(priority) {
      var map = { high: 3, medium: 2, low: 1 };
      return map[String(priority || '').toLowerCase()] || 0;
    }

    function getTaskTimeValue(task) {
      if (task && task.dueAt) {
        var dueTs = new Date(task.dueAt).getTime();
        if (!Number.isNaN(dueTs)) return dueTs;
      }
      if (task && task.time) {
        var hhmm = String(task.time).split(':');
        var h = parseInt(hhmm[0], 10);
        var m = parseInt(hhmm[1], 10);
        if (!Number.isNaN(h) && !Number.isNaN(m)) return h * 60 + m;
      }
      return Number.MAX_SAFE_INTEGER;
    }

    function sortTaskList(list) {
      if (!Array.isArray(list)) return;
      list.sort(function (a, b) {
        if (currentSortMode === 'category') {
          var aCategory = getTagName(a.tag || '').toString();
          var bCategory = getTagName(b.tag || '').toString();
          var cDiff = aCategory.localeCompare(bCategory, 'zh-CN');
          if (cDiff !== 0) return cDiff;
          var cpDiff = getPriorityRank(b.priority) - getPriorityRank(a.priority);
          if (cpDiff !== 0) return cpDiff;
          return getTaskTimeValue(a) - getTaskTimeValue(b);
        }

        if (currentSortMode === 'priority') {
          var pDiff = getPriorityRank(b.priority) - getPriorityRank(a.priority);
          if (pDiff !== 0) return pDiff;
          return getTaskTimeValue(a) - getTaskTimeValue(b);
        }

        if (currentSortMode === 'tag') {
          var aTag = getTagName(a.tag || '').toString();
          var bTag = getTagName(b.tag || '').toString();
          var tDiff = aTag.localeCompare(bTag, 'zh-CN');
          if (tDiff !== 0) return tDiff;
          return getTaskTimeValue(a) - getTaskTimeValue(b);
        }

        if (currentSortMode === 'status') {
          var aDone = (a.completed || a.status === 'completed') ? 1 : 0;
          var bDone = (b.completed || b.status === 'completed') ? 1 : 0;
          if (aDone !== bDone) return aDone - bDone;
          return getTaskTimeValue(a) - getTaskTimeValue(b);
        }

        return getTaskTimeValue(a) - getTaskTimeValue(b);
      });
    }

    function applyCurrentSort() {
      sortTaskList(tasks.today);
      sortTaskList(tasks.tomorrow);
    }

    function getSortLabel(mode) {
      if (mode === 'category') return '按分类';
      if (mode === 'priority') return '按优先级';
      if (mode === 'tag') return '按标签';
      if (mode === 'status') return '按完成状态';
      return '按时间';
    }

    function isAssignedTask(task) {
      if (!task) return false;
      var sharedState = getSharedAppState();
      var me = (sharedState && sharedState.user && sharedState.user.id) ? String(sharedState.user.id) : '';
      var assigneeId = task.assigneeId ? String(task.assigneeId) : '';
      if (task.assignedToMe === true) return true;
      if (task.assignee === 'me') return true;
      if (me && assigneeId && assigneeId === me) return true;
      // 鍗曚汉妯″紡鍏滃簳锛氭棤鎸囨淳瀛楁鏃惰涓衡€滃垎閰嶇粰鎴戔€?
      if (!task.assigneeId && typeof task.assignedToMe === 'undefined' && !task.assignee) return true;
      return false;
    }

    function matchMainFilter(task, isToday) {
      if (currentMainFilter === 'myday') return !!isToday;
      if (currentMainFilter === 'important') return String(task.priority || '') === 'high';
      if (currentMainFilter === 'planned') return !!(task.dueAt || task.time);
      if (currentMainFilter === 'assigned') return isAssignedTask(task);
      return true;
    }

    function matchTagFilter(task) {
      if (!currentTagFilter) return true;
      return String(task.tag || '') === String(currentTagFilter);
    }

    function normalizeSearchText(value) {
      return String(value || '').trim().toLowerCase();
    }

    function matchSearchFilter(task) {
      var keyword = normalizeSearchText(currentSearchKeyword);
      if (!keyword) return true;

      var sourceParts = [
        task && task.title,
        task && task.description,
        task && task.time,
        task && task.priority,
        task && task.tag,
        getTagName(task && task.tag)
      ];

      if (task && Array.isArray(task.subtasks) && task.subtasks.length > 0) {
        sourceParts.push(task.subtasks.map(function (s) {
          return (s && (s.title || s.text)) || '';
        }).join(' '));
      }

      var haystack = normalizeSearchText(sourceParts.join(' '));
      return haystack.indexOf(keyword) > -1;
    }

    function getFilteredTasks(list, isToday) {
      return (list || []).filter(function (task) {
        return matchMainFilter(task, isToday) && matchTagFilter(task) && matchSearchFilter(task);
      });
    }

    function updateSidebarActiveState() {
      var mainItems = document.querySelectorAll('#sidebar-main-list [data-main]');
      mainItems.forEach(function (item) {
        if (item.dataset.main === currentMainFilter) item.classList.add('sidebar-item-active');
        else item.classList.remove('sidebar-item-active');
      });

      var tagItems = document.querySelectorAll('#sidebar-tag-list [data-tag]');
      tagItems.forEach(function (item) {
        var active = currentTagFilter && item.dataset.tag === currentTagFilter;
        if (active) item.classList.add('sidebar-item-active');
        else item.classList.remove('sidebar-item-active');
      });
    }

    function updateSortMenuState() {
      var menu = document.getElementById('sort-filter-menu');
      if (!menu) return;
      var items = menu.querySelectorAll('[data-sort]');
      items.forEach(function (item) {
        if (item.dataset.sort === currentSortMode) {
          item.classList.add('bg-primary/10', 'text-primary');
        } else {
          item.classList.remove('bg-primary/10', 'text-primary');
        }
      });
    }

    function formatDateLabel(offsetDays) {
      var now = new Date();
      now.setDate(now.getDate() + offsetDays);
      var weeks = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      return (now.getMonth() + 1) + '月' + now.getDate() + '日 · ' + weeks[now.getDay()];
    }

    function updateGroupDateInfo() {
      var todayInfo = document.getElementById('today-date-info');
      var tomorrowInfo = document.getElementById('tomorrow-date-info');
      if (todayInfo) todayInfo.textContent = formatDateLabel(0);
      if (tomorrowInfo) tomorrowInfo.textContent = formatDateLabel(1);
    }

    function updateBatchModeUI() {
      var selectBtn = document.getElementById('select-mode-btn');
      var batchRow = document.getElementById('batch-actions-row');
      var tip = document.getElementById('batch-selected-tip');
      var toolbar = document.getElementById('todo-toolbar');
      var checkedCount = selectedBatchTasks.length;

      if (selectBtn) {
        if (isBatchMode) {
          selectBtn.classList.add('select-mode-active');
          selectBtn.innerHTML = '<i class="fas fa-list-check mr-2"></i>选择中';
        } else {
          selectBtn.classList.remove('select-mode-active');
          selectBtn.innerHTML = '<i class="fas fa-list-check mr-2"></i>选择模式';
        }
      }

      if (batchRow) {
        if (isBatchMode) batchRow.classList.remove('hidden');
        else batchRow.classList.add('hidden');
      }

      if (toolbar) {
        if (isBatchMode) toolbar.classList.add('batch-mode-active');
        else toolbar.classList.remove('batch-mode-active');
      }

      if (tip) tip.textContent = '已选择 ' + checkedCount + ' 项';

      // Apply checkbox fade-in animation when entering batch mode
      if (isBatchMode) {
        setTimeout(function () {
          document.querySelectorAll('.task-card .task-checkbox').forEach(function (cb) {
            if (!cb.classList.contains('batch-appear')) {
              cb.classList.add('batch-appear');
            }
          });
        }, 50);
      }
    }

    function setBatchMode(enabled) {
      isBatchMode = !!enabled;
      if (!isBatchMode) selectedBatchTasks = [];
      updateBatchModeUI();
      renderTaskLists();
    }

    function setTodoChromeVisible(visible) {
      var selector = '.unified-top-header-dock, .unified-bottom-tab-dock, #main-header, footer.glass-tab';
      document.querySelectorAll(selector).forEach(function (el) {
        if (!visible) {
          if (el.dataset.todoDetailChromeHidden === '1') return;
          el.dataset.todoDetailChromeHidden = '1';
          el.style.opacity = '0';
          el.style.visibility = 'hidden';
          el.style.pointerEvents = 'none';
          return;
        }
        if (el.dataset.todoDetailChromeHidden === '1') {
          el.style.opacity = '';
          el.style.visibility = '';
          el.style.pointerEvents = '';
          delete el.dataset.todoDetailChromeHidden;
        }
      });
    }

    function closeTaskDetailModal() {
      var panel = document.getElementById('task-detail-panel');
      if (panel) panel.classList.add('hidden');
      currentEditingTask = null;
      document.body.classList.remove('task-modal-open');
      closeDetailDatetimePanel();
      setTodoChromeVisible(true);
    }

    // ==================== 模态框全局函数 ====================
    window.closeModalFunc = function () {
      var modal = document.getElementById('new-task-modal');
      if (modal) modal.classList.add('hidden');
      closeModalDateTimeMenus();
    };

    window.openModalFunc = function () {
      var modal = document.getElementById('new-task-modal');
      var modalTitle = document.getElementById('modal-title');
      var modalDesc = document.getElementById('modal-description');
      var modalDate = document.getElementById('modal-date');
      var modalTime = document.getElementById('modal-time');

      if (modal) {
        modal.classList.remove('hidden');
        if (modalTitle) modalTitle.value = '';
        if (modalDesc) modalDesc.value = '';
        if (modalDate) modalDate.value = new Date().toISOString().slice(0, 10);
        if (modalTime) modalTime.value = '12:00';
        refreshModalDateTimeSelectors();
        selectedModalPriority = 'medium';
        selectedModalTag = (tags && tags.length) ? tags[0].key : 'work';
        renderModalTagButtons();
        updateModalPriorityButtons();
        updateModalTagButtons();
        if (modalTitle) setTimeout(function () { modalTitle.focus(); }, 100);
      }
    };

    window.closeTagModalFunc = function () {
      var modal = document.getElementById('new-tag-modal');
      if (modal) modal.classList.add('hidden');
    };

    window.openTagModalFunc = function () {
      var modal = document.getElementById('new-tag-modal');
      var tagNameInput = document.getElementById('modal-tag-name');

      if (modal) {
        modal.classList.remove('hidden');
        if (tagNameInput) tagNameInput.value = '';
        selectedTagColor = 'task-work';
        updateTagColorButtons();
        if (tagNameInput) setTimeout(function () { tagNameInput.focus(); }, 100);
      }
    };

    window.selectTagColor = function (color) {
      selectedTagColor = color;
      updateTagColorButtons();
    };

    function updateTagColorButtons() {
      var buttons = document.querySelectorAll('.modal-tag-color-btn');
      buttons.forEach(function (btn) {
        if (btn.dataset.color === selectedTagColor) {
          btn.classList.add('active');
          btn.style.borderColor = '#4F46E5';
        } else {
          btn.classList.remove('active');
          btn.style.borderColor = '#D1D5DB';
        }
      });
    }

    window.createTagFunc = function () {
      var tagNameInput = document.getElementById('modal-tag-name');
      if (!tagNameInput) return;

      var tagName = tagNameInput.value.trim();
      if (!tagName) {
        showToast('请输入标签名称', 'error');
        return;
      }

      var tagKey = tagName.toLowerCase().replace(/\s+/g, '-');
      var exists = tags.some(function (t) { return t.key === tagKey; });
      if (exists) {
        showToast('⚠️ 该标签已存在', 'error');
        return;
      }

      createTagOnServer(tagName).then(function (serverTag) {
        var serverKey = String((serverTag && (serverTag.key || serverTag.code || serverTag.name)) || tagKey).trim();
        if (!serverKey) serverKey = tagKey;
        var finalTag = {
          key: serverKey,
          name: String((serverTag && (serverTag.name || serverTag.label)) || tagName).trim() || tagName,
          color: selectedTagColor
        };

        tags.push(finalTag);

        var taskModal = document.getElementById('new-task-modal');
        var taskModalVisible = !!(taskModal && !taskModal.classList.contains('hidden'));
        if (taskModalVisible) {
          selectedModalTag = finalTag.key;
          renderModalTagButtons();
          updateModalTagButtons();
        }

        renderSidebarTags();
        updateCountStats();
        saveToLocalStorage();
        window.closeTagModalFunc();
        showToast('标签 "' + finalTag.name + '" 创建成功');
      }).catch(function (err) {
        console.error('createTag error', err);
        showToast((err && err.message) || '创建标签失败', 'error');
      });
    };

    window.selectModalPriority = function (priority) {
      selectedModalPriority = priority;
      updateModalPriorityButtons();
    };

    window.selectModalTag = function (tag) {
      selectedModalTag = tag;
      updateModalTagButtons();
    };

    window.selectDetailPriority = function (priority) {
      selectedDetailPriority = priority;
      updateDetailPriorityButtons();
    };

    function updateModalPriorityButtons() {
      var buttons = document.querySelectorAll('#new-task-modal .priority-btn');
      buttons.forEach(function (btn) {
        if (btn.dataset.priority === selectedModalPriority) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    }

    function createModalTagButton(tag, isActive) {
      var visual = getTagVisualMeta(tag.key);
      var toneClass = 'bg-primary/10 text-primary';
      if (visual.tone === 'work' || visual.tone === 'study' || visual.tone === 'life' || visual.tone === 'health') {
        toneClass = 'bg-task-' + visual.tone + '/10 text-task-' + visual.tone;
      }

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'px-3 py-1.5 rounded-full text-sm font-medium modal-tag-btn ' + toneClass + (isActive ? ' active' : '');
      btn.setAttribute('data-tag', tag.key);
      btn.innerHTML = '<i class="fas ' + visual.icon + ' mr-1"></i>' + escapeHtml(tag.name);
      btn.addEventListener('click', function () {
        window.selectModalTag(tag.key);
      });
      return btn;
    }

    function renderModalTagButtons() {
      var list = document.getElementById('modal-tag-list');
      if (!list) return;

      list.innerHTML = '';
      tags.forEach(function (tag) {
        list.appendChild(createModalTagButton(tag, tag.key === selectedModalTag));
      });
    }

    function updateModalTagButtons() {
      var buttons = document.querySelectorAll('.modal-tag-btn');
      buttons.forEach(function (btn) {
        if (btn.dataset.tag === selectedModalTag) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    }

    function updateDetailPriorityButtons() {
      var buttons = document.querySelectorAll('#task-detail-panel .priority-btn');
      buttons.forEach(function (btn) {
        if (btn.dataset.priority === selectedDetailPriority) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    }

    window.createTaskFunc = function () {
      var modalTitle = document.getElementById('modal-title');
      var modalDesc = document.getElementById('modal-description');
      var modalDate = document.getElementById('modal-date');
      var modalTime = document.getElementById('modal-time');

      if (!modalTitle) return;
      var title = modalTitle.value.trim();
      if (!title) {
        showToast('请输入任务标题', 'error');
        return;
      }

      var payload = {
        title: title,
        description: modalDesc ? modalDesc.value.trim() : '',
        priority: selectedModalPriority,
        // backend Task.tags is a String column (JSON array string); serialize here
        tags: JSON.stringify([selectedModalTag]),
        status: 'pending',
        dueAt: (modalDate && modalDate.value ? (modalDate.value + 'T' + ((modalTime && modalTime.value) ? modalTime.value : '12:00') + ':00') : null)
      };

      apiRequest('/api/tasks', {
        method: 'POST',
        body: JSON.stringify(payload)
      }).then(function (resp) {
        var statusOk = resp && (resp.status === 200 || resp.status === 201);
        var body = resp && resp.body ? resp.body : null;
        var code = body ? body.code : undefined;
        var codeOk = (code === undefined || code === null || code === 0 || code === 200 || code === 201);
        var created = null;
        if (body) {
          if (body.data && typeof body.data === 'object') {
            created = body.data.task && typeof body.data.task === 'object' ? body.data.task : body.data;
          } else if (body.task && typeof body.task === 'object') {
            created = body.task;
          }
        }
        var successFlag = !!(body && (body.success === true || body.ok === true));

        if (statusOk && (codeOk || successFlag || !!created)) {
          if (!created || typeof created !== 'object') {
            // Some backends only return success message without entity.
            created = {
              id: Date.now(),
              title: payload.title,
              description: payload.description,
              priority: payload.priority,
              tags: payload.tags,
              status: payload.status,
              dueAt: payload.dueAt
            };
          }
          // normalize and place into lists based on due date
          created = normalizeServerTask(created, selectedModalTag);

          var due = created.dueAt ? created.dueAt.split('T')[0] : null;
          var today = new Date().toISOString().slice(0, 10);
          if (due === today) tasks.today.unshift(created);
          else tasks.tomorrow.unshift(created);
          
          // Store new task ID for animation
          window._lastCreatedTaskId = created.id;
          
          renderTaskLists();
          updateCountStats();
          saveToLocalStorage();
          window.closeModalFunc();
          showToast('任务创建成功');
        } else {
          if (resp.status === 401 || resp.status === 403) {
            var authMsg = (resp.body && resp.body.message) || ('创建任务失败（HTTP ' + resp.status + '）');
            showToast(authMsg, 'error');
            return;
          }

          var errMsg = (resp.body && resp.body.message)
            || (resp.status ? ('创建任务失败（HTTP ' + resp.status + '）') : '创建任务失败，请稍后重试');
          showToast(errMsg, 'error');
        }
      }).catch(function (err) {
        console.error(err);
        showToast('网络异常，创建任务失败', 'error');
      });
    };

    window.confirmBatchComplete = function () {
      var targets = getBatchTargets();
      if (targets.length === 0) {
        showToast('请先在选择模式中勾选任务', 'warning');
        return;
      }

      var remoteUpdates = [];
      targets.forEach(function (item) {
        var found = findTaskByTarget(item);
        if (!found || !found.task) return;
        found.task.completed = true;
        found.task.status = 'completed';
        if (!isLocalTaskId(found.task.id)) {
          remoteUpdates.push({ id: found.task.id, task: found.task, prevStatus: found.task.status, prevCompleted: found.task.completed });
        }
      });

      var done = function (failCount) {
        selectedBatchTasks = [];
        isBatchMode = false;
        updateBatchModeUI();
        renderTaskLists();
        updateCountStats();
        saveToLocalStorage();
        if (failCount > 0) {
          showToast('已完成 ' + (targets.length - failCount) + ' 个任务，' + failCount + ' 个同步失败', 'warning');
        } else {
          showToast('已批量完成 ' + targets.length + ' 个任务');
        }
      };

      if (remoteUpdates.length === 0) {
        done(0);
        return;
      }

      Promise.allSettled(remoteUpdates.map(function (item) {
        return updateTaskStatusOnServer(item.id, 'completed');
      })).then(function (results) {
        var failCount = 0;
        results.forEach(function (r, idx) {
          if (r.status !== 'fulfilled') {
            failCount++;
            var backup = remoteUpdates[idx];
            if (backup && backup.task) {
              backup.task.status = 'pending';
              backup.task.completed = false;
            }
          }
        });
        done(failCount);
      }).catch(function () {
        remoteUpdates.forEach(function (item) {
          if (item && item.task) {
            item.task.status = 'pending';
            item.task.completed = false;
          }
        });
        done(remoteUpdates.length);
      });
    };

    window.confirmBatchDelete = function () {
      var targets = getBatchTargets();
      if (targets.length === 0) {
        showToast('请先在选择模式中勾选任务', 'warning');
        return;
      }

      var remoteDeletes = [];
      targets.forEach(function (item) {
        var found = findTaskByTarget(item);
        if (!found || !found.task) return;
        if (isLocalTaskId(found.task.id)) {
          removePendingByLocalId(found.task.id);
          found.list.splice(found.index, 1);
          return;
        }
        remoteDeletes.push({ id: found.task.id, list: found.list, index: found.index, task: found.task });
      });

      var commitLocalDelete = function () {
        selectedBatchTasks = [];
        isBatchMode = false;
        updateBatchModeUI();
        renderTaskLists();
        updateCountStats();
        saveToLocalStorage();
      };

      if (remoteDeletes.length === 0) {
        commitLocalDelete();
        showToast('已批量删除 ' + targets.length + ' 个任务');
        return;
      }

      Promise.allSettled(remoteDeletes.map(function (item) {
        return apiRequest('/api/tasks/' + item.id, { method: 'DELETE' });
      })).then(function (results) {
        var failCount = 0;
        results.forEach(function (r, idx) {
          if (r.status === 'fulfilled' && r.value && r.value.status === 200 && r.value.body && r.value.body.code === 200) {
            var item = remoteDeletes[idx];
            var removeIdx = item.list.findIndex(function (t) { return String(t.id) === String(item.id); });
            if (removeIdx > -1) item.list.splice(removeIdx, 1);
          } else {
            failCount++;
          }
        });
        commitLocalDelete();
        if (failCount > 0) {
          showToast('已删除 ' + (targets.length - failCount) + ' 个任务，' + failCount + ' 个删除失败', 'warning');
        } else {
          showToast('已批量删除 ' + targets.length + ' 个任务');
        }
      }).catch(function () {
        commitLocalDelete();
        showToast('批量删除请求失败，请重试', 'error');
      });
    };

    function findTaskByTarget(item) {
      var list = item && item.isToday ? tasks.today : tasks.tomorrow;
      if (!list) return null;
      var index = list.findIndex(function (t) { return String(t.id) === String(item.id); });
      if (index < 0) return null;
      return { list: list, index: index, task: list[index] };
    }

    function getBatchTargets() {
      if (selectedBatchTasks.length > 0) return selectedBatchTasks.slice();
      return [];
    }

    function toggleBatchSelection(taskId, isToday) {
      var idx = selectedBatchTasks.findIndex(function (t) {
        return String(t.id) === String(taskId) && !!t.isToday === !!isToday;
      });
      if (idx > -1) {
        selectedBatchTasks.splice(idx, 1);
      } else {
        selectedBatchTasks.push({ id: taskId, isToday: !!isToday });
      }
    }

    window.completeAllTasks = function () {
      var count = tasks.today.length + tasks.tomorrow.length;
      if (count === 0) {
        showToast('暂无任务可完成', 'error');
        return;
      }
      // 鐩存帴瀹屾垚鎵€鏈変换鍔★紙鏃犻渶浜屾纭锛?
      tasks.today.forEach(function (t) { t.completed = true; });
      tasks.tomorrow.forEach(function (t) { t.completed = true; });
      selectedBatchTasks = [];
      renderTaskLists();
      updateCountStats();
      saveToLocalStorage();
      showToast('已完成全部 ' + count + ' 个任务');
    };

    window.clearBatchSelection = function () {
      selectedBatchTasks = [];
      isBatchMode = false;
      updateBatchModeUI();
      renderTaskLists();
      showToast('已清空选择');
    };

    // 任务卡片生成
    function generateTaskCard(task, isToday) {
      ensureTaskSubtasks(task);
      var priorityClass = 'priority-' + task.priority;
      var tagColor = getTagColor(task.tag);
      var tagName = getTagName(task.tag);
      var tagIcon = getTagIcon(task.tag);
      var completedClass = task.completed ? 'completed' : '';
      var isSelected = selectedBatchTasks.some(function (t) { return t.id === task.id; });
      var selectedClass = isSelected ? 'selected' : '';
      var subtaskInfo = task.subtasks && task.subtasks.length > 0 ?
        '<span class="text-xs text-gray-500"><i class="fas fa-check-square mr-1 text-success"></i>' + task.subtasks.length + ' 子任务</span>' : '';
      var statusBadge = task.completed
        ? '<span class="task-status-badge completed">已完成</span>'
        : '<span class="task-status-badge pending">进行中</span>';
      var timeText = (task.time && String(task.time).trim()) ? String(task.time) : '未设置时间';
      var checkboxHiddenClass = isBatchMode ? '' : 'checkbox-hidden';

      return '<div class="task-card bg-white/85 backdrop-blur-sm rounded-xl p-4 cursor-pointer ' + priorityClass + ' ' + completedClass + ' ' + selectedClass + ' card-hover" data-task-id="' + task.id + '" data-is-today="' + isToday + '">' +
        '<div class="flex items-start gap-3">' +
        '<div class="flex-shrink-0"><input class="task-checkbox custom-checkbox ' + checkboxHiddenClass + '" type="checkbox" ' + (task.completed ? 'checked' : '') + '/></div>' +
        '<div class="flex-1 min-w-0">' +
        '<div class="flex items-start justify-between gap-2">' +
        '<h3 class="text-[15px] font-semibold text-slate-700 truncate ' + (task.completed ? 'line-through text-gray-500' : '') + '">' + escapeHtml(task.title || '') + '</h3>' +
        statusBadge +
        '</div>' +
        '<div class="mt-2 flex items-center gap-2 text-sm text-gray-500">' +
        '<i class="fas fa-clock text-primary"></i>' +
        '<span>' + (isToday ? '今日' : '明日') + ' · ' + escapeHtml(timeText) + '</span>' +
        '</div>' +
        '<div class="mt-2 flex items-center gap-2">' +
        '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium tag-' + tagColor + '"><i class="fas ' + tagIcon + ' mr-1"></i>' + escapeHtml(tagName) + '</span>' +
        subtaskInfo +
        '</div>' +
        '</div>' +
        '<div class="task-actions">' +
        '<button class="task-action-btn share" onclick="event.stopPropagation(); handleTaskAction(' + JSON.stringify(task.id) + ', ' + isToday + ', \'share\')" title="分享"><i class="fas fa-share-alt"></i></button>' +
        '<button class="task-action-btn copy" onclick="event.stopPropagation(); handleTaskAction(' + JSON.stringify(task.id) + ', ' + isToday + ', \'copy\')" title="复制"><i class="fas fa-copy"></i></button>' +
        '<button class="task-action-btn delete" onclick="event.stopPropagation(); handleTaskAction(' + JSON.stringify(task.id) + ', ' + isToday + ', \'delete\')" title="删除"><i class="fas fa-trash-alt"></i></button>' +
        '</div>' +
        '</div></div>';
    }

    // 任务操作处理
    window.handleTaskAction = function (taskId, isToday, action) {
      var list = isToday ? tasks.today : tasks.tomorrow;
      var task = list.find(function (t) { return t.id === taskId; });

      if (!task) return;

      if (action === 'share') {
        shareOrCopyText(buildTaskExportText(task), '任务已分享').catch(function () {
          showToast('分享任务失败', 'error');
        });
      } else if (action === 'copy') {
        copyTextToClipboard(buildTaskExportText(task)).then(function () {
          showToast('任务内容已复制');
        }).catch(function () {
          showToast('复制任务失败', 'error');
        });
      } else if (action === 'delete') {
        if (confirm('确定要删除任务“' + task.title + '”吗？')) {
          var card = document.querySelector('[data-task-id="' + CSS.escape(String(taskId)) + '"]');
          if (card) {
            card.classList.add('task-delete-exit');
          }
          setTimeout(function () {
            if (String(taskId).indexOf('local_') === 0) {
              var localIndex = list.findIndex(function (t) { return String(t.id) === String(taskId); });
              if (localIndex > -1) list.splice(localIndex, 1);
              removePendingByLocalId(taskId);
              renderTaskLists();
              updateCountStats();
              saveToLocalStorage();
              showToast('本地离线任务已删除');
              return;
            }
            apiRequest('/api/tasks/' + taskId, { method: 'DELETE' }).then(function (resp) {
              if (resp.status === 200 && resp.body && resp.body.code === 200) {
                var index = list.findIndex(function (t) { return t.id === taskId; });
                if (index > -1) list.splice(index, 1);
                renderTaskLists();
                updateCountStats();
                saveToLocalStorage();
                showToast('任务已删除');
              } else {
                showToast((resp.body && resp.body.message) || '删除失败', 'error');
              }
            }).catch(function (err) {
              console.error(err);
              showToast('网络错误，删除任务失败', 'error');
            });
          }, 220);
        }
      }
    };

    // 渲染任务列表
    function renderTaskLists() {
      var todayList = document.getElementById('today-task-list');
      var tomorrowList = document.getElementById('tomorrow-task-list');
      if (!todayList || !tomorrowList) return;

      applyCurrentSort();

      var filteredToday = getFilteredTasks(tasks.today, true);
      var filteredTomorrow = getFilteredTasks(tasks.tomorrow, false);

      todayList.innerHTML = filteredToday.map(function (t) { return generateTaskCard(t, true); }).join('');
      tomorrowList.innerHTML = filteredTomorrow.map(function (t) { return generateTaskCard(t, false); }).join('');

      if (filteredToday.length === 0) {
        todayList.innerHTML = '<div class="task-empty-state clickable" data-action="add-task"><i class="fas fa-seedling"></i><div class="title">今天很清爽</div><div class="desc">点击右下角 + 新增任务，开始你的第一项待办</div></div>';
      }
      if (filteredTomorrow.length === 0) {
        tomorrowList.innerHTML = '<div class="task-empty-state clickable" data-action="add-task"><i class="fas fa-rocket"></i><div class="title">明天先留白</div><div class="desc">提前规划 1-2 项关键任务，效率会更高</div></div>';
      }

      var cards = document.querySelectorAll('#today-task-list .task-card, #tomorrow-task-list .task-card');
      cards.forEach(function (card, idx) {
        card.classList.add('task-card-enter');
        card.style.animationDelay = (idx * 0.05) + 's';
        
        // Apply special new-task animation if this is the newly created task
        var taskId = card.dataset.taskId;
        if (window._lastCreatedTaskId && String(taskId) === String(window._lastCreatedTaskId)) {
          card.classList.remove('task-card-enter');
          card.classList.add('task-new-enter');
          card.style.animationDelay = '0s';
          // Clear the marker after animation
          setTimeout(function () {
            window._lastCreatedTaskId = null;
          }, 200);
        }
      });

      var todayCount = document.getElementById('today-task-count');
      var tomorrowCount = document.getElementById('tomorrow-task-count');
      if (todayCount) todayCount.textContent = filteredToday.length;
      if (tomorrowCount) tomorrowCount.textContent = filteredTomorrow.length;

      updateSidebarActiveState();
      updateBatchModeUI();
      updateGroupDateInfo();

      bindTaskEvents();
    }

    // 娓叉煋渚ц竟鏍忔爣绛?
    function renderSidebarTags() {
      var tagListContainer = document.getElementById('sidebar-tag-list');
      if (!tagListContainer) return;

      var html = '';
      tags.forEach(function (tag) {
        var count = tasks.today.filter(function (t) { return t.tag === tag.key; }).length +
          tasks.tomorrow.filter(function (t) { return t.tag === tag.key; }).length;
        var activeClass = currentTagFilter === tag.key ? ' sidebar-item-active' : '';
        var visual = getTagVisualMeta(tag.key);
        var safeTagName = escapeHtml(tag.name);
        html += '<li>' +
          '<a class="sidebar-item' + activeClass + '" href="javascript:void(0);" data-tag="' + tag.key + '">' +
          '<div class="flex items-center">' +
          '<i class="fas ' + visual.icon + ' sidebar-tag-icon sidebar-tag-' + visual.tone + '"></i>' +
          '<span class="sidebar-tag-' + visual.tone + '">#' + safeTagName + '</span>' +
          '</div>' +
          '<span class="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full" id="count-' + tag.key + '">' + count + '</span>' +
          '</a></li>';
      });

      tagListContainer.innerHTML = html;
    }

    // 鏇存柊缁熻鏁版嵁
    function updateCountStats() {
      var countAll = document.getElementById('count-all');
      var countToday = document.getElementById('count-today');
      var countImportant = document.getElementById('count-important');

      if (countAll) countAll.textContent = tasks.today.length + tasks.tomorrow.length;
      if (countToday) countToday.textContent = tasks.today.length;
      if (countImportant) countImportant.textContent = tasks.today.filter(function (t) { return t.priority === 'high'; }).length + tasks.tomorrow.filter(function (t) { return t.priority === 'high'; }).length;
      var countPlanned = document.getElementById('count-planned');
      var countAssigned = document.getElementById('count-assigned');
      if (countPlanned) countPlanned.textContent = tasks.today.filter(function (t) { return !!(t.dueAt || t.time); }).length + tasks.tomorrow.filter(function (t) { return !!(t.dueAt || t.time); }).length;
      if (countAssigned) countAssigned.textContent = tasks.today.filter(function (t) { return isAssignedTask(t); }).length + tasks.tomorrow.filter(function (t) { return isAssignedTask(t); }).length;

      tags.forEach(function (tag) {
        var countEl = document.getElementById('count-' + tag.key);
        if (countEl) {
          countEl.textContent = tasks.today.filter(function (t) { return t.tag === tag.key; }).length +
            tasks.tomorrow.filter(function (t) { return t.tag === tag.key; }).length;
        }
      });
    }

    // 缁戝畾浜嬩欢
    function bindTaskEvents() {
      document.querySelectorAll('.task-checkbox').forEach(function (cb) {
        cb.addEventListener('click', function (e) {
          e.stopPropagation();
          var card = this.closest('.task-card');
          var taskId = card.dataset.taskId;
          var isToday = card.dataset.isToday === 'true';
          var list = isToday ? tasks.today : tasks.tomorrow;
          var task = list.find(function (x) { return String(x.id) === String(taskId); });
          // Trigger exit animation when marking as complete
          var checked = this.checked;
          if (checked) {
            card.classList.add('task-complete-exit');
            setTimeout(function () {
              if (String(taskId).indexOf('local_') === 0) {
                if (task) {
                  task.completed = true;
                  task.status = 'completed';
                }
                renderTaskLists();
                updateCountStats();
                saveToLocalStorage();
                return;
              }
              toggleTaskCompleteServer(taskId, true, isToday ? 'today' : 'tomorrow').then(function () {
                // success handled inside toggleTaskCompleteServer
              }).catch(function () {
                try { cb.checked = false; } catch (err) {}
              });
            }, 250);
          } else {
            // Unchecking - immediately update
            if (task) {
              task.completed = false;
              task.status = 'pending';
            }
            renderTaskLists();
            updateCountStats();
            saveToLocalStorage();
          }
        });
      });

      document.querySelectorAll('.task-card').forEach(function (card) {
        card.addEventListener('click', function (e) {
          if (e.target.closest('.task-action-btn') || e.target.classList.contains('task-checkbox')) return;

          var taskId = this.dataset.taskId;
          var isToday = this.dataset.isToday === 'true';

          if (isBatchMode || e.ctrlKey || e.metaKey || e.shiftKey) {
            toggleBatchSelection(taskId, isToday);
            updateBatchModeUI();
            renderTaskLists();
            return;
          }

          var list = isToday ? tasks.today : tasks.tomorrow;
          var task = list.find(function (t) { return String(t.id) === String(taskId); });
          if (task) {
            currentEditingTask = task;
            openTaskDetail(task);
          }
        });
      });

      document.querySelectorAll('.task-empty-state[data-action="add-task"]').forEach(function (emptyCard) {
        emptyCard.addEventListener('click', function () {
          if (typeof window.openModalFunc === 'function') {
            window.openModalFunc();
          }
        });
      });
    }

    function openTaskDetail(task) {
      var panel = document.getElementById('task-detail-panel');
      if (!panel) return;
      ensureTaskSubtasks(task);
      currentEditingTask = task;
      panel.classList.remove('hidden');
      document.body.classList.add('task-modal-open');
      setTodoChromeVisible(false);
      document.getElementById('detail-title').value = task.title;
      document.getElementById('detail-description').value = task.description || '';
      setDetailDatetimeFromValue(toLocalDatetimeValue(task.dueAt || ''));
      selectedDetailPriority = task.priority || 'medium';
      updateDetailPriorityButtons();
      renderSubtasks();
      renderDetailTags();
    }

    function renderSubtasks() {
      var subtaskList = document.getElementById('subtask-list');
      if (!subtaskList || !currentEditingTask) return;
      ensureTaskSubtasks(currentEditingTask);

      if (currentEditingTask.subtasks.length === 0) {
        subtaskList.innerHTML = '<p class="text-sm text-gray-400 text-center py-4">暂无子任务</p>';
        return;
      }

      var html = '';
      currentEditingTask.subtasks.forEach(function (subtask, index) {
        var title = escapeHtml(subtask.title || subtask.text || '');
        html += '<div class="subtask-item">' +
          '<input type="checkbox" class="w-4 h-4 rounded" ' + (subtask.completed ? 'checked' : '') + ' onchange="toggleSubtask(' + index + ')">' +
          '<span class="flex-1 text-sm ' + (subtask.completed ? 'line-through text-gray-400' : '') + '">' + title + '</span>' +
          '<button class="subtask-action" onclick="copySubtask(' + index + ')" title="复制子任务"><i class="fas fa-copy text-xs"></i></button>' +
          '<button class="subtask-action" onclick="shareSubtask(' + index + ')" title="分享子任务"><i class="fas fa-share-alt text-xs"></i></button>' +
          '<button class="subtask-action" onclick="deleteSubtask(' + index + ')" title="删除子任务"><i class="fas fa-times text-xs"></i></button>' +
          '</div>';
      });
      subtaskList.innerHTML = html;
    }

    window.toggleSubtask = function (index) {
      if (currentEditingTask && currentEditingTask.subtasks[index]) {
        currentEditingTask.subtasks[index].completed = !currentEditingTask.subtasks[index].completed;
        syncCurrentSubtasksToServer().then(function () {
          renderSubtasks();
        }).catch(function (err) {
          console.error(err);
          showToast('更新子任务失败', 'error');
          currentEditingTask.subtasks[index].completed = !currentEditingTask.subtasks[index].completed;
          renderSubtasks();
        });
      }
    };

    window.deleteSubtask = function (index) {
      if (currentEditingTask && currentEditingTask.subtasks[index]) {
        var backup = currentEditingTask.subtasks.slice();
        currentEditingTask.subtasks.splice(index, 1);
        syncCurrentSubtasksToServer().then(function () {
          renderSubtasks();
          showToast('子任务已删除');
        }).catch(function (err) {
          console.error(err);
          currentEditingTask.subtasks = backup;
          showToast('删除子任务失败', 'error');
          renderSubtasks();
        });
      }
    };

    window.copySubtask = function (index) {
      if (!currentEditingTask || !currentEditingTask.subtasks[index]) return;
      var sub = currentEditingTask.subtasks[index];
      copyTextToClipboard(sub.title || sub.text || '').then(function () {
        showToast('📋 子任务已复制');
      }).catch(function () {
        showToast('复制子任务失败', 'error');
      });
    };

    window.shareSubtask = function (index) {
      if (!currentEditingTask || !currentEditingTask.subtasks[index]) return;
      var sub = currentEditingTask.subtasks[index];
      shareOrCopyText('子任务：' + (sub.title || sub.text || ''), '📤 子任务已分享').catch(function () {
        showToast('分享子任务失败', 'error');
      });
    };

    function renderDetailTags() {
      var tagList = document.getElementById('tag-list');
      if (!tagList || !currentEditingTask) return;

      var html = '';
      tags.forEach(function (tag) {
        var isActive = currentEditingTask.tag === tag.key;
        var visual = getTagVisualMeta(tag.key);
        var safeTagName = escapeHtml(tag.name);
        html += '<button class="px-3 py-1.5 rounded-full text-xs font-medium inline-flex items-center ' + 'tag-' + visual.tone + ' ' + (isActive ? 'ring-2 ring-primary' : '') + '" onclick="window.changeDetailTag(\'' + tag.key + '\')"><i class="fas ' + visual.icon + ' mr-1"></i>' + safeTagName + '</button>';
      });
      tagList.innerHTML = html;
    }

    window.changeDetailTag = function (tagKey) {
      if (currentEditingTask) {
        var previousTag = currentEditingTask.tag;
        currentEditingTask.tag = tagKey;
        renderDetailTags();

        if (isLocalTaskId(currentEditingTask.id)) {
          saveToLocalStorage();
          return;
        }

        updateTaskOnServer(currentEditingTask.id, {
          tags: JSON.stringify([tagKey])
        }).then(function () {
          saveToLocalStorage();
        }).catch(function (err) {
          console.error('changeDetailTag error', err);
          currentEditingTask.tag = previousTag;
          renderDetailTags();
          showToast((err && err.message) || '标签同步失败', 'error');
        });
      }
    };

    // 椤甸潰鍒濆鍖?
    function initLiquidJellyFab() {
      var fab = document.getElementById('add-task-fab');
      if (!fab) return;
      var glass = fab.querySelector('.todo-liquid-fab__glass');
      var icon = fab.querySelector('.todo-liquid-fab__icon');
      if (!glass) return;
      var tabDock = document.querySelector('footer.glass-tab');
      var tabContainer = tabDock ? tabDock.querySelector('.container') : null;
      var tabBubble = null;
      var tabRipple = null;
      var tabItems = [];
      var lastPressTs = 0;

      function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
      }

      function getStorageKey() {
        try {
          if (window.AppState && typeof window.AppState.getCurrentUserKey === 'function') {
            return 'todoLiquidFabPos::' + window.AppState.getCurrentUserKey();
          }
        } catch (err) {}
        return 'todoLiquidFabPos';
      }

      function getBottomDockHeight() {
        var dock = document.querySelector('footer.glass-tab');
        if (!dock) return 68;
        var rect = dock.getBoundingClientRect();
        if (!rect || !rect.height) return 68;
        return Math.ceil(rect.height) + 8;
      }

      function getTopSafeHeight() {
        var header = document.querySelector('.unified-top-header-dock .unified-top-header-shell#main-header') || document.getElementById('main-header');
        if (!header) return 78;
        var rect = header.getBoundingClientRect();
        var height = Math.ceil(rect && rect.height ? rect.height : 0);
        return Math.max(74, height + 12);
      }

      function getBounds() {
        var size = fab.offsetWidth || 62;
        var viewportW = Math.max(window.innerWidth || 0, 320);
        var viewportH = Math.max(window.innerHeight || 0, 480);
        var margin = 10;
        var minX = margin;
        var maxX = Math.max(minX, viewportW - size - margin);
        var minY = getTopSafeHeight();
        var bottomAvoid = getBottomDockHeight() + 14;
        var maxY = Math.max(minY, viewportH - size - bottomAvoid);
        return {
          minX: minX,
          maxX: maxX,
          minY: minY,
          maxY: maxY
        };
      }

      var mobileQuery = window.matchMedia ? window.matchMedia('(max-width: 900px)') : null;
      var state = {
        x: 0,
        y: 0,
        targetX: 0,
        targetY: 0,
        vx: 0,
        vy: 0,
        dragVX: 0,
        dragVY: 0,
        isDragging: false,
        pointerId: null,
        pressTs: 0,
        dragTravel: 0,
        lastMoveTs: 0,
        lastMoveX: 0,
        lastMoveY: 0,
        dragOffsetX: 0,
        dragOffsetY: 0,
        lastTs: 0,
        prevX: 0,
        prevY: 0,
        lastAngle: 0,
        snapTargetX: null,
        snapRestX: null,
        snapReboundX: null,
        snapPhase: 'idle',
        snapSpringActive: false,
        snapCurveActive: false,
        snapStartTs: 0,
        snapFromX: 0,
        snapDuration: 760,
        snapAmplitude: 0,
        snapOvershoot: false,
        snapDistance: 0,
        snapStiffness: 210,
        snapDamping: 22,
        snapMass: 1,
        springVX: 0,
        snapBounceCount: 0,
        snapBounceTarget: 1,
        snapEdgeRestitution: 0.55,
        dockSide: 'right',
        rafId: 0,
        movedByDrag: false,
        suppressClickUntil: 0
      };

      function isMobileView() {
        return !mobileQuery || !!mobileQuery.matches;
      }

      function setBubbleByRect(targetRect, immediate) {
        if (!tabDock || !tabContainer || !tabBubble || !targetRect) return;
        var containerRect = tabContainer.getBoundingClientRect();
        var x = targetRect.left - containerRect.left;
        var w = targetRect.width;
        tabDock.style.setProperty('--tab-bubble-x', x.toFixed(2) + 'px');
        tabDock.style.setProperty('--tab-bubble-w', w.toFixed(2) + 'px');
        if (immediate) {
          tabBubble.style.transition = 'none';
          requestAnimationFrame(function () {
            tabBubble.style.transition = '';
          });
        }
      }

      function refreshActiveTabBubble(immediate) {
        if (!tabContainer || !tabItems.length) return;
        var active = tabContainer.querySelector('.tab-item.active') || tabItems[0];
        if (!active) return;
        setBubbleByRect(active.getBoundingClientRect(), immediate);
      }

      function pressTabItem(item) {
        if (!item) return;
        item.classList.remove('liquid-press');
        item.offsetWidth;
        item.classList.add('liquid-press');
        lastPressTs = Date.now();
      }

      function ensureTabSystem() {
        if (!tabContainer) return;
        tabItems = Array.prototype.slice.call(tabContainer.querySelectorAll('.tab-item'));
        if (!tabItems.length) return;

        if (!tabBubble) {
          tabBubble = document.createElement('span');
          tabBubble.className = 'liquid-tab-bubble';
          tabContainer.insertBefore(tabBubble, tabContainer.firstChild);
        }
        if (!tabRipple) {
          tabRipple = document.createElement('span');
          tabRipple.className = 'liquid-tab-ripple';
          tabContainer.insertBefore(tabRipple, tabContainer.firstChild);
        }

        tabItems.forEach(function (item) {
          if (item.__liquidBound) return;
          item.__liquidBound = true;
          var onPress = function () {
            pressTabItem(item);
            setBubbleByRect(item.getBoundingClientRect(), false);
            setTimeout(function () {
              refreshActiveTabBubble(false);
            }, 340);
          };
          item.addEventListener('pointerdown', onPress, { passive: true });
          item.addEventListener('touchstart', onPress, { passive: true });
        });

        refreshActiveTabBubble(true);
      }

      function updateTabDockCoupling() {
        if (!tabDock) return;
        var dockRect = tabDock.getBoundingClientRect();
        if (!dockRect || !dockRect.width || !dockRect.height) return;
        var size = fab.offsetWidth || 62;
        var centerX = state.x + size * 0.5;
        var dxOutside = 0;
        if (centerX < dockRect.left) dxOutside = dockRect.left - centerX;
        else if (centerX > dockRect.right) dxOutside = centerX - dockRect.right;
        var verticalGap = Math.max(0, dockRect.top - (state.y + size));
        var reach = Math.sqrt(verticalGap * verticalGap + dxOutside * dxOutside * 0.72);
        var impact = clamp(1 - reach / 260, 0, 1);
        var impactX = clamp((centerX - dockRect.left) / dockRect.width, 0, 1);
        tabDock.style.setProperty('--liquid-impact', impact.toFixed(3));
        tabDock.style.setProperty('--liquid-impact-x', impactX.toFixed(3));
        tabDock.style.setProperty('--tab-bubble-scale', (1 + impact * 0.16).toFixed(3));
        if (impact > 0.015) tabDock.classList.add('liquid-contact');
        else tabDock.classList.remove('liquid-contact');
        if (impact > 0.28 && Date.now() - lastPressTs > 220) {
          lastPressTs = Date.now();
          tabDock.classList.remove('liquid-impact-pulse');
          tabDock.offsetWidth;
          tabDock.classList.add('liquid-impact-pulse');
        }
      }

      function saveFabPosition() {
        try {
          localStorage.setItem(getStorageKey(), JSON.stringify({
            x: Math.round(state.x),
            y: Math.round(state.y),
            dockSide: state.dockSide
          }));
        } catch (err) {}
      }

      function applyInitialPosition() {
        var bounds = getBounds();
        var loaded = null;
        try {
          var raw = localStorage.getItem(getStorageKey());
          if (raw) loaded = JSON.parse(raw);
        } catch (err) {}

        if (loaded && typeof loaded.x === 'number' && typeof loaded.y === 'number') {
          state.x = clamp(loaded.x, bounds.minX, bounds.maxX);
          state.y = clamp(loaded.y, bounds.minY, bounds.maxY);
          state.dockSide = (loaded.dockSide === 'left') ? 'left' : 'right';
        } else {
          state.dockSide = 'right';
          state.x = bounds.maxX;
          state.y = clamp(bounds.maxY - 12, bounds.minY, bounds.maxY);
        }

        state.targetX = state.x;
        state.targetY = state.y;
        state.prevX = state.x;
        state.prevY = state.y;
        fab.style.transform = 'translate3d(' + state.x.toFixed(2) + 'px,' + state.y.toFixed(2) + 'px,0)';
      }

      function updateLiquidVisual(ts) {
        var motionVX = state.isDragging ? (state.dragVX + (state.targetX - state.x) * 0.85) : state.vx;
        var motionVY = state.isDragging ? (state.dragVY + (state.targetY - state.y) * 0.85) : state.vy;
        var speed = Math.sqrt(motionVX * motionVX + motionVY * motionVY);
        var stretch = clamp(speed * 0.022, 0, state.isDragging ? 0.3 : 0.24);
        if (state.isDragging) stretch = clamp(stretch + 0.024, 0.04, 0.3);

        var angle = state.lastAngle;
        if (speed > 0.01) {
          angle = Math.atan2(motionVY, motionVX) * (180 / Math.PI);
          state.lastAngle = angle;
        }

        var bounds = getBounds();
        var edgeNear = Math.min(state.x - bounds.minX, bounds.maxX - state.x);
        var edgeRatio = clamp((36 - edgeNear) / 36, 0, 1);
        var wallSquash = edgeRatio * (state.isDragging ? 0.1 : 0.06);
        var edgeLeftRatio = clamp((24 - (state.x - bounds.minX)) / 24, 0, 1);
        var edgeRightRatio = clamp((24 - (bounds.maxX - state.x)) / 24, 0, 1);
        var edgeForce = Math.max(edgeLeftRatio, edgeRightRatio) * (state.isDragging ? 1 : 0.68);
        var edgeShiftX = (edgeLeftRatio - edgeRightRatio) * (state.isDragging ? 2 : 1.2);
        var edgeLocked = !state.isDragging && edgeNear < 2;
        if (edgeLocked) {
          wallSquash = 0;
          edgeForce = 0;
          edgeShiftX = 0;
          stretch = 0;
          angle = 0;
        } else if (!state.isDragging && edgeNear < 12) {
          wallSquash = 0;
          edgeForce *= 0.18;
          edgeShiftX *= 0.2;
          stretch *= 0.3;
        }

        var scaleX = 1 + stretch - wallSquash;
        var scaleY = 1 - stretch * 0.72 + wallSquash * 0.74 + edgeForce * 0.1;
        var idlePulse = (!state.isDragging && speed < 0.16) ? Math.sin(ts / 760) * 0.014 : 0;
        if (edgeLocked) {
          scaleX = 1 + idlePulse * 0.9;
          scaleY = 1 + idlePulse * 0.9;
        } else {
          scaleX += idlePulse;
          scaleY += idlePulse * 0.8;
        }
        scaleX = clamp(scaleX, 0.8, 1.35);
        scaleY = clamp(scaleY, 0.74, 1.25);

        if (!state.isDragging && speed < 0.18) angle = 0;

        glass.style.transform = 'translate3d(' + edgeShiftX.toFixed(2) + 'px,0,0) rotate(' + angle.toFixed(2) + 'deg) scale(' + scaleX.toFixed(3) + ',' + scaleY.toFixed(3) + ')';

        if (icon) {
          var iconScale = clamp(1 - stretch * 0.18 + idlePulse * 0.2, 0.92, 1.06);
          icon.style.transform = 'translate3d(calc(-50% + ' + (edgeShiftX * 0.12).toFixed(2) + 'px), -50%, 0) scale(' + iconScale.toFixed(3) + ')';
        }

        if (speed > 0.05) {
          var nx = motionVX / speed;
          var ny = motionVY / speed;
          fab.style.setProperty('--sheen-x', (42 + nx * 11).toFixed(2) + '%');
          fab.style.setProperty('--sheen-y', (32 + ny * 9).toFixed(2) + '%');
        }
      }

      function step(ts) {
        if (!isMobileView()) {
          state.rafId = 0;
          return;
        }

        if (!state.lastTs) {
          state.lastTs = ts;
          state.prevX = state.x;
          state.prevY = state.y;
        }

        var dt = clamp(ts - state.lastTs, 8, 33);
        var frame = dt / 16.667;
        state.lastTs = ts;
        var bounds = getBounds();

        if (state.isDragging) {
          var follow = 0.34 * frame;
          state.x += (state.targetX - state.x) * follow;
          state.y += (state.targetY - state.y) * follow;
          state.vx = (state.x - state.prevX) / Math.max(0.4, frame);
          state.vy = (state.y - state.prevY) / Math.max(0.4, frame);
        } else {
          if (state.snapSpringActive && state.snapRestX !== null) {
            var dtSec = dt / 1000;
            var displacement = state.x - state.snapRestX;
            var accel = ((-state.snapStiffness * displacement) - (state.snapDamping * state.springVX)) / Math.max(0.8, state.snapMass);
            state.springVX += accel * dtSec;
            state.springVX = clamp(state.springVX, -2200, 2200);
            state.x += state.springVX * dtSec;

            // Edge contact: keep center on-screen, then rebound inward like iOS elastic collision.
            var hitEdge = false;
            if (state.dockSide === 'left' && state.x < state.snapRestX) {
              state.x = state.snapRestX;
              if (state.springVX < 0) {
                state.springVX *= -state.snapEdgeRestitution;
                hitEdge = true;
              }
            } else if (state.dockSide === 'right' && state.x > state.snapRestX) {
              state.x = state.snapRestX;
              if (state.springVX > 0) {
                state.springVX *= -state.snapEdgeRestitution;
                hitEdge = true;
              }
            }
            if (hitEdge) {
              state.snapBounceCount += 1;
              state.springVX *= 0.96;
            }

            state.vx = state.springVX * 0.016667;
            var elapsedSpring = ts - state.snapStartTs;
            var reachedBounceTarget = state.snapBounceCount >= state.snapBounceTarget;
            var settleByVelocity = Math.abs(state.springVX) < 2.4;
            var settleByPosition = Math.abs(state.x - state.snapRestX) < 0.12;
            var settleByTime = elapsedSpring > state.snapDuration;
            if (((elapsedSpring > 420) && reachedBounceTarget && settleByVelocity && settleByPosition) || settleByTime) {
              state.x = state.snapRestX;
              state.targetX = state.snapRestX;
              state.vx = 0;
              state.springVX = 0;
              state.snapSpringActive = false;
              state.snapCurveActive = false;
              state.snapTargetX = null;
              state.snapRestX = null;
              state.snapReboundX = null;
              state.snapPhase = 'idle';
              state.snapOvershoot = false;
              state.snapDistance = 0;
              state.snapBounceCount = 0;
              state.snapBounceTarget = 1;
              fab.classList.remove('snapping');
              saveFabPosition();
            }
          } else if (state.snapTargetX !== null) {
            var dx = state.snapTargetX - state.x;
            var k = state.snapStiffness / 240;
            var c = state.snapDamping / 42;
            state.vx += (dx * k - state.vx * c) * frame;
            state.x += state.vx * frame;
          } else {
            state.vx += (state.targetX - state.x) * 0.07 * frame;
            state.vx *= Math.pow(0.82, frame);
            state.x += state.vx * frame;
          }

          state.vy += (state.targetY - state.y) * 0.08 * frame;
          state.vy *= Math.pow(0.8, frame);
          state.y += state.vy * frame;
        }

        if (state.x < bounds.minX) {
          state.x = bounds.minX;
          if (state.snapTargetX === null) state.vx *= -0.24;
        } else if (state.x > bounds.maxX) {
          state.x = bounds.maxX;
          if (state.snapTargetX === null) state.vx *= -0.24;
        }
        if (state.y < bounds.minY) {
          state.y = bounds.minY;
          state.vy *= -0.24;
        } else if (state.y > bounds.maxY) {
          state.y = bounds.maxY;
          state.vy *= -0.24;
        }

        fab.style.transform = 'translate3d(' + state.x.toFixed(2) + 'px,' + state.y.toFixed(2) + 'px,0)';
        updateLiquidVisual(ts);
        updateTabDockCoupling();
        state.prevX = state.x;
        state.prevY = state.y;
        state.rafId = window.requestAnimationFrame(step);
      }

      function ensureAnimation() {
        if (state.rafId) return;
        state.lastTs = 0;
        state.rafId = window.requestAnimationFrame(step);
      }

      function startSnap(side, baseDistance) {
        var bounds = getBounds();
        var travelSpan = Math.max(1, bounds.maxX - bounds.minX);
        state.dockSide = side === 'left' ? 'left' : 'right';
        state.snapRestX = (state.dockSide === 'left') ? bounds.minX : bounds.maxX;
        state.snapPhase = 'spring';
        state.snapTargetX = state.snapRestX;
        state.targetX = state.snapRestX;
        state.snapDistance = clamp(Math.max(baseDistance || 0, state.dragTravel), 8, bounds.maxX - bounds.minX);
        var distRatio = clamp(state.snapDistance / travelSpan, 0, 1);
        state.snapStiffness = 186 + distRatio * 74; // 186 - 260
        state.snapDamping = 26 - distRatio * 8; // 26 - 18
        state.snapMass = 1.2 - distRatio * 0.4; // 1.2 - 0.8
        state.snapBounceTarget = Math.round(1 + distRatio * 3); // near: 1, far: 4
        state.snapBounceCount = 0;
        state.snapEdgeRestitution = 0.5 + distRatio * 0.24; // near: 0.5, far: 0.74
        state.snapSpringActive = true;
        state.snapCurveActive = false;
        state.snapStartTs = performance.now();
        state.snapFromX = state.x;
        state.snapDuration = clamp(980 + state.snapDistance * 2.6, 980, 2100);
        state.snapAmplitude = clamp(4 + state.snapDistance * 0.08, 4, 26);
        state.snapReboundX = state.snapRestX + (state.dockSide === 'left' ? state.snapAmplitude : -state.snapAmplitude);
        state.snapOvershoot = false;
        var edgeDirection = state.dockSide === 'left' ? -1 : 1;
        var releaseV = state.dragVX * 56;
        var distanceKick = 220 + distRatio * 760;
        state.springVX = releaseV * 0.5 + edgeDirection * distanceKick;
        state.vx = state.springVX * 0.016667;
        fab.classList.add('snapping');
      }

      function onPointerDown(e) {
        if (!isMobileView()) return;
        if (typeof e.button === 'number' && e.button !== 0) return;
        state.pointerId = e.pointerId;
        state.isDragging = true;
        state.pressTs = Date.now();
        state.dragTravel = 0;
        state.movedByDrag = false;
        state.snapTargetX = null;
        state.snapRestX = null;
        state.snapReboundX = null;
        state.snapPhase = 'idle';
        state.snapSpringActive = false;
        state.snapCurveActive = false;
        state.snapStartTs = 0;
        state.snapFromX = state.x;
        state.snapDuration = 760;
        state.snapAmplitude = 0;
        state.snapOvershoot = false;
        state.snapDistance = 0;
        state.snapMass = 1;
        state.springVX = 0;
        state.snapBounceCount = 0;
        state.snapBounceTarget = 1;
        state.snapEdgeRestitution = 0.55;
        fab.classList.remove('snapping');
        state.vx *= 0.35;
        state.vy *= 0.35;
        state.dragOffsetX = e.clientX - state.x;
        state.dragOffsetY = e.clientY - state.y;
        state.lastMoveX = e.clientX;
        state.lastMoveY = e.clientY;
        state.lastMoveTs = performance.now();
        state.targetX = state.x;
        state.targetY = state.y;
        fab.classList.add('dragging');
        try { fab.setPointerCapture && fab.setPointerCapture(e.pointerId); } catch (err) {}
        e.preventDefault();
      }

      function onPointerMove(e) {
        if (!state.isDragging) return;
        if (state.pointerId !== null && e.pointerId !== state.pointerId) return;
        var now = performance.now();
        var dt = Math.max(8, now - state.lastMoveTs);
        var dx = e.clientX - state.lastMoveX;
        var dy = e.clientY - state.lastMoveY;
        state.dragVX = state.dragVX * 0.62 + (dx / dt * 16.667) * 0.38;
        state.dragVY = state.dragVY * 0.62 + (dy / dt * 16.667) * 0.38;
        state.lastMoveX = e.clientX;
        state.lastMoveY = e.clientY;
        state.lastMoveTs = now;

        var bounds = getBounds();
        var rawX = clamp(e.clientX - state.dragOffsetX, bounds.minX, bounds.maxX);
        var rawY = clamp(e.clientY - state.dragOffsetY, bounds.minY, bounds.maxY);

        state.dragTravel += Math.sqrt(Math.pow(rawX - state.targetX, 2) + Math.pow(rawY - state.targetY, 2));
        state.movedByDrag = state.dragTravel > 7;
        state.targetX = rawX;
        state.targetY = rawY;
        e.preventDefault();
      }

      function openNewTaskModal() {
        if (typeof window.openModalFunc === 'function') {
          window.openModalFunc();
        }
      }

      function onPointerUp(e) {
        if (state.pointerId !== null && e.pointerId !== state.pointerId) return;
        try { fab.releasePointerCapture && fab.releasePointerCapture(e.pointerId); } catch (err) {}
        var pressDuration = Date.now() - state.pressTs;
        var dragged = state.movedByDrag;
        state.isDragging = false;
        state.pointerId = null;
        fab.classList.remove('dragging');

        if (!dragged && pressDuration < 260) {
          state.suppressClickUntil = Date.now() + 320;
          openNewTaskModal();
          return;
        }

        state.vx += state.dragVX * 0.38;
        state.vy += state.dragVY * 0.9;
        var bounds = getBounds();
        var distLeft = state.targetX - bounds.minX;
        var distRight = bounds.maxX - state.targetX;
        var threshold = 188;
        if (distLeft < threshold || distRight < threshold) {
          var side = distLeft <= distRight ? 'left' : 'right';
          var snapBaseDistance = Math.abs((side === 'left' ? bounds.minX : bounds.maxX) - state.x);
          startSnap(side, snapBaseDistance);
        } else {
          state.snapTargetX = null;
          state.snapRestX = null;
          state.snapReboundX = null;
          state.snapPhase = 'idle';
          state.snapSpringActive = false;
          state.snapCurveActive = false;
          state.snapStartTs = 0;
          state.snapFromX = state.x;
          state.snapDuration = 760;
          state.snapAmplitude = 0;
          state.snapOvershoot = false;
          state.snapDistance = 0;
          state.snapMass = 1;
          state.springVX = 0;
          state.snapBounceCount = 0;
          state.snapBounceTarget = 1;
          state.snapEdgeRestitution = 0.55;
          state.dockSide = state.targetX < (bounds.minX + bounds.maxX) / 2 ? 'left' : 'right';
          saveFabPosition();
        }
        state.dragVX = 0;
        state.dragVY = 0;
      }

      fab.addEventListener('pointerdown', onPointerDown);
      fab.addEventListener('pointermove', onPointerMove);
      fab.addEventListener('pointerup', onPointerUp);
      fab.addEventListener('pointercancel', onPointerUp);
      fab.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (Date.now() < state.suppressClickUntil) return;
        if (state.movedByDrag) return;
        openNewTaskModal();
      });
      fab.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        openNewTaskModal();
      });

      window.addEventListener('resize', function () {
        var bounds = getBounds();
        state.x = clamp(state.x, bounds.minX, bounds.maxX);
        state.y = clamp(state.y, bounds.minY, bounds.maxY);
        state.targetX = clamp(state.targetX, bounds.minX, bounds.maxX);
        state.targetY = clamp(state.targetY, bounds.minY, bounds.maxY);
        if (!state.isDragging && state.snapTargetX !== null) {
          state.snapTargetX = state.dockSide === 'left' ? bounds.minX : bounds.maxX;
          state.snapRestX = state.snapTargetX;
          if (state.snapSpringActive || state.snapCurveActive) {
            state.snapFromX = state.x;
            state.snapStartTs = performance.now();
            state.snapAmplitude = clamp(2 + state.snapDistance * 0.052, 2, 16);
            state.snapReboundX = state.snapRestX + (state.dockSide === 'left' ? state.snapAmplitude : -state.snapAmplitude);
            state.springVX *= 0.88;
          }
        }
        ensureTabSystem();
        refreshActiveTabBubble(true);
      }, { passive: true });

      if (mobileQuery && typeof mobileQuery.addEventListener === 'function') {
        mobileQuery.addEventListener('change', function () {
          if (isMobileView()) ensureAnimation();
        });
      }

      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState !== 'visible') {
          saveFabPosition();
        } else {
          ensureTabSystem();
          refreshActiveTabBubble(true);
          ensureAnimation();
        }
      });

      ensureTabSystem();
      applyInitialPosition();
      refreshActiveTabBubble(true);
      ensureAnimation();
    }
    document.addEventListener('DOMContentLoaded', function () {
      if (typeof checkAuthOnLoad === 'function') { checkAuthOnLoad().catch(function(){}); }
      var sharedState = getSharedAppState();
      if (sharedState && typeof sharedState.init === 'function') {
        sharedState.init();
      }
      loadFromLocalStorage();
      loadPendingQueue();
      updateSyncStatusBadge();
      renderSidebarTags();
      renderModalTagButtons();
      // 浼樺厛浠庢湇鍔＄鎷夊彇鏈€鏂颁换鍔?
      fetchTasksFromServer().then(function(){
        // fallback: if server empty, keep local
        renderSidebarTags();
        syncOfflineTasksToServer(true);
      });

      window.addEventListener('online', function () {
        updateSyncStatusBadge('syncing');
        syncOfflineTasksToServer(false);
      });

      window.addEventListener('offline', function () {
        updateSyncStatusBadge('pending');
      });

      var dateEl = document.getElementById('current-date');
      if (dateEl) {
        var now = new Date();
        var weeks = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
        dateEl.textContent = now.getFullYear() + '年' + (now.getMonth() + 1) + '月' + now.getDate() + '日 ' + weeks[now.getDay()];
      }

      // 缁戝畾鎵€鏈夋柊寤轰换鍔℃寜閽?
      var addTaskButtons = [
        'add-task-header-btn',
        'add-today-task-btn',
        'add-tomorrow-task-btn'
      ];
      addTaskButtons.forEach(function (id) {
        var btn = document.getElementById(id);
        if (btn) {
          btn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            window.openModalFunc();
          });
        }
      });
      initLiquidJellyFab();
      var selectModeBtn = document.getElementById('select-mode-btn');
      if (selectModeBtn) {
        selectModeBtn.addEventListener('click', function (e) {
          e.preventDefault();
          setBatchMode(!isBatchMode);
        });
      }

      var batchCancelBtn = document.getElementById('batch-cancel-btn');
      if (batchCancelBtn) {
        batchCancelBtn.addEventListener('click', function (e) {
          e.preventDefault();
          setBatchMode(false);
          showToast('已退出选择模式');
        });
      }

      var todoLogoutLink = document.getElementById('todo-logout-link');
      if (todoLogoutLink) {
        todoLogoutLink.addEventListener('click', function (e) {
          e.preventDefault();
          var sharedState = getSharedAppState();
          if (sharedState && typeof sharedState.logout === 'function') {
            sharedState.logout();
          }
          showToast('已退出登录');
          setTimeout(function () { safeNavigate('登录页面.html'); }, 250);
        });
      }

      var userMenuBtn = document.getElementById('user-menu-btn');
      var userDropdown = document.getElementById('user-dropdown');
      var userMenuContainer = document.getElementById('user-menu-container');
      var userMenuArrow = document.getElementById('user-menu-arrow');
      if (userMenuBtn && userDropdown && userMenuContainer) {
        userMenuBtn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          var isShow = userDropdown.classList.toggle('show');
          if (userMenuArrow) {
            userMenuArrow.style.transform = isShow ? 'rotate(180deg)' : 'rotate(0deg)';
          }
        });

        document.addEventListener('click', function (e) {
          if (!userMenuContainer.contains(e.target)) {
            userDropdown.classList.remove('show');
            if (userMenuArrow) userMenuArrow.style.transform = 'rotate(0deg)';
          }
        });
      }

      // 缁戝畾娣诲姞鏍囩鎸夐挳

      // 鏀寔閫氳繃 URL 鍙傛暟鐩存帴鎵撳紑鏂板缓浠诲姟妯℃€佹锛堢敤浜庢棩鍘嗛〉璺宠浆锛?
      (function openModalFromQuery() {
        var params;
        try {
          params = new URLSearchParams(window.location.search || '');
        } catch (err) {
          return;
        }

        if (params.get('openModal') !== 'new-task') return;

        var openFromQuery = function () {
          if (typeof window.openModalFunc === 'function') {
            window.openModalFunc();
          }
          params.delete('openModal');
          var cleanQuery = params.toString();
          var cleanUrl = window.location.pathname + (cleanQuery ? ('?' + cleanQuery) : '') + window.location.hash;
          window.history.replaceState({}, document.title, cleanUrl);
        };

        if (window.requestAnimationFrame) {
          window.requestAnimationFrame(function () {
            window.requestAnimationFrame(openFromQuery);
          });
        } else {
          setTimeout(openFromQuery, 0);
        }
      })();

      var addTagBtn = document.getElementById('add-tag-btn');
      var addTagInline = document.getElementById('add-tag-inline');
      var modalAddTagBtn = document.getElementById('modal-add-tag-btn');
      if (addTagBtn) {
        addTagBtn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          window.openTagModalFunc();
        });
      }
      if (addTagInline) {
        addTagInline.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          window.openTagModalFunc();
        });
      }
      if (modalAddTagBtn) {
        modalAddTagBtn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          window.openTagModalFunc();
        });
      }

      // 鍏抽棴璇︽儏闈㈡澘
      var detailDatetimeTrigger = document.getElementById('detail-datetime-trigger');
      var detailDatetimeShell = document.getElementById('detail-datetime-shell');
      var detailDateShell = document.getElementById('detail-date-shell');
      var detailTimeShell = document.getElementById('detail-time-shell');
      var detailDateTrigger = document.getElementById('detail-date-trigger');
      var detailTimeTrigger = document.getElementById('detail-time-trigger');
      var detailDateMenu = document.getElementById('detail-date-menu');
      var detailTimeMenu = document.getElementById('detail-time-menu');
      var detailDateInput = document.getElementById('detail-date-input');
      var detailTimeInput = document.getElementById('detail-time-input');
      var quickTodayBtn = document.getElementById('detail-datetime-today');
      var quickTomorrowBtn = document.getElementById('detail-datetime-tomorrow');
      var quickClearBtn = document.getElementById('detail-datetime-clear');
      var modalDateShell = document.getElementById('modal-date-shell');
      var modalTimeShell = document.getElementById('modal-time-shell');
      var modalDateTrigger = document.getElementById('modal-date-trigger');
      var modalTimeTrigger = document.getElementById('modal-time-trigger');
      var modalDateMenu = document.getElementById('modal-date-menu');
      var modalTimeMenu = document.getElementById('modal-time-menu');
      var modalDateInput = document.getElementById('modal-date');
      var modalTimeInput = document.getElementById('modal-time');

      if (detailDatetimeTrigger) {
        detailDatetimeTrigger.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          toggleDetailDatetimePanel();
        });
      }
      if (detailDateTrigger) {
        detailDateTrigger.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          renderDetailDateMenu();
          toggleDatetimeSelectMenu('detail-time-shell', 'detail-time-menu', false);
          toggleDatetimeSelectMenu('detail-date-shell', 'detail-date-menu');
        });
      }
      if (detailTimeTrigger) {
        detailTimeTrigger.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          renderDetailTimeMenu();
          toggleDatetimeSelectMenu('detail-date-shell', 'detail-date-menu', false);
          toggleDatetimeSelectMenu('detail-time-shell', 'detail-time-menu');
        });
      }
      if (detailDateMenu) {
        detailDateMenu.addEventListener('click', function (e) {
          var pickDate = e.target.closest('[data-date]');
          var actionBtn = e.target.closest('[data-calendar-action]');
          if (!pickDate && !actionBtn) return;
          e.preventDefault();
          e.stopPropagation();
          if (pickDate) {
            if (detailDateInput) detailDateInput.value = pickDate.dataset.date || '';
            detailDateMenuView = resolveDateMenuView(detailDateInput ? detailDateInput.value : '', detailDateMenuView);
            updateDetailDatetimeFromSplitInputs();
            toggleDatetimeSelectMenu('detail-date-shell', 'detail-date-menu', false);
            return;
          }
          var action = actionBtn.dataset.calendarAction || '';
          var step = parseInt(actionBtn.dataset.step || '0', 10);
          if (action === 'change-month' && step) {
            detailDateMenuView = shiftDateMenuMonth(detailDateMenuView, step);
            renderDetailDateMenu(true);
            return;
          }
          if (action === 'change-year' && step) {
            detailDateMenuView = shiftDateMenuYear(detailDateMenuView, step);
            renderDetailDateMenu(true);
            return;
          }
          if (action === 'jump-current') {
            detailDateMenuView = normalizeDateMenuMonth(new Date());
            renderDetailDateMenu(true);
            return;
          }
          if (action === 'pick-today') {
            if (detailDateInput) detailDateInput.value = toDateValueYMD(new Date());
            detailDateMenuView = resolveDateMenuView(detailDateInput ? detailDateInput.value : '', detailDateMenuView);
            updateDetailDatetimeFromSplitInputs();
            toggleDatetimeSelectMenu('detail-date-shell', 'detail-date-menu', false);
            return;
          }
          if (action === 'clear-date') {
            if (detailDateInput) detailDateInput.value = '';
            updateDetailDatetimeFromSplitInputs();
            toggleDatetimeSelectMenu('detail-date-shell', 'detail-date-menu', false);
          }
        });
      }
      if (detailTimeMenu) {
        detailTimeMenu.addEventListener('click', function (e) {
          var option = e.target.closest('[data-value]');
          var actionBtn = e.target.closest('[data-time-action]');
          if (!option && !actionBtn) return;
          e.preventDefault();
          e.stopPropagation();
          if (option) {
            if (detailTimeInput) detailTimeInput.value = option.dataset.value || '';
            updateDetailDatetimeFromSplitInputs();
            toggleDatetimeSelectMenu('detail-time-shell', 'detail-time-menu', false);
            return;
          }
          var action = actionBtn.dataset.timeAction || '';
          var hourInput = detailTimeMenu.querySelector('[data-time-input="hour"]');
          var minuteInput = detailTimeMenu.querySelector('[data-time-input="minute"]');
          if (action === 'set-hour' && hourInput) {
            hourInput.value = actionBtn.dataset.hour || hourInput.value;
            return;
          }
          if (action === 'set-minute' && minuteInput) {
            minuteInput.value = actionBtn.dataset.minute || minuteInput.value;
            return;
          }
          if (action === 'pick-now') {
            var now = new Date();
            if (detailTimeInput) detailTimeInput.value = normalizeTimeValue(now.getHours() + ':' + now.getMinutes());
            updateDetailDatetimeFromSplitInputs();
            toggleDatetimeSelectMenu('detail-time-shell', 'detail-time-menu', false);
            return;
          }
          if (action === 'apply-custom') {
            var custom = coerceTimeFromMenu(detailTimeMenu);
            if (!custom) {
              showToast('请输入有效时间（00:00-23:59）', 'warning');
              return;
            }
            if (detailTimeInput) detailTimeInput.value = custom;
            updateDetailDatetimeFromSplitInputs();
            toggleDatetimeSelectMenu('detail-time-shell', 'detail-time-menu', false);
          }
        });
      }
      if (modalDateTrigger) {
        modalDateTrigger.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          renderModalDateMenu();
          toggleDatetimeSelectMenu('modal-time-shell', 'modal-time-menu', false);
          toggleDatetimeSelectMenu('modal-date-shell', 'modal-date-menu');
        });
      }
      if (modalTimeTrigger) {
        modalTimeTrigger.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          renderModalTimeMenu();
          toggleDatetimeSelectMenu('modal-date-shell', 'modal-date-menu', false);
          toggleDatetimeSelectMenu('modal-time-shell', 'modal-time-menu');
        });
      }
      if (modalDateMenu) {
        modalDateMenu.addEventListener('click', function (e) {
          var pickDate = e.target.closest('[data-date]');
          var actionBtn = e.target.closest('[data-calendar-action]');
          if (!pickDate && !actionBtn) return;
          e.preventDefault();
          e.stopPropagation();
          if (pickDate) {
            if (modalDateInput) modalDateInput.value = pickDate.dataset.date || '';
            modalDateMenuView = resolveDateMenuView(modalDateInput ? modalDateInput.value : '', modalDateMenuView);
            syncModalDateTimeLabels();
            renderModalDateMenu();
            toggleDatetimeSelectMenu('modal-date-shell', 'modal-date-menu', false);
            return;
          }
          var action = actionBtn.dataset.calendarAction || '';
          var step = parseInt(actionBtn.dataset.step || '0', 10);
          if (action === 'change-month' && step) {
            modalDateMenuView = shiftDateMenuMonth(modalDateMenuView, step);
            renderModalDateMenu(true);
            return;
          }
          if (action === 'change-year' && step) {
            modalDateMenuView = shiftDateMenuYear(modalDateMenuView, step);
            renderModalDateMenu(true);
            return;
          }
          if (action === 'jump-current') {
            modalDateMenuView = normalizeDateMenuMonth(new Date());
            renderModalDateMenu(true);
            return;
          }
          if (action === 'pick-today') {
            if (modalDateInput) modalDateInput.value = toDateValueYMD(new Date());
            modalDateMenuView = resolveDateMenuView(modalDateInput ? modalDateInput.value : '', modalDateMenuView);
            syncModalDateTimeLabels();
            renderModalDateMenu();
            toggleDatetimeSelectMenu('modal-date-shell', 'modal-date-menu', false);
            return;
          }
          if (action === 'clear-date') {
            if (modalDateInput) modalDateInput.value = '';
            syncModalDateTimeLabels();
            renderModalDateMenu();
            toggleDatetimeSelectMenu('modal-date-shell', 'modal-date-menu', false);
          }
        });
      }
      if (modalTimeMenu) {
        modalTimeMenu.addEventListener('click', function (e) {
          var option = e.target.closest('[data-value]');
          var actionBtn = e.target.closest('[data-time-action]');
          if (!option && !actionBtn) return;
          e.preventDefault();
          e.stopPropagation();
          if (option) {
            if (modalTimeInput) modalTimeInput.value = option.dataset.value || '';
            syncModalDateTimeLabels();
            renderModalTimeMenu();
            toggleDatetimeSelectMenu('modal-time-shell', 'modal-time-menu', false);
            return;
          }
          var action = actionBtn.dataset.timeAction || '';
          var hourInput = modalTimeMenu.querySelector('[data-time-input="hour"]');
          var minuteInput = modalTimeMenu.querySelector('[data-time-input="minute"]');
          if (action === 'set-hour' && hourInput) {
            hourInput.value = actionBtn.dataset.hour || hourInput.value;
            return;
          }
          if (action === 'set-minute' && minuteInput) {
            minuteInput.value = actionBtn.dataset.minute || minuteInput.value;
            return;
          }
          if (action === 'pick-now') {
            var now = new Date();
            if (modalTimeInput) modalTimeInput.value = normalizeTimeValue(now.getHours() + ':' + now.getMinutes());
            syncModalDateTimeLabels();
            renderModalTimeMenu();
            toggleDatetimeSelectMenu('modal-time-shell', 'modal-time-menu', false);
            return;
          }
          if (action === 'apply-custom') {
            var custom = coerceTimeFromMenu(modalTimeMenu);
            if (!custom) {
              showToast('请输入有效时间（00:00-23:59）', 'warning');
              return;
            }
            if (modalTimeInput) modalTimeInput.value = custom;
            syncModalDateTimeLabels();
            renderModalTimeMenu();
            toggleDatetimeSelectMenu('modal-time-shell', 'modal-time-menu', false);
          }
        });
      }
      if (quickTodayBtn) quickTodayBtn.addEventListener('click', function () { applyQuickDueDate('today'); });
      if (quickTomorrowBtn) quickTomorrowBtn.addEventListener('click', function () { applyQuickDueDate('tomorrow'); });
      if (quickClearBtn) quickClearBtn.addEventListener('click', function () { applyQuickDueDate('clear'); });
      document.addEventListener('click', function (e) {
        if (detailDatetimeShell && !detailDatetimeShell.contains(e.target)) {
          closeDetailDatetimePanel();
        }
        if (detailDateShell && !detailDateShell.contains(e.target)) toggleDatetimeSelectMenu('detail-date-shell', 'detail-date-menu', false);
        if (detailTimeShell && !detailTimeShell.contains(e.target)) toggleDatetimeSelectMenu('detail-time-shell', 'detail-time-menu', false);
        if (modalDateShell && !modalDateShell.contains(e.target)) toggleDatetimeSelectMenu('modal-date-shell', 'modal-date-menu', false);
        if (modalTimeShell && !modalTimeShell.contains(e.target)) toggleDatetimeSelectMenu('modal-time-shell', 'modal-time-menu', false);
      });

      var closeDetailBtn = document.getElementById('close-detail-btn');
      var taskDetailPanel = document.getElementById('task-detail-panel');
      if (closeDetailBtn) {
        closeDetailBtn.addEventListener('click', function () {
          closeTaskDetailModal();
        });
      }
      if (taskDetailPanel) {
        taskDetailPanel.addEventListener('click', function (e) {
          if (e.target === taskDetailPanel) closeTaskDetailModal();
        });
      }
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && taskDetailPanel && !taskDetailPanel.classList.contains('hidden')) {
          closeTaskDetailModal();
        }
      });

      // 鍙栨秷缂栬緫
      var cancelEditBtn = document.getElementById('cancel-edit-btn');
      if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', function () {
          closeTaskDetailModal();
        });
      }

      // 保存任务
      var saveTaskBtn = document.getElementById('save-task-btn');
      if (saveTaskBtn) {
        saveTaskBtn.addEventListener('click', function () {
          if (currentEditingTask) {
            var detailDatetimeEl = document.getElementById('detail-datetime');
            var dueLocal = detailDatetimeEl ? detailDatetimeEl.value : '';
            var dueIso = dueLocal ? new Date(dueLocal).toISOString() : null;
            var updatedPayload = {
              title: document.getElementById('detail-title').value,
              description: document.getElementById('detail-description').value,
              priority: selectedDetailPriority,
              dueAt: dueIso
            };
            if (isLocalTaskId(currentEditingTask.id)) {
              Object.assign(currentEditingTask, updatedPayload);
              currentEditingTask.time = dueLocal ? dueLocal.slice(11, 16) : '';
              currentEditingTask.completed = (currentEditingTask.status === 'completed');
              renderTaskLists();
              updateCountStats();
              saveToLocalStorage();
              closeTaskDetailModal();
              showToast('本地离线任务已保存');
              return;
            }
            updateTaskOnServer(currentEditingTask.id, updatedPayload).then(function (updated) {
              // merge returned fields
              Object.assign(currentEditingTask, updated);
              if (!currentEditingTask.dueAt) currentEditingTask.dueAt = dueIso;
              currentEditingTask.time = currentEditingTask.dueAt ? toLocalDatetimeValue(currentEditingTask.dueAt).slice(11, 16) : '';
              ensureTaskSubtasks(currentEditingTask);
              currentEditingTask.completed = (currentEditingTask.status === 'completed');
              renderTaskLists();
              updateCountStats();
              saveToLocalStorage();
              closeTaskDetailModal();
              showToast('任务保存成功');
            }).catch(function (err) {
              console.error(err);
              showToast('保存任务失败', 'error');
            });
          }
        });
      }

      // 鎵归噺鎿嶄綔
      var batchCompleteBtn = document.getElementById('batch-complete-btn');
      var batchDeleteBtn = document.getElementById('batch-delete-btn');
      if (batchCompleteBtn) {
        batchCompleteBtn.addEventListener('click', function () {
          window.confirmBatchComplete();
        });
      }
      if (batchDeleteBtn) {
        batchDeleteBtn.addEventListener('click', function () {
          window.confirmBatchDelete();
        });
      }

      // 鎺掑簭绛涢€夎彍鍗?
      var sortFilterBtn = document.getElementById('sort-filter-btn');
      var sortFilterMenu = document.getElementById('sort-filter-menu');
      if (sortFilterBtn && sortFilterMenu) {
        updateSortMenuState();
        var sortMenuContainer = sortFilterBtn.parentElement;
        var lastSortTouchTs = 0;

        function closeSortMenu() {
          sortFilterMenu.classList.remove('show');
          if (sortMenuContainer) {
            sortMenuContainer.classList.remove('software-menu-open');
          }
        }

        function openSortMenu() {
          sortFilterMenu.classList.add('show');
          if (sortMenuContainer) {
            sortMenuContainer.classList.add('software-menu-open');
          }
        }

        function toggleSortMenu() {
          if (sortFilterMenu.classList.contains('show')) {
            closeSortMenu();
          } else {
            openSortMenu();
          }
        }

        sortFilterBtn.addEventListener('click', function (e) {
          if (Date.now() - lastSortTouchTs < 420) return;
          e.preventDefault();
          e.stopPropagation();
          toggleSortMenu();
        });

        sortFilterBtn.addEventListener('touchend', function (e) {
          lastSortTouchTs = Date.now();
          e.preventDefault();
          e.stopPropagation();
          toggleSortMenu();
        });

        sortFilterMenu.addEventListener('click', function (e) {
          var item = e.target.closest('[data-sort]');
          if (!item) return;
          if (Date.now() - lastSortTouchTs < 420) return;
          e.preventDefault();
          e.stopPropagation();
          currentSortMode = item.dataset.sort || 'time';
          updateSortMenuState();
          closeSortMenu();
          renderTaskLists();
          showToast('已切换排序：' + getSortLabel(currentSortMode));
        });

        sortFilterMenu.addEventListener('touchend', function (e) {
          var item = e.target.closest('[data-sort]');
          if (!item) return;
          lastSortTouchTs = Date.now();
          e.preventDefault();
          e.stopPropagation();
          currentSortMode = item.dataset.sort || 'time';
          updateSortMenuState();
          closeSortMenu();
          renderTaskLists();
          showToast('已切换排序：' + getSortLabel(currentSortMode));
        });

        document.addEventListener('click', function (e) {
          if (!sortFilterBtn.contains(e.target) && !sortFilterMenu.contains(e.target)) {
            closeSortMenu();
          }
        });
      }

      // 渚ц竟鏍忎富鍒嗙被绛涢€?
      var sidebarMainList = document.getElementById('sidebar-main-list');
      if (sidebarMainList) {
        sidebarMainList.addEventListener('click', function (e) {
          var item = e.target.closest('[data-main]');
          if (!item) return;
          e.preventDefault();
          currentMainFilter = item.dataset.main || 'all';
          currentTagFilter = null;
          renderTaskLists();
        });
      }

      // 侧边栏标签筛选（再次点击取消筛选）
      var sidebarTagList = document.getElementById('sidebar-tag-list');
      if (sidebarTagList) {
        sidebarTagList.addEventListener('click', function (e) {
          var item = e.target.closest('[data-tag]');
          if (!item) return;
          e.preventDefault();
          var clicked = item.dataset.tag;
          currentTagFilter = (currentTagFilter === clicked) ? null : clicked;
          currentMainFilter = 'all';
          renderTaskLists();
        });
      }

      // 搜索功能（桌面头部 + 移动端下拉面板）
      var searchInputs = [
        document.getElementById('search-input'),
        document.getElementById('mobile-toolbar-search-input')
      ].filter(function (el) { return !!el; });

      var clearButtons = [
        document.getElementById('clear-search'),
        document.getElementById('mobile-toolbar-clear-search')
      ].filter(function (el) { return !!el; });

      function syncSearchControls(value) {
        var v = value || '';
        searchInputs.forEach(function (input) {
          if (input && input.value !== v) input.value = v;
        });
        clearButtons.forEach(function (btn) {
          if (btn) btn.style.opacity = v ? '1' : '0';
        });
      }

      if (searchInputs.length > 0) {
        currentSearchKeyword = searchInputs[0].value || '';
        syncSearchControls(currentSearchKeyword);

        searchInputs.forEach(function (input) {
          input.addEventListener('input', function () {
            currentSearchKeyword = this.value || '';
            syncSearchControls(currentSearchKeyword);
            renderTaskLists();
          });
          input.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && this.value) {
              currentSearchKeyword = '';
              syncSearchControls('');
              renderTaskLists();
            }
          });
        });

        clearButtons.forEach(function (btn) {
          btn.addEventListener('click', function () {
            currentSearchKeyword = '';
            syncSearchControls('');
            renderTaskLists();
            if (searchInputs[0]) searchInputs[0].focus();
          });
        });
      }

      // 鍒犻櫎浠诲姟锛堣鎯呴〉锛?
      var deleteTaskBtn = document.getElementById('delete-task-btn');
      if (deleteTaskBtn) {
        deleteTaskBtn.addEventListener('click', function () {
          if (currentEditingTask && confirm('确定要删除这个任务吗？')) {
            if (isLocalTaskId(currentEditingTask.id)) {
              var localIsToday = tasks.today.some(function (t) { return String(t.id) === String(currentEditingTask.id); });
              var localList = localIsToday ? tasks.today : tasks.tomorrow;
              var localIndex = localList.findIndex(function (t) { return String(t.id) === String(currentEditingTask.id); });
              if (localIndex > -1) localList.splice(localIndex, 1);
              removePendingByLocalId(currentEditingTask.id);
              renderTaskLists();
              updateCountStats();
              saveToLocalStorage();
              closeTaskDetailModal();
              showToast('本地离线任务已删除');
              return;
            }
            apiRequest('/api/tasks/' + currentEditingTask.id, { method: 'DELETE' }).then(function (resp) {
              if (resp.status === 200 && resp.body && resp.body.code === 200) {
                var isToday = tasks.today.some(function (t) { return t.id === currentEditingTask.id; });
                var list = isToday ? tasks.today : tasks.tomorrow;
                var index = list.findIndex(function (t) { return t.id === currentEditingTask.id; });
                if (index > -1) list.splice(index, 1);
                renderTaskLists();
                updateCountStats();
                saveToLocalStorage();
                closeTaskDetailModal();
                showToast('任务已删除');
              } else {
                showToast((resp.body && resp.body.message) || '删除失败', 'error');
              }
            }).catch(function (err) {
              console.error(err);
              showToast('网络错误，删除任务失败', 'error');
            });
          }
        });
      }

      // 鍒嗕韩/澶嶅埗浠诲姟锛堣鎯呴〉锛?
      var shareTaskBtn = document.getElementById('share-task-btn');
      var copyTaskBtn = document.getElementById('copy-task-btn');
      if (shareTaskBtn) {
        shareTaskBtn.addEventListener('click', function () {
          if (!currentEditingTask) return;
          shareOrCopyText(buildTaskExportText(currentEditingTask), '任务已分享').catch(function () {
            showToast('分享任务失败', 'error');
          });
        });
      }
      if (copyTaskBtn) {
        copyTaskBtn.addEventListener('click', function () {
          if (!currentEditingTask) return;
          copyTextToClipboard(buildTaskExportText(currentEditingTask)).then(function () {
            showToast('任务内容已复制');
          }).catch(function () {
            showToast('复制任务失败', 'error');
          });
        });
      }

      var copySubtasksBtn = document.getElementById('copy-subtasks-btn');
      var shareSubtasksBtn = document.getElementById('share-subtasks-btn');
      if (copySubtasksBtn) {
        copySubtasksBtn.addEventListener('click', function () {
          if (!currentEditingTask) return;
          ensureTaskSubtasks(currentEditingTask);
          if (!currentEditingTask.subtasks.length) {
            showToast('暂无子任务可复制', 'warning');
            return;
          }
          var lines = currentEditingTask.subtasks.map(function (s, idx) {
            return (idx + 1) + '. ' + (s.completed ? '[已完成] ' : '[待办] ') + s.title;
          }).join('\n');
          copyTextToClipboard(lines).then(function () {
            showToast('📋 子任务列表已复制');
          }).catch(function () {
            showToast('复制子任务失败', 'error');
          });
        });
      }
      if (shareSubtasksBtn) {
        shareSubtasksBtn.addEventListener('click', function () {
          if (!currentEditingTask) return;
          ensureTaskSubtasks(currentEditingTask);
          if (!currentEditingTask.subtasks.length) {
            showToast('暂无子任务可分享', 'warning');
            return;
          }
          var lines = currentEditingTask.subtasks.map(function (s, idx) {
            return (idx + 1) + '. ' + (s.completed ? '[已完成] ' : '[待办] ') + s.title;
          }).join('\n');
          shareOrCopyText('子任务清单：\n' + lines, '📤 子任务列表已分享').catch(function () {
            showToast('分享子任务失败', 'error');
          });
        });
      }

      // 瀛愪换鍔″姛鑳?
      var addSubtaskBtn = document.getElementById('add-subtask-btn');
      var newSubtaskInput = document.getElementById('new-subtask-input');
      if (addSubtaskBtn && newSubtaskInput) {
        var subtaskSubmitting = false;
        var setSubtaskSubmitting = function (pending) {
          subtaskSubmitting = !!pending;
          addSubtaskBtn.disabled = !!pending;
          newSubtaskInput.disabled = !!pending;
        };
        var normalizeSubtaskText = function (raw) {
          return String(raw == null ? '' : raw).replace(/\s+/g, ' ').trim();
        };
        var hasDuplicateSubtask = function (task, title) {
          var lower = String(title || '').toLowerCase();
          return (task.subtasks || []).some(function (s) {
            return String((s && (s.title || s.text)) || '').toLowerCase() === lower;
          });
        };
        var addSubtask = function () {
          if (!currentEditingTask) {
            showToast('请先打开任务详情', 'warning');
            return;
          }
          if (subtaskSubmitting) return;
          var text = normalizeSubtaskText(newSubtaskInput.value);
          if (!text) {
            showToast('请输入子任务内容', 'warning');
            return;
          }
          if (text.length > 60) {
            showToast('子任务最多 60 个字符', 'warning');
            return;
          }
          ensureTaskSubtasks(currentEditingTask);
          if (hasDuplicateSubtask(currentEditingTask, text)) {
            showToast('该子任务已存在', 'warning');
            return;
          }
          currentEditingTask.subtasks.push({ title: text, completed: false });
          setSubtaskSubmitting(true);
          syncCurrentSubtasksToServer().then(function () {
            renderSubtasks();
            saveToLocalStorage();
            newSubtaskInput.value = '';
            showToast('子任务已添加');
          }).catch(function (err) {
            console.error(err);
            currentEditingTask.subtasks.pop();
            showToast('添加子任务失败', 'error');
          }).finally(function () {
            setSubtaskSubmitting(false);
          });
        };
        addSubtaskBtn.addEventListener('click', addSubtask);
        newSubtaskInput.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            addSubtask();
          }
        });
      }

      // 鍏ㄩ儴瀹屾垚瀛愪换鍔?
      var completeAllSubtasks = document.getElementById('complete-all-subtasks');
      if (completeAllSubtasks) {
        completeAllSubtasks.addEventListener('click', function () {
          if (currentEditingTask) {
            ensureTaskSubtasks(currentEditingTask);
            if (!currentEditingTask.subtasks.length) {
              showToast('暂无子任务可操作', 'warning');
              return;
            }
            var backup = currentEditingTask.subtasks.map(function (s) { return !!s.completed; });
            if (backup.every(function (v) { return v; })) {
              showToast('子任务已全部完成', 'info');
              return;
            }
            currentEditingTask.subtasks.forEach(function (s) { s.completed = true; });
            syncCurrentSubtasksToServer().then(function () {
              renderSubtasks();
              saveToLocalStorage();
              showToast('所有子任务已标记完成');
            }).catch(function (err) {
              console.error(err);
              currentEditingTask.subtasks.forEach(function (s, idx) { s.completed = !!backup[idx]; });
              renderSubtasks();
              showToast('批量更新子任务失败', 'error');
            });
          }
        });
      }

      // 通知按钮
      var notificationBtn = document.getElementById('notification-btn');
      if (notificationBtn) {
        notificationBtn.addEventListener('click', function () {
          showToast('🔔 暂无新通知');
        });
      }

      // 绉诲姩绔悳绱細澧炲己鍏煎鎬э紝鏀寔 touch/click銆侀伩鍏嶅弻瑙﹀彂锛屽苟鍦?header 涓婂垏鎹?class 鎺у埗鍙鎬?
      var mobileSearchBtn = document.getElementById('mobile-search-btn');
      function getActiveMainHeader() {
        return document.querySelector('.unified-top-header-dock .unified-top-header-shell#main-header') || document.getElementById('main-header');
      }

      function getActiveSearchInput() {
        var isMobile = window.matchMedia && window.matchMedia('(max-width: 900px)').matches;
        var mobileInput = document.getElementById('mobile-toolbar-search-input');
        if (isMobile && mobileInput) return mobileInput;
        var header = getActiveMainHeader();
        return header ? header.querySelector('#search-input') : document.getElementById('search-input');
      }

      var mainHeaderEl = getActiveMainHeader();
      if (mobileSearchBtn) {
        (function () {
          var lastSearchTouchTs = 0;
          function toggleMobileSearch(e) {
            try {
              if (e && e.type === 'touchend') {
                var now = Date.now();
                if (now - lastSearchTouchTs < 400) {
                  e.preventDefault && e.preventDefault();
                  return;
                }
                lastSearchTouchTs = now;
              }
              e && e.preventDefault && e.preventDefault();
              e && e.stopPropagation && e.stopPropagation();
            } catch (err) {}

            var searchInput = getActiveSearchInput();
            if (!searchInput) return;
            var parent = searchInput.parentElement;
            if (!parent) return;
            var isMobile = window.matchMedia && window.matchMedia('(max-width: 900px)').matches;
            var mobilePanel = document.getElementById('mobile-toolbar-search-panel');
            if (isMobile && mobilePanel) {
              if (mobilePanel.classList.contains('hidden')) {
                mobilePanel.classList.remove('hidden');
                try { searchInput.focus(); } catch (err) {}
              } else {
                mobilePanel.classList.add('hidden');
              }
              return;
            }
            mainHeaderEl = getActiveMainHeader();
            var isVisible = !parent.classList.contains('hidden');
            if (isVisible) {
              parent.classList.add('hidden');
              if (mainHeaderEl) mainHeaderEl.classList.remove('mobile-search-open');
              try {
                window.applyTodoMobileSearchOffset && window.applyTodoMobileSearchOffset(false);
                requestAnimationFrame(function () {
                  window.applyTodoMobileSearchOffset && window.applyTodoMobileSearchOffset(false);
                });
              } catch (err) {}
            } else {
              parent.classList.remove('hidden');
              if (mainHeaderEl) mainHeaderEl.classList.add('mobile-search-open');
              try { searchInput.focus(); } catch (err) {}
              try {
                window.applyTodoMobileSearchOffset && window.applyTodoMobileSearchOffset(true);
                requestAnimationFrame(function () {
                  requestAnimationFrame(function () {
                    window.applyTodoMobileSearchOffset && window.applyTodoMobileSearchOffset(true);
                  });
                });
              } catch (err) {}
            }
          }

          // Avoid binding if an inline handler is present (prevents duplicate toggle)
          if (!mobileSearchBtn.getAttribute('onclick')) {
            mobileSearchBtn.addEventListener('click', toggleMobileSearch);
            mobileSearchBtn.addEventListener('touchend', toggleMobileSearch, { passive: false });
          }

          // 点击页面任意处关闭搜索（仅当搜索已展开时）
          document.addEventListener('click', function (ev) {
            var searchInput = getActiveSearchInput();
            if (!searchInput) return;
            var isMobile = window.matchMedia && window.matchMedia('(max-width: 900px)').matches;
            var mobilePanel = document.getElementById('mobile-toolbar-search-panel');
            if (isMobile && mobilePanel && !mobilePanel.classList.contains('hidden')) {
              if (ev.target === mobileSearchBtn || mobileSearchBtn.contains(ev.target) || mobilePanel.contains(ev.target)) return;
              mobilePanel.classList.add('hidden');
              return;
            }
            var parent = searchInput.parentElement;
            if (!parent || parent.classList.contains('hidden')) return;
            mainHeaderEl = getActiveMainHeader();
            if (ev.target === mobileSearchBtn || mobileSearchBtn.contains(ev.target) || parent.contains(ev.target)) return;
            parent.classList.add('hidden');
            if (mainHeaderEl) mainHeaderEl.classList.remove('mobile-search-open');
            try {
              window.applyTodoMobileSearchOffset && window.applyTodoMobileSearchOffset(false);
              requestAnimationFrame(function () {
                window.applyTodoMobileSearchOffset && window.applyTodoMobileSearchOffset(false);
              });
            } catch (err) {}
          });

          try {
            var initialInput = getActiveSearchInput();
            var initialParent = initialInput && initialInput.parentElement;
            var initiallyOpen = !!(initialParent && !initialParent.classList.contains('hidden'));
            window.applyTodoMobileSearchOffset && window.applyTodoMobileSearchOffset(initiallyOpen);
          } catch (err) {}
        })();
      }
    });


      document.addEventListener('DOMContentLoaded', function () {
        if (typeof AppState !== 'undefined' && AppState && typeof AppState.init === 'function') {
          AppState.init();
        }
        var monthDate = new Date();
        monthDate.setDate(1);

        var calendarState = {
          view: 'month',
          selectedDate: new Date()
        };

        var monthTitle = document.getElementById('month-title');
        var monthGrid = document.getElementById('month-grid');
        var weekGrid = document.getElementById('week-grid');
        var dayGrid = document.getElementById('day-grid');
        var weekTitle = document.querySelector('#week-view h2');
        var dayTitle = document.querySelector('#day-view h2');
        var detailPanel = document.getElementById('task-detail-panel');
        var closeDetailBtn = document.getElementById('close-detail-btn');
        var cancelBtn = document.getElementById('cancel-btn');
        var saveBtn = document.getElementById('save-btn');
        var detailTitle = document.getElementById('detail-title');
        var detailDescription = document.getElementById('detail-description');
        var detailDueAt = document.getElementById('detail-dueAt');
        var detailTagList = document.getElementById('tag-list');
        var subtaskList = document.getElementById('subtask-list');
        var addSubtaskBtn = document.getElementById('add-subtask-btn');
        var newSubtaskInput = document.getElementById('new-subtask-input');
        var completeAllSubtasksBtn = document.getElementById('complete-all-subtasks');
        var shareTaskBtn = document.getElementById('share-task-btn');
        var copyTaskBtn = document.getElementById('copy-task-btn');
        var deleteTaskBtn = document.getElementById('delete-task-btn');
        var copySubtasksBtn = document.getElementById('copy-subtasks-btn');
        var shareSubtasksBtn = document.getElementById('share-subtasks-btn');
        var detailDatetimeShell = document.getElementById('detail-datetime-shell');
        var detailDatetimeTrigger = document.getElementById('detail-datetime-trigger');
        var detailDatetimeText = document.getElementById('detail-datetime-text');
        var detailDateShell = document.getElementById('detail-date-shell');
        var detailTimeShell = document.getElementById('detail-time-shell');
        var detailDateTrigger = document.getElementById('detail-date-trigger');
        var detailTimeTrigger = document.getElementById('detail-time-trigger');
        var detailDateMenu = document.getElementById('detail-date-menu');
        var detailTimeMenu = document.getElementById('detail-time-menu');
        var detailDateText = document.getElementById('detail-date-text');
        var detailTimeText = document.getElementById('detail-time-text');
        var detailDateInput = document.getElementById('detail-date-input');
        var detailTimeInput = document.getElementById('detail-time-input');
        var quickTodayBtn = document.getElementById('detail-datetime-today');
        var quickTomorrowBtn = document.getElementById('detail-datetime-tomorrow');
        var quickClearBtn = document.getElementById('detail-datetime-clear');
        var selectedTaskId = null;
        var currentEditingTask = null;
        var taskPool = document.getElementById('task-pool');
        var aiScheduleBtn = document.getElementById('ai-schedule-btn');
        var aiScheduleStatus = document.getElementById('ai-schedule-status');
        var categoryChips = Array.prototype.slice.call(document.querySelectorAll('.category-chip[data-category]'));
        var taskPoolView = 'grid';
        var activeCategory = 'all';
        var selectedDaySortMode = 'time';
        var selectedDayMultiMode = false;
        var selectedDayBatchIds = [];
        var viewSwitchTimer = null;
        var isSwitchingView = false;
        var CALENDAR_RENDER_TASK_LIMIT = 1200;
        var DAY_VIEW_CARD_LIMIT = 120;
        var calendarTaskMapCache = null;
        var calendarTaskMapCacheCategory = '';
        var calendarTaskMapCacheTaskCount = -1;
        var calendarTaskOverflowWarned = false;
        var dayViewRenderToken = 0;

        // ✅ Toast 提示函数 - 右上角弹出
        function showToast(message, type) {
          if (window.__unifiedShowToast) {
            window.__unifiedShowToast(message, type || 'info');
          }
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
          }).filter(function (s) { return !!s.title; });
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
          if (!detailDateMenu || !detailDateInput) return;
          var selected = detailDateInput.value || '';
          detailDateMenuView = resolveDateMenuView(selected, detailDateMenuView, !!keepView);
          detailDateMenu.classList.add('date-calendar-menu');
          detailDateMenu.classList.remove('time-custom-menu');
          detailDateMenu.innerHTML = buildDateCalendarMenuHtml(selected, detailDateMenuView);
        }

        function renderDetailTimeMenu() {
          if (!detailTimeMenu || !detailTimeInput) return;
          var selected = normalizeTimeValue(detailTimeInput.value || '');
          detailTimeMenu.classList.remove('date-calendar-menu');
          detailTimeMenu.classList.add('time-custom-menu');
          detailTimeMenu.innerHTML = buildTimeMenuHtml(selected);
        }

        function toggleDatetimeSelectMenu(shell, menu, forceOpen) {
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
          toggleDatetimeSelectMenu(detailDateShell, detailDateMenu, false);
          toggleDatetimeSelectMenu(detailTimeShell, detailTimeMenu, false);
        }

        function setDetailDatetimeFromValue(localValue) {
          if (detailDueAt) detailDueAt.value = localValue || '';
          if (detailDateInput) detailDateInput.value = localValue ? localValue.slice(0, 10) : '';
          if (detailTimeInput) detailTimeInput.value = localValue ? localValue.slice(11, 16) : '';
          if (detailDatetimeText) detailDatetimeText.textContent = formatDatetimeDisplay(localValue);
          if (detailDateText) detailDateText.textContent = formatDetailDateLabel(detailDateInput ? detailDateInput.value : '');
          if (detailTimeText) detailTimeText.textContent = formatDetailTimeLabel(detailTimeInput ? detailTimeInput.value : '');
          renderDetailDateMenu();
          renderDetailTimeMenu();
        }

        function updateDetailDatetimeFromSplitInputs() {
          var dateVal = detailDateInput ? detailDateInput.value : '';
          var timeVal = detailTimeInput ? detailTimeInput.value : '';
          if (!dateVal) {
            setDetailDatetimeFromValue('');
            return;
          }
          if (!timeVal) timeVal = '09:00';
          setDetailDatetimeFromValue(dateVal + 'T' + timeVal.slice(0, 5));
        }

        function closeDetailDatetimePanel() {
          if (detailDatetimeShell) detailDatetimeShell.classList.remove('open');
          closeDetailDateTimeMenus();
        }

        function toggleDetailDatetimePanel(forceOpen) {
          if (!detailDatetimeShell) return;
          var shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !detailDatetimeShell.classList.contains('open');
          if (shouldOpen) detailDatetimeShell.classList.add('open');
          else detailDatetimeShell.classList.remove('open');
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
              showToast(successMessage || '已分享任务', 'success');
            }).catch(function () {
              return copyTextToClipboard(text).then(function () {
                showToast('已复制分享内容', 'success');
              });
            });
          }
          return copyTextToClipboard(text).then(function () {
            showToast('已复制分享内容', 'success');
          });
        }

        function syncCurrentSubtasksToServer() {
          if (!currentEditingTask || !currentEditingTask.id) return Promise.resolve(true);
          ensureTaskSubtasks(currentEditingTask);
          if (String(currentEditingTask.id).indexOf('local_') === 0) {
            saveCalendarState();
            return Promise.resolve(true);
          }
          var payload = currentEditingTask.subtasks.map(function (s) {
            return { title: s.title || s.text || '', completed: !!s.completed };
          });
          return apiRequest('/api/tasks/' + currentEditingTask.id + '/subtasks', {
            method: 'PUT',
            body: JSON.stringify(payload)
          }).then(function (resp) {
            if (resp && resp.status === 200 && resp.body && resp.body.code === 200) {
              saveCalendarState();
              return true;
            }
            throw new Error((resp && resp.body && resp.body.message) || '子任务同步失败');
          });
        }

        function normalizeCalendarServerTask(task) {
          var item = Object.assign({}, task || {});
          item.title = item.title || item.name || '未命名任务';
          item.description = item.description || item.note || '';
          item.dueAt = item.dueAt || item.due_at || null;
          item.status = item.status || item.state || 'pending';
          item.priority = item.priority || 'medium';
          var labels = parseTags(item.tags || item.labels || item.tag);
          item.labels = labels.length ? labels : ['工作'];
          ensureTaskSubtasks(item);
          return item;
        }

        function fetchCalendarTasksFromServer() {
          return apiRequest('/api/tasks', { method: 'GET' }).then(function (resp) {
            if (!(resp && resp.status === 200 && resp.body && resp.body.code === 200)) {
              throw new Error((resp && resp.body && resp.body.message) || '获取任务失败');
            }
            var data = resp.body.data;
            var list = [];
            if (Array.isArray(data)) list = data;
            else if (data && Array.isArray(data.records)) list = data.records;
            else if (data && Array.isArray(data.list)) list = data.list;
            AppState.tasks = list.map(normalizeCalendarServerTask);
            saveCalendarState();
            return true;
          });
        }

        function updateCalendarTaskOnServer(taskId, payload) {
          return apiRequest('/api/tasks/' + taskId, {
            method: 'PUT',
            body: JSON.stringify(payload)
          }).then(function (resp) {
            if (resp && resp.status === 200 && resp.body && resp.body.code === 200) {
              return (resp.body && resp.body.data) || null;
            }
            throw new Error((resp && resp.body && resp.body.message) || '更新任务失败');
          });
        }

        function deleteCalendarTaskOnServer(taskId) {
          return apiRequest('/api/tasks/' + taskId, { method: 'DELETE' }).then(function (resp) {
            if (resp && resp.status === 200 && resp.body && resp.body.code === 200) return true;
            throw new Error((resp && resp.body && resp.body.message) || '删除任务失败');
          });
        }

        function renderSubtasks() {
          if (!subtaskList || !currentEditingTask) return;
          ensureTaskSubtasks(currentEditingTask);
          if (!currentEditingTask.subtasks.length) {
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
          if (!currentEditingTask || !currentEditingTask.subtasks[index]) return;
          currentEditingTask.subtasks[index].completed = !currentEditingTask.subtasks[index].completed;
          syncCurrentSubtasksToServer().then(function () {
            renderSubtasks();
            renderMonthGrid();
            renderScheduledTaskList();
          }).catch(function (err) {
            console.error(err);
            currentEditingTask.subtasks[index].completed = !currentEditingTask.subtasks[index].completed;
            renderSubtasks();
            showToast('更新子任务失败', 'error');
          });
        };

        window.deleteSubtask = function (index) {
          if (!currentEditingTask || !currentEditingTask.subtasks[index]) return;
          var backup = currentEditingTask.subtasks.slice();
          currentEditingTask.subtasks.splice(index, 1);
          syncCurrentSubtasksToServer().then(function () {
            renderSubtasks();
            renderMonthGrid();
            renderScheduledTaskList();
            showToast('✅ 子任务已删除', 'success');
          }).catch(function (err) {
            console.error(err);
            currentEditingTask.subtasks = backup;
            renderSubtasks();
            showToast('删除子任务失败', 'error');
          });
        };

        window.copySubtask = function (index) {
          if (!currentEditingTask || !currentEditingTask.subtasks[index]) return;
          var sub = currentEditingTask.subtasks[index];
          copyTextToClipboard(sub.title || sub.text || '').then(function () {
            showToast('📋 子任务已复制', 'success');
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
          if (!detailTagList || !currentEditingTask) return;
          var currentLabel = getPrimaryTaskLabel(currentEditingTask);
          var currentKey = normalizeLabelKey(currentLabel);
          var html = '';
          TAG_ORDER.forEach(function (meta) {
            var activeClass = meta.key === currentKey ? ' ring-2 ring-primary' : '';
            html += '<button type="button" class="px-3 py-1.5 rounded-full text-xs font-medium inline-flex items-center ' + meta.className + activeClass + '" onclick="window.changeDetailTag(\'' + meta.key + '\')"><i class="fas ' + meta.icon + ' mr-1"></i>' + escapeHtml(meta.label) + '</button>';
          });
          detailTagList.innerHTML = html;
        }

        window.changeDetailTag = function (tagKey) {
          if (!currentEditingTask) return;
          var meta = TAG_META[tagKey] || TAG_META.work;
          currentEditingTask.labels = [meta.label];
          renderDetailTags();
          saveCalendarState();
          renderScheduledTaskList();
          renderActiveCalendarView();
        };

        function setCalendarChromeVisible(visible) {
          var selector = '.unified-top-header-dock, .unified-bottom-tab-dock, header.sticky.top-0, footer.glass-tab';
          document.querySelectorAll(selector).forEach(function (el) {
            if (!visible) {
              if (el.dataset.calendarDetailChromeHidden === '1') return;
              el.dataset.calendarDetailChromeHidden = '1';
              el.style.opacity = '0';
              el.style.visibility = 'hidden';
              el.style.pointerEvents = 'none';
              return;
            }
            if (el.dataset.calendarDetailChromeHidden === '1') {
              el.style.opacity = '';
              el.style.visibility = '';
              el.style.pointerEvents = '';
              delete el.dataset.calendarDetailChromeHidden;
            }
          });
        }

        function closeTaskDetailModal() {
          if (detailPanel) detailPanel.classList.add('hidden');
          currentEditingTask = null;
          selectedTaskId = null;
          document.body.classList.remove('task-modal-open');
          closeDetailDatetimePanel();
          setCalendarChromeVisible(true);
        }

        function generateId(prefix) {
          return prefix + '_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
        }

        function getDateKey(date) {
          var d = new Date(date);
          return [d.getFullYear(), (d.getMonth() + 1).toString().padStart(2, '0'), d.getDate().toString().padStart(2, '0')].join('-');
        }

        function formatMonthTitle(date) {
          return ''.concat(date.getFullYear(), '年', date.getMonth() + 1, '月');
        }

        function formatWeekRange(date) {
          var d = new Date(date);
          var day = d.getDay();
          var monday = new Date(d);
          monday.setDate(monday.getDate() - ((day + 6) % 7));
          var sunday = new Date(monday);
          sunday.setDate(monday.getDate() + 6);
          return ''.concat(monday.getFullYear(), '年', monday.getMonth() + 1, '月', monday.getDate(), '日 - ', sunday.getFullYear(), '年', sunday.getMonth() + 1, '月', sunday.getDate(), '日');
        }

        function formatDayTitle(date) {
          var d = new Date(date);
          var dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
          return ''.concat(d.getFullYear(), '年', d.getMonth() + 1, '月', d.getDate(), '日 ', dayNames[d.getDay()]);
        }

        function ensureValidDate(value, fallback) {
          var d = value instanceof Date ? new Date(value.getTime()) : new Date(value);
          if (isNaN(d.getTime())) return fallback instanceof Date ? new Date(fallback.getTime()) : new Date();
          return d;
        }

        function ensureCalendarSelectedDate() {
          calendarState.selectedDate = ensureValidDate(calendarState.selectedDate, new Date());
          return calendarState.selectedDate;
        }

        var TAG_META = {
          work: { key: 'work', label: '工作', className: 'tag-work', dotClass: 'bg-task-work', icon: 'fa-briefcase' },
          study: { key: 'study', label: '学习', className: 'tag-study', dotClass: 'bg-task-study', icon: 'fa-book' },
          life: { key: 'life', label: '生活', className: 'tag-life', dotClass: 'bg-task-life', icon: 'fa-home' },
          health: { key: 'health', label: '健康', className: 'tag-health', dotClass: 'bg-task-health', icon: 'fa-heart' }
        };
        var TAG_ORDER = [TAG_META.work, TAG_META.study, TAG_META.life, TAG_META.health];

        function normalizeLabelKey(label) {
          var t = String(label == null ? '' : label).trim().toLowerCase();
          if (t === '工作' || t === 'work') return 'work';
          if (t === '学习' || t === 'study') return 'study';
          if (t === '生活' || t === 'life') return 'life';
          if (t === '健康' || t === 'health') return 'health';
          return 'work';
        }

        function getTagMeta(label) {
          var key = normalizeLabelKey(label);
          return TAG_META[key] || TAG_META.work;
        }

        function normalizeTaskLabels(task) {
          if (!task) return ['工作'];
          var labels = parseTags(task.labels || task.tags || task.tag || []);
          if (!labels.length) labels = ['工作'];
          task.labels = labels;
          return labels;
        }

        function getDayColor(task) {
          var labels = normalizeTaskLabels(task);
          return getTagMeta(labels[0]).dotClass;
        }

        function formatDisplayDate(iso) {
          if (!iso) return '未设置日期';
          try {
            var d = new Date(iso);
            if (isNaN(d.getTime())) return '未设置日期';
            var opts = { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' };
            return d.toLocaleString('zh-CN', opts).replace(/\//g, '-');
          } catch (e) { return '未设置日期'; }
        }

        function getTagClass(tag) {
          return getTagMeta(tag).className;
        }

        function getTagIcon(tag) {
          return getTagMeta(tag).icon;
        }

        function isSameDay(date1, date2) {
          return date1.getFullYear() === date2.getFullYear() &&
                 date1.getMonth() === date2.getMonth() &&
                 date1.getDate() === date2.getDate();
        }

        function animateMonthGrid(direction) {
          if (!monthGrid || (direction !== 'prev' && direction !== 'next')) return;
          monthGrid.classList.remove('month-grid-anim-left', 'month-grid-anim-right');
          void monthGrid.offsetWidth;
          monthGrid.classList.add(direction === 'prev' ? 'month-grid-anim-right' : 'month-grid-anim-left');
          setTimeout(function () {
            monthGrid.classList.remove('month-grid-anim-left', 'month-grid-anim-right');
          }, 380);
        }

        function getPrimaryTaskLabel(task) {
          var labels = normalizeTaskLabels(task);
          return labels[0] || '工作';
        }

        function isTaskInActiveCategory(task) {
          if (activeCategory === 'all') return true;
          return taskMatchesActiveCategoryFast(task);
        }

        function getFilteredTasks(tasks) {
          return (tasks || []).filter(function (t) {
            return !!t && isTaskInActiveCategory(t);
          });
        }

        function invalidateCalendarTaskMapCache() {
          calendarTaskMapCache = null;
          calendarTaskMapCacheCategory = '';
          calendarTaskMapCacheTaskCount = -1;
          dayViewRenderToken += 1;
        }

        function saveCalendarState() {
          invalidateCalendarTaskMapCache();
          AppState.save();
        }

        function resolveTaskPrimaryLabelKeyFast(task) {
          if (!task) return 'work';
          var raw = null;
          if (Array.isArray(task.labels)) raw = task.labels[0];
          else if (task.label != null) raw = task.label;
          else if (task.tag != null) raw = task.tag;
          else if (Array.isArray(task.tags)) raw = task.tags[0];
          else raw = task.tags;

          if (raw == null) return 'work';
          if (typeof raw === 'string') {
            var text = raw.trim();
            if (!text) return 'work';
            var firstChar = text.charAt(0);
            if (firstChar === '[' || firstChar === '{') {
              try {
                var parsed = JSON.parse(text);
                if (Array.isArray(parsed) && parsed.length) return normalizeLabelKey(parsed[0]);
                if (parsed && typeof parsed === 'object') {
                  var vals = Object.values(parsed);
                  if (vals.length) return normalizeLabelKey(vals[0]);
                }
              } catch (e) {}
            }
            return normalizeLabelKey(text);
          }
          if (Array.isArray(raw) && raw.length) return normalizeLabelKey(raw[0]);
          if (raw && typeof raw === 'object') {
            var keys = Object.values(raw);
            if (keys.length) return normalizeLabelKey(keys[0]);
          }
          return normalizeLabelKey(String(raw));
        }

        function taskMatchesActiveCategoryFast(task) {
          if (activeCategory === 'all') return true;
          return resolveTaskPrimaryLabelKeyFast(task) === activeCategory;
        }

        function collectRenderableCalendarTasks(tasks) {
          var limited = [];
          var source = tasks || [];
          for (var i = 0; i < source.length; i++) {
            var task = source[i];
            if (!task || !task.dueAt) continue;
            if (!taskMatchesActiveCategoryFast(task)) continue;
            var due = new Date(task.dueAt);
            if (isNaN(due.getTime())) continue;
            limited.push(task);
            if (limited.length >= CALENDAR_RENDER_TASK_LIMIT) {
              if (!calendarTaskOverflowWarned) {
                calendarTaskOverflowWarned = true;
                showToast('任务较多，已优先渲染最近 ' + CALENDAR_RENDER_TASK_LIMIT + ' 条，避免页面卡顿', 'warning');
              }
              break;
            }
          }
          return limited;
        }

        function getTasksByDueDateCached() {
          var taskCount = Array.isArray(AppState.tasks) ? AppState.tasks.length : 0;
          if (
            calendarTaskMapCache &&
            calendarTaskMapCacheCategory === activeCategory &&
            calendarTaskMapCacheTaskCount === taskCount
          ) {
            return calendarTaskMapCache;
          }
          var tasks = collectRenderableCalendarTasks(AppState.tasks || []);
          calendarTaskMapCache = {
            tasks: tasks,
            map: buildTasksByDueDateMap(tasks)
          };
          calendarTaskMapCacheCategory = activeCategory;
          calendarTaskMapCacheTaskCount = taskCount;
          return calendarTaskMapCache;
        }

        function buildTasksByDueDateMap(tasks) {
          var map = Object.create(null);
          (tasks || []).forEach(function (task) {
            if (!task || !task.dueAt) return;
            var key = getDateKey(task.dueAt);
            if (!map[key]) map[key] = [];
            map[key].push(task);
          });
          return map;
        }

        function renderCategoryChips() {
          categoryChips.forEach(function (chip) {
            var key = chip.getAttribute('data-category') || 'all';
            if (key === activeCategory) chip.classList.add('active');
            else chip.classList.remove('active');
          });
        }

        function sortTaskPoolItems(a, b) {
          if (a.dueAt && b.dueAt) return new Date(a.dueAt) - new Date(b.dueAt);
          if (a.dueAt && !b.dueAt) return -1;
          if (!a.dueAt && b.dueAt) return 1;
          return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
        }

        function openCreateTaskForDate(date) {
          var d = ensureValidDate(date, new Date());
          var dateValue = toDateValueYMD(d);
          var targetUrl = '待办页面.html?openModal=new-task&prefillDate=' + encodeURIComponent(dateValue);
          if (typeof safeNavigate === 'function') safeNavigate(targetUrl);
          else window.location.href = targetUrl;
        }

        function getSelectedDateTasks() {
          var selected = ensureCalendarSelectedDate();
          var key = getDateKey(selected);
          var tasksByDate = getTasksByDueDateCached().map;
          var list = (tasksByDate[key] || []).slice();

          if (selectedDaySortMode === 'priority') {
            var order = { high: 1, medium: 2, low: 3 };
            list.sort(function (a, b) {
              return (order[a.priority] || 4) - (order[b.priority] || 4);
            });
            return list;
          }

          if (selectedDaySortMode === 'label') {
            list.sort(function (a, b) {
              return String(getPrimaryTaskLabel(a)).localeCompare(String(getPrimaryTaskLabel(b)));
            });
            return list;
          }

          list.sort(function (a, b) {
            if (!a.dueAt) return 1;
            if (!b.dueAt) return -1;
            return new Date(a.dueAt) - new Date(b.dueAt);
          });
          return list;
        }

        function renderSelectedDayTaskList() {
          var titleEl = document.getElementById('selected-day-title');
          var listEl = document.getElementById('selected-day-task-list');
          var emptyEl = document.getElementById('selected-day-empty');
          var batchEl = document.getElementById('selected-day-batch-actions');
          var batchTipEl = document.getElementById('selected-day-batch-tip');
          if (!listEl || !emptyEl) return;

          var selected = ensureCalendarSelectedDate();
          var addTaskBtnTop = document.getElementById('add-task-btn');
          if (addTaskBtnTop) {
            addTaskBtnTop.setAttribute('href', '待办页面.html?prefillDate=' + encodeURIComponent(toDateValueYMD(selected)));
          }
          if (titleEl) titleEl.textContent = formatDayTitle(selected) + ' · 任务';

          var tasks = getSelectedDateTasks();
          selectedDayBatchIds = selectedDayBatchIds.filter(function (id) {
            return tasks.some(function (t) { return String(t.id) === String(id); });
          });

          if (!tasks.length) {
            listEl.innerHTML = '';
            emptyEl.classList.remove('hidden');
            if (batchEl) batchEl.classList.add('hidden');
            return;
          }

          emptyEl.classList.add('hidden');
          if (batchEl) {
            if (selectedDayMultiMode) batchEl.classList.remove('hidden');
            else batchEl.classList.add('hidden');
          }
          if (batchTipEl) batchTipEl.textContent = selectedDayBatchIds.length ? ('已选择 ' + selectedDayBatchIds.length + ' 项') : '请选择任务';

          var html = tasks.map(function (task) {
            var selectedClass = selectedDayBatchIds.indexOf(String(task.id)) > -1 ? ' ring-2 ring-primary/35' : '';
            var doneClass = task.status === 'completed' ? ' done' : '';
            var checked = task.status === 'completed' ? 'checked' : '';
            var multiBox = selectedDayMultiMode
              ? ('<input class="selected-day-multi mr-2" type="checkbox" data-task-id="' + String(task.id) + '" ' + (selectedDayBatchIds.indexOf(String(task.id)) > -1 ? 'checked' : '') + ' />')
              : '';
            return '<div class="calendar-task-item' + doneClass + selectedClass + ' p-3" data-task-id="' + String(task.id) + '">' +
              '<div class="flex items-start justify-between gap-2">' +
                '<div class="min-w-0 flex-1">' +
                  '<div class="flex items-center text-sm font-medium text-gray-800">' + multiBox + escapeHtml(task.title || '未命名任务') + '</div>' +
                  '<div class="text-xs text-gray-500 mt-1">' + escapeHtml(task.description || '无描述') + '</div>' +
                  '<div class="text-xs text-gray-500 mt-1"><i class="fas fa-clock mr-1 text-primary"></i>' + formatDisplayDate(task.dueAt) + '</div>' +
                '</div>' +
                '<div class="flex items-center gap-2">' +
                  '<button class="task-complete-btn btn-glass text-xs px-2 py-1" data-task-id="' + String(task.id) + '"><input type="checkbox" ' + checked + ' /></button>' +
                  '<button class="task-edit-btn btn-glass text-xs px-2 py-1" data-task-id="' + String(task.id) + '"><i class="fas fa-pen"></i></button>' +
                  '<button class="task-delete-btn btn-glass text-xs px-2 py-1 text-danger" data-task-id="' + String(task.id) + '"><i class="fas fa-trash"></i></button>' +
                '</div>' +
              '</div>' +
            '</div>';
          }).join('');

          listEl.innerHTML = html;
        }

        function renderTaskPool() {
          if (!taskPool) return;

          var poolTasks = getFilteredTasks((AppState.tasks || []).filter(function (t) {
            return t && t.status !== 'completed' && !t.dueAt;
          })).sort(sortTaskPoolItems).slice(0, 18);

          if (poolTasks.length === 0) {
            taskPool.className = 'space-y-2';
            taskPool.innerHTML = '<div class="calendar-empty p-4 text-center">' +
              '<div class="text-sm text-gray-600 mb-2">暂无待办任务，点击添加开始规划</div>' +
              '<button class="calendar-empty-cta btn-primary px-4 py-2 text-sm" id="task-pool-empty-add">添加任务</button>' +
              '</div>';
            var poolAddBtn = document.getElementById('task-pool-empty-add');
            if (poolAddBtn) {
              poolAddBtn.addEventListener('click', function () {
                openCreateTaskForDate(calendarState.selectedDate);
              });
            }
            return;
          }

          taskPool.className = taskPoolView === 'list' ? 'space-y-3' : 'grid grid-cols-1 md:grid-cols-2 gap-3';
          taskPool.innerHTML = '';

          poolTasks.forEach(function (task) {
            var label = getPrimaryTaskLabel(task);
            var tagClass = getTagClass(label);
            var dueText = formatDisplayDate(task.dueAt);
            var item = document.createElement('div');

            if (taskPoolView === 'list') {
              item.className = 'task-pool-item p-3 rounded-2xl border border-gray-200/90 bg-white/75 hover:bg-white/90 hover:border-primary/35 transition-all duration-300 cursor-pointer';
              item.innerHTML = '<div class="flex items-start justify-between gap-2">' +
                '<div class="min-w-0">' +
                '<div class="text-sm font-medium text-gray-800 truncate">' + (task.title || '未命名任务') + '</div>' +
                '<div class="mt-1 text-xs text-gray-500 truncate">' + (task.description || '拖拽到日历日期即可排程') + '</div>' +
                '</div>' +
                '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ' + tagClass + '">' + label + '</span>' +
                '</div>' +
                '<div class="mt-2 text-xs text-gray-500 flex items-center"><i class="fas fa-clock mr-1 text-primary"></i>' + dueText + '</div>';
            } else {
              item.className = 'task-pool-item glass-card rounded-2xl p-3 border border-white/55 hover:border-primary/35 card-hover cursor-pointer';
              item.innerHTML = '<div class="text-sm font-semibold text-gray-800 truncate">' + (task.title || '未命名任务') + '</div>' +
                '<div class="mt-1.5 text-xs text-gray-500 min-h-[2.5rem] overflow-hidden">' + (task.description || '拖拽到日历日期即可排程') + '</div>' +
                '<div class="mt-2 flex items-center justify-between">' +
                '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ' + tagClass + '">' + label + '</span>' +
                '<span class="text-xs text-gray-500"><i class="fas fa-clock mr-1 text-primary"></i>' + dueText + '</span>' +
                '</div>';
            }

            item.draggable = true;
            item.dataset.taskId = String(task.id || '');
            item.addEventListener('dragstart', function (e) {
              e.dataTransfer.setData('task-id', String(task.id || ''));
              e.dataTransfer.effectAllowed = 'move';
            });
            item.addEventListener('click', function () {
              openTaskDetail(task);
            });
            taskPool.appendChild(item);
          });
        }

        function buildAiScheduleCandidates() {
          var pendingTasks = (AppState.tasks || []).filter(function (t) {
            return t && String(t.status || '').toLowerCase() !== 'completed';
          });

          var unscheduled = pendingTasks.filter(function (t) { return !t.dueAt; });
          var source = unscheduled.length ? unscheduled : pendingTasks;

          if (aiScheduleStatus) {
            aiScheduleStatus.textContent = unscheduled.length
              ? '优先为未排程任务分配日期时间'
              : '未发现未排程任务，将智能重排现有任务时间';
          }

          return source.slice(0, 12).map(function (t) {
            return {
              id: String(t.id || ''),
              title: t.title || '',
              priority: t.priority || 'medium',
              dueAt: t.dueAt || null,
              estimate: Number(t.estimate || 0),
              labels: Array.isArray(t.labels) ? t.labels : []
            };
          });
        }

        function toIsoFromDateAndTime(dateValue, timeValue) {
          if (!dateValue) return null;
          var time = normalizeTimeValue(timeValue || '09:00') || '09:00';
          var local = new Date(dateValue + 'T' + time + ':00');
          if (isNaN(local.getTime())) return null;
          return local.toISOString();
        }

        function fallbackSchedule(tasks) {
          var list = Array.isArray(tasks) ? tasks.slice() : [];
          if (!list.length) return [];

          var now = new Date();
          var base = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0, 0);
          var priorityWeight = { high: 0, medium: 1, low: 2 };

          list.sort(function (a, b) {
            var pa = priorityWeight[String((a && a.priority) || 'medium').toLowerCase()];
            var pb = priorityWeight[String((b && b.priority) || 'medium').toLowerCase()];
            if (pa !== pb) return pa - pb;
            return String((a && a.title) || '').localeCompare(String((b && b.title) || ''));
          });

          return list.map(function (task, index) {
            var due = task && task.dueAt ? new Date(task.dueAt) : null;
            var useExisting = due && !isNaN(due.getTime());
            var slot = useExisting ? due : new Date(base.getTime() + index * 90 * 60 * 1000);

            var d = slot.getFullYear() + '-' + String(slot.getMonth() + 1).padStart(2, '0') + '-' + String(slot.getDate()).padStart(2, '0');
            var t = String(slot.getHours()).padStart(2, '0') + ':' + String(slot.getMinutes()).padStart(2, '0');

            return {
              id: String((task && task.id) || ''),
              date: d,
              time: t,
              reason: useExisting ? '保留原时间并微调优先级' : '按优先级自动分配时间'
            };
          });
        }

        function applyAiSchedulePlan(plans) {
          var entries = Array.isArray(plans) ? plans : [];
          if (!entries.length) return Promise.resolve(0);

          var changed = 0;
          entries.forEach(function (plan) {
            if (!plan) return;
            var id = String(plan.id || '').trim();
            if (!id) return;

            var task = (AppState.tasks || []).find(function (t) {
              return String((t && t.id) || '') === id;
            });
            if (!task) return;

            var nextIso = toIsoFromDateAndTime(plan.date, plan.time);
            if (!nextIso) return;

            if (String(task.dueAt || '') !== String(nextIso)) {
              task.dueAt = nextIso;
              changed += 1;
            }
          });

          if (changed > 0) {
            saveCalendarState();
            renderScheduledTaskList();
            renderActiveCalendarView();
          }
          return Promise.resolve(changed);
        }

        function requestAiSchedule(tasks) {
          function parseAiJson(content) {
            var text = String(content || '').trim();
            if (!text) throw new Error('ai-empty-content');
            var fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
            if (fence && fence[1]) text = fence[1].trim();
            return JSON.parse(text);
          }

          var today = new Date();
          var userPrompt = [
            '你是任务排程助手。请为以下待办任务安排未来7天内的日期和时间。',
            '要求：高优先级尽量安排在前两天；时间使用24小时制；返回纯JSON，不要解释。',
            'JSON格式：{"plans":[{"id":"任务id","date":"YYYY-MM-DD","time":"HH:mm","reason":"一句话"}],"tips":["建议1","建议2"]}',
            '今天日期：' + today.toISOString().slice(0, 10),
            '任务列表：' + JSON.stringify(tasks)
          ].join('\n');

          var aiPromise = apiRequest('/api/ai/chat', {
            method: 'POST',
            timeoutMs: 10000,
            body: JSON.stringify({
              temperature: 0.3,
              maxTokens: 1000,
              messages: [
                { role: 'system', content: '你是严谨的任务排程助手，只返回合法JSON。' },
                { role: 'user', content: userPrompt }
              ]
            })
          }).then(function (resp) {
            if (!(resp && resp.status === 200 && resp.body && resp.body.code === 200 && resp.body.data && resp.body.data.content)) {
              throw new Error((resp && resp.body && resp.body.message) || 'ai-backend-failed');
            }
            var parsed = parseAiJson(resp.body.data.content);
            return Array.isArray(parsed.plans) ? parsed : { plans: [], tips: [] };
          });

          return Promise.race([
            aiPromise,
            new Promise(function (_, reject) {
              setTimeout(function () { reject(new Error('ai-timeout')); }, 10000);
            })
          ]);
        }

        function renderScheduledTaskList() {
          var list = document.getElementById('scheduled-task-list');
          if (!list) return;
          var tasks = collectRenderableCalendarTasks(AppState.tasks || []).sort(function (a, b) {
            return new Date(a.dueAt) - new Date(b.dueAt);
          }).slice(0, 10);

          if (tasks.length === 0) {
            list.innerHTML = '<div class="calendar-empty p-4 text-center">' +
              '<div class="text-sm text-gray-600 mb-2">还没有安排任务，去添加并安排时间吧</div>' +
              '<button class="calendar-empty-cta btn-glass px-4 py-2 text-sm" id="scheduled-empty-add">去添加任务</button>' +
              '</div>';
            var addScheduledBtn = document.getElementById('scheduled-empty-add');
            if (addScheduledBtn) {
              addScheduledBtn.addEventListener('click', function () {
                openCreateTaskForDate(calendarState.selectedDate);
              });
            }
            return;
          }

          list.innerHTML = '';
          tasks.forEach(function (task) {
            var item = document.createElement('div');
            item.className = 'p-2.5 rounded-xl border border-gray-200 hover:border-primary hover:bg-primary/5 cursor-pointer transition-all duration-300 scale-in';
            item.innerHTML = '<div class="flex justify-between items-center"><div class="text-sm font-medium text-gray-700">' + (task.title || '未命名任务') + '</div><div class="text-xs text-gray-500">' + formatDisplayDate(task.dueAt) + '</div></div><div class="text-xs mt-1"><span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ' + (task.labels && task.labels[0] ? getTagClass(task.labels[0]) : 'tag-work') + '"> ' + (task.labels && task.labels[0] ? task.labels[0] : '工作') + ' </span></div>';
            item.addEventListener('click', function () {
              var due = new Date(task.dueAt || new Date());
              monthDate = new Date(due.getFullYear(), due.getMonth(), 1);
              calendarState.selectedDate = due;
              switchToView('month');
              renderMonthGrid();
              showToast('已定位到 ' + getDateKey(due), 'success');
            });
            list.appendChild(item);
          });
        }

        function renderMonthGrid(navDirection) {
          if (!monthGrid) { renderTaskPool(); return; }
          monthGrid.innerHTML = '';

          var year = monthDate.getFullYear();
          var month = monthDate.getMonth();
          if (monthTitle) monthTitle.textContent = formatMonthTitle(monthDate);

          var first = new Date(year, month, 1);
          var firstWeekday = first.getDay();
          var startOffset = firstWeekday === 0 ? 6 : firstWeekday - 1;
          var startDate = new Date(year, month, 1 - startOffset);
          var tasksByDate = getTasksByDueDateCached().map;

          for (var i = 0; i < 42; i++) {
            var date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            var day = date.getDate();
            var isCurrentMonth = date.getMonth() === month;
            var dateKey = getDateKey(date);
            var dayTasks = tasksByDate[dateKey] || [];

            var cell = document.createElement('div');
            cell.className = 'calendar-cell scale-in';
            if (!isCurrentMonth) {
              cell.classList.add('other-month');
            }
            if (isSameDay(date, new Date())) {
              cell.classList.add('today');
            }
            if (isSameDay(date, calendarState.selectedDate)) {
              cell.classList.add('selected-date-cell', 'date-tap');
            }
            cell.dataset.date = dateKey;
            var completedCount = dayTasks.filter(function (t) { return String(t.status || '').toLowerCase() === 'completed'; }).length;
            if (dayTasks.length > 0 && completedCount === dayTasks.length) {
              cell.classList.add('has-all-completed');
            }
            cell.innerHTML = "<div class='flex justify-between items-start'><span class='font-medium'>" + day + "</span>" +
              (dayTasks.length > 0 ? ("<span class='task-count-badge'>" + dayTasks.length + "</span>") : "") +
              "</div>" + (dayTasks.length > 0 && completedCount === dayTasks.length ? "<div class='text-[10px] text-gray-500 mt-1'><i class='fas fa-check mr-1'></i>已完成</div>" : "");

            var dotContainer = document.createElement('div');
            dotContainer.className = 'mt-1.5 flex flex-wrap gap-1.5';

            dayTasks.slice(0, 4).forEach(function (task) {
              var dot = document.createElement('span');
              dot.className = 'w-2.5 h-2.5 rounded-full shadow-sm ' + getDayColor(task) + ' cursor-pointer hover:scale-125 transition-transform duration-200';
              var timeStr = task.dueAt ? formatDisplayDate(task.dueAt) : '';
              var labels = (task.labels || []).join(', ');
              dot.title = (task.title || '') + (timeStr ? (' — ' + timeStr) : '') + (labels ? (' — ' + labels) : '');
              dot.dataset.taskId = task.id;
              dot.addEventListener('click', function (e) {
                e.stopPropagation();
                openTaskDetail(task);
                showToast('任务详情已打开', 'info');
              });
              dotContainer.appendChild(dot);
            });

            if (dayTasks.length > 4) {
              var more = document.createElement('span');
              more.className = 'text-xs text-gray-400';
              more.textContent = '+' + (dayTasks.length - 4);
              dotContainer.appendChild(more);
            }

            cell.appendChild(dotContainer);
            cell.addEventListener('dragover', function (e) {
              e.preventDefault();
            });
            cell.addEventListener('drop', function (e) {
              e.preventDefault();
              var taskId = e.dataTransfer.getData('task-id');
              if (!taskId) return;
              var task = AppState.tasks.find(function (t) {
                return t.id === taskId;
              });
              if (!task) return;
              task.dueAt = new Date(this.dataset.date + 'T00:00:00').toISOString();
              saveCalendarState();
              showToast('任务已安排到该日', 'success');
              renderMonthGrid();
              renderScheduledTaskList();
              renderWeekView();
              renderDayView();
            });
            cell.addEventListener('click', function () {
              var dateStr = this.dataset.date;
              var picked = new Date(dateStr + 'T00:00:00');
              calendarState.selectedDate = picked;
              renderMonthGrid();
              renderSelectedDayTaskList();
            });

            monthGrid.appendChild(cell);
          }

          if (navDirection === 'prev' || navDirection === 'next') {
            animateMonthGrid(navDirection);
          }
          renderTaskPool();
        }

        function renderWeekView() {
          if (!weekGrid) return;
          weekGrid.innerHTML = '';
          var selected = ensureCalendarSelectedDate();
          var tasksByDate = getTasksByDueDateCached().map;
          
          if (weekTitle) {
            weekTitle.textContent = formatWeekRange(selected);
          }
          
          var d = new Date(selected);
          var day = d.getDay();
          var monday = new Date(d);
          monday.setDate(monday.getDate() - ((day + 6) % 7));
          
          for (var i = 0; i < 7; i++) {
            var date = new Date(monday);
            date.setDate(monday.getDate() + i);
            var dateKey = getDateKey(date);
            var dayTasks = tasksByDate[dateKey] || [];
            
            var cell = document.createElement('div');
            cell.className = 'glass-card rounded-2xl p-3 text-center card-hover scale-in';
            if (isSameDay(date, new Date())) {
              cell.classList.add('ring-2', 'ring-primary/40');
            }
            
            var dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
            cell.innerHTML = '<div class="text-sm font-medium text-gray-500 mb-1.5">' + dayNames[date.getDay()] + '</div>' +
                           '<div class="text-lg font-bold text-gray-800 mb-2.5">' + date.getDate() + '</div>' +
                           '<div class="space-y-1.5"></div>';
            
            var taskContainer = cell.querySelector('[class~="space-y-1.5"]');
            dayTasks.slice(0, 3).forEach(function (task) {
              var taskDiv = document.createElement('div');
              taskDiv.className = 'text-xs p-1.5 rounded-lg ' + getDayColor(task) + ' text-white truncate cursor-pointer hover:scale-105 transition-transform duration-200 shadow-sm';
              taskDiv.textContent = task.title || '未命名';
              taskDiv.title = task.title || '';
              taskDiv.addEventListener('click', function () {
                openTaskDetail(task);
              });
              taskContainer.appendChild(taskDiv);
            });
            
            weekGrid.appendChild(cell);
          }
        }

        function renderDayView() {
          if (!dayGrid) return;
          var renderToken = ++dayViewRenderToken;
          dayGrid.innerHTML = '';
          var selected = ensureCalendarSelectedDate();
          var tasksByDate = getTasksByDueDateCached().map;
          
          if (dayTitle) {
            dayTitle.textContent = formatDayTitle(selected);
          }
          
          var dateKey = getDateKey(selected);
          var dayTasks = tasksByDate[dateKey] || [];
          
          var timeLabels = document.createElement('div');
          timeLabels.className = 'col-span-2 space-y-4';
          for (var hour = 8; hour <= 22; hour++) {
            var timeDiv = document.createElement('div');
            timeDiv.className = 'text-sm text-gray-500';
            timeDiv.textContent = hour + ':00';
            timeLabels.appendChild(timeDiv);
          }
          dayGrid.appendChild(timeLabels);
          
          var tasksContainer = document.createElement('div');
          tasksContainer.className = 'col-span-10 space-y-2';

          if (!dayTasks.length) {
            tasksContainer.innerHTML = '<div class="rounded-2xl border border-dashed border-primary/25 bg-primary/5 px-4 py-6 text-sm text-gray-500">当天暂无已安排任务</div>';
            dayGrid.appendChild(tasksContainer);
            return;
          }

          var visibleTasks = dayTasks.slice(0, DAY_VIEW_CARD_LIMIT);
          var appendTaskCards = function (startIndex) {
            if (renderToken !== dayViewRenderToken) return;
            var fragment = document.createDocumentFragment();
            var endIndex = Math.min(startIndex + 24, visibleTasks.length);
            for (var i = startIndex; i < endIndex; i++) {
              var task = visibleTasks[i];
              var taskDiv = document.createElement('div');
              taskDiv.className = 'p-3 rounded-xl ' + getDayColor(task) + ' text-white card-hover cursor-pointer shadow-md';
              taskDiv.innerHTML = '<div class="font-medium">' + (task.title || '未命名任务') + '</div>' +
                                '<div class="text-xs mt-1 opacity-80">' + formatDisplayDate(task.dueAt) + '</div>';
              taskDiv.addEventListener('click', function (currentTask) {
                return function () {
                  openTaskDetail(currentTask);
                };
              }(task));
              fragment.appendChild(taskDiv);
            }
            tasksContainer.appendChild(fragment);
            if (endIndex < visibleTasks.length) {
              setTimeout(function () {
                appendTaskCards(endIndex);
              }, 0);
              return;
            }
            if (dayTasks.length > visibleTasks.length) {
              var moreNotice = document.createElement('div');
              moreNotice.className = 'rounded-2xl border border-warning/25 bg-warning/10 px-4 py-3 text-xs text-gray-500';
              moreNotice.textContent = '当天任务较多，已优先展示前 ' + visibleTasks.length + ' 条，避免页面卡顿。';
              tasksContainer.appendChild(moreNotice);
            }
          };
          
          dayGrid.appendChild(tasksContainer);
          appendTaskCards(0);
        }

        function renderActiveCalendarView() {
          if (calendarState.view === 'week') {
            renderWeekView();
            renderSelectedDayTaskList();
            return;
          }
          if (calendarState.view === 'day') {
            renderDayView();
            renderSelectedDayTaskList();
            return;
          }
          renderMonthGrid();
          renderSelectedDayTaskList();
        }

        function openTaskDetail(task) {
          selectedTaskId = task.id;
          currentEditingTask = task;
          ensureTaskSubtasks(currentEditingTask);
          normalizeTaskLabels(currentEditingTask);
          if (detailTitle) detailTitle.value = task.title || '';
          if (detailDescription) detailDescription.value = task.description || '';
          setDetailDatetimeFromValue(toLocalDatetimeValue(task.dueAt || ''));
          renderSubtasks();
          renderDetailTags();
          if (detailPanel) {
            detailPanel.classList.remove('hidden');
            document.body.classList.add('task-modal-open');
            setCalendarChromeVisible(false);
          }
        }

        function switchToView(view) {
          if (isSwitchingView) return;
          isSwitchingView = true;
          calendarState.view = view;
          dayViewRenderToken += 1;
          if (viewSwitchTimer) {
            clearTimeout(viewSwitchTimer);
            viewSwitchTimer = null;
          }

          document.querySelectorAll('.view-btn').forEach(function (b) {
            b.classList.remove('active', 'btn-primary');
            b.classList.add('btn-glass');
          });
          var activeBtn = document.querySelector('.view-btn[data-view="' + view + '"]');
          if (activeBtn) {
            activeBtn.classList.add('active', 'btn-primary');
            activeBtn.classList.remove('btn-glass');
          }

          var viewEl = document.getElementById(view + '-view');
          document.querySelectorAll('.calendar-view').forEach(function (v) {
            v.classList.remove('calendar-view-enter', 'calendar-view-leave');
            if (v !== viewEl) v.classList.add('hidden');
          });

          if (!viewEl) {
            isSwitchingView = false;
            return;
          }
          viewEl.classList.remove('hidden');
          var shouldAnimateSwitch = (Array.isArray(AppState.tasks) ? AppState.tasks.length : 0) < 120;
          if (shouldAnimateSwitch) {
            viewEl.classList.add('calendar-view-enter');
          }

          setTimeout(function () {
            try {
              renderActiveCalendarView();
            } catch (err) {
              console.error('switchToView render error:', err);
              showToast('视图渲染失败，已恢复月视图', 'warning');
              calendarState.view = 'month';
              document.querySelectorAll('.calendar-view').forEach(function (v) {
                v.classList.add('hidden');
              });
              var monthView = document.getElementById('month-view');
              if (monthView) monthView.classList.remove('hidden');
              document.querySelectorAll('.view-btn').forEach(function (b) {
                b.classList.remove('active', 'btn-primary');
                b.classList.add('btn-glass');
              });
              var monthBtn = document.querySelector('.view-btn[data-view="month"]');
              if (monthBtn) {
                monthBtn.classList.add('active', 'btn-primary');
                monthBtn.classList.remove('btn-glass');
              }
            } finally {
              isSwitchingView = false;
            }
          }, 0);

          if (shouldAnimateSwitch) {
            viewSwitchTimer = setTimeout(function () {
              viewEl.classList.remove('calendar-view-enter');
              viewSwitchTimer = null;
            }, 220);
          }
        }

        document.querySelectorAll('.view-btn').forEach(function (btn) {
          btn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            switchToView(btn.dataset.view);
          });
        });

        categoryChips.forEach(function (chip) {
          chip.addEventListener('click', function () {
            activeCategory = chip.getAttribute('data-category') || 'all';
            renderCategoryChips();
            renderTaskPool();
            renderScheduledTaskList();
            renderActiveCalendarView();
            var label = chip.querySelector('.category-chip-label');
            showToast('已筛选：' + (label ? label.textContent : '全部'), 'info');
          });
        });
        renderCategoryChips();

        renderTaskPool();

        function updateCurrentDateLabel() {
          var now = new Date();
          var options = { month: 'long', day: 'numeric', weekday: 'long' };
          var currentDate = document.getElementById('current-date');
          if (currentDate) {
            currentDate.textContent = now.toLocaleDateString('zh-CN', options);
          }
        }

        updateCurrentDateLabel();

        var todayBtn = document.getElementById('today-btn');
        var todayQuickBtn = document.getElementById('today-quick-btn');
        if (todayBtn) {
          todayBtn.addEventListener('click', function () {
            monthDate = new Date();
            monthDate.setDate(1);
            calendarState.selectedDate = new Date();
            switchToView('month');
            renderMonthGrid();
            renderSelectedDayTaskList();
            showToast('已回到今天', 'success');
          });
        }
        if (todayQuickBtn) {
          todayQuickBtn.addEventListener('click', function () {
            monthDate = new Date();
            monthDate.setDate(1);
            calendarState.selectedDate = new Date();
            renderActiveCalendarView();
            showToast('已回到今天', 'success');
          });
        }

        var prevBtn = document.getElementById('month-prev-btn');
        var nextBtn = document.getElementById('month-next-btn');
        if (prevBtn) {
          prevBtn.addEventListener('click', function () {
            monthDate.setMonth(monthDate.getMonth() - 1);
            renderMonthGrid('prev');
            showToast('已切换到上个月', 'info');
          });
        }
        if (nextBtn) {
          nextBtn.addEventListener('click', function () {
            monthDate.setMonth(monthDate.getMonth() + 1);
            renderMonthGrid('next');
            showToast('已切换到下个月', 'info');
          });
        }

        var weekPrevBtn = document.getElementById('week-prev-btn');
        var weekNextBtn = document.getElementById('week-next-btn');
        if (weekPrevBtn) {
          weekPrevBtn.addEventListener('click', function () {
            var d = ensureCalendarSelectedDate();
            d = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7);
            calendarState.selectedDate = d;
            renderWeekView();
            showToast('已切换到上一周', 'info');
          });
        }
        if (weekNextBtn) {
          weekNextBtn.addEventListener('click', function () {
            var d = ensureCalendarSelectedDate();
            d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7);
            calendarState.selectedDate = d;
            renderWeekView();
            showToast('已切换到下一周', 'info');
          });
        }

        var dayPrevBtn = document.getElementById('day-prev-btn');
        var dayNextBtn = document.getElementById('day-next-btn');
        if (dayPrevBtn) {
          dayPrevBtn.addEventListener('click', function () {
            var d = ensureCalendarSelectedDate();
            d = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
            calendarState.selectedDate = d;
            renderDayView();
            showToast('已切换到上一天', 'info');
          });
        }
        if (dayNextBtn) {
          dayNextBtn.addEventListener('click', function () {
            var d = ensureCalendarSelectedDate();
            d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
            calendarState.selectedDate = d;
            renderDayView();
            showToast('已切换到下一天', 'info');
          });
        }

        var scheduledRefresh = document.getElementById('refresh-scheduled-btn');
        if (scheduledRefresh) {
          scheduledRefresh.addEventListener('click', function() {
            renderScheduledTaskList();
            showToast('已刷新已排任务列表', 'success');
          });
        }


        // ✅ 批量完成按钮（仅针对当前多选）
        var batchCompleteBtn = document.getElementById('batch-complete-btn');
        if (batchCompleteBtn) {
          batchCompleteBtn.addEventListener('click', function () {
            if (!selectedDayMultiMode || !selectedDayBatchIds.length) {
              showToast('请先在当日任务中多选', 'warning');
              return;
            }
            var count = 0;
            (AppState.tasks || []).forEach(function (t) {
              if (selectedDayBatchIds.indexOf(String(t.id)) > -1 && t.status !== 'completed') {
                t.status = 'completed';
                count++;
              }
            });
            selectedDayBatchIds = [];
            saveCalendarState();
            renderScheduledTaskList();
            renderActiveCalendarView();
            showToast('已完成 ' + count + ' 个任务', 'success');
          });
        }

        // ✅ 批量删除按钮（仅针对当前多选）
        var batchDeleteBtn = document.getElementById('batch-delete-btn');
        if (batchDeleteBtn) {
          batchDeleteBtn.addEventListener('click', function () {
            if (!selectedDayMultiMode || !selectedDayBatchIds.length) {
              showToast('请先在当日任务中多选', 'warning');
              return;
            }
            var before = (AppState.tasks || []).length;
            AppState.tasks = (AppState.tasks || []).filter(function (t) {
              return selectedDayBatchIds.indexOf(String(t.id)) === -1;
            });
            var deleted = before - AppState.tasks.length;
            selectedDayBatchIds = [];
            saveCalendarState();
            renderScheduledTaskList();
            renderActiveCalendarView();
            showToast('已删除 ' + deleted + ' 个任务', 'success');
          });
        }

        var daySort = document.getElementById('selected-day-sort');
        if (daySort) {
          daySort.addEventListener('change', function () {
            selectedDaySortMode = this.value || 'time';
            renderSelectedDayTaskList();
          });
        }

        var multiToggle = document.getElementById('selected-day-multi-toggle');
        if (multiToggle) {
          multiToggle.addEventListener('click', function () {
            selectedDayMultiMode = !selectedDayMultiMode;
            if (!selectedDayMultiMode) selectedDayBatchIds = [];
            this.textContent = selectedDayMultiMode ? '退出多选' : '多选';
            renderSelectedDayTaskList();
          });
        }

        var selectedDayList = document.getElementById('selected-day-task-list');
        if (selectedDayList) {
          selectedDayList.addEventListener('click', function (e) {
            var completeBtn = e.target.closest('.task-complete-btn');
            var editBtn = e.target.closest('.task-edit-btn');
            var deleteBtn = e.target.closest('.task-delete-btn');
            var multiCb = e.target.closest('.selected-day-multi');

            if (multiCb) {
              var id = String(multiCb.getAttribute('data-task-id') || '');
              if (!id) return;
              if (multiCb.checked && selectedDayBatchIds.indexOf(id) === -1) selectedDayBatchIds.push(id);
              if (!multiCb.checked) selectedDayBatchIds = selectedDayBatchIds.filter(function (x) { return x !== id; });
              renderSelectedDayTaskList();
              return;
            }

            if (completeBtn) {
              var id1 = String(completeBtn.getAttribute('data-task-id') || '');
              var task1 = (AppState.tasks || []).find(function (t) { return String(t.id) === id1; });
              if (!task1) return;
              task1.status = task1.status === 'completed' ? 'pending' : 'completed';
              saveCalendarState();
              renderScheduledTaskList();
              renderActiveCalendarView();
              return;
            }

            if (editBtn) {
              var id2 = String(editBtn.getAttribute('data-task-id') || '');
              var task2 = (AppState.tasks || []).find(function (t) { return String(t.id) === id2; });
              if (task2) openTaskDetail(task2);
              return;
            }

            if (deleteBtn) {
              var id3 = String(deleteBtn.getAttribute('data-task-id') || '');
              AppState.tasks = (AppState.tasks || []).filter(function (t) { return String(t.id) !== id3; });
              saveCalendarState();
              renderScheduledTaskList();
              renderActiveCalendarView();
            }
          });
        }

        var selectedDayEmptyAdd = document.getElementById('selected-day-empty-add');
        if (selectedDayEmptyAdd) {
          selectedDayEmptyAdd.addEventListener('click', function () {
            openCreateTaskForDate(calendarState.selectedDate);
          });
        }

        var calendarFab = document.getElementById('calendar-add-fab');
        if (calendarFab) {
          calendarFab.addEventListener('click', function () {
            openCreateTaskForDate(calendarState.selectedDate);
          });
        }

        function bindSecondaryToggle(toggleId, bodyId) {
          var t = document.getElementById(toggleId);
          var b = document.getElementById(bodyId);
          if (!t || !b) return;
          t.addEventListener('click', function () {
            b.classList.toggle('hidden');
          });
        }
        bindSecondaryToggle('secondary-scheduled-toggle', 'secondary-scheduled-body');
        bindSecondaryToggle('secondary-pool-toggle', 'secondary-pool-body');

        // ✅ 排序下拉列表 - 修复层级问题
        var sortFilterBtn = document.getElementById('sort-filter-btn');
        var sortFilterMenu = document.getElementById('sort-filter-menu');
        var sortFilterArrow = document.getElementById('sort-filter-arrow');
        var sortFilterContainer = sortFilterBtn ? sortFilterBtn.parentElement : null;

        if (sortFilterBtn && sortFilterMenu) {
          sortFilterBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            e.preventDefault();
            
            // 关闭其他下拉菜单
            var otherMenus = document.querySelectorAll('.dropdown-menu');
            otherMenus.forEach(function(menu) {
              if (menu !== sortFilterMenu) {
                menu.classList.remove('show');
              }
            });
            
            sortFilterMenu.classList.toggle('show');
            if (sortFilterArrow) {
              sortFilterArrow.style.transform = sortFilterMenu.classList.contains('show') ? 'rotate(180deg)' : 'rotate(0deg)';
            }
          });

          sortFilterMenu.querySelectorAll('.dropdown-item').forEach(function (item) {
            item.addEventListener('click', function (e) {
              e.stopPropagation();
              e.preventDefault();
              var sortType = this.dataset.sort;
              if (sortType === 'time') {
                AppState.tasks.sort(function (a, b) {
                  if (!a.dueAt) return 1;
                  if (!b.dueAt) return -1;
                  return new Date(a.dueAt) - new Date(b.dueAt);
                });
                showToast('已按时间排序', 'success');

              } else if (sortType === 'priority') {
                var order = { high: 1, medium: 2, low: 3 };
                AppState.tasks.sort(function (a, b) {
                  return (order[a.priority] || 4) - (order[b.priority] || 4);
                });
                showToast('已按优先级排序', 'success');
              } else if (sortType === 'label') {
                AppState.tasks.sort(function (a, b) {
                  var la = (a.labels || [])[0] || '';
                  var lb = (b.labels || [])[0] || '';
                  return la.localeCompare(lb);
                });
                showToast('已按标签排序', 'success');
              }
              saveCalendarState();
              sortFilterMenu.classList.remove('show');
              if (sortFilterArrow) {
                sortFilterArrow.style.transform = 'rotate(0deg)';
              }
              renderScheduledTaskList();
              renderActiveCalendarView();
            });
          });

          document.addEventListener('click', function (e) {
            if (!sortFilterContainer || !sortFilterContainer.contains(e.target)) {
              sortFilterMenu.classList.remove('show');
              if (sortFilterArrow) {
                sortFilterArrow.style.transform = 'rotate(0deg)';
              }
            }
          });
        }

        // ✅ 用户菜单下拉 - 修复黑色边框
        var userMenuBtn = document.getElementById('user-menu-btn');
        var userDropdown = document.getElementById('user-dropdown');
        var userMenuContainer = document.getElementById('user-menu-container');

        if (userMenuBtn && userDropdown) {
          userMenuBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            e.preventDefault();
            userDropdown.classList.toggle('show');
          });

          document.addEventListener('click', function (e) {
            if (!userMenuContainer || !userMenuContainer.contains(e.target)) {
              userDropdown.classList.remove('show');
            }
          });
        }

        if (closeDetailBtn) {
          closeDetailBtn.addEventListener('click', function () {
            closeTaskDetailModal();
          });
        }

        if (cancelBtn) {
          cancelBtn.addEventListener('click', function () {
            closeTaskDetailModal();
          });
        }

        if (detailPanel) {
          detailPanel.addEventListener('click', function (e) {
            if (e.target === detailPanel) closeTaskDetailModal();
          });
        }

        document.addEventListener('keydown', function (e) {
          if (e.key === 'Escape' && detailPanel && !detailPanel.classList.contains('hidden')) {
            closeTaskDetailModal();
          }
        });

        if (saveBtn) {
          saveBtn.addEventListener('click', function () {
            if (!selectedTaskId) {
              showToast('未选择任务', 'warning');
              return;
            }

            var task = (AppState.tasks || []).find(function (t) {
              return String(t.id) === String(selectedTaskId);
            });
            if (!task) {
              showToast('任务不存在或已删除', 'error');
              return;
            }
            currentEditingTask = task;
            ensureTaskSubtasks(currentEditingTask);
            normalizeTaskLabels(currentEditingTask);
            var selectedLabels = (currentEditingTask.labels && currentEditingTask.labels.length ? currentEditingTask.labels.slice() : ['工作']);

            var payload = {
              title: detailTitle ? detailTitle.value.trim() : task.title,
              description: detailDescription ? detailDescription.value.trim() : task.description,
              dueAt: detailDueAt && detailDueAt.value ? new Date(detailDueAt.value).toISOString() : null,
              labels: selectedLabels,
              tags: selectedLabels,
              tag: selectedLabels[0] || '工作'
            };

            updateCalendarTaskOnServer(selectedTaskId, payload).then(function (updated) {
              task.title = payload.title || task.title;
              task.description = payload.description || task.description;
              task.dueAt = payload.dueAt;
              task.labels = selectedLabels;
              if (updated && updated.status) task.status = updated.status;
              ensureTaskSubtasks(task);
              saveCalendarState();
              renderScheduledTaskList();
              renderActiveCalendarView();
              closeTaskDetailModal();
              showToast('任务已保存', 'success');
            }).catch(function (err) {
              console.error('save calendar task error', err);
              showToast((err && err.message) || '保存任务失败', 'error');
            });
          });
        }

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
            toggleDatetimeSelectMenu(detailTimeShell, detailTimeMenu, false);
            toggleDatetimeSelectMenu(detailDateShell, detailDateMenu);
          });
        }
        if (detailTimeTrigger) {
          detailTimeTrigger.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            renderDetailTimeMenu();
            toggleDatetimeSelectMenu(detailDateShell, detailDateMenu, false);
            toggleDatetimeSelectMenu(detailTimeShell, detailTimeMenu);
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
              toggleDatetimeSelectMenu(detailDateShell, detailDateMenu, false);
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
              toggleDatetimeSelectMenu(detailDateShell, detailDateMenu, false);
              return;
            }
            if (action === 'clear-date') {
              if (detailDateInput) detailDateInput.value = '';
              updateDetailDatetimeFromSplitInputs();
              toggleDatetimeSelectMenu(detailDateShell, detailDateMenu, false);
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
              toggleDatetimeSelectMenu(detailTimeShell, detailTimeMenu, false);
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
              toggleDatetimeSelectMenu(detailTimeShell, detailTimeMenu, false);
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
              toggleDatetimeSelectMenu(detailTimeShell, detailTimeMenu, false);
            }
          });
        }
        if (quickTodayBtn) quickTodayBtn.addEventListener('click', function () { applyQuickDueDate('today'); });
        if (quickTomorrowBtn) quickTomorrowBtn.addEventListener('click', function () { applyQuickDueDate('tomorrow'); });
        if (quickClearBtn) quickClearBtn.addEventListener('click', function () { applyQuickDueDate('clear'); });

        document.addEventListener('click', function (e) {
          if (detailDatetimeShell && !detailDatetimeShell.contains(e.target)) {
            closeDetailDatetimePanel();
            return;
          }
          if (detailDateShell && !detailDateShell.contains(e.target)) toggleDatetimeSelectMenu(detailDateShell, detailDateMenu, false);
          if (detailTimeShell && !detailTimeShell.contains(e.target)) toggleDatetimeSelectMenu(detailTimeShell, detailTimeMenu, false);
        });

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
            ensureTaskSubtasks(currentEditingTask);
            var text = normalizeSubtaskText(newSubtaskInput.value);
            if (!text) {
              showToast('请输入子任务内容', 'warning');
              return;
            }
            if (text.length > 60) {
              showToast('子任务最多 60 个字符', 'warning');
              return;
            }
            if (hasDuplicateSubtask(currentEditingTask, text)) {
              showToast('该子任务已存在', 'warning');
              return;
            }
            currentEditingTask.subtasks.push({ title: text, completed: false });
            setSubtaskSubmitting(true);
            syncCurrentSubtasksToServer().then(function () {
              renderSubtasks();
              renderScheduledTaskList();
              renderActiveCalendarView();
              newSubtaskInput.value = '';
              showToast('✅ 子任务已添加', 'success');
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

        if (completeAllSubtasksBtn) {
          completeAllSubtasksBtn.addEventListener('click', function () {
            if (!currentEditingTask) return;
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
              renderScheduledTaskList();
              renderActiveCalendarView();
              showToast('✅ 所有子任务已标记完成', 'success');
            }).catch(function (err) {
              console.error(err);
              currentEditingTask.subtasks.forEach(function (s, idx) { s.completed = !!backup[idx]; });
              renderSubtasks();
              showToast('批量更新子任务失败', 'error');
            });
          });
        }

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
              showToast('📋 子任务列表已复制', 'success');
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

        if (shareTaskBtn) {
          shareTaskBtn.addEventListener('click', function () {
            if (!currentEditingTask) return;
            shareOrCopyText(buildTaskExportText(currentEditingTask), '📤 任务已分享').catch(function () {
              showToast('分享任务失败', 'error');
            });
          });
        }

        if (copyTaskBtn) {
          copyTaskBtn.addEventListener('click', function () {
            if (!currentEditingTask) return;
            copyTextToClipboard(buildTaskExportText(currentEditingTask)).then(function () {
              showToast('📋 任务内容已复制', 'success');
            }).catch(function () {
              showToast('复制任务失败', 'error');
            });
          });
        }

        if (deleteTaskBtn) {
          deleteTaskBtn.addEventListener('click', function () {
            if (!currentEditingTask || !selectedTaskId) return;
            if (!confirm('确定要删除当前任务吗？')) return;
            deleteCalendarTaskOnServer(selectedTaskId).then(function () {
              AppState.tasks = (AppState.tasks || []).filter(function (t) {
                return String(t.id) !== String(selectedTaskId);
              });
              saveCalendarState();
              closeTaskDetailModal();
              renderScheduledTaskList();
              renderActiveCalendarView();
              showToast('🗑️ 任务已删除', 'success');
            }).catch(function (err) {
              console.error('delete calendar task error', err);
              showToast((err && err.message) || '删除任务失败', 'error');
            });
          });
        }

        window.renderMonthGrid = renderMonthGrid;

        // ✅ 监听其他页面的 AppState 更新（跨页面同步）
        window.addEventListener('appstate-updated', function (e) {
          invalidateCalendarTaskMapCache();
          renderScheduledTaskList();
          renderActiveCalendarView();
          showToast('📅 任务列表已刷新', 'info');
        }, false);

        if (aiScheduleBtn) {
          aiScheduleBtn.addEventListener('click', function () {
            var tasks = buildAiScheduleCandidates();
            if (!tasks.length) {
              showToast('暂无未排程任务', 'info');
              return;
            }

            aiScheduleBtn.disabled = true;
            if (aiScheduleStatus) aiScheduleStatus.textContent = '已本地预排程，AI 优化中...';

            var localPlans = fallbackSchedule(tasks);
            applyAiSchedulePlan(localPlans).then(function (changed) {
              if (aiScheduleStatus) {
                aiScheduleStatus.textContent = changed > 0
                  ? ('已预排程 ' + changed + ' 个任务，等待 AI 优化')
                  : '未生成可应用的预排程结果';
              }
            });

            requestAiSchedule(tasks).then(function (result) {
              return applyAiSchedulePlan(result.plans).then(function (changed) {
                if (aiScheduleStatus) {
                  aiScheduleStatus.textContent = changed > 0
                    ? ('AI 优化完成：' + changed + ' 个任务')
                    : 'AI 未返回可应用排程，已保留预排程结果';
                }
                showToast(changed > 0 ? ('AI 优化完成：' + changed + ' 个任务') : 'AI 未返回可用排程', changed > 0 ? 'success' : 'warning');
              });
            }).catch(function () {
              showToast('AI 不可用，已保留本地预排程结果', 'warning');
            }).finally(function () {
              aiScheduleBtn.disabled = false;
            });
          });
        }
        
        // ✅ 从后端加载任务
        function parseTags(tags) {
          if (!tags && tags !== '') return [];
          if (Array.isArray(tags)) return tags.map(String).map(function(s){ return s.trim(); }).filter(Boolean);
          if (typeof tags === 'object' && tags !== null) {
            try {
              return Object.values(tags).map(String).map(function(s){ return s.trim(); }).filter(Boolean);
            } catch (e) { return []; }
          }
          if (typeof tags === 'string') {
            var raw = tags.trim();
            if (raw === '') return [];
            try {
              var parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) return parsed.map(String).map(function(s){ return s.trim(); }).filter(Boolean);
              if (typeof parsed === 'object' && parsed !== null) return Object.values(parsed).map(String).map(function(s){ return s.trim(); }).filter(Boolean);
            } catch (e) {}
            return raw.split(/[;,|]/).map(function(s){ return s.trim(); }).filter(Boolean);
          }
          return [];
        }

        Promise.resolve().then(function() {
          return fetchCalendarTasksFromServer();
        }).catch(function(err){
          console.warn('fetchCalendarTasksFromServer error', err);
          showToast('任务同步失败，已展示本地缓存', 'warning');
        }).finally(function(){
          renderScheduledTaskList();
          renderActiveCalendarView();
        });
      });
    

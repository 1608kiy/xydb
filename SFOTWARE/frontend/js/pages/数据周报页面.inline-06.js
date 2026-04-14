
      // ✅ Toast 提示函数
      function showToast(message, type) {
        if (window.__unifiedShowToast) {
          window.__unifiedShowToast(message, type || 'success');
        }
      }

      // ✅ 时间范围下拉列表控制函数
      function toggleTimeRangeDropdown() {
        const dropdown = document.getElementById('time-range-dropdown');
        const arrow = document.getElementById('time-range-arrow');
        const trigger = dropdown.previousElementSibling;
        const isActive = dropdown.classList.contains('show');
        
        // 关闭所有其他下拉菜单
        document.querySelectorAll('.custom-select-dropdown').forEach(d => {
          if (d.id !== 'time-range-dropdown') {
            d.classList.remove('show');
            d.previousElementSibling.classList.remove('active');
            d.querySelector('.custom-select-arrow')?.classList.remove('rotate');
          }
        });
        
        if (!isActive) {
          dropdown.classList.add('show');
          trigger.classList.add('active');
          arrow.classList.add('rotate');
        } else {
          dropdown.classList.remove('show');
          trigger.classList.remove('active');
          arrow.classList.remove('rotate');
        }
      }

      function selectTimeRange(value, element) {
        var textEl = document.getElementById('time-range-text');
        if (textEl) textEl.textContent = (value === '自定义' ? '近30天' : value);

        document.querySelectorAll('#time-range-dropdown .custom-select-option').forEach(function (opt) {
          opt.classList.remove('selected');
        });
        if (element) element.classList.add('selected');

        var dropdown = document.getElementById('time-range-dropdown');
        var arrow = document.getElementById('time-range-arrow');
        var trigger = dropdown ? dropdown.previousElementSibling : null;
        if (dropdown) dropdown.classList.remove('show');
        if (trigger) trigger.classList.remove('active');
        if (arrow) arrow.classList.remove('rotate');

        try { localStorage.setItem('report-time-range', value); } catch (e) {}

        if (value === '自定义') {
          showToast('已切换到近30天数据视图');
        } else {
          showToast('已切换到 ' + value + ' 数据视图');
        }
        updateWeeklyStats({ sync: false });
      }

      function syncTimeRangeTabs(selected) {
        var tabs = document.querySelectorAll('#report-range-tabs [data-range]');
        tabs.forEach(function (btn) {
          var active = (btn.getAttribute('data-range') || '') === selected;
          btn.classList.toggle('bg-primary', active);
          btn.classList.toggle('text-white', active);
          btn.classList.toggle('bg-white/70', !active);
          btn.classList.toggle('text-gray-600', !active);
          btn.classList.toggle('border', !active);
          btn.classList.toggle('border-white/60', !active);
        });
      }

      function bindTimeRangeTabs() {
        var tabs = document.querySelectorAll('#report-range-tabs [data-range]');
        tabs.forEach(function (btn) {
          btn.addEventListener('click', function () {
            var range = btn.getAttribute('data-range') || '本周';
            var fakeOption = Array.prototype.slice.call(document.querySelectorAll('#time-range-dropdown .custom-select-option')).find(function (opt) {
              var text = (opt.textContent || '').trim();
              if (range === '自定义') return text === '自定义';
              return text === range;
            });
            selectTimeRange(range, fakeOption || null);
          });
        });
      }

      // 点击其他地方关闭下拉
      document.addEventListener('click', function(e) {
        if (!e.target.closest('.custom-select-wrapper')) {
          document.querySelectorAll('.custom-select-dropdown').forEach(function (d) {
            d.classList.remove('show');
            if (d.previousElementSibling) d.previousElementSibling.classList.remove('active');
            var arrow = d.querySelector('.custom-select-arrow');
            if (arrow) arrow.classList.remove('rotate');
          });
        }
      });

      function resolveDate(value) {
        if (!value) return null;
        var parsed = (typeof parseDateVal === 'function') ? parseDateVal(value) : value;
        var date = new Date(parsed || value);
        return isNaN(date.getTime()) ? null : date;
      }

      function normalizeStatus(status) {
        return String(status || '').trim().toLowerCase();
      }

      function getReportSourceTasks() {
        if (window.__reportServerState && Array.isArray(window.__reportServerState.tasks)) {
          return window.__reportServerState.tasks;
        }
        return AppState.tasks || [];
      }

      function getReportSourcePomodoros() {
        if (window.__reportServerState && Array.isArray(window.__reportServerState.pomodoroSessions)) {
          return window.__reportServerState.pomodoroSessions;
        }
        return AppState.pomodoroSessions || [];
      }

      function getDateRangeByLabel(label) {
        var now = new Date();
        var end = new Date(now);
        end.setHours(23, 59, 59, 999);

        var start;
        if (label === '上周') {
          start = getWeekStart(now);
          start.setDate(start.getDate() - 7);
          end = new Date(start);
          end.setDate(end.getDate() + 6);
          end.setHours(23, 59, 59, 999);
        } else if (label === '本月') {
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          end.setHours(23, 59, 59, 999);
        } else if (label === '自定义' || label === '近30天') {
          start = new Date(now);
          start.setDate(now.getDate() - 29);
          start.setHours(0, 0, 0, 0);
        } else {
          start = getWeekStart(now);
          end = getWeekEnd(now);
          end.setHours(23, 59, 59, 999);
        }

        start.setHours(0, 0, 0, 0);
        return { label: label || '本周', start: start, end: end };
      }

      function getCompletedTasksInRange(start, end) {
        return getReportSourceTasks().filter(function (task) {
          if (normalizeStatus(task.status) !== 'completed') return false;
          var date = resolveDate(task.completedAt || task.updatedAt || task.dueAt || task.createdAt);
          if (!date) return false;
          return isDateInRange(date, start, end);
        });
      }

      function getFocusSessionsInRange(start, end) {
        return getReportSourcePomodoros().filter(function (session) {
          var sessionDate = resolveDate(session.startedAt || session.startTime || session.createdAt);
          if (!sessionDate || !isDateInRange(sessionDate, start, end)) return false;
          var mode = String(session.mode || 'focus').toLowerCase();
          var completed = session.completed !== false;
          return mode === 'focus' && completed;
        });
      }

      function getMaxContinuousPomodoros(sessions) {
        if (!sessions.length) return 0;
        var sorted = sessions.slice().sort(function (a, b) {
          return new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime();
        });
        var max = 0;
        var streak = 0;
        var lastTime = null;

        sorted.forEach(function (session) {
          var current = new Date(session.startedAt).getTime();
          if (!lastTime) {
            streak = 1;
          } else {
            var gapMinutes = (current - lastTime) / (1000 * 60);
            streak = gapMinutes <= 45 ? (streak + 1) : 1;
          }
          lastTime = current;
          if (streak > max) max = streak;
        });

        return max;
      }

      function calculateOverview(tasks, sessions) {
        var totalFocusMinutes = sessions.reduce(function (sum, session) {
          var minutes = Number(session.actualMinutes || session.plannedMinutes || 25);
          return sum + (isNaN(minutes) ? 0 : minutes);
        }, 0);

        var maxContinuousPomodoros = getMaxContinuousPomodoros(sessions);
        var taskScore = Math.min(tasks.length * 3, 50);
        var pomodoroScore = Math.min(sessions.length * 2, 30);
        var continuityBonus = Math.min(maxContinuousPomodoros * 5, 20);

        return {
          completedTasks: tasks.length,
          totalFocusMinutes: totalFocusMinutes,
          totalPomodoros: sessions.length,
          maxContinuousPomodoros: maxContinuousPomodoros,
          effectivenessScore: Math.min(Math.floor(taskScore + pomodoroScore + continuityBonus), 100)
        };
      }

      function getPreviousRange(range) {
        var spanMs = range.end.getTime() - range.start.getTime();
        var prevEnd = new Date(range.start.getTime() - 1);
        var prevStart = new Date(prevEnd.getTime() - spanMs);
        prevStart.setHours(0, 0, 0, 0);
        prevEnd.setHours(23, 59, 59, 999);
        return { start: prevStart, end: prevEnd };
      }

      function updateCompareAndRating(currentOverview, range) {
        var compareEl = document.getElementById('report-overview-compare-text');
        var ratingEl = document.getElementById('effectiveness-rating');
        if (!compareEl) return;

        var hasCurrentData = (currentOverview.completedTasks || 0) > 0 || (currentOverview.totalFocusMinutes || 0) > 0 || (currentOverview.totalPomodoros || 0) > 0 || (currentOverview.maxContinuousPomodoros || 0) > 0;
        if (!hasCurrentData) {
          compareEl.innerHTML = '<i class="fas fa-minus mr-1"></i>暂无对比数据';
          compareEl.classList.remove('text-green-600', 'text-red-500');
          compareEl.classList.add('text-gray-500');
          var scoreValueEl = document.getElementById('effectiveness-score');
          if (scoreValueEl) scoreValueEl.textContent = '暂无评分';
          if (ratingEl) ratingEl.textContent = '暂无评级';
          return;
        }

        var prevRange = getPreviousRange(range);
        var prevTasks = getCompletedTasksInRange(prevRange.start, prevRange.end);
        var prevSessions = getFocusSessionsInRange(prevRange.start, prevRange.end);
        var prevOverview = calculateOverview(prevTasks, prevSessions);
        var prev = Number(prevOverview.completedTasks || 0);
        var curr = Number(currentOverview.completedTasks || 0);
        if (prev <= 0) {
          compareEl.innerHTML = '<i class="fas fa-minus mr-1"></i>暂无对比数据';
          compareEl.classList.remove('text-green-600', 'text-red-500');
          compareEl.classList.add('text-gray-500');
        } else {
          var pct = Math.round(((curr - prev) / prev) * 100);
          var rising = pct >= 0;
          compareEl.innerHTML = '<i class="fas ' + (rising ? 'fa-arrow-up' : 'fa-arrow-down') + ' mr-1"></i>' + Math.abs(pct) + '% 较上周期';
          compareEl.classList.toggle('text-green-600', rising);
          compareEl.classList.toggle('text-red-500', !rising);
          compareEl.classList.remove('text-gray-500');
        }

        var score = Number(currentOverview.effectivenessScore || 0);
        var level = 'D 级';
        if (score >= 90) level = 'S 级';
        else if (score >= 80) level = 'A 级';
        else if (score >= 70) level = 'B 级';
        else if (score >= 60) level = 'C 级';
        if (ratingEl) ratingEl.textContent = level;
      }

      function updateOverviewCards(stats) {
        animateValue(document.getElementById('completed-tasks'), Number(stats.completedTasks || 0), ' 项');
        animateValue(document.getElementById('focus-hours'), Number(((stats.totalFocusMinutes || 0) / 60).toFixed(1)), ' 小时');
        animateValue(document.getElementById('pomodoro-count'), Number(stats.totalPomodoros || 0), ' 个');
        animateValue(document.getElementById('max-continuous-pomodoros'), Number(stats.maxContinuousPomodoros || 0), ' 个番茄');
        var scoreEl = document.getElementById('effectiveness-score');
        if (scoreEl) scoreEl.textContent = Number(stats.effectivenessScore || 0) + ' 分';
      }

      function buildDateList(start, end) {
        var dates = [];
        var cursor = new Date(start);
        while (cursor <= end) {
          dates.push(new Date(cursor));
          cursor.setDate(cursor.getDate() + 1);
        }
        return dates;
      }

      function toDateKey(date) {
        var y = date.getFullYear();
        var m = String(date.getMonth() + 1).padStart(2, '0');
        var d = String(date.getDate()).padStart(2, '0');
        return y + '-' + m + '-' + d;
      }

      function updateTrendCharts(range, tasks, sessions) {
        var days = buildDateList(range.start, range.end);
        if (!days.length) return;

        var labels = days.map(function (date) {
          if (range.label === '本周' || range.label === '上周') {
            var week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
            return week[date.getDay()];
          }
          return String(date.getMonth() + 1) + '/' + String(date.getDate());
        });

        var taskMap = {};
        tasks.forEach(function (task) {
          var date = resolveDate(task.completedAt || task.updatedAt || task.dueAt || task.createdAt);
          if (!date) return;
          var key = toDateKey(date);
          taskMap[key] = (taskMap[key] || 0) + 1;
        });

        var focusMap = {};
        sessions.forEach(function (session) {
          var date = resolveDate(session.startedAt || session.startTime || session.createdAt);
          if (!date) return;
          var key = toDateKey(date);
          var minutes = Number(session.actualMinutes || session.plannedMinutes || 25);
          focusMap[key] = (focusMap[key] || 0) + (isNaN(minutes) ? 0 : minutes);
        });

        var taskCounts = days.map(function (date) {
          return taskMap[toDateKey(date)] || 0;
        });
        var focusHours = days.map(function (date) {
          var minutes = focusMap[toDateKey(date)] || 0;
          return Number((minutes / 60).toFixed(1));
        });

        var taskHasData = taskCounts.some(function (n) { return n > 0; });
        var focusHasData = focusHours.some(function (n) { return n > 0; });

        if (window.taskTrendChart) {
          window.taskTrendChart.setOption({
            xAxis: { data: labels },
            series: [{ data: taskHasData ? taskCounts : [] }],
            graphic: taskHasData ? [] : [{
              type: 'text',
              left: 'center',
              top: 'middle',
              style: { text: '暂无数据', fill: '#9CA3AF', fontSize: 13 }
            }]
          });
        }

        if (window.focusBarChart) {
          window.focusBarChart.setOption({
            xAxis: { data: labels },
            series: [{ data: focusHasData ? focusHours : [] }],
            graphic: focusHasData ? [] : [{
              type: 'text',
              left: 'center',
              top: 'middle',
              style: { text: '暂无数据', fill: '#9CA3AF', fontSize: 13 }
            }]
          });
        }
      }

      function updateCategoryChart(tasks) {
        if (!window.categoryPieChart) return;
        var categoryMap = {};
        tasks.forEach(function (task) {
          var labels = Array.isArray(task.labels) ? task.labels : [];
          var name = labels.length ? labels[0] : '未分类';
          categoryMap[name] = (categoryMap[name] || 0) + 1;
        });

        var data = Object.keys(categoryMap).map(function (name) {
          return { name: name, value: categoryMap[name] };
        });

        var hasData = data.length > 0;
        if (!hasData) {
          data = [{ name: '暂无数据', value: 1, itemStyle: { color: 'rgba(203,213,225,0.45)' } }];
        }

        window.categoryPieChart.setOption({
          series: [{ data: data, label: { show: hasData } }],
          graphic: [{
            type: 'text',
            left: 'center',
            top: 'middle',
            style: { text: hasData ? '' : '暂无数据', fill: '#9CA3AF', fontSize: 13, fontWeight: 500 }
          }]
        });
      }

      function updateHeatmap(sessions) {
        if (!window.focusHeatmap) return;
        var matrix = [];
        for (var y = 0; y < 7; y++) {
          for (var x = 0; x < 12; x++) {
            matrix.push([x, y, 0]);
          }
        }

        sessions.forEach(function (session) {
          var date = resolveDate(session.startedAt || session.startTime || session.createdAt);
          if (!date) return;
          var x = Math.max(0, Math.min(11, Math.floor(date.getHours() / 2)));
          var y = (date.getDay() + 6) % 7;
          var idx = y * 12 + x;
          matrix[idx][2] += 1;
        });

        var maxValue = matrix.reduce(function (max, item) {
          return Math.max(max, item[2]);
        }, 0);

        window.focusHeatmap.setOption({
          visualMap: { max: Math.max(maxValue, 1) },
          series: [{ data: matrix }],
          graphic: maxValue > 0 ? [] : [{
            type: 'text',
            left: 'center',
            top: 'middle',
            style: { text: '暂无数据', fill: '#9CA3AF', fontSize: 13 }
          }]
        });
      }

      function getSlotNameByHour(hour) {
        if (hour >= 6 && hour <= 8) return 'early_morning';
        if (hour >= 9 && hour <= 11) return 'morning';
        if (hour >= 12 && hour <= 14) return 'noon';
        if (hour >= 15 && hour <= 17) return 'afternoon';
        if (hour >= 18 && hour <= 21) return 'evening';
        if (hour >= 22 || hour <= 5) return 'late_night';
        return 'morning';
      }

      function calculateTimeSlotsData(tasks) {
        var slots = [
          { slot: 'early_morning', label: '清晨 (6-8 点)', tasksCompleted: 0 },
          { slot: 'morning', label: '上午 (9-11 点)', tasksCompleted: 0 },
          { slot: 'noon', label: '中午 (12-14 点)', tasksCompleted: 0 },
          { slot: 'afternoon', label: '下午 (15-17 点)', tasksCompleted: 0 },
          { slot: 'evening', label: '晚上 (18-21 点)', tasksCompleted: 0 },
          { slot: 'late_night', label: '深夜 (22-24 点)', tasksCompleted: 0 }
        ];

        var slotMap = {};
        slots.forEach(function (item) { slotMap[item.slot] = item; });

        (tasks || []).forEach(function (task) {
          var date = resolveDate(task.completedAt || task.updatedAt || task.dueAt || task.createdAt);
          if (!date) return;
          var slotName = getSlotNameByHour(date.getHours());
          if (slotMap[slotName]) {
            slotMap[slotName].tasksCompleted += 1;
          }
        });

        return slots;
      }

      function updateTimeSlots(tasks) {
        var timeSlotsData = calculateTimeSlotsData(tasks);
        var container = document.getElementById('time-slots-container');
        if (!container || !timeSlotsData) return;

        var bestSlot = null;
        var maxTasks = 0;

        timeSlotsData.forEach(function (slot) {
          if (slot.tasksCompleted > maxTasks) {
            maxTasks = slot.tasksCompleted;
            bestSlot = slot.slot;
          }
        });

        timeSlotsData.forEach(function (slot) {
          var slotElement = container.querySelector('[data-slot="' + slot.slot + '"]');
          if (!slotElement) return;

          var oldBadge = slotElement.querySelector('.slot-best-indicator');
          if (oldBadge) oldBadge.remove();

          var countElement = slotElement.querySelector('.slot-count');
          if (countElement) {
            animateValue(countElement, Number(slot.tasksCompleted || 0), '项');
          }

          if (slot.slot === bestSlot && slot.tasksCompleted > 0) {
            slotElement.classList.add('best-slot');
            var badge = document.createElement('div');
            badge.className = 'slot-best-indicator text-xs text-yellow-600 mt-3 flex items-center font-medium';
            badge.innerHTML = '<i class="fas fa-crown crown-badge mr-2"></i>最佳效率时段';
            slotElement.appendChild(badge);
          } else {
            slotElement.classList.remove('best-slot');
          }
        });
      }

      function getDefaultSuggestions() {
        return [
          '您周二周三效率较高，建议将高优先级任务集中在这两天。',
          '下午 3-5 点容易分心，建议安排低认知负荷任务。',
          '对延期任务可拆解为 30 分钟以内的小步骤，执行成功率更高。',
          '连续完成 4 个番茄后建议休息 15 分钟，避免效率衰减。'
        ];
      }

      function getNoDataSuggestion() {
        return '暂无有效数据，快去创建待办、开启专注，生成专属效率建议吧';
      }

      function hasValidReportData(context) {
        var c = context || {};
        return Number(c.completedTasks || 0) > 0 || Number(c.focusSessions || 0) > 0;
      }

      function renderSmartSuggestions(items) {
        var list = document.getElementById('smart-suggestions-list');
        if (!list) return;
        var values = Array.isArray(items) && items.length ? items : [getNoDataSuggestion()];
        list.innerHTML = values.map(function (text) {
          return '<div class="suggestion-card flex items-start">' +
            '<i class="fas fa-lightbulb text-yellow-500 mt-1 mr-3 flex-shrink-0"></i>' +
            '<p class="text-gray-700 text-sm leading-relaxed">' + String(text || '') + '</p>' +
            '</div>';
        }).join('');
      }

      function buildReportAiContext() {
        var selectedLabel = (document.getElementById('time-range-text') || {}).textContent || '本周';
        selectedLabel = selectedLabel.trim() || '本周';
        var range = getDateRangeByLabel(selectedLabel);
        var completedTasks = getCompletedTasksInRange(range.start, range.end);
        var focusSessions = getFocusSessionsInRange(range.start, range.end);
        var overview = calculateOverview(completedTasks, focusSessions);
        var slots = calculateTimeSlotsData(completedTasks);
        return {
          range: selectedLabel,
          overview: overview,
          completedTasks: completedTasks.length,
          focusSessions: focusSessions.length,
          slots: slots
        };
      }

      function requestAiSmartSuggestions() {
        function parseAiJson(content) {
          var text = String(content || '').trim();
          if (!text) throw new Error('ai-empty-content');
          var fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
          if (fence && fence[1]) text = fence[1].trim();
          return JSON.parse(text);
        }
        var context = buildReportAiContext();
        if (!hasValidReportData(context)) {
          return Promise.resolve([getNoDataSuggestion()]);
        }
        var prompt = [
          '你是效率分析助手，请基于用户周报数据生成4条可执行建议。',
          '要求：每条建议不超过30字，中文。返回纯JSON。',
          '格式：{"suggestions":["建议1","建议2","建议3","建议4"]}',
          '数据：' + JSON.stringify(context)
        ].join('\n');

        var aiPromise = apiRequest('/api/ai/chat', {
          method: 'POST',
          timeoutMs: 10000,
          body: JSON.stringify({
            temperature: 0.4,
            maxTokens: 500,
            messages: [
              { role: 'system', content: '你是严谨的数据分析助手，只返回JSON。' },
              { role: 'user', content: prompt }
            ]
          })
        }).then(function (resp) {
          if (!(resp && resp.status === 200 && resp.body && resp.body.code === 200 && resp.body.data && resp.body.data.content)) {
            throw new Error((resp && resp.body && resp.body.message) || 'ai-backend-failed');
          }
          var parsed = parseAiJson(resp.body.data.content);
          if (!parsed || !Array.isArray(parsed.suggestions)) throw new Error('invalid-ai-json');
          return parsed.suggestions.slice(0, 4);
        });

        return Promise.race([
          aiPromise,
          new Promise(function (_, reject) {
            setTimeout(function () { reject(new Error('ai-timeout')); }, 10000);
          })
        ]);
      }

      function scheduleAiSuggestionsLoad() {
        var run = function () {
          var context = buildReportAiContext();
          if (!hasValidReportData(context)) {
            renderSmartSuggestions([getNoDataSuggestion()]);
            return Promise.resolve();
          }
          return requestAiSmartSuggestions().then(function (items) {
            renderSmartSuggestions(items);
          }).catch(function () {
            renderSmartSuggestions(getDefaultSuggestions());
          });
        };
        if (window.requestIdleCallback) {
          window.requestIdleCallback(function () { run(); }, { timeout: 1500 });
        } else {
          window.setTimeout(run, 300);
        }
      }

      function applyTimeRangeSelection(value) {
        var validValues = ['本周', '上周', '本月', '自定义'];
        var selected = validValues.indexOf(value) >= 0 ? value : '本周';

        var textEl = document.getElementById('time-range-text');
        if (textEl) textEl.textContent = (selected === '自定义' ? '近30天' : selected);

        document.querySelectorAll('#time-range-dropdown .custom-select-option').forEach(function (opt) {
          var text = opt.textContent.trim();
          var isSelected = text === selected || (selected === '自定义' && text === '近30天');
          opt.classList.toggle('selected', isSelected);
        });

        syncTimeRangeTabs(selected);

        return selected;
      }

      function showReportChartDetail(title, content) {
        var modal = document.getElementById('report-chart-modal');
        var titleEl = document.getElementById('report-chart-modal-title');
        var contentEl = document.getElementById('report-chart-modal-content');
        if (!modal || !titleEl || !contentEl) return;
        titleEl.textContent = title || '数据详情';
        contentEl.textContent = content || '暂无详情';
        modal.classList.remove('hidden');
        modal.classList.add('flex');
      }

      function hideReportChartDetail() {
        var modal = document.getElementById('report-chart-modal');
        if (!modal) return;
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }

      function bindReportChartInteractions() {
        if (window.taskTrendChart && !window.__reportTaskTrendClickBound) {
          window.__reportTaskTrendClickBound = true;
          window.taskTrendChart.on('click', function (params) {
            showReportChartDetail('任务完成趋势', (params.name || '') + ' 完成任务：' + (params.value || 0) + ' 项');
          });
        }
        if (window.focusBarChart && !window.__reportFocusBarClickBound) {
          window.__reportFocusBarClickBound = true;
          window.focusBarChart.on('click', function (params) {
            showReportChartDetail('番茄专注分析', (params.name || '') + ' 专注时长：' + (params.value || 0) + ' 小时');
          });
        }
        if (window.categoryPieChart && !window.__reportCategoryClickBound) {
          window.__reportCategoryClickBound = true;
          window.categoryPieChart.on('click', function (params) {
            showReportChartDetail('任务分类统计', (params.name || '') + '：' + (params.value || 0) + ' 项');
          });
        }
        if (window.focusHeatmap && !window.__reportHeatmapClickBound) {
          window.__reportHeatmapClickBound = true;
          window.focusHeatmap.on('click', function (params) {
            var v = params.value || [0, 0, 0];
            var days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
            var spans = ['0-2', '2-4', '4-6', '6-8', '8-10', '10-12', '12-14', '14-16', '16-18', '18-20', '20-22', '22-24'];
            showReportChartDetail('专注时间段分布', (days[v[1]] || '未知') + ' ' + (spans[v[0]] || '未知') + ' 点段专注：' + (v[2] || 0) + ' 次');
          });
        }
      }

      function bindReportChartModalEvents() {
        var modal = document.getElementById('report-chart-modal');
        var closeBtn = document.getElementById('report-chart-modal-close');
        if (closeBtn) closeBtn.addEventListener('click', hideReportChartDetail);
        if (modal) {
          modal.addEventListener('click', function (e) {
            if (e.target === modal) hideReportChartDetail();
          });
        }
      }

      function updateWeeklyStats(options) {
        var opts = options || {};
        var shouldSync = opts.sync !== false;
        var selectedLabel = (document.getElementById('time-range-text') || {}).textContent || '本周';
        selectedLabel = selectedLabel.trim() || '本周';
        var range = getDateRangeByLabel(selectedLabel);

        function render() {
          var completedTasks = getCompletedTasksInRange(range.start, range.end);
          var focusSessions = getFocusSessionsInRange(range.start, range.end);
          var overview = calculateOverview(completedTasks, focusSessions);
          if (window.__reportServerState && window.__reportServerState.overview) {
            overview = Object.assign({}, overview, window.__reportServerState.overview);
          }

          updateOverviewCards(overview);
          updateCompareAndRating(overview, range);
          updateTrendCharts(range, completedTasks, focusSessions);
          updateCategoryChart(completedTasks);
          updateHeatmap(focusSessions);
          updateTimeSlots(completedTasks);
          bindReportChartInteractions();
        }

        if (shouldSync && typeof syncReportStateFromServer === 'function') {
          return syncReportStateFromServer().finally(render);
        }

        render();
        return Promise.resolve();
      }

      document.addEventListener('DOMContentLoaded', function () {
        AppState.init();
        renderHeader('report');
        renderFooter('report');
        bindGlobalLogout();
        var tabShown = false;
        function revealBottomTab() {
          if (tabShown) return;
          tabShown = true;
          if (typeof showUnifiedBottomTabDock === 'function') {
            showUnifiedBottomTabDock();
          }
        }
        setTimeout(revealBottomTab, 220);
        window.addEventListener('load', revealBottomTab);

        var now = new Date();
        var currentDateEl = document.getElementById('current-date');
        if (currentDateEl) {
          currentDateEl.textContent = now.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'short'
          });
        }

        var savedRange = null;
        try { savedRange = localStorage.getItem('report-time-range'); } catch (e) { savedRange = null; }
        applyTimeRangeSelection(savedRange || '本周');
        bindTimeRangeTabs();
        bindReportChartModalEvents();

        Promise.resolve()
          .then(function () { return updateWeeklyStats({ sync: false }); })
          .then(function () {
            // 仅在存在真实远端同步逻辑时再触发二次刷新，避免重复渲染。
            if (!window.__reportSyncNoop) {
              Promise.resolve()
                .then(function () { return updateWeeklyStats({ sync: true }); })
                .catch(function (err) { console.error('updateWeeklyStats sync error:', err); });
            }

            // AI 建议在空闲时加载，降低与首屏渲染竞争。
            scheduleAiSuggestionsLoad();

            // 图表实例通常在空闲时初始化，做一次延迟绑定确保点击详情可用。
            setTimeout(bindReportChartInteractions, 420);
          })
          .catch(function (err) { console.error('updateWeeklyStats init error:', err); })
          .finally(revealBottomTab);

        var aiRefreshBtn = document.getElementById('ai-suggestions-refresh');
        if (aiRefreshBtn) {
          aiRefreshBtn.addEventListener('click', function () {
            var context = buildReportAiContext();
            aiRefreshBtn.disabled = true;
            var oldText = aiRefreshBtn.textContent;
            aiRefreshBtn.textContent = '刷新中...';
            aiRefreshBtn.classList.add('opacity-70');
            requestAiSmartSuggestions().then(function (items) {
              renderSmartSuggestions(items);
              if (!hasValidReportData(context)) {
                showToast('暂无新增有效数据，仍显示空状态', 'info');
              } else {
                showToast('智能建议已更新', 'success');
              }
            }).catch(function () {
              if (!hasValidReportData(context)) {
                renderSmartSuggestions([getNoDataSuggestion()]);
                showToast('暂无有效数据，建议暂不可生成', 'info');
              } else {
                renderSmartSuggestions(getDefaultSuggestions());
                showToast('AI 不可用，已展示默认建议', 'warning');
              }
            }).finally(function () {
              aiRefreshBtn.disabled = false;
              aiRefreshBtn.textContent = oldText;
              aiRefreshBtn.classList.remove('opacity-70');
            });
          });
        }
        
        // ✅ 监听其他页面的 AppState 更新（跨页面同步）
        window.addEventListener('appstate-updated', function (e) {
          updateWeeklyStats({ sync: false }).then(function () {
            showToast('📊 数据周报已刷新', 'info');
          }).catch(function (err) {
            console.error('刷新数据周报失败:', err);
          });
        }, false);
      });
function exportReport() {
        showToast('报告导出功能正在开发中');
      }
      
      function shareReport() {
        if (navigator.share) {
          navigator.share({
            title: '我的数据周报',
            text: '查看我的本周效率数据',
            url: window.location.href,
          })
          .then(() => console.log('分享成功'))
          .catch((error) => console.log('分享失败:', error));
        } else {
          showToast('分享功能在当前浏览器中不可用');
        }
      }
      
      // ✅ 优化后的数字动画函数（修复 BUG）
      function animateValue(element, targetValue, suffix = '', duration = 800) {
        if (!element) return;
        
        const currentValue = parseFloat(element.textContent.replace(/[^\d.]/g, '')) || 0;
        if (currentValue === targetValue) return;
        
        const startTime = performance.now();
        
        function animate(currentTime) {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          
          // 使用缓动函数使动画更流畅
          const easeProgress = 1 - Math.pow(1 - progress, 3);
          const value = currentValue + (targetValue - currentValue) * easeProgress;
          
          const formattedValue = Number.isInteger(targetValue) 
            ? Math.floor(value) 
            : value.toFixed(1);
          
          element.textContent = formattedValue + suffix;
          
          if (progress < 1) {
            requestAnimationFrame(animate);
          }
        }
        
        requestAnimationFrame(animate);
      }
    

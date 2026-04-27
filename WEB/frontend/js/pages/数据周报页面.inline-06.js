
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
        if (textEl) textEl.textContent = value;

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
          showToast('已切换到自定义（近 30 天）数据视图');
        } else {
          showToast('已切换到 ' + value + ' 数据视图');
        }
        updateWeeklyStats({ sync: false });
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

      function shouldUseReportServerState() {
        var state = window.__reportServerState;
        if (!state || state.error) return false;
        var serverTasks = Array.isArray(state.tasks) ? state.tasks : [];
        var serverSessions = Array.isArray(state.pomodoroSessions) ? state.pomodoroSessions : [];
        return serverTasks.length > 0 || serverSessions.length > 0;
      }

      function getReportSourceTasks() {
        if (shouldUseReportServerState()) {
          return window.__reportServerState.tasks || [];
        }
        return AppState.tasks || [];
      }

      function getReportSourcePomodoros() {
        if (shouldUseReportServerState()) {
          return window.__reportServerState.pomodoroSessions || [];
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
        } else if (label === '自定义') {
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

      function updateOverviewCards(stats) {
        var score = Number(stats.effectivenessScore || 0);
        animateValue(document.getElementById('completed-tasks'), Number(stats.completedTasks || 0), ' 项');
        animateValue(document.getElementById('focus-hours'), Number(((stats.totalFocusMinutes || 0) / 60).toFixed(1)), ' 小时');
        animateValue(document.getElementById('pomodoro-count'), Number(stats.totalPomodoros || 0), ' 个');
        animateValue(document.getElementById('max-continuous-pomodoros'), Number(stats.maxContinuousPomodoros || 0), ' 个番茄');
        animateValue(document.getElementById('effectiveness-score'), score, ' 分');
        var scoreMeta = getScoreMeta(score, stats);
        setReportText('effectiveness-level', scoreMeta.level);
        setReportText('score-helper-text', scoreMeta.helper);
      }

      function setReportText(id, text) {
        var el = document.getElementById(id);
        if (el) el.textContent = text;
      }

      function getScoreMeta(score, stats) {
        var completed = Number(stats.completedTasks || 0);
        var pomodoros = Number(stats.totalPomodoros || 0);
        var streak = Number(stats.maxContinuousPomodoros || 0);
        if (score >= 80) return { level: 'A 级', helper: '任务完成、专注投入和连续性都比较稳，可以继续沿用当前节奏。' };
        if (score >= 60) return { level: 'B 级', helper: '已经形成推进感，下一步重点是提高番茄连续性和任务收尾率。' };
        if (score >= 35) return { level: 'C 级', helper: '本期有记录但还不稳定，建议先固定每天 1 个任务和 1 个番茄。' };
        if (completed || pomodoros || streak) return { level: 'D 级', helper: '数据刚开始积累，先恢复连续性，比追求数量更重要。' };
        return { level: '待积累', helper: '完成任务或番茄后，这里会自动生成综合评分。' };
      }

      function getTopTaskCategory(tasks) {
        var categoryMap = {};
        (tasks || []).forEach(function (task) {
          var labels = Array.isArray(task.labels) ? task.labels : [];
          var name = labels.length ? labels[0] : '未分类';
          categoryMap[name] = (categoryMap[name] || 0) + 1;
        });
        return Object.keys(categoryMap).reduce(function (best, name) {
          if (!best || categoryMap[name] > best.count) return { name: name, count: categoryMap[name] };
          return best;
        }, null);
      }

      function getBestTaskSlot(tasks) {
        return calculateTimeSlotsData(tasks).reduce(function (best, slot) {
          if (!best || slot.tasksCompleted > best.tasksCompleted) return slot;
          return best;
        }, null);
      }

      function updateReportInsight(range, tasks, sessions, overview) {
        var completed = tasks.length;
        var pomodoros = sessions.length;
        var focusHours = Number(((overview.totalFocusMinutes || 0) / 60).toFixed(1));
        var score = Number(overview.effectivenessScore || 0);
        var hasData = completed > 0 || pomodoros > 0;
        var emptyGuide = document.getElementById('report-empty-guide');
        if (emptyGuide) emptyGuide.classList.toggle('hidden', hasData);

        setReportText('report-range-label', (range.label || '本周') + '复盘');

        if (!hasData) {
          setReportText('report-insight-title', '先积累一点数据，再看周报');
          setReportText('report-summary-text', '当前时间范围内还没有完成任务或专注记录。先完成 3 个任务或 2 次番茄钟，页面会自动生成趋势、诊断和建议。');
          setReportText('report-diagnosis-title', '数据不足');
          setReportText('report-diagnosis-text', '图表暂时只能作为占位参考，还不能判断效率问题。');
          setReportText('report-next-step-text', '建议先添加今天最重要的 1 个任务，并用番茄钟完成一次 25 分钟专注。');
          setReportText('task-trend-reading', '暂无完成记录，完成任务后会显示每天的执行变化。');
          setReportText('category-reading', '暂无分类数据，给任务打标签后会看到时间分布。');
          setReportText('focus-reading', '暂无番茄记录，开始专注后会显示每天投入。');
          setReportText('heatmap-reading', '暂无专注时间段，完成番茄后会识别高效时段。');
          setReportText('time-slot-reading', '暂无可分析时段，完成任务后会标出最佳效率时段。');
          setReportText('execution-fold-summary', '暂无任务完成记录，先完成 1 个任务再观察趋势。');
          setReportText('invest-fold-summary', '暂无分类和番茄数据，先补充任务标签并开始专注。');
          setReportText('time-fold-summary', '暂无高效时段，完成任务后会自动识别。');
          return;
        }

        var summaryLevel = score >= 80 ? '表现很稳' : (score >= 50 || (completed >= 3 && pomodoros >= 3) ? '有推进，但节奏还可以更稳' : '本期执行偏弱，需要先恢复连续性');
        setReportText('report-insight-title', summaryLevel);
        setReportText('report-summary-text', '这个时间范围内完成了 ' + completed + ' 个任务，累计专注 ' + focusHours + ' 小时，完成 ' + pomodoros + ' 个番茄，综合效率评分 ' + score + ' 分。');

        var diagnosisTitle = '连续性不足';
        var diagnosisText = '专注记录偏少，建议先固定一个每天都能执行的时间段。';
        if (completed >= 8 && pomodoros < 4) {
          diagnosisTitle = '完成多，但深度专注偏少';
          diagnosisText = '任务推进不错，但番茄数量偏少，可能存在碎片化处理问题。';
        } else if (completed < 3 && pomodoros >= 4) {
          diagnosisTitle = '有专注，但产出转化不足';
          diagnosisText = '专注投入已有积累，可以把大任务拆成可完成的小步骤。';
        } else if (score >= 80) {
          diagnosisTitle = '节奏健康';
          diagnosisText = '任务完成和专注投入比较均衡，可以继续保持当前安排。';
        } else if (completed >= 3 && pomodoros >= 3) {
          diagnosisTitle = '节奏基本成型';
          diagnosisText = '已经有稳定记录，下一步重点是减少低效时间段的任务堆积。';
        }
        setReportText('report-diagnosis-title', diagnosisTitle);
        setReportText('report-diagnosis-text', diagnosisText);

        var nextStep = '明天先安排 1 个高优先级任务，并用 1 个番茄钟完成第一步。';
        if (completed >= 8 && pomodoros < 4) nextStep = '给高认知任务预留 2 个连续番茄，减少边做边切换。';
        else if (completed < 3 && pomodoros >= 4) nextStep = '把正在专注的任务拆成 30 分钟内能完成的小清单。';
        else if (score >= 80) nextStep = '保留当前节奏，把最难任务继续放在你的高效时段。';
        setReportText('report-next-step-text', nextStep);

        var topCategory = getTopTaskCategory(tasks);
        var bestSlot = getBestTaskSlot(tasks);
        var bestSlotText = bestSlot && bestSlot.tasksCompleted > 0 ? bestSlot.label : '';
        setReportText('task-trend-reading', completed >= 5 ? '任务完成已有明显轨迹，可以观察哪几天最稳定。' : '完成记录还偏少，先保证每天至少收尾 1 个任务。');
        setReportText('category-reading', topCategory && topCategory.count > 0 ? (topCategory.name + '类任务最多，共 ' + topCategory.count + ' 项，可留意精力是否过度集中。') : '给任务补充标签后，分类占比会更有参考价值。');
        setReportText('focus-reading', pomodoros >= 4 ? '番茄记录已能反映专注投入，建议关注是否连续。' : '番茄数量偏少，先用固定时间建立专注习惯。');
        setReportText('heatmap-reading', pomodoros >= 4 ? '颜色更深的时间段适合安排深度工作。' : '专注数据不足，热力图暂时只适合做参考。');
        setReportText('execution-fold-summary', completed >= 5 ? ('本期完成 ' + completed + ' 个任务，执行趋势已值得重点观察。') : ('本期完成 ' + completed + ' 个任务，先看最近是否开始连续。'));
        setReportText('invest-fold-summary', topCategory && topCategory.count > 0 ? (topCategory.name + '类占比最高，另有 ' + pomodoros + ' 个番茄投入。') : ('已完成 ' + completed + ' 个任务，完成 ' + pomodoros + ' 个番茄。'));
        setReportText('time-fold-summary', bestSlotText ? (bestSlotText + '目前产出最高，可优先安排难任务。') : (pomodoros >= 4 ? '可展开查看适合深度工作的时间段。' : '专注数据偏少，展开后可作为参考。'));
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

        if (window.taskTrendChart) {
          window.taskTrendChart.setOption({
            xAxis: { data: labels },
            series: [{ data: taskCounts }]
          });
        }

        if (window.focusBarChart) {
          window.focusBarChart.setOption({
            xAxis: { data: labels },
            series: [{ data: focusHours }]
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

        if (!data.length) {
          data = [{ name: '暂无数据', value: 0 }];
        }

        window.categoryPieChart.setOption({ series: [{ data: data }] });
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
          series: [{ data: matrix }]
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
        var bestSlotLabel = '';
        var maxTasks = 0;

        timeSlotsData.forEach(function (slot) {
          if (slot.tasksCompleted > maxTasks) {
            maxTasks = slot.tasksCompleted;
            bestSlot = slot.slot;
            bestSlotLabel = slot.label;
          }
        });

        setReportText('time-slot-reading', maxTasks > 0 ? ('当前最高效时段是 ' + bestSlotLabel + '，适合安排优先级最高的任务。') : '暂无可分析时段，完成任务后会标出最佳效率时段。');

        timeSlotsData.forEach(function (slot) {
          var slotElement = container.querySelector('[data-slot="' + slot.slot + '"]');
          if (!slotElement) return;

          var countElement = slotElement.querySelector('.slot-count');
          if (countElement) {
            animateValue(countElement, Number(slot.tasksCompleted || 0), '项');
          }

          if (slot.slot === bestSlot && slot.tasksCompleted > 0) {
            slotElement.classList.add('best-slot');
          } else {
            slotElement.classList.remove('best-slot');
          }
        });
      }

      function getDefaultSuggestions() {
        return [
          '先固定每天一个高效时段，减少临时安排。',
          '把大任务拆成 30 分钟内能完成的小步骤。',
          '任务少时先追求连续性，不急着追求数量。',
          '连续完成 4 个番茄后安排一次长休息。'
        ];
      }

      function renderSmartSuggestions(items) {
        var list = document.getElementById('smart-suggestions-list');
        if (!list) return;
        var values = Array.isArray(items) && items.length ? items : getDefaultSuggestions();
        values = values.slice(0, 4);
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
        if (!window.AiService || typeof window.AiService.chat !== 'function') {
          return Promise.reject(new Error('ai-service-unavailable'));
        }
        var context = buildReportAiContext();
        var prompt = [
          '你是效率分析助手，请基于用户周报数据生成4条可执行建议，不要只复述数据，要告诉用户下一步怎么做。',
          '要求：每条建议不超过30字，中文。返回纯JSON。',
          '格式：{"suggestions":["建议1","建议2","建议3","建议4"]}',
          '数据：' + JSON.stringify(context)
        ].join('\n');

        var aiPromise = window.AiService.chat([
          { role: 'system', content: '你是严谨的数据分析助手，只返回JSON。' },
          { role: 'user', content: prompt }
        ], { temperature: 0.4, maxTokens: 500 }).then(function (content) {
          var parsed = window.AiService.parseJson(content);
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

      function initReportAnalysisFolds() {
        document.querySelectorAll('.report-analysis-fold').forEach(function (fold) {
          var summary = fold.querySelector('summary');
          var state = fold.querySelector('.report-fold-state');
          if (!summary) return;
          var sync = function () {
            summary.setAttribute('aria-expanded', fold.open ? 'true' : 'false');
            if (state) state.textContent = fold.open ? '收起' : '展开';
          };
          sync();
          fold.addEventListener('toggle', function () {
            sync();
            if (fold.open && window.echarts) {
              setTimeout(function () {
                [window.taskTrendChart, window.categoryPieChart, window.focusBarChart, window.focusHeatmap].forEach(function (chart) {
                  if (chart && typeof chart.resize === 'function') chart.resize();
                });
              }, 80);
            }
          });
        });
      }

      function applyTimeRangeSelection(value) {
        var validValues = ['本周', '上周', '本月', '自定义'];
        var selected = validValues.indexOf(value) >= 0 ? value : '本周';

        var textEl = document.getElementById('time-range-text');
        if (textEl) textEl.textContent = selected;

        document.querySelectorAll('#time-range-dropdown .custom-select-option').forEach(function (opt) {
          var isSelected = opt.textContent.trim() === selected;
          opt.classList.toggle('selected', isSelected);
        });

        return selected;
      }

      function updateWeeklyStats(options) {
        var opts = options || {};
        var shouldSync = opts.sync !== false;
        var selectedLabel = (document.getElementById('time-range-text') || {}).textContent || '本周';
        selectedLabel = selectedLabel.trim() || '本周';
        var range = getDateRangeByLabel(selectedLabel);

        function render() {
          var localTasks = getCompletedTasksInRange(range.start, range.end);
          var localSessions = getFocusSessionsInRange(range.start, range.end);
          var serverState = window.__reportServerState || null;
          var serverTasks = serverState && Array.isArray(serverState.tasks) ? serverState.tasks : [];
          var serverSessions = serverState && Array.isArray(serverState.pomodoroSessions) ? serverState.pomodoroSessions : [];
          var hasLocalData = localTasks.length > 0 || localSessions.length > 0;
          var hasServerData = !serverState || serverState.error ? false : (serverTasks.length > 0 || serverSessions.length > 0);
          var completedTasks = hasServerData ? serverTasks : localTasks;
          var focusSessions = hasServerData ? serverSessions : localSessions;
          var overview = calculateOverview(completedTasks, focusSessions);
          if (hasServerData && serverState.overview) {
            overview = Object.assign({}, overview, serverState.overview);
          } else if (!hasLocalData && serverState && serverState.overview && !serverState.error) {
            overview = Object.assign({}, overview, serverState.overview);
          }

          updateOverviewCards(overview);
          updateReportInsight(range, completedTasks, focusSessions, overview);
          updateTrendCharts(range, completedTasks, focusSessions);
          updateCategoryChart(completedTasks);
          updateHeatmap(focusSessions);
          updateTimeSlots(completedTasks);
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
        initReportAnalysisFolds();

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
          })
          .catch(function (err) { console.error('updateWeeklyStats init error:', err); })
          .finally(revealBottomTab);

        var aiRefreshBtn = document.getElementById('ai-suggestions-refresh');
        if (aiRefreshBtn) {
          aiRefreshBtn.addEventListener('click', function () {
            aiRefreshBtn.disabled = true;
            requestAiSmartSuggestions().then(function (items) {
              renderSmartSuggestions(items);
              showToast('智能建议已更新', 'success');
            }).catch(function () {
              renderSmartSuggestions(getDefaultSuggestions());
              showToast('AI 不可用，已展示默认建议', 'warning');
            }).finally(function () {
              aiRefreshBtn.disabled = false;
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
    

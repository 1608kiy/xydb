
      try { document.documentElement.classList.add('defer-unified-tab'); } catch (e) {}
      if (typeof checkAuthOnLoad === 'function') { checkAuthOnLoad().catch(function(){}); }
      window.__reportSyncNoop = false;
      window.__reportServerState = window.__reportServerState || {
        tasks: [],
        pomodoroSessions: [],
        overview: null,
        ready: false,
        error: null,
        syncedAt: null
      };
      // Fetch server data (tasks, pomodoros) and render aggregated weekly stats and charts
      function parseDateVal(v) {
        if (v === null || v === undefined || v === '') return null;
        if (typeof v === 'number') {
          var dnum = new Date(v);
          return isNaN(dnum.getTime()) ? null : dnum.toISOString();
        }
        if (typeof v === 'string') {
          var s = v.trim();
          if (s === '') return null;
          var d = new Date(s);
          if (!isNaN(d.getTime())) return d.toISOString();
          var n = parseInt(s, 10);
          if (!isNaN(n)) {
            d = new Date(n);
            if (!isNaN(d.getTime())) return d.toISOString();
            d = new Date(n * 1000);
            if (!isNaN(d.getTime())) return d.toISOString();
          }
        }
        return null;
      }

      function normalizeTask(t) {
        return {
          id: String(t.id || t.taskId || t.idStr || ''),
          title: t.title || t.name || '',
          description: t.description || t.note || '',
          dueAt: parseDateVal(t.dueAt || t.due_at || t.dueAtStr || t.dueTime),
          status: t.status || t.state || 'pending',
          priority: t.priority || 'medium',
          labels: (t.tags && Array.isArray(t.tags)) ? t.tags : (t.labels || t.tagNames || []),
          createdAt: parseDateVal(t.createdAt || t.created_at),
          updatedAt: parseDateVal(t.updatedAt || t.updated_at)
        };
      }

      function normalizePomo(p) {
        return {
          id: String(p.id || p.pomodoroId || ''),
          startedAt: parseDateVal(p.startedAt || p.startTime || p.started_at),
          completed: !!p.completed,
          actualMinutes: p.actualMinutes || p.duration || p.minutes || 25,
          mode: p.mode || 'focus'
        };
      }

      function getReportRangeLabel() {
        var textEl = document.getElementById('time-range-text');
        var label = (textEl && textEl.textContent ? String(textEl.textContent) : '本周').trim();
        if (label === '近30天') return '自定义';
        return label || '本周';
      }

      function mapLabelToReportRange(label) {
        if (label === '本月') return 'month';
        if (label === '自定义') return 'custom';
        return 'week';
      }

      function buildQuery(path, query) {
        var params = [];
        Object.keys(query || {}).forEach(function (k) {
          var v = query[k];
          if (v === null || v === undefined || v === '') return;
          params.push(encodeURIComponent(k) + '=' + encodeURIComponent(String(v)));
        });
        if (!params.length) return path;
        return path + (path.indexOf('?') >= 0 ? '&' : '?') + params.join('&');
      }

      function unwrapResultData(resp, endpoint) {
        if (!resp || resp.status !== 200 || !resp.body || Number(resp.body.code) !== 200) {
          var msg = (resp && resp.body && resp.body.message) ? resp.body.message : ('请求失败: ' + endpoint);
          throw new Error(msg);
        }
        return resp.body.data || {};
      }

      function buildDayKeysFromTrend(dailyData) {
        var count = Array.isArray(dailyData.taskCounts) ? dailyData.taskCounts.length : 0;
        var size = count > 0 ? count : 7;
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        var start = new Date(today);
        start.setDate(today.getDate() - (size - 1));
        var keys = [];
        for (var i = 0; i < size; i++) {
          var d = new Date(start);
          d.setDate(start.getDate() + i);
          keys.push(d.toISOString().slice(0, 10));
        }
        return keys;
      }

      function buildCategoryPool(categoryData) {
        var stats = (categoryData && Array.isArray(categoryData.categoryStats)) ? categoryData.categoryStats : [];
        var pool = [];
        stats.forEach(function (item) {
          var name = String((item && item.name) || '').trim();
          var value = Number(item && item.value);
          if (!name || !isFinite(value) || value <= 0) return;
          for (var i = 0; i < value; i++) pool.push(name);
        });
        return pool;
      }

      function buildSyntheticTasksFromDaily(dailyData, categoryData) {
        var taskCounts = Array.isArray(dailyData.taskCounts) ? dailyData.taskCounts : [];
        var dayKeys = buildDayKeysFromTrend(dailyData);
        var categoryPool = buildCategoryPool(categoryData);
        var tasks = [];
        var idx = 0;

        for (var i = 0; i < dayKeys.length; i++) {
          var count = Number(taskCounts[i] || 0);
          if (!isFinite(count) || count <= 0) continue;
          for (var j = 0; j < count; j++) {
            var label = categoryPool.length ? categoryPool[idx % categoryPool.length] : '未分类';
            var stamp = dayKeys[i] + 'T12:00:00.000Z';
            tasks.push(normalizeTask({
              id: 'report-task-' + i + '-' + j,
              title: 'report-task-' + (idx + 1),
              status: 'completed',
              completedAt: stamp,
              updatedAt: stamp,
              tags: [label],
              labels: [label]
            }));
            idx++;
          }
        }

        return tasks;
      }

      function buildSyntheticPomodorosFromDaily(dailyData) {
        var focusMinutes = Array.isArray(dailyData.focusMinutes) ? dailyData.focusMinutes : [];
        var dayKeys = buildDayKeysFromTrend(dailyData);
        var sessions = [];

        for (var i = 0; i < dayKeys.length; i++) {
          var minutes = Number(focusMinutes[i] || 0);
          if (!isFinite(minutes) || minutes <= 0) continue;
          var remaining = Math.max(1, Math.round(minutes));
          var count = Math.max(1, Math.round(remaining / 25));

          for (var j = 0; j < count; j++) {
            var segment = Math.max(1, Math.round(remaining / (count - j)));
            remaining -= segment;
            var hour = 8 + ((j % 8) * 2);
            var startedAt = dayKeys[i] + 'T' + String(hour).padStart(2, '0') + ':00:00.000Z';
            sessions.push(normalizePomo({
              id: 'report-pomo-' + i + '-' + j,
              startedAt: startedAt,
              completed: true,
              actualMinutes: segment,
              mode: 'focus'
            }));
          }
        }

        return sessions;
      }

      function updateChartsAndStats() {
        if (typeof updateWeeklyStats === 'function') {
          return updateWeeklyStats({ sync: false });
        }
        return Promise.resolve();
      }

      function syncReportStateFromServer() {
        if (typeof apiRequest !== 'function') {
          var err = new Error('apiRequest 不可用');
          window.__reportServerState = {
            tasks: [],
            pomodoroSessions: [],
            overview: null,
            ready: true,
            error: err.message,
            syncedAt: new Date().toISOString()
          };
          return Promise.reject(err);
        }

        var label = getReportRangeLabel();
        var range = mapLabelToReportRange(label);
        var date = new Date().toISOString().slice(0, 10);
        var query = { range: range, date: date };

        return Promise.all([
          apiRequest(buildQuery('/api/reports/overview', query), { method: 'GET', timeoutMs: 12000 }),
          apiRequest(buildQuery('/api/reports/daily-trend', query), { method: 'GET', timeoutMs: 12000 }),
          apiRequest(buildQuery('/api/reports/task-category', query), { method: 'GET', timeoutMs: 12000 })
        ]).then(function (responses) {
          var overviewData = unwrapResultData(responses[0], '/api/reports/overview');
          var dailyData = unwrapResultData(responses[1], '/api/reports/daily-trend');
          var categoryData = unwrapResultData(responses[2], '/api/reports/task-category');

          var tasks = buildSyntheticTasksFromDaily(dailyData, categoryData);
          var sessions = buildSyntheticPomodorosFromDaily(dailyData);

          window.__reportServerState = {
            tasks: tasks,
            pomodoroSessions: sessions,
            overview: overviewData,
            ready: true,
            error: null,
            syncedAt: new Date().toISOString()
          };
          window.__reportSyncNoop = false;
        }).catch(function (error) {
          window.__reportServerState = {
            tasks: [],
            pomodoroSessions: [],
            overview: null,
            ready: true,
            error: error && error.message ? error.message : '周报后端数据拉取失败',
            syncedAt: new Date().toISOString()
          };
          window.__reportSyncNoop = false;
          throw error;
        });
      }
    

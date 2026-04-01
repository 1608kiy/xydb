
      try { document.documentElement.classList.add('defer-unified-tab'); } catch (e) {}
      if (typeof checkAuthOnLoad === 'function') { checkAuthOnLoad().catch(function(){}); }
      window.__reportSyncNoop = true;
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

      function updateChartsAndStats() {
        var stats = getWeeklyStats();
        // update overview cards
        document.getElementById('completed-tasks').textContent = (stats.completedTasks || 0) + ' 项';
        document.getElementById('focus-hours').textContent = Math.round((stats.totalFocusMinutes || 0) / 60) + ' 小时';
        document.getElementById('pomodoro-count').textContent = (stats.totalPomodoros || 0) + ' 个';
        document.getElementById('max-continuous-pomodoros').textContent = (stats.maxContinuousPomodoros || 0) + ' 个番茄';
        document.getElementById('effectiveness-score').textContent = (stats.effectivenessScore || 0) + ' 分';

        // taskTrendChart: 每日完成任务数（周一..周日）
        if (window.taskTrendChart) {
          var weekStart = getWeekStart();
          var counts = [];
          for (var i = 0; i < 7; i++) {
            var d = new Date(weekStart);
            d.setDate(weekStart.getDate() + i);
            var key = d.toISOString().slice(0,10);
            var c = (AppState.tasks || []).filter(function(t){
              if (!t.updatedAt && !t.dueAt) return false;
              // treat tasks with status 'completed' and updatedAt in that day
              var d1 = t.updatedAt || t.completedAt || t.dueAt;
              if (!d1) return false;
              return d1.slice(0,10) === key && (t.status === 'completed' || (t.status && String(t.status).toLowerCase()==='completed'));
            }).length;
            counts.push(c);
          }
          window.taskTrendChart.setOption({ series:[{ data: counts }] });
        }

        // categoryPieChart: 本周各类任务数
        if (window.categoryPieChart) {
          var categories = {};
          (AppState.tasks || []).forEach(function(t){
            var labels = t.labels && t.labels.length ? t.labels : ['工作'];
            var label = labels[0];
            if (!categories[label]) categories[label] = 0;
            // 仅统计本周的任务
            var weekStart = getWeekStart();
            var weekEnd = getWeekEnd();
            var d = t.dueAt ? new Date(t.dueAt) : (t.updatedAt ? new Date(t.updatedAt) : null);
            if (!d) return;
            if (isDateInRange(d, weekStart, weekEnd)) categories[label]++;
          });
          var pieData = Object.keys(categories).map(function(k){ return { name: k, value: categories[k] }; });
          if (pieData.length === 0) pieData = [ { name: '工作', value: 0 } ];
          window.categoryPieChart.setOption({ series:[{ data: pieData }] });
        }

        // focusBarChart: 番茄数按周分布
        if (window.focusBarChart) {
          var weekPomos = (AppState.pomodoroSessions || []).filter(function(s){
            if (!s.startedAt) return false;
            var sd = new Date(s.startedAt);
            return isDateInRange(sd, getWeekStart(), getWeekEnd());
          });
          var dayCounts = [0,0,0,0,0,0,0];
          weekPomos.forEach(function(s){
            var sd = new Date(s.startedAt);
            var idx = (sd.getDay() + 6) % 7; // convert Sun..Sat to Mon..Sun index 0..6
            dayCounts[idx]++;
          });
          window.focusBarChart.setOption({ series:[{ data: dayCounts }] });
        }
      }

      function syncReportStateFromServer() {
        // 后端没有提供 /api/tasks 和 /api/pomodoros 接口，仅使用本地数据
        window.__reportSyncNoop = true;
        return Promise.resolve();
        // 本地数据已经及时编程加载到 AppState 中
      }
    

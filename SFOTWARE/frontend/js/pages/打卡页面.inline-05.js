
      var currentCalendarDate = new Date();
      
      // 设置今日日期文本
      (function () {
        var now = new Date();
        var options = {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'long'
        };
        var dateString = now.toLocaleDateString('zh-CN', options);
        var el = document.getElementById('today-date-text');
        if (el) el.textContent = '今天 · ' + dateString;
      })();

      // 动画辅助函数（需在 renderCalendar 之前定义，否则会导致事件绑定提前失败）
      function animateNumber(element, targetValue, suffix = '', duration = 800) {
        if (!element) return;
        var currentValue = element.textContent.trim();
        var startValue = parseInt(currentValue.replace(/[^\d]/g, '')) || 0;
        if (startValue === targetValue) return;
        var startTime = null;

        function animate(currentTime) {
          if (!startTime) startTime = currentTime;
          var progress = Math.min((currentTime - startTime) / duration, 1);
          var easeProgress = 1 - Math.pow(1 - progress, 3);
          var value = Math.floor(startValue + (targetValue - startValue) * easeProgress);
          element.textContent = value + suffix;
          if (progress < 1) {
            requestAnimationFrame(animate);
          }
        }
        requestAnimationFrame(animate);
      }

      function animatePercent(element, startValue, targetValue, duration = 600) {
        if (!element) return;
        if (startValue === targetValue) return;
        var startTime = null;

        function animate(currentTime) {
          if (!startTime) startTime = currentTime;
          var progress = Math.min((currentTime - startTime) / duration, 1);
          var currentValue = Math.floor(startValue + (targetValue - startValue) * progress);
          element.textContent = currentValue + '%';
          if (progress < 1) {
            requestAnimationFrame(animate);
          }
        }
        requestAnimationFrame(animate);
      }

      function updateTypeDistribution(distribution, total) {
        var types = {
          '学习': 'study',
          '运动': 'sport',
          '早起': 'wake',
          '阅读': 'read'
        };

        if (total === 0) {
          Object.keys(types).forEach(function (typeName) {
            var percentEl = document.querySelector('[data-type="' + types[typeName] + '-percent"]');
            var barEl = document.querySelector('[data-type="' + types[typeName] + '-bar"]');
            if (percentEl) percentEl.textContent = '0%';
            if (barEl) {
              barEl.style.width = '0%';
              barEl.style.transition = 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
            }
          });
          return;
        }

        Object.keys(types).forEach(function (typeName) {
          var count = distribution[typeName] || 0;
          var percent = Math.round((count / total) * 100);

          var percentEl = document.querySelector('[data-type="' + types[typeName] + '-percent"]');
          if (percentEl) {
            percentEl.textContent = percent + '%';
            animatePercent(percentEl, parseInt(percentEl.dataset.prev || 0), percent);
            percentEl.dataset.prev = percent;
          }

          var barEl = document.querySelector('[data-type="' + types[typeName] + '-bar"]');
          if (barEl) {
            barEl.style.width = percent + '%';
            barEl.style.transition = 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
          }
        });
      }

      // 获取指定月份的打卡统计数据
      function formatLocalDateKey(dateObj) {
        var y = dateObj.getFullYear();
        var m = String(dateObj.getMonth() + 1).padStart(2, '0');
        var d = String(dateObj.getDate()).padStart(2, '0');
        return y + '-' + m + '-' + d;
      }

      function parseLocalDateKey(dateValue) {
        if (!dateValue && dateValue !== 0) return null;
        if (dateValue instanceof Date) {
          if (isNaN(dateValue.getTime())) return null;
          return new Date(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate());
        }
        var text = String(dateValue).trim();
        var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
        if (m) {
          return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
        }
        var parsed = new Date(text);
        if (isNaN(parsed.getTime())) return null;
        return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
      }

      function getMonthCheckinStats(year, month) {
        var stats = {
          monthCheckins: 0,
          maxStreak: 0,
          currentStreak: 0,
          weekCheckins: 0,
          typeDistribution: {
            '学习': 0,
            '运动': 0,
            '早起': 0,
            '阅读': 0
          },
          totalCheckins: 0
        };
        
        if (!AppState.checkins || AppState.checkins.length === 0) {
          return stats;
        }
        
        var monthCheckins = AppState.checkins.filter(function(item) {
          var itemDate = parseLocalDateKey(item && item.date);
          return itemDate && itemDate.getFullYear() === year && itemDate.getMonth() === month;
        });
        
        stats.monthCheckins = monthCheckins.length;
        stats.totalCheckins = monthCheckins.length;
        
        monthCheckins.forEach(function(item) {
          if (stats.typeDistribution[item.type] !== undefined) {
            stats.typeDistribution[item.type]++;
          }
        });
        
        if (monthCheckins.length > 0) {
          var sortedDates = monthCheckins.map(function(item) {
            return parseLocalDateKey(item.date);
          }).filter(function(d) {
            return !!d;
          }).sort(function(a, b) {
            return a - b;
          });
          
          var currentStreak = 1;
          var maxStreak = 1;
          
          for (var i = 1; i < sortedDates.length; i++) {
            var diffTime = sortedDates[i].getTime() - sortedDates[i-1].getTime();
            var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
              currentStreak++;
              maxStreak = Math.max(maxStreak, currentStreak);
            } else {
              currentStreak = 1;
            }
          }
          
          stats.maxStreak = maxStreak;
        }
        
        var today = new Date();
        var isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
        
        if (isCurrentMonth && monthCheckins.length > 0) {
          var sortedDates = monthCheckins.map(function(item) {
            return parseLocalDateKey(item.date);
          }).filter(function(d) {
            return !!d;
          }).sort(function(a, b) {
            return b - a;
          });
          
          var expectedDate = new Date(today);
          expectedDate.setHours(0, 0, 0, 0);
          
          var streak = 0;
          for (var i = 0; i < sortedDates.length; i++) {
            var checkDate = sortedDates[i];
            checkDate.setHours(0, 0, 0, 0);
            
            var diffTime = expectedDate.getTime() - checkDate.getTime();
            var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 0 || diffDays === 1) {
              streak++;
              expectedDate = checkDate;
              expectedDate.setDate(expectedDate.getDate() - 1);
            } else {
              break;
            }
          }
          
          stats.currentStreak = streak;
        }
        
        if (isCurrentMonth) {
          var weekStart = new Date(today);
          weekStart.setDate(weekStart.getDate() - 7);
          
          stats.weekCheckins = AppState.checkins.filter(function(item) {
            var itemDate = parseLocalDateKey(item && item.date);
            return itemDate && itemDate >= weekStart && itemDate <= today;
          }).length;
        }
        
        return stats;
      }

      // 生成本月简单打卡日历并更新统计
      function renderCalendar(date, navDirection) {
        var container = document.getElementById('checkin-calendar');
        if (!container) return;

        var year = date.getFullYear();
        var month = date.getMonth();
        var firstDay = new Date(year, month, 1);
        var startWeekday = (firstDay.getDay() + 6) % 7;
        var daysInMonth = new Date(year, month + 1, 0).getDate();
        var today = new Date();
        var isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
        var checkToday = isCurrentMonth ? today.getDate() : -1;

        var animClass = 'calendar-enter-fade';
        if (navDirection === 'prev') {
          animClass = 'calendar-enter-prev';
        } else if (navDirection === 'next') {
          animClass = 'calendar-enter-next';
        }

        var html = '';
        html += '<div class="calendar-month-viewport ' + animClass + '">';
        html += '<div class="grid grid-cols-7 gap-1 text-center mb-1 text-[11px] text-gray-500 font-semibold">';
        ['一', '二', '三', '四', '五', '六', '日'].forEach(function (d) {
          html += '<div>' + d + '</div>';
        });
        html += '</div>';
        html += '<div class="grid grid-cols-7 gap-1 text-[11px]">';

        for (var i = 0; i < startWeekday; i++) {
          html += '<div class="calendar-day empty"></div>';
        }
        for (var day = 1; day <= daysInMonth; day++) {
          var monthStr = String(month + 1).padStart(2, '0');
          var dayStr = String(day).padStart(2, '0');
          var dateKey = year + '-' + monthStr + '-' + dayStr;
          var isChecked = AppState.checkins && AppState.checkins.some(function(c) { return c.date === dateKey; });
          var isToday = isCurrentMonth && day === checkToday;
          var cls = 'calendar-day';
          if (isToday) {
            cls += ' today';
          } else if (isChecked) {
            cls += ' checked';
          } else {
            cls += ' empty';
          }
          html += '<div class="' + cls + '">';
          html += '<div>' + day + '</div>';
          if (isToday) {
            html += '<div class="text-[9px] mt-0.5">今日</div>';
          } else if (isChecked) {
            html += '<div class="w-1.5 h-1.5 rounded-full bg-teal-500 mt-0.5 animate-pulse"></div>';
          }
          html += '</div>';
        }
        html += '</div>';
        html += '</div>';
        container.innerHTML = html;
        
        var titleEl = document.getElementById('calendar-title');
        if (titleEl) {
          if (isCurrentMonth) {
            titleEl.textContent = '本月打卡日历';
          } else {
            titleEl.textContent = year + '年' + (month + 1) + '月打卡日历';
          }
        }
        
        var periodEl = document.getElementById('distribution-period');
        if (periodEl) {
          if (isCurrentMonth) {
            periodEl.textContent = '本月';
          } else {
            periodEl.textContent = year + '年' + (month + 1) + '月';
          }
        }
        
        updateStatisticsForMonth(year, month);
      }

      // 更新指定月份的统计数据
      function updateStatisticsForMonth(year, month) {
        var stats = getMonthCheckinStats(year, month);
        
        var monthEl = document.getElementById('month-days');
        if (monthEl) animateNumber(monthEl, stats.monthCheckins);
        
        var maxEl = document.getElementById('max-streak');
        if (maxEl) animateNumber(maxEl, stats.maxStreak);
        
        var currentEl = document.getElementById('current-streak');
        if (currentEl) animateNumber(currentEl, stats.currentStreak);
        
        var weekEl = document.getElementById('week-count');
        if (weekEl) animateNumber(weekEl, stats.weekCheckins);
        
        var streakDaysEl = document.getElementById('streak-days');
        if (streakDaysEl && year === new Date().getFullYear() && month === new Date().getMonth()) {
          animateNumber(streakDaysEl, stats.currentStreak);
        }
        
        updateTypeDistribution(stats.typeDistribution, stats.totalCheckins);
      }

      // 初始化日历
      renderCalendar(currentCalendarDate);

      // 月份切换
      var prevBtn = document.getElementById('prev-month');
      var nextBtn = document.getElementById('next-month');
      
      if (prevBtn) {
        prevBtn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
          renderCalendar(currentCalendarDate, 'prev');
        });
      }
      
      if (nextBtn) {
        nextBtn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
          renderCalendar(currentCalendarDate, 'next');
        });
      }

      AppState.init();
      renderHeader('checkin');
      renderFooter('checkin');
      bindGlobalLogout();

      (function () {
        var btn = document.getElementById('checkin-btn');
        var status = document.getElementById('checkin-status');
        var list = document.getElementById('checkin-list');
        var noteInput = document.getElementById('checkin-note');
        var clearBtn = document.getElementById('clear-history');
        var clearHistoryModal = document.getElementById('clear-history-modal');
        var cancelClearHistoryBtn = document.getElementById('cancel-clear-history-btn');
        var confirmClearHistoryBtn = document.getElementById('confirm-clear-history-btn');
        var selectedType = '学习';

        function closeClearHistoryModal() {
          if (!clearHistoryModal) return;
          clearHistoryModal.classList.remove('show');
          clearHistoryModal.setAttribute('aria-hidden', 'true');
        }

        function performClearHistory() {
          AppState.checkins = [];
          AppState.save();
          renderCheckins();
          updateStreak();
          renderCalendar(currentCalendarDate);

          if (btn) {
            btn.disabled = false;
            btn.classList.remove('opacity-50', 'cursor-not-allowed');
          }
          status.textContent = '今日尚未打卡';
          status.className = 'text-[11px] text-gray-500 text-center';

          showToast('打卡记录已清空');
        }

        function openClearHistoryModal() {
          var hasCheckins = Array.isArray(AppState.checkins) && AppState.checkins.length > 0;
          if (!hasCheckins) {
            showToast('暂无打卡记录可删除', 'error');
            return;
          }
          if (!clearHistoryModal) {
            performClearHistory();
            return;
          }
          clearHistoryModal.classList.add('show');
          clearHistoryModal.setAttribute('aria-hidden', 'false');
        }

        function normalizeCheckinItem(item, fallbackDate, fallbackTime) {
          var source = item || {};
          var dateObj = parseLocalDateKey(source.date) || parseLocalDateKey(source.createdAt) || new Date();
          var normalizedDate = formatLocalDateKey(dateObj);
          var normalizedTime = source.time;
          if (!normalizedTime) {
            if (source.createdAt) {
              try {
                normalizedTime = new Date(source.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
              } catch (e) {
                normalizedTime = '';
              }
            }
            if (!normalizedTime) normalizedTime = fallbackTime || '';
          }
          return {
            id: source.id || generateId('c'),
            date: normalizedDate || fallbackDate,
            time: normalizedTime,
            type: source.type || selectedType,
            note: source.note || '',
            status: source.status || '今日',
            createdAt: source.createdAt
          };
        }

        function upsertCheckinByDate(item) {
          if (!item || !item.date) return;
          if (!Array.isArray(AppState.checkins)) AppState.checkins = [];
          var index = AppState.checkins.findIndex(function(c) { return c && c.date === item.date; });
          if (index >= 0) {
            AppState.checkins[index] = Object.assign({}, AppState.checkins[index], item);
          } else {
            AppState.checkins.push(item);
          }
        }
        var typeButtons = document.querySelectorAll('.type-btn');
        typeButtons.forEach(function (b) {
          b.addEventListener('click', function () {
            typeButtons.forEach(function (x) { 
              x.classList.remove('selected'); 
            });
            this.classList.add('selected');
            selectedType = this.getAttribute('data-type') || '学习';
          });
        });

        function renderCheckins() {
          list.innerHTML = '';
          if (!AppState.checkins || AppState.checkins.length === 0) {
            list.innerHTML = '<li class="text-center text-gray-400 py-4 text-xs">暂无打卡记录</li>';
            return;
          }
          AppState.checkins.slice().reverse().forEach(function (item) {
            var li = document.createElement('li');
            li.className = 'flex items-start justify-between px-3 py-2 rounded-lg bg-gray-50/50 hover:bg-gray-100/50 transition-colors';
            li.innerHTML = '<div><div class="text-gray-800 mb-0.5 font-medium">' + item.time + '</div><div class="text-gray-600"><span class="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] mr-2">' + item.type + '</span>' + item.note + '</div></div><span class="text-[11px] text-success mt-0.5 font-medium">' + item.status + '</span>';
            list.appendChild(li);
          });
        }

        function updateStreak() {
          var streakEl = document.getElementById('streak-days');
          if (!streakEl) return;
          var today = new Date();
          var streak = 0;
          var date = new Date(today);
          while (true) {
            var key = formatLocalDateKey(date);
            if (AppState.checkins && AppState.checkins.some((c) => c.date === key)) {
              streak += 1;
              date.setDate(date.getDate() - 1);
            } else {
              break;
            }
          }
          streakEl.textContent = String(streak);
        }

        function updateCheckinStatistics() {
          var stats = getCheckinStats();
          
          var monthEl = document.getElementById('month-days');
          if (monthEl) animateNumber(monthEl, stats.monthCheckins);
          
          var maxEl = document.getElementById('max-streak');
          if (maxEl) animateNumber(maxEl, stats.maxStreak);
          
          var currentEl = document.getElementById('current-streak');
          if (currentEl) animateNumber(currentEl, stats.currentStreak);
          
          var weekEl = document.getElementById('week-count');
          if (weekEl) animateNumber(weekEl, stats.weekCheckins);
          
          var streakDaysEl = document.getElementById('streak-days');
          if (streakDaysEl) animateNumber(streakDaysEl, stats.currentStreak);
          
          updateTypeDistribution(stats.typeDistribution, stats.totalCheckins);
        }

        function updateTodayDateLabel() {
          var todayText = document.getElementById('today-date-text');
          if (todayText) {
            var now = new Date();
            var options = {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long'
            };
            todayText.textContent = '今天 · ' + now.toLocaleDateString('zh-CN', options);
          }
        }

        function checkTodayChecked() {
          var today = formatLocalDateKey(new Date());
          if (AppState.checkins && AppState.checkins.some(c => c.date === today)) {
            status.textContent = '今日已打卡 ✓';
            status.className = 'text-[11px] text-success text-center font-medium';
            if (btn) btn.disabled = true;
            if (btn) btn.classList.add('opacity-50', 'cursor-not-allowed');
          }
        }

        if (!btn || !status || !list) return;

        btn.addEventListener('click', function () {
          if (btn.disabled) return;

          var note = (noteInput && noteInput.value.trim()) || '今日已坚持打卡一次';
          var now = new Date();
          var dateStr = formatLocalDateKey(now);
          var timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

          // 乐观更新：先禁用按钮，随后尝试同步到后端，失败回退到本地保存
          btn.disabled = true;
          btn.classList.add('opacity-50', 'cursor-not-allowed');

          apiRequest('/api/checkins', {
            method: 'POST',
            body: JSON.stringify({ date: dateStr, time: timeStr, type: selectedType, note: note })
          }).then(function (resp) {
            if (resp && resp.status === 200 && resp.body && resp.body.code === 200) {
              var saved = resp.body.data;
              if (saved) {
                // Normalize server record for UI: provide `time` and `status` fields
                if (!saved.time && saved.createdAt) {
                  try {
                    var d = new Date(saved.createdAt);
                    saved.time = d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
                  } catch (e) {
                    saved.time = timeStr;
                  }
                }
                saved.status = saved.status || '今日';
                upsertCheckinByDate(normalizeCheckinItem(saved, dateStr, timeStr));
              } else {
                upsertCheckinByDate(normalizeCheckinItem({ date: dateStr, time: timeStr, type: selectedType, note: note, status: '今日' }, dateStr, timeStr));
              }
              AppState.save();

              showToast('打卡成功 🎉');
              renderCheckins();
              updateStreak();
              renderCalendar(currentCalendarDate);

              status.textContent = '今日已打卡 ✓';
              status.className = 'text-[11px] text-success text-center font-medium';
              if (noteInput) noteInput.value = '';
            } else {
              // 服务端返回异常，保存到本地
              upsertCheckinByDate(normalizeCheckinItem({ date: dateStr, time: timeStr, type: selectedType, note: note, status: '今日' }, dateStr, timeStr));
              AppState.save();
              showToast('网络异常，已保存本地记录', 'error');
              renderCheckins();
              updateStreak();
              renderCalendar(currentCalendarDate);
              status.textContent = '今日已打卡 ✓';
              status.className = 'text-[11px] text-success text-center font-medium';
            }
          }).catch(function (err) {
            console.error('保存打卡失败', err);
            upsertCheckinByDate(normalizeCheckinItem({ date: dateStr, time: timeStr, type: selectedType, note: note, status: '今日' }, dateStr, timeStr));
            AppState.save();
            showToast('网络错误，已保存本地记录', 'error');
            renderCheckins();
            updateStreak();
            renderCalendar(currentCalendarDate);
            status.textContent = '今日已打卡 ✓';
            status.className = 'text-[11px] text-success text-center font-medium';
          });
        });

        if (clearBtn) {
          clearBtn.addEventListener('click', function () {
            openClearHistoryModal();
          });
        }

        if (cancelClearHistoryBtn) {
          cancelClearHistoryBtn.addEventListener('click', closeClearHistoryModal);
        }
        if (confirmClearHistoryBtn) {
          confirmClearHistoryBtn.addEventListener('click', function () {
            closeClearHistoryModal();
            performClearHistory();
          });
        }
        if (clearHistoryModal) {
          clearHistoryModal.addEventListener('click', function (e) {
            if (e.target === clearHistoryModal) closeClearHistoryModal();
          });
        }
        document.addEventListener('keydown', function (e) {
          if (e.key === 'Escape' && clearHistoryModal && clearHistoryModal.classList.contains('show')) {
            closeClearHistoryModal();
          }
        });

        // 优先从服务端拉取打卡数据并渲染，失败则使用本地数据回退
        function fetchCheckinsFromServer() {
          return apiRequest('/api/checkins/recent', { method: 'GET' }).then(function (resp) {
            if (resp && resp.status === 200 && resp.body && resp.body.code === 200) {
              var data = resp.body.data;
              if (Array.isArray(data)) {
                AppState.checkins = data;
              } else if (data && Array.isArray(data.checkins)) {
                AppState.checkins = data.checkins;
              }
              // Normalize items: ensure `time` and `status` exist for UI
              var dateMap = {};
              (AppState.checkins || []).forEach(function(item) {
                var normalized = normalizeCheckinItem(item);
                var existing = dateMap[normalized.date];
                if (!existing) {
                  dateMap[normalized.date] = normalized;
                  return;
                }
                var existingStamp = existing.createdAt ? new Date(existing.createdAt).getTime() : 0;
                var incomingStamp = normalized.createdAt ? new Date(normalized.createdAt).getTime() : 0;
                if (incomingStamp >= existingStamp) {
                  dateMap[normalized.date] = normalized;
                }
              });
              AppState.checkins = Object.keys(dateMap).sort().map(function(key) {
                return dateMap[key];
              });
              AppState.save();
              renderCheckins();
              updateStreak();
              updateTodayDateLabel();
              checkTodayChecked();
              updateCheckinStatistics();
              return Promise.resolve();
            } else {
              return Promise.reject(new Error('获取打卡数据失败'));
            }
          }).catch(function (err) {
            console.warn('fetchCheckinsFromServer error', err);
            return Promise.reject(err);
          });
        }

        fetchCheckinsFromServer().catch(function () {
          // 回退到本地数据渲染
          renderCheckins();
          updateStreak();
          updateTodayDateLabel();
          checkTodayChecked();
          updateCheckinStatistics();
        });
      })();
    

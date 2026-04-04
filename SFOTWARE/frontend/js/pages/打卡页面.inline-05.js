
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
        pulseMetric(element);
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

      function restartClassAnimation(element, className, duration) {
        if (!element || !className) return;
        element.classList.remove(className);
        void element.offsetWidth;
        element.classList.add(className);
        if (!duration) return;
        if (!element.__classTimers) element.__classTimers = {};
        if (element.__classTimers[className]) {
          clearTimeout(element.__classTimers[className]);
        }
        element.__classTimers[className] = window.setTimeout(function () {
          element.classList.remove(className);
        }, duration);
      }

      function pulseMetric(element) {
        if (!element) return;
        var statCard = element.closest('.summary-stat');
        if (statCard) {
          restartClassAnimation(statCard, 'value-pop', 620);
        }
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
            restartClassAnimation(barEl, 'progress-ignite', 700);
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

      function getMonthStart(dateValue) {
        var dateObj = parseLocalDateKey(dateValue) || new Date();
        return new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
      }

      function isSameCalendarMonth(a, b) {
        if (!a || !b) return false;
        return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
      }

      function getEarliestCheckinMonth() {
        var fallback = getMonthStart(new Date());
        if (!Array.isArray(AppState.checkins) || AppState.checkins.length === 0) {
          return fallback;
        }

        var earliest = null;
        AppState.checkins.forEach(function(item) {
          var itemDate = parseLocalDateKey(item && item.date);
          if (!itemDate) return;
          var monthStart = new Date(itemDate.getFullYear(), itemDate.getMonth(), 1);
          if (!earliest || monthStart.getTime() < earliest.getTime()) {
            earliest = monthStart;
          }
        });

        return earliest || fallback;
      }

      function getCurrentStreakDateKeys() {
        var keys = {};
        if (!Array.isArray(AppState.checkins) || AppState.checkins.length === 0) {
          return keys;
        }

        var uniqueDates = {};
        AppState.checkins.forEach(function(item) {
          var itemDate = parseLocalDateKey(item && item.date);
          if (!itemDate) return;
          uniqueDates[formatLocalDateKey(itemDate)] = true;
        });

        var cursor = parseLocalDateKey(new Date());
        while (cursor) {
          var key = formatLocalDateKey(cursor);
          if (!uniqueDates[key]) break;
          keys[key] = true;
          cursor.setDate(cursor.getDate() - 1);
        }

        return keys;
      }

      function updateCalendarNavState() {
        var prevButton = document.getElementById('prev-month');
        if (!prevButton) return;

        var earliestMonth = getEarliestCheckinMonth();
        var currentMonth = getMonthStart(currentCalendarDate);
        var isAtEarliest = currentMonth.getTime() <= earliestMonth.getTime();

        prevButton.disabled = isAtEarliest;
        prevButton.classList.toggle('is-disabled', isAtEarliest);
        prevButton.classList.toggle('text-gray-500', isAtEarliest);
        prevButton.classList.toggle('text-gray-700', !isAtEarliest);
        prevButton.setAttribute('aria-disabled', isAtEarliest ? 'true' : 'false');
        prevButton.title = isAtEarliest ? '没有更早的记录了' : '查看上月';
      }

      function bindInteractiveGlowEffects() {
        var glowElements = document.querySelectorAll('.interactive-glow');
        glowElements.forEach(function(element) {
          if (element.dataset.glowBound === 'true') return;
          element.dataset.glowBound = 'true';

          element.addEventListener('pointerenter', function () {
            element.classList.add('is-active');
          });

          element.addEventListener('pointermove', function (event) {
            var rect = element.getBoundingClientRect();
            if (!rect.width || !rect.height) return;
            var x = ((event.clientX - rect.left) / rect.width) * 100;
            var y = ((event.clientY - rect.top) / rect.height) * 100;
            element.style.setProperty('--mx', x + '%');
            element.style.setProperty('--my', y + '%');
          });

          element.addEventListener('pointerleave', function () {
            element.classList.remove('is-active');
            element.style.setProperty('--mx', '50%');
            element.style.setProperty('--my', '50%');
          });
        });
      }

      function bindDepthTiltEffects() {
        var allowTilt = true;
        if (window.matchMedia) {
          allowTilt = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
        }

        var depthCards = document.querySelectorAll('.depth-card');
        depthCards.forEach(function(card) {
          if (card.dataset.depthBound === 'true') return;
          card.dataset.depthBound = 'true';

          if (!allowTilt) return;

          card.addEventListener('pointermove', function (event) {
            var rect = card.getBoundingClientRect();
            if (!rect.width || !rect.height) return;
            var offsetX = (event.clientX - rect.left) / rect.width;
            var offsetY = (event.clientY - rect.top) / rect.height;
            var rotateY = ((offsetX - 0.5) * 9).toFixed(2);
            var rotateX = ((0.5 - offsetY) * 8).toFixed(2);
            card.style.setProperty('--depth-ry', rotateY + 'deg');
            card.style.setProperty('--depth-rx', rotateX + 'deg');
          });

          card.addEventListener('pointerleave', function () {
            card.style.setProperty('--depth-ry', '0deg');
            card.style.setProperty('--depth-rx', '0deg');
          });
        });
      }

      function setupRevealCards() {
        var cards = Array.prototype.slice.call(document.querySelectorAll('.reveal-card'));
        if (!cards.length) return;

        cards.forEach(function(card, index) {
          card.dataset.revealDelay = String(Math.min(index * 70, 280));
        });

        if (!('IntersectionObserver' in window)) {
          cards.forEach(function(card) {
            card.style.animationDelay = (card.dataset.revealDelay || 0) + 'ms';
            card.classList.add('is-visible');
          });
          return;
        }

        var observer = new IntersectionObserver(function(entries) {
          entries.forEach(function(entry) {
            if (!entry.isIntersecting) return;
            entry.target.style.animationDelay = (entry.target.dataset.revealDelay || 0) + 'ms';
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          });
        }, {
          threshold: 0.14,
          rootMargin: '0px 0px -30px 0px'
        });

        cards.forEach(function(card) {
          observer.observe(card);
        });
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
        var streakDateKeys = getCurrentStreakDateKeys();
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
          var isStreakDay = !!streakDateKeys[dateKey];
          var isToday = isCurrentMonth && day === checkToday;
          var cls = 'calendar-day';
          if (isToday) {
            cls += ' today';
          } else if (isChecked) {
            cls += ' checked';
            if (isStreakDay) cls += ' checked-streak';
          } else {
            cls += ' empty';
          }
          html += '<div class="' + cls + '">';
          html += '<div>' + day + '</div>';
          if (isToday) {
            html += '<div class="text-[9px] mt-0.5">今日</div>';
          } else if (isChecked) {
            html += '<div class="calendar-day-indicator ' + (isStreakDay ? 'outline' : 'solid') + '"></div>';
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

        updateCalendarNavState();
        updateStatisticsForMonth(year, month);
      }

      // 更新指定月份的统计数据
      function updateStatisticsForMonth(year, month) {
        var stats = getMonthCheckinStats(year, month);

        var periodEl = document.getElementById('distribution-period');
        if (periodEl) {
          if (isSameCalendarMonth(new Date(year, month, 1), new Date())) {
            periodEl.textContent = '本月';
          } else {
            periodEl.textContent = year + '年' + (month + 1) + '月';
          }
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
          if (prevBtn.disabled) return;
          e.preventDefault();
          e.stopPropagation();
          currentCalendarDate = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() - 1, 1);
          renderCalendar(currentCalendarDate, 'prev');
        });
      }
      
      if (nextBtn) {
        nextBtn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          currentCalendarDate = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 1);
          renderCalendar(currentCalendarDate, 'next');
        });
      }

      AppState.init();
      renderHeader('checkin');
      renderFooter('checkin');
      bindGlobalLogout();
      setupRevealCards();
      bindInteractiveGlowEffects();
      bindDepthTiltEffects();

      (function () {
        var btn = document.getElementById('checkin-btn');
        var list = document.getElementById('checkin-list');
        var noteInput = document.getElementById('checkin-note');
        var formPanel = document.getElementById('checkin-form-panel');
        var successPanel = document.getElementById('checkin-success-panel');
        var successTitle = document.getElementById('checkin-success-title');
        var successSummary = document.getElementById('checkin-success-summary');
        var clearBtn = document.getElementById('clear-history');
        var emptyState = document.getElementById('checkin-empty-state');
        var emptyCta = document.getElementById('empty-checkin-cta');
        var todayCard = document.getElementById('today-checkin-card');
        var clearHistoryModal = document.getElementById('clear-history-modal');
        var cancelClearHistoryBtn = document.getElementById('cancel-clear-history-btn');
        var confirmClearHistoryBtn = document.getElementById('confirm-clear-history-btn');
        var enableLocalFallback = !document.body.classList.contains('software-app');
        var selectedType = '学习';
        var typeButtons = Array.prototype.slice.call(document.querySelectorAll('.type-btn'));
        var refreshAiBtn = document.getElementById('refresh-ai-suggestions');
        var aiSourceBadge = document.getElementById('ai-source-badge');
        var aiScopeText = document.getElementById('ai-scope-text');
        var aiLoadingState = document.getElementById('ai-loading-state');
        var aiInsightContent = document.getElementById('ai-insight-content');
        var aiPriorityChip = document.getElementById('ai-priority-chip');
        var aiLastUpdated = document.getElementById('ai-last-updated');
        var aiSummaryTitle = document.getElementById('ai-summary-title');
        var aiSummaryText = document.getElementById('ai-summary-text');
        var aiCurrentStreakMetric = document.getElementById('ai-current-streak');
        var aiWeeklyVolumeMetric = document.getElementById('ai-weekly-volume');
        var aiFocusTypeMetric = document.getElementById('ai-focus-type');
        var aiSuggestionList = document.getElementById('ai-suggestion-list');
        var aiConnectionStatus = document.getElementById('ai-connection-status');
        var aiRequestToken = 0;

        function spawnButtonRipple(button, event) {
          if (!button || !event) return;
          var rect = button.getBoundingClientRect();
          var localX = event.clientX ? (event.clientX - rect.left) : (rect.width / 2);
          var localY = event.clientY ? (event.clientY - rect.top) : (rect.height / 2);
          var ripple = document.createElement('span');
          ripple.className = 'checkin-btn-ripple';
          ripple.style.left = localX + 'px';
          ripple.style.top = localY + 'px';
          button.appendChild(ripple);
          window.setTimeout(function () {
            ripple.remove();
          }, 760);
        }

        function bindEnergyButtonEffects(button) {
          if (!button || button.dataset.energyBound === 'true') return;
          button.dataset.energyBound = 'true';

          button.addEventListener('pointermove', function (event) {
            var rect = button.getBoundingClientRect();
            if (!rect.width || !rect.height) return;
            button.style.setProperty('--btn-x', (event.clientX - rect.left) + 'px');
            button.style.setProperty('--btn-y', (event.clientY - rect.top) + 'px');
          });

          button.addEventListener('pointerleave', function () {
            button.style.setProperty('--btn-x', '50%');
            button.style.setProperty('--btn-y', '50%');
          });
        }

        function celebrateHeroCard() {
          if (!todayCard) return;
          restartClassAnimation(todayCard, 'hero-celebrate', 900);
        }

        function escapeHtml(text) {
          return String(text || '').replace(/[&<>"']/g, function (char) {
            return {
              '&': '&amp;',
              '<': '&lt;',
              '>': '&gt;',
              '"': '&quot;',
              "'": '&#39;'
            }[char];
          });
        }

        function getNoteSummary(note) {
          var text = String(note || '').replace(/\s+/g, ' ').trim();
          return text || '今日已坚持打卡一次';
        }

        function isAiRemoteEnabled() {
          return !!(window.AiService && window.__ENABLE_CHECKIN_AI__ === true);
        }

        function getRelativeTimeText(dateValue) {
          if (!dateValue) return '刚刚更新';
          var diff = Math.max(0, Date.now() - dateValue.getTime());
          if (diff < 60 * 1000) return '刚刚更新';
          if (diff < 60 * 60 * 1000) return Math.round(diff / (60 * 1000)) + ' 分钟前';
          return dateValue.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) + ' 更新';
        }

        function getDominantType(distribution) {
          var winner = '学习';
          var maxCount = -1;
          Object.keys(distribution || {}).forEach(function(typeName) {
            var count = distribution[typeName] || 0;
            if (count > maxCount) {
              winner = typeName;
              maxCount = count;
            }
          });
          return winner;
        }

        function countRecentCheckins(days) {
          var now = parseLocalDateKey(new Date());
          var start = parseLocalDateKey(new Date());
          start.setDate(start.getDate() - Math.max(days - 1, 0));
          return getSortedCheckins().filter(function(item) {
            var itemDate = parseLocalDateKey(item && item.date);
            return itemDate && itemDate >= start && itemDate <= now;
          }).length;
        }

        function buildCheckinInsightContext() {
          var stats = getCheckinStats();
          var sortedCheckins = getSortedCheckins();
          var latest = sortedCheckins.length ? sortedCheckins[sortedCheckins.length - 1] : null;
          var recentWeekCount = countRecentCheckins(7);
          var dominantType = getDominantType(stats.typeDistribution || {});

          return {
            stats: stats,
            sortedCheckins: sortedCheckins,
            totalCheckins: sortedCheckins.length,
            latest: latest,
            recentWeekCount: recentWeekCount,
            dominantType: dominantType,
            latestNote: latest ? getNoteSummary(latest.note) : '',
            latestDate: latest ? parseLocalDateKey(latest.date) : null
          };
        }

        function sanitizeAiPayload(payload, context) {
          var fallbackMetrics = {
            currentStreak: (context.stats.currentStreak || 0) + '天',
            weeklyVolume: (context.recentWeekCount || 0) + '次',
            focusType: context.dominantType || '学习'
          };

          var suggestions = Array.isArray(payload && payload.suggestions) ? payload.suggestions : [];
          suggestions = suggestions.slice(0, 3).map(function(item, index) {
            return {
              title: item && item.title ? String(item.title) : '建议 ' + String(index + 1).padStart(2, '0'),
              tag: item && item.tag ? String(item.tag) : '打卡优化',
              text: item && item.text ? String(item.text) : '继续保持记录节奏，把今天的动作落到一个可执行的小步骤里。'
            };
          });

          if (!suggestions.length) {
            suggestions = [{
              title: '保持今天的记录动作',
              tag: '基础节奏',
              text: '先完成今天这一次记录，让习惯的触发和完成形成闭环。'
            }];
          }

          return {
            source: payload && payload.source === 'remote' ? 'remote' : 'local',
            priority: payload && payload.priority ? String(payload.priority) : '优先优化',
            summaryTitle: payload && payload.summaryTitle ? String(payload.summaryTitle) : '先把打卡节奏稳定下来',
            summaryText: payload && payload.summaryText ? String(payload.summaryText) : '让打卡持续发生，比一下子把目标拉得很高更重要。',
            metrics: Object.assign({}, fallbackMetrics, payload && payload.metrics ? payload.metrics : {}),
            suggestions: suggestions
          };
        }

        function generateLocalAiPayload(context) {
          if (!context.totalCheckins) {
            return sanitizeAiPayload({
              source: 'local',
              priority: '开始建立',
              summaryTitle: '先完成第一条可持续的打卡轨迹',
              summaryText: '当你还没有形成记录时，最重要的不是做很多，而是先建立一个每天都能触发的最小动作。',
              metrics: {
                currentStreak: '0天',
                weeklyVolume: '0次',
                focusType: '待开始'
              },
              suggestions: [
                {
                  title: '先锁定一个最容易做到的类型',
                  tag: '启动',
                  text: '从学习、运动、早起、阅读里先选一个最容易坚持的方向，降低开始成本。'
                },
                {
                  title: '给打卡绑定固定时机',
                  tag: '触发点',
                  text: '比如晚饭后、睡前或开始学习前，给打卡一个明确的触发时刻。'
                },
                {
                  title: '第一周只追求连续，不追求量',
                  tag: '连贯性',
                  text: '先让动作连续出现 3 到 5 天，比一开始就追求强度更容易进入状态。'
                }
              ]
            }, context);
          }

          var stats = context.stats;
          var dominantType = context.dominantType || '学习';
          var summaryTitle = '把打卡时间固定下来，习惯会更稳';
          var summaryText = '你已经在记录，但目前最值得优化的是触发时机，让打卡变成不用思考也会发生的动作。';
          var priority = '节奏优先';

          if (stats.currentStreak >= 4) {
            priority = '放大优势';
            summaryTitle = '你已经进入连续区间，可以开始加一点质量';
            summaryText = '当前连续打卡表现不错，下一步更适合把记录写得更具体，让之后的 AI 建议更有针对性。';
          } else if (context.recentWeekCount <= 2) {
            priority = '提频率';
            summaryTitle = '先把本周打卡频率拉回稳定区间';
            summaryText = '近 7 天记录偏少，先把一周频率恢复到 3 次以上，会比加目标强度更有效。';
          } else if (context.latestNote && context.latestNote.length < 10) {
            priority = '补信息';
            summaryTitle = '让每次打卡多一点细节，后续 AI 会更懂你';
            summaryText = '记录已经开始形成，但内容信息量偏少。多写一点动作、时长和结果，会让后续 AI 分析更精准。';
          }

          return sanitizeAiPayload({
            source: 'local',
            priority: priority,
            summaryTitle: summaryTitle,
            summaryText: summaryText,
            metrics: {
              currentStreak: (stats.currentStreak || 0) + '天',
              weeklyVolume: (context.recentWeekCount || 0) + '次',
              focusType: dominantType
            },
            suggestions: [
              {
                title: '给 ' + dominantType + ' 打卡设固定触发点',
                tag: '习惯节奏',
                text: '把当前最常做的「' + dominantType + '」绑定到每天固定时段，能最快提升连续性。'
              },
              {
                title: '把记录写成“动作 + 数量 + 感受”',
                tag: '数据质量',
                text: '例如“阅读 20 分钟，完成 12 页，注意力比昨天更稳”，后续 AI API 就能给出更细的复盘建议。'
              },
              {
                title: '为下一次打卡提前留一个小目标',
                tag: '下一步',
                text: '每次记录结束时顺手写下明天最小行动，比如“只读 10 分钟”或“先热身 5 分钟”，更容易延续。'
              }
            ]
          }, context);
        }

        function buildAiMessages(context) {
          return [
            {
              role: 'system',
              content: '你是一名习惯养成教练。请根据用户的打卡数据输出 JSON：{"priority":"","summaryTitle":"","summaryText":"","metrics":{"currentStreak":"","weeklyVolume":"","focusType":""},"suggestions":[{"title":"","tag":"","text":""}]}。语气简洁、具体、可执行，suggestions 返回 3 条。'
            },
            {
              role: 'user',
              content: JSON.stringify({
                currentStreak: context.stats.currentStreak || 0,
                maxStreak: context.stats.maxStreak || 0,
                monthCheckins: context.stats.monthCheckins || 0,
                recentWeekCount: context.recentWeekCount || 0,
                dominantType: context.dominantType || '学习',
                latestNote: context.latestNote || '',
                totalCheckins: context.totalCheckins || 0
              })
            }
          ];
        }

        function requestAiPayload(context) {
          if (!isAiRemoteEnabled()) {
            return Promise.resolve(generateLocalAiPayload(context));
          }

          return window.AiService.chat(buildAiMessages(context), {
            temperature: 0.4,
            maxTokens: 600
          }).then(function (content) {
            var parsed = window.AiService.parseJson(content);
            parsed.source = 'remote';
            return sanitizeAiPayload(parsed, context);
          }).catch(function () {
            return generateLocalAiPayload(context);
          });
        }

        function setAiPanelLoading(isLoading) {
          if (aiLoadingState) aiLoadingState.classList.toggle('hidden', !isLoading);
          if (aiInsightContent) aiInsightContent.classList.toggle('hidden', isLoading);
          if (refreshAiBtn) {
            refreshAiBtn.classList.toggle('is-refreshing', isLoading);
            refreshAiBtn.disabled = !!isLoading;
          }
        }

        function renderAiSuggestions(payload, context) {
          var safePayload = sanitizeAiPayload(payload, context);
          if (aiSourceBadge) {
            aiSourceBadge.classList.toggle('remote', safePayload.source === 'remote');
            aiSourceBadge.classList.toggle('local', safePayload.source !== 'remote');
            aiSourceBadge.innerHTML = '<span class="ai-source-dot"></span>' + (safePayload.source === 'remote' ? 'AI 实时分析' : '本地智能');
          }
          if (aiScopeText) {
            aiScopeText.textContent = context.totalCheckins ? '基于最近 7 天与本月打卡统计' : '先完成一次打卡后，这里会开始生成洞察';
          }
          if (aiPriorityChip) aiPriorityChip.textContent = safePayload.priority;
          if (aiLastUpdated) aiLastUpdated.textContent = getRelativeTimeText(new Date());
          if (aiSummaryTitle) aiSummaryTitle.textContent = safePayload.summaryTitle;
          if (aiSummaryText) aiSummaryText.textContent = safePayload.summaryText;
          if (aiCurrentStreakMetric) aiCurrentStreakMetric.textContent = safePayload.metrics.currentStreak;
          if (aiWeeklyVolumeMetric) aiWeeklyVolumeMetric.textContent = safePayload.metrics.weeklyVolume;
          if (aiFocusTypeMetric) aiFocusTypeMetric.textContent = safePayload.metrics.focusType;
          if (aiConnectionStatus) aiConnectionStatus.textContent = safePayload.source === 'remote' ? 'LIVE AI CONNECTED' : 'READY FOR API';

          if (!aiSuggestionList) return;

          if (!context.totalCheckins) {
            aiSuggestionList.innerHTML = '<div class="ai-empty-panel"><div class="ai-empty-icon"><i class="fas fa-seedling"></i></div><p class="text-sm font-semibold text-gray-800">先完成今天的第一条打卡</p><p class="mt-2 text-xs leading-relaxed text-gray-500">有了记录内容后，这里会结合频率、连续性和打卡文本，生成更像 AI 的下一步建议。</p></div>';
            return;
          }

          aiSuggestionList.innerHTML = safePayload.suggestions.map(function(item, index) {
            var order = String(index + 1).padStart(2, '0');
            return '<div class="ai-suggestion-card"><div class="ai-suggestion-index">' + order + '</div><div class="ai-suggestion-body"><div class="ai-suggestion-title-row"><h4 class="ai-suggestion-title">' + escapeHtml(item.title) + '</h4><span class="ai-suggestion-tag">' + escapeHtml(item.tag) + '</span></div><p class="ai-suggestion-text">' + escapeHtml(item.text) + '</p></div></div>';
          }).join('');
        }

        function refreshAiSuggestionPanel(options) {
          var opts = options || {};
          var currentToken = ++aiRequestToken;
          var context = buildCheckinInsightContext();
          if (!opts.silent) {
            setAiPanelLoading(true);
          }

          var minDelay = opts.silent ? 0 : 420;
          var startTime = Date.now();

          return requestAiPayload(context).then(function (payload) {
            var remaining = Math.max(0, minDelay - (Date.now() - startTime));
            return new Promise(function (resolve) {
              window.setTimeout(function () {
                if (currentToken !== aiRequestToken) return resolve();
                renderAiSuggestions(payload, context);
                setAiPanelLoading(false);
                resolve();
              }, remaining);
            });
          }).catch(function () {
            var fallbackPayload = generateLocalAiPayload(context);
            renderAiSuggestions(fallbackPayload, context);
            setAiPanelLoading(false);
          });
        }

        function setButtonSubmitting(isSubmitting) {
          if (!btn) return;
          btn.disabled = !!isSubmitting;
          btn.classList.toggle('opacity-50', !!isSubmitting);
          btn.classList.toggle('cursor-not-allowed', !!isSubmitting);
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

        function closeClearHistoryModal() {
          if (!clearHistoryModal) return;
          clearHistoryModal.classList.remove('show');
          clearHistoryModal.setAttribute('aria-hidden', 'true');
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

        function getSortedCheckins() {
          return (Array.isArray(AppState.checkins) ? AppState.checkins.slice() : []).sort(function(a, b) {
            var aDate = parseLocalDateKey(a && a.date) || new Date(0);
            var bDate = parseLocalDateKey(b && b.date) || new Date(0);
            return aDate - bDate;
          });
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
          AppState.checkins = getSortedCheckins();
        }

        function setSelectedType(type) {
          selectedType = type || '学习';
          typeButtons.forEach(function(button) {
            var buttonType = button.getAttribute('data-type') || '';
            button.classList.toggle('selected', buttonType === selectedType);
          });
        }

        function setTypeSelectorLocked(locked) {
          typeButtons.forEach(function(button) {
            button.disabled = !!locked;
            button.setAttribute('aria-disabled', locked ? 'true' : 'false');
          });
        }

        function getTodayCheckin() {
          var todayKey = formatLocalDateKey(new Date());
          var todayItem = null;
          (Array.isArray(AppState.checkins) ? AppState.checkins : []).forEach(function(item) {
            if (item && item.date === todayKey) {
              todayItem = normalizeCheckinItem(item, todayKey);
            }
          });
          return todayItem;
        }

        function showCheckinForm() {
          if (formPanel) formPanel.classList.remove('hidden');
          if (successPanel) {
            successPanel.classList.remove('show', 'success-pop');
            successPanel.classList.add('hidden');
          }
          setTypeSelectorLocked(false);
          setButtonSubmitting(false);
        }

        function showCheckinSuccess(item, shouldAnimate) {
          if (!item) {
            showCheckinForm();
            return;
          }

          setSelectedType(item.type || selectedType);
          setTypeSelectorLocked(true);
          if (formPanel) formPanel.classList.add('hidden');
          if (successPanel) {
            successPanel.classList.remove('hidden');
            successPanel.classList.add('show');
            if (shouldAnimate) {
              successPanel.classList.remove('success-pop');
              void successPanel.offsetWidth;
              successPanel.classList.add('success-pop');
            } else {
              successPanel.classList.remove('success-pop');
            }
          }
          if (successTitle) {
            successTitle.textContent = '今日 ' + (item.type || selectedType) + ' 打卡完成 ✓';
          }
          if (successSummary) {
            successSummary.textContent = getNoteSummary(item.note);
          }
          if (noteInput) noteInput.value = '';
          setButtonSubmitting(true);
        }

        function syncTodayCheckinState(shouldAnimate) {
          var todayItem = getTodayCheckin();
          if (todayItem) {
            showCheckinSuccess(todayItem, shouldAnimate);
          } else {
            showCheckinForm();
          }
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
        }

        function renderCheckins() {
          if (!list) return;
          list.innerHTML = '';

          var checkins = getSortedCheckins();
          var hasCheckins = checkins.length > 0;

          list.classList.toggle('hidden', !hasCheckins);
          if (emptyState) emptyState.classList.toggle('hidden', hasCheckins);
          if (clearBtn) clearBtn.classList.toggle('hidden', !hasCheckins);

          if (!hasCheckins) return;

          checkins.reverse().forEach(function(item, index) {
            var normalized = normalizeCheckinItem(item);
            var li = document.createElement('li');
            li.className = 'checkin-history-item entry-slide flex items-start justify-between gap-3 px-3 py-2 rounded-lg bg-gray-50/50 hover:bg-gray-100/50 transition-colors';
            li.style.animationDelay = Math.min(index * 70, 280) + 'ms';
            li.innerHTML = '<div class="min-w-0 flex-1"><div class="text-gray-800 mb-0.5 font-medium">' + escapeHtml(normalized.time || '--:--') + '</div><div class="text-gray-600 break-words"><span class="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] mr-2">' + escapeHtml(normalized.type) + '</span>' + escapeHtml(getNoteSummary(normalized.note)) + '</div></div><span class="text-[11px] text-success mt-0.5 font-medium shrink-0">' + escapeHtml(normalized.status) + '</span>';
            list.appendChild(li);
          });
        }

        function refreshCheckinUi(options) {
          var opts = options || {};
          renderCheckins();
          updateCheckinStatistics();
          updateTodayDateLabel();
          renderCalendar(currentCalendarDate, opts.navDirection);
          syncTodayCheckinState(!!opts.animateSuccess);
          refreshAiSuggestionPanel({ silent: true });
        }

        function performClearHistory() {
          AppState.checkins = [];
          AppState.save();
          currentCalendarDate = getMonthStart(new Date());
          refreshCheckinUi();
          showToast('打卡记录已清空');
        }

        function commitCheckin(item, toastMessage, toastType) {
          upsertCheckinByDate(item);
          AppState.save();
          celebrateHeroCard();
          refreshCheckinUi({ animateSuccess: true });
          showToast(toastMessage, toastType);
        }

        function fetchCheckinsFromServer() {
          return apiRequest('/api/checkins/recent', { method: 'GET' }).then(function (resp) {
            if (!(resp && resp.status === 200 && resp.body && resp.body.code === 200)) {
              return Promise.reject(new Error('获取打卡数据失败'));
            }

            var data = resp.body.data;
            if (Array.isArray(data)) {
              AppState.checkins = data;
            } else if (data && Array.isArray(data.checkins)) {
              AppState.checkins = data.checkins;
            } else {
              AppState.checkins = [];
            }

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
            refreshCheckinUi();
            return Promise.resolve();
          }).catch(function (err) {
            console.warn('fetchCheckinsFromServer error', err);
            return Promise.reject(err);
          });
        }

        if (!btn || !list) return;

        setSelectedType(selectedType);
        bindEnergyButtonEffects(btn);

        typeButtons.forEach(function(button) {
          button.addEventListener('click', function () {
            if (button.disabled) return;
            restartClassAnimation(button, 'type-bounce', 420);
            setSelectedType(button.getAttribute('data-type') || '学习');
          });
        });

        btn.addEventListener('click', function (event) {
          if (btn.disabled) return;

          var note = getNoteSummary(noteInput && noteInput.value);
          var now = new Date();
          var dateStr = formatLocalDateKey(now);
          var timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
          var localItem = normalizeCheckinItem({ date: dateStr, time: timeStr, type: selectedType, note: note, status: '今日' }, dateStr, timeStr);

          spawnButtonRipple(btn, event);
          restartClassAnimation(btn, 'is-pressed', 620);
          setButtonSubmitting(true);

          apiRequest('/api/checkins', {
            method: 'POST',
            body: JSON.stringify({ date: dateStr, time: timeStr, type: selectedType, note: note })
          }).then(function (resp) {
            if (resp && resp.status === 200 && resp.body && resp.body.code === 200) {
              var saved = resp.body.data ? normalizeCheckinItem(resp.body.data, dateStr, timeStr) : localItem;
              commitCheckin(saved, '打卡成功 🎉');
              return;
            }

            if (enableLocalFallback) {
              commitCheckin(localItem, '网络异常，已保存本地记录', 'error');
              return;
            }

            setButtonSubmitting(false);
            showToast((resp && resp.body && resp.body.message) || '打卡失败，请稍后重试', 'error');
          }).catch(function (err) {
            console.error('保存打卡失败', err);
            if (enableLocalFallback) {
              commitCheckin(localItem, '网络错误，已保存本地记录', 'error');
              return;
            }

            setButtonSubmitting(false);
            showToast('网络错误，打卡失败', 'error');
          });
        });

        if (emptyCta) {
          emptyCta.addEventListener('click', function () {
            if (todayCard) {
              todayCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            if (noteInput && !noteInput.disabled) {
              window.setTimeout(function () {
                noteInput.focus();
              }, 320);
            }
          });
        }

        if (clearBtn) {
          clearBtn.addEventListener('click', function () {
            openClearHistoryModal();
          });
        }

        if (refreshAiBtn) {
          refreshAiBtn.addEventListener('click', function () {
            refreshAiSuggestionPanel();
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

        fetchCheckinsFromServer().catch(function () {
          refreshCheckinUi();
        });
      })();
    

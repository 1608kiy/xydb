
      document.addEventListener('DOMContentLoaded', function () {
        AppState.init();
        renderHeader('calendar');
        renderFooter('calendar');
        bindGlobalLogout();

        function performLogout() {
          AppState.logout();
          showToast('已退出登录', 'success');
          setTimeout(function () {
            if (typeof safeNavigate === 'function') safeNavigate('登录页面.html');
            else window.location.href = '登录页面.html';
          }, 300);
        }
        window.performLogout = performLogout;
        
        // 绑定顶部退出登录按钮
        var logoutBtnTop = document.getElementById('logout-btn-top');
        if (logoutBtnTop) {
          logoutBtnTop.addEventListener('click', function (e) {
            e.preventDefault();
            performLogout();
          });
        }
        
        // ✅ 处理添加任务按钮 - 跳转到待办页面并打开模态框
        var addTaskBtn = document.getElementById('add-task-btn');
        if (addTaskBtn) {
          addTaskBtn.addEventListener('click', function (e) {
            e.preventDefault();
            if (addTaskBtn.dataset.navigating === '1') return;
            addTaskBtn.dataset.navigating = '1';

            var baseHref = addTaskBtn.getAttribute('href') || '待办页面.html';
            var separator = baseHref.indexOf('?') === -1 ? '?' : '&';
            var targetUrl = baseHref + separator + 'openModal=new-task';
            if (typeof safeNavigate === 'function') safeNavigate(targetUrl);
            else window.location.href = targetUrl;
          });
        }

        function enhanceSelectedDaySortDropdown() {
          var select = document.getElementById('selected-day-sort');
          if (!select || select.dataset.liquidEnhanced === '1') return;
          select.dataset.liquidEnhanced = '1';

          var host = select.parentElement;
          if (!host) return;

          var shell = document.createElement('div');
          shell.className = 'calendar-liquid-sort-shell';

          var trigger = document.createElement('button');
          trigger.type = 'button';
          trigger.className = 'calendar-liquid-sort-trigger btn-glass text-xs px-3 py-2';
          trigger.innerHTML = '<span class="calendar-liquid-sort-label"></span><i class="fas fa-chevron-down"></i>';

          var menu = document.createElement('div');
          menu.className = 'calendar-liquid-sort-menu hidden';

          function syncLabel() {
            var opt = select.options[select.selectedIndex] || select.options[0];
            var label = trigger.querySelector('.calendar-liquid-sort-label');
            if (label) label.textContent = opt ? opt.textContent : '按时间';
          }

          function closeMenu() {
            menu.classList.add('dropdown-closing');
            menu.classList.remove('show');
            shell.classList.remove('open');
            setTimeout(function () {
              if (!menu.classList.contains('show')) {
                menu.classList.add('hidden');
                menu.classList.remove('dropdown-closing');
              }
            }, 240);
          }

          function openMenu() {
            menu.classList.remove('dropdown-closing');
            menu.classList.remove('hidden');
            requestAnimationFrame(function () {
              menu.classList.add('show');
              shell.classList.add('open');
            });
          }

          function rebuildOptions() {
            menu.innerHTML = '';
            Array.prototype.forEach.call(select.options || [], function (opt) {
              var btn = document.createElement('button');
              btn.type = 'button';
              btn.className = 'calendar-liquid-sort-option' + (String(opt.value) === String(select.value) ? ' active' : '');
              var iconClass = 'fas fa-clock';
              var value = String(opt.value || '').toLowerCase();
              if (value === 'priority') iconClass = 'fas fa-flag';
              else if (value === 'label') iconClass = 'fas fa-tag';
              else if (value === 'status') iconClass = 'fas fa-check-circle';
              btn.innerHTML = '<i class="' + iconClass + '"></i><span>' + (opt.textContent || '') + '</span>';
              btn.dataset.value = opt.value || '';
              btn.addEventListener('click', function (e) {
                e.preventDefault();
                var val = btn.dataset.value || '';
                if (select.value !== val) {
                  select.value = val;
                  select.dispatchEvent(new Event('change', { bubbles: true }));
                }
                syncLabel();
                rebuildOptions();
                closeMenu();
              });
              menu.appendChild(btn);
            });
          }

          trigger.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            if (menu.classList.contains('show')) closeMenu();
            else openMenu();
          });

          document.addEventListener('click', function (e) {
            if (!shell.contains(e.target)) closeMenu();
          });

          document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeMenu();
          });

          select.classList.add('calendar-liquid-sort-native-hidden');
          shell.appendChild(trigger);
          shell.appendChild(menu);
          host.insertBefore(shell, select);
          shell.appendChild(select);

          select.addEventListener('change', function () {
            syncLabel();
            rebuildOptions();
          });

          syncLabel();
          rebuildOptions();
        }

        enhanceSelectedDaySortDropdown();

        var selectedDaySection = document.getElementById('selected-day-task-section');
        if (selectedDaySection && !selectedDaySection.dataset.liquidSortObserved) {
          selectedDaySection.dataset.liquidSortObserved = '1';
          var observer = new MutationObserver(function () {
            enhanceSelectedDaySortDropdown();
          });
          observer.observe(selectedDaySection, { childList: true, subtree: true });
        }
      });
    

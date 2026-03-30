(function () {
  'use strict';

  function setAppVh() {
    var vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--app-vh', vh + 'px');
  }

  function bindTouchMenus() {
    var containers = document.querySelectorAll(
      '#user-menu-container, #pm-user-menu-container, #checkin-user-menu-container, #profile-user-menu-container, #report-user-menu-container'
    );

    if (!containers || !containers.length) {
      containers = document.querySelectorAll('.relative.group');
    }
    if (!containers || !containers.length) return;

    function closeAll(except) {
      containers.forEach(function (container) {
        if (except && container === except) return;
        container.classList.remove('software-menu-open');
        container.classList.remove('menu-open');
      });
    }

    containers.forEach(function (container) {
      var trigger = container.querySelector(':scope > button, :scope > a[role="button"], :scope > .flex > button');
      var menu = container.querySelector(':scope > .dropdown-menu, :scope > div[id$="dropdown"], :scope > div.absolute');
      if (!trigger || !menu) return;

      trigger.addEventListener('click', function (e) {
        if (window.matchMedia('(max-width: 900px)').matches) {
          e.preventDefault();
          e.stopPropagation();
          var opening = !container.classList.contains('software-menu-open');
          closeAll(container);
          if (opening) {
            container.classList.add('software-menu-open');
            container.classList.add('menu-open');
          }
        }
      });
    });

    document.addEventListener('click', function (e) {
      var clickedInside = false;
      containers.forEach(function (container) {
        if (container.contains(e.target)) clickedInside = true;
      });
      if (!clickedInside) closeAll();
    });
  }

  function syncTopDockOffsetFallback() {
    var isMobile = window.matchMedia('(max-width: 900px)').matches;
    var dock = document.querySelector('.unified-top-header-dock .unified-top-header-shell');
    var main =
      document.querySelector('body > div.flex.flex-1.overflow-hidden > main') ||
      document.querySelector('body > main') ||
      document.querySelector('main');

    if (!main) return;

    if (!isMobile || !dock) {
      main.style.removeProperty('padding-top');
      return;
    }

    var dockHeight = Math.ceil(dock.getBoundingClientRect().height || 0);
    if (!dockHeight) return;

    var extra = window.matchMedia('(max-width: 420px)').matches ? 14 : 20;
    main.style.setProperty('padding-top', String(dockHeight + extra) + 'px', 'important');
  }

  function detachCalendarViewControls() {
    var path = '';
    try {
      path = decodeURIComponent((window.location && window.location.pathname) || '');
    } catch (e) {
      path = (window.location && window.location.pathname) || '';
    }

    var isCalendarPage = path.indexOf('日历页面') !== -1 || !!document.querySelector('[data-view]');
    var isMobile = window.matchMedia('(max-width: 900px)').matches;
    var toolbar = document.getElementById('calendar-mobile-toolbar');
    var dock = document.querySelector('.unified-top-header-dock');
    var shell = dock && dock.querySelector('.unified-top-header-shell');
    var headerRoot = shell && (shell.querySelector('.container') || shell.querySelector(':scope > div:first-child') || shell);
    var calendarMain = document.getElementById('calendar-main') || document.querySelector('main');

    if (!isCalendarPage) {
      if (toolbar) toolbar.remove();
      return;
    }

    if (!headerRoot || !calendarMain) return;

    if (!isMobile) {
      if (toolbar) {
        var inner = toolbar.querySelector('.calendar-mobile-toolbar-inner');
        if (inner) {
          Array.prototype.slice.call(inner.children || []).forEach(function (child) {
            headerRoot.appendChild(child);
          });
        }
        toolbar.remove();
      }
      return;
    }

    var controls = null;
    Array.prototype.slice.call(headerRoot.children || []).forEach(function (child) {
      if (controls) return;
      if (!child || typeof child.querySelector !== 'function') return;
      if (child.querySelector('[data-view]') || child.querySelector('#today-btn')) {
        controls = child;
      }
    });

    if (!controls) {
      var anyViewBtn = document.querySelector('[data-view="month"], [data-view="week"], [data-view="day"]');
      if (anyViewBtn) {
        controls = anyViewBtn.closest('.flex') || anyViewBtn.parentElement;
      }
    }

    if (!controls) {
      if (toolbar) toolbar.remove();
      return;
    }

    if (!toolbar) {
      toolbar = document.createElement('div');
      toolbar.id = 'calendar-mobile-toolbar';
      var innerWrapNew = document.createElement('div');
      innerWrapNew.className = 'calendar-mobile-toolbar-inner';
      toolbar.appendChild(innerWrapNew);
      // Prefer inserting after the "已排任务" card if present, otherwise insert as first child
      var scheduledList = document.getElementById('scheduled-task-list');
      if (scheduledList) {
        var scheduledCard = scheduledList.closest('.glass-card');
        if (scheduledCard && scheduledCard.parentElement) {
          scheduledCard.parentElement.insertBefore(toolbar, scheduledCard.nextSibling);
        } else {
          calendarMain.insertBefore(toolbar, calendarMain.firstChild);
        }
      } else {
        calendarMain.insertBefore(toolbar, calendarMain.firstChild);
      }
    } else if (toolbar.parentElement !== calendarMain) {
      // If toolbar already exists but is not in the desired container, try to move it after scheduled card
      var scheduledList2 = document.getElementById('scheduled-task-list');
      if (scheduledList2) {
        var scheduledCard2 = scheduledList2.closest('.glass-card');
        if (scheduledCard2 && scheduledCard2.parentElement) {
          scheduledCard2.parentElement.insertBefore(toolbar, scheduledCard2.nextSibling);
        } else {
          calendarMain.insertBefore(toolbar, calendarMain.firstChild);
        }
      } else {
        calendarMain.insertBefore(toolbar, calendarMain.firstChild);
      }
    }

    var innerWrap = toolbar.querySelector('.calendar-mobile-toolbar-inner');
    if (!innerWrap) return;
    if (controls.parentElement !== innerWrap) {
      innerWrap.appendChild(controls);
    }

    var groups = Array.prototype.slice.call(innerWrap.children || []);
    if (groups.length > 1) {
      var merged = document.createElement('div');
      merged.className = groups[0].className || 'flex items-center space-x-4';
      groups.forEach(function (group) {
        while (group.firstChild) {
          merged.appendChild(group.firstChild);
        }
      });
      innerWrap.innerHTML = '';
      innerWrap.appendChild(merged);
    }

    var panel = innerWrap.firstElementChild;
    if (panel) {
      var todayBtn = panel.querySelector('#today-btn');
      var currentDate = panel.querySelector('#current-date');
      var dateCard = currentDate && currentDate.closest ? currentDate.closest('.glass-card') : null;
      var viewButtons = Array.prototype.slice.call(panel.querySelectorAll('[data-view]'));

      var metaRow = panel.querySelector(':scope > .calendar-mobile-meta-row');
      if (!metaRow) {
        metaRow = document.createElement('div');
        metaRow.className = 'calendar-mobile-meta-row';
      }

      var viewRow = panel.querySelector(':scope > .calendar-mobile-view-row');
      if (!viewRow) {
        viewRow = document.createElement('div');
        viewRow.className = 'calendar-mobile-view-row';
      }

      if (metaRow.parentElement !== panel) panel.appendChild(metaRow);
      if (viewRow.parentElement !== panel) panel.appendChild(viewRow);

      if (todayBtn) metaRow.appendChild(todayBtn);
      if (dateCard) metaRow.appendChild(dateCard);

      var viewOrder = { month: 1, week: 2, day: 3 };
      viewButtons
        .sort(function (a, b) {
          var av = viewOrder[String(a.getAttribute('data-view') || '').toLowerCase()] || 99;
          var bv = viewOrder[String(b.getAttribute('data-view') || '').toLowerCase()] || 99;
          return av - bv;
        })
        .forEach(function (btn) {
          viewRow.appendChild(btn);
        });

      Array.prototype.slice.call(panel.children || []).forEach(function (child) {
        if (child === metaRow || child === viewRow) return;
        if (!child.querySelector || !child.querySelector('#today-btn, #current-date, [data-view]')) {
          child.remove();
        }
      });
    }

    if (!innerWrap.firstElementChild) {
      toolbar.remove();
    }
  }

  function initSoftwareMobile() {
    setAppVh();
    bindTouchMenus();
    syncTopDockOffsetFallback();
    detachCalendarViewControls();
  }

  window.addEventListener('resize', setAppVh);
  window.addEventListener('orientationchange', setAppVh);
  window.addEventListener('resize', syncTopDockOffsetFallback);
  window.addEventListener('orientationchange', syncTopDockOffsetFallback);
  window.addEventListener('resize', detachCalendarViewControls);
  window.addEventListener('orientationchange', detachCalendarViewControls);
  document.addEventListener('DOMContentLoaded', initSoftwareMobile);
  window.addEventListener('load', syncTopDockOffsetFallback);
  window.addEventListener('load', detachCalendarViewControls);
})();

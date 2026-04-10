(function () {
  'use strict';

  // Local dev safety: allow opening pages directly without being forced to login
  // when running from file:// or localhost and no token exists.
  try {
    var host = (window.location && window.location.hostname) || '';
    var protocol = (window.location && window.location.protocol) || '';
    var isLocalRuntime = protocol === 'file:' || host === 'localhost' || host === '127.0.0.1';
    if (isLocalRuntime) {
      var token = localStorage.getItem('token');
      if (!token) {
        localStorage.setItem('token', 'dev-local');
        localStorage.setItem('devSkipAuth', '1');
      }
    }
  } catch (e) {}

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
    var mains = [
      document.getElementById('todo-main'),
      document.getElementById('calendar-main'),
      document.querySelector('body > div.flex.flex-1.overflow-hidden > main'),
      document.querySelector('body > main'),
      document.querySelector('main')
    ].filter(function (node, index, arr) {
      return !!node && arr.indexOf(node) === index;
    });

    if (!mains.length) return;

    function clearOffset(node) {
      if (!node) return;
      node.style.removeProperty('padding-top');
      node.style.removeProperty('scroll-padding-top');
      delete node.dataset.mobileTopDockBasePadding;
    }

    if (!isMobile || !dock) {
      mains.forEach(clearOffset);
      return;
    }

    var dockHeight = Math.ceil(dock.getBoundingClientRect().height || 0);
    if (!dockHeight) return;

    var extra = window.matchMedia('(max-width: 420px)').matches ? 4 : 6;
    mains.forEach(function (node) {
      var useCssManagedOffset =
        document.body &&
        document.body.classList &&
        document.body.classList.contains('has-unified-top-header');

      if (useCssManagedOffset) {
        node.style.removeProperty('padding-top');
        node.style.removeProperty('scroll-padding-top');
        return;
      }

      var basePadding = node.dataset.mobileTopDockBasePadding;
      if (!basePadding) {
        basePadding = String(Math.ceil(parseFloat(window.getComputedStyle(node).paddingTop) || 0));
        node.dataset.mobileTopDockBasePadding = basePadding;
      }
      var totalOffset = dockHeight + extra + (parseInt(basePadding, 10) || 0);
      node.style.setProperty('padding-top', String(totalOffset) + 'px', 'important');
      node.style.setProperty('scroll-padding-top', String(totalOffset) + 'px', 'important');
    });
  }

  function detachCalendarViewControls() {
    var path = '';
    try {
      path = decodeURIComponent((window.location && window.location.pathname) || '');
    } catch (e) {
      path = (window.location && window.location.pathname) || '';
    }

    var isCalendarPage = path.indexOf('鏃ュ巻椤甸潰') !== -1 || !!document.querySelector('[data-view]');
    var isMobile = window.matchMedia('(max-width: 900px)').matches;
    var toolbar = document.getElementById('calendar-mobile-toolbar');
    var dock = document.querySelector('.unified-top-header-dock');
    var shell = dock && dock.querySelector('.unified-top-header-shell');
    var headerRoot = shell && (shell.querySelector('.container') || shell.querySelector(':scope > div:first-child') || shell);
    var calendarMain = document.getElementById('calendar-main') || document.querySelector('main');

    function restoreToolbarToHeader() {
      if (!toolbar || !headerRoot) return;
      var inner = toolbar.querySelector('.calendar-mobile-toolbar-inner');
      if (inner) {
        Array.prototype.slice.call(inner.children || []).forEach(function (child) {
          if (!child) return;
          var anchor = headerRoot.children && headerRoot.children.length > 1
            ? headerRoot.lastElementChild
            : null;
          if (anchor) {
            headerRoot.insertBefore(child, anchor);
          } else {
            headerRoot.appendChild(child);
          }
        });
      }
      toolbar.remove();
    }

    if (!isCalendarPage) {
      if (toolbar) toolbar.remove();
      return;
    }

    if (!headerRoot || !calendarMain) return;

    if (!isMobile) {
      restoreToolbarToHeader();
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
      var scheduledList = document.getElementById('scheduled-task-list');
      var scheduledCard = scheduledList && scheduledList.closest ? scheduledList.closest('.glass-card') : null;
      if (scheduledCard && scheduledCard.parentElement) {
        scheduledCard.parentElement.insertBefore(toolbar, scheduledCard.nextSibling);
      } else {
        calendarMain.insertBefore(toolbar, calendarMain.firstChild);
      }
    } else if (toolbar.parentElement !== calendarMain) {
      var scheduledList2 = document.getElementById('scheduled-task-list');
      var scheduledCard2 = scheduledList2 && scheduledList2.closest ? scheduledList2.closest('.glass-card') : null;
      if (scheduledCard2 && scheduledCard2.parentElement) {
        scheduledCard2.parentElement.insertBefore(toolbar, scheduledCard2.nextSibling);
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

  function applyAutoTextContrast() {
    var isMobile = window.matchMedia('(max-width: 900px)').matches;
    var body = document.body;
    if (!body || !isMobile) return;

    var lastUrl = '';
    var lastColor = '';
    var rafToken = 0;

    function ensureSharedMobileBackground() {
      if (!body.classList || !body.classList.contains('software-app')) return '';

      var storageKey = 'software-mobile-shared-bg-url-v1';
      var seedKey = 'software-mobile-shared-bg-seed-v1';
      var bgUrl = '';
      var seed = body.dataset.mobileRandomBgSeed || '';
      var navEntry = null;
      var isReload = false;

      try {
        navEntry = window.performance && window.performance.getEntriesByType
          ? window.performance.getEntriesByType('navigation')[0]
          : null;
        isReload = !!(navEntry && navEntry.type === 'reload');
      } catch (err0) {}

      try {
        if (isReload) {
          window.sessionStorage.removeItem(storageKey);
          window.sessionStorage.removeItem(seedKey);
        }
        bgUrl = window.sessionStorage.getItem(storageKey) || '';
        seed = window.sessionStorage.getItem(seedKey) || seed;
      } catch (err) {}

      if (!bgUrl) {
        if (!seed) {
          seed = 'xydb-mobile-' + Math.random().toString(36).slice(2, 10);
        }

        bgUrl = 'https://picsum.photos/seed/' + encodeURIComponent(seed) + '/1920/1080';
        try {
          window.sessionStorage.setItem(storageKey, bgUrl);
          window.sessionStorage.setItem(seedKey, seed);
        } catch (err2) {}
      }

      body.style.setProperty('--mobile-random-bg-image', 'url("' + bgUrl.replace(/"/g, '%22') + '")');
      body.dataset.mobileRandomBgSeed = seed;
      body.dataset.mobileRandomBgUrl = bgUrl;
      return bgUrl;
    }

    function parseFirstUrl(bgImage) {
      if (!bgImage || bgImage === 'none') return '';
      var match = /url\((?:"|')?(.*?)(?:"|')?\)/.exec(bgImage);
      return match ? match[1] : '';
    }

    function parseRgb(color) {
      var m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/i.exec(color || '');
      if (!m) return null;
      return { r: parseInt(m[1], 10), g: parseInt(m[2], 10), b: parseInt(m[3], 10) };
    }

    function computeLuma(r, g, b) {
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    function setContrastClass(isDarkText) {
      body.classList.toggle('auto-contrast-dark', !!isDarkText);
      body.classList.toggle('auto-contrast-light', !isDarkText);
    }

    function setZoneTheme(zone, isDarkText) {
      var prefix = '--auto-' + zone + '-';
      if (isDarkText) {
        body.style.setProperty(prefix + 'ink', 'rgba(9, 15, 28, 0.95)');
        body.style.setProperty(prefix + 'soft', 'rgba(33, 46, 66, 0.76)');
        body.style.setProperty(prefix + 'active', zone === 'footer' ? 'rgba(29, 78, 216, 0.98)' : 'rgba(8, 15, 28, 0.98)');
        body.style.setProperty(prefix + 'active-bg', zone === 'footer' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(15, 23, 42, 0.12)');
        body.style.setProperty(prefix + 'shell-bg', 'linear-gradient(180deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0.1) 58%, rgba(255, 255, 255, 0.05) 100%)');
        body.style.setProperty(prefix + 'shell-border', 'rgba(255, 255, 255, 0.32)');
      } else {
        body.style.setProperty(prefix + 'ink', 'rgba(248, 250, 255, 0.98)');
        body.style.setProperty(prefix + 'soft', 'rgba(228, 234, 245, 0.84)');
        body.style.setProperty(prefix + 'active', zone === 'footer' ? 'rgba(29, 78, 216, 0.98)' : 'rgba(255, 255, 255, 0.99)');
        body.style.setProperty(prefix + 'active-bg', zone === 'footer' ? 'rgba(59, 130, 246, 0.18)' : 'rgba(255, 255, 255, 0.16)');
        body.style.setProperty(prefix + 'shell-bg', 'linear-gradient(180deg, rgba(34, 45, 62, 0.34) 0%, rgba(22, 31, 48, 0.24) 58%, rgba(18, 26, 42, 0.18) 100%)');
        body.style.setProperty(prefix + 'shell-border', 'rgba(255, 255, 255, 0.2)');
      }
    }

    function applyContrastFromLuma(luma) {
      setContrastClass(luma > 160);
    }

    function sampleRectLuma(ctx, x, y, w, h) {
      var startX = Math.max(0, Math.floor(x));
      var startY = Math.max(0, Math.floor(y));
      var width = Math.max(1, Math.floor(w));
      var height = Math.max(1, Math.floor(h));
      var data = ctx.getImageData(startX, startY, width, height).data;
      var total = 0;
      var count = 0;
      for (var i = 0; i < data.length; i += 4) {
        total += computeLuma(data[i], data[i + 1], data[i + 2]);
        count++;
      }
      return count ? total / count : null;
    }

    function sampleImageZones(url, done) {
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.decoding = 'async';
      img.onload = function () {
        try {
          var canvas = document.createElement('canvas');
          canvas.width = 90;
          canvas.height = 160;
          var ctx = canvas.getContext('2d', { willReadFrequently: true });
          var drawRatio = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
          var drawWidth = img.naturalWidth * drawRatio;
          var drawHeight = img.naturalHeight * drawRatio;
          var offsetX = (canvas.width - drawWidth) / 2;
          var offsetY = (canvas.height - drawHeight) / 2;
          ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

          done({
            overall: sampleRectLuma(ctx, canvas.width * 0.16, canvas.height * 0.16, canvas.width * 0.68, canvas.height * 0.68),
            header: sampleRectLuma(ctx, canvas.width * 0.08, canvas.height * 0.02, canvas.width * 0.84, canvas.height * 0.18),
            content: sampleRectLuma(ctx, canvas.width * 0.14, canvas.height * 0.2, canvas.width * 0.72, canvas.height * 0.5),
            footer: sampleRectLuma(ctx, canvas.width * 0.08, canvas.height * 0.78, canvas.width * 0.84, canvas.height * 0.16)
          });
        } catch (err) {
          done(null);
        }
      };
      img.onerror = function () { done(null); };
      img.src = url;
    }

    function refresh() {
      if (rafToken) cancelAnimationFrame(rafToken);
      rafToken = requestAnimationFrame(function () {
        rafToken = 0;
        var sharedBgUrl = ensureSharedMobileBackground();
        var computed = window.getComputedStyle(body);
        var bgImage = computed.backgroundImage || 'none';
        var bgColor = computed.backgroundColor || '';
        var url = parseFirstUrl(bgImage) || sharedBgUrl;

        if (url && url !== lastUrl) {
          lastUrl = url;
          sampleImageZones(url, function (zones) {
              if (!zones || typeof zones.overall !== 'number') {
                var rgb = parseRgb(bgColor);
                if (rgb) {
                  var fallbackLuma = computeLuma(rgb.r, rgb.g, rgb.b);
                  applyContrastFromLuma(fallbackLuma);
                  setZoneTheme('header', fallbackLuma > 160);
                  setZoneTheme('content', fallbackLuma > 158);
                  setZoneTheme('footer', fallbackLuma > 160);
                } else {
                  applyContrastFromLuma(120);
                  setZoneTheme('header', false);
                  setZoneTheme('content', false);
                  setZoneTheme('footer', false);
                }
                return;
              }
              applyContrastFromLuma(zones.overall);
              setZoneTheme('header', zones.header > 162);
              setZoneTheme('content', (typeof zones.content === 'number' ? zones.content : zones.overall) > 158);
              setZoneTheme('footer', zones.footer > 158);
            });
            return;
        }

        if (!url && bgColor && bgColor !== lastColor) {
          lastColor = bgColor;
          var rgb2 = parseRgb(bgColor);
            if (rgb2) {
              var colorLuma = computeLuma(rgb2.r, rgb2.g, rgb2.b);
              applyContrastFromLuma(colorLuma);
              setZoneTheme('header', colorLuma > 160);
              setZoneTheme('content', colorLuma > 158);
              setZoneTheme('footer', colorLuma > 160);
            } else {
              applyContrastFromLuma(120);
              setZoneTheme('header', false);
              setZoneTheme('content', false);
              setZoneTheme('footer', false);
            }
          }
      });
    }

    refresh();

    var observer = new MutationObserver(function () { refresh(); });
    observer.observe(body, { attributes: true, attributeFilter: ['class', 'style'] });
    window.addEventListener('pageshow', refresh);
    window.addEventListener('resize', refresh);
    window.addEventListener('orientationchange', refresh);
  }

  function initSoftwareMobile() {
    setAppVh();
    bindTouchMenus();
    syncTopDockOffsetFallback();
    detachCalendarViewControls();
    applyAutoTextContrast();
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

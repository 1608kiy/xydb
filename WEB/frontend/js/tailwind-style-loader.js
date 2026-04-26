(function (global) {
  function ensureLinkStyle(path, id) {
    if (id && document.getElementById(id)) return;
    var linkEl = document.createElement('link');
    linkEl.rel = 'stylesheet';
    linkEl.href = path;
    if (id) linkEl.id = id;
    document.head.appendChild(linkEl);
  }

  function loadTailwindStyle(path, id) {
    if ((global.location && global.location.protocol === 'file:') || typeof XMLHttpRequest === 'undefined') {
      ensureLinkStyle(path, id);
      return;
    }

    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', path, false);
      xhr.send(null);
      if ((xhr.status !== 200 && xhr.status !== 0) || !String(xhr.responseText || '').trim()) {
        ensureLinkStyle(path, id);
        return;
      }
      var styleEl = document.createElement('style');
      styleEl.type = 'text/tailwindcss';
      if (id) styleEl.id = id;
      styleEl.textContent = xhr.responseText || '';
      document.head.appendChild(styleEl);
      if (global.tailwind && typeof global.tailwind.refresh === 'function') {
        global.tailwind.refresh();
      }
    } catch (err) {
      console.error('Failed to load tailwind style: ' + path, err);
      ensureLinkStyle(path, id);
    }
  }

  global.loadTailwindStyle = loadTailwindStyle;
})(window);

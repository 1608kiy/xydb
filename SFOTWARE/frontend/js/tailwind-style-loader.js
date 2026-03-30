(function (global) {
  function loadTailwindStyle(path, id) {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', path, false);
      xhr.send(null);
      if (xhr.status !== 200 && xhr.status !== 0) return;
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
    }
  }

  global.loadTailwindStyle = loadTailwindStyle;
})(window);


      function setCurrentDate() {
        var now = new Date();
        var options = {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'short'
        };
        var dateString = now.toLocaleDateString('zh-CN', options);
        document.getElementById('current-date').textContent = "\u4eca\u5929 \u00b7 ".concat(dateString);
      }
      window.addEventListener('load', setCurrentDate);
    


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
      });
    

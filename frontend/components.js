function renderHeader(activePage) {
  const user = AppState.user || { name: '访客', avatar: '' };
  const header = `
  <header class="bg-white shadow-sm sticky top-0 z-30">
    <div class="container mx-auto px-4 py-3 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <a href="待办页面.html" class="text-primary text-lg font-bold">轻悦待办</a>
        <span class="text-xs text-gray-500">高效每一天</span>
      </div>
      <div class="flex items-center gap-4">
        <a href="待办页面.html" class="text-sm ${activePage === 'todo' ? 'text-primary font-semibold' : 'text-gray-600 hover:text-primary'}">待办</a>
        <a href="日历页面.html" class="text-sm ${activePage === 'calendar' ? 'text-primary font-semibold' : 'text-gray-600 hover:text-primary'}">日历</a>
        <a href="番茄钟页面.html" class="text-sm ${activePage === 'pomodoro' ? 'text-primary font-semibold' : 'text-gray-600 hover:text-primary'}">番茄</a>
        <a href="数据周报页面.html" class="text-sm ${activePage === 'report' ? 'text-primary font-semibold' : 'text-gray-600 hover:text-primary'}">周报</a>
        <a href="打卡页面.html" class="text-sm ${activePage === 'checkin' ? 'text-primary font-semibold' : 'text-gray-600 hover:text-primary'}">打卡</a>
        <a href="个人中心页面.html" class="text-sm ${activePage === 'profile' ? 'text-primary font-semibold' : 'text-gray-600 hover:text-primary'}">我的</a>
        <div class="relative group">
          <button class="flex items-center gap-2 focus:outline-none"><img src="${user.avatar || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}" alt="avatar" class="header-user-avatar w-8 h-8 rounded-full border border-gray-200" /><span class="header-user-name hidden md:inline">${user.name}</span><i class="fas fa-chevron-down text-gray-500"></i></button>
          <div class="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg p-2 hidden group-hover:block">
            <a href="个人中心页面.html" class="block px-2 py-1 text-sm text-gray-700 hover:bg-gray-100">个人中心</a>
            <a href="登录页面.html" class="block px-2 py-1 text-sm text-gray-700 hover:bg-gray-100" id="global-logout">退出登录</a>
          </div>
        </div>
      </div>
    </div>
  </header>
  `;
  const container = document.getElementById('header-container');
  if (container) container.innerHTML = header;
}

function renderFooter(activePage) {
  const footer = `
  <footer class="glass-tab py-1.5 px-2 sticky bottom-0 z-40">
    <div class="container mx-auto flex justify-around items-center">
      <a href="待办页面.html" class="tab-item ${activePage === 'todo' ? 'active text-primary' : 'text-gray-500 hover:text-primary'} flex flex-col items-center px-2 py-1 rounded-lg hover:bg-primary/10 transition-all duration-300"><i class="fas fa-list-alt text-base"></i><span class="text-[10px] mt-0.5">待办</span><span class="tab-indicator"></span></a>
      <a href="日历页面.html" class="tab-item ${activePage === 'calendar' ? 'active text-primary' : 'text-gray-500 hover:text-primary'} flex flex-col items-center px-2 py-1 rounded-lg hover:bg-primary/10 transition-all duration-300"><i class="fas fa-calendar text-base"></i><span class="text-[10px] mt-0.5">日历</span><span class="tab-indicator"></span></a>
      <a href="番茄钟页面.html" class="tab-item ${activePage === 'pomodoro' ? 'active text-primary' : 'text-gray-500 hover:text-primary'} flex flex-col items-center px-2 py-1 rounded-lg hover:bg-primary/10 transition-all duration-300"><i class="fas fa-clock text-base"></i><span class="text-[10px] mt-0.5">番茄钟</span><span class="tab-indicator"></span></a>
      <a href="数据周报页面.html" class="tab-item ${activePage === 'report' ? 'active text-primary' : 'text-gray-500 hover:text-primary'} flex flex-col items-center px-2 py-1 rounded-lg hover:bg-primary/10 transition-all duration-300"><i class="fas fa-chart-line text-base"></i><span class="text-[10px] mt-0.5">周报</span><span class="tab-indicator"></span></a>
      <a href="打卡页面.html" class="tab-item ${activePage === 'checkin' ? 'active text-primary' : 'text-gray-500 hover:text-primary'} flex flex-col items-center px-2 py-1 rounded-lg hover:bg-primary/10 transition-all duration-300"><i class="fas fa-check-circle text-base"></i><span class="text-[10px] mt-0.5">打卡</span><span class="tab-indicator"></span></a>
      <a href="个人中心页面.html" class="tab-item ${activePage === 'profile' ? 'active text-primary' : 'text-gray-500 hover:text-primary'} flex flex-col items-center px-2 py-1 rounded-lg hover:bg-primary/10 transition-all duration-300"><i class="fas fa-user text-base"></i><span class="text-[10px] mt-0.5">我的</span><span class="tab-indicator"></span></a>
    </div>
  </footer>
  `;
  const container = document.getElementById('footer-container');
  if (container) {
    container.innerHTML = footer;
    if (typeof initUnifiedBottomTabs === 'function') initUnifiedBottomTabs();
    if (typeof syncUnifiedBottomTabSpace === 'function') syncUnifiedBottomTabSpace();
  }
}

function bindGlobalLogout() {
  if (typeof window.initUnifiedLogoutBindings === 'function') {
    window.initUnifiedLogoutBindings();
  }

  const logoutTargets = document.querySelectorAll('#global-logout, #todo-logout-link, #logout-btn-top, #profile-logout');
  logoutTargets.forEach(function (logoutBtn) {
    if (!logoutBtn || logoutBtn.dataset.boundGlobalLogout === '1') return;
    logoutBtn.dataset.boundGlobalLogout = '1';

    logoutBtn.addEventListener('click', function (e) {
      if (e.defaultPrevented) return;
      e.preventDefault();

      if (typeof window.performUnifiedLogoutFlow === 'function') {
        window.performUnifiedLogoutFlow();
        return;
      }

      AppState.logout();
      showToast('已退出登录');
      setTimeout(function () { safeNavigate('登录页面.html'); }, 300);
    });
  });
}

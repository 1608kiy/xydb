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
          <button class="flex items-center gap-2 focus:outline-none"><img src="${user.avatar || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}" alt="avatar" class="w-8 h-8 rounded-full border border-gray-200" /><span class="hidden md:inline">${user.name}</span><i class="fas fa-chevron-down text-gray-500"></i></button>
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
  <footer class="bg-white border-t border-gray-200 py-2 px-4">
    <div class="container mx-auto flex justify-around items-center text-xs text-gray-600">
      <a href="待办页面.html" class="flex flex-col items-center ${activePage === 'todo' ? 'text-primary' : ''}"><i class="fas fa-list-alt"></i><span>待办</span></a>
      <a href="日历页面.html" class="flex flex-col items-center ${activePage === 'calendar' ? 'text-primary' : ''}"><i class="fas fa-calendar"></i><span>日历</span></a>
      <a href="番茄钟页面.html" class="flex flex-col items-center ${activePage === 'pomodoro' ? 'text-primary' : ''}"><i class="fas fa-clock"></i><span>番茄</span></a>
      <a href="数据周报页面.html" class="flex flex-col items-center ${activePage === 'report' ? 'text-primary' : ''}"><i class="fas fa-chart-line"></i><span>周报</span></a>
      <a href="打卡页面.html" class="flex flex-col items-center ${activePage === 'checkin' ? 'text-primary' : ''}"><i class="fas fa-check-circle"></i><span>打卡</span></a>
      <a href="个人中心页面.html" class="flex flex-col items-center ${activePage === 'profile' ? 'text-primary' : ''}"><i class="fas fa-user"></i><span>我的</span></a>
    </div>
  </footer>
  `;
  const container = document.getElementById('footer-container');
  if (container) container.innerHTML = footer;
}

function bindGlobalLogout() {
  const logoutBtn = document.getElementById('global-logout');
  if (!logoutBtn) return;
  logoutBtn.addEventListener('click', function (e) {
    e.preventDefault();
    AppState.logout();
    showToast('已退出登录');
    setTimeout(() => safeNavigate('登录页面.html'), 300);
  });
}

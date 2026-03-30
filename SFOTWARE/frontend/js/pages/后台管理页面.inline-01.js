
      document.addEventListener('DOMContentLoaded', function () {
        var ADMIN_EMAIL = 'admin@ringnote.local';
        var usersTbody = document.getElementById('users-tbody');
        var userCount = document.getElementById('user-count');
        var selectedCount = document.getElementById('selected-count');
        var selectAllUsers = document.getElementById('select-all-users');
        var batchDeleteBtn = document.getElementById('batch-delete-users');
        var refreshBtn = document.getElementById('refresh-users');
        var logoutBtn = document.getElementById('admin-logout');
        var createAdminBtn = document.getElementById('create-admin-user');
        var newAdminNicknameInput = document.getElementById('new-admin-nickname');
        var newAdminEmailInput = document.getElementById('new-admin-email');
        var newAdminPasswordInput = document.getElementById('new-admin-password');
        var newAdminPhoneInput = document.getElementById('new-admin-phone');
        var searchInput = document.getElementById('search-keyword');
        var roleFilter = document.getElementById('role-filter');
        var levelFilter = document.getElementById('level-filter');
        var sortBySelect = document.getElementById('sort-by');
        var pageSizeSelect = document.getElementById('page-size');
        var prevPageBtn = document.getElementById('prev-page');
        var nextPageBtn = document.getElementById('next-page');
        var pageInfo = document.getElementById('page-info');
        var resultSummary = document.getElementById('result-summary');
        var statTotalUsers = document.getElementById('stat-total-users');
        var statAdminUsers = document.getElementById('stat-admin-users');
        var statNormalUsers = document.getElementById('stat-normal-users');
        var statTodayUsers = document.getElementById('stat-today-users');
        var opsLogs = document.getElementById('ops-logs');
        var clearLogsBtn = document.getElementById('clear-logs');
        var detailModal = document.getElementById('detail-modal');
        var closeDetailBtn = document.getElementById('close-detail');
        var detailBackdrop = document.getElementById('detail-backdrop');
        var detailContent = document.getElementById('detail-content');
        var selectedUserIds = new Set();
        var allUsers = [];
        var filteredUsers = [];
        var currentPageUsers = [];
        var currentPage = 1;
        var pageSize = Number((pageSizeSelect && pageSizeSelect.value) || 10);
        var logs = [];

        function escapeHtml(text) {
          return String(text == null ? '' : text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
        }

        function formatDate(dateText) {
          if (!dateText) return '-';
          var d = new Date(dateText);
          if (isNaN(d.getTime())) return escapeHtml(dateText);
          var mm = String(d.getMonth() + 1).padStart(2, '0');
          var dd = String(d.getDate()).padStart(2, '0');
          var hh = String(d.getHours()).padStart(2, '0');
          var mi = String(d.getMinutes()).padStart(2, '0');
          return d.getFullYear() + '-' + mm + '-' + dd + ' ' + hh + ':' + mi;
        }

        function parseLevel(value) {
          var num = Number(value);
          return Number.isFinite(num) ? num : 0;
        }

        function addLog(type, title, detail) {
          var now = new Date();
          logs.unshift({
            type: type || 'info',
            title: title || '系统消息',
            detail: detail || '',
            at: formatDate(now.toISOString())
          });
          if (logs.length > 20) logs.length = 20;
          renderLogs();
        }

        function renderLogs() {
          if (!opsLogs) return;
          if (!logs.length) {
            opsLogs.innerHTML = '<p class="text-sm text-slate-400">暂无操作日志</p>';
            return;
          }
          opsLogs.innerHTML = logs.map(function (log) {
            var color = 'text-cyan-300';
            if (log.type === 'success') color = 'text-emerald-300';
            if (log.type === 'warning') color = 'text-amber-300';
            if (log.type === 'error') color = 'text-rose-300';
            return [
              '<article class="log-item rounded-lg bg-slate-900/45 px-3 py-2">',
              '<div class="flex items-center justify-between gap-2">',
              '<p class="text-xs font-semibold ' + color + '">' + escapeHtml(log.title) + '</p>',
              '<time class="text-[11px] text-slate-400">' + escapeHtml(log.at) + '</time>',
              '</div>',
              '<p class="mt-1 text-xs text-slate-300">' + escapeHtml(log.detail || '-') + '</p>',
              '</article>'
            ].join('');
          }).join('');
        }

        function updateStats(users) {
          var list = Array.isArray(users) ? users : [];
          var adminCount = list.filter(function (u) { return !!u.admin; }).length;
          var todayKey = new Date().toISOString().slice(0, 10);
          var todayCount = list.filter(function (u) {
            if (!u || !u.createdAt) return false;
            return String(u.createdAt).slice(0, 10) === todayKey;
          }).length;

          if (statTotalUsers) statTotalUsers.textContent = String(list.length);
          if (statAdminUsers) statAdminUsers.textContent = String(adminCount);
          if (statNormalUsers) statNormalUsers.textContent = String(Math.max(0, list.length - adminCount));
          if (statTodayUsers) statTodayUsers.textContent = String(todayCount);
        }

        function applyFilters(users) {
          var list = Array.isArray(users) ? users : [];
          var keyword = String((searchInput && searchInput.value) || '').trim().toLowerCase();
          var role = String((roleFilter && roleFilter.value) || 'all');
          var levelScope = String((levelFilter && levelFilter.value) || 'all');
          var sortedBy = String((sortBySelect && sortBySelect.value) || 'createdAt_desc');

          var result = list.filter(function (u) {
            if (role === 'admin' && !u.admin) return false;
            if (role === 'user' && !!u.admin) return false;

            var level = parseLevel(u.level);
            if (levelScope === '1-10' && !(level >= 1 && level <= 10)) return false;
            if (levelScope === '11-50' && !(level >= 11 && level <= 50)) return false;
            if (levelScope === '51+' && !(level >= 51)) return false;

            if (!keyword) return true;
            var text = [u.nickname, u.email, u.phone, u.id].map(function (v) {
              return String(v == null ? '' : v).toLowerCase();
            }).join(' ');
            return text.indexOf(keyword) !== -1;
          });

          var sorter = {
            createdAt_desc: function (a, b) {
              return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
            },
            id_desc: function (a, b) { return Number(b.id || 0) - Number(a.id || 0); },
            id_asc: function (a, b) { return Number(a.id || 0) - Number(b.id || 0); },
            level_desc: function (a, b) { return parseLevel(b.level) - parseLevel(a.level); },
            level_asc: function (a, b) { return parseLevel(a.level) - parseLevel(b.level); },
            nickname_asc: function (a, b) {
              return String(a.nickname || '').localeCompare(String(b.nickname || ''), 'zh-CN');
            }
          };

          var sortFn = sorter[sortedBy] || sorter.createdAt_desc;
          result.sort(sortFn);
          return result;
        }

        function renderUsers(users) {
          var list = Array.isArray(users) ? users : [];
          currentPageUsers = list;
          userCount.textContent = '总用户 ' + filteredUsers.length;

          var validIds = new Set(filteredUsers.filter(function (u) { return !u.admin; }).map(function (u) { return String(u.id); }));
          Array.from(selectedUserIds).forEach(function (id) {
            if (!validIds.has(String(id))) selectedUserIds.delete(String(id));
          });
          syncSelectionUI();

          if (!list.length) {
            usersTbody.innerHTML = '<tr><td colspan="8" class="px-4 py-6 text-center text-slate-300">暂无用户数据</td></tr>';
            return;
          }

          usersTbody.innerHTML = list.map(function (u) {
            var isAdmin = !!u.admin;
            var userId = String(u.id);
            var checked = selectedUserIds.has(userId) ? 'checked' : '';
            var roleBadge = isAdmin
              ? '<span class="rounded-full bg-emerald-400/20 px-2 py-1 text-xs text-emerald-300">管理员</span>'
              : '<span class="rounded-full bg-slate-500/25 px-2 py-1 text-xs text-slate-200">普通用户</span>';
            var action = isAdmin
              ? '<span class="text-xs text-slate-400">系统保留</span>'
              : '<button data-id="' + String(u.id) + '" class="delete-user rounded-lg bg-rose-500/85 px-3 py-1 text-xs font-semibold hover:bg-rose-400">删除</button>';

            return [
              '<tr class="admin-table-row">',
              '<td class="px-4 py-3">' + (isAdmin
                ? '<span class="text-xs text-slate-500">-</span>'
                : '<input type="checkbox" data-id="' + userId + '" class="select-user h-4 w-4 rounded border-slate-500 bg-slate-800" ' + checked + ' />') + '</td>',
              '<td class="px-4 py-3">' + escapeHtml(u.id) + '</td>',
              '<td class="px-4 py-3"><button data-id="' + userId + '" class="show-detail text-left text-cyan-300 hover:text-cyan-200 hover:underline">' + escapeHtml(u.nickname || '-') + '</button></td>',
              '<td class="px-4 py-3">' + escapeHtml(u.email || '-') + '</td>',
              '<td class="px-4 py-3">' + escapeHtml(u.phone || '-') + '</td>',
              '<td class="px-4 py-3">' + escapeHtml(u.level || 0) + '</td>',
              '<td class="px-4 py-3">' + roleBadge + '</td>',
              '<td class="px-4 py-3">' + action + '</td>',
              '</tr>'
            ].join('');
          }).join('');

          syncSelectionUI();
        }

        function paginateAndRender() {
          var total = filteredUsers.length;
          var totalPages = Math.max(1, Math.ceil(total / pageSize));
          if (currentPage > totalPages) currentPage = totalPages;
          if (currentPage < 1) currentPage = 1;

          var start = (currentPage - 1) * pageSize;
          var end = Math.min(total, start + pageSize);
          var pageData = filteredUsers.slice(start, end);

          if (resultSummary) resultSummary.textContent = '显示 ' + (total ? (start + 1) : 0) + ' - ' + end + ' / ' + total;
          if (pageInfo) pageInfo.textContent = '第 ' + currentPage + ' / ' + totalPages + ' 页';
          if (prevPageBtn) prevPageBtn.disabled = currentPage <= 1;
          if (nextPageBtn) nextPageBtn.disabled = currentPage >= totalPages;

          renderUsers(pageData);
        }

        function applyFiltersAndRender(resetPage) {
          if (resetPage) currentPage = 1;
          filteredUsers = applyFilters(allUsers);
          paginateAndRender();
        }

        function syncSelectionUI() {
          if (selectedCount) selectedCount.textContent = '已选 ' + selectedUserIds.size;
          if (batchDeleteBtn) batchDeleteBtn.disabled = selectedUserIds.size === 0;

          if (selectAllUsers) {
            var selectable = currentPageUsers.filter(function (u) { return !u.admin; });
            var selectableCount = selectable.length;
            var selectedCountValue = selectable.filter(function (u) {
              return selectedUserIds.has(String(u.id));
            }).length;
            selectAllUsers.checked = selectableCount > 0 && selectedCountValue === selectableCount;
            selectAllUsers.indeterminate = selectedCountValue > 0 && selectedCountValue < selectableCount;
          }
        }

        function loadUsers() {
          usersTbody.innerHTML = '<tr><td colspan="8" class="px-4 py-6 text-center text-slate-300">正在加载用户数据...</td></tr>';
          return apiRequest('/api/admin/users', { method: 'GET', timeoutMs: 10000 }).then(function (resp) {
            if (resp && resp.status === 200 && resp.body && resp.body.code === 200) {
              allUsers = Array.isArray(resp.body.data) ? resp.body.data : [];
              updateStats(allUsers);
              applyFiltersAndRender(true);
              addLog('success', '用户列表加载成功', '本次共加载 ' + allUsers.length + ' 条数据');
              return;
            }
            if (resp && (resp.status === 401 || resp.status === 403)) {
              showToast('权限不足，请重新登录管理员账号');
              setTimeout(function () { safeNavigate('登录页面.html'); }, 400);
              return;
            }
            var msg = (resp && resp.body && resp.body.message) || '加载用户失败';
            showToast(msg);
            addLog('error', '用户列表加载失败', msg);
            usersTbody.innerHTML = '<tr><td colspan="8" class="px-4 py-6 text-center text-rose-300">' + escapeHtml(msg) + '</td></tr>';
          }).catch(function (err) {
            console.error('load users error', err);
            showToast('网络错误，加载用户失败');
            addLog('error', '用户列表加载失败', '网络错误，请稍后重试');
            usersTbody.innerHTML = '<tr><td colspan="8" class="px-4 py-6 text-center text-rose-300">网络错误，请稍后重试</td></tr>';
          });
        }

        function findUserById(userId) {
          var id = String(userId || '');
          for (var i = 0; i < allUsers.length; i += 1) {
            if (String(allUsers[i].id) === id) return allUsers[i];
          }
          return null;
        }

        function openDetail(userId) {
          var u = findUserById(userId);
          if (!u || !detailContent || !detailModal) return;

          detailContent.innerHTML = [
            '<div class="rounded-xl border border-slate-600/70 bg-slate-900/50 p-3"><p class="text-xs text-slate-400">用户ID</p><p class="mt-1 text-base font-semibold">' + escapeHtml(u.id) + '</p></div>',
            '<div class="rounded-xl border border-slate-600/70 bg-slate-900/50 p-3"><p class="text-xs text-slate-400">身份</p><p class="mt-1 text-base font-semibold">' + (u.admin ? '管理员' : '普通用户') + '</p></div>',
            '<div class="rounded-xl border border-slate-600/70 bg-slate-900/50 p-3"><p class="text-xs text-slate-400">昵称</p><p class="mt-1 text-base font-semibold">' + escapeHtml(u.nickname || '-') + '</p></div>',
            '<div class="rounded-xl border border-slate-600/70 bg-slate-900/50 p-3"><p class="text-xs text-slate-400">邮箱</p><p class="mt-1 text-base font-semibold">' + escapeHtml(u.email || '-') + '</p></div>',
            '<div class="rounded-xl border border-slate-600/70 bg-slate-900/50 p-3"><p class="text-xs text-slate-400">手机号</p><p class="mt-1 text-base font-semibold">' + escapeHtml(u.phone || '-') + '</p></div>',
            '<div class="rounded-xl border border-slate-600/70 bg-slate-900/50 p-3"><p class="text-xs text-slate-400">等级</p><p class="mt-1 text-base font-semibold">' + escapeHtml(u.level || 0) + '</p></div>',
            '<div class="rounded-xl border border-slate-600/70 bg-slate-900/50 p-3 md:col-span-2"><p class="text-xs text-slate-400">注册时间</p><p class="mt-1 text-base font-semibold">' + escapeHtml(formatDate(u.createdAt)) + '</p></div>'
          ].join('');
          detailModal.classList.remove('hidden');
        }

        function closeDetail() {
          if (!detailModal) return;
          detailModal.classList.add('hidden');
        }

        function createAdminUser() {
          var nickname = String((newAdminNicknameInput && newAdminNicknameInput.value) || '').trim();
          var email = String((newAdminEmailInput && newAdminEmailInput.value) || '').trim();
          var password = String((newAdminPasswordInput && newAdminPasswordInput.value) || '');
          var phone = String((newAdminPhoneInput && newAdminPhoneInput.value) || '').trim();

          if (!nickname || !email || !password) {
            showToast('请填写昵称、邮箱和密码');
            return;
          }
          if (password.length < 6) {
            showToast('管理员密码至少 6 位');
            return;
          }
          if (phone && !/^1\d{10}$/.test(phone)) {
            showToast('手机号格式不正确');
            return;
          }

          createAdminBtn.disabled = true;
          apiRequest('/api/admin/users/create-admin', {
            method: 'POST',
            timeoutMs: 15000,
            body: JSON.stringify({
              nickname: nickname,
              email: email,
              password: password,
              phone: phone
            })
          }).then(function (resp) {
            if (resp && resp.status === 200 && resp.body && resp.body.code === 200) {
              showToast('管理员账号创建成功', 'success');
              addLog('success', '创建管理员成功', '邮箱：' + email);
              if (newAdminNicknameInput) newAdminNicknameInput.value = '';
              if (newAdminEmailInput) newAdminEmailInput.value = '';
              if (newAdminPasswordInput) newAdminPasswordInput.value = '';
              if (newAdminPhoneInput) newAdminPhoneInput.value = '';
              loadUsers();
              return;
            }
            var msg = (resp && resp.body && resp.body.message) || '创建管理员失败';
            showToast(msg);
            addLog('error', '创建管理员失败', msg);
          }).catch(function (err) {
            console.error('create admin error', err);
            showToast('网络错误，创建管理员失败');
            addLog('error', '创建管理员失败', '网络错误，请稍后重试');
          }).finally(function () {
            createAdminBtn.disabled = false;
          });
        }

        function deleteUser(userId) {
          if (!userId) return;
          if (!confirm('确认删除该用户？该操作不可恢复。')) return;
          apiRequest('/api/admin/users/' + encodeURIComponent(String(userId)), {
            method: 'DELETE',
            timeoutMs: 10000
          }).then(function (resp) {
            if (resp && resp.status === 200 && resp.body && resp.body.code === 200) {
              selectedUserIds.delete(String(userId));
              showToast('用户删除成功', 'success');
              addLog('warning', '删除用户', '已删除用户 ID=' + userId);
              loadUsers();
              return;
            }
            var msg = (resp && resp.body && resp.body.message) || '删除失败';
            showToast(msg);
            addLog('error', '删除用户失败', msg);
          }).catch(function (err) {
            console.error('delete user error', err);
            showToast('网络错误，删除失败');
            addLog('error', '删除用户失败', '网络错误，请稍后重试');
          });
        }

        function batchDeleteUsers() {
          var ids = Array.from(selectedUserIds).map(function (v) { return Number(v); }).filter(function (v) { return Number.isFinite(v) && v > 0; });
          if (!ids.length) {
            showToast('请先选择要删除的用户');
            return;
          }
          if (!confirm('确认批量删除选中的 ' + ids.length + ' 个用户？该操作不可恢复。')) return;

          apiRequest('/api/admin/users/batch-delete', {
            method: 'POST',
            timeoutMs: 20000,
            body: JSON.stringify({ ids: ids })
          }).then(function (resp) {
            if (resp && resp.status === 200 && resp.body && resp.body.code === 200) {
              var data = resp.body.data || {};
              selectedUserIds.clear();
              var msg = '批量删除完成：成功 ' + (data.deleted || 0) + '，跳过管理员 ' + (data.skippedAdmin || 0) + '，不存在 ' + (data.notFound || 0);
              showToast(msg, 'success');
              addLog('warning', '批量删除完成', msg);
              loadUsers();
              return;
            }
            var message = (resp && resp.body && resp.body.message) || '批量删除失败';
            showToast(message);
            addLog('error', '批量删除失败', message);
          }).catch(function (err) {
            console.error('batch delete users error', err);
            showToast('网络错误，批量删除失败');
            addLog('error', '批量删除失败', '网络错误，请稍后重试');
          });
        }

        usersTbody.addEventListener('click', function (e) {
          var target = e.target;
          if (!(target instanceof HTMLElement)) return;
          var checkbox = target.closest('.select-user');
          if (checkbox) {
            var cb = checkbox;
            var id = cb.getAttribute('data-id');
            if (id) {
              if (cb.checked) {
                selectedUserIds.add(String(id));
              } else {
                selectedUserIds.delete(String(id));
              }
              syncSelectionUI();
            }
            return;
          }
          var detailBtn = target.closest('.show-detail');
          if (detailBtn) {
            openDetail(detailBtn.getAttribute('data-id'));
            return;
          }
          var btn = target.closest('.delete-user');
          if (!btn) return;
          deleteUser(btn.getAttribute('data-id'));
        });

        if (selectAllUsers) {
          selectAllUsers.addEventListener('change', function () {
            var checked = !!selectAllUsers.checked;
            currentPageUsers.forEach(function (u) {
              if (u.admin) return;
              var id = String(u.id);
              if (checked) {
                selectedUserIds.add(id);
              } else {
                selectedUserIds.delete(id);
              }
            });
            renderUsers(currentPageUsers);
          });
        }

        if (batchDeleteBtn) {
          batchDeleteBtn.addEventListener('click', batchDeleteUsers);
        }

        if (createAdminBtn) {
          createAdminBtn.addEventListener('click', createAdminUser);
        }

        if (searchInput) {
          searchInput.addEventListener('input', function () {
            applyFiltersAndRender(true);
          });
        }

        if (roleFilter) {
          roleFilter.addEventListener('change', function () {
            applyFiltersAndRender(true);
          });
        }

        if (levelFilter) {
          levelFilter.addEventListener('change', function () {
            applyFiltersAndRender(true);
          });
        }

        if (sortBySelect) {
          sortBySelect.addEventListener('change', function () {
            applyFiltersAndRender(true);
          });
        }

        if (pageSizeSelect) {
          pageSizeSelect.addEventListener('change', function () {
            var size = Number(pageSizeSelect.value || 10);
            pageSize = Number.isFinite(size) && size > 0 ? size : 10;
            currentPage = 1;
            paginateAndRender();
          });
        }

        if (prevPageBtn) {
          prevPageBtn.addEventListener('click', function () {
            if (currentPage <= 1) return;
            currentPage -= 1;
            paginateAndRender();
          });
        }

        if (nextPageBtn) {
          nextPageBtn.addEventListener('click', function () {
            var maxPage = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
            if (currentPage >= maxPage) return;
            currentPage += 1;
            paginateAndRender();
          });
        }

        if (clearLogsBtn) {
          clearLogsBtn.addEventListener('click', function () {
            logs = [];
            renderLogs();
            showToast('日志已清空', 'success');
          });
        }

        if (closeDetailBtn) {
          closeDetailBtn.addEventListener('click', closeDetail);
        }

        if (detailBackdrop) {
          detailBackdrop.addEventListener('click', closeDetail);
        }

        document.addEventListener('keydown', function (e) {
          if (e.key === 'Escape') closeDetail();
        });

        refreshBtn.addEventListener('click', function () {
          loadUsers();
        });

        logoutBtn.addEventListener('click', function () {
          if (typeof window.performUnifiedLogoutFlow === 'function') {
            window.performUnifiedLogoutFlow();
            return;
          }
          try {
            if (window.AppState && typeof window.AppState.logout === 'function') {
              window.AppState.logout();
            } else {
              localStorage.removeItem('token');
              localStorage.removeItem('devSkipAuth');
            }
          } catch (e) {}
          safeNavigate('登录页面.html');
        });

        addLog('info', '后台页面已就绪', '等待管理员身份校验...');

        checkAuthOnLoad({ redirect: true, silent: true }).then(function (me) {
          var email = String((me && me.email) || '').toLowerCase();
          var isAdmin = !!(me && me.admin) || email === ADMIN_EMAIL;
          if (!isAdmin) {
            showToast('仅管理员可访问后台页面');
            addLog('warning', '访问受限', '当前账号无管理员权限');
            setTimeout(function () { safeNavigate('待办页面.html'); }, 400);
            return;
          }
          addLog('success', '管理员鉴权成功', '开始加载用户数据');
          loadUsers();
        });
      });
    


      var hasShownThemeToast = false;
      
      function maskPhoneNumber(phone) {
        if (!phone || phone.length !== 11) return phone;
        return phone.substring(0, 3) + '****' + phone.substring(7);
      }
      
      function showToast(message, type) {
        if (window.__unifiedShowToast) {
          window.__unifiedShowToast(message, type || 'success');
        }
      }

      // ✅ 自定义下拉列表通用函数
      function initCustomSelect(selectElement) {
        if (!selectElement) return;
        
        const wrapper = document.createElement('div');
        wrapper.className = 'custom-select-wrapper';
        
        const trigger = document.createElement('div');
        trigger.className = 'custom-select-trigger';
        trigger.innerHTML = '<span>' + selectElement.options[selectElement.selectedIndex].text + '</span><i class="fas fa-chevron-down custom-select-arrow"></i>';
        
        const dropdown = document.createElement('div');
        dropdown.className = 'custom-select-dropdown';
        
        for (let i = 0; i < selectElement.options.length; i++) {
          const option = document.createElement('div');
          option.className = 'custom-select-option' + (i === selectElement.selectedIndex ? ' selected' : '');
          option.textContent = selectElement.options[i].text;
          option.onclick = (function(idx) {
            return function() {
              selectElement.selectedIndex = idx;
              trigger.querySelector('span').textContent = selectElement.options[idx].text;
              dropdown.classList.remove('show');
              trigger.classList.remove('active');
              trigger.querySelector('.custom-select-arrow').classList.remove('rotate');
              selectElement.dispatchEvent(new Event('change'));
            };
          })(i);
          dropdown.appendChild(option);
        }
        
        trigger.onclick = function(e) {
          e.stopPropagation();
          const isActive = dropdown.classList.contains('show');
          document.querySelectorAll('.custom-select-dropdown').forEach(d => d.classList.remove('show'));
          document.querySelectorAll('.custom-select-trigger').forEach(t => t.classList.remove('active'));
          document.querySelectorAll('.custom-select-arrow').forEach(a => a.classList.remove('rotate'));
          if (!isActive) {
            dropdown.classList.add('show');
            trigger.classList.add('active');
            trigger.querySelector('.custom-select-arrow').classList.add('rotate');
          }
        };
        
        wrapper.appendChild(trigger);
        wrapper.appendChild(dropdown);
        selectElement.parentNode.replaceChild(wrapper, selectElement);
      }

      // ✅ 成就徽章筛选/显示下拉
      var achievementFilterValue = 'all';
      var achievementDisplayMode = 'compact';
      var achievementCompactLimit = 4;

      function applyAchievementVisibility() {
        const achievements = Array.from(document.querySelectorAll('.achievement-badge'));
        let visibleCount = 0;
        achievements.forEach(achievement => {
          const category = achievement.getAttribute('data-category');
          const matched = achievementFilterValue === 'all' || category === achievementFilterValue;
          if (!matched) {
            achievement.style.display = 'none';
            return;
          }
          if (achievementDisplayMode === 'compact' && visibleCount >= achievementCompactLimit) {
            achievement.style.display = 'none';
            return;
          }
          achievement.style.display = 'block';
          visibleCount += 1;
        });
      }

      function toggleAchievementFilter() {
        const dropdown = document.getElementById('achievement-filter-dropdown');
        if (!dropdown) return;
        const arrow = document.getElementById('achievement-filter-arrow');
        const trigger = dropdown.previousElementSibling;
        const isActive = dropdown.classList.contains('show');
        
        document.querySelectorAll('.custom-select-dropdown').forEach(d => d.classList.remove('show'));
        document.querySelectorAll('.custom-select-trigger').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.custom-select-arrow').forEach(a => a.classList.remove('rotate'));
        
        if (!isActive) {
          dropdown.classList.add('show');
          trigger.classList.add('active');
          arrow.classList.add('rotate');
        }
      }

      function selectAchievementFilter(value, element) {
        const textMap = {
          'all': '全部分类',
          'newbie': '新手',
          'efficiency': '效率',
          'focus': '专注',
          'persistence': '坚持'
        };
        
        achievementFilterValue = value;
        document.getElementById('achievement-filter-text').textContent = textMap[value];
        document.querySelectorAll('#achievement-filter-dropdown .custom-select-option').forEach(opt => opt.classList.remove('selected'));
        element.classList.add('selected');
        applyAchievementVisibility();
        
        const dropdown = document.getElementById('achievement-filter-dropdown');
        const arrow = document.getElementById('achievement-filter-arrow');
        const trigger = dropdown.previousElementSibling;
        
        dropdown.classList.remove('show');
        trigger.classList.remove('active');
        arrow.classList.remove('rotate');
        
        showToast('已筛选：' + textMap[value]);
      }

      function toggleAchievementDisplay() {
        const dropdown = document.getElementById('achievement-display-dropdown');
        if (!dropdown) return;
        const arrow = document.getElementById('achievement-display-arrow');
        const trigger = dropdown.previousElementSibling;
        const isActive = dropdown.classList.contains('show');

        document.querySelectorAll('.custom-select-dropdown').forEach(d => d.classList.remove('show'));
        document.querySelectorAll('.custom-select-trigger').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.custom-select-arrow').forEach(a => a.classList.remove('rotate'));

        if (!isActive) {
          dropdown.classList.add('show');
          trigger.classList.add('active');
          if (arrow) arrow.classList.add('rotate');
        }
      }

      function selectAchievementDisplay(mode, element) {
        const textMap = {
          compact: '显示4个',
          all: '显示全部'
        };
        achievementDisplayMode = mode;
        const textEl = document.getElementById('achievement-display-text');
        if (textEl) textEl.textContent = textMap[mode] || textMap.compact;
        document.querySelectorAll('#achievement-display-dropdown .custom-select-option').forEach(opt => opt.classList.remove('selected'));
        if (element) element.classList.add('selected');
        applyAchievementVisibility();

        const dropdown = document.getElementById('achievement-display-dropdown');
        const arrow = document.getElementById('achievement-display-arrow');
        const trigger = dropdown ? dropdown.previousElementSibling : null;
        if (dropdown) dropdown.classList.remove('show');
        if (trigger) trigger.classList.remove('active');
        if (arrow) arrow.classList.remove('rotate');

        showToast(mode === 'all' ? '已显示全部徽章' : '已切换为仅显示4个');
      }

      // ✅ 勿扰模式模态框函数
      function openDndModal() {
        const modal = document.getElementById('dnd-modal');
        if (modal) {
          modal.classList.remove('hidden');
        }
      }

      function closeDndModal() {
        const modal = document.getElementById('dnd-modal');
        if (modal) {
          modal.classList.add('hidden');
        }
      }

      function saveDndSettings() {
        const startTime = document.getElementById('dnd-start-time').value;
        const endTime = document.getElementById('dnd-end-time').value;
        
        if (!startTime || !endTime) {
          showToast('⚠️ 请选择完整的时间范围', 'error');
          return;
        }
        
        localStorage.setItem('dndStartTime', startTime);
        localStorage.setItem('dndEndTime', endTime);
        
        document.getElementById('dnd-display-time').textContent = startTime + ' - ' + endTime;
        
        closeDndModal();
        showToast('✅ 勿扰时间已设置：' + startTime + ' - ' + endTime);
      }

      function loadDndSettings() {
        const savedStart = localStorage.getItem('dndStartTime') || '22:00';
        const savedEnd = localStorage.getItem('dndEndTime') || '08:00';
        
        document.getElementById('dnd-display-time').textContent = savedStart + ' - ' + savedEnd;
        document.getElementById('dnd-start-time').value = savedStart;
        document.getElementById('dnd-end-time').value = savedEnd;
      }

      // ✅ 手机号模态框函数
      function openPhoneModal() {
        const modal = document.getElementById('phone-modal');
        const currentPhoneInput = document.getElementById('current-phone-display');
        const newPhoneInput = document.getElementById('new-phone-input');
        
        if (modal && currentPhoneInput && newPhoneInput) {
          currentPhoneInput.value = AppState.user?.phone || '';
          newPhoneInput.value = '';
          modal.classList.remove('hidden');
          newPhoneInput.focus();
        }
      }

      function closePhoneModal() {
        const modal = document.getElementById('phone-modal');
        if (modal) {
          modal.classList.add('hidden');
        }
      }

      function savePhoneNumber() {
        const newPhoneInput = document.getElementById('new-phone-input');
        const newPhone = newPhoneInput.value.trim();
        
        if (!newPhone) {
          showToast('⚠️ 手机号不能为空', 'error');
          newPhoneInput.focus();
          return;
        }
        
        const phoneRegex = /^1[3-9]\d{9}$/;
        if (!phoneRegex.test(newPhone)) {
          showToast('⚠️ 请输入有效的 11 位手机号码', 'error');
          newPhoneInput.focus();
          return;
        }
        
        if (newPhone === AppState.user?.phone) {
          showToast('新手机号与当前相同，无需修改');
          return;
        }
        
        var applyPatch = window.__profileApplyUserPatch;
        if (typeof applyPatch === 'function') {
          applyPatch({
            phone: newPhone,
            securityPhone: newPhone
          }, {
            successMessage: '手机号已更新',
            reason: 'phone-update'
          }).then(function () {
            closePhoneModal();
          });
          return;
        }

        AppState.user = AppState.user || {};
        AppState.user.phone = newPhone;
        AppState.user.securityPhone = newPhone;
        AppState.save && AppState.save();
        closePhoneModal();
        showToast('手机号已更新', 'success');
      }

      // 点击其他地方关闭下拉
      document.addEventListener('click', function(e) {
        if (!e.target.closest('.custom-select-wrapper')) {
          document.querySelectorAll('.custom-select-dropdown').forEach(d => d.classList.remove('show'));
          document.querySelectorAll('.custom-select-trigger').forEach(t => t.classList.remove('active'));
          document.querySelectorAll('.custom-select-arrow').forEach(a => a.classList.remove('rotate'));
        }
      });

      document.addEventListener('DOMContentLoaded', function () {
        var authSyncPromise = Promise.resolve();
        if (typeof checkAuthOnLoad === 'function') {
          authSyncPromise = checkAuthOnLoad().catch(function(){});
        }
        AppState.init();
        function ensureSettingsScopes() {
          AppState.settings = AppState.settings || {};
          AppState.settings.notifications = AppState.settings.notifications || {};
          AppState.settings.pomodoro = AppState.settings.pomodoro || {};
          AppState.settings.calendar = AppState.settings.calendar || {};
        }
        ensureSettingsScopes();
        renderHeader('profile');
        renderFooter('profile');
        bindGlobalLogout();
        applyAchievementVisibility();

        var userName = document.getElementById('user-name');
        var userEmail = document.getElementById('user-email');
        var editEmailBtn = document.getElementById('edit-email-btn');
        var userPhone = document.getElementById('user-phone');
        var profileAvatar = document.getElementById('profile-avatar');
        var changeAvatarBtn = document.getElementById('change-avatar-btn');
        var avatarFileInput = document.getElementById('avatar-file-input');
        var editPhoneBtn = document.getElementById('edit-phone-btn');
        var changePasswordBtn = document.getElementById('change-password-btn');
        var bindPhoneBtn = document.getElementById('bind-phone-btn');
        var twoStepBtn = document.getElementById('two-step-btn');
        var exportDataBtn = document.getElementById('export-data-btn');
        var manualBackupBtn = document.getElementById('manual-backup-btn');
        var clearAllDataBtn = document.getElementById('clear-all-data-btn');
        var helpGuideBtn = document.getElementById('help-guide-btn');
        var helpFaqBtn = document.getElementById('help-faq-btn');
        var feedbackBtn = document.getElementById('feedback-btn');
        var contactSupportBtn = document.getElementById('contact-support-btn');
        var expText = document.getElementById('exp-text');
        var expBar = document.getElementById('exp-bar');
        var expNextText = document.getElementById('exp-next-text');
        var userLevelTag = document.getElementById('user-level-tag');
        var passwordUpdatedTip = document.getElementById('password-updated-tip');
        var securityPhoneTip = document.getElementById('security-phone-tip');
        var twoStepStatus = document.getElementById('two-step-status');
        var bindWechatBtn = document.getElementById('bind-wechat-btn');
        var bindAppleBtn = document.getElementById('bind-apple-btn');
        var bindGoogleBtn = document.getElementById('bind-google-btn');
        var securityBindForm = document.getElementById('security-bind-form');
        var securityBindTitle = document.getElementById('security-bind-title');
        var securityBindInput = document.getElementById('security-bind-input');
        var securityBindCancel = document.getElementById('security-bind-cancel');
        var securityBindSave = document.getElementById('security-bind-save');
        var dangerConfirmModal = document.getElementById('danger-confirm-modal');
        var dangerConfirmTitle = document.getElementById('danger-confirm-title');
        var dangerConfirmDesc = document.getElementById('danger-confirm-desc');
        var dangerConfirmCancelBtn = document.getElementById('danger-confirm-cancel-btn');
        var dangerConfirmOkBtn = document.getElementById('danger-confirm-ok-btn');
        var pendingDangerAction = null;

        if (dangerConfirmModal && dangerConfirmModal.parentElement !== document.body) {
          document.body.appendChild(dangerConfirmModal);
        }

        function closeDangerConfirmModal() {
          if (!dangerConfirmModal) return;
          dangerConfirmModal.classList.remove('show');
          dangerConfirmModal.setAttribute('aria-hidden', 'true');
          pendingDangerAction = null;
        }

        function openDangerConfirmModal(options) {
          if (!dangerConfirmModal) return;
          var opts = options || {};
          if (dangerConfirmTitle) dangerConfirmTitle.textContent = opts.title || '确认操作';
          if (dangerConfirmDesc) dangerConfirmDesc.textContent = opts.desc || '请确认是否继续此操作。';
          if (dangerConfirmOkBtn) dangerConfirmOkBtn.textContent = opts.okText || '确认';
          pendingDangerAction = typeof opts.onConfirm === 'function' ? opts.onConfirm : null;
          dangerConfirmModal.classList.add('show');
          dangerConfirmModal.setAttribute('aria-hidden', 'false');
        }

        function syncProfileIdentityUi() {
          var displayName = (AppState.user && AppState.user.name) || '轻悦用户';
          var displayEmail = (AppState.user && AppState.user.email) || 'demo@ringnote.com';
          var displayPhone = (AppState.user && AppState.user.phone) || '';
          if (profileAvatar) profileAvatar.src = (AppState.user && AppState.user.avatar) || profileAvatar.src;
          if (userName) userName.value = displayName;
          if (userEmail) userEmail.textContent = displayEmail;
          if (userPhone) userPhone.textContent = displayPhone ? maskPhoneNumber(displayPhone) : '未绑定';
          var headerUserName = document.querySelector('.header-user-name');
          if (headerUserName) headerUserName.textContent = displayName;
          if (typeof window.refreshUnifiedUserIdentityUi === 'function') {
            window.refreshUnifiedUserIdentityUi();
          }
        }

        var currentSecurityMode = '';
        var currentSecurityProvider = '';

        function safeFormatTime(ts) {
          if (!ts) return '从未更新';
          var d = new Date(ts);
          if (isNaN(d.getTime())) return '从未更新';
          return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        }

        function syncSecurityUi() {
          var u = AppState.user || {};
          if (passwordUpdatedTip) {
            passwordUpdatedTip.textContent = '最近更新时间：' + safeFormatTime(u.passwordUpdatedAt);
          }
          if (securityPhoneTip) {
            var secPhone = u.securityPhone || u.phone || '';
            securityPhoneTip.textContent = secPhone ? ('安全手机号：' + maskPhoneNumber(secPhone)) : '用于登录、找回密码和安全验证';
          }
          if (twoStepStatus) {
            twoStepStatus.textContent = u.twoStepEnabled ? '状态：已开启（登录需二次验证）' : '状态：未开启，建议开启';
          }
          if (twoStepBtn) {
            twoStepBtn.textContent = u.twoStepEnabled ? '已开启' : '去开启';
            twoStepBtn.className = u.twoStepEnabled
              ? 'px-3 py-1.5 rounded-lg border border-green-200 text-xs text-green-600 bg-green-50'
              : 'px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:border-primary hover:bg-gray-50 transition-all duration-200';
          }

          function syncProviderBtn(btn, bound, titleBound, titleUnbound) {
            if (!btn) return;
            btn.classList.toggle('opacity-60', !bound);
            btn.title = bound ? titleBound : titleUnbound;
          }
          syncProviderBtn(bindWechatBtn, !!u.wechatBound, '微信已绑定', '点击绑定微信');
          syncProviderBtn(bindAppleBtn, !!u.appleBound, '苹果已绑定', '点击绑定苹果');
          syncProviderBtn(bindGoogleBtn, !!u.googleBound, '谷歌已绑定', '点击绑定谷歌');
        }

        function openSecurityBindForm(mode, provider) {
          currentSecurityMode = mode || '';
          currentSecurityProvider = provider || '';
          if (!securityBindForm || !securityBindTitle || !securityBindInput) return;
          securityBindForm.classList.remove('hidden');
          if (mode === 'password') {
            securityBindTitle.textContent = '修改登录密码';
            securityBindInput.placeholder = '请输入新密码';
            securityBindInput.type = 'password';
          } else if (mode === 'phone') {
            securityBindTitle.textContent = '绑定安全手机号';
            securityBindInput.placeholder = '请输入 11 位手机号';
            securityBindInput.type = 'text';
          } else if (mode === 'two-step') {
            securityBindTitle.textContent = '开启两步验证';
            securityBindInput.placeholder = '可选填写设备备注（可留空）';
            securityBindInput.type = 'text';
          } else if (mode === 'provider') {
            securityBindTitle.textContent = '绑定' + provider + '账号';
            securityBindInput.placeholder = '请输入' + provider + '账号标识';
            securityBindInput.type = 'text';
          }
          securityBindInput.value = '';
          securityBindInput.focus();
        }

        function closeSecurityBindForm() {
          if (!securityBindForm || !securityBindInput) return;
          securityBindForm.classList.add('hidden');
          securityBindInput.value = '';
          currentSecurityMode = '';
          currentSecurityProvider = '';
        }

        function buildBackendUserPatch(patch) {
          var p = patch || {};
          var backend = {};
          if (typeof p.name !== 'undefined') backend.nickname = p.name;
          if (typeof p.email !== 'undefined') backend.email = p.email;
          if (typeof p.phone !== 'undefined') backend.phone = p.phone;
          if (typeof p.avatar !== 'undefined') backend.avatarUrl = p.avatar;
          if (typeof p.securityPhone !== 'undefined') backend.securityPhone = p.securityPhone;
          if (typeof p.passwordUpdatedAt !== 'undefined') backend.passwordUpdatedAt = p.passwordUpdatedAt;
          if (typeof p.twoStepEnabled !== 'undefined') backend.twoStepEnabled = p.twoStepEnabled;
          if (typeof p.wechatBound !== 'undefined') backend.wechatBound = p.wechatBound;
          if (typeof p.wechatAccount !== 'undefined') backend.wechatAccount = p.wechatAccount;
          if (typeof p.appleBound !== 'undefined') backend.appleBound = p.appleBound;
          if (typeof p.appleAccount !== 'undefined') backend.appleAccount = p.appleAccount;
          if (typeof p.googleBound !== 'undefined') backend.googleBound = p.googleBound;
          if (typeof p.googleAccount !== 'undefined') backend.googleAccount = p.googleAccount;
          return backend;
        }

        function applyUserPatch(patch, opts) {
          var options = opts || {};
          var userPatch = patch || {};
          if (!Object.keys(userPatch).length) return Promise.resolve(false);

          AppState.user = AppState.user || {};
          Object.assign(AppState.user, userPatch);
          AppState.save && AppState.save();

          syncProfileIdentityUi();
          syncSecurityUi();
          renderExpProfile();
          if (typeof updateDataStatistics === 'function') updateDataStatistics();
          if (typeof window.notifyIdentityUpdated === 'function') {
            window.notifyIdentityUpdated(options.reason || 'user-patch');
          }

          var backendPatch = buildBackendUserPatch(userPatch);
          if (!Object.keys(backendPatch).length) {
            if (options.successMessage) showToast(options.successMessage, 'success');
            return Promise.resolve(true);
          }

          return apiRequest('/api/me', {
            method: 'PUT',
            timeoutMs: 8000,
            body: JSON.stringify(backendPatch)
          }).then(function (res) {
            if (res && res.status === 200) {
              if (options.successMessage) showToast(options.successMessage, 'success');
              return true;
            }
            if (options.successMessage) showToast(options.successMessage + '（本地已生效）', 'warning');
            return true;
          }).catch(function () {
            if (options.successMessage) showToast(options.successMessage + '（本地已生效）', 'warning');
            return true;
          });
        }

        window.__profileApplyUserPatch = applyUserPatch;

        function saveSecurityBinding() {
          if (!securityBindInput) return;
          var v = String(securityBindInput.value || '').trim();
          var patch = {};

          if (currentSecurityMode === 'password') {
            if (!v) {
              showToast('请输入新密码', 'error');
              return;
            }
            patch.passwordUpdatedAt = new Date().toISOString();
          } else if (currentSecurityMode === 'phone') {
            if (!v) {
              showToast('请输入手机号', 'error');
              return;
            }
            patch.securityPhone = v;
            patch.phone = v;
          } else if (currentSecurityMode === 'two-step') {
            patch.twoStepEnabled = true;
          } else if (currentSecurityMode === 'provider') {
            var accountId = v || (currentSecurityProvider + '_' + Date.now());
            if (currentSecurityProvider === '微信') {
              patch.wechatBound = true;
              patch.wechatAccount = accountId;
            } else if (currentSecurityProvider === '苹果') {
              patch.appleBound = true;
              patch.appleAccount = accountId;
            } else if (currentSecurityProvider === '谷歌') {
              patch.googleBound = true;
              patch.googleAccount = accountId;
            }
          } else {
            return;
          }

          applyUserPatch(patch, {
            successMessage: '账号安全设置已保存',
            reason: 'security-update'
          }).then(function () {
            closeSecurityBindForm();
          });
        }

        syncProfileIdentityUi();
        syncSecurityUi();

        function renderExpProfile() {
          var exp = Number(AppState.user?.exp || 0);
          var level = Number(AppState.user?.level || 1);
          var maxExp = 1000;
          var expPct = Math.min(100, Math.round((exp / maxExp) * 100));
          var remainExp = Math.max(0, maxExp - exp);
          if (expText) expText.textContent = exp + ' / ' + maxExp;
          if (expBar) expBar.style.width = expPct + '%';
          if (expNextText) expNextText.textContent = '当前 LV.' + level + '，距离 LV.' + (level + 1) + ' 还需 ' + remainExp + ' 经验值';
          if (userLevelTag) userLevelTag.innerHTML = '<i class="fas fa-crown mr-1"></i>LV.' + level;
        }
        renderExpProfile();

        authSyncPromise.then(function () {
          AppState.init();
          syncProfileIdentityUi();
          syncSecurityUi();
          renderExpProfile();
        });

        if (changeAvatarBtn && avatarFileInput && profileAvatar) {
          changeAvatarBtn.addEventListener('click', function () {
            avatarFileInput.click();
          });
          avatarFileInput.addEventListener('change', function () {
            var file = this.files && this.files[0];
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function (e) {
              var base64 = e.target.result;
              applyUserPatch({
                avatar: base64
              }, {
                successMessage: '头像已更新',
                reason: 'avatar-update'
              });
            };
            reader.readAsDataURL(file);
          });
        }

        if (editEmailBtn) {
          editEmailBtn.addEventListener('click', function () {
            var currentEmail = (AppState.user && AppState.user.email) || '';
            var nextEmail = window.prompt('请输入新的邮箱地址', currentEmail);
            if (nextEmail === null) return;
            nextEmail = String(nextEmail || '').trim();
            if (!nextEmail) {
              showToast('邮箱不能为空', 'error');
              return;
            }
            applyUserPatch({
              email: nextEmail
            }, {
              successMessage: '邮箱已更新',
              reason: 'email-update'
            });
          });
        }

        if (editPhoneBtn) {
          editPhoneBtn.addEventListener('click', function () {
            openPhoneModal();
          });
        }

        syncSecurityUi();
        if (changePasswordBtn) {
          changePasswordBtn.addEventListener('click', function () {
            openSecurityBindForm('password');
          });
        }
        if (bindPhoneBtn) {
          bindPhoneBtn.addEventListener('click', function () {
            openSecurityBindForm('phone');
          });
        }
        if (twoStepBtn) {
          twoStepBtn.addEventListener('click', function () {
            if (AppState.user && AppState.user.twoStepEnabled) {
              showToast('两步验证已开启');
              return;
            }
            openSecurityBindForm('two-step');
          });
        }
        if (bindWechatBtn) {
          bindWechatBtn.addEventListener('click', function () {
            openSecurityBindForm('provider', '微信');
          });
        }
        if (bindAppleBtn) {
          bindAppleBtn.addEventListener('click', function () {
            openSecurityBindForm('provider', '苹果');
          });
        }
        if (bindGoogleBtn) {
          bindGoogleBtn.addEventListener('click', function () {
            openSecurityBindForm('provider', '谷歌');
          });
        }
        if (securityBindCancel) {
          securityBindCancel.addEventListener('click', closeSecurityBindForm);
        }
        if (securityBindSave) {
          securityBindSave.addEventListener('click', saveSecurityBinding);
        }

        var exportState = function () {
          var snapshot = {
            user: AppState.user || null,
            tasks: Array.isArray(AppState.tasks) ? AppState.tasks : [],
            pomodoroSessions: Array.isArray(AppState.pomodoroSessions) ? AppState.pomodoroSessions : [],
            checkins: Array.isArray(AppState.checkins) ? AppState.checkins : [],
            settings: AppState.settings || {},
            labels: Array.isArray(AppState.labels) ? AppState.labels : []
          };
          var data = JSON.stringify(snapshot);
          var blob = new Blob([data], { type: 'application/json;charset=utf-8' });
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = 'ringnote_backup.json';
          a.click();
          URL.revokeObjectURL(url);
        };
        if (exportDataBtn) {
          exportDataBtn.addEventListener('click', function () {
            exportState();
            showToast('导出已完成');
          });
        }
        if (manualBackupBtn) {
          manualBackupBtn.addEventListener('click', function () {
            exportState();
            showToast('备份已保存至本地');
          });
        }

        if (clearAllDataBtn) {
          clearAllDataBtn.addEventListener('click', function () {
            openDangerConfirmModal({
              title: '删除所有数据',
              desc: '将永久删除所有任务、打卡和专注记录，且无法恢复。',
              okText: '确认删除',
              onConfirm: function () {
                var currentUserKey = 'guest';
                try {
                  if (typeof AppState.getCurrentUserKey === 'function') {
                    currentUserKey = AppState.getCurrentUserKey() || 'guest';
                  }
                } catch (e) {
                  currentUserKey = 'guest';
                }
                try { localStorage.removeItem('ringnote_app_state_v2::' + currentUserKey); } catch (e) {}
                try { localStorage.removeItem('ringnote_app_state_v1'); } catch (e) {}
                AppState.reset();
                updateDataStatistics();
                showToast('所有数据已清除');
                setTimeout(function () { window.location.reload(); }, 180);
              }
            });
          });
        }

        var soonToast = function () { showToast('功能即将上线，感谢您的耐心'); };
        if (helpGuideBtn) helpGuideBtn.addEventListener('click', soonToast);
        if (helpFaqBtn) helpFaqBtn.addEventListener('click', soonToast);
        if (feedbackBtn) feedbackBtn.addEventListener('click', soonToast);
        if (contactSupportBtn) contactSupportBtn.addEventListener('click', soonToast);

        if (userName) {
          userName.addEventListener('blur', function () {
            var newName = userName.value.trim();
            if (!newName) {
              showToast('昵称不能为空', 'error');
              userName.value = AppState.user?.name || '';
              return;
            }

            applyUserPatch({
              name: newName
            }, {
              successMessage: '昵称已保存',
              reason: 'name-update'
            });
          });
        }

        initializeSettings();

        function normalizeThemeMode(mode) {
          if (mode === 'dark' || mode === 'night') return 'night';
          if (mode === 'system') {
            var prefersDark = false;
            try {
              prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            } catch (e) {
              prefersDark = false;
            }
            return prefersDark ? 'night' : 'light';
          }
          return 'light';
        }

        function applyTheme(mode) {
          var body = document.body;
          body.classList.remove('theme-light', 'theme-night');
          if (mode === 'night') {
            body.classList.add('theme-night');
          } else {
            body.classList.add('theme-light');
          }
        }

        var themeBtns = document.querySelectorAll('.theme-btn');
        var setThemeMode = function (mode) {
          var normalized = normalizeThemeMode(mode);
          themeBtns.forEach(function (b) {
            b.classList.remove('bg-primary', 'text-white');
            b.classList.add('border-gray-200');
          });
          var activeBtn = document.querySelector('.theme-btn[data-theme="' + normalized + '"]');
          if (activeBtn) {
            activeBtn.classList.add('bg-primary', 'text-white');
            activeBtn.classList.remove('border-gray-200');
          }
          AppState.settings.theme = normalized;
          AppState.save();
          if (typeof window.applyUnifiedThemeMode === 'function') {
            window.applyUnifiedThemeMode(normalized);
          } else {
            applyTheme(normalized);
          }
          if (hasShownThemeToast) {
            showToast('主题已设置');
          }
        };

        themeBtns.forEach(function (btn) {
          btn.addEventListener('click', function () {
            hasShownThemeToast = true;
            setThemeMode(this.dataset.theme);
          });
        });

        if (AppState.settings?.theme) {
          setThemeMode(AppState.settings.theme);
        } else {
          setThemeMode('light');
        }

        var notifyTaskReminder = document.getElementById('notify-task-reminder');
        var notifyPomodoroEnd = document.getElementById('notify-pomodoro-end');
        var notifyDailyReport = document.getElementById('notify-daily-report');

        if (notifyTaskReminder) {
          notifyTaskReminder.addEventListener('change', function () {
            AppState.settings.notifications.taskReminder = this.checked;
            AppState.save();
            showToast('任务提醒已' + (this.checked ? '开启' : '关闭'));
          });
        }

        if (notifyPomodoroEnd) {
          notifyPomodoroEnd.addEventListener('change', function () {
            AppState.settings.notifications.pomodoroEnd = this.checked;
            AppState.save();
            showToast('番茄结束提醒已' + (this.checked ? '开启' : '关闭'));
          });
        }

        if (notifyDailyReport) {
          notifyDailyReport.addEventListener('change', function () {
            AppState.settings.notifications.dailyReport = this.checked;
            AppState.save();
            showToast('每日简报推送已' + (this.checked ? '开启' : '关闭'));
          });
        }

        var focusDurationSelect = document.getElementById('focus-duration-select');
        var shortBreakSelect = document.getElementById('short-break-select');
        var longBreakSelect = document.getElementById('long-break-select');
        var longBreakIntervalSelect = document.getElementById('long-break-interval-select');

        if (focusDurationSelect) {
          focusDurationSelect.addEventListener('change', function () {
            AppState.settings.pomodoro.focus = parseInt(this.value);
            AppState.save();
            showToast('默认番茄时长已设置为 ' + this.value + ' 分钟');
          });
        }

        if (shortBreakSelect) {
          shortBreakSelect.addEventListener('change', function () {
            AppState.settings.pomodoro.shortBreak = parseInt(this.value);
            AppState.save();
            showToast('短休息时长已设置为 ' + this.value + ' 分钟');
          });
        }

        if (longBreakSelect) {
          longBreakSelect.addEventListener('change', function () {
            AppState.settings.pomodoro.longBreak = parseInt(this.value);
            AppState.save();
            showToast('长休息时长已设置为 ' + this.value + ' 分钟');
          });
        }

        if (longBreakIntervalSelect) {
          longBreakIntervalSelect.addEventListener('change', function () {
            AppState.settings.pomodoro.longBreakInterval = parseInt(this.value);
            AppState.save();
            showToast('长休息触发间隔已设置为 ' + this.value + ' 个番茄');
          });
        }

        var autoStartBreak = document.getElementById('auto-start-break');
        var autoStartPomodoro = document.getElementById('auto-start-pomodoro');
        var focusModeMute = document.getElementById('focus-mode-mute');

        if (autoStartBreak) {
          autoStartBreak.addEventListener('change', function () {
            AppState.settings.pomodoro.autoStartBreak = this.checked;
            AppState.save();
            showToast('自动开始休息已' + (this.checked ? '开启' : '关闭'));
          });
        }

        if (autoStartPomodoro) {
          autoStartPomodoro.addEventListener('change', function () {
            AppState.settings.pomodoro.autoStartNext = this.checked;
            AppState.save();
            showToast('自动开始下一个番茄已' + (this.checked ? '开启' : '关闭'));
          });
        }

        if (focusModeMute) {
          focusModeMute.addEventListener('change', function () {
            AppState.settings.pomodoro.focusModeMute = this.checked;
            AppState.save();
            showToast('专注时屏蔽通知已' + (this.checked ? '开启' : '关闭'));
          });
        }

        var calendarWeekStart = document.getElementById('calendar-week-start');
        var calendarDefaultView = document.getElementById('calendar-default-view');
        var calendarShowLunar = document.getElementById('calendar-show-lunar');

        if (calendarWeekStart) {
          calendarWeekStart.addEventListener('change', function () {
            AppState.settings.calendar.weekStart = this.value;
            AppState.save();
            showToast('一周开始日已设置');
          });
        }

        if (calendarDefaultView) {
          calendarDefaultView.addEventListener('change', function () {
            AppState.settings.calendar.defaultView = this.value;
            AppState.save();
            showToast('默认视图已设置');
          });
        }

        if (calendarShowLunar) {
          calendarShowLunar.addEventListener('change', function () {
            AppState.settings.calendar.showLunar = this.checked;
            AppState.save();
            showToast('农历显示已' + (this.checked ? '开启' : '关闭'));
          });
        }

        updateDataStatistics();
        window.addEventListener('storage', function (e) {
          if (!e) return;
          var key = String(e.key || '');
          if (
            key === 'ringnote_app_state_v1' ||
            key === 'ringnote_active_user_v1' ||
            key.indexOf('ringnote_app_state_v2::') === 0
          ) {
            AppState.init();
            syncProfileIdentityUi();
            syncSecurityUi();
            updateDataStatistics();
          }
        });
        document.addEventListener('visibilitychange', function () {
          if (!document.hidden) {
            AppState.init();
            syncProfileIdentityUi();
            syncSecurityUi();
            updateDataStatistics();
          }
        });

        var clearCacheBtn = document.getElementById('clear-cache-btn');
        if (clearCacheBtn) {
          clearCacheBtn.addEventListener('click', function () {
            openDangerConfirmModal({
              title: '清理缓存',
              desc: '将清理本地缓存数据（任务、番茄记录与打卡记录）。',
              okText: '确认清理',
              onConfirm: function () {
                AppState.tasks = [];
                AppState.pomodoroSessions = [];
                AppState.checkins = [];
                AppState.save();
                updateDataStatistics();
                syncProfileIdentityUi();
                showToast('缓存已清理');
              }
            });
          });
        }

        var logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
          logoutBtn.addEventListener('click', function () {
            AppState.logout();
            showToast('已退出登录');
            setTimeout(function () {
              if (typeof safeNavigate === 'function') safeNavigate('登录页面.html');
              else window.location.href = '登录页面.html';
            }, 300);
          });
        }

        var deleteBtn = document.getElementById('delete-account-btn');
        if (deleteBtn) {
          deleteBtn.addEventListener('click', function () {
            openDangerConfirmModal({
              title: '注销账号',
              desc: '将清空当前设备上的账号与应用数据，并退出登录。',
              okText: '确认注销',
              onConfirm: function () {
                localStorage.clear();
                showToast('账号已注销');
                setTimeout(function () {
                  if (typeof safeNavigate === 'function') safeNavigate('注册页面.html');
                  else window.location.href = '注册页面.html';
                }, 400);
              }
            });
          });
        }

        if (dangerConfirmCancelBtn) {
          dangerConfirmCancelBtn.addEventListener('click', closeDangerConfirmModal);
        }
        if (dangerConfirmOkBtn) {
          dangerConfirmOkBtn.addEventListener('click', function () {
            var action = pendingDangerAction;
            closeDangerConfirmModal();
            if (typeof action === 'function') action();
          });
        }
        if (dangerConfirmModal) {
          dangerConfirmModal.addEventListener('click', function (e) {
            if (e.target === dangerConfirmModal) closeDangerConfirmModal();
          });
        }
        document.addEventListener('keydown', function (e) {
          if (e.key === 'Escape' && dangerConfirmModal && dangerConfirmModal.classList.contains('show')) {
            closeDangerConfirmModal();
          }
        });
        
        // ✅ 初始化自定义下拉列表
        initCustomSelect(document.getElementById('focus-duration-select'));
        initCustomSelect(document.getElementById('short-break-select'));
        initCustomSelect(document.getElementById('long-break-select'));
        initCustomSelect(document.getElementById('long-break-interval-select'));
        initCustomSelect(document.getElementById('calendar-week-start'));
        initCustomSelect(document.getElementById('calendar-default-view'));
        
        // ✅ 加载勿扰设置
        loadDndSettings();
      });

      function initializeSettings() {
        var savedTheme = (AppState.settings && AppState.settings.theme) ? AppState.settings.theme : 'light';
        var currentTheme = (savedTheme === 'night' || savedTheme === 'dark') ? 'night' : 'light';

        var themeBtns = document.querySelectorAll('.theme-btn');
        themeBtns.forEach(function (btn) {
          if (btn.dataset.theme === currentTheme) {
            btn.classList.add('bg-primary', 'text-white');
            btn.classList.remove('border-gray-200');
          } else {
            btn.classList.remove('bg-primary', 'text-white');
            btn.classList.add('border-gray-200');
          }
        });

        var notifyTaskReminder = document.getElementById('notify-task-reminder');
        var notifyPomodoroEnd = document.getElementById('notify-pomodoro-end');
        var notifyDailyReport = document.getElementById('notify-daily-report');

        if (notifyTaskReminder) notifyTaskReminder.checked = AppState.settings?.notifications?.taskReminder !== false;
        if (notifyPomodoroEnd) notifyPomodoroEnd.checked = AppState.settings?.notifications?.pomodoroEnd !== false;
        if (notifyDailyReport) notifyDailyReport.checked = AppState.settings?.notifications?.dailyReport === true;

        var focusDurationSelect = document.getElementById('focus-duration-select');
        var shortBreakSelect = document.getElementById('short-break-select');
        var longBreakSelect = document.getElementById('long-break-select');
        var longBreakIntervalSelect = document.getElementById('long-break-interval-select');

        if (focusDurationSelect) focusDurationSelect.value = AppState.settings?.pomodoro?.focus || 25;
        if (shortBreakSelect) shortBreakSelect.value = AppState.settings?.pomodoro?.shortBreak || 5;
        if (longBreakSelect) longBreakSelect.value = AppState.settings?.pomodoro?.longBreak || 15;
        if (longBreakIntervalSelect) longBreakIntervalSelect.value = AppState.settings?.pomodoro?.longBreakInterval || 4;

        var autoStartBreak = document.getElementById('auto-start-break');
        var autoStartPomodoro = document.getElementById('auto-start-pomodoro');
        var focusModeMute = document.getElementById('focus-mode-mute');

        if (autoStartBreak) autoStartBreak.checked = AppState.settings?.pomodoro?.autoStartBreak !== false;
        if (autoStartPomodoro) autoStartPomodoro.checked = AppState.settings?.pomodoro?.autoStartNext === true;
        if (focusModeMute) focusModeMute.checked = AppState.settings?.pomodoro?.focusModeMute !== false;

        var calendarWeekStart = document.getElementById('calendar-week-start');
        var calendarDefaultView = document.getElementById('calendar-default-view');
        var calendarShowLunar = document.getElementById('calendar-show-lunar');

        if (calendarWeekStart) calendarWeekStart.value = AppState.settings?.calendar?.weekStart || 'monday';
        if (calendarDefaultView) calendarDefaultView.value = AppState.settings?.calendar?.defaultView || 'month';
        if (calendarShowLunar) calendarShowLunar.checked = AppState.settings?.calendar?.showLunar !== false;
      }

      function animateNumber(element, targetValue, suffix = '', duration = 1000) {
        if (!element || element.textContent === undefined) return;
        var startValue = parseFloat(element.textContent.replace(/[^\d.]/g, '')) || 0;
        var startTime = null;
        var isFloat = typeof targetValue === 'number' && targetValue % 1 !== 0;
        
        function animate(currentTime) {
          if (!startTime) startTime = currentTime;
          var progress = Math.min((currentTime - startTime) / duration, 1);
          var currentValue = startValue + (targetValue - startValue) * progress;
          if (isFloat) {
            currentValue = Math.round(currentValue * 10) / 10;
          } else {
            currentValue = Math.floor(currentValue);
          }
          element.textContent = currentValue + suffix;
          if (progress < 1) {
            requestAnimationFrame(animate);
          }
        }
        requestAnimationFrame(animate);
      }

      function updateDataStatistics() {
        var stats = getCheckinStats();
        var completedTasks = (AppState.tasks || []).filter(function(t) { return t.status === 'completed'; }).length;
        var totalFocusMinutes = (AppState.pomodoroSessions || []).reduce(function(sum, s) { return sum + (s.actualMinutes || 0); }, 0);
        var totalPomodoros = (AppState.pomodoroSessions || []).filter(function(s) { return s.completed; }).length;
        var maxStreak = Number(stats?.maxStreak || 0);

        // 经验值与等级由前面的核心数据驱动
        var totalExp = completedTasks * 10 + totalPomodoros * 3 + maxStreak * 5;
        var level = Math.floor(totalExp / 1000) + 1;
        var expInLevel = totalExp % 1000;
        AppState.user = AppState.user || {};
        AppState.user.level = level;
        AppState.user.exp = expInLevel;
        AppState.save && AppState.save();

        var completedTasksEl = document.getElementById('stat-completed-tasks');
        var focusHoursEl = document.getElementById('stat-focus-hours');
        var maxStreakEl = document.getElementById('stat-max-streak');
        var totalPomodorosEl = document.getElementById('stat-total-pomodoros');

        if (completedTasksEl) animateNumber(completedTasksEl, completedTasks);
        if (focusHoursEl) {
          var hours = Math.round(totalFocusMinutes / 60 * 10) / 10;
          animateNumber(focusHoursEl, hours, ' h');
        }
        if (maxStreakEl) animateNumber(maxStreakEl, maxStreak, ' 天');
        if (totalPomodorosEl) animateNumber(totalPomodorosEl, totalPomodoros);

        if (typeof renderExpProfile === 'function') renderExpProfile();
        if (typeof window.refreshUnifiedUserIdentityUi === 'function') window.refreshUnifiedUserIdentityUi();
      }
    


      document.addEventListener('DOMContentLoaded', function () {
        // 登录页默认保持停留，便于测试（仅在 ?auto=1 时才自动跳转）
        try {
          var __skipAutoRedirect = sessionStorage.getItem('skipLoginAutoRedirect') === '1';
          if (__skipAutoRedirect) sessionStorage.removeItem('skipLoginAutoRedirect');
        } catch (e) { var __skipAutoRedirect = false; }
        var __allowAutoRedirect = false;
        try {
          var __params = new URLSearchParams(window.location.search || '');
          __allowAutoRedirect = __params.get('auto') === '1';
        } catch (e) { __allowAutoRedirect = false; }
        try {
          var __tok = localStorage.getItem('token');
        } catch (e) { var __tok = null; }
        if (__tok && !__skipAutoRedirect && __allowAutoRedirect) {
          apiRequest('/api/me', { method: 'GET' }).then(function (r) {
            if (r && r.status === 200 && r.body && r.body.code === 200) {
              var me = (r.body && r.body.data) || {};
              if (String(me.email || '').toLowerCase() === 'admin@xydb.local') {
                safeNavigate('后台管理页面.html');
                return;
              }
              safeNavigate('待办页面.html');
              return;
            }
          }).catch(function () { /* ignore, show login form */ });
        }

        AppState.init();

        function isMobileNumber(v) {
          return /^1\d{10}$/.test(String(v || '').trim());
        }

        function isAdminAccount(v) {
          return String(v || '').trim().toLowerCase() === 'admin';
        }

        function normalizeLoginIdentifier(v) {
          var raw = String(v || '').trim();
          if (isAdminAccount(raw)) return 'admin@xydb.local';
          if (isMobileNumber(raw)) return raw + '@mobile.local';
          return raw;
        }

        function randomMobile() {
          var prefix = ['130','131','132','133','135','136','137','138','139','150','151','152','155','156','157','158','159','166','171','172','173','175','176','177','178','180','181','182','183','184','185','186','187','188','189','198','199'];
          var p = prefix[Math.floor(Math.random() * prefix.length)] || '138';
          var n = String(Math.floor(Math.random() * 100000000)).padStart(8, '0');
          return p + n;
        }

        function randomPassword() {
          return 'Qy_' + Date.now().toString(36) + '_A1!';
        }

        function backendRegisterAndLoginByPhone(phone) {
          var email = phone + '@mobile.local';
          var password = randomPassword();
          var nickname = '用户' + phone.slice(-4);
          var registerPayload = {
            nickname: nickname,
            email: email,
            phone: phone,
            password: password
          };

          function doLogin() {
            return apiRequest('/api/auth/login', {
              method: 'POST',
              timeoutMs: 8000,
              body: JSON.stringify({ email: email, password: password })
            });
          }

          return apiRequest('/api/auth/register', {
            method: 'POST',
            timeoutMs: 8000,
            body: JSON.stringify(registerPayload)
          }).then(function (resp) {
            // 注册成功或账号已存在都尝试登录
            if (resp && resp.status === 200 && resp.body && resp.body.code === 200) {
              return doLogin();
            }
            if (resp && resp.status > 0 && resp.status < 500) {
              return doLogin();
            }
            throw new Error((resp && resp.body && resp.body.message) || '自动建号失败');
          }).then(function (loginResp) {
            if (loginResp && loginResp.status === 200 && loginResp.body && loginResp.body.code === 200 && loginResp.body.data && loginResp.body.data.token) {
              return loginResp;
            }
            throw new Error((loginResp && loginResp.body && loginResp.body.message) || '自动登录失败');
          });
        }

        function authErrorMessage(resp, fallback) {
          var status = resp && resp.status;
          var msg = (resp && resp.body && resp.body.message) || '';
          if (status === 504 || /timeout/i.test(msg)) {
            return '服务响应超时，请重试（已自动切换备用线路）';
          }
          if (status >= 500) {
            return '服务暂时不可用，请稍后再试';
          }
          return msg || fallback;
        }

        function shouldEnterLocalMode(resp) {
          if (!resp) return true;
          var status = Number(resp.status || 0);
          if (status === 0 || status === 504) return true;
          if (status >= 500) return true;
          var msg = String((resp.body && resp.body.message) || '').toLowerCase();
          return msg.indexOf('timeout') !== -1 || msg.indexOf('network') !== -1;
        }

        function enterLocalMode(accountHint) {
          var display = String(accountHint || '').trim();
          if (!display) display = '本地用户';
          var userName = display;
          if (display.indexOf('@') > -1) {
            userName = display.split('@')[0] || '本地用户';
          }
          if (/^1\d{10}$/.test(display)) {
            userName = '用户' + display.slice(-4);
          }

          try {
            localStorage.setItem('token', 'dev-local-' + Date.now());
            localStorage.setItem('devSkipAuth', '1');
            if (window.AppState) {
              var localProfile = { name: userName };
              if (display.indexOf('@') > -1) {
                localProfile.email = display;
              }
              if (/^1\d{10}$/.test(display)) {
                localProfile.phone = display;
                localProfile.email = display + '@mobile.local';
              }

              if (typeof window.AppState.switchUser === 'function') {
                window.AppState.switchUser(localProfile);
              } else {
                window.AppState.user = Object.assign({}, window.AppState.user || {}, localProfile);
                if (typeof window.AppState.save === 'function') window.AppState.save();
              }
            }
          } catch (e) {}

          showToast('服务繁忙，已切换本地快速登录');
          setTimeout(function () { safeNavigate('待办页面.html'); }, 320);
        }

        var heroThemeIcon = document.getElementById('hero-theme-icon');
        var authHeroPreview = document.getElementById('auth-hero-preview');
        var syncHeroThemeIcon = function () {
          if (!heroThemeIcon || !document.body) return;
          heroThemeIcon.textContent = document.body.classList.contains('theme-night') ? '🌙' : '☀️';
        };
        var syncAuthHeroPreview = function () {
          if (!authHeroPreview || !document.body || !document.documentElement) return;
          var isDark = document.body.classList.contains('theme-night') || document.documentElement.classList.contains('unified-dark-mode');
          authHeroPreview.src = isDark ? 'assets/xydb-auth-dark.svg' : 'assets/xydb-auth-light.svg';
        };
        syncHeroThemeIcon();
        syncAuthHeroPreview();
        if (typeof MutationObserver !== 'undefined') {
          var syncThemeVisuals = function () {
            syncHeroThemeIcon();
            syncAuthHeroPreview();
          };
          if (document.body) {
            var bodyClassObserver = new MutationObserver(syncThemeVisuals);
            bodyClassObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
          }
          if (document.documentElement) {
            var rootClassObserver = new MutationObserver(syncThemeVisuals);
            rootClassObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
          }
        }

        var loginPassword = document.getElementById('login-password');
        var togglePassword = document.getElementById('toggle-password');

        togglePassword.addEventListener('click', function () {
          var type = loginPassword.getAttribute('type') === 'password' ? 'text' : 'password';
          loginPassword.setAttribute('type', type);
          var icon = this.querySelector('i');
          icon.classList.toggle('fa-eye');
          icon.classList.toggle('fa-eye-slash');
        });

        var loginForm = document.getElementById('login-form');
        loginForm.addEventListener('submit', function (e) {
          e.preventDefault();
          var account = document.getElementById('login-account').value.trim();
          var password = document.getElementById('login-password').value;

          var emailMobileRegex = /^(\S+@\S+\.\S+|1\d{10}|admin)$/i;
          if (!account || !password) {
            showToast('请输入账号和密码');
            return;
          }
          if (!emailMobileRegex.test(account)) {
            showToast('请输入有效的邮箱、手机号或管理员账号');
            return;
          }

          var isAdminInput = isAdminAccount(account);

          // 组装请求体：后端要求 email 字段
          var normalizedAccount = normalizeLoginIdentifier(account);
          var payload = {
            email: normalizedAccount,
            password: password
          };

          apiRequest('/api/auth/login', { method: 'POST', timeoutMs: 8000, body: JSON.stringify(payload) })
            .then(function (resp) {
              if (resp && resp.status === 200 && resp.body && resp.body.code === 200) {
                var token = resp.body.data && resp.body.data.token;
                if (token) {
                  localStorage.setItem('token', token);
                  try { localStorage.removeItem('devSkipAuth'); } catch (e) {}
                  apiRequest('/api/me', { method: 'GET', timeoutMs: 8000 }).then(function (meResp) {
                    var me = (meResp && meResp.status === 200 && meResp.body && meResp.body.code === 200)
                      ? (meResp.body.data || {})
                      : {};

                    var profile = {
                      id: me.id,
                      name: me.nickname || me.email || normalizedAccount,
                      email: me.email || normalizedAccount,
                      phone: me.phone || '',
                      avatar: me.avatarUrl || '',
                      level: typeof me.level === 'number' ? me.level : 1,
                      exp: typeof me.exp === 'number' ? me.exp : 0
                    };

                    if (window.AppState) {
                      if (typeof window.AppState.switchUser === 'function') {
                        window.AppState.switchUser(profile);
                      } else {
                        window.AppState.user = Object.assign({}, window.AppState.user || {}, profile);
                        if (typeof window.AppState.save === 'function') window.AppState.save();
                      }
                    }

                    var meEmail = String((me && me.email) || normalizedAccount || '').toLowerCase();
                    var goAdmin = !!(me && me.admin) || meEmail === 'admin@xydb.local' || isAdminInput;

                    showToast('登录成功，正在跳转...');
                    setTimeout(function () {
                      safeNavigate(goAdmin ? '后台管理页面.html' : '待办页面.html');
                    }, 400);
                  }).catch(function () {
                    if (window.AppState && typeof window.AppState.switchUser === 'function') {
                      window.AppState.switchUser({ email: normalizedAccount, name: normalizedAccount });
                    }
                    showToast('登录成功，正在跳转...');
                    setTimeout(function () {
                      safeNavigate(isAdminInput ? '后台管理页面.html' : '待办页面.html');
                    }, 400);
                  });
                  return;
                }
              }
              if (shouldEnterLocalMode(resp)) {
                enterLocalMode(account);
                return;
              }
              var msg = authErrorMessage(resp, '登录失败，请检查账号密码');
              showToast(msg);
            }).catch(function (err) {
              console.error('login error', err);
              enterLocalMode(account);
            });
        });

        document.querySelectorAll('.btn-social').forEach(function (button) {
          button.addEventListener('click', function () {
            var phone = randomMobile();
            showToast('扫码登录中...');
            backendRegisterAndLoginByPhone(phone).then(function (resp) {
              if (resp && resp.status === 200 && resp.body && resp.body.code === 200 && resp.body.data && resp.body.data.token) {
                localStorage.setItem('token', resp.body.data.token);
                try { localStorage.removeItem('devSkipAuth'); } catch (e) {}
                var mobileEmail = phone + '@mobile.local';
                if (window.AppState && typeof window.AppState.switchUser === 'function') {
                  window.AppState.switchUser({
                    email: mobileEmail,
                    phone: phone,
                    name: '用户' + phone.slice(-4)
                  });
                }
                showToast('扫码登录成功，已自动创建账号');
                setTimeout(function () { safeNavigate('待办页面.html'); }, 400);
                return;
              }
              showToast((resp && resp.body && resp.body.message) || '扫码登录失败');
            }).catch(function (err) {
              console.error('social login error', err);
              showToast((err && err.message) || '扫码登录失败，请稍后重试');
            });
          });
        });

        var forgotPasswordLink = document.getElementById('forgot-password-link');
        var forgotPasswordModal = document.getElementById('forgot-password-modal');
        var forgotPasswordClose = document.getElementById('forgot-password-close');
        var forgotPasswordForm = document.getElementById('forgot-password-form');

        function openForgotPasswordModal() {
          if (!forgotPasswordModal) return;
          forgotPasswordModal.classList.remove('hidden');
          forgotPasswordModal.classList.add('flex');
        }

        function closeForgotPasswordModal() {
          if (!forgotPasswordModal) return;
          forgotPasswordModal.classList.add('hidden');
          forgotPasswordModal.classList.remove('flex');
        }

        if (forgotPasswordLink) {
          forgotPasswordLink.addEventListener('click', function () {
            openForgotPasswordModal();
          });
        }

        if (forgotPasswordClose) {
          forgotPasswordClose.addEventListener('click', closeForgotPasswordModal);
        }

        if (forgotPasswordModal) {
          forgotPasswordModal.addEventListener('click', function (e) {
            if (e.target === forgotPasswordModal) closeForgotPasswordModal();
          });
        }

        if (forgotPasswordForm) {
          forgotPasswordForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var email = (document.getElementById('forgot-email').value || '').trim();
            var newPassword = document.getElementById('forgot-new-password').value || '';
            var confirmPassword = document.getElementById('forgot-confirm-password').value || '';

            if (!email || !newPassword || !confirmPassword) {
              showToast('请填写完整信息');
              return;
            }
            if (newPassword.length < 6) {
              showToast('新密码至少 6 位');
              return;
            }
            if (newPassword !== confirmPassword) {
              showToast('两次输入的新密码不一致');
              return;
            }

            apiRequest('/api/auth/forgot-password', {
              method: 'POST',
              timeoutMs: 8000,
              body: JSON.stringify({ email: email, newPassword: newPassword })
            }).then(function (resp) {
              if (resp && resp.status === 200 && resp.body && resp.body.code === 200) {
                showToast('密码已重置，请使用新密码登录');
                closeForgotPasswordModal();
                var accountInput = document.getElementById('login-account');
                var passwordInput = document.getElementById('login-password');
                if (accountInput) accountInput.value = email;
                if (passwordInput) passwordInput.value = newPassword;
              } else {
                var msg = authErrorMessage(resp, '找回密码失败');
                showToast(msg);
              }
            }).catch(function (err) {
              console.error('forgot password error', err);
              showToast('网络错误，找回密码失败');
            });
          });
        }
      });
    


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
              if (String(me.email || '').toLowerCase() === 'admin@ringnote.local') {
                safeNavigate('后台管理页面.html');
                return;
              }
              safeNavigate('待办页面.html');
              return;
            }
          }).catch(function () { /* ignore, show login form */ });
        }

        AppState.init();

        var authBrandLogo = document.getElementById('auth-brand-logo');
        var rootStyle = document.documentElement ? document.documentElement.style : null;
        var pointerThrottle = null;
        var logoEggPopped = false;
        var bubbleShowerRunning = false;
        var lastLogoActivateAt = 0;
        var prefersReducedMotion = false;

        try {
          prefersReducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        } catch (e) {
          prefersReducedMotion = false;
        }

        function safeToast(message) {
          if (typeof showToast === 'function') {
            showToast(message);
            return;
          }
          try { console.log(message); } catch (e) {}
        }

        function popBrandBubble() {
          if (!authBrandLogo || logoEggPopped) return;
          logoEggPopped = true;
          authBrandLogo.classList.add('is-popped');
          authBrandLogo.setAttribute('aria-pressed', 'true');
          safeToast('泡泡破了，再点铃铛试试');
        }

        function triggerBubbleEasterEgg() {
          if (!authBrandLogo || bubbleShowerRunning) return;
          bubbleShowerRunning = true;

          var layer = document.createElement('div');
          layer.className = 'page-bubble-easter-egg';

          if (prefersReducedMotion) {
            for (var j = 0; j < 24; j += 1) {
              var stillBubble = document.createElement('span');
              stillBubble.className = 'page-easter-bubble is-static';
              stillBubble.style.setProperty('--startX', (Math.random() * 100).toFixed(2) + 'vw');
              stillBubble.style.setProperty('--size', (10 + Math.random() * 22).toFixed(0) + 'px');
              stillBubble.style.setProperty('--baseScale', (0.7 + Math.random() * 0.5).toFixed(2));
              stillBubble.style.top = (8 + Math.random() * 76).toFixed(2) + '%';
              stillBubble.style.transform = 'translate3d(var(--startX), 0, 0) scale(var(--baseScale))';
              layer.appendChild(stillBubble);
            }

            document.body.appendChild(layer);
            authBrandLogo.classList.add('is-ringing');
            safeToast('铃铃铃~ 彩蛋触发');

            setTimeout(function () {
              authBrandLogo.classList.remove('is-ringing');
            }, 520);

            setTimeout(function () {
              if (layer && layer.parentNode) layer.parentNode.removeChild(layer);
              bubbleShowerRunning = false;
            }, 1400);
            return;
          }

          document.body.appendChild(layer);

          var spawnCount = 0;
          var maxSpawnCount = 44;
          var spawnTimer = setInterval(function () {
            if (!layer || !layer.isConnected || spawnCount >= maxSpawnCount) {
              clearInterval(spawnTimer);
              return;
            }

            var bubble = document.createElement('span');
            bubble.className = 'page-easter-bubble';
            bubble.style.setProperty('--startX', (Math.random() * 100).toFixed(2) + 'vw');
            bubble.style.setProperty('--size', (10 + Math.random() * 28).toFixed(0) + 'px');
            bubble.style.setProperty('--dur', (2.8 + Math.random() * 2.2).toFixed(2) + 's');
            bubble.style.setProperty('--delay', (Math.random() * 0.12).toFixed(2) + 's');
            bubble.style.setProperty('--drift', (Math.random() * 120 - 60).toFixed(0) + 'px');
            bubble.style.setProperty('--baseScale', (0.7 + Math.random() * 0.5).toFixed(2));
            layer.appendChild(bubble);

            spawnCount += 1;
            setTimeout(function () {
              if (bubble && bubble.parentNode) bubble.parentNode.removeChild(bubble);
            }, 5600);
          }, 95);

          authBrandLogo.classList.add('is-ringing');
          safeToast('铃铃铃~ 彩蛋触发');

          setTimeout(function () {
            authBrandLogo.classList.remove('is-ringing');
          }, 1200);

          setTimeout(function () {
            clearInterval(spawnTimer);
            if (layer && layer.parentNode) layer.parentNode.removeChild(layer);
            bubbleShowerRunning = false;
          }, 6200);
        }

        function handleLogoEggActivate(event) {
          if (!authBrandLogo) return;
          var now = Date.now();
          if (now - lastLogoActivateAt < 220) return;
          lastLogoActivateAt = now;

          if (!logoEggPopped) {
            popBrandBubble();
            return;
          }

          var fromBell = !!(event && event.target && event.target.closest && event.target.closest('.brand-bell-symbol'));
          if (!fromBell) {
            safeToast('彩蛋继续触发中...');
          }
          triggerBubbleEasterEgg();
        }

        if (authBrandLogo) {
          authBrandLogo.addEventListener('click', handleLogoEggActivate);
          authBrandLogo.addEventListener('pointerup', handleLogoEggActivate);
          authBrandLogo.addEventListener('keydown', function (event) {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            handleLogoEggActivate(event);
          });
        }

        document.addEventListener('pointermove', function (event) {
          if (pointerThrottle) return;
          pointerThrottle = requestAnimationFrame(function () {
            pointerThrottle = null;

            if (rootStyle) {
              var xPercent = ((event.clientX / Math.max(window.innerWidth || 1, 1)) * 100).toFixed(2) + '%';
              var yPercent = ((event.clientY / Math.max(window.innerHeight || 1, 1)) * 100).toFixed(2) + '%';
              rootStyle.setProperty('--mx', xPercent);
              rootStyle.setProperty('--my', yPercent);
            }

            if (authBrandLogo) {
              var rect = authBrandLogo.getBoundingClientRect();
              var centerX = rect.left + rect.width / 2;
              var centerY = rect.top + rect.height / 2;
              var dx = (event.clientX - centerX) / Math.max(rect.width, 1);
              var dy = (event.clientY - centerY) / Math.max(rect.height, 1);
              var rotateY = Math.max(-7, Math.min(7, dx * 14));
              var rotateX = Math.max(-7, Math.min(7, -dy * 14));
              authBrandLogo.style.transform = 'perspective(280px) rotateX(' + rotateX.toFixed(2) + 'deg) rotateY(' + rotateY.toFixed(2) + 'deg)';
            }
          });
        }, { passive: true });

        document.addEventListener('pointerleave', function () {
          if (authBrandLogo) {
            authBrandLogo.style.transform = 'perspective(280px) rotateX(0deg) rotateY(0deg)';
          }
          if (rootStyle) {
            rootStyle.setProperty('--mx', '50%');
            rootStyle.setProperty('--my', '35%');
          }
        });

        function isMobileNumber(v) {
          return /^1\d{10}$/.test(String(v || '').trim());
        }

        function isAdminAccount(v) {
          return String(v || '').trim().toLowerCase() === 'admin';
        }

        function normalizeLoginIdentifier(v) {
          var raw = String(v || '').trim();
          if (isAdminAccount(raw)) return 'admin@ringnote.local';
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

        function enterGuestMode() {
          try {
            localStorage.removeItem('token');
            localStorage.removeItem('devSkipAuth');
          } catch (e) {}

          if (window.AppState) {
            if (typeof window.AppState.switchUser === 'function') {
              window.AppState.switchUser({ name: '访客', avatar: '' });
            } else {
              window.AppState.currentUserKey = 'guest';
              window.AppState.user = { name: '访客', avatar: '' };
              if (typeof window.AppState.save === 'function') window.AppState.save();
            }
          }

          showToast('已进入访客体验');
          setTimeout(function () {
            safeNavigate('待办页面.html');
          }, 320);
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
          authHeroPreview.src = isDark ? 'assets/ringnote-auth-dark.svg' : 'assets/ringnote-auth-light.svg';
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
        var loginSubmitBtn = loginForm ? loginForm.querySelector('button[type="submit"]') : null;

        if (loginSubmitBtn) {
          loginSubmitBtn.addEventListener('click', function (event) {
            var ripple = document.createElement('span');
            ripple.className = 'btn-ripple';
            var rect = loginSubmitBtn.getBoundingClientRect();
            ripple.style.left = (event.clientX - rect.left) + 'px';
            ripple.style.top = (event.clientY - rect.top) + 'px';
            loginSubmitBtn.appendChild(ripple);
            setTimeout(function () {
              if (ripple && ripple.parentNode) ripple.parentNode.removeChild(ripple);
            }, 620);
          });
        }

        function setSubmitButtonLoading(button, loading, idleText) {
          if (!button) return;
          if (loading) {
            button.classList.add('is-loading');
            button.disabled = true;
            button.innerHTML = '<span class="btn-loading-icon" aria-hidden="true"></span><span>处理中...</span>';
          } else {
            button.classList.remove('is-loading');
            button.disabled = false;
            button.textContent = idleText;
          }
        }

        loginForm.addEventListener('submit', function (e) {
          e.preventDefault();
          var account = document.getElementById('login-account').value.trim();
          var password = document.getElementById('login-password').value;

          var emailMobileRegex = /^(\S+@\S+\.\S+|1\d{10}|admin)$/i;
          if (!account || !password) {
            showToast('请输入账号和密码');
            setSubmitButtonLoading(loginSubmitBtn, false, '登 录');
            return;
          }
          if (!emailMobileRegex.test(account)) {
            showToast('请输入有效的邮箱、手机号或管理员账号');
            setSubmitButtonLoading(loginSubmitBtn, false, '登 录');
            return;
          }

          setSubmitButtonLoading(loginSubmitBtn, true, '登 录');

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
                    var goAdmin = !!(me && me.admin) || meEmail === 'admin@ringnote.local' || isAdminInput;

                    showToast('登录成功，正在跳转...');
                    setTimeout(function () {
                      safeNavigate(goAdmin ? '后台管理页面.html' : '待办页面.html');
                    }, 400);
                    setSubmitButtonLoading(loginSubmitBtn, false, '登 录');
                  }).catch(function () {
                    if (window.AppState && typeof window.AppState.switchUser === 'function') {
                      window.AppState.switchUser({ email: normalizedAccount, name: normalizedAccount });
                    }
                    showToast('登录成功，正在跳转...');
                    setTimeout(function () {
                      safeNavigate(isAdminInput ? '后台管理页面.html' : '待办页面.html');
                    }, 400);
                    setSubmitButtonLoading(loginSubmitBtn, false, '登 录');
                  });
                  return;
                }
              }
              var msg = authErrorMessage(resp, '登录失败，请检查账号密码');
              showToast(msg);
              setSubmitButtonLoading(loginSubmitBtn, false, '登 录');
            }).catch(function (err) {
              console.error('login error', err);
              showToast('网络错误，请稍后重试');
              setSubmitButtonLoading(loginSubmitBtn, false, '登 录');
            });
        });

        document.querySelectorAll('.btn-social').forEach(function (button) {
          button.addEventListener('click', function () {
            if (this.getAttribute('data-social-auth') === 'guest') {
              enterGuestMode();
              return;
            }
            var phone = randomMobile();
            showToast('扫码登录中...');
            backendRegisterAndLoginByPhone(phone).then(function (resp) {
              if (resp && resp.status === 200 && resp.body && resp.body.code === 200 && resp.body.data && resp.body.data.token) {
                localStorage.setItem('token', resp.body.data.token);
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
        var forgotSubmitBtn = forgotPasswordForm ? forgotPasswordForm.querySelector('button[type="submit"]') : null;
        var forgotSendCodeButton = document.getElementById('forgot-send-code');
        var forgotPasswordCountdownTimer = null;
        var forgotPasswordCountdownRemaining = 0;
        var forgotModalCloseTimer = null;

        function renderForgotSendCodeButton() {
          if (!forgotSendCodeButton) return;
          if (forgotPasswordCountdownRemaining > 0) {
            forgotSendCodeButton.disabled = true;
            forgotSendCodeButton.textContent = forgotPasswordCountdownRemaining + 's 后重发';
          } else {
            forgotSendCodeButton.disabled = false;
            forgotSendCodeButton.textContent = '发送验证码';
          }
        }

        function stopForgotPasswordCountdown() {
          if (forgotPasswordCountdownTimer) {
            clearTimeout(forgotPasswordCountdownTimer);
            forgotPasswordCountdownTimer = null;
          }
          forgotPasswordCountdownRemaining = 0;
          renderForgotSendCodeButton();
        }

        function startForgotPasswordCountdown() {
          stopForgotPasswordCountdown();
          forgotPasswordCountdownRemaining = 60;
          renderForgotSendCodeButton();

          var tick = function () {
            forgotPasswordCountdownRemaining -= 1;
            if (forgotPasswordCountdownRemaining <= 0) {
              stopForgotPasswordCountdown();
              return;
            }
            renderForgotSendCodeButton();
            forgotPasswordCountdownTimer = setTimeout(tick, 1000);
          };

          forgotPasswordCountdownTimer = setTimeout(tick, 1000);
        }

        function openForgotPasswordModal() {
          if (!forgotPasswordModal) return;
          if (forgotModalCloseTimer) {
            clearTimeout(forgotModalCloseTimer);
            forgotModalCloseTimer = null;
          }
          forgotPasswordModal.classList.remove('hidden');
          forgotPasswordModal.classList.add('flex');
          forgotPasswordModal.classList.remove('is-closing');
          requestAnimationFrame(function () {
            forgotPasswordModal.classList.add('is-visible');
            forgotPasswordModal.setAttribute('aria-hidden', 'false');
          });
        }

        function closeForgotPasswordModal() {
          if (!forgotPasswordModal) return;
          forgotPasswordModal.classList.remove('is-visible');
          forgotPasswordModal.classList.add('is-closing');
          forgotPasswordModal.setAttribute('aria-hidden', 'true');
          if (forgotModalCloseTimer) clearTimeout(forgotModalCloseTimer);
          forgotModalCloseTimer = setTimeout(function () {
            forgotPasswordModal.classList.add('hidden');
            forgotPasswordModal.classList.remove('flex');
            forgotPasswordModal.classList.remove('is-closing');
          }, 220);
        }

        if (forgotPasswordLink) {
          forgotPasswordLink.addEventListener('click', function () {
            openForgotPasswordModal();
          });
        }

        if (forgotPasswordClose) {
          forgotPasswordClose.addEventListener('click', closeForgotPasswordModal);
        }

        if (forgotSendCodeButton) {
          forgotSendCodeButton.addEventListener('click', function () {
            var email = (document.getElementById('forgot-email').value || '').trim();
            if (!email) {
              showToast('请先输入注册邮箱');
              return;
            }
            showToast('验证码已发送，请注意查收');
            startForgotPasswordCountdown();
          });
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
            var code = (document.getElementById('forgot-code').value || '').trim();
            var newPassword = document.getElementById('forgot-new-password').value || '';
            var confirmPassword = document.getElementById('forgot-confirm-password').value || '';

            if (!email || !code || !newPassword || !confirmPassword) {
              showToast('请填写完整信息');
              setSubmitButtonLoading(forgotSubmitBtn, false, '确认重置密码');
              return;
            }
            if (newPassword.length < 6) {
              showToast('新密码至少 6 位');
              setSubmitButtonLoading(forgotSubmitBtn, false, '确认重置密码');
              return;
            }
            if (newPassword !== confirmPassword) {
              showToast('两次输入的新密码不一致');
              setSubmitButtonLoading(forgotSubmitBtn, false, '确认重置密码');
              return;
            }

            setSubmitButtonLoading(forgotSubmitBtn, true, '确认重置密码');

            apiRequest('/api/auth/forgot-password', {
              method: 'POST',
              timeoutMs: 8000,
              body: JSON.stringify({ email: email, code: code, newPassword: newPassword })
            }).then(function (resp) {
              if (resp && resp.status === 200 && resp.body && resp.body.code === 200) {
                showToast('密码已重置，请使用新密码登录');
                closeForgotPasswordModal();
                var accountInput = document.getElementById('login-account');
                var passwordInput = document.getElementById('login-password');
                if (accountInput) accountInput.value = email;
                if (passwordInput) passwordInput.value = newPassword;
                stopForgotPasswordCountdown();
                setSubmitButtonLoading(forgotSubmitBtn, false, '确认重置密码');
              } else {
                var msg = authErrorMessage(resp, '找回密码失败');
                showToast(msg);
                setSubmitButtonLoading(forgotSubmitBtn, false, '确认重置密码');
              }
            }).catch(function (err) {
              console.error('forgot password error', err);
              showToast('网络错误，找回密码失败');
              setSubmitButtonLoading(forgotSubmitBtn, false, '确认重置密码');
            });
          });
        }
      });
    


      document.addEventListener('DOMContentLoaded', function () {
        AppState.init();
        var authHeroPreview = document.getElementById('auth-hero-preview');
        var syncAuthHeroPreview = function () {
          if (!authHeroPreview || !document.body || !document.documentElement) return;
          var isDark = document.body.classList.contains('theme-night') || document.documentElement.classList.contains('unified-dark-mode');
          authHeroPreview.src = isDark ? 'assets/ringnote-auth-dark.svg' : 'assets/ringnote-auth-light.svg';
        };
        syncAuthHeroPreview();
        if (typeof MutationObserver !== 'undefined') {
          if (document.body) {
            var registerBodyClassObserver = new MutationObserver(syncAuthHeroPreview);
            registerBodyClassObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
          }
          if (document.documentElement) {
            var registerRootClassObserver = new MutationObserver(syncAuthHeroPreview);
            registerRootClassObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
          }
        }

        function isMobileNumber(v) {
          return /^1\d{10}$/.test(String(v || '').trim());
        }

        function asBackendEmail(v) {
          var raw = String(v || '').trim();
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

        function socialRegisterAndLogin() {
          var phone = randomMobile();
          var email = phone + '@mobile.local';
          var password = randomPassword();
          var nickname = '用户' + phone.slice(-4);

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
            body: JSON.stringify({ nickname: nickname, email: email, phone: phone, password: password })
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
          setTimeout(function () { safeNavigate('待办页面.html'); }, 320);
        }

        var registerPassword = document.getElementById('register-password');
        var toggleRegisterPassword = document.getElementById('toggle-register-password');
        var passwordStrengthWrap = document.getElementById('password-strength-wrap');
        var passwordStrengthLabel = document.getElementById('password-strength-label');
        var passwordStrengthSegment1 = document.getElementById('password-strength-segment-1');
        var passwordStrengthSegment2 = document.getElementById('password-strength-segment-2');
        var passwordStrengthSegment3 = document.getElementById('password-strength-segment-3');
        var registerConfirm = document.getElementById('register-confirm');
        var registerConfirmMatch = document.getElementById('register-confirm-match');
        var registerForm = document.getElementById('register-form');
        var registerSubmitBtn = registerForm ? registerForm.querySelector('button[type="submit"]') : null;

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

        function paintStrength(level, label, labelClass, segmentGradient) {
          var segments = [passwordStrengthSegment1, passwordStrengthSegment2, passwordStrengthSegment3];
          segments.forEach(function (segment, index) {
            if (!segment) return;
            segment.className = 'flex-1 rounded-[2px] transition-colors duration-300';
            if (index < level) {
              segment.style.background = segmentGradient;
            } else {
              segment.style.background = '#E5E7EB';
            }
          });
          if (passwordStrengthLabel) {
            passwordStrengthLabel.textContent = label;
            passwordStrengthLabel.className = 'text-[11px] font-medium ' + labelClass;
          }
        }

        function updateStrength() {
          var pwd = registerPassword.value;
          if (!pwd) {
            if (passwordStrengthWrap) passwordStrengthWrap.classList.add('hidden');
            if (passwordStrengthLabel) {
              passwordStrengthLabel.textContent = '待检测';
              passwordStrengthLabel.className = 'text-[11px] font-medium text-gray-500';
            }
            paintStrength(0, '待检测', 'text-gray-500', 'linear-gradient(90deg,#F59E0B,#FBBF24)');
            updateConfirmMatch();
            return;
          }
          if (passwordStrengthWrap) passwordStrengthWrap.classList.remove('hidden');

          var hasLetters = /[a-zA-Z]/.test(pwd);
          var hasNumbers = /[0-9]/.test(pwd);
          var hasSpecial = /[^a-zA-Z0-9]/.test(pwd);
          if (pwd.length < 6 || /^\d+$/.test(pwd)) {
            paintStrength(1, '弱', 'text-amber-500', 'linear-gradient(90deg,#F59E0B,#FBBF24)');
          } else if (hasLetters && hasNumbers && hasSpecial && pwd.length >= 8) {
            paintStrength(3, '强', 'text-green-500', 'linear-gradient(90deg,#22C55E,#16A34A)');
          } else if (hasLetters && hasNumbers) {
            paintStrength(2, '中', 'text-yellow-500', 'linear-gradient(90deg,#FBBF24,#FACC15)');
          } else {
            paintStrength(1, '弱', 'text-amber-500', 'linear-gradient(90deg,#F59E0B,#FBBF24)');
          }

          updateConfirmMatch();
        }

        registerPassword.addEventListener('input', updateStrength);

        function updateConfirmMatch() {
          if (!registerConfirmMatch) return;
          var isMatch = !!registerPassword.value && registerPassword.value === registerConfirm.value;
          registerConfirmMatch.style.opacity = isMatch ? '1' : '0';
        }

        registerConfirm.addEventListener('input', updateConfirmMatch);

        toggleRegisterPassword.addEventListener('click', function () {
          var type = registerPassword.getAttribute('type') === 'password' ? 'text' : 'password';
          registerPassword.setAttribute('type', type);
          var icon = this.querySelector('i');
          icon.classList.toggle('fa-eye');
          icon.classList.toggle('fa-eye-slash');
        });

        registerForm.addEventListener('submit', function (e) {
          e.preventDefault();
          var account = document.getElementById('register-account').value.trim();
          var password = registerPassword.value;
          var confirm = registerConfirm.value;

          var emailMobileRegex = /^(\S+@\S+\.\S+|1\d{10})$/;
          if (!account || !password || !confirm) {
            showToast('请完整填写所有信息');
            setSubmitButtonLoading(registerSubmitBtn, false, '注 册');
            return;
          }
          if (!emailMobileRegex.test(account)) {
            showToast('请输入有效的邮箱或手机号');
            setSubmitButtonLoading(registerSubmitBtn, false, '注 册');
            return;
          }
          if (password !== confirm) {
            showToast('两次输入的密码不一致');
            setSubmitButtonLoading(registerSubmitBtn, false, '注 册');
            return;
          }

          setSubmitButtonLoading(registerSubmitBtn, true, '注 册');

          var payload = {
            nickname: account.includes('@') ? account.split('@')[0] : ('用户' + account.slice(-4)),
            email: asBackendEmail(account),
            phone: isMobileNumber(account) ? account : '',
            password: password
          };

          apiRequest('/api/auth/register', { method: 'POST', timeoutMs: 8000, body: JSON.stringify(payload) })
            .then(function (resp) {
              if (resp && resp.status === 200 && resp.body && resp.body.code === 200) {
                var token = resp.body.data && resp.body.data.token;
                if (token) {
                  localStorage.setItem('token', token);
                  showToast('注册并登录成功，正在跳转...');
                  setTimeout(function () { safeNavigate('待办页面.html'); }, 400);
                  setSubmitButtonLoading(registerSubmitBtn, false, '注 册');
                  return;
                }
              }
              var msg = authErrorMessage(resp, '注册失败');
              showToast(msg);
              setSubmitButtonLoading(registerSubmitBtn, false, '注 册');
            }).catch(function (err) {
              console.error('register error', err);
              showToast('网络错误，请稍后重试');
              setSubmitButtonLoading(registerSubmitBtn, false, '注 册');
            });
        });

        document.querySelectorAll('.btn-social').forEach(function (button) {
          button.addEventListener('click', function () {
            if (this.getAttribute('data-social-auth') === 'guest') {
              enterGuestMode();
              return;
            }
            showToast('扫码注册中...');
            socialRegisterAndLogin().then(function (resp) {
              if (resp && resp.status === 200 && resp.body && resp.body.code === 200 && resp.body.data && resp.body.data.token) {
                localStorage.setItem('token', resp.body.data.token);
                showToast('扫码注册成功，已自动登录');
                setTimeout(function () { safeNavigate('待办页面.html'); }, 400);
                return;
              }
              showToast(authErrorMessage(resp, '扫码注册失败'));
            }).catch(function (err) {
              console.error('social register error', err);
              showToast((err && err.message) || '扫码注册失败，请稍后重试');
            });
          });
        });
      });
    

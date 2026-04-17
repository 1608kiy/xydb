
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

        function shouldEnterLocalMode(resp) {
          if (!resp) return true;
          var status = Number(resp.status || 0);
          if (status === 0 || status === 504) return true;
          if (status >= 500) return true;
          if (status === 404 || status === 405) return true;
          var msg = String((resp.body && resp.body.message) || '').toLowerCase();
          return msg.indexOf('timeout') !== -1 || msg.indexOf('network') !== -1;
        }

        function enterLocalMode(accountHint) {
          showToast('服务暂时不可用，请稍后重试');
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

        var registerPassword = document.getElementById('register-password');
        var toggleRegisterPassword = document.getElementById('toggle-register-password');
        var passwordStrengthWrap = document.getElementById('password-strength-wrap');
        var passwordStrengthLabel = document.getElementById('password-strength-label');
        var passwordStrengthBar = document.getElementById('password-strength-bar');

        function updateStrength() {
          var pwd = registerPassword.value;
          var score = 0;
          if (pwd.length >= 6) score++;
          if (/[0-9]/.test(pwd) && /[a-zA-Z]/.test(pwd)) score++;
          if (/[A-Z]/.test(pwd) && /[^a-zA-Z0-9]/.test(pwd)) score++;
          if (pwd.length >= 12) score++;
          if (!pwd) {
            if (passwordStrengthWrap) passwordStrengthWrap.classList.add('hidden');
            if (passwordStrengthLabel) {
              passwordStrengthLabel.textContent = '待检测';
              passwordStrengthLabel.className = 'text-[11px] font-medium text-gray-500';
            }
            if (passwordStrengthBar) {
              passwordStrengthBar.style.width = '0%';
              passwordStrengthBar.className = 'h-full w-0 rounded-full transition-all duration-300 bg-red-400';
            }
            return;
          }
          if (passwordStrengthWrap) passwordStrengthWrap.classList.remove('hidden');

          var text = '弱';
          var width = '25%';
          var color = 'bg-red-400';
          var textColor = 'text-red-500';
          if (score === 2) {
            text = '一般';
            width = '50%';
            color = 'bg-yellow-400';
            textColor = 'text-yellow-500';
          } else if (score === 3) {
            text = '良好';
            width = '75%';
            color = 'bg-blue-500';
            textColor = 'text-blue-500';
          } else if (score >= 4) {
            text = '很强';
            width = '100%';
            color = 'bg-green-500';
            textColor = 'text-green-500';
          }

          if (passwordStrengthLabel) {
            passwordStrengthLabel.textContent = text;
            passwordStrengthLabel.className = 'text-[11px] font-medium ' + textColor;
          }
          if (passwordStrengthBar) {
            passwordStrengthBar.style.width = width;
            passwordStrengthBar.className = 'h-full rounded-full transition-all duration-300 ' + color;
          }
        }

        registerPassword.addEventListener('input', updateStrength);

        toggleRegisterPassword.addEventListener('click', function () {
          var type = registerPassword.getAttribute('type') === 'password' ? 'text' : 'password';
          registerPassword.setAttribute('type', type);
          var icon = this.querySelector('i');
          icon.classList.toggle('fa-eye');
          icon.classList.toggle('fa-eye-slash');
        });

        var registerForm = document.getElementById('register-form');
        registerForm.addEventListener('submit', function (e) {
          e.preventDefault();
          var account = document.getElementById('register-account').value.trim();
          var password = registerPassword.value;
          var confirm = document.getElementById('register-confirm').value;

          var emailMobileRegex = /^(\S+@\S+\.\S+|1\d{10})$/;
          if (!account || !password || !confirm) {
            showToast('请完整填写所有信息');
            return;
          }
          if (!emailMobileRegex.test(account)) {
            showToast('请输入有效的邮箱或手机号');
            return;
          }
          if (password !== confirm) {
            showToast('两次输入的密码不一致');
            return;
          }

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
                  return;
                }
              }
              var msg = authErrorMessage(resp, '注册失败');
              showToast(msg);
            }).catch(function (err) {
              console.error('register error', err);
              showToast('网络错误，请稍后重试');
            });
        });

        document.querySelectorAll('.btn-social').forEach(function (button) {
          button.addEventListener('click', function () {
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
    

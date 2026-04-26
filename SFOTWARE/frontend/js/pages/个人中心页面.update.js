(function () {
  var DEFAULT_MANIFEST_URL = 'https://ringnote.isleepring.cn/download/android/version.json';
  var UPDATE_MANIFEST_STORAGE_KEY = 'ringnote_update_manifest_url';
  var NATIVE_BRIDGE_NAME = '__ringnoteNativeUpdateBridge';
  var NATIVE_BRIDGE_CHANNEL = 'ringnote-native-update';

  var state = {
    bridgeResolved: false,
    bridgeHost: null,
    nativeAvailable: false,
    listenersBound: false,
    busy: false,
    mode: 'idle',
    permissionPending: false,
    currentInfo: null,
    remoteInfo: null
  };

  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
      return;
    }
    fn();
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function getRefs() {
    return {
      versionLabel: byId('app-version-label'),
      versionTip: byId('app-version-tip'),
      statusTip: byId('update-status-tip'),
      actionBtn: byId('check-update-btn'),
      progressRow: byId('update-progress-row'),
      progressTrack: byId('update-progress-track'),
      progressFill: byId('update-progress-fill'),
      progressText: byId('update-progress-text'),
      releaseNotes: byId('update-release-notes')
    };
  }

  function showToastSafe(message, type) {
    if (!message) return;
    if (typeof window.__unifiedShowToast === 'function') {
      window.__unifiedShowToast(message, type || 'info');
      return;
    }
    if (typeof window.showToast === 'function') {
      window.showToast(message, type || 'info');
      return;
    }
    try {
      window.alert(message);
    } catch (err) {}
  }

  function extractErrorMessage(error, fallback) {
    if (!error) return fallback;
    if (typeof error === 'string' && error.trim()) return error.trim();
    if (error.message && String(error.message).trim()) return String(error.message).trim();
    if (error.errorMessage && String(error.errorMessage).trim()) return String(error.errorMessage).trim();
    return fallback;
  }

  function resolveManifestUrl() {
    try {
      if (window.__RINGNOTE_UPDATE_MANIFEST_URL__) {
        return String(window.__RINGNOTE_UPDATE_MANIFEST_URL__).trim() || DEFAULT_MANIFEST_URL;
      }
    } catch (err) {}

    try {
      var stored = localStorage.getItem(UPDATE_MANIFEST_STORAGE_KEY);
      if (stored && String(stored).trim()) return String(stored).trim();
    } catch (err) {}

    return DEFAULT_MANIFEST_URL;
  }

  function uniqueWindows() {
    var list = [];

    function push(candidate) {
      if (!candidate) return;
      for (var index = 0; index < list.length; index += 1) {
        if (list[index] === candidate) return;
      }
      list.push(candidate);
    }

    push(window);
    try { push(window.parent); } catch (err) {}
    try { push(window.top); } catch (err) {}
    return list;
  }

  function isSameOrigin(origin) {
    return !origin || origin === 'null' || origin === window.location.origin;
  }

  function resolveNativeBridgeHost() {
    if (state.bridgeResolved) return state.bridgeHost;
    state.bridgeResolved = true;

    var windowsToCheck = uniqueWindows();
    for (var index = 0; index < windowsToCheck.length; index += 1) {
      var hostWindow = windowsToCheck[index];
      try {
        if (hostWindow && hostWindow[NATIVE_BRIDGE_NAME] && typeof hostWindow[NATIVE_BRIDGE_NAME].invoke === 'function') {
          state.bridgeHost = hostWindow;
          break;
        }
      } catch (err) {}
    }

    state.nativeAvailable = !!state.bridgeHost;
    return state.bridgeHost;
  }

  function ensureNativeListeners() {
    if (state.listenersBound) return;
    if (!resolveNativeBridgeHost()) return;
    state.listenersBound = true;

    try {
      window.addEventListener('message', function (event) {
        var data = event && event.data;
        if (!data || data.channel !== NATIVE_BRIDGE_CHANNEL || data.type !== 'event') return;
        if (!isSameOrigin(event.origin)) return;
        if (data.event === 'updateStatus') {
          handleNativeStatus(data.payload || {});
        }
      });
    } catch (err) {
      state.listenersBound = false;
    }
  }

  function callNativeBridge(action, payload) {
    var hostWindow = resolveNativeBridgeHost();
    if (!hostWindow || hostWindow === window) {
      return Promise.reject(new Error('当前环境暂不支持应用内更新'));
    }

    return new Promise(function (resolve, reject) {
      var requestId = 'rn-update-' + Date.now() + '-' + Math.floor(Math.random() * 1000000);
      var timeoutId = 0;

      function cleanup() {
        window.removeEventListener('message', onMessage);
        if (timeoutId) window.clearTimeout(timeoutId);
      }

      function onMessage(event) {
        var data = event && event.data;
        if (!data || data.channel !== NATIVE_BRIDGE_CHANNEL || data.type !== 'response') return;
        if (data.id !== requestId) return;
        if (!isSameOrigin(event.origin)) return;

        cleanup();
        if (data.ok) {
          resolve(data.result || {});
          return;
        }
        reject(new Error(extractErrorMessage(data.error, '调用应用内更新服务失败')));
      }

      window.addEventListener('message', onMessage);
      timeoutId = window.setTimeout(function () {
        cleanup();
        reject(new Error('应用内更新服务响应超时'));
      }, 45000);

      try {
        hostWindow.postMessage({
          channel: NATIVE_BRIDGE_CHANNEL,
          type: 'request',
          id: requestId,
          action: String(action || ''),
          payload: payload || {}
        }, window.location.origin);
      } catch (err) {
        cleanup();
        reject(err);
      }
    });
  }

  function normalizeNotes(value) {
    if (!value) return [];
    if (Object.prototype.toString.call(value) === '[object Array]') {
      return value.slice(0);
    }
    if (typeof value.length === 'number') {
      var list = [];
      for (var index = 0; index < value.length; index += 1) {
        if (typeof value[index] !== 'undefined' && value[index] !== null) {
          list.push(String(value[index]));
        }
      }
      return list;
    }
    return [String(value)];
  }

  function normalizeRemoteInfo(payload) {
    var source = payload || {};
    var apk = source.apk || {};

    return {
      manifestUrl: source.manifestUrl || resolveManifestUrl(),
      versionName: String(source.remoteVersionName || source.versionName || '').trim(),
      versionCode: Number(source.remoteVersionCode || source.versionCode || 0) || 0,
      currentVersionName: String(source.currentVersionName || '').trim(),
      currentVersionCode: Number(source.currentVersionCode || 0) || 0,
      minSupportedCode: Number(source.minSupportedCode || 0) || 0,
      forceUpdate: !!source.forceUpdate,
      releaseNotes: normalizeNotes(source.releaseNotes),
      publishedAt: String(source.publishedAt || '').trim(),
      apk: {
        url: String(apk.url || source.url || '').trim(),
        fileName: String(apk.fileName || source.fileName || 'ringnote-update.apk').trim(),
        sha256: String(apk.sha256 || source.sha256 || '').trim(),
        size: Number(apk.size || source.size || 0) || 0
      },
      hasUpdate: !!source.hasUpdate
    };
  }

  function getCurrentVersionText() {
    var refs = getRefs();
    var raw = refs.versionLabel ? String(refs.versionLabel.textContent || '').trim() : '';
    return raw.replace(/^v/i, '').trim() || '1.0.0';
  }

  function setVersionInfo(info) {
    var refs = getRefs();
    var current = info || {};
    var versionName = String(current.versionName || current.currentVersionName || getCurrentVersionText()).trim() || '1.0.0';
    var versionCode = Number(current.versionCode || current.currentVersionCode || 0) || 0;

    if (refs.versionLabel) {
      refs.versionLabel.textContent = 'v' + versionName;
    }
    if (refs.versionTip) {
      refs.versionTip.textContent = versionCode > 0
        ? '当前安装包 versionCode ' + versionCode
        : '当前版本已就绪';
    }

    state.currentInfo = {
      versionName: versionName,
      versionCode: versionCode
    };
  }

  function setStatusText(text) {
    var refs = getRefs();
    if (refs.statusTip) refs.statusTip.textContent = text || '';
  }

  function setActionButton(label, disabled) {
    var refs = getRefs();
    if (!refs.actionBtn) return;

    refs.actionBtn.textContent = label || '检查';
    refs.actionBtn.disabled = !!disabled;
    refs.actionBtn.style.opacity = disabled ? '0.66' : '1';
    refs.actionBtn.style.cursor = disabled ? 'not-allowed' : 'pointer';
  }

  function renderDetails(trackVisible, progressText, notesText, percent) {
    var refs = getRefs();
    if (!refs.progressRow) return;

    var hasProgressText = !!String(progressText || '').trim();
    var hasNotesText = !!String(notesText || '').trim();
    var shouldShow = !!trackVisible || hasProgressText || hasNotesText;

    refs.progressRow.style.display = shouldShow ? 'block' : 'none';

    if (refs.progressTrack) {
      refs.progressTrack.style.display = trackVisible ? 'block' : 'none';
    }
    if (refs.progressFill) {
      var width = typeof percent === 'number' && isFinite(percent)
        ? Math.max(0, Math.min(100, percent)) + '%'
        : (trackVisible ? '28%' : '0%');
      refs.progressFill.style.width = width;
    }
    if (refs.progressText) {
      refs.progressText.textContent = progressText || '';
      refs.progressText.style.display = hasProgressText ? 'block' : 'none';
    }
    if (refs.releaseNotes) {
      refs.releaseNotes.textContent = notesText || '';
      refs.releaseNotes.style.display = hasNotesText ? 'block' : 'none';
    }
  }

  function formatBytes(bytes) {
    var size = Number(bytes || 0);
    if (size <= 0) return '';
    if (size < 1024) return size + ' B';
    if (size < 1024 * 1024) return (size / 1024).toFixed(1).replace(/\.0$/, '') + ' KB';
    return (size / 1024 / 1024).toFixed(1).replace(/\.0$/, '') + ' MB';
  }

  function formatPublishedAt(value) {
    if (!value) return '';
    var date = new Date(value);
    if (isNaN(date.getTime())) return '';
    return date.getFullYear() + '-' +
      String(date.getMonth() + 1).padStart(2, '0') + '-' +
      String(date.getDate()).padStart(2, '0');
  }

  function buildReleaseSummary(remoteInfo) {
    var parts = [];
    var notes = remoteInfo && remoteInfo.releaseNotes ? remoteInfo.releaseNotes.slice(0, 3) : [];

    if (notes.length) {
      parts.push('更新内容：' + notes.join('；'));
    }
    if (remoteInfo && remoteInfo.apk && remoteInfo.apk.size > 0) {
      parts.push('安装包大小约 ' + formatBytes(remoteInfo.apk.size));
    }
    var publishedAt = remoteInfo ? formatPublishedAt(remoteInfo.publishedAt) : '';
    if (publishedAt) {
      parts.push('发布时间 ' + publishedAt);
    }

    return parts.join(' · ');
  }

  function inferHasUpdate(remoteInfo) {
    if (!remoteInfo) return false;
    if (remoteInfo.hasUpdate) return true;

    var currentCode = remoteInfo.currentVersionCode || (state.currentInfo && state.currentInfo.versionCode) || 0;
    if (remoteInfo.versionCode > 0 && currentCode > 0) {
      return remoteInfo.versionCode > currentCode;
    }

    var currentName = String(remoteInfo.currentVersionName || (state.currentInfo && state.currentInfo.versionName) || '').trim();
    return !!(remoteInfo.versionName && currentName && remoteInfo.versionName !== currentName);
  }

  function syncIdleUi() {
    var remoteInfo = state.remoteInfo;

    if (state.busy) {
      if (state.mode === 'checking') {
        setActionButton('检查中...', true);
        return;
      }
      if (state.mode === 'downloading') {
        setActionButton('下载中...', true);
        return;
      }
      if (state.mode === 'resuming') {
        setActionButton('处理中...', true);
        return;
      }
    }

    if (state.permissionPending && state.nativeAvailable) {
      setActionButton('继续安装', false);
      setStatusText('安装权限待确认，返回应用后可继续拉起安装');
      return;
    }

    if (remoteInfo && remoteInfo.hasUpdate) {
      setStatusText(
        (remoteInfo.forceUpdate ? '发现重要更新' : '发现新版本') +
        ' v' + remoteInfo.versionName +
        (state.nativeAvailable ? '，可直接下载安装' : '，可跳转下载')
      );
      setActionButton(state.nativeAvailable ? '下载并安装' : '前往下载', false);
      renderDetails(false, '', buildReleaseSummary(remoteInfo), null);
      return;
    }

    setStatusText(
      state.nativeAvailable
        ? '服务器已就绪，点击检查新版本'
        : '浏览器环境可检查版本并跳转官网下载'
    );
    setActionButton('检查', false);
    if (!remoteInfo) {
      renderDetails(false, '', '', null);
    }
  }

  function openDownloadUrl(url) {
    if (!url) {
      showToastSafe('未拿到下载地址，请稍后再试', 'error');
      return;
    }
    try {
      window.location.href = url;
    } catch (err) {
      showToastSafe('打开下载地址失败，请稍后重试', 'error');
    }
  }

  function fetchManifestInBrowser() {
    if (typeof window.fetch !== 'function') {
      return Promise.reject(new Error('当前环境不支持在线检查更新'));
    }

    var manifestUrl = resolveManifestUrl();
    var requestUrl = manifestUrl + (manifestUrl.indexOf('?') === -1 ? '?' : '&') + '_=' + Date.now();

    return window.fetch(requestUrl, {
      method: 'GET',
      cache: 'no-store'
    }).then(function (response) {
      if (!response.ok) {
        throw new Error('版本源请求失败（' + response.status + '）');
      }
      return response.json();
    }).then(function (json) {
      var remoteInfo = normalizeRemoteInfo(json);
      remoteInfo.currentVersionName = state.currentInfo && state.currentInfo.versionName || '';
      remoteInfo.currentVersionCode = state.currentInfo && state.currentInfo.versionCode || 0;
      remoteInfo.hasUpdate = inferHasUpdate(remoteInfo);
      return remoteInfo;
    });
  }

  function loadCurrentVersion() {
    if (!resolveNativeBridgeHost()) {
      setVersionInfo({
        versionName: getCurrentVersionText(),
        versionCode: Number(window.__RINGNOTE_WEB_VERSION_CODE__ || 0) || 0
      });
      syncIdleUi();
      return;
    }

    ensureNativeListeners();

    Promise.resolve(callNativeBridge('getAppInfo')).then(function (info) {
      setVersionInfo(info || {});
      syncIdleUi();
    }).catch(function () {
      setVersionInfo({
        versionName: getCurrentVersionText(),
        versionCode: 0
      });
      syncIdleUi();
    });
  }

  function handleCheckSuccess(remoteInfo, manual) {
    state.remoteInfo = normalizeRemoteInfo(remoteInfo);
    state.remoteInfo.hasUpdate = inferHasUpdate(state.remoteInfo);

    if (state.remoteInfo.currentVersionName || state.remoteInfo.currentVersionCode) {
      setVersionInfo({
        versionName: state.remoteInfo.currentVersionName || (state.currentInfo && state.currentInfo.versionName),
        versionCode: state.remoteInfo.currentVersionCode || (state.currentInfo && state.currentInfo.versionCode)
      });
    }

    state.busy = false;
    state.mode = 'idle';
    state.permissionPending = false;

    if (state.remoteInfo.hasUpdate) {
      syncIdleUi();
      if (manual) {
        showToastSafe(
          (state.remoteInfo.forceUpdate ? '发现重要更新' : '发现新版本') +
          ' v' + state.remoteInfo.versionName,
          'success'
        );
      }
      return;
    }

    setStatusText('当前已是最新版本');
    setActionButton('重新检查', false);
    renderDetails(false, '当前已是最新版本', buildReleaseSummary(state.remoteInfo), null);
    if (manual) {
      showToastSafe('当前已是最新版本', 'success');
    }
  }

  function handleCheckFailure(error, manual) {
    state.busy = false;
    state.mode = 'idle';

    var message = extractErrorMessage(error, '检查更新失败，请稍后重试');
    setStatusText(message);
    setActionButton('重试', false);
    renderDetails(false, message, '', null);

    if (manual) {
      showToastSafe(message, 'error');
    }
  }

  function checkForUpdate(manual) {
    if (state.busy) return;

    state.busy = true;
    state.mode = 'checking';
    state.permissionPending = false;
    setActionButton('检查中...', true);
    setStatusText('正在检查服务器版本...');
    renderDetails(true, '正在检查服务器版本...', '', 12);

    var manifestUrl = resolveManifestUrl();

    if (resolveNativeBridgeHost()) {
      ensureNativeListeners();
      Promise.resolve(callNativeBridge('checkForUpdate', { manifestUrl: manifestUrl }))
        .then(function (result) {
          handleCheckSuccess(result || {}, manual);
        })
        .catch(function (error) {
          handleCheckFailure(error, manual);
        });
      return;
    }

    fetchManifestInBrowser()
      .then(function (remoteInfo) {
        handleCheckSuccess(remoteInfo, manual);
      })
      .catch(function (error) {
        handleCheckFailure(error, manual);
      });
  }

  function handleInstallResult(result) {
    var response = result || {};
    state.busy = false;

    if (response.status === 'permission_required') {
      state.mode = 'permission';
      state.permissionPending = true;
      setStatusText('请允许安装未知应用后返回，应用会自动继续安装');
      setActionButton('继续安装', false);
      renderDetails(true, '已完成下载，正在等待安装权限授权', buildReleaseSummary(state.remoteInfo), 100);
      showToastSafe('请先允许安装未知应用权限', 'warning');
      return;
    }

    state.mode = 'installing';
    state.permissionPending = false;
    setStatusText('安装界面已打开，请按系统提示完成升级');
    setActionButton('重新检查', false);
    renderDetails(true, '安装包已准备完成，请继续安装', buildReleaseSummary(state.remoteInfo), 100);
  }

  function handleInstallFailure(error) {
    state.busy = false;
    state.mode = 'idle';

    var message = extractErrorMessage(error, '下载更新失败，请稍后再试');
    setStatusText(message);
    setActionButton('重试更新', false);
    renderDetails(false, message, buildReleaseSummary(state.remoteInfo), null);
    showToastSafe(message, 'error');
  }

  function startDownloadAndInstall() {
    var remoteInfo = state.remoteInfo;
    if (!remoteInfo || !remoteInfo.hasUpdate) {
      checkForUpdate(true);
      return;
    }

    if (!state.nativeAvailable) {
      openDownloadUrl(remoteInfo.apk && remoteInfo.apk.url);
      return;
    }

    if (!resolveNativeBridgeHost()) {
      showToastSafe('当前环境暂不支持应用内安装，请前往官网下载', 'warning');
      openDownloadUrl(remoteInfo.apk && remoteInfo.apk.url);
      return;
    }

    ensureNativeListeners();

    state.busy = true;
    state.mode = 'downloading';
    state.permissionPending = false;
    setActionButton('下载中...', true);
    setStatusText('正在下载更新包...');
    renderDetails(true, '正在下载更新包...', buildReleaseSummary(remoteInfo), 0);

    Promise.resolve(callNativeBridge('downloadAndInstall', {
      url: remoteInfo.apk.url,
      fileName: remoteInfo.apk.fileName,
      sha256: remoteInfo.apk.sha256,
      size: remoteInfo.apk.size
    })).then(function (result) {
      handleInstallResult(result);
    }).catch(function (error) {
      handleInstallFailure(error);
    });
  }

  function resumeInstall() {
    if (!resolveNativeBridgeHost()) {
      startDownloadAndInstall();
      return;
    }

    state.busy = true;
    state.mode = 'resuming';
    setActionButton('处理中...', true);
    setStatusText('正在继续拉起安装...');
    renderDetails(true, '正在继续拉起安装...', buildReleaseSummary(state.remoteInfo), 100);

    Promise.resolve(callNativeBridge('resumeInstall')).then(function (result) {
      handleInstallResult(result);
    }).catch(function (error) {
      handleInstallFailure(error);
    });
  }

  function handleNativeStatus(event) {
    var payload = event || {};
    var stage = String(payload.stage || '').trim();

    if (stage === 'download_started') {
      state.busy = true;
      state.mode = 'downloading';
      setStatusText('正在下载更新包...');
      setActionButton('下载中...', true);
      renderDetails(true, '开始下载更新包...', buildReleaseSummary(state.remoteInfo), 0);
      return;
    }

    if (stage === 'download_progress') {
      var percent = typeof payload.percent === 'number' ? payload.percent : null;
      var progressText = '正在下载更新包';
      if (payload.totalBytes > 0) {
        progressText += ' · ' + formatBytes(payload.downloadedBytes) + ' / ' + formatBytes(payload.totalBytes);
      } else if (payload.downloadedBytes > 0) {
        progressText += ' · 已下载 ' + formatBytes(payload.downloadedBytes);
      }
      setStatusText(percent !== null ? '正在下载更新包（' + percent + '%）' : '正在下载更新包...');
      renderDetails(true, progressText, buildReleaseSummary(state.remoteInfo), percent);
      return;
    }

    if (stage === 'download_complete') {
      renderDetails(true, '下载完成，正在准备安装...', buildReleaseSummary(state.remoteInfo), 100);
      return;
    }

    if (stage === 'install_permission_required') {
      state.busy = false;
      state.mode = 'permission';
      state.permissionPending = true;
      setStatusText('请允许安装未知应用后返回，应用会自动继续安装');
      setActionButton('继续安装', false);
      renderDetails(true, '更新包已下载完成，正在等待安装权限', buildReleaseSummary(state.remoteInfo), 100);
      return;
    }

    if (stage === 'install_started') {
      state.busy = false;
      state.mode = 'installing';
      state.permissionPending = false;
      setStatusText('安装界面已打开，请按系统提示完成升级');
      setActionButton('重新检查', false);
      renderDetails(true, '安装包已就绪，请继续完成安装', buildReleaseSummary(state.remoteInfo), 100);
      return;
    }

    if (stage === 'download_failed' || stage === 'install_failed') {
      handleInstallFailure(payload.message || stage);
    }
  }

  function handlePrimaryAction() {
    if (state.busy) return;

    if (state.permissionPending && state.nativeAvailable) {
      resumeInstall();
      return;
    }

    if (state.remoteInfo && state.remoteInfo.hasUpdate) {
      startDownloadAndInstall();
      return;
    }

    checkForUpdate(true);
  }

  function bindActions() {
    var refs = getRefs();
    if (!refs.actionBtn || refs.actionBtn.dataset.updateBound === '1') return;

    refs.actionBtn.dataset.updateBound = '1';
    refs.actionBtn.addEventListener('click', handlePrimaryAction);
  }

  function bootstrap() {
    var refs = getRefs();
    if (!refs.actionBtn) return;

    bindActions();
    loadCurrentVersion();
    syncIdleUi();
  }

  onReady(bootstrap);
})();

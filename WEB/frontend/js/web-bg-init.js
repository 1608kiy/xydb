/**
 * WEB 页面随机背景初始化脚本
 * 对标 SFOTWARE 移动端的背景处理方式
 */
(function initWebRandomBackground() {
  'use strict';
  
  var body = document.body;
  if (!body) {
    // 如果 body 还不存在，延迟执行
    document.addEventListener('DOMContentLoaded', initWebRandomBackground);
    return;
  }
  
  var storageKey = 'web-shared-bg-url-v1';
  var seedKey = 'web-shared-bg-seed-v1';
  var bgUrl = '';
  var seed = body.dataset.webRandomBgSeed || '';
  
  // 检查是否为页面加载/重新加载
  var navEntry = null;
  var isReload = false;
  try {
    navEntry = window.performance && window.performance.getEntriesByType
      ? window.performance.getEntriesByType('navigation')[0]
      : null;
    isReload = !!(navEntry && navEntry.type === 'reload');
  } catch (err) {}
  
  // 从 sessionStorage 读取
  try {
    if (isReload) {
      window.sessionStorage.removeItem(storageKey);
      window.sessionStorage.removeItem(seedKey);
    }
    bgUrl = window.sessionStorage.getItem(storageKey) || '';
    seed = window.sessionStorage.getItem(seedKey) || seed;
  } catch (err) {}
  
  // 生成或获取种子
  if (!bgUrl) {
    if (!seed) {
      seed = 'xydb-web-' + Math.random().toString(36).slice(2, 10);
    }
    
    bgUrl = 'https://picsum.photos/seed/' + encodeURIComponent(seed) + '/1920/1080';
    
    try {
      window.sessionStorage.setItem(storageKey, bgUrl);
      window.sessionStorage.setItem(seedKey, seed);
    } catch (err) {}
  }
  
  // 直接设置背景
  body.style.backgroundImage = 'url("' + bgUrl + '")';
  body.style.backgroundAttachment = 'fixed';
  body.style.backgroundSize = 'cover';
  body.style.backgroundPosition = 'center';
  body.style.backgroundRepeat = 'no-repeat';

  // 记录信息
  body.dataset.webRandomBgSeed = seed;
  body.dataset.webRandomBgUrl = bgUrl;

  // ── 背景亮度自适应：检测背景图亮度，自动切换深/浅文字 ──
  // 先添加一个半透明遮罩层，确保任何背景都有基础对比度
  var overlay = document.createElement('div');
  overlay.id = 'bg-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:0;pointer-events:none;transition:background 0.6s ease;background:rgba(0,0,0,0.25);';
  body.insertBefore(overlay, body.firstChild);

  function applyBrightMode() {
    body.classList.add('bg-bright');
    body.classList.remove('bg-dark');
    overlay.style.background = 'rgba(255,255,255,0.35)';
  }
  function applyDarkMode() {
    body.classList.add('bg-dark');
    body.classList.remove('bg-bright');
    overlay.style.background = 'rgba(0,0,0,0.25)';
  }

  function detectBgLuminance() {
    var img = new Image();
    img.crossOrigin = 'anonymous';
    var completed = false;
    function finish(isBright) {
      if (completed) return;
      completed = true;
      if (isBright) applyBrightMode(); else applyDarkMode();
    }
    img.onload = function () {
      try {
        var canvas = document.createElement('canvas');
        var w = 64, h = 36;
        canvas.width = w; canvas.height = h;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        var data = ctx.getImageData(0, 0, w, h).data;
        var totalLum = 0, count = 0;
        var xS = Math.floor(w * 0.15), xE = Math.floor(w * 0.85);
        var yS = Math.floor(h * 0.15), yE = Math.floor(h * 0.85);
        for (var y = yS; y < yE; y++) {
          for (var x = xS; x < xE; x++) {
            var i = (y * w + x) * 4;
            totalLum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
            count++;
          }
        }
        finish((totalLum / count) > 140);
      } catch (e) {
        finish(false);
      }
    };
    img.onerror = function () { finish(false); };
    img.src = bgUrl;
    // 超时兜底：3 秒后如果还没加载完，用默认暗色
    setTimeout(function () { finish(false); }, 3000);
  }
  detectBgLuminance();
})();

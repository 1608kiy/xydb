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
})();

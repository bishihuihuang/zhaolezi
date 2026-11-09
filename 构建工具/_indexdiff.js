const { execSync } = require('child_process');
const diff = execSync('git diff index.html', { cwd: 'E:/上传网页/zhaolezi', encoding: 'utf8', maxBuffer: 1024 * 1024 * 20 });
const added = diff.split('\n').filter(l => l.startsWith('+') && !l.startsWith('+++'));
const removed = diff.split('\n').filter(l => l.startsWith('-') && !l.startsWith('---'));
// body 结构标签变化检测
const bodyTags = /<div|<section|<main|<header|<footer|<article|<ul|<li\b|<table|<button|<a\b/i;
const bodyChanges = added.filter(l => bodyTags.test(l));
console.log('新增行数:', added.length, ' 删除行数:', removed.length);
console.log('新增行中含 body 结构标签的:', bodyChanges.length);
if (bodyChanges.length) bodyChanges.slice(0, 8).forEach(l => console.log('  ' + l.slice(0, 100)));
console.log('\n新增行关键标记命中:');
['全站打磨层', 'color-scheme', 'focus-visible', 'touch-action', 'THEME_EARLY', 'zl-static-links', 'sr-only', '<style', 'canonical', 'og:'].forEach(k => {
  const n = added.filter(l => l.includes(k)).length;
  if (n) console.log('  ' + k + ': ' + n);
});
// 删除行是什么
console.log('\n删除行样例:');
removed.slice(0, 5).forEach(l => console.log('  ' + l.slice(0, 100)));

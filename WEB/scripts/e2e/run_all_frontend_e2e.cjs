const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function ts() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${y}${m}${d}_${hh}${mm}${ss}`;
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

function listReportDirs(reportRoot, prefix) {
  if (!fs.existsSync(reportRoot)) return [];
  return fs
    .readdirSync(reportRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith(prefix))
    .map((d) => d.name);
}

function pickLatestByPrefix(reportRoot, prefix) {
  const dirs = listReportDirs(reportRoot, prefix);
  if (!dirs.length) return '';
  let latestName = dirs[0];
  let latestMs = fs.statSync(path.join(reportRoot, latestName)).mtimeMs;
  for (const name of dirs.slice(1)) {
    const ms = fs.statSync(path.join(reportRoot, name)).mtimeMs;
    if (ms > latestMs) {
      latestMs = ms;
      latestName = name;
    }
  }
  return latestName;
}

function toRelativePath(root, absOrName) {
  if (!absOrName) return '';
  if (absOrName.includes(':') || absOrName.includes('\\') || absOrName.includes('/')) {
    return path.relative(root, absOrName).replace(/\\/g, '/');
  }
  return path.relative(root, path.join(root, 'REPORTS', 'e2e', absOrName)).replace(/\\/g, '/');
}

function runTask(task, cwd, reportRoot, workspaceRoot) {
  const before = new Set(listReportDirs(reportRoot, task.reportPrefix));
  const start = Date.now();
  const child = spawnSync(process.execPath, [task.script], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const end = Date.now();

  if (child.stdout) process.stdout.write(child.stdout);
  if (child.stderr) process.stderr.write(child.stderr);

  const after = listReportDirs(reportRoot, task.reportPrefix);
  const created = after.filter((name) => !before.has(name));
  const reportDirName = created.length ? created.sort()[created.length - 1] : pickLatestByPrefix(reportRoot, task.reportPrefix);
  const reportDirRel = reportDirName
    ? toRelativePath(workspaceRoot, path.join(reportRoot, reportDirName))
    : '';

  return {
    id: task.id,
    name: task.name,
    script: task.script,
    pass: child.status === 0,
    exitCode: child.status,
    durationMs: end - start,
    reportDir: reportDirRel
  };
}

function buildMarkdown(summary) {
  const lines = [];
  lines.push('# Frontend E2E Suite Report');
  lines.push('');
  lines.push(`- Generated At: ${summary.generatedAt}`);
  lines.push(`- Duration Seconds: ${summary.durationSeconds}`);
  lines.push(`- Overall: ${summary.pass ? 'PASS' : 'FAIL'}`);
  lines.push(`- Workspace: ${summary.workspaceRoot}`);
  lines.push('');
  lines.push('## Tasks');
  for (const item of summary.tasks) {
    lines.push(`- ${item.name}: ${item.pass ? 'PASS' : 'FAIL'} (exit=${item.exitCode}, ${item.durationMs}ms)`);
    lines.push(`  script=${item.script}`);
    lines.push(`  report=${item.reportDir || 'N/A'}`);
  }
  lines.push('');
  lines.push('## Artifacts');
  lines.push(`- JSON: ${summary.summaryJson}`);
  lines.push(`- Markdown: ${summary.summaryMd}`);
  return lines.join('\n');
}

function main() {
  const e2eDir = __dirname;
  const workspaceRoot = path.resolve(e2eDir, '..', '..');
  const reportRoot = ensureDir(path.join(workspaceRoot, 'REPORTS', 'e2e'));

  const tasks = [
    { id: 'ui_smoke', name: 'UI 自动化巡检', script: 'ui_automation_smoke.cjs', reportPrefix: 'ui_smoke_' },
    { id: 'interaction_flow', name: '前端交互主流程', script: 'frontend_interaction_flow.cjs', reportPrefix: 'interaction_' },
    { id: 'ai_smoke', name: 'AI 功能冒烟', script: 'ai_feature_smoke.cjs', reportPrefix: 'ai_smoke_' }
  ];

  const startedAt = new Date();
  const result = [];
  for (const task of tasks) {
    console.log(`\n=== RUN ${task.script} ===`);
    result.push(runTask(task, e2eDir, reportRoot, workspaceRoot));
  }
  const finishedAt = new Date();

  const stamp = ts();
  const summaryJsonRel = `REPORTS/e2e/frontend_suite_${stamp}.json`;
  const summaryMdRel = `REPORTS/e2e/frontend_suite_${stamp}.md`;
  const summaryJsonAbs = path.join(workspaceRoot, summaryJsonRel.replace(/\//g, path.sep));
  const summaryMdAbs = path.join(workspaceRoot, summaryMdRel.replace(/\//g, path.sep));

  const summary = {
    suite: 'frontend-e2e-suite',
    generatedAt: finishedAt.toISOString(),
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationSeconds: Math.floor((finishedAt.getTime() - startedAt.getTime()) / 1000),
    workspaceRoot: workspaceRoot.replace(/\\/g, '/'),
    pass: result.every((r) => r.pass),
    tasks: result,
    summaryJson: summaryJsonRel,
    summaryMd: summaryMdRel
  };

  fs.writeFileSync(summaryJsonAbs, JSON.stringify(summary, null, 2), 'utf8');
  fs.writeFileSync(summaryMdAbs, buildMarkdown(summary), 'utf8');

  console.log('\n=== SUITE SUMMARY ===');
  console.log(`overall=${summary.pass ? 'PASS' : 'FAIL'}`);
  console.log(`json=${summaryJsonAbs}`);
  console.log(`md=${summaryMdAbs}`);

  if (!summary.pass) process.exit(1);
}

main();

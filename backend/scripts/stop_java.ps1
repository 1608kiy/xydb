$procs = Get-Process -Name java -ErrorAction SilentlyContinue
if ($procs) {
  foreach ($p in $procs) {
    Write-Output "Stopping PID:$($p.Id) Name:$($p.ProcessName)"
    try { Stop-Process -Id $p.Id -Force -ErrorAction Stop; Write-Output "Stopped $($p.Id)" } catch { Write-Output "Failed to stop $($p.Id): $($_.Exception.Message)" }
  }
} else {
  Write-Output 'No java processes found'
}

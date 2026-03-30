@echo off
setlocal
chcp 65001 >nul

set "ROOT_DIR=%~dp0"
set "PS1_PATH=%ROOT_DIR%scripts\open_login_with_backend.ps1"

if not exist "%PS1_PATH%" (
  echo 未找到脚本: %PS1_PATH%
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1_PATH%" %*
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo.
  echo 启动失败，错误码: %EXIT_CODE%
  echo 请检查 backend 目录下的 backend_run.log 和 backend_run.err
  pause
)

endlocal
exit /b %EXIT_CODE%

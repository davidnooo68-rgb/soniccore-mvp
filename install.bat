@echo off
chcp 65001 >nul 2>&1
title SonicCore BGM MVP - Installing...

echo.
echo ========================================
echo   SonicCore BGM MVP 安装程序
echo ========================================
echo.

:: Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] 未检测到 Node.js
    echo.
    echo 请先安装 Node.js:
    echo 1. 打开 https://nodejs.org
    echo 2. 下载 LTS 版本（推荐）
    echo 3. 安装后重新运行此脚本
    echo.
    pause
    exit /b 1
)

for /f "delims=" %%v in ('node -v') do set NODE_VER=%%v
echo [OK] Node.js %NODE_VER%

:: Check if running from C:\pdfwork
set "PROJ=%~dp0"
echo Project: %PROJ%

:: Check for server.js
if not exist "%PROJ%server.js" (
    echo [ERROR] server.js not found
    pause
    exit /b 1
)
echo [OK] server.js found

:: Create data dirs
if not exist "%PROJ%data" mkdir "%PROJ%data"
if not exist "%PROJ%reports" mkdir "%PROJ%reports"
if not exist "%PROJ%public" mkdir "%PROJ%public"
echo [OK] Directories ready

echo.
echo ========================================
echo   安装完成！
echo ========================================
echo.
echo 下一步:
echo   1. 运行 start.bat 启动服务
echo   2. 浏览器自动打开 http://localhost:3000
echo   3. 开始检测BGM版权
echo.
echo 可选: 设置 AUDD_API_TOKEN 环境变量启用真实音乐识别
echo.
pause

@echo off
echo.
echo ==============================================
echo   AUTO COMMIT VA DEPLOY WEBSITE HUE-2026
echo ==============================================
echo.

echo 1. Kiem tra file thay doi...
git status

echo.
echo 2. Đang luu lai cac thay doi (git add .)...
git add .

echo.
echo 3. Đang commit code...
git commit -m "Auto-update: %date% %time%"

echo.
echo 4. Đang day code len Github (git push)...
git push origin main

echo.
echo ==============================================
echo   DEPLOY HOAN TAT!
echo ==============================================
pause

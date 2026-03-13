@echo off
echo LAUNCHING MOSQUITO DRONE SYSTEM...

REM 1. Get the current directory
set "CURRENT_DIR=%~dp0"

REM 2. Launch the Manager in a new separate window using the global python command
echo Starting Connection Manager...
start "Pi Connection Manager" python "%CURRENT_DIR%ssh_connection_setup_gstreamer.py"

REM 3. Wait 2 seconds
timeout /t 2

REM 4. Launch the Detector in a new separate window
echo Starting YOLO Detector...
start "YOLO AI System" python "%CURRENT_DIR%ai_engine.py"

echo.
echo Both systems launched. 
echo If a window closes immediately, there is an error in that file.
pause
@echo off
echo LAUNCHING MOSQUITO DRONE SYSTEM...

REM 1. Get the current directory
set "CURRENT_DIR=%~dp0"

REM 2. Set the path to your specific Python executable
set "PY_PATH=C:\Users\Cate\AppData\Local\Programs\Python\Python311\python.exe"

REM 3. Launch the Manager in a new separate window
echo Starting Connection Manager...
start "Pi Connection Manager" "%PY_PATH%" "%CURRENT_DIR%ssh_connection_setup_gstreamer.py"

REM 4. Wait 2 seconds
timeout /t 2

REM 5. Launch the Detector in a new separate window
echo Starting YOLO Detector...
start "YOLO AI System" "%PY_PATH%" "%CURRENT_DIR%gstreamer_test3.py"

echo.
echo Both systems launched. 
echo If a window closes immediately, there is an error in that file.
pause
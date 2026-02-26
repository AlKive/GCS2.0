# Ground-Control-System-for-Drone-main
# Ground-Control-System-for-Drone-main

## Automatic Mission Launch Helpers

When you click **Launch Mission** from the frontend (after planning a new mission), the app now tells the backend to start two helper Python scripts (`ssh_connection_setup_gstreamer.py` and `gstreamer_test3.py`). These are the same files you previously ran with `START_SYSTEM2.bat`.

The backend will spawn them detached, so they continue running even if the server restarts.

### Configuration

- **PYTHON_PATH** – optional environment variable that points to the Python executable to use (defaults to `python` from your PATH).
- **SCRIPTS_DIR** – optional environment variable pointing to the directory containing the two helper scripts. By default the backend assumes `../YOLOV8 TRAINING` relative to the `backend` folder (i.e. `<workspace>/YOLOV8 TRAINING`).

Example (Windows PowerShell):

```powershell
$env:PYTHON_PATH = 'C:\Users\Cate\AppData\Local\Programs\Python\Python311\python.exe'
$env:SCRIPTS_DIR = 'C:\Users\Cate\Downloads\ALL THESIS\YOLOV8 TRAINING'
npm run dev # in backend folder
```

### Camera feed

The `gstreamer_test3.py` helper now includes a small Flask server that exposes the drone camera as an MJPEG stream at `http://localhost:5000/video_feed`.  When a mission starts the frontend will load this stream into the left pane of the live view, replacing the previous map placeholder.

**Script location**

By default the backend looks for the helper Python files in a folder called `python_helpers` located at the workspace root (you can change this by setting the `SCRIPTS_DIR` env var).  This keeps everything inside the main project directory instead of referencing the external `YOLOV8 TRAINING` folder.

Create that folder and copy the three scripts (`ssh_connection_setup_gstreamer.py`, `gstreamer_test3.py`, and `START_SYSTEM2.bat`) into it.  For example:

```powershell
mkdir python_helpers
copy "..\YOLOV8 TRAINING\ssh_connection_setup_gstreamer.py" python_helpers
copy "..\YOLOV8 TRAINING\gstreamer_test3.py" python_helpers
copy "..\YOLOV8 TRAINING\START_SYSTEM2.bat" python_helpers
```

> You may also edit `START_SYSTEM2.bat` to point at the local copies.

**Python environment & requirements**

The helper scripts are executed by whatever Python interpreter is invoked by the backend.  By default this is the first `python` on your `PATH`; you can override it with the `PYTHON_PATH` environment variable (as described above).  If you create a virtual environment inside `python_helpers`, the backend can be pointed at that interpreter.

To install packages for that environment:

1. Activate the interpreter you plan to use. If you created a virtual env in `python_helpers/venv`:
   ```powershell
   cd python_helpers
   .\venv\Scripts\activate   # Windows PowerShell
   ```
2. Install dependencies from the provided `requirements.txt` (see below):
   ```bash
   pip install -r requirements.txt
   ```

This ensures Flask, OpenCV, Paramiko, YOLOv8, etc. are available to the helpers.

The Vite configuration proxies `/camera_feed` to the Flask server, so from the React app you simply refer to `/camera_feed`.  The frontend automatically switches to the camera view during a mission; no additional logic is needed.


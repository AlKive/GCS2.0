# LIPAD Ground Control System (GCS)

Welcome to the LIPAD GCS project. Follow these steps to set up the project and get the drone stream working.

## Prerequisites

1.  **Tailscale**: Ensure both your laptop and the Raspberry Pi are connected to the same Tailscale network.
2.  **GStreamer**: Install the GStreamer runtime on your laptop (Windows).
    *   Download and install `gstreamer-1.0-msvc-x86_64-1.xx.x.msi` and `gstreamer-1.0-devel-msvc-x86_64-1.xx.x.msi` from [gstreamer.freedesktop.org](https://gstreamer.freedesktop.org/download/).
    *   Make sure the GStreamer `bin` folder (e.g., `C:\Program Files\gstreamer\1.0\msvc_x86_64\bin`) is in your system's PATH.
3.  **Python 3.11+**: Ensure Python is installed and available in your PATH.

## Installation

### 1. Clone the Repository
```bash
git clone https://github.com/AlKive/GCS2.0.git
cd GCS_with_RaspberryPi
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your Supabase and Database credentials
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
cp .env.example .env
# Edit .env with your Supabase credentials
```

### 4. Python Helpers Setup
```bash
cd ../python_helpers
python -m venv venv
.\venv\Scripts\activate  # Windows
pip install -r requirements.txt
# If GStreamer issues occur, ensure you have the full 'opencv-python' (not headless)
pip uninstall opencv-python-headless
pip install opencv-python
```

## Running the Project

### 1. Start the Backend
From the `backend` directory:
```bash
npm run dev
```

### 2. Start the Frontend
From the `frontend` directory:
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

## Drone Stream Functionality

The **Drone Stream** tab automatically triggers the camera connection when opened.

*   **How it works**: The backend launches two Python scripts:
    1.  `ssh_connection_setup_gstreamer.py`: Connects to the Pi via SSH (Tailscale), detects your laptop's IP, and starts the GStreamer stream.
    2.  `gstreamer_test3.py`: Listens on port 5600 for the incoming stream, runs YOLOv8 object detection, and serves an MJPEG feed on port 5000.
*   **Troubleshooting**:
    *   Check `python_helpers/p1.log` for SSH connection and IP detection logs.
    *   Check `python_helpers/p2.log` for GStreamer and YOLO status.
    *   Use the **RESTART LIVESTREAM** button in the Drone Stream tab if the feed hangs.

## Configuration Notes

*   **Pi Tailscale IP**: Currently configured as `100.127.53.123` in the Python scripts. If the Pi's IP changes, update `PI_TAILSCALE_IP` in `python_helpers/ssh_connection_setup_gstreamer.py`.
*   **Laptop IP Detection**: The system automatically detects your laptop's Tailscale IP (`100.x.x.x`). Ensure your laptop is connected to Tailscale before starting the stream.

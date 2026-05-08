# LIPAD Ground Control System (GCS)

The LIPAD Ground Control System is a comprehensive platform designed for real-time drone monitoring, AI-powered object detection (e.g., mosquito breeding sites), and tactical mission management. It integrates a Raspberry Pi-based drone stream with a modern web/desktop dashboard.

---

## 🏗 System Architecture

-   **Frontend**: React (Vite) + Leaflet (Maps) + Capacitor (Mobile Support).
-   **Backend**: Node.js (Fastify) + Supabase (Cloud Database).
-   **AI Engine**: Python (YOLOv8) + OpenCV + Flask.
-   **Link**: Tailscale VPN (Connects Laptop and Raspberry Pi securely).
-   **Drone Side**: Raspberry Pi streaming video via GStreamer and receiving commands via SSH/UDP.

---

## 📋 Prerequisites

Before installation, ensure you have the following installed on your GCS laptop:

1.  **Tailscale**: Install on both your laptop and the Raspberry Pi. Ensure both are logged into the same network.
2.  **Node.js (v18+)**: Required for both Backend and Frontend.
3.  **Python (3.11+)**: Required for the AI Engine and Python Helpers.
4.  **GStreamer**: 
    *   Download and install `gstreamer-1.0-msvc-x86_64-x.xx.x.msi` and the `-devel` version from [gstreamer.freedesktop.org](https://gstreamer.freedesktop.org/download/).
    *   **IMPORTANT**: Add the GStreamer `bin` folder (e.g., `C:\gstreamer\1.0\msvc_x86_64\bin`) to your System **PATH**.
5.  **Supabase Account**: A project with the LIPAD schema (Tables: `flight_sessions`, `detections`, `hardware_telemetry`, etc.).

---

## ⚙️ Installation

### 1. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Update .env with your SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
```

### 2. Frontend Setup
```bash
cd ../frontend
npm install
cp .env.example .env
# Update .env with your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
```

### 3. Python Helpers Setup
```bash
cd ../python_helpers
pip install -r requirements.txt
cp .env.example .env  # Create if missing
# Configure PI_IP (Tailscale IP of Pi), PI_USERNAME, and PI_PASSWORD
```

---

## 🚀 Running the System

To get the full system running, follow these steps in order:

### Step 1: Start the Backend
From the `backend` folder:
```bash
npm run dev
```
The backend (port 8080) handles database synchronization and orchestrates the Python scripts.

### Step 2: Start the Frontend
From the `frontend` folder:
```bash
npm run dev
```
Navigate to `http://localhost:3000` or use the **Electron Wrapper** by running `npm start` in the root directory.

### Step 3: Launch Mission
1.  Open the GCS Dashboard.
2.  Navigate to the **Live Mission** tab.
3.  Fill in the **Session Details** (Pilot, Location) and click **START SESSION**.
4.  The system will automatically:
    *   Establish an SSH link to the Pi.
    *   Trigger the GStreamer stream from the Pi to your laptop.
    *   Launch the **AI Engine** (`ai_engine.py`) to process the feed.

---

## 🛠 Key Features

-   **Drone Stream (AI)**: Real-time MJPEG stream with YOLOv8 detection. Tracks detections and confirms "water" sites before logging to the database.
-   **Telemetry Dashboard**: Live monitoring of GPS, Battery, Altitude (Lidar), and Flight Modes.
-   **Offline Analyzer**: A standalone GUI to review mission logs and replays. (Launchable from the tactical panel).
-   **Mission History**: View past flight paths, detection counts, and spray operations.
-   **Manual Spray**: Trigger the drone's sprayer mechanism directly from the dashboard (Conditions: Alt < 1.5m).

---

## ❓ Troubleshooting

-   **No Video Feed**: 
    *   Check if the Pi is reachable: `ping <PI_TAILSCALE_IP>`.
    *   Check `python_helpers/p1.log` and `p2.log` for SSH or GStreamer errors.
    *   Ensure GStreamer is in your PATH.
-   **Database Errors**: Verify your Supabase credentials in `.env` and ensure the tables exist.
-   **AI Engine Lag**: Ensure you are using a GPU if available, or reduce the `imgsz` in `ai_engine.py`.

---

## 📞 Support & Configuration
- **Update Pi IP**: If the Pi IP changes, update `PI_IP` in `python_helpers/.env`.
- **Target Types**: The AI Engine syncs detection labels with the Supabase `target_types` table.

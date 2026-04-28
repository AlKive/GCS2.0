import os
import sys
import subprocess
import cv2
import time
import tkinter as tk
from tkinter import filedialog, messagebox
from ultralytics import YOLO
from PIL import Image, ImageTk
from datetime import datetime, timedelta
import csv
import threading
import numpy as np
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# --- INITIALIZATION ---
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL else None

def sync_offline_to_db(detection_data, hardware_data):
    """Syncs processed offline detections and hardware path to Supabase 3NF tables."""
    if not supabase: return
    try:
        # 1. Create a flight session
        res = supabase.table("flight_sessions").insert({
            "status": "completed",
            "barangay_id": 1, 
            "start_time": hardware_data[0]['Timestamp'] if hardware_data else datetime.now().isoformat(),
            "end_time": hardware_data[-1]['Timestamp'] if hardware_data else datetime.now().isoformat()
        }).execute()
        session_id = res.data[0]['id']

        # 2. Sync Hardware Path
        hw_logs = []
        for hw in hardware_data:
            hw_logs.append({
                "session_id": session_id,
                "logged_at": hw['Timestamp'],
                "latitude": float(hw['Lat']),
                "longitude": float(hw['Lon']),
                "altitude_lidar_m": float(hw['LiDAR']),
                "battery_voltage": float(hw['Voltage']),
                "is_armed": True
            })
        if hw_logs:
            supabase.table("hardware_telemetry").insert(hw_logs).execute()

        # 3. Sync Detections
        for det in detection_data:
            type_res = supabase.table("target_types").select("id").eq("label", det['target']).execute()
            type_id = type_res.data[0]['id'] if type_res.data else 1

            det_res = supabase.table("detections").insert({
                "session_id": session_id,
                "target_type_id": type_id,
                "confidence": det['conf'],
                "water_confirmed": det['water'],
                "latitude": det['lat'],
                "longitude": det['lon'],
                "lidar_m": det['lidar']
            }).execute()

            if det['water']:
                supabase.table("spray_operations").insert({
                    "detection_id": det_res.data[0]['id'],
                    "session_id": session_id,
                    "trigger_type": "Auto",
                    "duration_seconds": 5,
                    "true_area_scaled": det['true_area']
                }).execute()
        
        return True
    except Exception as e:
        print(f"[SYNC ERROR] {e}")
        return False

class OfflineAnalyzerApp(tk.Tk):
    def __init__(self, video_path, model_path, water_model_path):
        super().__init__()
        self.title("GCS Tactical Offline Analyzer")
        self.configure(bg="#1a1a1a")
        
        self.model = YOLO(model_path)
        self.model_water = YOLO(water_model_path)
        self.cap = cv2.VideoCapture(video_path)
        
        self.detections_to_sync = []
        self.hardware_data = []
        self.playing = True
        self.tracked_objects = {}
        self.CONFIRM_AFTER = 3.0
        
        # Load RPi Telemetry CSV
        video_dir = os.path.dirname(video_path)
        video_filename = os.path.basename(video_path)
        prefix = video_filename.split("_offlinevid")[0]
        telem_path = os.path.join(video_dir, f"{prefix}_offlinetelemetry.csv")
        
        if os.path.exists(telem_path):
            with open(telem_path, 'r') as f:
                self.hardware_data = list(csv.DictReader(f))
            print(f"[INFO] Loaded {len(self.hardware_data)} telemetry rows.")
        
        # Extraction start time
        try:
            time_str = video_filename[:19]
            self.video_start_time = datetime.strptime(time_str, "%Y-%m-%d_%H-%M-%S")
        except:
            self.video_start_time = datetime.now()

        # UI
        self.canvas = tk.Canvas(self, width=960, height=540, bg="black")
        self.canvas.pack(pady=10)
        
        self.btn_sync = tk.Button(self, text="☁️ SYNC TO CLOUD", state=tk.DISABLED, 
                                  command=self.perform_sync, bg="#27ae60", fg="white", font=("Arial", 10, "bold"))
        self.btn_sync.pack(pady=10)
        
        self.update_gui()

    def get_synced_telemetry(self, video_sec):
        if not self.hardware_data: return {'Lat':0, 'Lon':0, 'LiDAR':0}
        curr_time = self.video_start_time + timedelta(seconds=video_sec)
        closest = min(self.hardware_data, key=lambda x: abs((datetime.strptime(x['Timestamp'], "%Y-%m-%d %H:%M:%S") - curr_time).total_seconds()))
        return closest

    def perform_sync(self):
        self.btn_sync.config(state=tk.DISABLED, text="SYNCING...")
        success = sync_offline_to_db(self.detections_to_sync, self.hardware_data)
        if success:
            messagebox.showinfo("Success", "Offline mission synced to Cloud.")
        else:
            messagebox.showerror("Error", "Sync failed. Check logs.")

    def update_gui(self):
        if not self.playing: return
        ret, frame = self.cap.read()
        if not ret:
            self.playing = False
            self.btn_sync.config(state=tk.NORMAL)
            return

        video_sec = self.cap.get(cv2.CAP_PROP_POS_MSEC) / 1000.0
        telem = self.get_synced_telemetry(video_sec)
        
        results = self.model.track(frame, imgsz=416, verbose=False, persist=True)
        annotated = results[0].plot()
        
        if results[0].boxes.id is not None:
            for box in results[0].boxes:
                yolo_id = int(box.id[0])
                cls_name = self.model.names[int(box.cls[0])]
                if yolo_id not in self.tracked_objects:
                    self.tracked_objects[yolo_id] = {'start': time.monotonic(), 'logged': False}
                
                elapsed = time.monotonic() - self.tracked_objects[yolo_id]['start']
                if elapsed > self.CONFIRM_AFTER and not self.tracked_objects[yolo_id]['logged']:
                    self.tracked_objects[yolo_id]['logged'] = True
                    # Simulation: Auto-confirm water for demo/offline processing
                    self.detections_to_sync.append({
                        'target': cls_name,
                        'conf': float(box.conf[0]),
                        'water': True,
                        'lat': float(telem['Lat']),
                        'lon': float(telem['Lon']),
                        'lidar': float(telem['LiDAR']),
                        'true_area': 5000 # Default
                    })

        img = cv2.cvtColor(annotated, cv2.COLOR_BGR2RGB)
        img = Image.fromarray(cv2.resize(img, (960, 540)))
        self.photo = ImageTk.PhotoImage(image=img)
        self.canvas.create_image(0, 0, image=self.photo, anchor=tk.NW)
        self.after(1, self.update_gui)

if __name__ == "__main__":
    load_dotenv()
    video = sys.argv[1] if len(sys.argv) > 1 else filedialog.askopenfilename()
    if video:
        app = OfflineAnalyzerApp(video, "python_helpers/main_classifier.pt", "python_helpers/water_classifier.pt")
        app.mainloop()

import os
import sys
import io
import cv2
import time
import subprocess
from threading import Thread, Lock, Event
import paramiko
import numpy as np
import socket
import json
import csv
from ultralytics import YOLO
from datetime import datetime
from flask import Flask, Response, jsonify, request, send_file
import queue
from supabase import create_client, Client
from dotenv import load_dotenv

# Force unbuffered output for real-time logging 
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', line_buffering=True)
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', line_buffering=True)

load_dotenv(override=False)
app = Flask(__name__)

# --- Configuration ---
PI_IP = os.getenv("PI_IP", "100.127.53.123")
USERNAME = os.getenv("PI_USERNAME", "rpi3408")
PASSWORD = os.getenv("PI_PASSWORD", "rpi3408")
REMOTE_VIDEO_DIR = "/home/rpi3408/offline_videos"
LOCAL_VIDEO_DIR = os.path.join(os.path.expanduser("~"), "Downloads", "GCS_Data", "Drone_Offline_Videos")
CSV_LOG_DIR = os.path.join(os.path.expanduser("~"), "Downloads", "GCS_Data", "Logs")
os.makedirs(LOCAL_VIDEO_DIR, exist_ok=True)
os.makedirs(CSV_LOG_DIR, exist_ok=True)

# --- Supabase Setup ---
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

ACTIVE_SESSION_ID = os.getenv("ACTIVE_SESSION_ID")
TARGET_TYPES = {}

def load_target_types():
    global TARGET_TYPES
    if supabase:
        try:
            res = supabase.table("target_types").select("id, label").execute()
            TARGET_TYPES = {row['label'].lower(): row['id'] for row in res.data}
        except: pass

# --- Global State & Placeholder ---
output_lock = Lock()

def generate_placeholder():
    blank_frame = np.zeros((480, 640, 3), dtype=np.uint8)
    cv2.putText(blank_frame, "CONNECTING TO TACTICAL LINK...", (50, 240), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
    ret, jpeg = cv2.imencode('.jpg', blank_frame)
    if ret: return jpeg.tobytes()
    return None

global_jpeg_bytes = generate_placeholder()
session_detections = 0
session_sprays = 0
is_pi_connected = True

ai_telemetry_data = {
    "sharpnessScore": 0, "isSharpEnough": False, "trackingProgress": 0,
    "waterConfirmed": False, "activeTarget": None, "activeTargetArea": 0,
    "totalPipelineSpeedMs": 0, "linkStatus": "Healthy"
}
telemetry_lock = Lock()

def log_to_csv(data):
    filename = os.path.join(CSV_LOG_DIR, f"mission_log_{datetime.now().strftime('%Y%m%d')}.csv")
    file_exists = os.path.isfile(filename)
    with open(filename, mode='a', newline='') as file:
        writer = csv.DictWriter(file, fieldnames=data.keys())
        if not file_exists: writer.writeheader()
        writer.writerow(data)

supabase_queue = queue.Queue()
def supabase_worker():
    while True:
        task = supabase_queue.get()
        if task is None: break
        if supabase:
            try: supabase.table(task['table']).insert(task['data']).execute()
            except: pass
        supabase_queue.task_done()
Thread(target=supabase_worker, daemon=True).start()

def connection_monitor():
    global is_pi_connected
    while True:
        try:
            cmd = f"ping -n 1 -w 1000 {PI_IP}" if sys.platform == 'win32' else f"ping -c 1 -W 1 {PI_IP}"
            output = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            is_pi_connected = (output.returncode == 0)
        except: is_pi_connected = False
        with telemetry_lock:
            ai_telemetry_data["linkStatus"] = "Healthy" if is_pi_connected else "Lost"
        time.sleep(2)
Thread(target=connection_monitor, daemon=True).start()

def sync_drone_time():
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(PI_IP, username=USERNAME, password=PASSWORD, timeout=5)
        now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        ssh.exec_command('sudo timedatectl set-timezone Asia/Manila')
        ssh.exec_command(f'sudo date -s "{now}"')
        ssh.close()
    except: pass
Thread(target=sync_drone_time, daemon=True).start()

class HeartbeatSender:
    def __init__(self, ip, port=5005):
        self.ip, self.port, self.stopped = ip, port, False
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    def start(self):
        Thread(target=self.update, args=(), daemon=True).start()
        return self
    def update(self):
        while not self.stopped:
            try: self.sock.sendto(b"ALIVE", (self.ip, self.port))
            except: pass
            time.sleep(2) 
    def stop(self): self.stopped = True

class TelemetryReceiver:
    def __init__(self, port=5005):
        self.port, self.latest_data, self.stopped = port, {}, False
        self.lock = Lock()
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.sock.settimeout(1.0) 
        self.sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.sock.bind(("0.0.0.0", self.port))
    def start(self):
        Thread(target=self.update, args=(), daemon=True).start()
        return self
    def update(self):
        while not self.stopped:
            try:
                data, _ = self.sock.recvfrom(1024)
                with self.lock: self.latest_data = json.loads(data.decode('utf-8'))
            except: pass
    def get_data(self):
        with self.lock: return self.latest_data.copy()
    def stop(self):
        self.stopped = True
        self.sock.close()

tel_receiver = TelemetryReceiver().start()

MIN_SHARPNESS, MAX_SHARPNESS, CONFIRM_AFTER, MAX_SPRAY_ALTITUDE = 40.0, 2500.0, 3.0, 1.5 
tracked_classes = {}   

class StreamValidator:
    def __init__(self): self.last_frame = None
    def check_frame_reliability(self, frame):
        if frame is None: return False, "NO FRAME"
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        if self.last_frame is not None and np.mean(cv2.absdiff(gray, self.last_frame)) < 0.5:
            return False, "STREAM FROZEN"
        self.last_frame = gray.copy()
        sharpness = cv2.Laplacian(gray, cv2.CV_64F).var()
        if sharpness < MIN_SHARPNESS: return False, f"TOO BLURRY ({int(sharpness)})"
        if sharpness > MAX_SHARPNESS: return False, f"PIXELATED ({int(sharpness)})"
        return True, f"READY ({int(sharpness)})"

@app.route('/api/start_flight', methods=['POST', 'OPTIONS'])
def start_flight():
    if request.method == 'OPTIONS': return '', 200
    global ACTIVE_SESSION_ID, session_detections, session_sprays
    session_detections, session_sprays = 0, 0
    try:
        res = supabase.table("flight_sessions").insert({"barangay_id": 1, "status": "active", "start_time": datetime.utcnow().isoformat()}).execute()
        ACTIVE_SESSION_ID = res.data[0]['id']
        load_target_types()
        return jsonify({"status": "success", "session_id": ACTIVE_SESSION_ID})
    except Exception as e: return jsonify({"error": str(e)}), 500

# ai_engine.py - Update the end_flight route

@app.route('/api/end_flight', methods=['POST', 'OPTIONS'])
def end_flight():
    if request.method == 'OPTIONS': return '', 200
    global ACTIVE_SESSION_ID
    
    # NEW: Safely get the requested status from the frontend payload
    data = request.get_json(silent=True) or {}
    target_status = data.get('status', 'completed')
    
    if ACTIVE_SESSION_ID:
        supabase.table("flight_sessions").update({
            "status": target_status, 
            "end_time": datetime.utcnow().isoformat()
        }).eq("id", ACTIVE_SESSION_ID).execute()
        ACTIVE_SESSION_ID = None
        
    return jsonify({"status": "success", "recorded_as": target_status})

@app.route('/api/set_session', methods=['POST', 'OPTIONS'])
def set_session():
    if request.method == 'OPTIONS': return '', 200
    global ACTIVE_SESSION_ID
    data = request.json
    if data and 'session_id' in data:
        ACTIVE_SESSION_ID = data['session_id']
        load_target_types()
        return jsonify({"status": "success", "session_id": ACTIVE_SESSION_ID})
    return jsonify({"error": "No session_id provided"}), 400

@app.route('/api/status')
def get_status():
    hw_data = tel_receiver.get_data() 
    if 'voltage' in hw_data and 'battery_voltage' not in hw_data: hw_data['battery_voltage'] = hw_data['voltage']
    if 'is_armed' in hw_data and 'armed' not in hw_data: hw_data['armed'] = hw_data['is_armed']
        
    flight_mode_str = hw_data.get('flight_mode', '').upper()
    hw_data['modes'] = {
        "angle": "ANGLE" in flight_mode_str,
        "positionHold": "POSHOLD" in flight_mode_str or "POSITION HOLD" in flight_mode_str,
        "returnToHome": "RTH" in flight_mode_str or "RETURN TO HOME" in flight_mode_str,
        "altitudeHold": "ALTHOLD" in flight_mode_str or "ALTITUDE HOLD" in flight_mode_str,
        "headingHold": "MAG" in flight_mode_str or "HEADING HOLD" in flight_mode_str,
        "airmode": "AIRMODE" in flight_mode_str or "AIR MODE" in flight_mode_str,
        "surface": "SURFACE" in flight_mode_str,
        "mcBraking": "BRAKING" in flight_mode_str or "MC BRAKING" in flight_mode_str,
        "beeper": "BEEPER" in flight_mode_str
    }
    with telemetry_lock: ai_data = ai_telemetry_data.copy()
    return jsonify({**hw_data, **ai_data, "session_detections": session_detections, "session_sprays": session_sprays})

@app.route('/video_feed')
def video_feed():
    def generate():
        while True:
            with output_lock: current_bytes = global_jpeg_bytes
            if current_bytes:
                yield (b'--frame\r\n' b'Content-Type: image/jpeg\r\n\r\n' + current_bytes + b'\r\n')
            time.sleep(0.04)
    return Response(generate(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/api/manual_spray', methods=['POST', 'OPTIONS'])
def manual_spray():
    if request.method == 'OPTIONS': return '', 200
    try:
        hw_data = tel_receiver.get_data()
        cur_alt = hw_data.get("lidar_m", 0.0)
        with telemetry_lock:
            water_confirmed = ai_telemetry_data.get("waterConfirmed", False)
            computed_area = ai_telemetry_data.get("activeTargetArea", 0)
        if not computed_area or cur_alt > 1.5:
            return jsonify({"error": f"Conditions not met (Alt: {cur_alt}m)"}), 403
        return jsonify(SimpleSprayer().spray(computed_area, None, cur_alt, trigger_type="Manual"))
    except Exception as e: return jsonify({"error": str(e)}), 500

class SimpleSprayer:
    _instance, _lock = None, Lock()
    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(SimpleSprayer, cls).__new__(cls)
                cls._instance.is_busy = False
            return cls._instance
            
    def spray(self, area, detection_id=None, altitude=0.0, trigger_type="Manual"):
        global ACTIVE_SESSION_ID, session_sprays
        if self.is_busy: return {"error": "Busy"}
        
        true_area = area * (altitude ** 2) if altitude > 0.05 else area
        duration = 5 if true_area < 2500 else (10 if true_area < 7500 else 15)
        
        cmd = f"""python3 - << 'EOF'
import pigpio, time
pi = pigpio.pi()
if not pi.connected: exit()
SERVO_GPIO, POS_A, POS_B, JITTER_T = 18, 1200, 1800, 0.15
start_t = time.time()
try:
    while time.time() - start_t < {duration}:
        pi.set_servo_pulsewidth(SERVO_GPIO, POS_A); time.sleep(JITTER_T)
        pi.set_servo_pulsewidth(SERVO_GPIO, POS_B); time.sleep(JITTER_T)
finally:
    pi.set_servo_pulsewidth(SERVO_GPIO, 1500)
    time.sleep(0.5)
    pi.set_servo_pulsewidth(SERVO_GPIO, 0)
    pi.stop()
EOF
"""
        def run_spray():
            self.is_busy = True
            try:
                ssh = paramiko.SSHClient(); ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
                ssh.connect(PI_IP, username=USERNAME, password=PASSWORD, timeout=5)
                ssh.exec_command(cmd)
                global session_sprays; session_sprays += 1
                now_iso = datetime.utcnow().isoformat()
                if ACTIVE_SESSION_ID:
                    supabase_queue.put({"table": "spray_operations", "data": {"session_id": ACTIVE_SESSION_ID, "detection_id": detection_id, "trigger_type": trigger_type, "duration_seconds": duration, "target_area_pixels": float(area), "true_area_scaled": float(true_area), "triggered_at": now_iso}})
                log_to_csv({"Timestamp": now_iso, "Type": "SPRAY", "Target": trigger_type, "Area": true_area, "Duration": duration})
                time.sleep(duration + 1); ssh.close()
            finally: self.is_busy = False
        Thread(target=run_spray, daemon=True).start()
        return {"status": "success", "duration": duration}

def camera_producer(frame_queue, stop_event):
    # Using FFmpeg to naturally read the Pi's MPEG-TS stream (Bypasses missing GStreamer on Windows)
    udp_stream_url = "udp://@0.0.0.0:5600?overrun_nonfatal=1&fifo_size=500000"
    cap = cv2.VideoCapture(udp_stream_url, cv2.CAP_FFMPEG)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
    
    last_frame_time = time.time()
    while not stop_event.is_set():
        ret, frame = cap.read()
        if not ret:
            if time.time() - last_frame_time > 5:
                cap.release(); time.sleep(1)
                cap = cv2.VideoCapture(udp_stream_url, cv2.CAP_FFMPEG)
                cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                last_frame_time = time.time()
            continue
            
        last_frame_time = time.time()
        
        while not frame_queue.empty():
            try: frame_queue.get_nowait()
            except queue.Empty: break
            
        try: frame_queue.put(frame, block=False)
        except queue.Full: pass
        
    cap.release()

def inference_consumer(frame_queue, stop_event):
    global global_jpeg_bytes, session_detections
    model = YOLO(os.path.join(os.path.dirname(__file__), "main_classifier.pt"))
    model_water = YOLO(os.path.join(os.path.dirname(__file__), "water_classifier.pt"))
    validator = StreamValidator()
    telemetry_logged_this_sec = False
    
    while not stop_event.is_set():
        if frame_queue.empty(): continue
        frame = frame_queue.get(); start_time = time.time()
        is_reliable, status_msg = validator.check_frame_reliability(frame)
        
        if not is_reliable:
            annotated_frame = frame.copy()
            cv2.putText(annotated_frame, f"AI PAUSED: {status_msg}", (10, 30), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
            ret, jpeg = cv2.imencode('.jpg', cv2.resize(annotated_frame, (640, 480)))
            if ret:
                with output_lock: global_jpeg_bytes = jpeg.tobytes()
            continue 
            
        results = model.track(frame, imgsz=416, conf=0.25, verbose=False, persist=True)
        annotated_frame = frame.copy()
        pipeline_ms = (time.time() - start_time) * 1000
        hw_data = tel_receiver.get_data(); cur_lidar = hw_data.get("lidar_m", 0.0); max_progress = 0
        bat_volts = hw_data.get("battery_voltage", hw_data.get("voltage", 0.0))
        is_armed = hw_data.get("armed", hw_data.get("is_armed", False))
        
        if results[0].boxes.id is not None:
            for box in results[0].boxes:
                obj_id = int(box.id[0])
                if obj_id not in tracked_classes: tracked_classes[obj_id] = {'start': time.time(), 'logged': False}
                elapsed = time.time() - tracked_classes[obj_id]['start']
                progress = min(100, int((elapsed / CONFIRM_AFTER) * 100)); max_progress = max(max_progress, progress)
                
                pixel_area = float(box.xywh[0][2]*box.xywh[0][3])
                true_area = pixel_area * (cur_lidar ** 2) if cur_lidar > 0.05 else pixel_area
                det_class = model.names[int(box.cls[0])]
                
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                color = (0, 255, 0) if progress >= 100 else (0, 165, 255) 
                cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 2)
                cv2.putText(annotated_frame, f"{det_class.upper()} {progress}%", (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
                
                if progress >= 100:
                    crop = frame[max(0,y1):min(frame.shape[0],y2), max(0,x1):min(frame.shape[1],x2)]
                    is_water_confirmed = False
                    if crop.size > 0:
                        water_res = model_water(crop, verbose=False)
                        if "water" in model_water.names[water_res[0].probs.top1].lower() and water_res[0].probs.top1conf.item() * 100 > 50:
                            is_water_confirmed = True

                    with telemetry_lock:
                        ai_telemetry_data["activeTarget"] = det_class
                        ai_telemetry_data["activeTargetArea"] = true_area
                        ai_telemetry_data["waterConfirmed"] = is_water_confirmed
                    
                    if is_water_confirmed and not tracked_classes[obj_id]['logged']:
                        tracked_classes[obj_id]['logged'] = True; session_detections += 1
                        now_iso = datetime.utcnow().isoformat()
                        if ACTIVE_SESSION_ID:
                            supabase_queue.put({"table": "detections", "data": {"session_id": ACTIVE_SESSION_ID, "target_type_id": TARGET_TYPES.get(det_class.lower(), 1), "confidence": float(box.conf[0]), "latitude": float(hw_data.get("gps_lat", 0.0)), "longitude": float(hw_data.get("gps_lon", 0.0)), "lidar_m": float(cur_lidar), "water_confirmed": True, "created_at": now_iso}})
                        log_to_csv({"Timestamp": now_iso, "Type": "DETECTION", "Target": det_class, "Area": true_area})
        
        with telemetry_lock:
            ai_telemetry_data.update({"trackingProgress": max_progress, "totalPipelineSpeedMs": pipeline_ms})
            
        if ACTIVE_SESSION_ID and int(time.time()) % 1 == 0 and not telemetry_logged_this_sec:
            now_iso = datetime.utcnow().isoformat()
            supabase_queue.put({"table": "hardware_telemetry", "data": {"session_id": ACTIVE_SESSION_ID, "logged_at": now_iso, "latitude": float(hw_data.get("gps_lat", 0.0)), "longitude": float(hw_data.get("gps_lon", 0.0)), "altitude_lidar_m": float(cur_lidar), "battery_voltage": float(bat_volts), "is_armed": is_armed, "heading": float(hw_data.get("heading", 0.0))}})
            supabase_queue.put({"table": "ai_performance_logs", "data": {"session_id": ACTIVE_SESSION_ID, "logged_at": now_iso, "sharpness_score": 50, "tracking_progress_percent": max_progress, "pipeline_speed_ms": pipeline_ms}})
            telemetry_logged_this_sec = True
        elif int(time.time()) % 1 != 0: telemetry_logged_this_sec = False
        
        ret, jpeg = cv2.imencode('.jpg', cv2.resize(annotated_frame, (640, 480)))
        if ret:
            with output_lock: global_jpeg_bytes = jpeg.tobytes()

if __name__ == "__main__":
    fq = queue.Queue(maxsize=1); se = Event()
    heartbeat = HeartbeatSender(ip=PI_IP).start()
    Thread(target=camera_producer, args=(fq, se), daemon=True).start()
    Thread(target=inference_consumer, args=(fq, se), daemon=True).start()
    try: app.run(host='0.0.0.0', port=5000)
    finally: heartbeat.stop()
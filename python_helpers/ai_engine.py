import os
import sys

# Force unbuffered output for real-time logging
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, line_buffering=True)
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, line_buffering=True)

import cv2
import time
import threading
import paramiko
import numpy as np
import socket
import json
from ultralytics import YOLO
from datetime import datetime
from flask import Flask, Response, jsonify, request
import queue
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# --- Supabase Setup ---
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("[ERROR] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env")
    supabase = None
else:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- Global Session State ---
ACTIVE_SESSION_ID = None
session_lock = threading.Lock()

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = '*'
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    return response

# --- Global State & Telemetry ---
output_frame = None
output_lock = threading.Lock()

ai_telemetry = {
    "sharpnessScore": 0,
    "isSharpEnough": False,
    "trackingProgress": 0,
    "waterConfirmed": False,
    "activeTarget": None,
    "activeDetectionId": None,
    "activeTargetArea": 0,
    "totalPipelineSpeedMs": 0,
    "gps_lat": 0.0,
    "gps_lon": 0.0,
    "lidar_m": 0.0,
    "heading": 0.0,
    "battery_voltage": 0.0
}
telemetry_lock = threading.Lock()

class TelemetryReceiver:
    def __init__(self, port=5005):
        self.port = port
        self.latest_data = {}
        self.lock = threading.Lock()
        self.stopped = False
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.sock.settimeout(1.0) 
        try:
            self.sock.bind(("0.0.0.0", self.port))
            print(f"[TELEMETRY] Listening for drone data on port {self.port}...")
        except Exception as e:
            print(f"[ERROR] Telemetry socket bind failed: {e}")

    def start(self):
        threading.Thread(target=self.update, args=(), daemon=True).start()
        return self

    def update(self):
        while not self.stopped:
            try:
                data, _ = self.sock.recvfrom(1024)
                decoded = json.loads(data.decode('utf-8'))
                
                with self.lock:
                    self.latest_data = decoded
                
                with telemetry_lock:
                    ai_telemetry["gps_lat"] = decoded.get("gps_lat", 0.0)
                    ai_telemetry["gps_lon"] = decoded.get("gps_lon", 0.0)
                    ai_telemetry["lidar_m"] = decoded.get("lidar_m", 0.0)
                    ai_telemetry["heading"] = decoded.get("heading", 0.0)
                    ai_telemetry["battery_voltage"] = decoded.get("voltage", 0.0)
                    ai_telemetry["is_armed"] = decoded.get("is_armed", False)
            except Exception:
                continue

    def get_data(self):
        with self.lock:
            return self.latest_data.copy()

    def stop(self):
        self.stopped = True
        self.sock.close()

MIN_SHARPNESS = float(os.getenv("MIN_SHARPNESS", "30.0"))
CONFIRM_AFTER = 5.0    # 5 seconds of continuous tracking
PRUNE_AFTER = 2.0      # Drop target if unseen for 2 seconds
MAX_SPRAY_ALTITUDE = 0.5 # Strict safety gatekeeper (meters)
tracked_classes = {}   

class StreamValidator:
    def __init__(self):
        self.last_frame = None
    def check_frame_reliability(self, frame):
        if frame is None: return False, "NO FRAME"
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        if self.last_frame is not None:
            diff = cv2.absdiff(gray, self.last_frame)
            if np.mean(diff) < 0.5:
                return False, "STREAM FROZEN"
        self.last_frame = gray.copy()
        sharpness = cv2.Laplacian(gray, cv2.CV_64F).var()
        if sharpness < MIN_SHARPNESS:
            return False, f"TOO BLURRY ({int(sharpness)})"
        return True, f"READY ({int(sharpness)})"

def sync_drone_time():
    print("[INFO] Attempting to sync time with drone...")
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        pi_ip = os.getenv("PI_IP", "100.127.53.123")
        username = os.getenv("PI_USERNAME", "rpi3408")
        password = os.getenv("PI_PASSWORD", "rpi3408")
        ssh.connect(pi_ip, username=username, password=password, timeout=5)
        current_time_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        ssh.exec_command('sudo timedatectl set-timezone Asia/Manila')
        ssh.exec_command(f'sudo date -s "{current_time_str}"')
        print(f"[INFO] Synced Pi time to GCS: {current_time_str}")
        ssh.close()
    except Exception as e:
        print(f"[WARN] Time sync failed: {e}")

# --- 3NF Schema Mapping ---
TARGET_TYPE_MAP = {} # Label -> ID

def fetch_target_types():
    global TARGET_TYPE_MAP
    if not supabase: return
    try:
        # Fetch target_types to map string labels to DB IDs
        res = supabase.table("target_types").select("id, label").execute()
        TARGET_TYPE_MAP = {item['label'].lower(): item['id'] for item in res.data}
        print(f"[INFO] 3NF Target Types Loaded: {TARGET_TYPE_MAP}")
    except Exception as e:
        print(f"[WARN] Could not fetch target_types. Ensure table exists: {e}")

# --- Flight Session Endpoints ---
@app.route('/api/start_flight', methods=['POST', 'OPTIONS'])
def start_flight():
    if request.method == 'OPTIONS':
        return '', 200
    global ACTIVE_SESSION_ID, session_detections, session_sprays
    if not supabase:
        return jsonify({"error": "Supabase not initialized"}), 500
    
    # Reset session stats
    session_detections = 0
    session_sprays = 0
    
    data = {"barangay_id": 1, "status": "active", "start_time": datetime.utcnow().isoformat()}
    try:
        response = supabase.table("flight_sessions").insert(data).execute()
        if response.data:
            ACTIVE_SESSION_ID = response.data[0]['id']
            print(f"[DATABASE] Mission Started: {ACTIVE_SESSION_ID}")
            return jsonify({"status": "success", "session_id": ACTIVE_SESSION_ID})
    except Exception as e:
        print(f"[DATABASE ERROR] Start flight failed: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/end_flight', methods=['POST', 'OPTIONS'])
def end_flight():
    if request.method == 'OPTIONS':
        return '', 200
    global ACTIVE_SESSION_ID
    if not ACTIVE_SESSION_ID or not supabase:
        return jsonify({"error": "No active flight to end"}), 400
    try:
        supabase.table("flight_sessions").update({
            "status": "completed", 
            "end_time": datetime.utcnow().isoformat()
        }).eq("id", ACTIVE_SESSION_ID).execute()
        print(f"[DATABASE] Mission Ended: {ACTIVE_SESSION_ID}")
        ACTIVE_SESSION_ID = None
        return jsonify({"status": "success", "message": "Mission log finalized."})
    except Exception as e:
        print(f"[DATABASE ERROR] End flight failed: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/set_session', methods=['POST', 'OPTIONS'])
def set_session():
    if request.method == 'OPTIONS':
        return '', 200
    global ACTIVE_SESSION_ID, session_detections, session_sprays
    data = request.json
    if data and 'session_id' in data:
        ACTIVE_SESSION_ID = data['session_id']
        session_detections = 0
        session_sprays = 0
        print(f"[INFO] Active Session ID synced to: {ACTIVE_SESSION_ID}")
        return jsonify({"status": "success", "session_id": ACTIVE_SESSION_ID})
    return jsonify({"status": "error", "message": "No session_id provided"}), 400

# --- Global State ---
session_detections = 0
session_sprays = 0

# --- Telemetry Endpoint for React ---
@app.route('/api/status')
def get_telemetry():
    with telemetry_lock:
        data = ai_telemetry.copy()
        data["session_detections"] = session_detections
        data["session_sprays"] = session_sprays
        return jsonify(data)

# --- Manual Spray Endpoint ---
@app.route('/api/manual_spray', methods=['POST', 'OPTIONS'])
def manual_spray():
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        sprayer = SimpleSprayer()
        with telemetry_lock:
            cur_alt = ai_telemetry["lidar_m"]
        
        res = sprayer.spray(20000, None, cur_alt) 
        return jsonify(res)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- Video Feed Endpoint ---
@app.route('/video_feed')
@app.route('/camera_feed')
def video_feed():
    def generate():
        global output_frame
        while True:
            with output_lock:
                if output_frame is None:
                    frame = (50 * np.ones((480, 640, 3), dtype=np.uint8)).astype(np.uint8)
                    cv2.putText(frame, "[WAITING FOR PI STREAM]", (20, 100), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 165, 255), 2)
                else:
                    frame = output_frame.copy() 
                    
            ret, jpeg = cv2.imencode('.jpg', frame)
            if ret:
                yield (b'--frame\r\n' b'Content-Type: image/jpeg\r\n\r\n' + jpeg.tobytes() + b'\r\n')
            time.sleep(0.04)
    return Response(generate(), mimetype='multipart/x-mixed-replace; boundary=frame')

class SimpleSprayer:
    def __init__(self):
        self.ssh = paramiko.SSHClient()
        self.ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        self.pi_ip = os.getenv("PI_IP", "100.127.53.123")
        self.username = os.getenv("PI_USERNAME", "rpi3408")
        self.password = os.getenv("PI_PASSWORD", "rpi3408")
        try:
            self.ssh.connect(self.pi_ip, username=self.username, password=self.password, timeout=3)
            self.ssh.exec_command("raspi-gpio set 18 op dl")
        except Exception as e: 
            print(f"[WARN] Sprayer SSH failed: {e}")

    def spray(self, area, detection_id=None, altitude=0.0):
        global ACTIVE_SESSION_ID, session_sprays
        
        # 1. HEIGHT GATEKEEPER
        if altitude > MAX_SPRAY_ALTITUDE:
            print(f"[SAFETY] Spray aborted. Altitude {altitude}m > {MAX_SPRAY_ALTITUDE}m")
            return {"error": "Too high to spray", "altitude": altitude}

        # 2. TRUE AREA CALCULATION (Physics-based)
        # Scaled area = pixels * (height^2)
        true_area = area * (altitude ** 2) if altitude > 0.05 else area
        
        # 3. DYNAMIC DURATION
        if true_area < 2500: duration = 5
        elif true_area < 7500: duration = 10
        else: duration = 15

        trigger_type = "Manual" if area == 20000 else "Auto"
        cmd = f"raspi-gpio set 18 dh && sleep {duration} && raspi-gpio set 18 dl"
        try: 
            self.ssh.exec_command(f"nohup {cmd} > /dev/null 2>&1 &")
            print(f"[ACTION] Spraying {true_area:.1f} area for {duration}s")
            session_sprays += 1
            
            # 3NF Schema: Log to spray_operations
            if ACTIVE_SESSION_ID:
                def log_spray_op():
                    try:
                        supabase.table("spray_operations").insert({
                            "detection_id": detection_id,
                            "trigger_type": trigger_type,
                            "duration_seconds": duration,
                            "target_area_pixels": float(area)
                        }).execute()
                    except Exception as e:
                        print(f"[DB ERROR] Failed to log spray operation: {e}")
                threading.Thread(target=log_spray_op, daemon=True).start()
            return {"status": "success", "duration": duration, "true_area": true_area}
        except Exception as e: 
            print(f"[ERROR] Failed to execute spray command: {e}")
            return {"error": str(e)}

def camera_producer(frame_queue, stop_event):
    udp_stream_url = "udp://@0.0.0.0:5600?overrun_nonfatal=1&fifo_size=500000&buffer_size=1024000"
    cap = cv2.VideoCapture(udp_stream_url, cv2.CAP_FFMPEG)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
    
    if not cap.isOpened():
        print("[ERROR] Could not open UDP FFmpeg pipeline.")
        return

    print("[INFO] Pipeline opened. Waiting for data...")
    last_frame_time = time.time()
    
    while not stop_event.is_set():
        ret, frame = cap.read()
        if not ret:
            if time.time() - last_frame_time > 5:
                print("\n[WARN] Video stream dropped! Reconnecting...")
                cap.release()
                time.sleep(1)
                cap = cv2.VideoCapture(udp_stream_url, cv2.CAP_FFMPEG)
                cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                last_frame_time = time.time()
            continue
        
        last_frame_time = time.time()
        while not frame_queue.empty():
            try:
                frame_queue.get_nowait()
            except queue.Empty:
                break
        try:
            frame_queue.put(frame, block=False)
        except queue.Full:
            pass
    cap.release()

def inference_consumer(frame_queue, stop_event):
    global output_frame, tracked_classes, ACTIVE_SESSION_ID, session_detections
    
    base_dir = os.path.dirname(__file__)
    main_model_path = os.path.join(base_dir, "main_classifier.pt")
    water_model_path = os.path.join(base_dir, "water_classifier.pt")
    
    if not os.path.exists(main_model_path) or not os.path.exists(water_model_path):
        print("[WARNING] Model files not found!")
        while not stop_event.is_set():
            if not frame_queue.empty():
                frame = frame_queue.get()
                cv2.putText(frame, "MODELS MISSING", (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
                with output_lock: output_frame = frame
            time.sleep(0.1)
        return

    main_model = YOLO(main_model_path)
    water_model = YOLO(water_model_path)
    validator = StreamValidator()
    print("[INFO] AI Engine Ready with 2-Stage Perception.")
    
    telemetry_logged_this_sec = False

    while not stop_event.is_set():
        if frame_queue.empty():
            time.sleep(0.01)
            continue
            
        frame = frame_queue.get()
        start_time = time.time()
        current_time = time.time()
        
        with telemetry_lock:
            cur_lat = ai_telemetry["gps_lat"]
            cur_lon = ai_telemetry["gps_lon"]
            cur_lidar = ai_telemetry["lidar_m"]
        
        is_reliable, status_msg = validator.check_frame_reliability(frame)
        if not is_reliable:
            cv2.putText(frame, f"AI PAUSED: {status_msg}", (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
            with output_lock: output_frame = frame
            with telemetry_lock:
                ai_telemetry["isSharpEnough"] = False
                ai_telemetry["waterConfirmed"] = False
                ai_telemetry["trackingProgress"] = 0
            continue

        results_main = main_model.predict(frame, imgsz=416, conf=0.25, verbose=False)
        annotated_frame = frame.copy() 
        max_progress = 0
        active_target_name = None
        any_water_confirmed = False

        if results_main[0].boxes is not None and len(results_main[0].boxes) > 0:
            boxes = results_main[0].boxes.xyxy.cpu().numpy()
            clss = results_main[0].boxes.cls.cpu().numpy()
            confs = results_main[0].boxes.conf.cpu().numpy() 

            for box, cls, conf in zip(boxes, clss, confs):
                cls_name = results_main[0].names[int(cls)]
                if cls_name not in tracked_classes:
                    tracked_classes[cls_name] = {'first_seen': current_time, 'last_seen': current_time, 'db_logged': False, 'water_confirmed': False}
                else:
                    tracked_classes[cls_name]['last_seen'] = current_time

                elapsed = current_time - tracked_classes[cls_name]['first_seen']
                progress = min(100, int((elapsed / CONFIRM_AFTER) * 100))
                max_progress = max(max_progress, progress)
                
                x1, y1, x2, y2 = map(int, box)
                cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (255, 100, 0), 2) 

                if elapsed >= CONFIRM_AFTER:
                    active_target_name = cls_name
                    if not tracked_classes[cls_name]['water_confirmed']:
                        crop = frame[y1:y2, x1:x2]
                        if crop.size > 0:
                            water_res = water_model(crop, verbose=False)
                            w_conf = water_res[0].probs.top1conf.item() * 100
                            w_label = water_model.names[water_res[0].probs.top1]
                            if "water" in w_label.lower() and w_conf > 50:
                                tracked_classes[cls_name]['water_confirmed'] = True
                    
                    if tracked_classes[cls_name]['water_confirmed']:
                        any_water_confirmed = True
                        cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 255, 0), 3)
                        
                        if not tracked_classes[cls_name]['db_logged']:
                            tracked_classes[cls_name]['db_logged'] = True
                            def log_to_db(t_type_label, t_conf, lat, lon, lidar, session_id):
                                global session_detections
                                try:
                                    type_id = TARGET_TYPE_MAP.get(t_type_label.lower())
                                    if not type_id or not session_id: return
                                    res = supabase.table("detections").insert({
                                        "session_id": session_id,
                                        "target_type_id": type_id,
                                        "confidence": float(t_conf),
                                        "water_confirmed": True,
                                        "latitude": float(lat), "longitude": float(lon), "lidar_m": float(lidar)
                                    }).execute()
                                    if res.data:
                                        tracked_classes[t_type_label]['last_db_id'] = res.data[0]['id']
                                        session_detections += 1
                                except Exception: pass
                            threading.Thread(target=log_to_db, args=(cls_name, conf, cur_lat, cur_lon, cur_lidar, ACTIVE_SESSION_ID), daemon=True).start()
                else:
                    cv2.putText(annotated_frame, f"TRACKING: {elapsed:.1f}s", (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 165, 255), 2)

                if tracked_classes[cls_name].get('water_confirmed') and not tracked_classes[cls_name].get('sprayed'):
                    tracked_classes[cls_name]['sprayed'] = True
                    sprayer = SimpleSprayer()
                    sprayer.spray((x2-x1)*(y2-y1), tracked_classes[cls_name].get('last_db_id'), cur_lidar)

        tracked_classes = {k: v for k, v in tracked_classes.items() if current_time - v['last_seen'] < PRUNE_AFTER}
        pipeline_ms = int((time.time() - start_time) * 1000)
        
        with telemetry_lock:
            ai_telemetry.update({"isSharpEnough": True, "trackingProgress": max_progress, "waterConfirmed": any_water_confirmed, "activeTarget": active_target_name, "totalPipelineSpeedMs": pipeline_ms})
            if any_water_confirmed and active_target_name:
                 ai_telemetry["activeDetectionId"] = tracked_classes[active_target_name].get('last_db_id')
                 ai_telemetry["activeTargetArea"] = (x2-x1)*(y2-y1)
            else:
                 ai_telemetry["activeDetectionId"] = None
                 ai_telemetry["activeTargetArea"] = 0

        if ACTIVE_SESSION_ID and int(current_time) % 1 == 0 and not telemetry_logged_this_sec:
             def log_telemetry_bg(session, sharp, max_prog, speed, lat, lon, lidar, volt, head):
                 try:
                     supabase.table("ai_performance_logs").insert({"session_id": session, "sharpness_score": sharp, "tracking_progress_percent": max_prog, "pipeline_speed_ms": speed}).execute()
                     supabase.table("hardware_telemetry").insert({"session_id": session, "latitude": lat, "longitude": lon, "altitude_lidar_m": lidar, "battery_voltage": volt, "heading": head, "is_armed": True}).execute()
                 except Exception: pass
             threading.Thread(target=log_telemetry_bg, args=(ACTIVE_SESSION_ID, int(sharpness), max_progress, pipeline_ms, cur_lat, cur_lon, cur_lidar, ai_telemetry["battery_voltage"], ai_telemetry["heading"]), daemon=True).start()
             telemetry_logged_this_sec = True
        elif int(current_time) % 1 != 0: telemetry_logged_this_sec = False
        with output_lock: output_frame = cv2.resize(annotated_frame, (640, 480))

if __name__ == "__main__":
    sync_drone_time()
    fetch_target_types()
    tel_receiver = TelemetryReceiver().start()
    fq, se = queue.Queue(maxsize=1), threading.Event()
    threading.Thread(target=camera_producer, args=(fq, se), daemon=True).start()
    threading.Thread(target=inference_consumer, args=(fq, se), daemon=True).start()
    try: app.run(host='0.0.0.0', port=5000, threaded=True, debug=False)
    finally: tel_receiver.stop()

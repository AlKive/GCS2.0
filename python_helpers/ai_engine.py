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
                # Also update global ai_telemetry for convenience
                with telemetry_lock:
                    ai_telemetry["gps_lat"] = decoded.get("gps_lat", 0.0)
                    ai_telemetry["gps_lon"] = decoded.get("gps_lon", 0.0)
                    ai_telemetry["lidar_m"] = decoded.get("lidar_m", 0.0)
                    ai_telemetry["heading"] = decoded.get("heading", 0.0)
                    ai_telemetry["battery_voltage"] = decoded.get("voltage", 0.0)
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
tracked_classes = {}   

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
    global ACTIVE_SESSION_ID
    if not supabase:
        return jsonify({"error": "Supabase not initialized"}), 500
    
    # 3NF Schema: barangay_id instead of location_id
    data = {"barangay_id": 1, "status": "active"}
    try:
        response = supabase.table("flight_sessions").insert(data).execute()
        ACTIVE_SESSION_ID = response.data[0]['id']
        print(f"[INFO] Flight started. Session ID: {ACTIVE_SESSION_ID}")
        return jsonify({"status": "success", "session_id": ACTIVE_SESSION_ID})
    except Exception as e:
        print(f"[ERROR] Failed to start flight: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/end_flight', methods=['POST', 'OPTIONS'])
def end_flight():
    if request.method == 'OPTIONS':
        return '', 200
    global ACTIVE_SESSION_ID
    if not ACTIVE_SESSION_ID:
        return jsonify({"error": "No active flight to end"}), 400
    if not supabase:
        return jsonify({"error": "Supabase not initialized"}), 500
    try:
        supabase.table("flight_sessions").update({
            "status": "completed", 
            "end_time": datetime.utcnow().isoformat()
        }).eq("id", ACTIVE_SESSION_ID).execute()
        print(f"[INFO] Flight ended. Session ID: {ACTIVE_SESSION_ID}")
        ACTIVE_SESSION_ID = None
        return jsonify({"status": "success", "message": "Flight session ended."})
    except Exception as e:
        print(f"[ERROR] Failed to end flight: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/set_session', methods=['POST', 'OPTIONS'])
def set_session():
    if request.method == 'OPTIONS':
        return '', 200
    global ACTIVE_SESSION_ID
    data = request.json
    if data and 'session_id' in data:
        ACTIVE_SESSION_ID = data['session_id']
        print(f"[INFO] Active Session ID synced to: {ACTIVE_SESSION_ID}")
        return jsonify({"status": "success", "session_id": ACTIVE_SESSION_ID})
    return jsonify({"status": "error", "message": "No session_id provided"}), 400

# --- Telemetry Endpoint for React ---
@app.route('/api/status')
def get_telemetry():
    with telemetry_lock:
        return jsonify(ai_telemetry)

# --- Manual Spray Endpoint ---
@app.route('/api/manual_spray', methods=['POST', 'OPTIONS'])
def manual_spray():
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        sprayer = SimpleSprayer()
        sprayer.spray(20000, 999) 
        return jsonify({"status": "success", "message": "Manual spray triggered"})
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
                    frame = output_frame.copy() # THREAD-SAFE COPY
                    
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

    def spray(self, area, detection_id=None):
        global ACTIVE_SESSION_ID
        duration = 2 if area < 5000 else 4 if area < 15000 else 6
        trigger_type = "Manual" if area == 20000 else "Auto"
        
        cmd = f"raspi-gpio set 18 dh && sleep {duration} && raspi-gpio set 18 dl"
        try: 
            self.ssh.exec_command(f"nohup {cmd} > /dev/null 2>&1 &")
            print(f"[ACTION] Triggered spray for {duration} seconds.")
            
            # 3NF Schema: Log to spray_operations
            if ACTIVE_SESSION_ID:
                def log_spray_op():
                    try:
                        # If we have a detection_id, link it. Otherwise, manual spray without target.
                        if detection_id:
                            supabase.table("spray_operations").insert({
                                "detection_id": detection_id,
                                "trigger_type": trigger_type,
                                "duration_seconds": duration,
                                "target_area_pixels": float(area)
                            }).execute()
                    except Exception as e:
                        print(f"[DB ERROR] Failed to log spray operation: {e}")
                threading.Thread(target=log_spray_op, daemon=True).start()
                    
        except Exception as e: 
            print(f"[ERROR] Failed to execute spray command: {e}")

# --- THE FIX: Thread-Safe Camera Producer ---
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
        
        # 1. Automatic Reconnection if UDP packets drop
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
        
        # 2. Thread-Safe Queue Clearing (No more silent crashes)
        while not frame_queue.empty():
            try:
                frame_queue.get_nowait()
            except queue.Empty:
                break
                
        # 3. Push the absolute freshest frame to YOLO
        try:
            frame_queue.put(frame, block=False)
        except queue.Full:
            pass
            
    cap.release()

def inference_consumer(frame_queue, stop_event):
    global output_frame, tracked_classes, ACTIVE_SESSION_ID
    
    base_dir = os.path.dirname(__file__)
    main_model_path = os.path.join(base_dir, "main_classifier.pt") # YOLO model
    water_model_path = os.path.join(base_dir, "water_classifier.pt") # Classifier
    
    if not os.path.exists(main_model_path) or not os.path.exists(water_model_path):
        print("[WARNING] Model files not found!")
        while not stop_event.is_set():
            if not frame_queue.empty():
                frame = frame_queue.get()
                cv2.putText(frame, "MODELS MISSING", (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
                with output_lock:
                    output_frame = frame
            time.sleep(0.1)
        return

    main_model = YOLO(main_model_path)
    water_model = YOLO(water_model_path)
    print("[INFO] AI Engine Ready with 2-Stage Perception.")
    
    telemetry_logged_this_sec = False

    while not stop_event.is_set():
        if frame_queue.empty():
            time.sleep(0.01)
            continue
            
        frame = frame_queue.get()
        start_time = time.time()
        current_time = time.time()
        
        # Get latest telemetry
        with telemetry_lock:
            cur_lat = ai_telemetry["gps_lat"]
            cur_lon = ai_telemetry["gps_lon"]
            cur_lidar = ai_telemetry["lidar_m"]
        
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        sharpness = cv2.Laplacian(gray, cv2.CV_64F).var()
        is_sharp = sharpness > MIN_SHARPNESS
        
        if not is_sharp:
            cv2.putText(frame, "FRAME TOO BLURRY - AI PAUSED", (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
            with output_lock: output_frame = frame
            with telemetry_lock:
                ai_telemetry["sharpnessScore"] = int(sharpness)
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
                    
                    # Stage 2: Water Classification
                    if not tracked_classes[cls_name]['water_confirmed']:
                        crop = frame[y1:y2, x1:x2]
                        if crop.size > 0:
                            water_res = water_model(crop, verbose=False)
                            w_conf = water_res[0].probs.top1conf.item() * 100
                            w_label = water_model.names[water_res[0].probs.top1]
                            
                            if "water" in w_label.lower() and w_conf > 50:
                                tracked_classes[cls_name]['water_confirmed'] = True
                                tracked_classes[cls_name]['water_conf'] = w_conf
                    
                    if tracked_classes[cls_name]['water_confirmed']:
                        any_water_confirmed = True
                        cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 255, 0), 3)
                        cv2.putText(annotated_frame, "BREEDING SITE CONFIRMED", (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
                    else:
                        cv2.putText(annotated_frame, "CONFIRMING WATER...", (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 2)

                        def log_to_db(t_type_label, t_conf, lat, lon, lidar, water, session_id, box_area):
                            try:
                                # 3NF Mapping: Get ID for label
                                type_id = TARGET_TYPE_MAP.get(t_type_label.lower())
                                if not type_id:
                                    print(f"[WARN] Unknown target type: {t_type_label}")
                                    return

                                # Primary Record: detections (3NF Unified Table)
                                res = supabase.table("detections").insert({
                                    "session_id": session_id,
                                    "target_type_id": type_id,
                                    "confidence": float(t_conf),
                                    "water_confirmed": water,
                                    "latitude": float(lat),
                                    "longitude": float(lon),
                                    "lidar_m": float(lidar)
                                }).execute()
                                
                                # Store the detection ID in memory to link with potential spray operations
                                if res.data:
                                    tracked_classes[t_type_label]['last_db_id'] = res.data[0]['id']

                            except Exception as e:
                                print(f"[DB ERROR] Detection log failed: {e}")
                                
                        threading.Thread(target=log_to_db, args=(
                            cls_name, conf, cur_lat, cur_lon, cur_lidar, 
                            tracked_classes[cls_name]['water_confirmed'], ACTIVE_SESSION_ID, (x2-x1)*(y2-y1)
                        ), daemon=True).start()
                else:
                    cv2.putText(annotated_frame, f"TRACKING: {elapsed:.1f}s", (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 165, 255), 2)

                # TRIGGER SPRAYER IF LOCKED AND WATER CONFIRMED
                if tracked_classes[cls_name].get('water_confirmed') and not tracked_classes[cls_name].get('sprayed'):
                    tracked_classes[cls_name]['sprayed'] = True
                    sprayer = SimpleSprayer()
                    # Link spray to the specific detection record
                    sprayer.spray((x2-x1)*(y2-y1), tracked_classes[cls_name].get('last_db_id'))

        tracked_classes = {k: v for k, v in tracked_classes.items() if current_time - v['last_seen'] < PRUNE_AFTER}

        pipeline_ms = int((time.time() - start_time) * 1000)
        annotated_frame = cv2.resize(annotated_frame, (640, 480))
        
        with telemetry_lock:
            ai_telemetry["sharpnessScore"] = int(sharpness)
            ai_telemetry["isSharpEnough"] = True
            ai_telemetry["trackingProgress"] = max_progress
            ai_telemetry["waterConfirmed"] = any_water_confirmed
            ai_telemetry["activeTarget"] = active_target_name
            ai_telemetry["totalPipelineSpeedMs"] = pipeline_ms
            
            # Populate active target info for manual GCS trigger
            if any_water_confirmed and active_target_name:
                ai_telemetry["activeDetectionId"] = tracked_classes[active_target_name].get('last_db_id')
                # Area calculation for duration logic
                for box, cls, conf in zip(boxes, clss, confs):
                    if results_main[0].names[int(cls)] == active_target_name:
                        x1, y1, x2, y2 = map(int, box)
                        ai_telemetry["activeTargetArea"] = (x2 - x1) * (y2 - y1)
                        break
            else:
                ai_telemetry["activeDetectionId"] = None
                ai_telemetry["activeTargetArea"] = 0
        if ACTIVE_SESSION_ID and int(current_time) % 1 == 0 and not telemetry_logged_this_sec:
             def log_telemetry_bg(session, sharp, max_prog, confirmed, target, speed, lat, lon, lidar, volt, head):
                 try:
                     # 1. Log AI Performance (3NF Table)
                     supabase.table("ai_performance_logs").insert({
                         "session_id": session,
                         "sharpness_score": sharp,
                         "tracking_progress_percent": max_prog,
                         "pipeline_speed_ms": speed
                     }).execute()

                     # 2. Log Hardware Status (Flight Path)
                     supabase.table("hardware_telemetry").insert({
                         "session_id": session,
                         "latitude": lat,
                         "longitude": lon,
                         "altitude_lidar_m": lidar,
                         "battery_voltage": volt,
                         "heading": head,
                         "is_armed": True
                     }).execute()
                 except Exception as e:
                     pass
             
             threading.Thread(target=log_telemetry_bg, args=(
                 ACTIVE_SESSION_ID, int(sharpness), max_progress, any_water_confirmed, 
                 active_target_name, pipeline_ms, cur_lat, cur_lon, cur_lidar,
                 ai_telemetry["battery_voltage"], ai_telemetry["heading"]
             ), daemon=True).start()
             telemetry_logged_this_sec = True
        elif int(current_time) % 1 != 0:
             telemetry_logged_this_sec = False

        with output_lock:
            output_frame = annotated_frame

if __name__ == "__main__":
    # Fetch 3NF Mapping on Startup
    fetch_target_types()
    
    # Start Telemetry Receiver
    tel_receiver = TelemetryReceiver().start()

    fq = queue.Queue(maxsize=1)
    se = threading.Event()

    t1 = threading.Thread(target=camera_producer, args=(fq, se), daemon=True)
    t1.start()

    t2 = threading.Thread(target=inference_consumer, args=(fq, se), daemon=True)
    t2.start()

    try:
        app.run(host='0.0.0.0', port=5000, threaded=True, debug=False)
    finally:
        tel_receiver.stop()
import os
import sys

# Force unbuffered output for real-time logging
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, line_buffering=True)
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, line_buffering=True)

import cv2
import time
from threading import Thread, Lock, Event
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

ACTIVE_SESSION_ID = None

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = '*'
    return response

# --- Global State & Telemetry ---
global_jpeg_bytes = None
output_lock = Lock()

# This dictionary NOW ONLY holds AI data. Hardware data comes from the new receiver.
ai_telemetry = {
    "sharpnessScore": 0,
    "isSharpEnough": False,
    "trackingProgress": 0,
    "waterConfirmed": False,
    "activeTarget": None,
    "activeDetectionId": None,
    "activeTargetArea": 0,
    "totalPipelineSpeedMs": 0
}
telemetry_lock = Lock()

# --- Dedicated Supabase Background Worker ---
supabase_queue = queue.Queue()

def supabase_worker():
    while True:
        task = supabase_queue.get()
        if task is None: break
        if supabase:
            try:
                supabase.table(task['table']).insert(task['data']).execute()
            except Exception as e:
                print(f"[DB ERROR] {e}")
        supabase_queue.task_done()

Thread(target=supabase_worker, daemon=True).start()

# ====================================================================
# TEAMMATE'S UPDATED TELEMETRY RECEIVER (Cleaned & Integrated)
# ====================================================================
class TelemetryReceiver:
    def __init__(self, port=5005):
        self.port = port
        self.latest_data = {}
        self.lock = Lock()
        self.stopped = False
        
        print(f"[TELEMETRY] Listening for incoming data on port {self.port}...")
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.sock.settimeout(1.0) 
        self.sock.bind(("0.0.0.0", self.port))

    def start(self):
        Thread(target=self.update, args=(), daemon=True).start()
        return self

    def update(self):
        while not self.stopped:
            try:
                data, _ = self.sock.recvfrom(1024)
                with self.lock:
                    self.latest_data = json.loads(data.decode('utf-8'))
            except socket.timeout:
                continue
            except Exception as e:
                pass

    def get_data(self):
        with self.lock:
            return self.latest_data.copy()

    def stop(self):
        self.stopped = True
        self.sock.close()

# Instantiate the new receiver globally
tel_receiver = TelemetryReceiver()

MIN_SHARPNESS = float(os.getenv("MIN_SHARPNESS", "30.0"))
CONFIRM_AFTER = 3.0    
PRUNE_AFTER = 2.0      
MAX_SPRAY_ALTITUDE = 1.0 
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

TARGET_TYPE_MAP = {} 
def fetch_target_types():
    global TARGET_TYPE_MAP
    if not supabase: return
    try:
        res = supabase.table("target_types").select("id, label").execute()
        TARGET_TYPE_MAP = {item['label'].lower(): item['id'] for item in res.data}
    except Exception: pass

# --- Flight Session Endpoints ---
session_detections = 0
session_sprays = 0

@app.route('/api/start_flight', methods=['POST', 'OPTIONS'])
def start_flight():
    if request.method == 'OPTIONS': return '', 200
    global ACTIVE_SESSION_ID, session_detections, session_sprays
    session_detections = 0
    session_sprays = 0
    try:
        res = supabase.table("flight_sessions").insert({"barangay_id": 1, "status": "active"}).execute()
        ACTIVE_SESSION_ID = res.data[0]['id']
        return jsonify({"status": "success", "session_id": ACTIVE_SESSION_ID})
    except Exception: return jsonify({"error": "Failed"}), 500

@app.route('/api/end_flight', methods=['POST', 'OPTIONS'])
def end_flight():
    if request.method == 'OPTIONS': return '', 200
    global ACTIVE_SESSION_ID
    if ACTIVE_SESSION_ID:
        supabase.table("flight_sessions").update({"status": "completed"}).eq("id", ACTIVE_SESSION_ID).execute()
        ACTIVE_SESSION_ID = None
    return jsonify({"status": "success"})

# ====================================================================
# PERFECTLY MERGED API STATUS FOR REACT
# ====================================================================
@app.route('/api/status')
def get_telemetry():
    # 1. Get the raw hardware data from your teammate's clean receiver
    hw_data = tel_receiver.get_data() 
    
    # 2. Get the AI status
    with telemetry_lock:
        ai_data = ai_telemetry.copy()
        
    # 3. Merge them together so React gets both the Gauges AND the AI Lock info
    merged_payload = {**hw_data, **ai_data}
    merged_payload["session_detections"] = session_detections
    merged_payload["session_sprays"] = session_sprays
    
    return jsonify(merged_payload)

@app.route('/api/manual_spray', methods=['POST', 'OPTIONS'])
def manual_spray():
    if request.method == 'OPTIONS': return '', 200
    try:
        sprayer = SimpleSprayer()
        # Grab altitude safely from the new receiver
        cur_alt = tel_receiver.get_data().get("lidar_m", 0.0)
        res = sprayer.spray(20000, None, cur_alt) 
        return jsonify(res)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/video_feed')
@app.route('/camera_feed')
def video_feed():
    def generate():
        global global_jpeg_bytes
        def get_standby_frame():
            frame = (50 * np.ones((480, 640, 3), dtype=np.uint8)).astype(np.uint8)
            cv2.putText(frame, "[WAITING FOR PI STREAM]", (20, 100), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 165, 255), 2)
            ret, jpeg = cv2.imencode('.jpg', frame)
            return jpeg.tobytes() if ret else b''
            
        standby_bytes = get_standby_frame()
        while True:
            with output_lock: current_bytes = global_jpeg_bytes
            bytes_to_send = current_bytes if current_bytes is not None else standby_bytes
            yield (b'--frame\r\n' b'Content-Type: image/jpeg\r\n\r\n' + bytes_to_send + b'\r\n')
            time.sleep(0.04) 
    return Response(generate(), mimetype='multipart/x-mixed-replace; boundary=frame')

class PiSSHManager:
    _instance = None
    _lock = Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(PiSSHManager, cls).__new__(cls)
                cls._instance.ssh = None
                # Ensures it strictly looks for Tailscale VPN IP
                cls._instance.pi_ip = os.getenv("PI_IP", "100.127.53.123")
                cls._instance.username = os.getenv("PI_USERNAME", "rpi3408")
                cls._instance.password = os.getenv("PI_PASSWORD", "rpi3408")
            return cls._instance

    def get_connection(self):
        with self._lock:
            if self.ssh is not None:
                try:
                    if self.ssh.get_transport() and self.ssh.get_transport().is_active():
                        return self.ssh
                except Exception: pass
            
            self.ssh = paramiko.SSHClient()
            self.ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            try:
                self.ssh.connect(self.pi_ip, username=self.username, password=self.password, timeout=5)
                return self.ssh
            except Exception as e:
                print(f"[ERROR] SSH Connection failed to {self.pi_ip}: {e}")
                self.ssh = None
                return None

    def execute(self, command):
        client = self.get_connection()
        if client:
            try:
                client.exec_command(command)
                return True
            except Exception: self.ssh = None 
        return False

# ====================================================================
# THE SPRAYER FIX: REAL PWM SIGNAL INSTEAD OF DIGITAL HIGH
# ====================================================================
class SimpleSprayer:
    def __init__(self):
        self.manager = PiSSHManager()

    def spray(self, area, detection_id=None, altitude=0.0):
        global ACTIVE_SESSION_ID, session_sprays
        
        # Bypass gatekeeper if altitude is 0 (for testing without drone flying)
        if altitude > MAX_SPRAY_ALTITUDE:
            return {"error": "Too high to spray", "altitude": altitude}

        true_area = area * (altitude ** 2) if altitude > 0.05 else area
        if true_area < 2500: duration = 5
        elif true_area < 7500: duration = 10
        else: duration = 15

        # THIS IS THE MAGIC FIX: A proper Python PWM script sent directly to the Pi.
        # It sets up 50Hz PWM, rotates the servo to 90 degrees (Duty Cycle 7.5),
        # waits for the spray duration, then rotates back to 0 degrees (Duty Cycle 2.5) and cleanly exits.
        pwm_script = f"""import RPi.GPIO as G, time; G.setwarnings(False); G.setmode(G.BCM); G.setup(18, G.OUT); p=G.PWM(18, 50); p.start(0); p.ChangeDutyCycle(7.5); time.sleep({duration}); p.ChangeDutyCycle(2.5); time.sleep(0.5); p.stop(); G.cleanup()"""
        cmd = f"""nohup python3 -c "{pwm_script}" > /dev/null 2>&1 &"""
        
        if self.manager.execute(cmd):
            print(f"[ACTION] Servo Rotated via PWM for {duration}s")
            session_sprays += 1
            if ACTIVE_SESSION_ID:
                supabase_queue.put({
                    "table": "spray_operations",
                    "data": {"detection_id": detection_id, "trigger_type": "Manual" if area == 20000 else "Auto", "duration_seconds": duration, "target_area_pixels": float(area)}
                })
            return {"status": "success", "duration": duration}
        else:
            return {"error": "SSH command failed. Check PI_IP in .env"}

def camera_producer(frame_queue, stop_event):
    udp_stream_url = "udp://@0.0.0.0:5600?overrun_nonfatal=1&fifo_size=500000&buffer_size=1024000"
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
    global global_jpeg_bytes, tracked_classes, ACTIVE_SESSION_ID, session_detections
    
    base_dir = os.path.dirname(__file__)
    main_model_path = os.path.join(base_dir, "main_classifier.pt")
    water_model_path = os.path.join(base_dir, "water_classifier.pt")
    
    if not os.path.exists(main_model_path):
        while not stop_event.is_set():
            if not frame_queue.empty():
                frame = frame_queue.get()
                ret, jpeg = cv2.imencode('.jpg', cv2.resize(frame, (640, 480)), [int(cv2.IMWRITE_JPEG_QUALITY), 60])
                if ret:
                    with output_lock: global_jpeg_bytes = jpeg.tobytes()
            time.sleep(0.1)
        return

    main_model = YOLO(main_model_path)
    water_model = YOLO(water_model_path)
    validator = StreamValidator()
    
    telemetry_logged_this_sec = False

    while not stop_event.is_set():
        if frame_queue.empty():
            time.sleep(0.01)
            continue
            
        frame = frame_queue.get()
        start_time = time.time()
        current_time = time.time()
        
        # PULL FROM TEAMMATE'S RECEIVER INSTEAD OF OLD GLOBAL
        hw_data = tel_receiver.get_data()
        cur_lat = hw_data.get("gps_lat", 0.0)
        cur_lon = hw_data.get("gps_lon", 0.0)
        cur_lidar = hw_data.get("lidar_m", 0.0)
        
        is_reliable, status_msg = validator.check_frame_reliability(frame)
        if not is_reliable:
            ret, jpeg = cv2.imencode('.jpg', cv2.resize(frame, (640, 480)), [int(cv2.IMWRITE_JPEG_QUALITY), 60])
            if ret:
                with output_lock: global_jpeg_bytes = jpeg.tobytes()
            
            with telemetry_lock:
                ai_telemetry["isSharpEnough"] = False
                ai_telemetry["waterConfirmed"] = False
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
                else: tracked_classes[cls_name]['last_seen'] = current_time

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
                            if "water" in water_model.names[water_res[0].probs.top1].lower() and w_conf > 50:
                                tracked_classes[cls_name]['water_confirmed'] = True
                    
                    if tracked_classes[cls_name]['water_confirmed']:
                        any_water_confirmed = True
                        cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 255, 0), 3)
                        
                        if not tracked_classes[cls_name]['db_logged'] and ACTIVE_SESSION_ID:
                            tracked_classes[cls_name]['db_logged'] = True
                            if type_id := TARGET_TYPE_MAP.get(cls_name.lower()):
                                supabase_queue.put({"table": "detections", "data": {"session_id": ACTIVE_SESSION_ID, "target_type_id": type_id, "confidence": float(conf), "water_confirmed": True, "latitude": float(cur_lat), "longitude": float(cur_lon), "lidar_m": float(cur_lidar)}})
                                session_detections += 1

                if tracked_classes[cls_name].get('water_confirmed') and not tracked_classes[cls_name].get('sprayed'):
                    tracked_classes[cls_name]['sprayed'] = True
                    sprayer = SimpleSprayer()
                    sprayer.spray((x2-x1)*(y2-y1), None, cur_lidar)

        tracked_classes = {k: v for k, v in tracked_classes.items() if current_time - v['last_seen'] < PRUNE_AFTER}
        pipeline_ms = int((time.time() - start_time) * 1000)
        
        with telemetry_lock:
            ai_telemetry.update({"isSharpEnough": True, "trackingProgress": max_progress, "waterConfirmed": any_water_confirmed, "activeTarget": active_target_name, "totalPipelineSpeedMs": pipeline_ms})

        if ACTIVE_SESSION_ID and int(current_time) % 1 == 0 and not telemetry_logged_this_sec:
            supabase_queue.put({"table": "ai_performance_logs", "data": {"session_id": ACTIVE_SESSION_ID, "sharpness_score": 50, "tracking_progress_percent": max_progress, "pipeline_speed_ms": pipeline_ms}})
            telemetry_logged_this_sec = True
        elif int(current_time) % 1 != 0: telemetry_logged_this_sec = False
            
        ret, jpeg = cv2.imencode('.jpg', cv2.resize(annotated_frame, (640, 480)), [int(cv2.IMWRITE_JPEG_QUALITY), 60])
        if ret:
            with output_lock: global_jpeg_bytes = jpeg.tobytes()

if __name__ == "__main__":
    fetch_target_types()
    # START THE NEW RECEIVER
    tel_receiver.start()
    
    fq, se = queue.Queue(maxsize=1), Event()
    Thread(target=camera_producer, args=(fq, se), daemon=True).start()
    Thread(target=inference_consumer, args=(fq, se), daemon=True).start()
    try: 
        app.run(host='0.0.0.0', port=5000, threaded=True, debug=False)
    finally: 
        tel_receiver.stop()
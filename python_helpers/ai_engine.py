import os
import cv2
import time
import threading
import paramiko
import numpy as np
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
    "totalPipelineSpeedMs": 0
}
telemetry_lock = threading.Lock()

MIN_SHARPNESS = float(os.getenv("MIN_SHARPNESS", "30.0"))
CONFIRM_AFTER = 5.0    # 5 seconds of continuous tracking
PRUNE_AFTER = 2.0      # Drop target if unseen for 2 seconds
tracked_classes = {}   

# --- Flight Session Endpoints ---
@app.route('/api/start_flight', methods=['POST', 'OPTIONS'])
def start_flight():
    if request.method == 'OPTIONS':
        return '', 200
    global ACTIVE_SESSION_ID
    if not supabase:
        return jsonify({"error": "Supabase not initialized"}), 500
    data = {"location_id": 1, "status": "active"}
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

    def spray(self, area, obj_id):
        global ACTIVE_SESSION_ID
        duration = 2 if area < 5000 else 4 if area < 15000 else 6
        trigger_type = "Manual" if area == 20000 else "Auto"
        
        cmd = f"raspi-gpio set 18 dh && sleep {duration} && raspi-gpio set 18 dl"
        try: 
            self.ssh.exec_command(f"nohup {cmd} > /dev/null 2>&1 &")
            print(f"[ACTION] Triggered spray for {duration} seconds.")
            
            if ACTIVE_SESSION_ID:
                def log_spray():
                    try:
                        supabase.table("spray_logs").insert({
                            "session_id": ACTIVE_SESSION_ID,
                            "trigger_type": trigger_type,
                            "target_area": area,
                            "spray_duration_seconds": duration
                        }).execute()
                    except Exception as e:
                        print(f"[DB ERROR] Failed to log spray: {e}")
                threading.Thread(target=log_spray, daemon=True).start()
                    
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
    main_model_path = os.path.join(base_dir, "main_classifier.pt")
    
    if not os.path.exists(main_model_path):
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
    print("[INFO] AI Engine Ready.")
    
    telemetry_logged_this_sec = False

    while not stop_event.is_set():
        if frame_queue.empty():
            time.sleep(0.01)
            continue
            
        frame = frame_queue.get()
        start_time = time.time()
        current_time = time.time()
        
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

        if results_main[0].boxes is not None and len(results_main[0].boxes) > 0:
            boxes = results_main[0].boxes.xyxy.cpu().numpy()
            clss = results_main[0].boxes.cls.cpu().numpy()
            confs = results_main[0].boxes.conf.cpu().numpy() 

            for box, cls, conf in zip(boxes, clss, confs):
                cls_name = results_main[0].names[int(cls)]
                
                if cls_name not in tracked_classes:
                    tracked_classes[cls_name] = {'first_seen': current_time, 'last_seen': current_time, 'db_logged': False}
                else:
                    tracked_classes[cls_name]['last_seen'] = current_time

                elapsed = current_time - tracked_classes[cls_name]['first_seen']
                progress = min(100, int((elapsed / CONFIRM_AFTER) * 100))
                max_progress = max(max_progress, progress)
                
                x1, y1, x2, y2 = map(int, box)

                cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (255, 100, 0), 2) 
                cv2.putText(annotated_frame, f"{cls_name} {conf:.2f}", (x1, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 100, 0), 2)

                offset = 6 
                
                if elapsed >= CONFIRM_AFTER:
                    active_target_name = cls_name
                    cv2.rectangle(annotated_frame, (x1 - offset, y1 - offset), (x2 + offset, y2 + offset), (0, 255, 0), 3)
                    cv2.putText(annotated_frame, "TARGET LOCKED", (x1 - offset, y2 + offset + 15), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
                    
                    if not tracked_classes[cls_name].get('db_logged') and ACTIVE_SESSION_ID:
                        w, h = x2 - x1, y2 - y1
                        area = float(w * h)
                        tracked_classes[cls_name]['db_logged'] = True
                        
                        def log_detection(session, t_class, b_area):
                            try:
                                supabase.table("target_detections").insert({
                                    "session_id": session,
                                    "target_class": t_class,
                                    "bounding_box_area": b_area
                                }).execute()
                            except Exception as e:
                                pass
                                
                        threading.Thread(target=log_detection, args=(ACTIVE_SESSION_ID, active_target_name, area), daemon=True).start()
                else:
                    cv2.rectangle(annotated_frame, (x1 - offset, y1 - offset), (x2 + offset, y2 + offset), (0, 165, 255), 2)
                    cv2.putText(annotated_frame, f"TRACKING: {elapsed:.1f}s", (x1 - offset, y2 + offset + 15), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 165, 255), 2)

        tracked_classes = {k: v for k, v in tracked_classes.items() if current_time - v['last_seen'] < PRUNE_AFTER}
        any_confirmed = any((current_time - obj['first_seen']) >= CONFIRM_AFTER for obj in tracked_classes.values())

        pipeline_ms = int((time.time() - start_time) * 1000)
        annotated_frame = cv2.resize(annotated_frame, (640, 480))
        
        with telemetry_lock:
            ai_telemetry["sharpnessScore"] = int(sharpness)
            ai_telemetry["isSharpEnough"] = True
            ai_telemetry["trackingProgress"] = max_progress
            ai_telemetry["waterConfirmed"] = any_confirmed
            ai_telemetry["activeTarget"] = active_target_name
            ai_telemetry["totalPipelineSpeedMs"] = pipeline_ms

        if ACTIVE_SESSION_ID and int(current_time) % 1 == 0 and not telemetry_logged_this_sec:
             def log_telemetry(session, sharp, max_prog, confirmed, target, speed):
                 try:
                     supabase.table("ai_telemetry").insert({
                         "session_id": session,
                         "sharpness_score": sharp,
                         "is_sharp_enough": True,
                         "tracking_progress_percent": max_prog,
                         "water_confirmed": confirmed,
                         "active_target": target,
                         "pipeline_speed_ms": speed
                     }).execute()
                 except Exception:
                     pass
             
             threading.Thread(target=log_telemetry, args=(ACTIVE_SESSION_ID, int(sharpness), max_progress, any_confirmed, active_target_name, pipeline_ms), daemon=True).start()
             telemetry_logged_this_sec = True
        elif int(current_time) % 1 != 0:
             telemetry_logged_this_sec = False

        with output_lock:
            output_frame = annotated_frame

if __name__ == "__main__":
    fq = queue.Queue(maxsize=1)
    se = threading.Event()
    
    t1 = threading.Thread(target=camera_producer, args=(fq, se), daemon=True)
    t1.start()
    
    t2 = threading.Thread(target=inference_consumer, args=(fq, se), daemon=True)
    t2.start()
    
    app.run(host='0.0.0.0', port=5000, threaded=True, debug=False)
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

app = Flask(__name__)

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

MIN_SHARPNESS = 100.0
CONFIRM_AFTER = 5.0    # 5 seconds of continuous tracking
PRUNE_AFTER = 2.0      # Drop target if unseen for 2 seconds
tracked_objects = {}   # Stores ID tracking timers

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
        # Passing an area of 20000 ensures it gets the max duration (6 seconds) based on your logic
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
                # Fallback blank frame if None
                if output_frame is None:
                    frame = (50 * np.ones((480, 640, 3), dtype=np.uint8)).astype(np.uint8)
                    cv2.putText(frame, "[WAITING FOR PI STREAM]", (20, 100), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 165, 255), 2)
                else:
                    frame = output_frame
                    
            ret, jpeg = cv2.imencode('.jpg', frame)
            if ret:
                yield (b'--frame\r\n' b'Content-Type: image/jpeg\r\n\r\n' + jpeg.tobytes() + b'\r\n')
            time.sleep(0.04)
    return Response(generate(), mimetype='multipart/x-mixed-replace; boundary=frame')

class SimpleSprayer:
    def __init__(self):
        self.ssh = paramiko.SSHClient()
        self.ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        try:
            self.ssh.connect("100.127.53.123", username="rpi3408", password="rpi3408", timeout=3)
        except Exception as e: 
            print(f"[WARN] Sprayer SSH failed: {e}")

    def spray(self, area, obj_id):
        duration = 2 if area < 5000 else 4 if area < 15000 else 6
        cmd = f"raspi-gpio set 18 op dl && raspi-gpio set 18 dh && sleep {duration} && raspi-gpio set 18 dl"
        try: 
            self.ssh.exec_command(f"nohup {cmd} > /dev/null 2>&1 &")
            print(f"[ACTION] Triggered spray for {duration} seconds.")
        except Exception as e: 
            print(f"[ERROR] Failed to execute spray command: {e}")

def camera_producer(frame_queue, stop_event):
    # ADDED: buffer_size=1024000 to prevent UDP packet drops causing decode errors
    udp_stream_url = "udp://@0.0.0.0:5600?overrun_nonfatal=1&fifo_size=50000&buffer_size=1024000"
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
                last_frame_time = time.time()
            continue
        
        last_frame_time = time.time()
        if frame_queue.full():
            frame_queue.get_nowait()
        frame_queue.put(frame)
        
    cap.release()

def inference_consumer(frame_queue, stop_event):
    global output_frame, tracked_objects
    sprayer = SimpleSprayer()
    
    base_dir = os.path.dirname(__file__)
    main_model_path = os.path.join(base_dir, "main_classifier.pt")
    water_model_path = os.path.join(base_dir, "water_classifier.pt")
    
    # Simple check to avoid crashing if models aren't present yet
    if not os.path.exists(main_model_path) or not os.path.exists(water_model_path):
        print("[WARNING] Model files not found! AI won't run properly until they are placed in the same directory.")
        # Fallback to just passing the frame through if models are missing
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
    print("[INFO] AI Engine Ready.")
    
    while not stop_event.is_set():
        if frame_queue.empty():
            time.sleep(0.01)
            continue
            
        frame = frame_queue.get()
        start_time = time.time()
        
        # 1. Sharpness Calculation
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

        # 2. Run Models
        results_main = main_model.track(frame, imgsz=416, conf=0.25, verbose=False, persist=True)
        results_water = water_model(frame, verbose=False)
        
        annotated_frame = results_main[0].plot()
        current_time = time.time()
        max_progress = 0
        any_confirmed = False
        active_target_name = None

        # 3. Tracking & 5-Second Timer Logic
        if results_main[0].boxes is not None and results_main[0].boxes.id is not None:
            boxes = results_main[0].boxes.xyxy.cpu().numpy()
            track_ids = results_main[0].boxes.id.cpu().numpy()
            clss = results_main[0].boxes.cls.cpu().numpy()

            for box, t_id, cls in zip(boxes, track_ids, clss):
                t_id = int(t_id)
                
                # Register new target or update last seen
                if t_id not in tracked_objects:
                    tracked_objects[t_id] = {'first_seen': current_time, 'last_seen': current_time}
                else:
                    tracked_objects[t_id]['last_seen'] = current_time

                elapsed = current_time - tracked_objects[t_id]['first_seen']
                progress = min(100, int((elapsed / CONFIRM_AFTER) * 100))
                max_progress = max(max_progress, progress)
                
                x1, y1, x2, y2 = map(int, box)

                if elapsed >= CONFIRM_AFTER:
                    any_confirmed = True
                    active_target_name = results_main[0].names[int(cls)]
                    
                    # Override YOLO box with a THICK GREEN LOCK BOX
                    cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 255, 0), 4)
                    cv2.putText(annotated_frame, "TARGET LOCKED", (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                    
                    # Optional: Auto-trigger sprayer here if desired
                    # w, h = x2-x1, y2-y1
                    # sprayer.spray(float(w*h), t_id)
                else:
                    cv2.putText(annotated_frame, f"TRACKING: {elapsed:.1f}s", (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 165, 255), 2)

        # 4. Prune Lost Targets
        tracked_objects = {k: v for k, v in tracked_objects.items() if current_time - v['last_seen'] < PRUNE_AFTER}

        # 5. Update Telemetry for React App
        pipeline_ms = int((time.time() - start_time) * 1000)
        with telemetry_lock:
            ai_telemetry["sharpnessScore"] = int(sharpness)
            ai_telemetry["isSharpEnough"] = True
            ai_telemetry["trackingProgress"] = max_progress
            ai_telemetry["waterConfirmed"] = any_confirmed
            ai_telemetry["activeTarget"] = active_target_name
            ai_telemetry["totalPipelineSpeedMs"] = pipeline_ms

        with output_lock:
            output_frame = annotated_frame

if __name__ == "__main__":
    fq = queue.Queue(maxsize=1)
    se = threading.Event()
    
    t1 = threading.Thread(target=camera_producer, args=(fq, se), daemon=True)
    t1.start()
    
    t2 = threading.Thread(target=inference_consumer, args=(fq, se), daemon=True)
    t2.start()
    
    # Binds to 0.0.0.0 so Tailscale can access it on port 5000
    app.run(host='0.0.0.0', port=5000, threaded=True, debug=False)
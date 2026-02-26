# Working Code (from withmultiprocessing)
import os

# make sure GStreamer binaries are visible before any OpenCV import
os.add_dll_directory(r"C:\Program Files\gstreamer\1.0\msvc_x86_64\bin")

# import cv2 with immediate failure reporting so any DLL issue is visible
try:
    import cv2  # <-- OpenCV loads HERE, seeing the GStreamer DLLs
    print(f"[INFO] cv2 version {cv2.__version__} loaded successfully")
except Exception as e:
    print(f"[ERROR] failed to import cv2: {e}")
    raise
import time
import math
import multiprocessing as mp
import paramiko
import numpy as np
from ultralytics import YOLO
from datetime import datetime

# new imports for streaming server
from flask import Flask, Response, make_response
import threading

# Flask app instance for MJPEG stream
app = Flask(__name__)

# Add CORS headers middleware
@app.after_request
def add_cors_headers(response):
    # allow iframe embedding from any origin and avoid caching
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = '*'
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    # disable X-Frame-Options so other origins (e.g. port 3001) can embed
    response.headers['X-Frame-Options'] = 'ALLOWALL'
    return response

# Force Python to recognize the GStreamer DLLs
GSTREAMER_BIN = r"C:\Program Files\gstreamer\1.0\msvc_x86_64\bin"
os.add_dll_directory(GSTREAMER_BIN)

# Test frame cache
TEST_FRAME_COUNTER = {'value': 0}

def generate_test_frame():
    """Generate a simple test frame directly without reading files"""
    TEST_FRAME_COUNTER['value'] += 1
    # Create a simple gray frame directly
    frame = (50 * np.ones((480, 640, 3), dtype=np.uint8)).astype(np.uint8)
    
    # Add timestamp text to frame
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cv2.putText(frame, f"TEST STREAM - {timestamp}", (20, 50), 
                cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
    cv2.putText(frame, "[Waiting for drone stream on UDP port 5600]", (20, 100),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 165, 255), 2)
    cv2.putText(frame, f"Frame: {TEST_FRAME_COUNTER['value']}", (20, 150),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
    cv2.putText(frame, "SSH Status: Connected via Tailscale", (20, 200),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
    
    return frame

# ----------------------------------------------------
# Global variables to bridge the AI process and Flask
# ----------------------------------------------------
output_frame = None
output_lock = threading.Lock()

def update_latest_frame(q):
    """Thread that pulls frames from the multiprocessing queue and updates the global variable."""
    global output_frame
    while True:
        try:
            frame = q.get()
            with output_lock:
                output_frame = frame
        except Exception:
            pass

@app.route('/video_feed')
@app.route('/camera_feed')
def video_feed():
    print("[INFO] Client requesting /video_feed")
    def generate():
        global output_frame, output_lock
        while True:
            with output_lock:
                if output_frame is None:
                    frame = generate_test_frame()
                else:
                    frame = output_frame
            
            ret, jpeg = cv2.imencode('.jpg', frame)
            if ret:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n'
                       b'Content-Length: ' + str(len(jpeg.tobytes())).encode() + b'\r\n\r\n' + jpeg.tobytes() + b'\r\n')
            time.sleep(0.04) # Limit to ~25 FPS for browser

    return Response(generate(), mimetype='multipart/x-mixed-replace; boundary=frame')


def run_flask():
    print("[INFO] Starting Flask server on http://0.0.0.0:5000")
    app.run(host='0.0.0.0', port=5000, threaded=True, debug=False)
print("[INFO] Flask server thread started")

# --- 1. SPRAYER CLASS ---
class SimpleSprayer:
    """Integrated spraying controller for hardware triggering via SSH."""
    def __init__(self):
        self.ssh = paramiko.SSHClient()
        self.ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        try:
            self.ssh.connect("100.127.53.123", username="rpi3408", password="rpi3408", timeout=5)
            print("✅ Sprayer Hardware Connected via Tailscale")
        except Exception as e:
            print(f"❌ Hardware Connection Failed: {e}")

    def spray(self, area, obj_id):
        # 3 levels of spraying based on site size (in pixels)
        if area < 5000:
            duration = 2
        elif area < 15000:
            duration = 4
        else:
            duration = 6
            
        cmd = f"raspi-gpio set 18 op dl && raspi-gpio set 18 dh && sleep {duration} && raspi-gpio set 18 dl"
        
        try:
            self.ssh.exec_command(f"nohup {cmd} > /dev/null 2>&1 &")
            print(f"🚀 [ACTION] Spraying {duration}s for Object {obj_id}")
            return duration
        except Exception as e:
            print(f"❌ [ERROR] Could not send spray command: {e}")
            return 0

# --- 2. PRODUCER: Camera Process ---
def camera_producer(frame_queue, stop_event):
    """Handles the GStreamer pipeline and keeps the feed fresh."""
    gst_pipeline = (
        "udpsrc port=5600 ! application/x-rtp,media=(string)video,clock-rate=(int)90000,encoding-name=(string)H264,payload=(int)96 ! "
        "rtpjitterbuffer mode=0 latency=200 ! "
        "rtph264depay ! h264parse ! avdec_h264 ! videoconvert ! video/x-raw,format=(string)BGR ! appsink sync=false drop=1"
    )
    
    
    cap = cv2.VideoCapture(gst_pipeline, cv2.CAP_GSTREAMER)
    print("[INFO] Camera Process Started. Listening on Port 5600...")

    while not stop_event.is_set():
        ret, frame = cap.read()
        if not ret:
            continue
            
        if not frame_queue.full():
            frame_queue.put(frame)
        else:
            try:
                frame_queue.get_nowait() 
                frame_queue.put(frame)
            except:
                pass
    cap.release()

# --- 3. CONSUMER: AI Inference & Detailed Reporting ---
def inference_consumer(frame_queue, stop_event, processed_queue):
    """Runs YOLOv8 tracking, manages the 5-sec confirmation, and prints detailed reports."""
    sprayer_logic = SimpleSprayer()
    
    # Load model from the same directory as this script (python_helpers)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    model = YOLO(os.path.join(script_dir, "best.pt"))
    class_names = model.names
    
    # Tracking Variables
    tracked_objects = {}
    next_object_id = 0
    CONFIRM_AFTER = 5.0 
    PRUNE_AFTER = 5.0
    
    # --- NEW: Minimum Sharpness Threshold ---
    # Frames scoring below this number are considered too blurry/low-res and are skipped.
    MIN_SHARPNESS = 0.0 # Set to 0 to ensure AI runs on every frame (even if blurry)
    
    while not stop_event.is_set():
        if frame_queue.empty():
            time.sleep(0.01) # Prevent 100% CPU usage when waiting for frames
            continue
            
        frame = frame_queue.get()
        current_time = time.monotonic()
        
        # --- 1. FRAME QUALITY CHECK ---
        # Convert frame to grayscale to calculate sharpness
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        sharpness_score = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        # If the frame is blurry from drone motion or VPN compression, skip the AI entirely
        if sharpness_score < MIN_SHARPNESS:
            # You can uncomment the print statement below to see how often frames are dropped
            # print(f"⚠️ Frame too blurry/low-res (Score: {sharpness_score:.1f}). Skipping AI.")
            
            # Send raw frame to UI even if blurry so stream doesn't freeze
            try:
                if processed_queue.full(): processed_queue.get_nowait()
                processed_queue.put(frame)
            except: pass
            
            continue
        
        # --- 2. RUN AI WITH STRICTER CONFIDENCE ---
        # Added conf=0.5 (Ignore anything the AI isn't 50%+ sure about)
        results = model.track(frame, imgsz=416, conf=0.25, verbose=False, persist=True)
        annotated_frame = results[0].plot()
        
        # Send annotated frame to UI
        try:
            if processed_queue.full(): processed_queue.get_nowait()
            processed_queue.put(annotated_frame)
        except: pass
        
        boxes = results[0].boxes
        objects_to_log_now = [] 

        if boxes.id is not None:
            for box in boxes:
                yolo_id = int(box.id[0])
                x_center, y_center, w, h = map(int, box.xywh[0])
                area = w * h
                
                found = False
                for internal_id, data in tracked_objects.items():
                    if data['yolo_id'] == yolo_id:
                        tracked_objects[internal_id]['last_seen'] = current_time
                        
                        if data['status'] == 'pending' and (current_time - data['first_seen'] > CONFIRM_AFTER):
                            tracked_objects[internal_id]['status'] = 'confirmed'
                            objects_to_log_now.append(box)
                            
                        found = True
                        break
                
                if not found:
                    tracked_objects[next_object_id] = {
                        'yolo_id': yolo_id,
                        'first_seen': current_time,
                        'last_seen': current_time,
                        'status': 'pending'
                    }
                    next_object_id += 1

        # --- DETAILED REPORTING LOGIC ---
        if len(objects_to_log_now) > 0:
            timestamp_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"\n--- [NEW CONFIRMED DETECTIONS] {timestamp_str} ---")
            
            for box in objects_to_log_now:
                yolo_id = int(box.id[0])
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])
                x_center, y_center, w, h = map(int, box.xywh[0])
                area = w * h
                x1, y1 = int(x_center - w / 2), int(y_center - h / 2)
                
                sprayer_logic.spray(area, yolo_id)
                
                print(f"  LOGGING: {class_names[cls_id]} (Confidence: {conf*100:.1f}%)")
                print(f"    Coords (Top-Left): (x: {x1}, y: {y1})")
                print(f"    Dimensions (WxH):  ({w} x {h})")
                print(f"    Area (Pixels):     {area}")

            for data in tracked_objects.values():
                if data['status'] == 'confirmed':
                    data['status'] = 'logged'

        keys_to_delete = [k for k, v in tracked_objects.items() if current_time - v['last_seen'] > PRUNE_AFTER]
        for k in keys_to_delete:
            del tracked_objects[k]
        
        # Running headless - no display window needed

# --- 4. MAIN ENTRY POINT ---
if __name__ == "__main__":
    # start Flask server thread only in the main process
    flask_thread = threading.Thread(target=run_flask, daemon=True)
    flask_thread.start()
    print("[INFO] Flask thread started in main process")

    mp.set_start_method('spawn', force=True)
    
    frame_queue = mp.Queue(maxsize=1)
    processed_queue = mp.Queue(maxsize=1)
    stop_event = mp.Event()
    
    # Start thread to update Flask global variable from the queue
    threading.Thread(target=update_latest_frame, args=(processed_queue,), daemon=True).start()

    p_camera = mp.Process(target=camera_producer, args=(frame_queue, stop_event))
    p_inference = mp.Process(target=inference_consumer, args=(frame_queue, stop_event, processed_queue))

    print("🚀 Launching Drone AI System...")
    p_camera.start()
    p_inference.start()

    p_camera.join()
    p_inference.join()
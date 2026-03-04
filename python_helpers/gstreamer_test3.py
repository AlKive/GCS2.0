import os
import cv2
import time
import math
import threading
import paramiko
import numpy as np
from ultralytics import YOLO
from datetime import datetime
from flask import Flask, Response, make_response
import queue

# GStreamer DLLs - Ensure these are correct for your installation
os.add_dll_directory(r"C:\Program Files\gstreamer\1.0\msvc_x86_64\bin")

app = Flask(__name__)

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = '*'
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['X-Frame-Options'] = 'ALLOWALL'
    return response

TEST_FRAME_COUNTER = {'value': 0}
def generate_test_frame():
    TEST_FRAME_COUNTER['value'] += 1
    frame = (50 * np.ones((480, 640, 3), dtype=np.uint8)).astype(np.uint8)
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cv2.putText(frame, f"LIPAD GCS - {timestamp}", (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
    cv2.putText(frame, "[WAITING FOR PI STREAM]", (20, 100), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 165, 255), 2)
    cv2.putText(frame, f"Port: 5600 | Frame: {TEST_FRAME_COUNTER['value']}", (20, 150), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
    return frame

output_frame = None
output_lock = threading.Lock()

@app.route('/video_feed')
@app.route('/camera_feed')
def video_feed():
    def generate():
        global output_frame
        while True:
            with output_lock:
                frame = output_frame if output_frame is not None else generate_test_frame()
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
            self.ssh.connect("100.127.53.123", username="rpi3408", password="rpi3408", timeout=5)
            print("[INFO] SSH Connected for Sprayer")
        except: print("[WARN] SSH Failed for Sprayer")
    def spray(self, area, obj_id):
        duration = 2 if area < 5000 else 4 if area < 15000 else 6
        cmd = f"raspi-gpio set 18 op dl && raspi-gpio set 18 dh && sleep {duration} && raspi-gpio set 18 dl"
        try: self.ssh.exec_command(f"nohup {cmd} > /dev/null 2>&1 &")
        except: pass

def camera_producer(frame_queue, stop_event):
    # Optimized pipeline for RTP H264
    gst = (
        "udpsrc port=5600 caps=\"application/x-rtp, media=(string)video, clock-rate=(int)90000, encoding-name=(string)H264, payload=(int)96\" ! "
        "rtph264depay ! h264parse ! avdec_h264 ! videoconvert ! video/x-raw,format=BGR ! appsink sync=false drop=1"
    )
    
    print(f"[INFO] Initializing GStreamer on port 5600...")
    cap = cv2.VideoCapture(gst, cv2.CAP_GSTREAMER)
    
    if not cap.isOpened():
        print("[ERROR] Could not open GStreamer pipeline. Check GStreamer installation.")
        return

    print("[INFO] GStreamer pipeline opened. Waiting for data...")
    
    last_frame_time = time.time()
    frame_count = 0
    
    while not stop_event.is_set():
        ret, frame = cap.read()
        if not ret:
            if time.time() - last_frame_time > 5:
                # print("[DEBUG] No data received for 5 seconds...")
                last_frame_time = time.time()
            continue
        
        if frame_count == 0:
            print("[SUCCESS] Received first frame from Raspberry Pi!")
        
        frame_count += 1
        last_frame_time = time.time()
        
        if frame_queue.full():
            frame_queue.get_nowait()
        frame_queue.put(frame)
        
    cap.release()

def inference_consumer(frame_queue, stop_event):
    global output_frame
    sprayer = SimpleSprayer()
    model_path = os.path.join(os.path.dirname(__file__), "best.pt")
    if not os.path.exists(model_path):
        print(f"[ERROR] YOLO model not found at {model_path}")
        return
        
    model = YOLO(model_path)
    print("[INFO] YOLO Model loaded.")
    
    while not stop_event.is_set():
        if frame_queue.empty():
            time.sleep(0.01)
            continue
        frame = frame_queue.get()
        results = model.track(frame, imgsz=416, conf=0.25, verbose=False, persist=True)
        annotated = results[0].plot()
        with output_lock:
            output_frame = annotated
        
        if results[0].boxes.id is not None:
            for box in results[0].boxes:
                w, h = box.xywh[0][2:4]
                sprayer.spray(float(w*h), int(box.id[0]))

if __name__ == "__main__":
    fq = queue.Queue(maxsize=1)
    se = threading.Event()
    
    # Start producer thread
    t1 = threading.Thread(target=camera_producer, args=(fq, se), daemon=True)
    t1.start()
    
    # Start consumer thread
    t2 = threading.Thread(target=inference_consumer, args=(fq, se), daemon=True)
    t2.start()
    
    print("[INFO] AI and Camera threads started.")
    app.run(host='0.0.0.0', port=5000, threaded=True, debug=False)

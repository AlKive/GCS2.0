import os
import sys
import io

# Force unbuffered output for real-time logging
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', line_buffering=True)
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', line_buffering=True)

import paramiko
import time
import socket
import sys
import json
import urllib.request
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv(override=False)

# === Configuration ===
env_ips = os.getenv("PI_IPS")
primary_pi_ip = os.getenv("PI_IP")
PI_TARGET_IPS = env_ips.split(",") if env_ips else ["192.168.7.2", "raspberrypi.local", "100.127.53.123"]

if primary_pi_ip and primary_pi_ip not in PI_TARGET_IPS:
    PI_TARGET_IPS.insert(0, primary_pi_ip)
elif primary_pi_ip and primary_pi_ip in PI_TARGET_IPS:
    PI_TARGET_IPS.remove(primary_pi_ip)
    PI_TARGET_IPS.insert(0, primary_pi_ip)
USERNAME = os.getenv("PI_USERNAME", "rpi3408")
PASSWORD = os.getenv("PI_PASSWORD", "rpi3408")
STREAM_PORT = 5600
AI_ENGINE_URL = "http://localhost:5000"

# --- Supabase Setup ---
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
ACTIVE_SESSION_ID = os.getenv("ACTIVE_SESSION_ID")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("[ERROR] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def start_flight_session():
    global ACTIVE_SESSION_ID
    try:
        if ACTIVE_SESSION_ID:
            sync_data = json.dumps({"session_id": ACTIVE_SESSION_ID}).encode('utf-8')
            req = urllib.request.Request(f"{AI_ENGINE_URL}/api/set_session", data=sync_data, headers={'Content-Type': 'application/json'})
            try: urllib.request.urlopen(req)
            except: pass
            return ACTIVE_SESSION_ID

        data = {"barangay_id": 1, "status": "active", "start_time": datetime.utcnow().isoformat()}
        response = supabase.table("flight_sessions").insert(data).execute()
        if response.data:
            ACTIVE_SESSION_ID = response.data[0]['id']
            sync_data = json.dumps({"session_id": ACTIVE_SESSION_ID}).encode('utf-8')
            req = urllib.request.Request(f"{AI_ENGINE_URL}/api/set_session", data=sync_data, headers={'Content-Type': 'application/json'})
            urllib.request.urlopen(req)
            return ACTIVE_SESSION_ID
    except Exception as e:
        print(f"[ERROR] Failed to start/sync flight session: {e}")
    return None

from datetime import datetime

def get_active_session():
    try:
        response = supabase.table("flight_sessions").select("id").eq("status", "active").order("start_time", desc=True).limit(1).execute()
        if response.data: return response.data[0]['id']
    except: pass
    return None

def get_laptop_ip_relative_to_pi(pi_ip):
    if pi_ip.startswith("100."):
        try:
            host_info = socket.getaddrinfo(socket.gethostname(), None)
            for item in host_info:
                ip = item[4][0]
                if ip.startswith("100."): return ip
        except: pass
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(2)
        s.connect((pi_ip, 22)) 
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except:
        return socket.gethostbyname(socket.gethostname())

def get_stream_command(destination_ip):
    # Using mpegtsmux to package the H264 into 188-byte packets, easily surviving the Tailscale MTU.
    pipeline = (
        f"gst-launch-1.0 -v libcamerasrc ! "
        f"video/x-raw,width=640,height=480,framerate=20/1 ! "
        f"videoconvert ! "
        f"x264enc threads=4 tune=zerolatency bitrate=800 speed-preset=ultrafast key-int-max=20 ! "
        f"h264parse config-interval=1 ! "
        f"mpegtsmux alignment=7 ! "
        f"udpsink host={destination_ip} port={STREAM_PORT} sync=false"
    )
    return f"nohup {pipeline} > /tmp/gstream.log 2>&1 &"

def update_target_ip(ssh, laptop_ip):
    try:
        ssh.exec_command(f"echo '{laptop_ip}' > /home/rpi3408/target_ip.txt")
        return True
    except: return False

def monitor_stream(ssh, pi_ip, laptop_ip):
    while True:
        try:
            stdin, stdout, stderr = ssh.exec_command("pgrep -f gst-launch-1.0")
            pid = stdout.read().decode().strip()
            session_id = get_active_session()
            
            if pid:
                ts = time.strftime('%H:%M:%S')
                print(f"\r[STATUS] Stream Healthy (PID: {pid}) at {ts} ", end="", flush=True)
                status = "Healthy"
            else:
                print("\n[ALERT] Stream process missing! Attempting restart...")
                ssh.exec_command(get_stream_command(laptop_ip))
                time.sleep(2)
                status = "Missing/Restarting"
            
            if session_id:
                try:
                    supabase.table("stream_health").insert({
                        "session_id": session_id, "pi_ip": pi_ip, "laptop_ip": laptop_ip,
                        "stream_pid": pid if pid else None, "status": status
                    }).execute()
                except: pass
            time.sleep(5)
        except KeyboardInterrupt:
            return False 
        except:
            return True 

def main():
    while True:
        target_found = False
        for pi_ip in PI_TARGET_IPS:
            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            try:
                ssh.connect(pi_ip, username=USERNAME, password=PASSWORD, timeout=4)
                start_flight_session()
                laptop_ip = get_laptop_ip_relative_to_pi(pi_ip)
                update_target_ip(ssh, laptop_ip)
                ssh.exec_command("pkill -2 -f gst-launch-1.0")
                time.sleep(2)
                ssh.exec_command(get_stream_command(laptop_ip))
                time.sleep(2)
                should_retry = monitor_stream(ssh, pi_ip, laptop_ip)
                ssh.close()
                if not should_retry: return
                target_found = True
                break 
            except: continue

        if not target_found: time.sleep(5)

if __name__ == "__main__":
    try: main()
    except KeyboardInterrupt: sys.exit(0)
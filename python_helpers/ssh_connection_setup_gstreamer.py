import paramiko
import time
import sys
import socket

# === Configuration ===
# The Raspberry Pi Tailscale IP
PI_TAILSCALE_IP = "100.127.53.123"

def get_local_ip_for_pi(target_ip):
    """
    Determines which local IP address is used to reach the target_ip.
    """
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect((target_ip, 80))
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except Exception as e:
        print(f"[WARN] Failed to auto-detect local IP for target {target_ip}: {e}")
        return None

# Try to find the best laptop IP to tell the Pi to stream to
LAPTOP_IP = get_local_ip_for_pi(PI_TAILSCALE_IP)
if not LAPTOP_IP:
    LAPTOP_IP = "100.112.119.23" # Fallback

print(f"[INFO] Pi Target: {PI_TAILSCALE_IP}")
print(f"[INFO] Laptop IP (Streaming Destination): {LAPTOP_IP}")

USERNAME = "rpi3408"
PASSWORD = "rpi3408"

# The GStreamer command - Optimized for Tailscale/VPN
# Using a slightly lower MTU (1000) and bitrate (800k) to ensure packets pass through VPN
def get_stream_command(destination_ip):
    return (
        "nohup gst-launch-1.0 -v libcamerasrc ! "
        "video/x-raw,width=640,height=480,framerate=15/1 ! "
        "videoconvert ! "
        "x264enc threads=2 tune=zerolatency bitrate=800 speed-preset=ultrafast ! "
        "rtph264pay config-interval=1 pt=96 mtu=1000 ! "
        f"udpsink host={destination_ip} port=5600 sync=false > /tmp/gstream.log 2>&1 &"
    )

def monitor_stream(ssh, destination_ip):
    print("\n[MONITOR] Monitoring Stream (Ctrl+C to stop)...")
    while True:
        try:
            stdin, stdout, stderr = ssh.exec_command("pgrep -f gst-launch-1.0")
            pid = stdout.read().decode().strip()
            if pid:
                print(f"\r[ACTIVE] Stream Active (PID: {pid}) - Destination: {destination_ip} - {time.strftime('%H:%M:%S')}", end="", flush=True)
            else:
                print("\n[WARN] Stream died! Restarting...")
                cmd = get_stream_command(destination_ip)
                ssh.exec_command(cmd)
                time.sleep(2)
                continue
            time.sleep(5)
        except KeyboardInterrupt:
            print("\n\n[STOP] User stopped the script.")
            return
        except Exception as e:
            print(f"\n[ERROR] Connection lost during monitoring: {e}")
            return

# === Main Loop ===
print("[START] Starting Pi Streamer (Tailscale Mode) for GCS...")

while True:
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        print(f"\n[CONN] Connecting to Pi at {PI_TAILSCALE_IP}...")
        ssh.connect(PI_TAILSCALE_IP, username=USERNAME, password=PASSWORD, timeout=10)
        print(f"[SUCCESS] Secure Tunnel Established!")
        
        LAPTOP_IP = get_local_ip_for_pi(PI_TAILSCALE_IP) or LAPTOP_IP

        print("[CLEAN] Cleaning up old streams...")
        ssh.exec_command("pkill -f gst-launch-1.0; sleep 1")
        time.sleep(1)

        print(f"[LAUNCH] Launching Stream to Laptop at {LAPTOP_IP}...")
        cmd = get_stream_command(LAPTOP_IP)
        ssh.exec_command(cmd)
        time.sleep(2)
        
        stdin, stdout, stderr = ssh.exec_command("pgrep -f gst-launch-1.0")
        pid = stdout.read().decode().strip()
        if pid:
            print(f"[SUCCESS] Stream process started (PID: {pid})")
        else:
            print("[ERROR] Stream process did not start!")
            stdin, stdout, stderr = ssh.exec_command("cat /tmp/gstream.log 2>/dev/null")
            print(f"[LOG]: {stdout.read().decode()}")

        monitor_stream(ssh, LAPTOP_IP)
        ssh.close()
    except Exception as e:
        print(f"[ERROR] (Could not reach Pi: {e})")
    print("\n[RETRY] Retrying connection in 5 seconds...")
    time.sleep(5)
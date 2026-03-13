import paramiko
import time
import socket
import sys

# === Configuration ===
PI_TARGET_IPS = ["192.168.7.2", "raspberrypi.local", "100.127.53.123"]
USERNAME = "rpi3408"
PASSWORD = "rpi3408"
STREAM_PORT = 5600

def get_laptop_ip_relative_to_pi(pi_ip):
    """
    Determines the correct local IP of this laptop that the Pi can actually see.
    Crucial for Tailscale/VPN setups.
    """
    try:
        # Create a dummy connection to the Pi's IP to see which local interface is used
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(2)
        s.connect((pi_ip, 22)) # Connecting to SSH port
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except Exception as e:
        print(f"[WARN] IP auto-detection failed for {pi_ip}: {e}")
        # Fallback to standard hostname resolution
        return socket.gethostbyname(socket.gethostname())

def get_stream_command(destination_ip):
    """
    Returns the GStreamer command for the Pi.
    Uses mpegtsmux which is natively readable by OpenCV/FFmpeg on Windows.
    """
    pipeline = (
        f"gst-launch-1.0 -v libcamerasrc ! "
        f"video/x-raw,width=640,height=480,framerate=20/1 ! "
        f"videoconvert ! "
        # ADDED: key-int-max=20 forces an I-frame (Keyframe) every 1 second
        f"x264enc threads=4 tune=zerolatency bitrate=1500 speed-preset=ultrafast key-int-max=20 ! "
        # ADDED: config-interval=1 sends the SPS/PPS headers with every keyframe
        f"h264parse config-interval=1 ! mpegtsmux alignment=7 ! "
        f"udpsink host={destination_ip} port={STREAM_PORT} sync=false"
    )
    # Wrap in nohup to keep it running if SSH hiccups
    return f"nohup {pipeline} > /tmp/gstream.log 2>&1 &"

def monitor_stream(ssh, pi_ip, laptop_ip):
    """
    Checks every 5 seconds if the gstreamer process is still alive on the Pi.
    """
    print(f"\n[MONITOR] Streaming to {laptop_ip}:{STREAM_PORT} | Pi: {pi_ip}")
    print("[INFO] Press Ctrl+C to disconnect and try another IP.")
    
    while True:
        try:
            stdin, stdout, stderr = ssh.exec_command("pgrep -f gst-launch-1.0")
            pid = stdout.read().decode().strip()
            
            if pid:
                ts = time.strftime('%H:%M:%S')
                print(f"\r[STATUS] Stream Healthy (PID: {pid}) at {ts} ", end="", flush=True)
            else:
                print("\n[ALERT] Stream process missing! Attempting restart...")
                ssh.exec_command(get_stream_command(laptop_ip))
                time.sleep(2)
            
            time.sleep(5)
        except KeyboardInterrupt:
            print("\n\n[STOP] Monitoring stopped by user.")
            return False # Signal to stop completely
        except Exception as e:
            print(f"\n[ERROR] Lost connection to Pi: {e}")
            return True # Signal to attempt reconnect

def main():
    print("="*50)
    print("  DRONE GCS: PI CONNECTION & STREAM MANAGER  ")
    print("="*50)

    while True:
        target_found = False
        for pi_ip in PI_TARGET_IPS:
            print(f"\n[SCAN] Checking Pi availability at: {pi_ip}...")
            
            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            try:
                # 1. Connect
                ssh.connect(pi_ip, username=USERNAME, password=PASSWORD, timeout=4)
                print(f"[SUCCESS] Connected to Pi at {pi_ip}")
                
                # 2. Identify the return path (Laptop IP)
                laptop_ip = get_laptop_ip_relative_to_pi(pi_ip)
                print(f"[INFO] Laptop identified as: {laptop_ip}")

                # 3. Clean and Launch
                print("[CLEAN] Killing existing stream processes...")
                ssh.exec_command("pkill -9 -f gst-launch-1.0")
                time.sleep(1)
                
                print(f"[LAUNCH] Starting GStreamer -> {laptop_ip}:{STREAM_PORT}")
                ssh.exec_command(get_stream_command(laptop_ip))
                time.sleep(2)

                # 4. Stay in monitor loop
                should_retry = monitor_stream(ssh, pi_ip, laptop_ip)
                ssh.close()
                
                if not should_retry: # User hit Ctrl+C
                    return
                
                target_found = True
                break # Exit the IP loop to restart the scan

            except Exception as e:
                print(f"[SKIP] {pi_ip} is unreachable or rejected connection.")
                continue

        if not target_found:
            print(f"\n[RETRY] No Pi found on known IPs. Sleeping 5s...")
            time.sleep(5)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n[EXIT] System manager shut down.")
        sys.exit(0)
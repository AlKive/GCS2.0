import paramiko
import time
import sys

# === Configuration ===
# Using Tailscale IPs from your screenshot
PI_TAILSCALE_IP = "100.127.53.123"
LAPTOP_TAILSCALE_IP = "100.126.70.35"

USERNAME = "rpi3408"
PASSWORD = "rpi3408"

# The GStreamer command now sends data to the Laptop's Tailscale IP
# Optimized for your Sampaloc field research (lower latency)
# Redirect to a log file instead of /dev/null to capture errors
CMD_VPN_STREAM = (
    "nohup gst-launch-1.0 -v libcamerasrc ! "
    "video/x-raw,width=960,height=540,framerate=15/1 ! "
    "videoconvert ! "
    "x264enc threads=2 tune=zerolatency bitrate=1000 speed-preset=ultrafast ! "
    "rtph264pay config-interval=1 pt=96 mtu=1200 ! "
    f"udpsink host={LAPTOP_TAILSCALE_IP} port=5600 sync=false > /tmp/gstream.log 2>&1 &"
)

def monitor_stream(ssh, command_to_run):
    """
    Keeps the script open. Checks if stream is running every 5 seconds.
    If stream dies, it restarts it. Also reads logs from the Pi.
    """
    print("\n👁️  Monitoring Stream (Ctrl+C to stop)...")
    last_log_pos = 0
    
    while True:
        try:
            # Check if gst-launch-1.0 is running
            stdin, stdout, stderr = ssh.exec_command("pgrep -f gst-launch-1.0")
            pid = stdout.read().decode().strip()

            if pid:
                print(f"\r✅ VPN Stream Active (PID: {pid}) - {time.strftime('%H:%M:%S')}", end="", flush=True)
            else:
                print("\n⚠️  Stream died! Restarting...")
                ssh.exec_command(command_to_run)
                print("🚀 Restart command sent.")
                time.sleep(2)
                continue

            # Read recent logs from gstream.log
            stdin, stdout, stderr = ssh.exec_command("tail -5 /tmp/gstream.log 2>/dev/null")
            log_output = stdout.read().decode().strip()
            if log_output:
                print(f"\n[PI LOG] {log_output}")
            
            # Check if camera is available
            stdin, stdout, stderr = ssh.exec_command("ls -la /dev/video* 2>/dev/null | head -1")
            cam_check = stdout.read().decode().strip()
            if not cam_check and pid:
                print("\n⚠️  WARNING: No camera device found on Pi!")

            time.sleep(5)

        except KeyboardInterrupt:
            print("\n\n🛑 User stopped the script.")
            return
        except Exception as e:
            print(f"\n❌ Connection lost during monitoring: {e}")
            return

# === Main Loop ===
print("🔄 Starting VPN Auto-Streamer for Drone Research...")

while True:
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        print(f"\n🔌 Connecting to Pi via VPN at {PI_TAILSCALE_IP}...")
        # Connecting to the Pi's specific Tailscale IP
        ssh.connect(PI_TAILSCALE_IP, username=USERNAME, password=PASSWORD, timeout=10)
        print(f"✅ Secure Tunnel Established!")

        # Check camera availability
        print("📷 Checking camera availability on Pi...")
        stdin, stdout, stderr = ssh.exec_command("libcamera-hello --version 2>/dev/null || echo 'libcamera not found'")
        cam_info = stdout.read().decode().strip()
        if "not found" in cam_info:
            print("⚠️  WARNING: libcamera not found on Pi, trying legacy raspicam...")
        else:
            print(f"✅ Camera system: {cam_info[:50]}")

        # Clean up old processes
        print("🧹 Cleaning up old streams...")
        ssh.exec_command("pkill -f gst-launch-1.0; sleep 1")
        time.sleep(1)

        # Launch new stream targeted at Laptop IP
        print(f"🚀 Launching Stream to Laptop ({LAPTOP_TAILSCALE_IP})...")
        print(f"   Command: {CMD_VPN_STREAM[:100]}...")
        stdin, stdout, stderr = ssh.exec_command(CMD_VPN_STREAM)
        time.sleep(2)
        
        # Verify stream started
        stdin, stdout, stderr = ssh.exec_command("pgrep -f gst-launch-1.0")
        pid = stdout.read().decode().strip()
        if pid:
            print(f"✅ Stream process started (PID: {pid})")
        else:
            print("❌ Stream process did not start! Check /tmp/gstream.log on Pi")
            stdin, stdout, stderr = ssh.exec_command("cat /tmp/gstream.log 2>/dev/null || echo 'Log not available'")
            log_data = stdout.read().decode()
            print(f"[PI LOG]: {log_data}")

        # Monitor the connection
        monitor_stream(ssh, CMD_VPN_STREAM)
        
        ssh.close()

    except Exception as e:
        print(f"  (Could not reach Pi: {e})")
        import traceback
        traceback.print_exc()
    
    print("\n⏳ Retrying VPN connection in 5 seconds...")
    time.sleep(5)
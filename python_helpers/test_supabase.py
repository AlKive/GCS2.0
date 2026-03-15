import time
from datetime import datetime
from supabase import create_client, Client

# --- Setup ---
SUPABASE_URL = "https://pvkqpevqmurbkgucvxsr.supabase.co"
SUPABASE_KEY = "sb_publishable_HVs1kp4G5aUENcvRgLJIfg_eUlHdAYd"

print("Connecting to Supabase...")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def run_database_test():
    try:
        # 1. Start a Flight Session
        print("\n1. Starting a new Flight Session...")
        session_res = supabase.table("flight_sessions").insert({"status": "active"}).execute()
        session_id = session_res.data[0]['id']
        print(f"✅ Success! Session ID generated: {session_id}")

        # 2. Insert Mock Hardware Telemetry
        print("\n2. Pushing Hardware Telemetry...")
        supabase.table("hardware_telemetry").insert({
            "session_id": session_id,
            "latitude": 14.6012,
            "longitude": 120.9921,
            "altitude_lidar_m": 2.5,
            "battery_voltage": 22.4,
            "signal_strength_dbm": -65
        }).execute()
        print("✅ Success! Hardware telemetry logged.")

        # 3. Insert Mock AI Telemetry
        print("\n3. Pushing AI Telemetry...")
        supabase.table("ai_telemetry").insert({
            "session_id": session_id,
            "sharpness_score": 150,
            "is_sharp_enough": True,
            "tracking_progress_percent": 100,
            "water_confirmed": True,
            "active_target": "Mosquito Breeding Site",
            "pipeline_speed_ms": 45
        }).execute()
        print("✅ Success! AI telemetry logged.")

        # 4. Insert Mock Target Detection
        print("\n4. Pushing Target Detection...")
        target_res = supabase.table("target_detections").insert({
            "session_id": session_id,
            "target_class": "Mosquito Breeding Site",
            "bounding_box_area": 12500.5
        }).execute()
        target_id = target_res.data[0]['id']
        print(f"✅ Success! Target Locked. Detection ID: {target_id}")

        # 5. Insert Mock Spray Log
        print("\n5. Pushing Spray Log...")
        supabase.table("spray_logs").insert({
            "session_id": session_id,
            "trigger_type": "Auto",
            "target_area": 12500.5,
            "spray_duration_seconds": 4,
            "detection_id": target_id
        }).execute()
        print("✅ Success! Spray event logged.")

        # 6. Insert Mock Stream Health
        print("\n6. Pushing Stream Health Status...")
        supabase.table("stream_health").insert({
            "session_id": session_id,
            "pi_ip": "100.127.53.123",
            "laptop_ip": "100.127.53.100",
            "stream_pid": "12345",
            "status": "Healthy"
        }).execute()
        print("✅ Success! Stream health logged.")

        # 7. End the Flight Session
        print("\n7. Ending Flight Session...")
        supabase.table("flight_sessions").update({
            "status": "completed",
            "end_time": datetime.utcnow().isoformat()
        }).eq("id", session_id).execute()
        print("✅ Success! Session completed.")

        print("\n🎉 ALL TESTS PASSED! Your Supabase database is perfectly wired to receive live drone data.")

    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        print("If you see an error, double check that your tables were created correctly and your API keys are valid.")

if __name__ == "__main__":
    run_database_test()
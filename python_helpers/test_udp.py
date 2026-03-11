import socket

UDP_IP = "0.0.0.0"
UDP_PORT = 5600

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.bind((UDP_IP, UDP_PORT))

print(f"Listening for UDP packets on port {UDP_PORT}...")
print("If nothing prints below, Windows Firewall is blocking it, or the Pi is sending nothing!")

while True:
    data, addr = sock.recvfrom(1024)
    print(f"SUCCESS! Received a {len(data)}-byte packet from Pi at {addr}")
    break # We just need to see one packet!
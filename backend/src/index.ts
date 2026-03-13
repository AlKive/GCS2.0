import Fastify from 'fastify';
import websocketPlugin from '@fastify/websocket';
import { supabase } from './supabaseClient.js';
import type { Mission, LiveTelemetry, MissionPlan } from './types.js'; 

// child_process for launching external Python scripts
import { spawn, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import http from 'http';

const fastify = Fastify({ logger: true });
fastify.register(websocketPlugin);

// --- WebSocket Route ---
fastify.register(async function (server) {
  server.get('/ws/live', { websocket: true }, (connection, req) => {
    console.log('Client connected to live telemetry!');
    let currentBattery = 99.0;
    const missionStartTime = Date.now();

    // REMOVED: Automatic insertion of every telemetry message into mission_logs.
    // This was causing database bloat. Missions are now saved explicitly via POST /api/missions.
    connection.on('message', async (message: any) => {
      try {
        const payload = typeof message === 'string' ? JSON.parse(message) : JSON.parse(message.toString());
        // For now, we just log that we received data. 
        // If real-time persistence is needed, it should be done to a 'live_telemetry' table with UPDATE, not INSERT.
        // console.log('Received telemetry:', payload.gps);
      } catch (err) {
        fastify.log.error('Telemetry parse error: ' + String(err));
      }
    });

    connection.on('close', () => {
      console.log('Client disconnected.');
      clearInterval(interval);
    });

    // Keep sending test telemetry to connected clients (simulator)
    const interval = setInterval(async () => {
      const elapsedMilliseconds = Date.now() - missionStartTime;
      const totalSeconds = Math.floor(elapsedMilliseconds / 1000);
      const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
      const seconds = (totalSeconds % 60).toString().padStart(2, '0');
      const formattedFlightTime = `${minutes}:${seconds}`;
      currentBattery -= 0.01;

      // Poll AI Status from Python AI Engine
      let aiData = {
        sharpnessScore: 0,
        isSharpEnough: false,
        trackingProgress: 0,
        waterConfirmed: false,
        activeTarget: undefined,
        totalPipelineSpeedMs: 0
      };

      try {
        const response = await fetch('http://localhost:5000/api/status');
        if (response.ok) {
          aiData = await response.json() as any;
        }
      } catch (e) {
        // AI Engine might not be running yet
      }

      const testTelemetry: LiveTelemetry = {
        gps: { lat: 14.531120 + (Math.random() - 0.5) * 0.001, lon: 121.057442 + (Math.random() - 0.5) * 0.001 },
        altitude: 47.9 + (Math.random() - 0.5) * 2,
        speed: 11.3 + (Math.random() - 0.5),
        roll: (Math.random() - 0.5) * 5,
        pitch: -5 + (Math.random() - 0.5) * 3,
        heading: 345 + (Math.random() - 0.5) * 5,
        signalStrength: -55,
        battery: { voltage: 16.8 * (currentBattery / 100), percentage: currentBattery < 0 ? 0 : currentBattery },
        satellites: 14,
        flightTime: formattedFlightTime,
        distanceFromHome: 4057 + totalSeconds,
        flightMode: 'Loiter',
        armed: true,
        verticalSpeed: -6.8 + (Math.random() - 0.5) * 0.2,
        breedingSiteDetected: aiData.waterConfirmed,
        currentBreedingSite: undefined,
        detectedSites: [],
        gpsTrack: [],
        aiStatus: aiData,
        modes: {
          angle: true,
          positionHold: true,
          returnToHome: false,
          altitudeHold: true,
          headingHold: false,
          airmode: true,
          surface: true,
          mcBraking: aiData.waterConfirmed, // Using as proxy for pump active
          beeper: false,
        }
      };
      
      if (connection.readyState === 1) { // 1 means 'OPEN'
        connection.send(JSON.stringify(testTelemetry));
      } else {
        clearInterval(interval);
      }
    }, 1000); // Send data 1x per second
  });
});

// --- Proxy Route for Camera Feed ---
// This forwards /camera_feed requests to the Flask app on port 5000
fastify.get('/camera_feed', (request, reply) => {
  const proxyRequest = http.request({
    host: 'localhost',
    port: 5000,
    path: '/video_feed',
    method: 'GET'
  }, (proxyResponse) => {
    reply.raw.writeHead(proxyResponse.statusCode || 200, proxyResponse.headers);
    proxyResponse.pipe(reply.raw);
  });

  proxyRequest.on('error', (err) => {
    fastify.log.error('Camera proxy error: ' + err.message);
    reply.code(502).send({ error: 'Camera stream unavailable' });
  });

  proxyRequest.end();
});

// --- Manual Spray Route ---
fastify.post('/api/drone/spray', async (request, reply) => {
  try {
    const response = await fetch('http://localhost:5000/api/manual_spray', { method: 'POST' });
    const result = await response.json();
    return result;
  } catch (err) {
    fastify.log.error('Manual spray error: ' + String(err));
    reply.code(500).send({ error: 'Failed to communicate with AI Engine' });
  }
});

// --- REST API Routes ---

// Root endpoint with API information
fastify.get('/', async (request, reply) => {
  return {
    name: 'GCS Backend API',
    version: '1.0.0',
    endpoints: {
      missions: {
        'GET /api/missions': 'Get all missions',
        'GET /api/missions/stats': 'Get mission statistics',
        'POST /api/missions': 'Create a new mission'
      },
      websocket: {
        'WS /ws/live': 'Live telemetry WebSocket'
      }
    }
  };
});

// GET all missions (for Flight Logs)
fastify.get('/api/missions', async (request, reply) => {
  try {
    const { data, error } = await supabase
      .from('mission_logs')
      .select('*')
      .order('id', { ascending: false });

    if (error) throw error;
    return data;
  } catch (err) {
    fastify.log.error(err);
    reply.code(500).send({ error: 'Database error' });
  }
});

// GET a single mission by id
fastify.get('/api/missions/:id', async (request, reply) => {
  try {
    const { id } = request.params as { id: string };
    const { data, error } = await supabase.from('mission_logs').select('*').eq('id', parseInt(id, 10)).single();
    if (error) {
      return reply.code(404).send({ error: 'Mission not found' });
    }
    return data;
  } catch (err) {
    fastify.log.error(err);
    reply.code(500).send({ error: 'Database error' });
  }
});

// POST a new mission (for Flight Logs)
fastify.post('/api/missions', async (request, reply) => {
  try {
    const mission = request.body as { duration: number } & Omit<Mission, 'id' | 'duration'>;
    const { name, date, duration, status, location, gpsTrack, detectedSites } = mission;
    const durationString = String(duration); 
    const { data, error } = await supabase
      .from('mission_logs')
      .insert([{ name, date, duration: durationString, status, location, gps_track: gpsTrack, detected_sites: detectedSites }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    fastify.log.error(err);
    reply.code(500).send({ error: 'Database error' });
  }
});

// NEW: launch helper endpoint
fastify.post('/api/mission/start', async (request, reply) => {
  try {
    try {
       if (process.platform === 'win32') {
         execSync('taskkill /F /IM python.exe /T', { stdio: 'ignore' });
       } else {
         execSync('pkill -f python', { stdio: 'ignore' });
       }
       console.log('🧹 Cleaned up old python processes');
    } catch (e) {}

    const pythonExec = process.env.PYTHON_PATH || 'python';
    const scriptsDir = process.env.SCRIPTS_DIR || path.join(process.cwd(), '..', 'python_helpers');
    const script1 = path.join(scriptsDir, 'ssh_connection_setup_gstreamer.py');
    const script2 = path.join(scriptsDir, 'ai_engine.py');

    const log1 = fs.openSync(path.join(scriptsDir, 'p1.log'), 'a');
    const log2 = fs.openSync(path.join(scriptsDir, 'p2.log'), 'a');

    console.log('⏳ launching helper scripts using', pythonExec);
    
    const spawnOptions1 = { detached: true, stdio: ['ignore', log1, log1], windowsHide: true };
    const spawnOptions2 = { detached: true, stdio: ['ignore', log2, log2], windowsHide: true };

    const p1 = spawn(pythonExec, [script1], spawnOptions1);
    p1.unref();
    const p2 = spawn(pythonExec, [script2], spawnOptions2);
    p2.unref();

    return { success: true, message: 'Python helper scripts launched' };
  } catch (err) {
    fastify.log.error('Error starting mission helper scripts: ' + String(err));
    reply.code(500).send({ error: 'Failed to launch helper scripts' });
  }
});

// --- Start Server ---
const start = async () => {
  try {
    const port = process.env.PORT ? parseInt(process.env.PORT) : 8080;
    await fastify.listen({ port, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
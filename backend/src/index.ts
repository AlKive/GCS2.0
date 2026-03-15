import Fastify from 'fastify';
import websocketPlugin from '@fastify/websocket';
import { supabase } from './supabaseClient.js';
import type { LiveTelemetry } from './types.js'; 

// child_process for launching external Python scripts
import { spawn, execSync, SpawnOptions } from 'child_process';
import path from 'path';
import fs from 'fs';
import http from 'http';

// --- CONFIGURATION ---
const AI_ENGINE_IP = process.env.TAILSCALE_IP || '100.127.53.123';
const AI_ENGINE_PORT = 5000;

const fastify = Fastify({ logger: true });
fastify.register(websocketPlugin);

// --- WebSocket Route ---
fastify.register(async function (server) {
  server.get('/ws/live', { websocket: true }, (connection, req) => {
    console.log('Client connected to live telemetry!');
    let currentBattery = 99.0;
    const missionStartTime = Date.now();

    connection.on('message', async (message: any) => {
      try {
        const payload = typeof message === 'string' ? JSON.parse(message) : JSON.parse(message.toString());
      } catch (err) {
        fastify.log.error('Telemetry parse error: ' + String(err));
      }
    });

    connection.on('close', () => {
      console.log('Client disconnected.');
      clearInterval(interval);
    });

    const interval = setInterval(async () => {
      const elapsedMilliseconds = Date.now() - missionStartTime;
      const totalSeconds = Math.floor(elapsedMilliseconds / 1000);
      const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
      const seconds = (totalSeconds % 60).toString().padStart(2, '0');
      const formattedFlightTime = `${minutes}:${seconds}`;
      currentBattery -= 0.01;

      let aiData = {
        sharpnessScore: 0,
        isSharpEnough: false,
        trackingProgress: 0,
        waterConfirmed: false,
        activeTarget: undefined,
        totalPipelineSpeedMs: 0
      };

      try {
        const response = await fetch(`http://${AI_ENGINE_IP}:${AI_ENGINE_PORT}/api/status`);
        if (response.ok) {
          aiData = await response.json() as any;
        }
      } catch (e) {}

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
          mcBraking: aiData.waterConfirmed,
          beeper: false,
        }
      };
      
      if (connection.readyState === 1) {
        connection.send(JSON.stringify(testTelemetry));
      } else {
        clearInterval(interval);
      }
    }, 1000);
  });
});

// --- Proxy Route for Camera Feed ---
fastify.get('/camera_feed', (request, reply) => {
  const proxyRequest = http.request({
    host: AI_ENGINE_IP,
    port: AI_ENGINE_PORT,
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
    const response = await fetch(`http://${AI_ENGINE_IP}:${AI_ENGINE_PORT}/api/manual_spray`, { method: 'POST' });
    const result = await response.json();
    return result;
  } catch (err) {
    fastify.log.error('Manual spray error: ' + String(err));
    reply.code(500).send({ error: 'Failed to communicate with AI Engine' });
  }
});

// --- NEW SCHEMA ENDPOINTS ---

// 1. Flight Sessions
fastify.post('/api/sessions', async (request, reply) => {
  try {
    const body = request.body as any;
    const { data, error } = await supabase
      .from('flight_sessions')
      .insert([{ 
        pilot_id: body.pilot_id, 
        location_id: body.location_id, 
        status: body.status || 'active' 
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    fastify.log.error(err);
    reply.code(500).send({ error: 'Database error' });
  }
});

fastify.patch('/api/sessions/:id', async (request, reply) => {
  try {
    const { id } = request.params as { id: string };
    const body = request.body as any;
    const { data, error } = await supabase
      .from('flight_sessions')
      .update({ 
        status: body.status, 
        end_time: body.end_time || (body.status === 'completed' || body.status === 'aborted' ? new Date().toISOString() : null)
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    fastify.log.error(err);
    reply.code(500).send({ error: 'Database error' });
  }
});

fastify.get('/api/sessions', async (request, reply) => {
  try {
    const { data, error } = await supabase.from('flight_sessions').select('*, locations(*), users(*)').order('start_time', { ascending: false });
    if (error) throw error;
    return data;
  } catch (err) {
    fastify.log.error(err);
    reply.code(500).send({ error: 'Database error' });
  }
});

fastify.get('/api/sessions/stats', async (request, reply) => {
  try {
    const { data, error } = await supabase
      .from('flight_sessions')
      .select('id, start_time, end_time');

    if (error) throw error;

    const totalFlights = data.length;
    let totalSeconds = 0;

    data.forEach(s => {
      if (s.start_time && s.end_time) {
        const diff = new Date(s.end_time).getTime() - new Date(s.start_time).getTime();
        if (diff > 0) totalSeconds += diff / 1000;
      }
    });

    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);

    return {
      totalFlights,
      totalFlightTime: `${hours} Hours ${mins} Mins`
    };
  } catch (err) {
    fastify.log.error(err);
    reply.code(500).send({ error: 'Database error' });
  }
});

// 2. Telemetry (Hardware)
fastify.post('/api/telemetry/hardware', async (request, reply) => {
  try {
    const body = request.body as any;
    const { error } = await supabase.from('hardware_telemetry').insert([body]);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    fastify.log.error(err);
    reply.code(500).send({ error: 'Database error' });
  }
});

// 3. Telemetry (AI)
fastify.post('/api/telemetry/ai', async (request, reply) => {
  try {
    const body = request.body as any;
    const { error } = await supabase.from('ai_telemetry').insert([body]);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    fastify.log.error(err);
    reply.code(500).send({ error: 'Database error' });
  }
});

// 4. Target Detections
fastify.post('/api/detections', async (request, reply) => {
  try {
    const body = request.body as any;
    const { data, error } = await supabase.from('target_detections').insert([body]).select().single();
    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    fastify.log.error(err);
    reply.code(500).send({ error: 'Database error' });
  }
});

// 5. Spray Logs
fastify.post('/api/spray-logs', async (request, reply) => {
  try {
    const body = request.body as any;
    const { error } = await supabase.from('spray_logs').insert([body]);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    fastify.log.error(err);
    reply.code(500).send({ error: 'Database error' });
  }
});

// 6. Stream Health
fastify.post('/api/stream-health', async (request, reply) => {
  try {
    const body = request.body as any;
    const { error } = await supabase.from('stream_health').insert([body]);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    fastify.log.error(err);
    reply.code(500).send({ error: 'Database error' });
  }
});

// 7. Reference Data
fastify.get('/api/locations', async (request, reply) => {
  try {
    const { data, error } = await supabase.from('locations').select('*');
    if (error) throw error;
    return data;
  } catch (err) {
    fastify.log.error(err);
    reply.code(500).send({ error: 'Database error' });
  }
});

fastify.get('/api/users', async (request, reply) => {
  try {
    const { data, error } = await supabase.from('users').select('*');
    if (error) throw error;
    return data;
  } catch (err) {
    fastify.log.error(err);
    reply.code(500).send({ error: 'Database error' });
  }
});

// Helper for starting Python processes
fastify.post('/api/system/start', async (request, reply) => {
  try {
    const body = request.body as { pilot_id?: string, location_id?: number };

    // 1. Create a flight session first
    const { data: session, error: sessionError } = await supabase
      .from('flight_sessions')
      .insert([{ 
        pilot_id: body.pilot_id || null, 
        location_id: body.location_id || null, 
        status: 'active' 
      }])
      .select()
      .single();

    if (sessionError) {
      fastify.log.error({ err: sessionError }, 'Failed to create flight session');
      throw sessionError;
    }

    const sessionId = session.id;

    try {
       if (process.platform === 'win32') {
         execSync('taskkill /F /IM python.exe /T', { stdio: 'ignore' });
       } else {
         execSync('pkill -f python', { stdio: 'ignore' });
       }
    } catch (e) {}

    const pythonExec = process.env.PYTHON_PATH || 'python';
    const scriptsDir = process.env.SCRIPTS_DIR || path.join(process.cwd(), '..', 'python_helpers');
    const script1 = path.join(scriptsDir, 'ssh_connection_setup_gstreamer.py');
    const script2 = path.join(scriptsDir, 'ai_engine.py');

    const log1 = fs.openSync(path.join(scriptsDir, 'p1.log'), 'a');
    const log2 = fs.openSync(path.join(scriptsDir, 'p2.log'), 'a');

    const spawnOptions: SpawnOptions = { 
      detached: true, 
      stdio: ['ignore', log1, log2], 
      windowsHide: true 
    };

    // Note: We could pass the sessionId as an environment variable or argument if the scripts support it
    const p1 = spawn(pythonExec, [script1], spawnOptions);
    p1.unref();
    const p2 = spawn(pythonExec, [script2], spawnOptions);
    p2.unref();

    // Give the AI Engine a moment to start, then try to set the session ID
    // Note: This is best-effort. In a production app, you might want a retry loop.
    setTimeout(async () => {
      try {
        await fetch(`http://${AI_ENGINE_IP}:${AI_ENGINE_PORT}/api/set_session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId })
        });
        console.log(`[INFO] Sent session_id ${sessionId} to AI Engine`);
      } catch (e) {
        console.error(`[WARN] Could not set session_id on AI Engine: ${e}`);
      }
    }, 5000); // 5 second delay to let Flask start

    return { 
      success: true, 
      session_id: sessionId,
      message: 'System processes launched and flight session started' 
    };
  } catch (err) {
    fastify.log.error('Error starting system: ' + String(err));
    reply.code(500).send({ error: 'Failed to launch system processes or create session' });
  }
});

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
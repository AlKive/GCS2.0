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
const AI_ENGINE_IP = process.env.TAILSCALE_IP || '127.0.0.1';
const AI_ENGINE_PORT = 5000;

const fastify = Fastify({ logger: true });
fastify.register(websocketPlugin);

// --- WebSocket Route ---
fastify.register(async function (server) {
  server.get('/ws/logs', { websocket: true }, (connection, req) => {
    const scriptsDir = process.env.SCRIPTS_DIR || path.join(process.cwd(), '..', 'python_helpers');
    const p1Path = path.join(scriptsDir, 'p1.log');
    const p2Path = path.join(scriptsDir, 'p2.log');

    const sendLogs = () => {
      try {
        if (fs.existsSync(p1Path)) {
          const p1Logs = fs.readFileSync(p1Path, 'utf8').split('\n').slice(-20);
          connection.send(JSON.stringify({ type: 'python', logs: p1Logs }));
        }
        if (fs.existsSync(p2Path)) {
          const p2Logs = fs.readFileSync(p2Path, 'utf8').split('\n').slice(-20);
          connection.send(JSON.stringify({ type: 'ai', logs: p2Logs }));
        }
      } catch (err) {
        fastify.log.error('Log streaming error: ' + String(err));
      }
    };

    const interval = setInterval(sendLogs, 1000);
    connection.on('close', () => clearInterval(interval));
  });

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

      let aiData: any = {
        sharpnessScore: 0,
        isSharpEnough: false,
        trackingProgress: 0,
        waterConfirmed: false,
        activeTarget: undefined,
        totalPipelineSpeedMs: 0,
        gps_lat: 0,
        gps_lon: 0,
        lidar_m: 0,
        heading: 0,
        battery_voltage: 0,
        roll: 0,
        pitch: 0,
        verticalSpeed: 0,
        speed: 0,
        satellites: 0,
        signalStrength: -99,
        armed: false
      };

      try {
        const response = await fetch(`http://${AI_ENGINE_IP}:${AI_ENGINE_PORT}/api/status`);
        if (response.ok) {
          aiData = await response.json() as any;
        }
      } catch (e) {}

      const testTelemetry: LiveTelemetry = {
        gps: { 
          lat: aiData.gps_lat || 14.531120, 
          lon: aiData.gps_lon || 121.057442 
        },
        altitude: aiData.lidar_m || 0,
        speed: aiData.speed || 0,
        roll: aiData.roll || 0,
        pitch: aiData.pitch || 0,
        heading: aiData.heading || 0,
        signalStrength: aiData.signalStrength || -55,
        battery: { 
          voltage: aiData.battery_voltage || 0, 
          percentage: aiData.battery_voltage ? Math.max(0, Math.min(100, ((aiData.battery_voltage - 21.0) / (25.2 - 21.0)) * 100)) : 0
        },
        satellites: aiData.satellites || 0,
        flightTime: formattedFlightTime,
        distanceFromHome: 0,
        flightMode: 'Loiter',
        armed: aiData.armed !== undefined ? aiData.armed : true,
        verticalSpeed: aiData.verticalSpeed || 0,
        breedingSiteDetected: aiData.waterConfirmed,
        currentBreedingSite: undefined,
        detectedSites: [],
        gpsTrack: [],
        aiStatus: aiData,
        modes: {
          angle: aiData.modes?.angle ?? false,
          positionHold: aiData.modes?.positionHold ?? false,
          returnToHome: aiData.modes?.returnToHome ?? false,
          altitudeHold: aiData.modes?.altitudeHold ?? false,
          headingHold: aiData.modes?.headingHold ?? false,
          airmode: aiData.modes?.airmode ?? false,
          surface: aiData.modes?.surface ?? false,
          mcBraking: aiData.modes?.mcBraking ?? aiData.waterConfirmed,
          beeper: aiData.modes?.beeper ?? false,
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

// --- Tactical Tools Routes ---
fastify.post('/api/tools/offline-analyzer', async (request, reply) => {
  const { spawn } = require('child_process');
  const path = require('path');
  
  const scriptPath = path.join(__dirname, '../../python_helpers/offline_analyzer.py');
  const pythonPath = process.platform === 'win32' ? 'python' : 'python3';

  // Launch the GUI application as a detached process
  const child = spawn(pythonPath, [scriptPath], {
    detached: true,
    stdio: 'ignore'
  });
  
  child.unref();
  return { status: 'launched', message: 'Offline Analyzer GUI started' };
});

// --- Manual Spray Route ---
fastify.post('/api/drone/spray', async (request, reply) => {
  try {
    const body = request.body as any;
    const response = await fetch(`http://${AI_ENGINE_IP}:${AI_ENGINE_PORT}/api/manual_spray`, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        detection_id: body.detection_id,
        area: body.area
      })
    });
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
        barangay_id: body.barangay_id, 
        status: body.status || 'active',
        session_name: body.session_name
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
    const { limit } = request.query as { limit?: string };
    const queryLimit = limit === 'all' ? 1000 : parseInt(limit || '20');

    const { data, error } = await supabase
      .from('flight_sessions')
      .select(`
        *,
        barangays(*, cities(*)),
        users(*),
        ai_performance_logs(*),
        hardware_telemetry(*),
        spray_operations(*),
        stream_health(*),
        detections(*, target_types(*))
      `)
      .order('start_time', { ascending: false })
      .order('logged_at', { foreignTable: 'hardware_telemetry', ascending: true })
      .order('logged_at', { foreignTable: 'ai_performance_logs', ascending: true })
      .order('logged_at', { foreignTable: 'stream_health', ascending: true })
      .limit(queryLimit);
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

// 3. Telemetry (AI Performance)
fastify.post('/api/telemetry/ai', async (request, reply) => {
  try {
    const body = request.body as any;
    const { error } = await supabase.from('ai_performance_logs').insert([body]);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    fastify.log.error(err);
    reply.code(500).send({ error: 'Database error' });
  }
});

// 4. Detections
fastify.post('/api/detections', async (request, reply) => {
  try {
    const body = request.body as any;
    const { data, error } = await supabase.from('detections').insert([body]).select().single();
    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    fastify.log.error(err);
    reply.code(500).send({ error: 'Database error' });
  }
});

// 5. Spray Operations
fastify.post('/api/spray-logs', async (request, reply) => {
  try {
    const body = request.body as any;
    const { error } = await supabase.from('spray_operations').insert([body]);
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
    const { data, error } = await supabase.from('barangays').select('*, cities(*)');
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
    const { session_name, pilot_id, pilot_name, barangay_id } = request.body as any;

    let finalPilotId = pilot_id;

    // Handle "Others" pilot creation
    if (!pilot_id && pilot_name) {
      const email = `${pilot_name.replace(/\s+/g, '.').toLowerCase()}@lipad.local`;
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert([{ full_name: pilot_name, role: 'Pilot', email }])
        .select()
        .single();
      
      if (userError) {
        // If user already exists by email, just get their ID
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', email)
          .single();
        if (existingUser) finalPilotId = existingUser.id;
      } else {
        finalPilotId = userData.id;
      }
    }

    // 1. Create the flight session first
    const { data: sessionData, error: sessionError } = await supabase
      .from('flight_sessions')
      .insert([{
        session_name,
        pilot_id: finalPilotId || null,
        barangay_id: barangay_id || null,
        status: 'active',
        start_time: new Date().toISOString()
      }])
      .select()
      .single();

    if (sessionError) throw sessionError;
    const session_id = sessionData.id;

    // Kill existing processes
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
      windowsHide: true,
      env: { ...process.env, ACTIVE_SESSION_ID: session_id }
    };

    const p1 = spawn(pythonExec, [script1], spawnOptions);
    p1.unref();
    const p2 = spawn(pythonExec, [script2], spawnOptions);
    p2.unref();

    return { 
      success: true, 
      session_id,
      message: 'System processes launched with session: ' + session_id 
    };
  } catch (err) {
    fastify.log.error('Error starting system: ' + String(err));
    reply.code(500).send({ error: 'Failed to launch system processes' });
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

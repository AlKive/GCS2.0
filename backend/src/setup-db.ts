import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

async function setupDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('\n========================================');
    console.log('🔒 DATABASE SETUP - DATA SAFETY MODE');
    console.log('========================================\n');
    console.log('⚠️  This setup will NOT delete or drop any existing data.');
    console.log('📋 All tables will be created with "IF NOT EXISTS" clause.\n');

    // Check if tables already exist
    const tablesCheckResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'cities'
      ) as cities_exists,
      EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'barangays'
      ) as barangays_exists,
      EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      ) as users_exists,
      EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'flight_sessions'
      ) as flight_sessions_exists,
      EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'target_types'
      ) as target_types_exists,
      EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'detections'
      ) as detections_exists,
      EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'hardware_telemetry'
      ) as hardware_telemetry_exists,
      EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ai_performance_logs'
      ) as ai_performance_logs_exists,
      EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'spray_operations'
      ) as spray_operations_exists,
      EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'stream_health'
      ) as stream_health_exists
    `);
    
    const { 
      cities_exists, barangays_exists, users_exists, flight_sessions_exists, 
      target_types_exists, detections_exists, hardware_telemetry_exists,
      ai_performance_logs_exists, spray_operations_exists, stream_health_exists
    } = tablesCheckResult.rows[0];

    // 1. Cities
    if (!cities_exists) {
      console.log('📝 Creating cities table...');
      await pool.query(`
        CREATE TABLE cities (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL UNIQUE
        );
      `);
    }

    // 2. Barangays
    if (!barangays_exists) {
      console.log('📝 Creating barangays table...');
      await pool.query(`
        CREATE TABLE barangays (
          id SERIAL PRIMARY KEY,
          city_id INTEGER REFERENCES cities(id),
          name TEXT NOT NULL
        );
      `);
    }

    // 3. Users
    if (!users_exists) {
      console.log('📝 Creating users table...');
      await pool.query(`
        CREATE TABLE users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          full_name TEXT NOT NULL,
          role TEXT CHECK (role = ANY (ARRAY['Pilot'::text, 'LGU Personnel'::text, 'Sanitation Officer'::text])),
          email TEXT NOT NULL UNIQUE,
          barangay_id INTEGER REFERENCES barangays(id)
        );
      `);
    }

    // 4. Flight Sessions
    if (!flight_sessions_exists) {
      console.log('📝 Creating flight_sessions table...');
      await pool.query(`
        CREATE TABLE flight_sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          pilot_id UUID REFERENCES users(id),
          barangay_id INTEGER REFERENCES barangays(id),
          start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          end_time TIMESTAMP WITH TIME ZONE,
          status TEXT DEFAULT 'active' CHECK (status = ANY (ARRAY['active'::text, 'completed'::text, 'aborted'::text])),
          session_name TEXT
        );
      `);
    }

    // 5. Target Types
    if (!target_types_exists) {
      console.log('📝 Creating target_types table...');
      await pool.query(`
        CREATE TABLE target_types (
          id SERIAL PRIMARY KEY,
          label TEXT NOT NULL UNIQUE,
          description TEXT
        );
      `);
    }

    // 6. Detections
    if (!detections_exists) {
      console.log('📝 Creating detections table...');
      await pool.query(`
        CREATE TABLE detections (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          session_id UUID NOT NULL REFERENCES flight_sessions(id) ON DELETE CASCADE,
          target_type_id INTEGER NOT NULL REFERENCES target_types(id),
          confidence DOUBLE PRECISION,
          water_confirmed BOOLEAN DEFAULT FALSE,
          latitude DOUBLE PRECISION NOT NULL,
          longitude DOUBLE PRECISION NOT NULL,
          lidar_m DOUBLE PRECISION,
          image_url TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      await pool.query(`CREATE INDEX idx_detections_session ON detections(session_id);`);
    }

    // 7. Hardware Telemetry
    if (!hardware_telemetry_exists) {
      console.log('📝 Creating hardware_telemetry table...');
      await pool.query(`
        CREATE TABLE hardware_telemetry (
          id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          session_id UUID NOT NULL REFERENCES flight_sessions(id),
          logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          latitude DOUBLE PRECISION,
          longitude DOUBLE PRECISION,
          altitude_lidar_m DOUBLE PRECISION,
          battery_voltage DOUBLE PRECISION,
          heading INTEGER,
          is_armed BOOLEAN
        );
      `);
    }

    // 8. AI Performance Logs
    if (!ai_performance_logs_exists) {
      console.log('📝 Creating ai_performance_logs table...');
      await pool.query(`
        CREATE TABLE ai_performance_logs (
          id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          session_id UUID NOT NULL REFERENCES flight_sessions(id),
          logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          sharpness_score INTEGER,
          tracking_progress_percent INTEGER,
          pipeline_speed_ms INTEGER
        );
      `);
    }

    // 9. Spray Operations
    if (!spray_operations_exists) {
      console.log('📝 Creating spray_operations table...');
      await pool.query(`
        CREATE TABLE spray_operations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          detection_id UUID NOT NULL REFERENCES detections(id),
          session_id UUID REFERENCES flight_sessions(id),
          triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          trigger_type TEXT CHECK (trigger_type = ANY (ARRAY['Manual'::text, 'Auto'::text])),
          duration_seconds INTEGER NOT NULL,
          target_area_pixels DOUBLE PRECISION,
          true_area_scaled DOUBLE PRECISION
        );
      `);
    }

    // 10. Stream Health
    if (!stream_health_exists) {
      console.log('📝 Creating stream_health table...');
      await pool.query(`
        CREATE TABLE stream_health (
          id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          session_id UUID REFERENCES flight_sessions(id),
          logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          pi_ip TEXT,
          laptop_ip TEXT,
          stream_pid TEXT,
          status TEXT CHECK (status = ANY (ARRAY['Healthy'::text, 'Missing/Restarting'::text, 'Disconnected'::text, 'Failed'::text, 'Stream Frozen'::text, 'Too Blurry'::text]))
        );
      `);
    }

    // --- Legacy mission tables (keep for compatibility) ---
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mission_logs (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        date VARCHAR(50) NOT NULL,
        duration VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        location VARCHAR(255) NOT NULL,
        gps_track JSONB,
        detected_sites JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS mission_plans (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        altitude NUMERIC,
        speed NUMERIC,
        waypoints JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // SEED DATA
    console.log('🌱 Seeding reference data...');
    
    // Seed City
    await pool.query(`
      INSERT INTO cities (name) VALUES ('Manila')
      ON CONFLICT (name) DO NOTHING;
    `);
    const cityRes = await pool.query("SELECT id FROM cities WHERE name = 'Manila'");
    const cityId = cityRes.rows[0].id;

    // Seed Barangays
    const barangays = ['426', '421', '428'];
    for (const b of barangays) {
      await pool.query(`
        INSERT INTO barangays (city_id, name) VALUES ($1, $2)
        ON CONFLICT DO NOTHING;
      `, [cityId, b]);
    }

    // Seed Pilots
    const pilots = [
      "Alexa Babiera", "Gerikah Alday", "Catelyn Joy Morco", 
      "Charles David Bernido", "Sir Peter", "Sir Sherwin"
    ];
    for (const p of pilots) {
      await pool.query(`
        INSERT INTO users (full_name, role, email) 
        VALUES ($1, 'Pilot', $2)
        ON CONFLICT (email) DO NOTHING;
      `, [p, `${p.replace(/\s+/g, '.').toLowerCase()}@lipad.local`]);
    }

    // Get row counts for verification
    const logsCountResult = await pool.query('SELECT COUNT(*) as count FROM mission_logs');
    const plansCountResult = await pool.query('SELECT COUNT(*) as count FROM mission_plans');
    
    const logsCount = logsCountResult.rows[0].count;
    const plansCount = plansCountResult.rows[0].count;

    console.log('\n========================================');
    console.log('📊 DATABASE VERIFICATION');
    console.log('========================================');
    console.log(`✓ mission_logs records: ${logsCount}`);
    console.log(`✓ mission_plans records: ${plansCount}`);
    if (flight_sessions_exists) {
      const sessionsCount = await pool.query('SELECT COUNT(*) as count FROM flight_sessions');
      console.log(`✓ flight_sessions records: ${sessionsCount.rows[0].count}`);
    }
    if (detections_exists) {
      const detectionsCount = await pool.query('SELECT COUNT(*) as count FROM detections');
      console.log(`✓ detections records: ${detectionsCount.rows[0].count}`);
    }
    console.log('\n✅ Database setup complete! All data preserved.\n');
    
  } catch (error) {
    console.error('\n❌ Error setting up database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

setupDatabase().catch(console.error);

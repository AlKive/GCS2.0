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
        AND table_name = 'mission_logs'
      ) as mission_logs_exists,
      EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'mission_plans'
      ) as mission_plans_exists,
      EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'flight_sessions'
      ) as flight_sessions_exists,
      EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'detections'
      ) as detections_exists
    `);
    
    const { mission_logs_exists, mission_plans_exists, flight_sessions_exists, detections_exists } = tablesCheckResult.rows[0];
    
    if (mission_logs_exists) {
      console.log('✓ mission_logs table already exists - data will be preserved');
    } else {
      console.log('📝 Creating mission_logs table...');
    }

    // Create mission_logs table (safe - won't drop existing data)
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
    console.log('✓ mission_logs table created/verified');

    if (mission_plans_exists) {
      console.log('✓ mission_plans table already exists - data will be preserved');
    } else {
      console.log('📝 Creating mission_plans table...');
    }

    // Create mission_plans table (safe - won't drop existing data)
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
    console.log('✓ mission_plans table created/verified');

    if (flight_sessions_exists) {
      console.log('✓ flight_sessions table already exists');
    } else {
      console.log('📝 Creating flight_sessions table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS flight_sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          pilot_id UUID,
          barangay_id INTEGER,
          session_name TEXT,
          start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          end_time TIMESTAMP WITH TIME ZONE,
          status VARCHAR(50) DEFAULT 'active'
        );
      `);
    }

    if (detections_exists) {
      console.log('✓ detections table already exists');
    } else {
      console.log('📝 Creating detections table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS target_types (
          id SERIAL PRIMARY KEY,
          label VARCHAR(255) NOT NULL,
          description TEXT
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS detections (
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
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_detections_session ON detections(session_id);`);
    }

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

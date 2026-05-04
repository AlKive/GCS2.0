/**
 * Database Migration System
 * 
 * This file provides safe database schema migrations without data loss.
 * It tracks which migrations have been applied and prevents re-running them.
 */

import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

interface Migration {
  id: string;
  name: string;
  up: (pool: pg.Pool) => Promise<void>;
}

const migrations: Migration[] = [
  {
    id: '001',
    name: 'Create mission_logs table',
    up: async (pool) => {
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
    }
  },
  {
    id: '002',
    name: 'Create mission_plans table',
    up: async (pool) => {
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
    }
  },
  {
    id: '003',
    name: 'Create flight_sessions table',
    up: async (pool) => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS flight_sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          pilot_id UUID,
          barangay_id INTEGER,
          start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          end_time TIMESTAMP WITH TIME ZONE,
          status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'aborted')),
          session_name TEXT
        );
      `);
    }
  },
  {
    id: '004',
    name: 'Create target_types table',
    up: async (pool) => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS target_types (
          id SERIAL PRIMARY KEY,
          label VARCHAR(255) NOT NULL UNIQUE,
          description TEXT
        );
      `);
      // Seed target types
      await pool.query(`
        INSERT INTO target_types (label) VALUES ('Larvae'), ('Stagnant Water')
        ON CONFLICT (label) DO NOTHING;
      `);
    }
  },
  {
    id: '005',
    name: 'Create detections table',
    up: async (pool) => {
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
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_detections_session ON detections(session_id);
      `);
    }
  },
  {
    id: '006',
    name: 'Create hardware_telemetry table',
    up: async (pool) => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS hardware_telemetry (
          id SERIAL PRIMARY KEY,
          session_id UUID NOT NULL REFERENCES flight_sessions(id) ON DELETE CASCADE,
          logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          latitude DOUBLE PRECISION NOT NULL,
          longitude DOUBLE PRECISION NOT NULL,
          altitude_lidar_m DOUBLE PRECISION NOT NULL,
          battery_voltage DOUBLE PRECISION NOT NULL,
          heading DOUBLE PRECISION NOT NULL,
          is_armed BOOLEAN DEFAULT FALSE
        );
      `);
    }
  },
  {
    id: '007',
    name: 'Create ai_performance_logs table',
    up: async (pool) => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ai_performance_logs (
          id SERIAL PRIMARY KEY,
          session_id UUID NOT NULL REFERENCES flight_sessions(id) ON DELETE CASCADE,
          logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          sharpness_score DOUBLE PRECISION NOT NULL,
          tracking_progress_percent DOUBLE PRECISION NOT NULL,
          pipeline_speed_ms DOUBLE PRECISION NOT NULL
        );
      `);
    }
  },
  {
    id: '008',
    name: 'Create spray_operations table',
    up: async (pool) => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS spray_operations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          session_id UUID REFERENCES flight_sessions(id) ON DELETE CASCADE,
          detection_id UUID REFERENCES detections(id),
          triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          trigger_type VARCHAR(50) NOT NULL,
          duration_seconds DOUBLE PRECISION NOT NULL,
          target_area_pixels DOUBLE PRECISION,
          true_area_scaled DOUBLE PRECISION
        );
      `);
    }
  },
  {
    id: '009',
    name: 'Create stream_health table',
    up: async (pool) => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS stream_health (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          session_id UUID NOT NULL REFERENCES flight_sessions(id) ON DELETE CASCADE,
          logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          pi_ip VARCHAR(50) NOT NULL,
          laptop_ip VARCHAR(50) NOT NULL,
          stream_pid VARCHAR(50),
          status VARCHAR(50) NOT NULL
        );
      `);
    }
  },
  {
    id: '010',
    name: 'Seed reference data (Pilots, Barangays)',
    up: async (pool) => {
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
    }
  },
  {
    id: '011',
    name: 'Ensure session_name column exists in flight_sessions',
    up: async (pool) => {
      await pool.query(`
        DO $$ 
        BEGIN 
          IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='flight_sessions' AND column_name='session_name') THEN
            ALTER TABLE flight_sessions ADD COLUMN session_name TEXT;
          END IF;
        END $$;
      `);
    }
  },
  // Add future migrations here
];

async function runMigrations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('\n========================================');
    console.log('🔄 DATABASE MIGRATIONS - SAFE MODE');
    console.log('========================================\n');

    // Create migrations table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id VARCHAR(10) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Get list of already-executed migrations
    const executedResult = await pool.query(
      'SELECT id FROM _migrations ORDER BY id'
    );
    const executedIds = new Set(executedResult.rows.map(row => row.id));

    // Run pending migrations
    let ranCount = 0;
    for (const migration of migrations) {
      if (executedIds.has(migration.id)) {
        console.log(`✓ [${migration.id}] ${migration.name} (already applied)`);
      } else {
        console.log(`▶ [${migration.id}] ${migration.name}... running`);
        await migration.up(pool);
        await pool.query(
          'INSERT INTO _migrations (id, name) VALUES ($1, $2)',
          [migration.id, migration.name]
        );
        console.log(`✅ [${migration.id}] ${migration.name}... done`);
        ranCount++;
      }
    }

    console.log('\n========================================');
    if (ranCount === 0) {
      console.log('✓ All migrations already applied. Database is up-to-date.');
    } else {
      console.log(`✅ Applied ${ranCount} new migration(s). Database updated.`);
    }
    console.log('========================================\n');

  } catch (error) {
    console.error('\n❌ Migration error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

import { fileURLToPath } from 'url';
import path from 'path';

// ... (rest of the file remains same until the end)

// Run migrations if executed directly
const isMain = process.argv[1] && (
  process.argv[1].endsWith('migrate-db.ts') || 
  process.argv[1].endsWith('migrate-db.js') ||
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
);

if (isMain) {
  runMigrations().catch(console.error);
}

export { runMigrations, migrations };

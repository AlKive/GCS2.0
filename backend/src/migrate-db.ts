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

// Run migrations if executed directly
if (require.main === module) {
  runMigrations().catch(console.error);
}

export { runMigrations, migrations };

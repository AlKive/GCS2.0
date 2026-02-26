#!/usr/bin/env node

/**
 * Database Backup & Restore Utility
 * 
 * Safe backup and restore operations for the GCS database.
 * Prevents accidental data loss with confirmations and validation.
 */

import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(message: string, color?: string) {
  const c = color || '';
  console.log(`${c}${message}${colors.reset}`);
}

async function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(process.cwd(), `gcs_db_backup_${timestamp}.sql`);

  log(`\n📦 Starting database backup...`, colors.cyan);

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    // Get mission_logs data
    const logsResult = await pool.query(
      'SELECT * FROM mission_logs ORDER BY id'
    );

    // Get mission_plans data
    const plansResult = await pool.query(
      'SELECT * FROM mission_plans ORDER BY id'
    );

    // Get current sequence values
    const logsSeqResult = await pool.query(
      "SELECT last_value FROM mission_logs_id_seq"
    );
    const plansSeqResult = await pool.query(
      "SELECT last_value FROM mission_plans_id_seq"
    );

    // Build SQL dump
    let sqlDump = `-- GCS Database Backup
-- Generated: ${new Date().toISOString()}
-- Records: ${logsResult.rows.length} mission logs, ${plansResult.rows.length} mission plans
-- WARNING: This is a data-only backup. Tables must exist before restoring.

BEGIN;

-- ===========================
-- Mission Logs Data
-- ===========================
TRUNCATE TABLE mission_logs RESTART IDENTITY CASCADE;
`;

    // Insert mission_logs
    for (const log of logsResult.rows) {
      const values = [
        log.id,
        log.name,
        log.date,
        log.duration,
        log.status,
        log.location,
        JSON.stringify(log.gps_track),
        JSON.stringify(log.detected_sites)
      ];
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
      sqlDump += `INSERT INTO mission_logs (id, name, date, duration, status, location, gps_track, detected_sites) VALUES (${placeholders});\n`;
    }

    sqlDump += `\n-- ===========================
-- Mission Plans Data
-- ===========================
TRUNCATE TABLE mission_plans RESTART IDENTITY CASCADE;
`;

    // Insert mission_plans
    for (const plan of plansResult.rows) {
      const values = [
        plan.id,
        plan.name,
        plan.altitude,
        plan.speed,
        JSON.stringify(plan.waypoints)
      ];
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
      sqlDump += `INSERT INTO mission_plans (id, name, altitude, speed, waypoints) VALUES (${placeholders});\n`;
    }

    // Reset sequences
    sqlDump += `\n-- Reset sequences
SELECT setval('mission_logs_id_seq', ${logsSeqResult.rows[0]?.last_value || 1});
SELECT setval('mission_plans_id_seq', ${plansSeqResult.rows[0]?.last_value || 1});

COMMIT;

-- Backup complete
`;

    // Write to file
    fs.writeFileSync(backupFile, sqlDump);
    log(
      `✅ Backup completed successfully!`,
      colors.green
    );
    log(
      `📁 File: ${backupFile}`,
      colors.cyan
    );
    log(
      `📊 Records backed up:
     - Mission Logs: ${logsResult.rows.length}
     - Mission Plans: ${plansResult.rows.length}\n`,
      colors.cyan
    );

  } catch (error) {
    log(`❌ Backup failed: ${error}`, colors.red);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

async function restoreDatabase(backupFile: string) {
  log(`\n⚠️  WARNING: This will REPLACE current data with backup data!`, colors.yellow);
  log(`📁 Restore file: ${backupFile}`, colors.yellow);

  // For safety in non-interactive mode, require explicit confirmation
  const args = process.argv.slice(2);
  const hasForceFlag = args.includes('--force');

  if (!hasForceFlag) {
    log(`\n⛔ To proceed, run with --force flag:`, colors.red);
    log(`   npm run db:restore -- "${backupFile}" --force\n`, colors.yellow);
    process.exit(1);
  }

  log(`\n▶ Proceeding with restore...`, colors.yellow);

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  const client = await pool.connect();

  try {
    // Read backup file
    const sqlContent = fs.readFileSync(backupFile, 'utf-8');
    const queries = sqlContent.split(';').filter(q => q.trim() !== '');

    await client.query('BEGIN');
    for (const query of queries) {
      if (query.trim() !== '') {
        await client.query(query);
      }
    }
    await client.query('COMMIT');

    log(`✅ Restore completed successfully!`, colors.green);
    log(`✓ Data has been restored from backup.\n`, colors.green);

  } catch (error) {
    await client.query('ROLLBACK');
    log(`❌ Restore failed: ${error}`, colors.red);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Main CLI
const command = process.argv[2];

if (command === 'backup') {
  backupDatabase();
} else if (command === 'restore') {
  const backupFile = process.argv[3];
  if (!backupFile) {
    log(`❌ Please specify a backup file to restore:`, colors.red);
    log(`   node migrate-db.js restore <backup-file> [--force]\n`, colors.yellow);
    process.exit(1);
  }
  if (!fs.existsSync(backupFile)) {
    log(`❌ Backup file not found: ${backupFile}\n`, colors.red);
    process.exit(1);
  }
  restoreDatabase(backupFile);
} else {
  log(`\n📋 GCS Database Backup & Restore Utility\n`, colors.bold);
  log(`Usage:`, colors.cyan);
  log(`  Backup:  npm run db:backup`, colors.yellow);
  log(`  Restore: npm run db:restore <file> [--force]\n`, colors.yellow);
  log(`Examples:`, colors.cyan);
  log(`  npm run db:backup`, colors.yellow);
  log(`  npm run db:restore gcs_db_backup_2025-11-23T10-30-45-123Z.sql --force\n`, colors.yellow);
  process.exit(0);
}

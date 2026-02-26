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
      ) as mission_plans_exists
    `);
    
    const { mission_logs_exists, mission_plans_exists } = tablesCheckResult.rows[0];
    
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
    console.log('\n✅ Database setup complete! All data preserved.\n');
    
  } catch (error) {
    console.error('\n❌ Error setting up database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

setupDatabase().catch(console.error);

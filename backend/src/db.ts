import 'dotenv/config'; // Loads .env file immediately
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

pool.on('connect', () => {
  console.log('Connected to the database!');
});

// Export a query function
export const db = {
  query: (text: string, params?: any[]) => pool.query(text, params),
};
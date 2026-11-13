const { Pool } = require('pg');

// Production (Supabase): set DATABASE_URL to the Supabase *pooler* connection string.
// Local dev: falls back to the docker-compose Postgres.
const connectionString = process.env.DATABASE_URL;

const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false }, // Supabase requires SSL
      max: 10,
    })
  : new Pool({
      user: 'postgres',
      host: 'localhost',
      database: 'ojttracer',
      password: 'postgrespassword',
      port: 5432,
    });

module.exports = {
  query: (text, params) => pool.query(text, params),
};

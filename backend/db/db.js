const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

function resolveSslConfig(connectionString) {
  const explicitSsl = String(process.env.DB_SSL || '').trim().toLowerCase();

  if (explicitSsl === 'true') {
    return { rejectUnauthorized: false };
  }

  if (explicitSsl === 'false') {
    return false;
  }

  const normalizedUrl = String(connectionString || '').toLowerCase();

  if (normalizedUrl.includes('sslmode=require')) {
    return { rejectUnauthorized: false };
  }

  return false;
}

function getConnectionHost(connectionString) {
  try {
    const url = new URL(connectionString);
    return url.host;
  } catch (_err) {
    return 'invalid-url';
  }
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL nao configurada em backend/.env');
}

const sslConfig = resolveSslConfig(connectionString);

console.log('Database config loaded', {
  host: getConnectionHost(connectionString),
  ssl: Boolean(sslConfig)
});

const pool = new Pool({
  connectionString,
  ssl: sslConfig
});

module.exports = pool;

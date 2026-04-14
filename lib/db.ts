/**
 * lib/db.ts
 * Server-side only — never import from client components.
 *
 * Lazily-initialised, reused mssql connection pool stored on the Node.js
 * global object so it survives hot-module-replacement in development
 * without leaking connections.
 *
 * All operations are READ-ONLY against the ERP database.
 */
import sql from 'mssql';

const config: sql.config = {
  server: (process.env.MSSQL_SERVER ?? '').trim(),
  database: (process.env.MSSQL_DATABASE ?? '').trim(),
  user: (process.env.MSSQL_USER ?? '').trim(),
  password: (process.env.MSSQL_PASSWORD ?? '').trim(),
  port: parseInt(process.env.MSSQL_PORT ?? '1433', 10),
  options: {
    encrypt: process.env.MSSQL_ENCRYPT === 'true',
    trustServerCertificate: true,
  },
  connectionTimeout: 15_000,
  requestTimeout: 30_000,
  pool: {
    max: 5,
    min: 0,
    idleTimeoutMillis: 30_000,
  },
};

const g = global as typeof globalThis & { _mssqlPool?: sql.ConnectionPool };

export async function getPool(): Promise<sql.ConnectionPool> {
  if (!g._mssqlPool || !g._mssqlPool.connected) {
    g._mssqlPool = await new sql.ConnectionPool(config).connect();
  }
  return g._mssqlPool;
}

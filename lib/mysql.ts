import mysql from 'mysql2/promise';

function parseDatabaseUrl(url: string) {
  try {
    const u = new URL(url);
    return {
      host: u.hostname,
      port: Number(u.port) || 3306,
      user: u.username || 'root',
      password: u.password || undefined,
      database: u.pathname?.replace(/\//g, '') || 'sga_kna_db',
    };
  } catch (e) {
    return { host: '127.0.0.1', port: 3306, user: 'root', password: undefined, database: 'sga_kna_db' };
  }
}

const databaseUrl = process.env.DATABASE_URL || 'mysql://root@127.0.0.1:3306/sga_kna_db';
const cfg = parseDatabaseUrl(databaseUrl);

export const pool = mysql.createPool({
  host: cfg.host,
  port: cfg.port,
  user: cfg.user,
  password: cfg.password,
  database: cfg.database,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  charset: 'utf8mb4_general_ci',
});

export async function query<T = any>(sql: string, params?: any[]): Promise<T> {
  const [rows] = await pool.query(sql, params as any);
  return rows as T;
}

export async function execute(sql: string, params?: any[]): Promise<any> {
  return pool.execute(sql, params as any);
}

export default pool;

import Database from 'better-sqlite3';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

let db;
let pgPool;

const isPostgres = !!process.env.DATABASE_URL;

if (isPostgres) {
  try {
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      },
      connectionTimeoutMillis: 5000 
    });
    console.log('🐘 PostgreSQL pool initialized');
  } catch (err) {
    console.error('❌ Error creating PostgreSQL pool:', err);
  }
}

/** انتظار اتصال Postgres وإنشاء الجداول قبل قبول الطلبات (يمنع 500 عند /register مبكراً). */
export async function ensureDatabaseReady() {
  if (!isPostgres || !pgPool) {
    await getDb();
    console.log('✅ SQLite ready');
    return;
  }
  try {
    await pgPool.query('SELECT NOW()');
    console.log('✅ PostgreSQL connection verified');
    await initPg();
  } catch (err) {
    console.error('❌ PostgreSQL unavailable:', err.message);
    try {
      await pgPool.end();
    } catch (_) {
      /* ignore */
    }
    pgPool = null;
    await getDb();
    console.warn('⚠️ Using SQLite fallback (check DATABASE_URL on Render)');
  }
}

async function initPg() {
  try {
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        role VARCHAR(50) DEFAULT 'client',
        approved INTEGER DEFAULT 0,
        profile_picture VARCHAR(255),
        bio TEXT,
        city VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS lawyer_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        specialty VARCHAR(200),
        bar_number VARCHAR(100),
        years_experience INTEGER,
        certificate_path VARCHAR(255),
        rating DECIMAL(3,2) DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES users(id),
        lawyer_id INTEGER NOT NULL REFERENCES users(id),
        type VARCHAR(50) DEFAULT 'appointment',
        requested_date TIMESTAMP NOT NULL,
        confirmed_date TIMESTAMP,
        status VARCHAR(50) DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES users(id),
        lawyer_id INTEGER NOT NULL REFERENCES users(id),
        appointment_id INTEGER REFERENCES appointments(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (client_id, lawyer_id)
      );
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER NOT NULL REFERENCES conversations(id),
        sender_id INTEGER NOT NULL REFERENCES users(id),
        content TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS complaints (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        subject VARCHAR(200) NOT NULL,
        description TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES users(id),
        lawyer_id INTEGER NOT NULL REFERENCES users(id),
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (client_id, lawyer_id)
      );
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        type VARCHAR(50),
        title VARCHAR(200),
        body TEXT,
        is_read INTEGER DEFAULT 0,
        ref_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS password_resets (
        id SERIAL PRIMARY KEY,
        email VARCHAR(150) NOT NULL,
        otp_code VARCHAR(10) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Full PostgreSQL Schema Sync Complete');
  } catch (err) {
    console.error('❌ PostgreSQL Schema Sync Error:', err);
    throw err;
  }
}

export async function getDb() {
  if (!db) {
    db = new Database('./database.sqlite');
    db.pragma('journal_mode = WAL');
    
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        role VARCHAR(50) DEFAULT 'client',
        approved TINYINT(1) DEFAULT 0,
        profile_picture VARCHAR(255),
        bio TEXT,
        city VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS lawyer_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        specialty VARCHAR(200),
        bar_number VARCHAR(100),
        years_experience INTEGER,
        certificate_path VARCHAR(255),
        rating DECIMAL(3,2) DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        lawyer_id INTEGER NOT NULL,
        type VARCHAR(50) DEFAULT 'appointment',
        requested_date DATETIME NOT NULL,
        confirmed_date DATETIME,
        status VARCHAR(50) DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES users(id),
        FOREIGN KEY (lawyer_id) REFERENCES users(id)
      );
      CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        lawyer_id INTEGER NOT NULL,
        appointment_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (client_id, lawyer_id),
        FOREIGN KEY (client_id) REFERENCES users(id),
        FOREIGN KEY (lawyer_id) REFERENCES users(id),
        FOREIGN KEY (appointment_id) REFERENCES appointments(id)
      );
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER NOT NULL,
        sender_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        is_read TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id),
        FOREIGN KEY (sender_id) REFERENCES users(id)
      );
      CREATE TABLE IF NOT EXISTS complaints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        subject VARCHAR(200) NOT NULL,
        description TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        lawyer_id INTEGER NOT NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (client_id, lawyer_id),
        FOREIGN KEY (client_id) REFERENCES users(id),
        FOREIGN KEY (lawyer_id) REFERENCES users(id)
      );
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type VARCHAR(50),
        title VARCHAR(200),
        body TEXT,
        is_read TINYINT(1) DEFAULT 0,
        ref_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE TABLE IF NOT EXISTS password_resets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email VARCHAR(150) NOT NULL,
        otp_code VARCHAR(10) NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ SQLite initialized.');
  }
  return db;
}

const pool = {
  getConnection: async () => {
    if (pgPool) {
      try {
        const client = await pgPool.connect();
        return {
          query: async (sql, params) => {
            let pgSql = sql;
            if (params && params.length > 0) {
              let count = 0;
              pgSql = sql.replace(/\?/g, () => `$${++count}`);
            }
            
            // Check if it's an INSERT/UPDATE/DELETE and handle RETURNING/rowCount
            const trimmedSql = sql.trim().toUpperCase();
            const isInsert = trimmedSql.startsWith('INSERT');
            const isUpdate = trimmedSql.startsWith('UPDATE');
            const isDelete = trimmedSql.startsWith('DELETE');

            if (isInsert && !pgSql.toUpperCase().includes('RETURNING')) {
              pgSql += ' RETURNING id';
            }

            const res = await client.query(pgSql, params);
            
            if (isInsert || isUpdate || isDelete) {
              const insertId = res.rows && res.rows[0] ? res.rows[0].id : null;
              return [{ 
                insertId, 
                affectedRows: res.rowCount 
              }, res.fields];
            }
            return [res.rows, res.fields];
          },
          beginTransaction: async () => await client.query('BEGIN'),
          commit: async () => await client.query('COMMIT'),
          rollback: async () => await client.query('ROLLBACK'),
          release: () => client.release()
        };
      } catch (e) {
        console.warn('⚠️ Falling back to SQLite for transaction');
      }
    }
    const sqliteDb = await getDb();
    return {
      query: async (sql, params) => {
        const stmt = sqliteDb.prepare(sql);
        if (sql.trim().toUpperCase().startsWith('SELECT')) {
          return [stmt.all(params || []), null];
        }
        const info = stmt.run(params || []);
        return [{ insertId: info.lastInsertRowid, affectedRows: info.changes }, null];
      },
      beginTransaction: async () => sqliteDb.prepare('BEGIN').run(),
      commit: async () => sqliteDb.prepare('COMMIT').run(),
      rollback: async () => { try { sqliteDb.prepare('ROLLBACK').run() } catch(err){} },
      release: () => {}
    };
  },
  query: async (sql, params) => {
    if (pgPool) {
      try {
        let pgSql = sql;
        if (params && params.length > 0) {
          let count = 0;
          pgSql = sql.replace(/\?/g, () => `$${++count}`);
        }

        const trimmedSql = sql.trim().toUpperCase();
        const isSelect = trimmedSql.startsWith('SELECT');
        const isInsert = trimmedSql.startsWith('INSERT');
        const isUpdate = trimmedSql.startsWith('UPDATE');
        const isDelete = trimmedSql.startsWith('DELETE');

        if (isInsert && !pgSql.toUpperCase().includes('RETURNING')) {
          pgSql += ' RETURNING id';
        }

        const res = await pgPool.query(pgSql, params);
        const affectedRows = res.rowCount === null || res.rowCount === undefined ? 0 : res.rowCount;
        console.log(`[PG Query Success] SQL: ${pgSql.substring(0, 100)}${pgSql.length > 100 ? '...' : ''} | Affected: ${affectedRows}`);
        
        if (isSelect) {
          return [res.rows, res.fields];
        } else {
          const insertId = (res.rows && res.rows[0]) ? res.rows[0].id : null;
          return [{ insertId, affectedRows }, res.fields];
        }
      } catch (e) {
        console.error('❌ PostgreSQL Query Error:', e);
        console.warn('⚠️ SQLite Fallback:', e.message);
      }
    }

    const sqliteDb = await getDb();
    const stmt = sqliteDb.prepare(sql);
    let isSelect = sql.trim().toUpperCase().startsWith('SELECT');
    if (isSelect) {
      const rows = stmt.all(params || []);
      return [rows, []];
    } else {
      const res = stmt.run(params || []);
      return [{ insertId: res.lastInsertRowid, affectedRows: res.changes }, []];
    }
  }
};

export default pool;

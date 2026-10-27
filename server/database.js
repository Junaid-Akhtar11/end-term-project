const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = process.env.DATABASE_FILE || path.join(__dirname, 'devpulse.db');
const db = new Database(dbPath);

// Enable WAL mode for high concurrency
db.pragma('journal_mode = WAL');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'developer',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS monitors (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      method TEXT DEFAULT 'GET',
      headers TEXT DEFAULT '{}',
      body TEXT DEFAULT '',
      interval_sec INTEGER DEFAULT 30,
      timeout_ms INTEGER DEFAULT 5000,
      expected_status INTEGER DEFAULT 200,
      status TEXT DEFAULT 'ACTIVE',
      last_run_at DATETIME,
      current_state TEXT DEFAULT 'HEALTHY',
      consecutive_failures INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS assertions (
      id TEXT PRIMARY KEY,
      monitor_id TEXT NOT NULL,
      source TEXT NOT NULL, -- 'status', 'latency', 'json_body', 'header'
      property TEXT,
      operator TEXT NOT NULL, -- 'equals', 'contains', 'less_than', 'greater_than', 'regex'
      target_value TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(monitor_id) REFERENCES monitors(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS execution_logs (
      id TEXT PRIMARY KEY,
      monitor_id TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      latency_ms INTEGER NOT NULL,
      status_code INTEGER,
      success INTEGER NOT NULL,
      error_message TEXT,
      response_size_bytes INTEGER,
      assertions_summary TEXT, -- JSON summary of assertion checks
      response_preview TEXT,
      FOREIGN KEY(monitor_id) REFERENCES monitors(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY,
      monitor_id TEXT NOT NULL,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME,
      cause TEXT NOT NULL,
      status TEXT DEFAULT 'OPEN', -- 'OPEN', 'RESOLVED'
      failure_count INTEGER DEFAULT 1,
      FOREIGN KEY(monitor_id) REFERENCES monitors(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS webhook_inboxes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS webhook_deliveries (
      id TEXT PRIMARY KEY,
      inbox_id TEXT NOT NULL,
      received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      method TEXT NOT NULL,
      headers TEXT NOT NULL,
      body TEXT,
      query_params TEXT,
      ip_address TEXT,
      FOREIGN KEY(inbox_id) REFERENCES webhook_inboxes(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_logs_monitor ON execution_logs(monitor_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_incidents_monitor ON incidents(monitor_id, status);
    CREATE INDEX IF NOT EXISTS idx_webhooks_inbox ON webhook_deliveries(inbox_id, received_at);
  `);

  // Seed default admin demo user if no users exist
  const count = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (count === 0) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('demo12345', salt);
    const userId = 'usr_seed_admin';
    db.prepare(`
      INSERT INTO users (id, username, email, password_hash, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, 'demo_engineer', 'engineer@devpulse.io', hash, 'admin');

    // Seed realistic monitors
    const monitor1Id = 'mon_api_prod_users';
    db.prepare(`
      INSERT INTO monitors (id, user_id, name, url, method, interval_sec, timeout_ms, expected_status, current_state)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      monitor1Id,
      userId,
      'GitHub Public API Status',
      'https://api.github.com/zen',
      'GET',
      15,
      4000,
      200,
      'HEALTHY'
    );

    db.prepare(`
      INSERT INTO assertions (id, monitor_id, source, property, operator, target_value)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('ast_seed_1', monitor1Id, 'status', '', 'equals', '200');

    db.prepare(`
      INSERT INTO assertions (id, monitor_id, source, property, operator, target_value)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('ast_seed_2', monitor1Id, 'latency', '', 'less_than', '2500');

    const monitor2Id = 'mon_internal_test';
    db.prepare(`
      INSERT INTO monitors (id, user_id, name, url, method, interval_sec, timeout_ms, expected_status, current_state)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      monitor2Id,
      userId,
      'Local Synthetic Mock Service',
      'http://localhost:4000/api/mock/health',
      'GET',
      10,
      2000,
      200,
      'HEALTHY'
    );

    db.prepare(`
      INSERT INTO assertions (id, monitor_id, source, property, operator, target_value)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('ast_seed_3', monitor2Id, 'status', '', 'equals', '200');

    // Create a seed webhook inbox
    db.prepare(`
      INSERT INTO webhook_inboxes (id, user_id, token, name)
      VALUES (?, ?, ?, ?)
    `).run('inb_seed_stripe', userId, 'wh_live_checkout_gateway', 'Stripe & CI/CD Delivery Pipeline');
  }
}

module.exports = {
  db,
  initDatabase
};

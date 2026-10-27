const express = require('express');
const http = require('http');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config();

const { db, initDatabase } = require('./database');
const { generateToken, authMiddleware, optionalAuthMiddleware } = require('./authMiddleware');
const SyntheticsScheduler = require('./syntheticsEngine');

initDatabase();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve built frontend assets
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

// Real-Time WebSocket Broadcasting
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  ws.send(JSON.stringify({ type: 'CONNECTED', payload: { serverTime: new Date().toISOString() } }));

  ws.on('close', () => {
    clients.delete(ws);
  });
});

function broadcast(event) {
  const message = JSON.stringify(event);
  for (const client of clients) {
    if (client.readyState === 1) { // OPEN
      client.send(message);
    }
  }
}

// Instantiate and start Synthetics Background Engine
const scheduler = new SyntheticsScheduler(broadcast);
scheduler.start();

// ==========================================
// MOCK APIS FOR DEMO & LOCAL HEALTH TESTING
// ==========================================
let mockFailing = false;
let mockLatencyMs = 60;

app.get('/api/mock/health', (req, res) => {
  setTimeout(() => {
    if (mockFailing) {
      return res.status(503).json({
        status: 'DOWN',
        service: 'payment-gateway',
        error: 'Database connection pool exhausted',
        timestamp: new Date().toISOString()
      });
    }
    return res.status(200).json({
      status: 'UP',
      service: 'payment-gateway',
      version: 'v3.12.4',
      uptime_sec: Math.floor(process.uptime()),
      healthy: true,
      timestamp: new Date().toISOString()
    });
  }, mockLatencyMs);
});

// Route to simulate chaos / service failure for demo testing
app.post('/api/mock/toggle-chaos', (req, res) => {
  mockFailing = !mockFailing;
  res.json({
    mockFailing,
    message: mockFailing ? 'Chaos mode enabled: Mock service returning 503 DOWN' : 'Chaos mode disabled: Mock service returning 200 UP'
  });
});

app.post('/api/mock/set-latency', (req, res) => {
  const { latency } = req.body;
  mockLatencyMs = Number(latency) || 50;
  res.json({ mockLatencyMs, message: `Mock latency updated to ${mockLatencyMs}ms` });
});

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================
app.post('/api/auth/register', (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    const existing = db.prepare(`SELECT * FROM users WHERE email = ? OR username = ?`).get(email, username);
    if (existing) {
      return res.status(409).json({ error: 'Username or email already registered' });
    }

    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(password, salt);
    const userId = 'usr_' + crypto.randomUUID().slice(0, 8);

    db.prepare(`
      INSERT INTO users (id, username, email, password_hash, role)
      VALUES (?, ?, ?, ?, 'developer')
    `).run(userId, username, email, password_hash);

    const user = { id: userId, username, email, role: 'developer' };
    const token = generateToken(user);

    res.status(201).json({ user, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;
    if (!emailOrUsername || !password) {
      return res.status(400).json({ error: 'Please enter your username/email and password' });
    }

    const user = db.prepare(`
      SELECT * FROM users WHERE email = ? OR username = ?
    `).get(emailOrUsername, emailOrUsername);

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const userData = { id: user.id, username: user.username, email: user.email, role: user.role };
    const token = generateToken(userData);

    res.json({ user: userData, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = db.prepare(`SELECT id, username, email, role, created_at FROM users WHERE id = ?`).get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

// ==========================================
// MONITORS & SYNTHETICS ROUTES
// ==========================================
app.get('/api/monitors', optionalAuthMiddleware, (req, res) => {
  try {
    const monitors = db.prepare(`
      SELECT m.*,
        (SELECT COUNT(*) FROM execution_logs WHERE monitor_id = m.id) as total_checks,
        (SELECT AVG(latency_ms) FROM execution_logs WHERE monitor_id = m.id) as avg_latency,
        (SELECT COUNT(*) FROM execution_logs WHERE monitor_id = m.id AND success = 1) * 100.0 /
          MAX(1, (SELECT COUNT(*) FROM execution_logs WHERE monitor_id = m.id)) as uptime_pct
      FROM monitors m
      ORDER BY m.created_at DESC
    `).all();

    // Fetch assertions for each monitor
    for (const mon of monitors) {
      mon.assertions = db.prepare(`SELECT * FROM assertions WHERE monitor_id = ?`).all(mon.id);
      mon.recentLogs = db.prepare(`
        SELECT timestamp, latency_ms, status_code, success
        FROM execution_logs
        WHERE monitor_id = ?
        ORDER BY timestamp DESC LIMIT 20
      `).all(mon.id).reverse();
    }

    res.json({ monitors });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/monitors', authMiddleware, (req, res) => {
  try {
    const { name, url, method, headers, body, interval_sec, timeout_ms, expected_status, assertions } = req.body;
    if (!name || !url) {
      return res.status(400).json({ error: 'Monitor name and target URL are required' });
    }

    const id = 'mon_' + crypto.randomUUID().slice(0, 8);
    const validatedInterval = Math.max(Number(interval_sec) || 30, 5);
    const validatedTimeout = Math.min(Math.max(Number(timeout_ms) || 5000, 500), 30000);

    db.prepare(`
      INSERT INTO monitors (
        id, user_id, name, url, method, headers, body, interval_sec, timeout_ms, expected_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      req.user.id,
      name,
      url,
      (method || 'GET').toUpperCase(),
      typeof headers === 'object' ? JSON.stringify(headers) : (headers || '{}'),
      body || '',
      validatedInterval,
      validatedTimeout,
      Number(expected_status) || 200
    );

    // Save assertions
    if (Array.isArray(assertions)) {
      const insertAst = db.prepare(`
        INSERT INTO assertions (id, monitor_id, source, property, operator, target_value)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const ast of assertions) {
        if (ast.source && ast.operator && ast.target_value !== undefined) {
          insertAst.run(
            'ast_' + crypto.randomUUID().slice(0, 8),
            id,
            ast.source,
            ast.property || '',
            ast.operator,
            String(ast.target_value)
          );
        }
      }
    }

    scheduler.syncMonitors();
    setTimeout(() => scheduler.triggerImmediateCheck(id), 500);

    const created = db.prepare(`SELECT * FROM monitors WHERE id = ?`).get(id);
    created.assertions = db.prepare(`SELECT * FROM assertions WHERE monitor_id = ?`).all(id);

    broadcast({ type: 'MONITOR_CREATED', payload: created });
    res.status(201).json({ monitor: created });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/monitors/:id', (req, res) => {
  try {
    const monitor = db.prepare(`SELECT * FROM monitors WHERE id = ?`).get(req.params.id);
    if (!monitor) return res.status(404).json({ error: 'Monitor not found' });

    monitor.assertions = db.prepare(`SELECT * FROM assertions WHERE monitor_id = ?`).all(monitor.id);
    
    // Logs for telemetry & charts (latest 100)
    const logs = db.prepare(`
      SELECT * FROM execution_logs
      WHERE monitor_id = ?
      ORDER BY timestamp DESC LIMIT 100
    `).all(monitor.id);

    // Calculate percentiles: p50, p90, p99
    const latencies = logs.map(l => l.latency_ms).sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
    const p90 = latencies[Math.floor(latencies.length * 0.9)] || 0;
    const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
    const uptimePct = logs.length > 0
      ? (logs.filter(l => l.success === 1).length / logs.length) * 100
      : 100;

    const incidents = db.prepare(`
      SELECT * FROM incidents
      WHERE monitor_id = ?
      ORDER BY started_at DESC LIMIT 10
    `).all(monitor.id);

    res.json({
      monitor,
      metrics: {
        totalChecks: logs.length,
        uptimePct: Number(uptimePct.toFixed(2)),
        p50Latency: p50,
        p90Latency: p90,
        p99Latency: p99,
        avgLatency: latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0
      },
      logs,
      incidents
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Trigger manual on-demand execution
app.post('/api/monitors/:id/trigger', authMiddleware, async (req, res) => {
  try {
    const checkResult = await scheduler.triggerImmediateCheck(req.params.id);
    if (!checkResult) return res.status(404).json({ error: 'Monitor not found' });
    res.json({ result: checkResult });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update monitor
app.put('/api/monitors/:id', authMiddleware, (req, res) => {
  try {
    const { name, url, method, interval_sec, timeout_ms, expected_status, status } = req.body;
    db.prepare(`
      UPDATE monitors
      SET name = COALESCE(?, name),
          url = COALESCE(?, url),
          method = COALESCE(?, method),
          interval_sec = COALESCE(?, interval_sec),
          timeout_ms = COALESCE(?, timeout_ms),
          expected_status = COALESCE(?, expected_status),
          status = COALESCE(?, status)
      WHERE id = ?
    `).run(name, url, method, interval_sec, timeout_ms, expected_status, status, req.params.id);

    scheduler.syncMonitors();
    const updated = db.prepare(`SELECT * FROM monitors WHERE id = ?`).get(req.params.id);
    broadcast({ type: 'MONITOR_UPDATED', payload: updated });
    res.json({ monitor: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete monitor
app.delete('/api/monitors/:id', authMiddleware, (req, res) => {
  try {
    db.prepare(`DELETE FROM monitors WHERE id = ?`).run(req.params.id);
    scheduler.syncMonitors();
    broadcast({ type: 'MONITOR_DELETED', payload: { id: req.params.id } });
    res.json({ message: 'Monitor deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// INCIDENTS LOGS & OVERVIEW
// ==========================================
app.get('/api/incidents', (req, res) => {
  try {
    const incidents = db.prepare(`
      SELECT i.*, m.name as monitor_name, m.url as monitor_url
      FROM incidents i
      JOIN monitors m ON i.monitor_id = m.id
      ORDER BY i.started_at DESC
      LIMIT 50
    `).all();
    res.json({ incidents });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// WEBHOOK INBOX / CAPTURE ENGINE
// ==========================================
app.get('/api/webhooks/inboxes', authMiddleware, (req, res) => {
  try {
    const inboxes = db.prepare(`
      SELECT w.*,
        (SELECT COUNT(*) FROM webhook_deliveries WHERE inbox_id = w.id) as delivery_count,
        (SELECT received_at FROM webhook_deliveries WHERE inbox_id = w.id ORDER BY received_at DESC LIMIT 1) as last_delivery_at
      FROM webhook_inboxes w
      WHERE w.user_id = ?
      ORDER BY w.created_at DESC
    `).all(req.user.id);

    res.json({ inboxes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/webhooks/inboxes', authMiddleware, (req, res) => {
  try {
    const { name } = req.body;
    const id = 'inb_' + crypto.randomUUID().slice(0, 8);
    const token = 'wh_' + crypto.randomBytes(12).toString('hex');

    db.prepare(`
      INSERT INTO webhook_inboxes (id, user_id, token, name)
      VALUES (?, ?, ?, ?)
    `).run(id, req.user.id, token, name || 'Webhook Receiver');

    const created = db.prepare(`SELECT * FROM webhook_inboxes WHERE id = ?`).get(id);
    res.status(201).json({ inbox: created });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Webhook Receiver Catch-all endpoint
app.all('/api/webhooks/capture/:token', (req, res) => {
  try {
    const { token } = req.params;
    const inbox = db.prepare(`SELECT * FROM webhook_inboxes WHERE token = ?`).get(token);
    if (!inbox) {
      return res.status(404).json({ error: 'Webhook inbox token not found' });
    }

    const deliveryId = 'del_' + crypto.randomUUID().slice(0, 8);
    const nowIso = new Date().toISOString();
    const headersJson = JSON.stringify(req.headers);
    const bodyStr = typeof req.body === 'object' ? JSON.stringify(req.body, null, 2) : String(req.body || '');
    const queryStr = JSON.stringify(req.query || {});
    const ip = req.ip || req.connection.remoteAddress;

    db.prepare(`
      INSERT INTO webhook_deliveries (
        id, inbox_id, received_at, method, headers, body, query_params, ip_address
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(deliveryId, inbox.id, nowIso, req.method, headersJson, bodyStr, queryStr, ip);

    // Limit stored deliveries to 200 per inbox
    db.prepare(`
      DELETE FROM webhook_deliveries
      WHERE id NOT IN (
        SELECT id FROM webhook_deliveries WHERE inbox_id = ? ORDER BY received_at DESC LIMIT 200
      ) AND inbox_id = ?
    `).run(inbox.id, inbox.id);

    const delivery = {
      id: deliveryId,
      inbox_id: inbox.id,
      received_at: nowIso,
      method: req.method,
      headers: req.headers,
      body: bodyStr,
      query_params: req.query,
      ip_address: ip
    };

    broadcast({
      type: 'WEBHOOK_RECEIVED',
      payload: delivery
    });

    res.status(200).json({
      status: 'success',
      message: 'DevPulse webhook delivered and inspected',
      deliveryId,
      timestamp: nowIso
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/webhooks/inboxes/:id/deliveries', authMiddleware, (req, res) => {
  try {
    const deliveries = db.prepare(`
      SELECT * FROM webhook_deliveries
      WHERE inbox_id = ?
      ORDER BY received_at DESC
      LIMIT 100
    `).all(req.params.id);

    // Parse JSON headers/query for client
    for (const d of deliveries) {
      try { d.headers = JSON.parse(d.headers); } catch {}
      try { d.query_params = JSON.parse(d.query_params); } catch {}
    }

    res.json({ deliveries });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// System Overview Metrics
app.get('/api/metrics/summary', (req, res) => {
  try {
    const totalMonitors = db.prepare(`SELECT COUNT(*) as count FROM monitors`).get().count;
    const healthyCount = db.prepare(`SELECT COUNT(*) as count FROM monitors WHERE current_state = 'HEALTHY'`).get().count;
    const degradedCount = db.prepare(`SELECT COUNT(*) as count FROM monitors WHERE current_state = 'DEGRADED'`).get().count;
    const downCount = db.prepare(`SELECT COUNT(*) as count FROM monitors WHERE current_state = 'DOWN'`).get().count;
    const openIncidents = db.prepare(`SELECT COUNT(*) as count FROM incidents WHERE status = 'OPEN'`).get().count;
    const totalChecks = db.prepare(`SELECT COUNT(*) as count FROM execution_logs`).get().count;
    const totalWebhooks = db.prepare(`SELECT COUNT(*) as count FROM webhook_deliveries`).get().count;

    const avgLatency = db.prepare(`SELECT AVG(latency_ms) as avg FROM execution_logs`).get().avg || 0;

    res.json({
      totalMonitors,
      healthyCount,
      degradedCount,
      downCount,
      openIncidents,
      totalChecks,
      totalWebhooks,
      avgLatency: Math.round(avgLatency),
      systemUptimePercent: totalMonitors > 0 ? Number(((healthyCount / totalMonitors) * 100).toFixed(1)) : 100
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fallback middleware for Single Page Application
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(clientDistPath, 'index.html'));
  }
  next();
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 DevPulse Synthetics Server running on http://localhost:${PORT}`);
});

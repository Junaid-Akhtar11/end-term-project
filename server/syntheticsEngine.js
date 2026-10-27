const axios = require('axios');
const crypto = require('crypto');
const { db } = require('./database');
const { evaluateAllAssertions } = require('./assertionEngine');

class SyntheticsScheduler {
  constructor(wsBroadcaster) {
    this.wsBroadcaster = wsBroadcaster;
    this.activeTimers = new Map();
    this.isRunning = false;
  }

  start() {
    this.isRunning = true;
    console.log('[Synthetics Engine] Starting scheduler loop...');
    this.syncMonitors();
    // Re-sync monitor schedule every 30 seconds in case intervals changed
    this.syncInterval = setInterval(() => {
      if (this.isRunning) this.syncMonitors();
    }, 30000);
  }

  stop() {
    this.isRunning = false;
    for (const [id, timer] of this.activeTimers.entries()) {
      clearInterval(timer);
    }
    this.activeTimers.clear();
    if (this.syncInterval) clearInterval(this.syncInterval);
    console.log('[Synthetics Engine] Stopped scheduler.');
  }

  syncMonitors() {
    try {
      const activeMonitors = db.prepare(`SELECT * FROM monitors WHERE status = 'ACTIVE'`).all();
      const currentIds = new Set(activeMonitors.map(m => m.id));

      // Remove inactive or deleted timers
      for (const [id, timer] of this.activeTimers.entries()) {
        if (!currentIds.has(id)) {
          clearInterval(timer);
          this.activeTimers.delete(id);
        }
      }

      // Schedule new or updated monitors
      for (const monitor of activeMonitors) {
        if (!this.activeTimers.has(monitor.id)) {
          const intervalMs = Math.max((monitor.interval_sec || 30) * 1000, 5000); // minimum 5s safe guard
          const timer = setInterval(() => {
            this.executeCheck(monitor.id);
          }, intervalMs);

          this.activeTimers.set(monitor.id, timer);

          // Trigger immediate initial check if not run recently
          const lastRun = monitor.last_run_at ? new Date(monitor.last_run_at).getTime() : 0;
          if (Date.now() - lastRun > intervalMs) {
            setTimeout(() => this.executeCheck(monitor.id), Math.random() * 2000);
          }
        }
      }
    } catch (err) {
      console.error('[Synthetics Engine] Error syncing monitors:', err.message);
    }
  }

  triggerImmediateCheck(monitorId) {
    return this.executeCheck(monitorId);
  }

  async executeCheck(monitorId) {
    const monitor = db.prepare(`SELECT * FROM monitors WHERE id = ?`).get(monitorId);
    if (!monitor) return null;

    const assertions = db.prepare(`SELECT * FROM assertions WHERE monitor_id = ?`).all(monitorId);

    const startTime = Date.now();
    let statusCode = null;
    let responseData = null;
    let responseHeaders = {};
    let responseSize = 0;
    let errorMessage = null;

    try {
      let headers = {};
      try {
        headers = JSON.parse(monitor.headers || '{}');
      } catch {
        headers = {};
      }

      headers['User-Agent'] = 'DevPulse-Synthetic-Engine/2.0';

      const config = {
        method: monitor.method || 'GET',
        url: monitor.url,
        headers,
        timeout: monitor.timeout_ms || 5000,
        validateStatus: () => true // Allow all status codes so we can record and assert them
      };

      if (['POST', 'PUT', 'PATCH'].includes(monitor.method) && monitor.body) {
        config.data = monitor.body;
      }

      const response = await axios(config);
      statusCode = response.status;
      responseData = response.data;
      responseHeaders = response.headers;
      responseSize = JSON.stringify(responseData || '').length;
    } catch (err) {
      if (err.response) {
        statusCode = err.response.status;
        responseData = err.response.data;
        responseHeaders = err.response.headers;
      } else {
        errorMessage = err.message;
      }
    }

    const latencyMs = Date.now() - startTime;

    // Evaluate assertions
    const evaluation = evaluateAllAssertions(assertions, {
      statusCode,
      latencyMs,
      headers: responseHeaders,
      data: responseData,
      expectedStatus: monitor.expected_status
    });

    const isSuccess = !errorMessage && evaluation.allPassed;
    const logId = 'log_' + crypto.randomUUID().slice(0, 8);
    const nowIso = new Date().toISOString();

    let preview = '';
    if (responseData) {
      preview = typeof responseData === 'object' ? JSON.stringify(responseData).slice(0, 500) : String(responseData).slice(0, 500);
    }

    // Insert Execution Log
    db.prepare(`
      INSERT INTO execution_logs (
        id, monitor_id, timestamp, latency_ms, status_code, success, error_message,
        response_size_bytes, assertions_summary, response_preview
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      logId,
      monitor.id,
      nowIso,
      latencyMs,
      statusCode,
      isSuccess ? 1 : 0,
      errorMessage || (evaluation.allPassed ? null : 'Assertion condition failed'),
      responseSize,
      JSON.stringify(evaluation.results),
      preview
    );

    // Maintain Rolling 300 logs per monitor to keep performance snappy
    db.prepare(`
      DELETE FROM execution_logs
      WHERE id NOT IN (
        SELECT id FROM execution_logs WHERE monitor_id = ? ORDER BY timestamp DESC LIMIT 300
      ) AND monitor_id = ?
    `).run(monitor.id, monitor.id);

    // State machine & Incident Handling
    this.handleIncidentStateMachine(monitor, isSuccess, errorMessage, evaluation);

    // Update Monitor's last_run_at
    db.prepare(`UPDATE monitors SET last_run_at = ? WHERE id = ?`).run(nowIso, monitor.id);

    const checkResult = {
      logId,
      monitorId: monitor.id,
      timestamp: nowIso,
      latencyMs,
      statusCode,
      success: isSuccess,
      errorMessage: errorMessage || (evaluation.allPassed ? null : 'Assertion check failed'),
      assertions: evaluation.results
    };

    // Broadcast real-time execution via WebSockets
    if (this.wsBroadcaster) {
      this.wsBroadcaster({
        type: 'MONITOR_CHECK_COMPLETED',
        payload: checkResult
      });
    }

    return checkResult;
  }

  handleIncidentStateMachine(monitor, isSuccess, errorMessage, evaluation) {
    const activeIncident = db.prepare(`
      SELECT * FROM incidents WHERE monitor_id = ? AND status = 'OPEN' ORDER BY started_at DESC LIMIT 1
    `).get(monitor.id);

    if (!isSuccess) {
      const consecutiveFailures = (monitor.consecutive_failures || 0) + 1;
      const newState = consecutiveFailures >= 2 ? 'DOWN' : 'DEGRADED';
      const cause = errorMessage || evaluation.results.find(r => !r.passed)?.detail || 'Status check failed';

      db.prepare(`
        UPDATE monitors
        SET current_state = ?, consecutive_failures = ?
        WHERE id = ?
      `).run(newState, consecutiveFailures, monitor.id);

      if (!activeIncident && consecutiveFailures >= 1) {
        // Open new incident
        const incId = 'inc_' + crypto.randomUUID().slice(0, 8);
        db.prepare(`
          INSERT INTO incidents (id, monitor_id, cause, status, failure_count)
          VALUES (?, ?, ?, 'OPEN', ?)
        `).run(incId, monitor.id, cause, consecutiveFailures);

        if (this.wsBroadcaster) {
          this.wsBroadcaster({
            type: 'INCIDENT_TRIGGERED',
            payload: {
              incidentId: incId,
              monitorId: monitor.id,
              monitorName: monitor.name,
              cause,
              startedAt: new Date().toISOString()
            }
          });
        }
      } else if (activeIncident) {
        // Update failure count on active incident
        db.prepare(`
          UPDATE incidents
          SET failure_count = failure_count + 1, cause = ?
          WHERE id = ?
        `).run(cause, activeIncident.id);
      }
    } else {
      // Success check!
      if (monitor.current_state !== 'HEALTHY' || monitor.consecutive_failures > 0) {
        db.prepare(`
          UPDATE monitors
          SET current_state = 'HEALTHY', consecutive_failures = 0
          WHERE id = ?
        `).run(monitor.id);
      }

      if (activeIncident) {
        // Resolve incident
        const resolvedAt = new Date().toISOString();
        db.prepare(`
          UPDATE incidents
          SET status = 'RESOLVED', resolved_at = ?
          WHERE id = ?
        `).run(resolvedAt, activeIncident.id);

        if (this.wsBroadcaster) {
          this.wsBroadcaster({
            type: 'INCIDENT_RESOLVED',
            payload: {
              incidentId: activeIncident.id,
              monitorId: monitor.id,
              monitorName: monitor.name,
              resolvedAt
            }
          });
        }
      }
    }
  }
}

module.exports = SyntheticsScheduler;

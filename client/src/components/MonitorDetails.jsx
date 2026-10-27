import React, { useEffect, useState } from 'react';
import { Play, Activity, Clock, Shield, AlertTriangle, CheckCircle, ArrowLeft, Terminal } from 'lucide-react';
import { getApiUrl } from '../config';

export default function MonitorDetails({ monitorId, onBack, onTriggerCheck }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);

  const loadDetails = async () => {
    try {
      const res = await fetch(getApiUrl(`/api/monitors/${monitorId}`));
      if (!res.ok) throw new Error('Failed to fetch monitor details');
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
    const interval = setInterval(loadDetails, 5000);
    return () => clearInterval(interval);
  }, [monitorId]);

  const handleRunNow = async () => {
    try {
      setRunning(true);
      await onTriggerCheck(monitorId);
      setTimeout(loadDetails, 600);
    } finally {
      setRunning(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="glass-panel" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading synthetic monitor telemetry...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="glass-panel" style={{ padding: 30, color: '#f87171' }}>
        {error || 'Monitor details unavailable'}
      </div>
    );
  }

  const { monitor, metrics, logs, incidents } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} className="btn btn-sm btn-secondary" style={{ padding: '6px 10px' }}>
            <ArrowLeft size={16} /> Back
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{monitor.name}</h2>
              <span className={`badge ${monitor.current_state === 'HEALTHY' ? 'badge-healthy' : 'badge-down'}`}>
                {monitor.current_state}
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
              [{monitor.method}] {monitor.url}
            </div>
          </div>
        </div>

        <button onClick={handleRunNow} disabled={running} className="btn btn-primary">
          <Play size={16} /> {running ? 'Executing Probe...' : 'Trigger Synthetic Probe'}
        </button>
      </div>

      {/* Latency Percentiles & SLA Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <div className="glass-panel" style={{ padding: 16 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>UPTIME SLA</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: 4, color: metrics.uptimePct > 95 ? '#34d399' : '#f87171' }}>
            {metrics.uptimePct}%
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 2 }}>{metrics.totalChecks} Total Probes</div>
        </div>

        <div className="glass-panel" style={{ padding: 16 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>P50 LATENCY (MEDIAN)</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: 4, color: '#3b82f6' }}>
            {metrics.p50Latency} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>ms</span>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 2 }}>Average: {metrics.avgLatency}ms</div>
        </div>

        <div className="glass-panel" style={{ padding: 16 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>P90 LATENCY</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: 4, color: '#f59e0b' }}>
            {metrics.p90Latency} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>ms</span>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 2 }}>90% requests faster than this</div>
        </div>

        <div className="glass-panel" style={{ padding: 16 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>P99 LATENCY</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: 4, color: '#ef4444' }}>
            {metrics.p99Latency} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>ms</span>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 2 }}>Worst-case tail latency</div>
        </div>
      </div>

      {/* Synthetic Assertions Grid */}
      <div className="glass-panel" style={{ padding: 20 }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={18} color="#818cf8" /> Configured Assertions ({monitor.assertions?.length || 0})
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
          {monitor.assertions && monitor.assertions.map(ast => (
            <div key={ast.id} style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>{ast.source}</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                {ast.property ? `${ast.property} ` : ''}{ast.operator} <span style={{ color: '#818cf8' }}>"{ast.target_value}"</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Execution Telemetry Logs Table */}
      <div className="glass-panel" style={{ padding: 20 }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={18} color="#10b981" /> Real-Time Telemetry Logs
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '8px 12px' }}>STATUS</th>
                <th style={{ padding: '8px 12px' }}>HTTP</th>
                <th style={{ padding: '8px 12px' }}>LATENCY</th>
                <th style={{ padding: '8px 12px' }}>ASSERTION RESULTS</th>
                <th style={{ padding: '8px 12px' }}>TIMESTAMP</th>
              </tr>
            </thead>
            <tbody>
              {logs.slice(0, 15).map(log => {
                let parsedAssertions = [];
                try {
                  parsedAssertions = JSON.parse(log.assertions_summary || '[]');
                } catch {}

                return (
                  <tr key={log.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <span className={`badge ${log.success ? 'badge-healthy' : 'badge-down'}`}>
                        {log.success ? 'PASS' : 'FAIL'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: log.status_code >= 400 ? '#f87171' : '#34d399' }}>
                      {log.status_code || 'CONN_ERR'}
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)' }}>
                      {log.latency_ms}ms
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {log.error_message ? (
                        <span style={{ color: '#f87171', fontSize: '0.75rem' }}>{log.error_message}</span>
                      ) : (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {parsedAssertions.map((a, i) => (
                            <span key={i} style={{ fontSize: '0.7rem', padding: '1px 5px', borderRadius: 4, background: a.passed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: a.passed ? '#34d399' : '#f87171' }}>
                              {a.source} {a.operator} {a.targetValue}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Play, Plus, Clock, ExternalLink, ShieldCheck, Trash2, ChevronRight, Activity } from 'lucide-react';

export default function MonitorsList({ monitors, onSelectMonitor, onOpenCreateModal, onTriggerCheck, onDeleteMonitor, selectedMonitorId }) {
  const [filter, setFilter] = useState('ALL');

  const filteredMonitors = monitors.filter(m => {
    if (filter === 'HEALTHY') return m.current_state === 'HEALTHY';
    if (filter === 'ISSUES') return m.current_state !== 'HEALTHY';
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Action Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Synthetic Monitors</h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'rgba(255, 255, 255, 0.06)', padding: '2px 8px', borderRadius: 12 }}>
            {monitors.length} Total
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Filter Pills */}
          <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.04)', borderRadius: 8, padding: 3, border: '1px solid var(--border)' }}>
            {['ALL', 'HEALTHY', 'ISSUES'].map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                style={{
                  background: filter === tab ? 'var(--primary)' : 'transparent',
                  color: filter === tab ? '#ffffff' : 'var(--text-muted)',
                  border: 'none',
                  borderRadius: 6,
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          <button id="add-monitor-btn" onClick={onOpenCreateModal} className="btn btn-sm btn-primary">
            <Plus size={16} /> New Monitor
          </button>
        </div>
      </div>

      {/* Monitors Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 16 }}>
        {filteredMonitors.map(monitor => {
          const isSelected = monitor.id === selectedMonitorId;
          const statusClass = monitor.current_state === 'HEALTHY'
            ? 'badge-healthy'
            : monitor.current_state === 'DEGRADED'
            ? 'badge-degraded'
            : 'badge-down';

          return (
            <div
              key={monitor.id}
              className="glass-panel"
              onClick={() => onSelectMonitor(monitor.id)}
              style={{
                padding: '18px 20px',
                cursor: 'pointer',
                borderColor: isSelected ? 'var(--primary)' : 'var(--border)',
                boxShadow: isSelected ? '0 0 20px var(--primary-glow)' : 'none',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                {/* Title & Status Badge */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>{monitor.name}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span style={{ fontWeight: 600, color: '#818cf8', background: 'rgba(99, 102, 241, 0.1)', padding: '1px 5px', borderRadius: 4 }}>
                        {monitor.method}
                      </span>
                      <span style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={monitor.url}>
                        {monitor.url}
                      </span>
                    </div>
                  </div>

                  <span className={`badge ${statusClass}`}>
                    <span className={`status-dot ${monitor.current_state === 'HEALTHY' ? 'dot-healthy' : 'dot-down'}`} />
                    {monitor.current_state}
                  </span>
                </div>

                {/* Metrics mini row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, margin: '14px 0', padding: '10px 12px', background: 'rgba(0, 0, 0, 0.25)', borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>INTERVAL</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: 2 }}>{monitor.interval_sec}s</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>AVG LATENCY</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: 2 }}>{Math.round(monitor.avg_latency || 0)}ms</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>UPTIME</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: 2, color: monitor.uptime_pct > 95 ? '#34d399' : '#f87171' }}>
                      {monitor.uptime_pct !== null ? `${Number(monitor.uptime_pct).toFixed(1)}%` : '100%'}
                    </div>
                  </div>
                </div>

                {/* Telemetry Sparkbars */}
                {monitor.recentLogs && monitor.recentLogs.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: 4 }}>
                      <span>Recent Executions</span>
                      <span>{monitor.recentLogs.length} runs</span>
                    </div>
                    <div className="telemetry-bars">
                      {monitor.recentLogs.map((log, i) => {
                        const height = Math.min(Math.max((log.latency_ms / 300) * 100, 15), 100);
                        const bg = log.success ? '#10b981' : '#ef4444';
                        return (
                          <div
                            key={i}
                            className="telemetry-bar"
                            title={`Status: ${log.status_code || 'Err'} | Latency: ${log.latency_ms}ms`}
                            style={{ height: `${height}%`, background: bg }}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: 12, marginTop: 4 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  {monitor.assertions ? `${monitor.assertions.length} assertion(s)` : 'Default 2xx check'}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTriggerCheck(monitor.id);
                    }}
                    title="Run Synthetic Test Now"
                    className="btn btn-sm btn-secondary"
                    style={{ padding: '5px 8px' }}
                  >
                    <Play size={13} /> Run
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete monitor "${monitor.name}"?`)) {
                        onDeleteMonitor(monitor.id);
                      }
                    }}
                    title="Delete Monitor"
                    className="btn btn-sm btn-danger"
                    style={{ padding: '5px 8px' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import React from 'react';
import { ShieldAlert, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

export default function IncidentsView({ incidents }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Incident State Machine Timeline</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Automated detection, consecutive failure tracking, and recovery lifecycle</p>
        </div>
      </div>

      {incidents.length === 0 ? (
        <div className="glass-panel" style={{ padding: 40, textAlign: 'center' }}>
          <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Zero Active Incidents</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
            All monitored endpoints and assertion pipelines are passing with 100% operational integrity.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {incidents.map(inc => {
            const isOpen = inc.status === 'OPEN';
            return (
              <div
                key={inc.id}
                className="glass-panel"
                style={{
                  padding: '16px 20px',
                  borderColor: isOpen ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.2)',
                  background: isOpen ? 'rgba(30, 15, 20, 0.6)' : 'rgba(17, 24, 39, 0.7)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className={`badge ${isOpen ? 'badge-down' : 'badge-healthy'}`}>
                        {inc.status}
                      </span>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{inc.monitor_name || 'System Probe'}</h3>
                    </div>

                    <div style={{ marginTop: 8, fontSize: '0.85rem', color: '#fca5a5', fontFamily: 'var(--font-mono)' }}>
                      Failure Root Cause: {inc.cause}
                    </div>

                    <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span>Started: {new Date(inc.started_at).toLocaleTimeString()} ({new Date(inc.started_at).toLocaleDateString()})</span>
                      {inc.resolved_at && (
                        <span style={{ color: '#34d399' }}>
                          Resolved: {new Date(inc.resolved_at).toLocaleTimeString()}
                        </span>
                      )}
                      <span>Probes Failed: {inc.failure_count || 1}</span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                      {inc.id}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

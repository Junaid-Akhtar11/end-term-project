import React from 'react';
import { Activity, CheckCircle2, AlertTriangle, XCircle, Clock, Zap } from 'lucide-react';

export default function MetricsHeader({ summary }) {
  if (!summary) return null;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: 16,
      marginBottom: 24
    }}>
      {/* Overall Health */}
      <div className="glass-panel" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>
          <span>SYSTEM UPTIME</span>
          <Activity size={16} color="#6366f1" />
        </div>
        <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: 8, color: '#ffffff' }}>
          {summary.systemUptimePercent}%
        </div>
        <div style={{ fontSize: '0.75rem', color: summary.systemUptimePercent > 95 ? '#34d399' : '#f87171', marginTop: 4 }}>
          {summary.healthyCount} of {summary.totalMonitors} operational
        </div>
      </div>

      {/* Latency */}
      <div className="glass-panel" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>
          <span>AVERAGE LATENCY</span>
          <Clock size={16} color="#3b82f6" />
        </div>
        <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: 8, color: '#ffffff' }}>
          {summary.avgLatency} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>ms</span>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
          Across all active synthetic probes
        </div>
      </div>

      {/* Total Checks */}
      <div className="glass-panel" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>
          <span>CHECKS EXECUTED</span>
          <Zap size={16} color="#10b981" />
        </div>
        <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: 8, color: '#ffffff' }}>
          {summary.totalChecks}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: 4 }}>
          Automated polling engine
        </div>
      </div>

      {/* Active Incidents */}
      <div className="glass-panel" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>
          <span>OPEN INCIDENTS</span>
          <AlertTriangle size={16} color={summary.openIncidents > 0 ? '#ef4444' : '#10b981'} />
        </div>
        <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: 8, color: summary.openIncidents > 0 ? '#f87171' : '#34d399' }}>
          {summary.openIncidents}
        </div>
        <div style={{ fontSize: '0.75rem', color: summary.openIncidents > 0 ? '#f87171' : '#9ca3af', marginTop: 4 }}>
          {summary.openIncidents > 0 ? 'Action required immediately' : 'All systems nominal'}
        </div>
      </div>
    </div>
  );
}

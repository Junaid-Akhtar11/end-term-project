import React from 'react';
import { Activity, Radio, AlertOctagon, ShieldAlert, Cpu, Sparkles, LogOut, User } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, user, onLogout, onOpenLoginModal, wsConnected, chaosActive, onToggleChaos }) {
  return (
    <header style={{
      borderBottom: '1px solid var(--border)',
      background: 'rgba(9, 13, 22, 0.8)',
      backdropFilter: 'blur(20px)',
      position: 'sticky',
      top: 0,
      zIndex: 50
    }}>
      <div style={{
        maxWidth: 1400,
        margin: '0 auto',
        padding: '14px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 50%, #10b981 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)'
          }}>
            <Activity size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(to right, #ffffff, #c7d2fe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                DevPulse
              </span>
              <span style={{ fontSize: '0.65rem', background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', padding: '2px 6px', borderRadius: 4, fontWeight: 700, border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                SYNTHETICS ENGINE
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Real-Time Health & Webhook Telemetry
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255, 255, 255, 0.03)', padding: 4, borderRadius: 10, border: '1px solid var(--border)' }}>
          <button
            id="tab-monitors-btn"
            onClick={() => setActiveTab('monitors')}
            className={`btn btn-sm ${activeTab === 'monitors' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ border: 'none' }}
          >
            <Activity size={15} /> Synthetic Monitors
          </button>

          <button
            id="tab-incidents-btn"
            onClick={() => setActiveTab('incidents')}
            className={`btn btn-sm ${activeTab === 'incidents' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ border: 'none' }}
          >
            <ShieldAlert size={15} /> Incidents
          </button>

          <button
            id="tab-webhooks-btn"
            onClick={() => setActiveTab('webhooks')}
            className={`btn btn-sm ${activeTab === 'webhooks' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ border: 'none' }}
          >
            <Radio size={15} /> Webhook Inboxes
          </button>
        </nav>

        {/* Live Status & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Chaos Simulator Button */}
          <button
            id="toggle-chaos-btn"
            onClick={onToggleChaos}
            title="Simulate service failure to test incident detection pipeline"
            className={`btn btn-sm ${chaosActive ? 'btn-danger' : 'btn-secondary'}`}
            style={{ fontSize: '0.75rem', gap: 6 }}
          >
            <AlertOctagon size={14} />
            {chaosActive ? 'Chaos Active (503)' : 'Inject Chaos'}
          </button>

          {/* WebSocket Live Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: wsConnected ? '#34d399' : '#f87171' }}>
            <span className={`status-dot ${wsConnected ? 'dot-healthy' : 'dot-down'}`} />
            <span style={{ fontWeight: 600 }}>{wsConnected ? 'LIVE FEED' : 'OFFLINE'}</span>
          </div>

          {/* User Auth Info */}
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderLeft: '1px solid var(--border)', paddingLeft: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(99, 102, 241, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={15} color="#818cf8" />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{user.username}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{user.role}</div>
                </div>
              </div>
              <button onClick={onLogout} title="Log Out" className="btn btn-sm btn-secondary" style={{ padding: '6px' }}>
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button id="login-modal-btn" onClick={onOpenLoginModal} className="btn btn-sm btn-primary">
              Engineer Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

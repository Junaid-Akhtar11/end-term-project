import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import MetricsHeader from './components/MetricsHeader';
import MonitorsList from './components/MonitorsList';
import MonitorDetails from './components/MonitorDetails';
import CreateMonitorModal from './components/CreateMonitorModal';
import IncidentsView from './components/IncidentsView';
import WebhookInboxesView from './components/WebhookInboxesView';
import LoginModal from './components/LoginModal';

export default function App() {
  const [activeTab, setActiveTab] = useState('monitors'); // 'monitors', 'incidents', 'webhooks'
  const [user, setUser] = useState(null);
  const [monitors, setMonitors] = useState([]);
  const [summary, setSummary] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [inboxes, setInboxes] = useState([]);
  const [selectedMonitorId, setSelectedMonitorId] = useState(null);
  const [selectedInboxId, setSelectedInboxId] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [chaosActive, setChaosActive] = useState(false);

  // Initialize Auth
  useEffect(() => {
    const savedToken = localStorage.getItem('devpulse_token');
    if (savedToken) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${savedToken}` }
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.user) setUser(data.user);
        })
        .catch(() => localStorage.removeItem('devpulse_token'));
    }
  }, []);

  // Fetch initial telemetry
  const fetchAllData = useCallback(async () => {
    try {
      const [sumRes, monRes, incRes] = await Promise.all([
        fetch('/api/metrics/summary'),
        fetch('/api/monitors'),
        fetch('/api/incidents')
      ]);

      if (sumRes.ok) setSummary(await sumRes.json());
      if (monRes.ok) {
        const monData = await monRes.json();
        setMonitors(monData.monitors || []);
      }
      if (incRes.ok) {
        const incData = await incRes.json();
        setIncidents(incData.incidents || []);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    }
  }, []);

  const fetchInboxes = useCallback(async () => {
    const token = localStorage.getItem('devpulse_token');
    if (!token) return;
    try {
      const res = await fetch('/api/webhooks/inboxes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setInboxes(data.inboxes || []);
        if (data.inboxes && data.inboxes.length > 0 && !selectedInboxId) {
          setSelectedInboxId(data.inboxes[0].id);
        }
      }
    } catch (err) {
      console.error('Inbox fetch error:', err);
    }
  }, [selectedInboxId]);

  useEffect(() => {
    fetchAllData();
    if (user) fetchInboxes();
    const interval = setInterval(fetchAllData, 10000);
    return () => clearInterval(interval);
  }, [fetchAllData, fetchInboxes, user]);

  // WebSocket live feed
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    let ws = null;

    function connect() {
      try {
        ws = new WebSocket(wsUrl);
        ws.onopen = () => setWsConnected(true);
        ws.onclose = () => {
          setWsConnected(false);
          setTimeout(connect, 3000);
        };
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'MONITOR_CHECK_COMPLETED' || data.type === 'INCIDENT_TRIGGERED' || data.type === 'INCIDENT_RESOLVED') {
              fetchAllData();
            }
          } catch {}
        };
      } catch {
        setWsConnected(false);
      }
    }

    connect();
    return () => {
      if (ws) ws.close();
    };
  }, [fetchAllData]);

  const handleLoginSuccess = (userData, token) => {
    localStorage.setItem('devpulse_token', token);
    setUser(userData);
    fetchInboxes();
    fetchAllData();
  };

  const handleLogout = () => {
    localStorage.removeItem('devpulse_token');
    setUser(null);
  };

  const handleTriggerCheck = async (monitorId) => {
    const token = localStorage.getItem('devpulse_token');
    await fetch(`/api/monitors/${monitorId}/trigger`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    fetchAllData();
  };

  const handleDeleteMonitor = async (monitorId) => {
    const token = localStorage.getItem('devpulse_token');
    if (!token) {
      alert('Please sign in as an engineer to manage monitors.');
      setIsLoginModalOpen(true);
      return;
    }
    await fetch(`/api/monitors/${monitorId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (selectedMonitorId === monitorId) setSelectedMonitorId(null);
    fetchAllData();
  };

  const handleCreateMonitor = async (payload) => {
    const token = localStorage.getItem('devpulse_token');
    if (!token) {
      alert('Please sign in as an engineer to create monitors.');
      setIsLoginModalOpen(true);
      return;
    }
    const res = await fetch('/api/monitors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create monitor');
    }
    fetchAllData();
  };

  const handleCreateInbox = async (name) => {
    const token = localStorage.getItem('devpulse_token');
    if (!token) {
      alert('Please sign in as an engineer to create webhook inboxes.');
      setIsLoginModalOpen(true);
      return;
    }
    const res = await fetch('/api/webhooks/inboxes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ name })
    });
    if (res.ok) fetchInboxes();
  };

  const handleToggleChaos = async () => {
    try {
      const res = await fetch('/api/mock/toggle-chaos', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        setChaosActive(json.mockFailing);
        setTimeout(fetchAllData, 1000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setSelectedMonitorId(null);
        }}
        user={user}
        onLogout={handleLogout}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        wsConnected={wsConnected}
        chaosActive={chaosActive}
        onToggleChaos={handleToggleChaos}
      />

      <main style={{ flex: 1, maxWidth: 1400, width: '100%', margin: '0 auto', padding: '24px 24px 60px' }}>
        {/* System Telemetry Header */}
        <MetricsHeader summary={summary} />

        {/* Dynamic Views */}
        {activeTab === 'monitors' && (
          selectedMonitorId ? (
            <MonitorDetails
              monitorId={selectedMonitorId}
              onBack={() => setSelectedMonitorId(null)}
              onTriggerCheck={handleTriggerCheck}
            />
          ) : (
            <MonitorsList
              monitors={monitors}
              onSelectMonitor={(id) => setSelectedMonitorId(id)}
              onOpenCreateModal={() => {
                if (!user) setIsLoginModalOpen(true);
                else setIsCreateModalOpen(true);
              }}
              onTriggerCheck={handleTriggerCheck}
              onDeleteMonitor={handleDeleteMonitor}
              selectedMonitorId={selectedMonitorId}
            />
          )
        )}

        {activeTab === 'incidents' && (
          <IncidentsView incidents={incidents} />
        )}

        {activeTab === 'webhooks' && (
          <WebhookInboxesView
            inboxes={inboxes}
            onCreateInbox={handleCreateInbox}
            selectedInboxId={selectedInboxId}
            onSelectInbox={(id) => setSelectedInboxId(id)}
          />
        )}
      </main>

      {/* Modals */}
      <CreateMonitorModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateMonitor}
      />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onAuthSuccess={handleLoginSuccess}
      />
    </div>
  );
}

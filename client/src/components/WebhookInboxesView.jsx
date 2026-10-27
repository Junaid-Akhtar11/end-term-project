import React, { useState, useEffect } from 'react';
import { Radio, Plus, Copy, Check, Terminal, Send, ArrowRight } from 'lucide-react';

export default function WebhookInboxesView({ inboxes, onCreateInbox, selectedInboxId, onSelectInbox }) {
  const [copiedToken, setCopiedToken] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [newInboxName, setNewInboxName] = useState('');
  const [testPayload, setTestPayload] = useState('{\n  "event": "payment.succeeded",\n  "amount": 4900,\n  "currency": "usd",\n  "customer": "cus_99423"\n}');
  const [sendingTest, setSendingTest] = useState(false);

  const activeInbox = inboxes.find(i => i.id === selectedInboxId) || inboxes[0];

  useEffect(() => {
    if (activeInbox) {
      loadDeliveries(activeInbox.id);
    }
  }, [activeInbox?.id]);

  const loadDeliveries = async (inboxId) => {
    try {
      const token = localStorage.getItem('devpulse_token');
      const res = await fetch(`/api/webhooks/inboxes/${inboxId}/deliveries`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const json = await res.json();
        setDeliveries(json.deliveries || []);
        if (json.deliveries && json.deliveries.length > 0 && !selectedDelivery) {
          setSelectedDelivery(json.deliveries[0]);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const copyToClipboard = (text, token) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleSendTestWebhook = async () => {
    if (!activeInbox) return;
    try {
      setSendingTest(true);
      let parsed = {};
      try {
        parsed = JSON.parse(testPayload);
      } catch {
        parsed = { raw: testPayload };
      }

      await fetch(`/api/webhooks/capture/${activeInbox.token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed)
      });

      setTimeout(() => loadDeliveries(activeInbox.id), 500);
    } catch (err) {
      alert('Failed to send test webhook: ' + err.message);
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Webhook Inspection & Ingestion Inboxes</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Generate unique HTTP webhook sinks, inspect payloads, headers, and simulate provider events</p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="input-field"
            style={{ width: 220, fontSize: '0.8rem' }}
            placeholder="New Inbox Name..."
            value={newInboxName}
            onChange={(e) => setNewInboxName(e.target.value)}
          />
          <button
            onClick={() => {
              if (newInboxName.trim()) {
                onCreateInbox(newInboxName.trim());
                setNewInboxName('');
              }
            }}
            className="btn btn-sm btn-primary"
          >
            <Plus size={15} /> Create Inbox
          </button>
        </div>
      </div>

      {inboxes.length === 0 ? (
        <div className="glass-panel" style={{ padding: 40, textAlign: 'center' }}>
          <Radio size={36} color="#818cf8" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>No Webhook Inboxes Found</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Create an inbox above or sign in to configure webhook listening endpoints.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
          {/* Inboxes Sidebar List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {inboxes.map(inbox => {
              const isSelected = activeInbox?.id === inbox.id;
              const webhookUrl = `${window.location.origin}/api/webhooks/capture/${inbox.token}`;

              return (
                <div
                  key={inbox.id}
                  className="glass-panel"
                  onClick={() => {
                    onSelectInbox(inbox.id);
                    loadDeliveries(inbox.id);
                  }}
                  style={{
                    padding: '14px 16px',
                    cursor: 'pointer',
                    borderColor: isSelected ? 'var(--primary)' : 'var(--border)',
                    background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-card)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{inbox.name}</h4>
                    <span style={{ fontSize: '0.7rem', background: 'rgba(255, 255, 255, 0.08)', padding: '2px 6px', borderRadius: 10 }}>
                      {inbox.delivery_count || deliveries.length} calls
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, background: 'rgba(0, 0, 0, 0.3)', padding: '6px 8px', borderRadius: 6 }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      .../capture/{inbox.token}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(webhookUrl, inbox.token);
                      }}
                      className="btn btn-sm btn-secondary"
                      style={{ padding: 4 }}
                      title="Copy full webhook capture URL"
                    >
                      {copiedToken === inbox.token ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Test Event Simulator */}
            <div className="glass-panel" style={{ padding: 16, marginTop: 10 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Send size={15} color="#818cf8" /> Webhook Simulator
              </div>
              <textarea
                className="input-field"
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', height: 100, resize: 'none' }}
                value={testPayload}
                onChange={(e) => setTestPayload(e.target.value)}
              />
              <button
                onClick={handleSendTestWebhook}
                disabled={sendingTest}
                className="btn btn-sm btn-primary"
                style={{ width: '100%', marginTop: 8 }}
              >
                {sendingTest ? 'Sending...' : 'Emit Test Webhook'}
              </button>
            </div>
          </div>

          {/* Deliveries & Payload Inspector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="glass-panel" style={{ padding: 18 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>
                Captured Deliveries ({deliveries.length})
              </h3>

              {deliveries.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Awaiting first incoming payload. Send a POST request to your webhook URL or use the simulator.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 14 }}>
                  {/* Delivery list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 420, overflowY: 'auto' }}>
                    {deliveries.map(del => {
                      const isDelSelected = selectedDelivery?.id === del.id;
                      return (
                        <div
                          key={del.id}
                          onClick={() => setSelectedDelivery(del)}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 6,
                            background: isDelSelected ? 'rgba(99, 102, 241, 0.2)' : 'rgba(0, 0, 0, 0.25)',
                            border: `1px solid ${isDelSelected ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)'}`,
                            cursor: 'pointer'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.75rem', color: '#818cf8' }}>{del.method}</span>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
                              {new Date(del.received_at).toLocaleTimeString()}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                            {del.id}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Selected Delivery Details Inspector */}
                  {selectedDelivery && (
                    <div style={{ background: 'rgba(0, 0, 0, 0.4)', borderRadius: 8, padding: 14, border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ffffff' }}>Captured Payload Body</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>IP: {selectedDelivery.ip_address || '127.0.0.1'}</span>
                      </div>

                      <pre className="code-block" style={{ maxHeight: 200, marginBottom: 12 }}>
                        {selectedDelivery.body || '(Empty body)'}
                      </pre>

                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ffffff', display: 'block', marginBottom: 6 }}>
                        Request Headers
                      </span>
                      <pre className="code-block" style={{ maxHeight: 140, fontSize: '0.72rem' }}>
                        {JSON.stringify(selectedDelivery.headers, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

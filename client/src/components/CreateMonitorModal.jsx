import React, { useState } from 'react';
import { X, Plus, Trash2, Check, HelpCircle } from 'lucide-react';

export default function CreateMonitorModal({ isOpen, onClose, onSave }) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState('GET');
  const [intervalSec, setIntervalSec] = useState('15');
  const [timeoutMs, setTimeoutMs] = useState('4000');
  const [expectedStatus, setExpectedStatus] = useState('200');
  const [headers, setHeaders] = useState('');
  const [body, setBody] = useState('');
  const [assertions, setAssertions] = useState([
    { source: 'status', property: '', operator: 'equals', target_value: '200' },
    { source: 'latency', property: '', operator: 'less_than', target_value: '2000' }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const addAssertion = () => {
    setAssertions([...assertions, { source: 'json_body', property: '', operator: 'equals', target_value: '' }]);
  };

  const removeAssertion = (index) => {
    setAssertions(assertions.filter((_, i) => i !== index));
  };

  const updateAssertion = (index, field, val) => {
    const updated = [...assertions];
    updated[index][field] = val;
    setAssertions(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !url.trim()) {
      setError('Please provide both a monitor name and a target URL.');
      return;
    }

    try {
      setLoading(true);
      let parsedHeaders = {};
      if (headers.trim()) {
        try {
          parsedHeaders = JSON.parse(headers);
        } catch {
          throw new Error('Headers must be valid JSON format');
        }
      }

      await onSave({
        name,
        url,
        method,
        interval_sec: Number(intervalSec),
        timeout_ms: Number(timeoutMs),
        expected_status: Number(expectedStatus),
        headers: parsedHeaders,
        body,
        assertions
      });

      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create monitor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: 20
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: 640,
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: 28,
        background: '#0d1527',
        borderColor: 'rgba(99, 102, 241, 0.3)'
      }}>
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Create Synthetic Monitor</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Configure automated HTTP health checks and assertion pipelines</p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 8, color: '#f87171', fontSize: '0.85rem', marginBottom: 16 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Monitor Name */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>Monitor Name</label>
            <input
              id="monitor-name-input"
              className="input-field"
              placeholder="e.g. Stripe Webhook Receiver, User Authentication Service"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Endpoint URL & Method */}
          <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>Method</label>
              <select className="input-field" value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
                <option value="HEAD">HEAD</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>Target URL</label>
              <input
                id="monitor-url-input"
                className="input-field"
                placeholder="https://api.example.com/v1/health or http://localhost:4000/api/mock/health"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Polling Interval & Timeout */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>Interval (seconds)</label>
              <input
                type="number"
                min="5"
                max="3600"
                className="input-field"
                value={intervalSec}
                onChange={(e) => setIntervalSec(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>Timeout (ms)</label>
              <input
                type="number"
                min="500"
                max="30000"
                className="input-field"
                value={timeoutMs}
                onChange={(e) => setTimeoutMs(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>Expected HTTP</label>
              <input
                type="number"
                className="input-field"
                value={expectedStatus}
                onChange={(e) => setExpectedStatus(e.target.value)}
              />
            </div>
          </div>

          {/* Assertion Rules Builder */}
          <div style={{ marginTop: 8, padding: 14, background: 'rgba(0, 0, 0, 0.25)', borderRadius: 10, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div>
                <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Synthetic Assertions Pipeline</span>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Rules validated on every probe execution</p>
              </div>
              <button type="button" onClick={addAssertion} className="btn btn-sm btn-secondary">
                <Plus size={14} /> Add Assertion
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {assertions.map((ast, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '110px 100px 100px 1fr 32px', gap: 6, alignItems: 'center' }}>
                  <select
                    className="input-field"
                    style={{ fontSize: '0.75rem', padding: '6px 8px' }}
                    value={ast.source}
                    onChange={(e) => updateAssertion(idx, 'source', e.target.value)}
                  >
                    <option value="status">Status</option>
                    <option value="latency">Latency (ms)</option>
                    <option value="json_body">JSON Body</option>
                    <option value="header">Header</option>
                  </select>

                  <input
                    className="input-field"
                    style={{ fontSize: '0.75rem', padding: '6px 8px' }}
                    placeholder={ast.source === 'json_body' ? 'key or path' : ast.source === 'header' ? 'header-name' : 'n/a'}
                    disabled={ast.source === 'status' || ast.source === 'latency'}
                    value={ast.property}
                    onChange={(e) => updateAssertion(idx, 'property', e.target.value)}
                  />

                  <select
                    className="input-field"
                    style={{ fontSize: '0.75rem', padding: '6px 8px' }}
                    value={ast.operator}
                    onChange={(e) => updateAssertion(idx, 'operator', e.target.value)}
                  >
                    <option value="equals">equals</option>
                    <option value="contains">contains</option>
                    <option value="less_than">&lt; less than</option>
                    <option value="greater_than">&gt; greater than</option>
                    <option value="regex">regex</option>
                  </select>

                  <input
                    className="input-field"
                    style={{ fontSize: '0.75rem', padding: '6px 8px' }}
                    placeholder="target value"
                    value={ast.target_value}
                    onChange={(e) => updateAssertion(idx, 'target_value', e.target.value)}
                    required
                  />

                  <button
                    type="button"
                    onClick={() => removeAssertion(idx)}
                    style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Modal Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button id="save-monitor-submit" type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Creating...' : 'Deploy Monitor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

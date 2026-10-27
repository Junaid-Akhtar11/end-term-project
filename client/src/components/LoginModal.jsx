import React, { useState } from 'react';
import { X, Lock, Mail, User, Shield } from 'lucide-react';
import { getApiUrl } from '../config';

export default function LoginModal({ isOpen, onClose, onAuthSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('demo_engineer');
  const [email, setEmail] = useState('engineer@devpulse.io');
  const [password, setPassword] = useState('demo12345');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = getApiUrl(isRegister ? '/api/auth/register' : '/api/auth/login');
      const payload = isRegister
        ? { username, email, password }
        : { emailOrUsername: username || email, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      let data = {};
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(text || `Server responded with status ${res.status}`);
      }

      if (!res.ok) throw new Error(data.error || 'Authentication failed');

      onAuthSuccess(data.user, data.token);
      onClose();
    } catch (err) {
      setError(err.message);
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
        maxWidth: 420,
        padding: 28,
        background: '#0d1527',
        borderColor: 'rgba(99, 102, 241, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
              {isRegister ? 'Engineer Registration' : 'Engineer Sign In'}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {isRegister ? 'Create your DevPulse workspace account' : 'Access your synthetics and telemetry console'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 6, color: '#f87171', fontSize: '0.8rem', marginBottom: 14 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 5 }}>
              {isRegister ? 'Username' : 'Username or Email'}
            </label>
            <input
              id="auth-username-input"
              className="input-field"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          {isRegister && (
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 5 }}>Email Address</label>
              <input
                type="email"
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 5 }}>Password</label>
            <input
              id="auth-password-input"
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div style={{ marginTop: 6, padding: '8px 10px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: 6, fontSize: '0.75rem', color: '#a5b4fc' }}>
            💡 Pre-seeded Demo Credentials:<br />
            <strong>demo_engineer</strong> / <strong>demo12345</strong>
          </div>

          <button id="auth-submit-btn" type="submit" disabled={loading} className="btn btn-primary" style={{ marginTop: 8 }}>
            {loading ? 'Authenticating...' : (isRegister ? 'Register Account' : 'Sign In')}
          </button>

          <div style={{ textAlign: 'center', marginTop: 10 }}>
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
              }}
              style={{ background: 'transparent', border: 'none', color: '#818cf8', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
            >
              {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Register"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

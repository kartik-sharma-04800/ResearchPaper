import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
export default function LoginPage() {
  const { login }   = useAuth();
  const navigate    = useNavigate();
  const [form, setForm]     = useState({ email: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [realIP, setRealIP] = useState(null);
  const [ipLoading, setIpLoading] = useState(true);
  useEffect(() => {
    const fetchRealIP = async () => {
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        setRealIP(data.ip);
      } catch (error) {
        console.error('Failed to fetch real IP:', error);
      } finally {
        setIpLoading(false);
      }
    };
    fetchRealIP();
  }, []);
  const [deviceInfo] = useState({
    screenRes: `${window.screen.width}x${window.screen.height}`,
    timezone:  Intl.DateTimeFormat().resolvedOptions().timeZone,
    language:  navigator.language,
    platform:  navigator.platform,
  });
  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authAPI.login({ ...form, deviceInfo });
      const { data } = res;
      if (data.requiresMfa) {
        navigate('/mfa', { state: { userId: data.userId, severity: data.severity, reasons: data.alert?.reasons || [] } });
        return;
      }
      login(data.token, data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="auth-page">
      <div className="auth-visual-panel">
        <div className="auth-visual-grid" />
        <div className="auth-visual-content">
          <div className="auth-visual-icon">🛡️</div>
          <h1 className="auth-visual-title">
            Secure<span>Login</span>
          </h1>
          <p className="auth-visual-desc">
            Advanced AI-powered anomaly detection system protecting your account with real-time threat analysis and behavioral monitoring.
          </p>
          <div className="auth-visual-stats">
            <div className="auth-stat">
              <div className="auth-stat-value">99.9%</div>
              <div className="auth-stat-label">Accuracy</div>
            </div>
            <div className="auth-stat">
              <div className="auth-stat-value">24/7</div>
              <div className="auth-stat-label">Monitoring</div>
            </div>
            <div className="auth-stat">
              <div className="auth-stat-value">AI</div>
              <div className="auth-stat-label">Powered</div>
            </div>
          </div>
        </div>
      </div>
      <div className="auth-form-panel">
        <div className="auth-logo">
          <div className="auth-logo-icon">🛡️</div>
          <div className="auth-logo-text">
            Secure<span>Login</span>
          </div>
        </div>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <h2 className="auth-heading">Welcome back</h2>
          <p className="auth-sub">Sign in to access your secure dashboard</p>
          {error && (
            <div className="alert-banner alert-banner--error">
              <span>⚠️</span> {error}
            </div>
          )}
          <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              className="form-input"
              type="email" name="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              required autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-input"
                type={showPass ? 'text' : 'password'}
                name="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                required
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPass(s => !s)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1rem' }}
              >
                {showPass ? '🙈' : '👁'}
              </button>
            </div>
          </div>
          {}
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 18,
            fontFamily: 'JetBrains Mono', background: 'var(--bg-surface)',
            padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <div style={{ marginBottom: 6, fontWeight: 600, color: 'var(--accent-cyan)' }}>
              🌐 Real IP Detection Active
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span>Local IP:</span>
              <span style={{ color: 'var(--text-secondary)' }}>🏠 ::1 (localhost)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Real IP:</span>
              <span style={{ color: realIP ? 'var(--accent-green)' : 'var(--text-secondary)' }}>
                {ipLoading ? (
                  <><span className="spinner" style={{ width: 10, height: 10, borderWidth: 1, marginRight: 6 }} />Detecting...</>
                ) : realIP ? (
                  <>🌍 {realIP}</>
                ) : (
                  <>❓ Unknown</>
                )}
              </span>
            </div>
            {realIP && (
              <div style={{ marginTop: 6, fontSize: '0.65rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                ✅ System will use real IP ({realIP}) for geolocation & anomaly detection
              </div>
            )}
            <div style={{ marginTop: 4, fontSize: '0.65rem', color: 'var(--text-muted)' }}>
              🔍 Device fingerprint collected for anomaly detection
            </div>
          </div>
            <button className="btn btn--primary btn--full" type="submit" disabled={loading}>
              {loading ? <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Analyzing...</> : '→ Sign In Securely'}
            </button>
          </form>
          <div className="auth-divider">
            <span>or</span>
          </div>
          <div className="auth-link">
            No account? <Link to="/register">Create one</Link>
          </div>
          <div style={{ marginTop: 20, padding: '16px', background: 'rgba(0,212,255,0.06)',
            border: '1px solid rgba(0,212,255,0.2)', borderRadius: 'var(--radius)', fontSize: '0.78rem' }}>
            <div style={{ color: 'var(--accent)', fontWeight: 700, marginBottom: 10, fontFamily: 'var(--font-mono)', fontSize: '0.7rem', letterSpacing: '1px' }}>
              🔑 DEMO CREDENTIALS
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', color: 'var(--text2)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
              <span style={{ color: 'var(--text)' }}>Test User</span>
              <span style={{ color: 'var(--accent)' }}>test@demo.com / test123</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

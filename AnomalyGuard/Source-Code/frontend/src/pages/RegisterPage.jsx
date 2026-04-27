import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
export default function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm]       = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);
  const [serverErr, setServerErr] = useState('');
  const validate = () => {
    const e = {};
    if (!form.name || form.name.trim().length < 2) e.name = 'Name must be at least 2 characters';
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.password || form.password.length < 6) e.password = 'Password must be at least 6 characters';
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match';
    return e;
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true); setServerErr('');
    try {
      const { data } = await authAPI.register({ name: form.name, email: form.email, password: form.password });
      if (data.success) { login(data.token, data.user); navigate('/dashboard'); }
    } catch (err) {
      setServerErr(err.response?.data?.message || 'Registration failed.');
    } finally { setLoading(false); }
  };
  const set = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors(x => ({ ...x, [field]: '' }));
    setServerErr('');
  };
  return (
    <div className="auth-page">
      <div className="auth-panel auth-panel--visual">
        <div className="auth-visual-grid" />
        <div className="auth-visual-content">
          <div className="auth-visual-icon">🔐</div>
          <h2 className="auth-visual-title">
            Your account,<br /><span>intelligently protected</span>
          </h2>
          <p className="auth-visual-desc">
            The system learns your unique login patterns — time of day, location, device —
            and silently watches for anything that doesn't fit. No rules. Pure machine learning.
          </p>
          <div className="auth-visual-stats">
            <div className="auth-stat"><div className="auth-stat-value">≥30</div><div className="auth-stat-label">Logins to train</div></div>
            <div className="auth-stat"><div className="auth-stat-value">6</div><div className="auth-stat-label">Feature dims</div></div>
            <div className="auth-stat"><div className="auth-stat-value">ISO</div><div className="auth-stat-label">Forest algo</div></div>
          </div>
        </div>
      </div>
      <div className="auth-panel">
        <div className="auth-form-panel">
          <div className="auth-logo">
            <span className="auth-logo-icon">🛡️</span>
            <span className="auth-logo-text">Anomaly<span>Guard</span></span>
          </div>
          <h1 className="auth-heading">Create account</h1>
          <p className="auth-sub">Your behaviour profile builds automatically after first login</p>
          {serverErr && (
            <div className="alert-banner alert-banner--error" style={{ width: '100%' }}>
              <span>⚠️</span> {serverErr}
            </div>
          )}
          <form onSubmit={handleSubmit} style={{ width: '100%' }}>
            <div className="form-group">
              <label className="form-label">Full name</label>
              <input className={`form-input${errors.name ? ' form-input--error' : ''}`}
                placeholder="Alex Johnson" value={form.name} onChange={set('name')} autoFocus />
              {errors.name && <div className="form-error">⚠ {errors.name}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input className={`form-input${errors.email ? ' form-input--error' : ''}`}
                type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} />
              {errors.email && <div className="form-error">⚠ {errors.email}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className={`form-input${errors.password ? ' form-input--error' : ''}`}
                type="password" placeholder="Min. 6 characters" value={form.password} onChange={set('password')} />
              {errors.password && <div className="form-error">⚠ {errors.password}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Confirm password</label>
              <input className={`form-input${errors.confirm ? ' form-input--error' : ''}`}
                type="password" placeholder="Repeat password" value={form.confirm} onChange={set('confirm')} />
              {errors.confirm && <div className="form-error">⚠ {errors.confirm}</div>}
            </div>
            <button className="btn btn--primary btn--full" type="submit" disabled={loading}>
              {loading ? <><div className="btn-spinner" /> Creating account…</> : '→ Create Account'}
            </button>
          </form>
          <p className="auth-link">Already have an account? <Link to="/login">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
}

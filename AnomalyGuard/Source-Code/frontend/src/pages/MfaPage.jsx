import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
export default function MfaPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { login } = useAuth();
  const state = location.state || {};
  const { userId, severity = 'low', reasons = [] } = state;
  const [digits, setDigits]   = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [resent, setResent]   = useState(false);
  const inputRefs = useRef([]);
  useEffect(() => {
    if (!userId) navigate('/login');
    inputRefs.current[0]?.focus();
  }, [userId, navigate]);
  const handleDigit = (i, val) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...digits];
    next[i] = val.slice(-1);
    setDigits(next);
    setError('');
    if (val && i < 5) inputRefs.current[i + 1]?.focus();
    if (val && i === 5) {
      const code = [...next.slice(0, 5), val.slice(-1)].join('');
      if (code.length === 6) submitCode(code);
    }
  };
  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  };
  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(''));
      submitCode(pasted);
    }
  };
  const submitCode = async (code) => {
    setLoading(true); setError('');
    try {
      const { data } = await authAPI.verifyMfa({ userId, code });
      if (data.success) {
        login(data.token, data.user);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed');
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally { setLoading(false); }
  };
  const handleResend = async () => {
    try {
      await authAPI.resendMfa?.({ userId });
      setResent(true);
      setTimeout(() => setResent(false), 5000);
    } catch { setError('Could not resend code'); }
  };
  const handleManualSubmit = () => {
    const code = digits.join('');
    if (code.length < 6) { setError('Please enter all 6 digits'); return; }
    submitCode(code);
  };
  return (
    <div className="mfa-page">
      <div className="mfa-card">
        <div className="mfa-icon">{severity === 'high' ? '🚨' : '🔐'}</div>
        <h1 className="mfa-title">Verify your identity</h1>
        <p className="mfa-desc">
          A 6-digit verification code has been sent to your email address.
          This is required because unusual login activity was detected.
        </p>
        {}
        {severity && (
          <div className={`mfa-alert mfa-alert--${severity}`}>
            <span>{severity === 'high' ? '🚨' : '⚠️'}</span>
            <div>
              <strong>{severity === 'high' ? 'High-risk' : 'Suspicious'} login detected.</strong>
              {reasons.length > 0 && (
                <ul style={{ marginTop: 6, paddingLeft: 16 }}>
                  {reasons.map((r, i) => <li key={i} style={{ fontSize: 12, marginBottom: 2 }}>{r}</li>)}
                </ul>
              )}
            </div>
          </div>
        )}
        {error && (
          <div className="alert-banner alert-banner--error" style={{ marginBottom: 16 }}>
            ⚠️ {error}
          </div>
        )}
        {resent && (
          <div className="alert-banner alert-banner--success" style={{ marginBottom: 16 }}>
            ✅ New code sent to your email
          </div>
        )}
        {}
        <div className="mfa-inputs" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={el => inputRefs.current[i] = el}
              className={`mfa-digit${d ? ' mfa-digit--filled' : ''}`}
              type="text" inputMode="numeric" maxLength={1}
              value={d}
              onChange={e => handleDigit(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              disabled={loading}
            />
          ))}
        </div>
        <button className="btn btn--primary btn--full" onClick={handleManualSubmit} disabled={loading || digits.join('').length < 6}>
          {loading ? <><div className="btn-spinner" /> Verifying…</> : '✓ Verify Code'}
        </button>
        <div className="mfa-resend">
          Didn't receive it?{' '}
          <button onClick={handleResend} disabled={loading}>Resend code</button>
        </div>
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <Link to="/login" style={{ fontSize: 13, color: 'var(--text3)' }}>← Back to login</Link>
        </div>
      </div>
    </div>
  );
}

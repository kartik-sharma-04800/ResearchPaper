import React, { useState, useEffect, useCallback } from 'react';
import { alertAPI } from '../services/api';
function AlertCard({ alert, onResolve }) {
  const snap = alert.snapshot || {};
  const isHigh = alert.severity === 'high';
  return (
    <div style={{
      background: 'var(--bg2)', 
      border: `1px solid ${isHigh ? 'rgba(239,68,68,.4)' : 'rgba(245,158,11,.4)'}`,
      borderRadius: 'var(--radius-lg)', 
      padding: 24, 
      marginBottom: 16,
      borderLeft: `4px solid ${isHigh ? 'var(--red)' : 'var(--yellow)'}`,
      opacity: alert.resolved ? .6 : 1,
      transition: 'var(--transition)',
      boxShadow: alert.resolved ? 'none' : '0 2px 12px rgba(0,0,0,.2)'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
            <span className={`badge badge--${alert.severity}`} style={{ fontSize: 12, padding: '5px 12px' }}>
              {isHigh ? '🚨' : '⚠️'} {alert.severity} severity
            </span>
            {alert.resolved && <span className="badge badge--normal">✓ Resolved</span>}
            <span className="badge badge--none">{alert.action?.replace('_', ' ')}</span>
            {alert.emailSent && <span style={{ fontSize: 11, color: 'var(--text3)' }}>📧 Email sent</span>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 12 }}>
            {[
              { icon: '🌐', label: 'IP',       val: snap.ipAddress },
              { icon: '🌍', label: 'Location', val: snap.city && snap.city !== 'unknown' ? `${snap.city}, ${snap.country}` : snap.country },
              { icon: '💻', label: 'Device',   val: snap.device },
              { icon: '🌐', label: 'Browser',  val: snap.browser },
            ].map(({ icon, label, val }) => val && (
              <div key={label} style={{ fontSize: 13, background: 'var(--bg3)', padding: '8px 12px', borderRadius: 'var(--radius)' }}>
                <span style={{ color: 'var(--text3)' }}>{icon} {label}: </span>
                <span style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{val}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12 }}>
            {alert.reasons?.map((r, i) => <span key={i} className="reason-tag">{r}</span>)}
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 20, fontSize: 12, color: 'var(--text3)' }}>
            <span>ML Score: <span style={{ fontFamily: 'var(--font-mono)', color: isHigh ? 'var(--red)' : 'var(--yellow)', fontWeight: 600 }}>
              {alert.score?.toFixed(4)}
            </span></span>
            <span>Detected: {new Date(alert.createdAt).toLocaleString()}</span>
          </div>
        </div>
        {!alert.resolved && (
          <button className="btn btn--ghost btn--sm" onClick={() => onResolve(alert._id)}>
            ✓ Resolve
          </button>
        )}
      </div>
    </div>
  );
}
export default function AlertsPage() {
  const [alerts,  setAlerts]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('unresolved');
  const [resolving, setResolving] = useState(false);
  const [msg, setMsg]         = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await alertAPI.getUnresolved();
      setAlerts(data.data || []);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const handleResolve = async (id) => {
    try {
      await alertAPI.resolve(id);
      setAlerts(a => a.map(x => x._id === id ? { ...x, resolved: true } : x));
      setMsg('✅ Alert resolved');
      setTimeout(() => setMsg(''), 3000);
    } catch { setMsg('❌ Failed to resolve'); }
  };
  const handleResolveAll = async () => {
    if (!window.confirm('Resolve all unresolved alerts?')) return;
    setResolving(true);
    try {
      await alertAPI.resolveAll();
      setAlerts(a => a.map(x => ({ ...x, resolved: true })));
      setMsg('✅ All alerts resolved');
      setTimeout(() => setMsg(''), 3000);
    } finally { setResolving(false); }
  };
  const displayed = filter === 'all' ? alerts : alerts.filter(a => !a.resolved);
  const unresolvedCount = alerts.filter(a => !a.resolved).length;
  const highCount = alerts.filter(a => a.severity === 'high' && !a.resolved).length;
  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Security Alerts</h1>
          <p className="page-sub">
            {unresolvedCount} unresolved · {highCount} high severity
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {unresolvedCount > 0 && (
            <button className="btn btn--ghost btn--sm" onClick={handleResolveAll} disabled={resolving}>
              {resolving ? <><div className="btn-spinner" />Resolving…</> : '✓ Resolve All'}
            </button>
          )}
          <button className="btn btn--ghost btn--sm" onClick={load}>↻ Refresh</button>
        </div>
      </div>
      <div className="page-body">
        {msg && (
          <div className={`alert-banner ${msg.startsWith('✅') ? 'alert-banner--success' : 'alert-banner--error'}`}>
            {msg}
          </div>
        )}
        {}
        <div className="stats-grid" style={{ marginBottom: 20 }}>
          <div className="stat-card stat-card--red">
            <div className="stat-icon">🚨</div>
            <div className="stat-label">High Severity</div>
            <div className="stat-value stat-value--red">{alerts.filter(a => a.severity==='high').length}</div>
          </div>
          <div className="stat-card stat-card--yellow">
            <div className="stat-icon">⚠️</div>
            <div className="stat-label">Low Severity</div>
            <div className="stat-value stat-value--yellow">{alerts.filter(a => a.severity==='low').length}</div>
          </div>
          <div className="stat-card stat-card--green">
            <div className="stat-icon">✅</div>
            <div className="stat-label">Resolved</div>
            <div className="stat-value stat-value--green">{alerts.filter(a => a.resolved).length}</div>
          </div>
          <div className="stat-card stat-card--blue">
            <div className="stat-icon">📧</div>
            <div className="stat-label">Emails Sent</div>
            <div className="stat-value stat-value--blue">{alerts.filter(a => a.emailSent).length}</div>
          </div>
        </div>
        {}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {['unresolved', 'all'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`btn btn--sm ${filter === f ? 'btn--primary' : 'btn--ghost'}`}>
              {f === 'unresolved' ? `Unresolved (${unresolvedCount})` : `All (${alerts.length})`}
            </button>
          ))}
        </div>
        {loading ? (
          <div className="page-loading"><div className="spinner" /><span>Loading alerts…</span></div>
        ) : displayed.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🛡️</div>
            <div className="empty-state-title">
              {filter === 'unresolved' ? 'No active alerts' : 'No alerts found'}
            </div>
            <div className="empty-state-desc">
              {filter === 'unresolved' ? 'All security alerts have been resolved.' : 'Login events have not triggered any alerts yet.'}
            </div>
          </div>
        ) : (
          displayed.map(alert => (
            <AlertCard key={alert._id} alert={alert} onResolve={handleResolve} />
          ))
        )}
      </div>
    </>
  );
}

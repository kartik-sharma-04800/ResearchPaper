import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { userAPI, anomalyAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg]         = useState('');
  const [mlHealth, setMlHealth] = useState(null);
  useEffect(() => {
    if (user?.role !== 'admin') { navigate('/dashboard'); return; }
    load();
  }, [user, navigate]);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, mlRes] = await Promise.allSettled([
        userAPI.getAllUsers(),
        anomalyAPI.mlHealth(),
      ]);
      if (uRes.status  === 'fulfilled') setUsers(uRes.value.data.data || []);
      if (mlRes.status === 'fulfilled') setMlHealth(mlRes.value.data.data);
    } finally { setLoading(false); }
  }, []);
  const handleToggleSuspend = async (id, currentlySuspended) => {
    const action = currentlySuspended ? 'Unsuspend' : 'Suspend';
    if (!window.confirm(`${action} this user?`)) return;
    try {
      await userAPI.toggleSuspend(id);
      setUsers(u => u.map(x => x._id === id ? { ...x, isSuspended: !x.isSuspended } : x));
      setMsg(`✅ User ${action.toLowerCase()}ed`);
      setTimeout(() => setMsg(''), 3000);
    } catch { setMsg('❌ Action failed'); }
  };
  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Panel</h1>
          <p className="page-sub">System overview and user management</p>
        </div>
        <button className="btn btn--ghost btn--sm" onClick={load}>↻ Refresh</button>
      </div>
      <div className="page-body">
        {msg && (
          <div className={`alert-banner ${msg.startsWith('✅') ? 'alert-banner--success' : 'alert-banner--error'}`}>{msg}</div>
        )}
        {}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-title">🤖 ML Service Status</div>
          {mlHealth ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
              {[
                { label: 'Status',         value: mlHealth.online ? '🟢 Online' : '🔴 Offline' },
                { label: 'Models in RAM',  value: mlHealth.models_memory ?? '—' },
                { label: 'Models on Disk', value: mlHealth.models_disk   ?? '—' },
                { label: 'Anomaly Thresh', value: mlHealth.thresholds?.anomaly ?? '—' },
                { label: 'High Thresh',    value: mlHealth.thresholds?.high    ?? '—' },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: 'var(--bg3)', borderRadius: 'var(--radius)', padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: 'var(--accent)' }}>{String(value)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--text3)', fontSize: 14 }}>
              {loading ? 'Loading…' : '⚠️ ML service status unavailable. Ensure Python service is running on port 8000.'}
            </div>
          )}
        </div>
        {}
        <div className="card">
          <div className="card-title">👥 User Management ({users.length} users)</div>
          {loading ? (
            <div className="page-loading"><div className="spinner" /></div>
          ) : users.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👤</div>
              <div className="empty-state-title">No users found</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Total Logins</th>
                    <th>Last Login</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accent-dim)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>
                            {u.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </div>
                          {u.name}
                        </div>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{u.email}</td>
                      <td>
                        <span className={`badge ${u.role === 'admin' ? 'badge--low' : 'badge--none'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{u.loginCount ?? 0}</td>
                      <td style={{ fontSize: 12 }}>
                        {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : '—'}
                      </td>
                      <td>
                        <span className={`badge ${u.isSuspended ? 'badge--failed' : 'badge--normal'}`}>
                          {u.isSuspended ? '● Suspended' : '● Active'}
                        </span>
                      </td>
                      <td style={{ fontSize: 12 }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td>
                        {u._id !== user?._id && (
                          <button
                            className={`btn btn--sm ${u.isSuspended ? 'btn--ghost' : 'btn--danger'}`}
                            onClick={() => handleToggleSuspend(u._id, u.isSuspended)}>
                            {u.isSuspended ? 'Unsuspend' : 'Suspend'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {}
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-title">ℹ️ System Architecture</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {[
              { label: 'Frontend',   value: 'React 18 + Recharts', icon: '⚛️' },
              { label: 'Backend',    value: 'Node.js + Express MVC', icon: '🟢' },
              { label: 'ML Engine',  value: 'Python Flask + scikit-learn', icon: '🐍' },
              { label: 'Algorithm',  value: 'Isolation Forest + K-Means', icon: '🤖' },
              { label: 'Database',   value: 'MongoDB + Mongoose', icon: '🍃' },
              { label: 'Auth',       value: 'JWT + bcrypt + MFA', icon: '🔐' },
            ].map(({ label, value, icon }) => (
              <div key={label} style={{ background: 'var(--bg3)', borderRadius: 'var(--radius)', padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 20 }}>{icon}</span>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

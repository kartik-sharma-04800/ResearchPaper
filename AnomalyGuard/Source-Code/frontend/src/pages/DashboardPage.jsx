import React, { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { anomalyAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:8, padding:'10px 14px', fontSize:12 }}>
      <div style={{ color:'var(--text2)', marginBottom:6 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color:p.color, display:'flex', gap:8, justifyContent:'space-between' }}>
          <span style={{ textTransform:'capitalize' }}>{p.dataKey}</span>
          <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
};
function ScoreBar({ score }) {
  if (score === null || score === undefined)
    return <span style={{ color:'var(--text3)', fontSize:12 }}>N/A</span>;
  const pct   = Math.max(0, Math.min(100, ((score + 1) / 2) * 100));
  const color = score <= -0.40 ? 'var(--red)' : score <= -0.15 ? 'var(--yellow)' : 'var(--green)';
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:100 }}>
      <div style={{ flex:1, height:5, background:'var(--bg3)', borderRadius:3, overflow:'hidden' }}>
        <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:3, transition:'width .5s' }} />
      </div>
      <span style={{ fontSize:11, fontFamily:'var(--font-mono)', color, minWidth:42 }}>
        {score.toFixed(3)}
      </span>
    </div>
  );
}
export default function DashboardPage() {
  const { user } = useAuth();
  const [stats,    setStats]    = useState(null);
  const [history,  setHistory]  = useState([]);
  const [mlStatus, setMlStatus] = useState(null);
  const [loading,  setLoading]  = useState(true);
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
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, hRes, mlRes] = await Promise.allSettled([
        anomalyAPI.getStats(),
        anomalyAPI.getLoginHistory({ limit: 10, page: 1 }),
        anomalyAPI.mlHealth(),
      ]);
      if (sRes.status  === 'fulfilled') setStats(sRes.value.data.data);
      if (hRes.status  === 'fulfilled') setHistory(hRes.value.data.data || []);
      if (mlRes.status === 'fulfilled') setMlStatus(mlRes.value.data.data);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const timelineData = stats?.last7Days || [];
  const pieData = stats ? [
    { name: 'Normal',    value: Math.max(0, (stats.totalLogins || 0) - (stats.anomalyCount || 0)) },
    { name: 'Low Risk',  value: stats.lowSeverity  || 0 },
    { name: 'High Risk', value: stats.highSeverity || 0 },
  ].filter(d => d.value > 0) : [];
  const PIE_COLORS = ['#10b981', '#f59e0b', '#ef4444'];
  if (loading) return (
    <div className="page-loading">
      <div className="spinner" />
      <span>Loading dashboard…</span>
    </div>
  );
  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">Welcome back, {user?.name} — security overview</p>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          {mlStatus !== null && (
            <span className={`badge ${mlStatus.online ? 'badge--online' : 'badge--offline'}`}>
              <span className="badge-dot" />
              ML {mlStatus.online ? 'Online' : 'Offline'}
            </span>
          )}
          <button className="btn btn--ghost btn--sm" onClick={load}>↻ Refresh</button>
        </div>
      </div>
      <div className="page-body">
        {}
        <div className="stats-grid">
          {[
            { color:'blue',   icon:'🔑', label:'Total Logins',      value: stats?.totalLogins      ?? '—', delta:'all time' },
            { color:'green',  icon:'✅', label:'Normal Logins',      value: stats ? (stats.totalLogins||0)-(stats.anomalyCount||0) : '—', delta:'no anomaly' },
            { color:'yellow', icon:'⚠️', label:'Anomalies Detected', value: stats?.anomalyCount     ?? '—', delta:'flagged by ML' },
            { color:'red',    icon:'🚨', label:'Active Alerts',      value: stats?.unresolvedAlerts ?? '—', delta:'need review' },
          ].map(({ color, icon, label, value, delta }) => (
            <div key={label} className={`stat-card stat-card--${color}`}>
              <div className="stat-icon">{icon}</div>
              <div className="stat-label">{label}</div>
              <div className={`stat-value stat-value--${color}`}>{value}</div>
              <div className="stat-delta">{delta}</div>
            </div>
          ))}
          {}
          <div className="stat-card stat-card--purple" style={{ gridColumn: 'span 2' }}>
            <div className="stat-icon">🌐</div>
            <div className="stat-label">Real IP Detection</div>
            <div className="stat-value stat-value--purple" style={{ fontSize: '0.9rem', fontFamily: 'var(--font-mono)' }}>
              {ipLoading ? (
                <><span className="spinner" style={{ width: 12, height: 12, borderWidth: 2, marginRight: 8 }} />Detecting...</>
              ) : realIP ? (
                <>🌍 {realIP}</>
              ) : (
                <>❓ Unknown</>
              )}
            </div>
            <div className="stat-delta" style={{ fontSize: '0.7rem', color: 'var(--text3)' }}>
              {realIP ? `Using real IP for geolocation & anomaly detection` : 'Detecting external IP...'}
            </div>
          </div>
        </div>
        {}
        <div className="chart-grid">
          {}
          <div className="card">
            <div className="card-title">📈 Login Activity — Last 7 Days</div>
            <div className="chart-wrap" style={{ height:220 }}>
              {timelineData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timelineData} margin={{ top:5, right:10, left:-20, bottom:0 }}>
                    <defs>
                      <linearGradient id="gNormal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="gAnom" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                    <XAxis dataKey="date" tick={{ fill:'var(--text3)', fontSize:11 }}/>
                    <YAxis tick={{ fill:'var(--text3)', fontSize:11 }} allowDecimals={false}/>
                    <Tooltip content={<CustomTooltip />}/>
                    <Area type="monotone" dataKey="logins"    name="logins"    stroke="#10b981" fill="url(#gNormal)" strokeWidth={2}/>
                    <Area type="monotone" dataKey="anomalies" name="anomalies" stroke="#ef4444" fill="url(#gAnom)"   strokeWidth={2}/>
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state" style={{ padding:'40px 0' }}>
                  <div className="empty-state-icon" style={{ fontSize:32 }}>📊</div>
                  <div className="empty-state-desc">No data in last 7 days</div>
                </div>
              )}
            </div>
          </div>
          {}
          <div className="card">
            <div className="card-title">🍩 Login Risk Distribution</div>
            <div className="chart-wrap" style={{ height:220 }}>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                      dataKey="value" paddingAngle={4}>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:8, fontSize:12 }}
                      formatter={(v, n) => [v, n]}
                    />
                    <Legend wrapperStyle={{ fontSize:12, color:'var(--text2)' }}/>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state" style={{ padding:'40px 0' }}>
                  <div className="empty-state-icon" style={{ fontSize:32 }}>📊</div>
                  <div className="empty-state-desc">No login data yet</div>
                </div>
              )}
            </div>
          </div>
        </div>
        {}
        {stats?.hourHistogram?.some(v => v > 0) && (
          <div className="card" style={{ marginBottom:24 }}>
            <div className="card-title">🕐 Login Activity by Hour of Day</div>
            <div style={{ height:160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats.hourHistogram.map((v, i) => ({ hour:`${i}h`, logins:v }))}
                  margin={{ top:5, right:10, left:-20, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                  <XAxis dataKey="hour" tick={{ fill:'var(--text3)', fontSize:10 }} interval={1}/>
                  <YAxis tick={{ fill:'var(--text3)', fontSize:11 }} allowDecimals={false}/>
                  <Tooltip content={<CustomTooltip />}/>
                  <Bar dataKey="logins" fill="var(--accent)" radius={[3,3,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        {}
        <div className="card">
          <div className="card-title" style={{ justifyContent:'space-between' }}>
            <span>🕐 Recent Login Events</span>
            <a href="/login-history" style={{ fontSize:12, fontWeight:500, textTransform:'none', letterSpacing:0 }}>
              View all →
            </a>
          </div>
          {history.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔑</div>
              <div className="empty-state-title">No login events yet</div>
              <div className="empty-state-desc">Run the seed script to populate demo data</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>IP Address</th>
                    <th>Location</th>
                    <th>Device</th>
                    <th>Status</th>
                    <th>ML Score</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice(0, 8).map(e => (
                    <tr key={e._id} style={e.isAnomaly ? { borderLeft:'2px solid var(--red)' } : {}}>
                      <td style={{ fontFamily:'var(--font-mono)', fontSize:11, whiteSpace:'nowrap' }}>
                        {new Date(e.timestamp).toLocaleString()}
                      </td>
                      <td><span className="chip">🌐 {e.ipAddress}</span></td>
                      <td style={{ fontSize:12 }}>
                        {e.geoLocation?.city && e.geoLocation.city !== 'unknown'
                          ? `${e.geoLocation.city}, ${e.geoLocation.country}`
                          : (e.geoLocation?.country || '—')}
                      </td>
                      <td style={{ fontSize:12 }}>{e.browser} / {e.deviceType}</td>
                      <td>
                        {!e.success
                          ? <span className="badge badge--failed">● Failed</span>
                          : e.isAnomaly
                            ? <span className={`badge badge--${e.anomalySeverity}`}>⚠ {e.anomalySeverity}</span>
                            : <span className="badge badge--normal">● Normal</span>
                        }
                      </td>
                      <td><ScoreBar score={e.anomalyScore} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {}
        <div className="card" style={{ marginTop:16 }}>
          <div className="card-title">🤖 ML Model Status</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px,1fr))', gap:12 }}>
            {[
              { label:'Algorithm',       value:'Isolation Forest + K-Means' },
              { label:'Model Trained',   value: stats?.modelTrained ? '✅ Yes' : '⏳ Pending (need 30 logins)' },
              { label:'Training Samples',value: stats?.modelInfo?.sample_count ?? (stats?.modelTrained ? '—' : '< 30') },
              { label:'Clusters',        value: stats?.modelInfo?.n_clusters ?? '—' },
              { label:'Detection Rate',  value: `${stats?.detectionRate ?? '—'}%` },
              { label:'False Pos. Rate', value: `${stats?.fpRate ?? '—'}%` },
              { label:'ML Service',      value: mlStatus?.online ? '🟢 Online' : '🔴 Offline' },
              { label:'Last Trained',    value: stats?.modelInfo?.trained_at ? new Date(stats.modelInfo.trained_at).toLocaleDateString() : 'Not yet' },
            ].map(({ label, value }) => (
              <div key={label} style={{ background:'var(--bg3)', borderRadius:'var(--radius)', padding:'14px 16px' }}>
                <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.8px', marginBottom:6 }}>{label}</div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:14, fontWeight:600, color:'var(--accent)', wordBreak:'break-word' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

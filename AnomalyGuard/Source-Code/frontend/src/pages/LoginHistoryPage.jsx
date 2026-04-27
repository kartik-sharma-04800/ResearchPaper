import React, { useState, useEffect, useCallback } from 'react';
import { anomalyAPI } from '../services/api';
function DetailModal({ event, onClose }) {
  if (!event) return null;
  const geo = event.geoLocation || {};
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">
          <span>Login Event Details</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {!event.success
            ? <span className="badge badge--failed">● Failed Login</span>
            : event.isAnomaly
              ? <span className={`badge badge--${event.anomalySeverity}`}>⚠ {event.anomalySeverity} Anomaly</span>
              : <span className="badge badge--normal">● Normal Login</span>
          }
          {event.mlProcessed && <span className="badge badge--none">ML Processed</span>}
        </div>
        <div className="info-row"><strong>Timestamp</strong>{new Date(event.timestamp).toLocaleString()}</div>
        <div className="info-row">
          <strong>IP Address</strong>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="chip">� Local: {event.ipAddress}</span>
            {event.realExternalIP && event.realExternalIP !== event.ipAddress && (
              <span className="chip" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                🌍 Real: {event.realExternalIP}
              </span>
            )}
          </div>
        </div>
        <div className="info-row"><strong>Browser</strong>{event.browser}</div>
        <div className="info-row"><strong>OS</strong>{event.os}</div>
        <div className="info-row"><strong>Device Type</strong>{event.deviceType}</div>
        <div className="info-row"><strong>Country</strong>{geo.country || '—'}</div>
        <div className="info-row"><strong>City</strong>{geo.city || '—'}</div>
        <div className="info-row"><strong>Region</strong>{geo.region || '—'}</div>
        <div className="info-row"><strong>Timezone</strong>{geo.timezone || '—'}</div>
        <div className="info-row"><strong>Coordinates</strong>
          {geo.latitude ? `${geo.latitude.toFixed(3)}, ${geo.longitude.toFixed(3)}` : '—'}
        </div>
        {event.anomalyScore !== null && event.anomalyScore !== undefined && (
          <>
            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '16px 0' }} />
            <div className="info-row"><strong>ML Score</strong>
              <span style={{ fontFamily: 'var(--font-mono)', color: event.isAnomaly ? 'var(--red)' : 'var(--green)' }}>
                {event.anomalyScore.toFixed(4)}
              </span>
            </div>
            <div className="info-row"><strong>Anomaly</strong>{event.isAnomaly ? '⚠ Yes' : '✓ No'}</div>
            <div className="info-row"><strong>Severity</strong>{event.anomalySeverity || 'none'}</div>
          </>
        )}
        {event.anomalyReasons?.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8, fontWeight: 600 }}>ANOMALY REASONS</div>
            {event.anomalyReasons.map((r, i) => <span key={i} className="reason-tag">{r}</span>)}
          </div>
        )}
        {event.failReason && (
          <div style={{ marginTop: 12 }}>
            <div className="info-row"><strong>Fail Reason</strong><span style={{ color: 'var(--red)' }}>{event.failReason}</span></div>
          </div>
        )}
      </div>
    </div>
  );
}
export default function LoginHistoryPage() {
  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [total, setTotal]     = useState(0);
  const [pages, setPages]     = useState(1);
  const [filter, setFilter]   = useState({ anomaly: '', success: '', limit: 20 });
  const [search, setSearch]   = useState('');
  const [selected, setSelected] = useState(null);
  const LIMIT = 20;
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (filter.anomaly !== '') params.anomaly  = filter.anomaly;
      if (filter.success !== '') params.success  = filter.success;
      const { data } = await anomalyAPI.getLoginHistory(params);
      setEvents(data.data || []);
      setTotal(data.pagination?.total || 0);
      setPages(data.pagination?.pages || 1);
    } finally { setLoading(false); }
  }, [page, filter]);
  useEffect(() => { load(); }, [load]);
  const filtered = search
    ? events.filter(e =>
        e.ipAddress?.includes(search) ||
        e.realExternalIP?.includes(search) ||
        e.browser?.toLowerCase().includes(search.toLowerCase()) ||
        e.geoLocation?.country?.toLowerCase().includes(search.toLowerCase()) ||
        e.geoLocation?.city?.toLowerCase().includes(search.toLowerCase()))
    : events;
  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Login History</h1>
          <p className="page-sub">{total} total events — every login attempt recorded and scored</p>
        </div>
        <button className="btn btn--ghost btn--sm" onClick={load}>↻ Refresh</button>
      </div>
      <div className="page-body">
        {}
        <div className="filters-bar">
          <input className="search-input" placeholder="Search IP (local/real), browser, country…"
            value={search} onChange={e => setSearch(e.target.value)} />
          <select className="filter-select" value={filter.anomaly}
            onChange={e => { setFilter(f => ({ ...f, anomaly: e.target.value })); setPage(1); }}>
            <option value="">All statuses</option>
            <option value="true">Anomalies only</option>
            <option value="false">Normal only</option>
          </select>
          <select className="filter-select" value={filter.success}
            onChange={e => { setFilter(f => ({ ...f, success: e.target.value })); setPage(1); }}>
            <option value="">Success & Failed</option>
            <option value="true">Successful only</option>
            <option value="false">Failed only</option>
          </select>
          <button className="btn btn--outline btn--sm ml-auto"
            onClick={() => { setFilter({ anomaly: '', success: '' }); setSearch(''); setPage(1); }}>
            Clear filters
          </button>
        </div>
        <div className="card">
          {loading ? (
            <div className="page-loading"><div className="spinner" /><span>Loading events…</span></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔍</div>
              <div className="empty-state-title">No events found</div>
              <div className="empty-state-desc">Try adjusting your filters</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>IP Address</th>
                    <th>Location</th>
                    <th>Browser / OS</th>
                    <th>Device</th>
                    <th>Status</th>
                    <th>ML Score</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(e => {
                    const sc = e.anomalyScore;
                    const scColor = sc === null ? 'var(--text3)' : sc <= -0.40 ? 'var(--red)' : sc <= -0.15 ? 'var(--yellow)' : 'var(--green)';
                    return (
                      <tr key={e._id} style={e.isAnomaly ? { borderLeft: '2px solid var(--red)' } : {}}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, whiteSpace: 'nowrap' }}>
                          {new Date(e.timestamp).toLocaleString()}
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span className="chip" style={{ fontSize: 10 }}>� {e.ipAddress}</span>
                            {e.realExternalIP && e.realExternalIP !== e.ipAddress && (
                              <span className="chip" style={{ fontSize: 10, background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                                🌍 {e.realExternalIP}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ fontSize: 12 }}>
                          {e.geoLocation?.city && e.geoLocation.city !== 'unknown'
                            ? `${e.geoLocation.city}, ${e.geoLocation.country}`
                            : e.geoLocation?.country || '—'}
                        </td>
                        <td style={{ fontSize: 12 }}>{e.browser} / {e.os}</td>
                        <td style={{ fontSize: 12 }}>{e.deviceType}</td>
                        <td>
                          {!e.success
                            ? <span className="badge badge--failed">● Failed</span>
                            : e.isAnomaly
                              ? <span className={`badge badge--${e.anomalySeverity}`}>⚠ {e.anomalySeverity}</span>
                              : <span className="badge badge--normal">● Normal</span>
                          }
                        </td>
                        <td>
                          {sc !== null && sc !== undefined
                            ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: scColor }}>{sc.toFixed(3)}</span>
                            : <span style={{ color: 'var(--text3)', fontSize: 12 }}>—</span>}
                        </td>
                        <td>
                          <button className="btn btn--ghost btn--sm" onClick={() => setSelected(e)}>
                            Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {}
          {pages > 1 && (
            <div className="pagination">
              <button className="page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</button>
              {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
                const p = page <= 4 ? i + 1 : page + i - 3;
                if (p < 1 || p > pages) return null;
                return (
                  <button key={p} className={`page-btn${p === page ? ' active' : ''}`} onClick={() => setPage(p)}>
                    {p}
                  </button>
                );
              })}
              <button className="page-btn" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>›</button>
            </div>
          )}
        </div>
      </div>
      {selected && <DetailModal event={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

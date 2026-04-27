import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { alertAPI } from '../../services/api';
export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unresolvedCount, setUnresolvedCount] = useState(0);
  useEffect(() => {
    alertAPI.getUnresolved()
      .then(r => setUnresolvedCount(r.data.count || 0))
      .catch(() => {});
  }, [location.pathname]);
  const handleLogout = () => { logout(); navigate('/login'); };
  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';
  return (
    <div className="app-layout">
      {}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="sidebar-logo-icon">🛡️</span>
          <span className="sidebar-logo-text">Anomaly<span>Guard</span></span>
        </div>
        <div className="sidebar-section">
          <div className="sidebar-section-label">Overview</div>
          <NavLink to="/dashboard" className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}>
            <span className="nav-icon">📊</span> Dashboard
          </NavLink>
        </div>
        <div className="sidebar-section">
          <div className="sidebar-section-label">Security</div>
          <NavLink to="/login-history" className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}>
            <span className="nav-icon">🕐</span> Login History
          </NavLink>
          <NavLink to="/alerts" className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}>
            <span className="nav-icon">🚨</span> Alerts
            {unresolvedCount > 0 && (
              <span className="sidebar-nav-badge">{unresolvedCount > 99 ? '99+' : unresolvedCount}</span>
            )}
          </NavLink>
        </div>
        {user?.role === 'admin' && (
          <div className="sidebar-section">
            <div className="sidebar-section-label">Admin</div>
            <NavLink to="/admin" className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}>
              <span className="nav-icon">⚙️</span> Admin Panel
            </NavLink>
          </div>
        )}
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.name}</div>
            <div className="sidebar-user-role">{user?.role}</div>
          </div>
          <button className="sidebar-logout" onClick={handleLogout} title="Logout">⏻</button>
        </div>
      </aside>
      {}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

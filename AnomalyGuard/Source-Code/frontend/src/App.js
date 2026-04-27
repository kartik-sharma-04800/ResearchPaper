import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage      from './pages/LoginPage';
import RegisterPage   from './pages/RegisterPage';
import MfaPage        from './pages/MfaPage';
import DashboardPage  from './pages/DashboardPage';
import LoginHistoryPage from './pages/LoginHistoryPage';
import AlertsPage     from './pages/AlertsPage';
import AdminPage      from './pages/AdminPage';
import Layout         from './components/layout/Layout';
const PrivateRoute = ({ children }) => {
  const { isLoggedIn, loading } = useAuth();
  if (loading) return <div className="splash"><div className="spinner" /></div>;
  return isLoggedIn ? children : <Navigate to="/login" replace />;
};
const PublicRoute = ({ children }) => {
  const { isLoggedIn, loading } = useAuth();
  if (loading) return <div className="splash"><div className="spinner" /></div>;
  return isLoggedIn ? <Navigate to="/dashboard" replace /> : children;
};
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/mfa"      element={<MfaPage />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index                element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"     element={<DashboardPage />} />
          <Route path="login-history" element={<LoginHistoryPage />} />
          <Route path="alerts"        element={<AlertsPage />} />
          <Route path="admin"         element={<AdminPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

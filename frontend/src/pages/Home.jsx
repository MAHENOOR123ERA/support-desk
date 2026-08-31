import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

// Redirects the logged-in user to the dashboard appropriate for their role.
export default function Home() {
  const { role, loading } = useAuth();
  if (loading) return <LoadingSpinner full />;

  if (role === 'customer') return <Navigate to="/customer" replace />;
  if (role === 'agent') return <Navigate to="/agent" replace />;
  if (role === 'admin') return <Navigate to="/admin" replace />;
  return <Navigate to="/login" replace />;
}

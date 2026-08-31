import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import LoadingSpinner from './LoadingSpinner.jsx';

// Wraps a page and enforces: must be logged in, and (optionally) must have
// one of `roles`. Unauthenticated users are redirected to /login.
export default function ProtectedRoute({ children, roles }) {
  const { firebaseUser, role, loading } = useAuth();

  if (loading) return <LoadingSpinner full />;
  if (!firebaseUser) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(role)) return <Navigate to="/" replace />;

  return children;
}

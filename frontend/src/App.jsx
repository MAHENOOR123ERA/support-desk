import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Home from './pages/Home.jsx';
import CustomerDashboard from './pages/CustomerDashboard.jsx';
import NewTicket from './pages/NewTicket.jsx';
import AgentDashboard from './pages/AgentDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import TicketDetail from './pages/TicketDetail.jsx';

export default function App() {
  const { firebaseUser } = useAuth();

  return (
    <div className="min-h-screen">
      {firebaseUser && <Navbar />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />

        <Route
          path="/customer"
          element={
            <ProtectedRoute roles={['customer']}>
              <CustomerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tickets/new"
          element={
            <ProtectedRoute roles={['customer']}>
              <NewTicket />
            </ProtectedRoute>
          }
        />
        <Route
          path="/agent"
          element={
            <ProtectedRoute roles={['agent', 'admin']}>
              <AgentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tickets/:id"
          element={
            <ProtectedRoute roles={['customer', 'agent', 'admin']}>
              <TicketDetail />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<div className="p-8 text-center text-slate-400">Page not found</div>} />
      </Routes>
    </div>
  );
}

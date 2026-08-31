import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { firebaseUser, profile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="font-semibold text-lg text-brand-700">🎧 Support Desk</Link>
        {firebaseUser && (
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-500 hidden sm:inline">
              {profile?.name || firebaseUser.email} · <span className="capitalize">{profile?.role}</span>
            </span>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-md border border-slate-300 hover:bg-slate-100 transition"
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

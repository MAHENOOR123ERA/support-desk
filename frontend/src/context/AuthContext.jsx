import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../firebase';
import api from '../api/axios';
import { disconnectSocket } from '../socket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [profile, setProfile] = useState(null); // backend User doc (has role)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadProfile = useCallback(async () => {
    try {
      const { data } = await api.get('/api/users/me');
      setProfile(data.user);
    } catch (err) {
      console.error('Failed to load profile', err);
      setError('Could not load your profile from the server.');
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        await loadProfile();
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, [loadProfile]);

  const register = async ({ email, password, name, role }) => {
    setError(null);
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (name) await updateProfile(cred.user, { displayName: name });
    await loadProfile();
    // Set chosen role (customer/agent) for this MVP demo signup flow.
    const { data } = await api.patch('/api/users/me', { name, role });
    setProfile(data.user);
    return cred.user;
  };

  const login = async (email, password) => {
    setError(null);
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await loadProfile();
    return cred.user;
  };

  const logout = async () => {
    disconnectSocket();
    await signOut(auth);
    setProfile(null);
  };

  const value = {
    firebaseUser,
    profile,
    role: profile?.role || null,
    loading,
    error,
    register,
    login,
    logout,
    refreshProfile: loadProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

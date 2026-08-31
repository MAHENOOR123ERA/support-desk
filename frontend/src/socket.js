import { io } from 'socket.io-client';
import { auth } from './firebase';

let socket = null;

// Creates (or reuses) a single authenticated Socket.IO connection.
export async function getSocket() {
  if (socket && socket.connected) return socket;

  const user = auth.currentUser;
  if (!user) throw new Error('Cannot open socket: not authenticated');
  const token = await user.getIdToken();

  if (socket) socket.disconnect();

  socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
    auth: { token },
    transports: ['websocket', 'polling'],
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

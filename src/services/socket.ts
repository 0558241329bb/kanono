import { io, Socket } from 'socket.io-client';
import { getSocketOrigin } from '../utils/apiBase';

let socket: Socket | null = null;

export const connectSocket = (token: string): Socket => {
  // Always disconnect existing socket before creating new one
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  const origin = getSocketOrigin();
  const socketUrl = origin || (typeof window !== 'undefined' ? window.location.origin : '/');

  socket = io(socketUrl, {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 8,
    reconnectionDelay: 1000,
    path: '/socket.io/',
    transports: ['polling', 'websocket'],
  });
  
  return socket;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = (): Socket | null => socket;

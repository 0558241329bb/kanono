import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Socket } from 'socket.io-client';
import { connectSocket, disconnectSocket } from '../services/socket';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  onlineUsers: number[];
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({} as SocketContextType);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const { token, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<number[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (isAuthenticated && token) {
      const newSocket = connectSocket(token);
      setSocket(newSocket);

      newSocket.on('connect', () => setIsConnected(true));
      newSocket.on('disconnect', () => setIsConnected(false));
      newSocket.on('online_users', (users: number[]) => setOnlineUsers(users));
      
      newSocket.on('user_online', ({ userId }) => {
        setOnlineUsers(prev => Array.from(new Set([...prev, userId])));
      });

      newSocket.on('user_offline', ({ userId }) => {
        setOnlineUsers(prev => prev.filter(id => id !== userId));
      });

      return () => {
        newSocket.off('connect');
        newSocket.off('disconnect');
        newSocket.off('online_users');
        newSocket.off('user_online');
        newSocket.off('user_offline');
        disconnectSocket();
      };
    } else {
      disconnectSocket();
      setSocket(null);
      setIsConnected(false);
      setOnlineUsers([]);
    }
  }, [isAuthenticated, token]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);

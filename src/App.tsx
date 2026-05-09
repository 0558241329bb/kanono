import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

// Screens
import Login from './screens/auth/Login';
import Register from './screens/auth/Register';
import ForgotPassword from './screens/auth/ForgotPassword';
import Lawyers from './screens/Lawyers';
import LawyerProfile from './screens/LawyerProfile';
import Messages from './screens/Messages';
import Chat from './screens/Chat';
import Appointments from './screens/Appointments';
import BottomTab from './components/BottomTab';
import Home from './screens/Home';
import Profile from './screens/Profile';
import AdminDashboard from './screens/admin/AdminDashboard';
import AdminLawyers from './screens/admin/AdminLawyers';
import AdminComplaints from './screens/admin/AdminComplaints';
import AdminLayout from './screens/admin/AdminLayout';

const ProtectedRoute = ({ children, requireAdmin }: { children: React.ReactNode, requireAdmin?: boolean }) => {
  const { isAuthenticated, user } = useAuth();
  
  if (!isAuthenticated) return <Navigate to="/login" />;
  
  if (requireAdmin && user?.role !== 'admin') {
    return <Navigate to="/" />;
  }
  
  return <>{children}</>;
};

const AppContent = () => {
  const { isAuthenticated } = useAuth();
  return (
    <div className="max-w-md mx-auto h-[100dvh] bg-gray-50 overflow-hidden relative shadow-2xl border-x border-gray-200">
      <div className="h-full w-full relative flex flex-col">
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminLayout><AdminDashboard /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/lawyers" element={<ProtectedRoute requireAdmin><AdminLayout><AdminLawyers /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/complaints" element={<ProtectedRoute requireAdmin><AdminLayout><AdminComplaints /></AdminLayout></ProtectedRoute>} />
          
          {/* All protected routes */}
          <Route 
            path="/*" 
            element={
              <ProtectedRoute>
                <SocketProvider>
                  <InnerApp />
                </SocketProvider>
              </ProtectedRoute>
            } 
          />
        </Routes>
      </div>
    </div>
  );
};

// Separate component for inner routing with bottom tab logic
const InnerApp = () => {
  const location = useLocation();
  const { user } = useAuth();
  const isChatScreen = location.pathname.startsWith('/chat/');
  const isAdminScreen = location.pathname.startsWith('/admin');

  return (
    <div className={`flex flex-col h-full ${!isChatScreen && !isAdminScreen ? 'pb-[65px]' : ''}`}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/lawyers" element={<Lawyers />} />
        <Route path="/lawyer/:id" element={<LawyerProfile />} />
        <Route path="/appointments" element={<Appointments />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/chat/:id" element={<Chat />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      {!isChatScreen && !isAdminScreen && <BottomTab />}
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

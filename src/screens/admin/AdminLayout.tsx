import React from 'react';
import { Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, Home, Users, AlertTriangle } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user || user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const navItems = [
    { path: '/admin', label: 'الرئيسية', icon: <Home size={20} /> },
    { path: '/admin/lawyers', label: 'المحامون', icon: <Users size={20} /> },
    { path: '/admin/complaints', label: 'الشكاوى', icon: <AlertTriangle size={20} /> },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50 text-right font-sans w-full" dir="rtl">
      {/* Header */}
      <div className="bg-primary text-white p-3 shadow-md flex justify-between items-center z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/15 rounded-lg overflow-hidden flex items-center justify-center p-1">
            <img src="/logoatia.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-lg font-bold font-cairo">لوحة تحكم المسؤول</h1>
        </div>
        <button onClick={logout} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
          <LogOut size={22} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto w-full pb-[65px] sm:pb-0">
        {children}
      </div>

      {/* Bottom Tabs for mobile */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center h-[65px] z-50 sm:hidden pb-safe">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                isActive ? 'text-primary' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {item.icon}
              <span className="text-[10px] font-bold">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

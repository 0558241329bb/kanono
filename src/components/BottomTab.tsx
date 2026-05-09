import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Users, Calendar, MessageSquare, User } from 'lucide-react';

export default function BottomTab() {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="absolute bottom-0 w-full max-w-md mx-auto bg-white border-t border-gray-200 flex justify-around items-center h-[65px] px-2 shadow-[0_-2px_10px_rgba(0,0,0,0.03)] z-50">
      <Link to="/" className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${isActive('/') ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}>
        <Home size={24} strokeWidth={isActive('/') ? 2.5 : 2} />
        <span className="text-[10px] mt-1 font-bold">الرئيسية</span>
      </Link>
      <Link to="/lawyers" className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${isActive('/lawyers') ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}>
        <Users size={24} strokeWidth={isActive('/lawyers') ? 2.5 : 2} />
        <span className="text-[10px] mt-1 font-bold">المحامون</span>
      </Link>
      <Link to="/appointments" className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${isActive('/appointments') ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}>
        <Calendar size={24} strokeWidth={isActive('/appointments') ? 2.5 : 2} />
        <span className="text-[10px] mt-1 font-bold">مواعيدي</span>
      </Link>
      <Link to="/messages" className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all relative ${isActive('/messages') ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}>
        <MessageSquare size={24} strokeWidth={isActive('/messages') ? 2.5 : 2} />
        <span className="text-[10px] mt-1 font-bold">الرسائل</span>
      </Link>
      <Link to="/profile" className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${isActive('/profile') ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}>
        <User size={24} strokeWidth={isActive('/profile') ? 2.5 : 2} />
        <span className="text-[10px] mt-1 font-bold">حسابي</span>
      </Link>
    </div>
  );
}

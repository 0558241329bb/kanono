import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Search, Calendar, Users, MessageSquare, ShieldCheck, ChevronLeft, Bell, CheckCircle, XCircle } from 'lucide-react';
import api from '../services/api';
import { formatRelativeTime } from '../utils/dateUtils';

export default function Home() {
  const { user } = useAuth();
  const isLawyer = user?.role === 'lawyer';

  const [stats, setStats] = useState({
    pendingAppointments: 0,
    acceptedAppointments: 0,
    unreadMessages: 0,
  });
  
  const [loading, setLoading] = useState(true);
  
  // Notifications State
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [appRes, msgRes, notifRes] = await Promise.all([
          api.get('/appointments'),
          api.get('/messages/conversations'),
          api.get('/notifications')
        ]);
        
        // Appointments
        const appointments = appRes.data.appointments || [];
        const pending = appointments.filter((a: any) => a.status === 'pending').length;
        const accepted = appointments.filter((a: any) => a.status === 'accepted').length;
        
        // Messages
        let unread = 0;
        if (msgRes.data.conversations) {
           msgRes.data.conversations.forEach((c: any) => {
               unread += (c.unread_count || 0);
           });
        }

        setStats({
          pendingAppointments: pending,
          acceptedAppointments: accepted,
          unreadMessages: unread
        });

        // Notifications Unread Count
        if (notifRes.data && notifRes.data.success) {
          setUnreadNotifCount(notifRes.data.unread_count || 0);
        }
      } catch (err) {
        console.error('Error fetching dashboard data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Fetch notifications list when opening dropdown
  const handleBellClick = async () => {
    if (!showNotifications) {
      try {
        const res = await api.get('/notifications');
        if (res.data.success) {
          setNotifications(res.data.notifications || []);
          setUnreadNotifCount(res.data.unread_count || 0);
        }
      } catch (err) {
        console.error(err);
      }
    }
    setShowNotifications(!showNotifications);
  };

  const handleReadAll = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(notifications.map(n => ({...n, is_read: 1})));
      setUnreadNotifCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const markAsRead = async (id: number, isRead: number) => {
    if (isRead === 1) return;
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(notifications.map(n => n.id === id ? {...n, is_read: 1} : n));
      setUnreadNotifCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  const getNotifIcon = (type: string) => {
    switch(type) {
      case 'message': return <MessageSquare size={16} className="text-purple-500" />;
      case 'appointment_accepted': return <CheckCircle size={16} className="text-green-500" />;
      case 'appointment_rejected': return <XCircle size={16} className="text-red-500" />;
      case 'appointment_request': return <Calendar size={16} className="text-blue-500" />;
      default: return <Bell size={16} className="text-gray-500" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 text-right overflow-y-auto" dir="rtl">
      {/* Header */}
      <div className="bg-primary rounded-b-3xl px-6 pt-6 pb-12 shadow-md relative shrink-0 z-30">
        <div className="flex justify-between items-start relative z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg overflow-hidden flex items-center justify-center p-1.5 border border-white/10 shrink-0">
              <img src="/logoatia.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <p className="text-green-100 text-[10px] font-medium mb-0.5">مرحباً بك،</p>
              <h1 className="text-white text-xl font-bold truncate">
                {isLawyer ? 'الأستاذ ' : ''}{user?.username}
              </h1>
            </div>
          </div>
          <div className="relative z-[150]" ref={dropdownRef}>
            <button 
              onClick={handleBellClick}
              className="bg-white/20 p-2 rounded-full text-white hover:bg-white/30 transition-colors relative"
            >
              <Bell size={20} />
              {unreadNotifCount > 0 && (
                <span className="absolute top-0 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-primary">
                  {unreadNotifCount}
                </span>
              )}
            </button>
            
            {showNotifications && (
              <div className="absolute top-12 left-0 w-[85vw] max-w-[320px] bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-[200] text-right max-h-[60vh] flex flex-col transform origin-top-left rtl:origin-top-right transition-all">
                <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                  <h3 className="font-bold text-gray-800 text-sm">الإشعارات</h3>
                  {unreadNotifCount > 0 && (
                    <button 
                      onClick={handleReadAll}
                      className="text-primary text-xs font-bold hover:underline"
                    >
                      تحديد الكل كمقروء
                    </button>
                  )}
                </div>
                
                <div className="flex-1 overflow-y-auto w-full">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 text-sm">
                      لا توجد إشعارات حتى الآن
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      {notifications.map(notif => (
                        <div 
                          key={notif.id} 
                          onClick={() => markAsRead(notif.id, notif.is_read)}
                          className={`p-3 border-b border-gray-50 text-right transition-colors cursor-pointer flex gap-3 ${
                            notif.is_read === 0 
                              ? 'bg-white border-r-4 border-r-green-500' 
                              : 'bg-gray-50/50'
                          }`}
                        >
                          <div className="mt-1 shrink-0 bg-gray-100 p-1.5 rounded-full">
                            {getNotifIcon(notif.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className={`text-sm ${notif.is_read === 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-700'} truncate mb-0.5`}>
                              {notif.title}
                            </h4>
                            <p className="text-xs text-gray-500 leading-relaxed max-w-full float-right w-full text-right line-clamp-2">
                              {notif.body}
                            </p>
                            <span className="block text-[10px] text-gray-400 mt-1" dir="ltr">{formatRelativeTime(notif.created_at)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {!isLawyer && (
          <Link to="/lawyers" className="mt-6 bg-white rounded-xl p-3.5 flex items-center gap-3 shadow-sm relative z-0 w-full group active:scale-[0.98] transition-transform border border-gray-100">
             <div className="bg-gray-100 p-2 rounded-lg text-gray-500 group-hover:bg-green-50 group-hover:text-primary transition-colors">
               <Search size={18} />
             </div>
             <span className="text-gray-400 text-sm font-medium">ابحث بالاسم أو حسب الولاية (الجزائر، الجلفة)...</span>
          </Link>
        )}
      </div>

      {/* Content */}
      <div className="px-5 -mt-6 relative z-20 flex-1 pb-6">
        
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Link to="/appointments" className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center active:scale-95 transition-transform">
             <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mb-3">
                <Calendar size={20} />
             </div>
             <span className="text-2xl font-bold text-gray-800 mb-1 leading-none">{stats.acceptedAppointments}</span>
             <span className="text-xs text-gray-500 font-semibold">{isLawyer ? 'مواعيد قادمة' : 'مواعيدي القادمة'}</span>
          </Link>

          <Link to="/messages" className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center active:scale-95 transition-transform relative">
             <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center mb-3">
                <MessageSquare size={20} />
             </div>
             <span className="text-2xl font-bold text-gray-800 mb-1 leading-none">{stats.unreadMessages}</span>
             <span className="text-xs text-gray-500 font-semibold">رسالة غير مقروءة</span>
             {stats.unreadMessages > 0 && (
               <span className="absolute top-4 left-4 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
             )}
          </Link>
        </div>

        {/* Action required / Pending */}
        {((isLawyer && stats.pendingAppointments > 0) || (!isLawyer && stats.pendingAppointments > 0)) && (
          <div className="mb-6">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center justify-between">
              <span>تنبيهات المواعيد</span>
              <Link to="/appointments" className="text-xs text-primary font-bold hover:underline">عرض الكل</Link>
            </h3>
            <Link to="/appointments" className="bg-yellow-50 border border-yellow-100 p-4 rounded-xl flex items-center justify-between active:scale-[0.98] transition-transform">
               <div className="flex items-center gap-3">
                 <div className="bg-yellow-100 text-yellow-600 p-2 rounded-lg"><Calendar size={20} /></div>
                 <div>
                   <p className="font-bold text-gray-800 text-sm">
                     {isLawyer ? 'لديك طلبات مواعيد جديدة' : 'لديك مواعيد قيد الانتظار'}
                   </p>
                   <p className="text-xs text-gray-600 mt-1">يوجد {stats.pendingAppointments} طلب تحتاج مراجعة</p>
                 </div>
               </div>
               <ChevronLeft size={20} className="text-gray-400" />
            </Link>
          </div>
        )}

        {/* Quick Services */}
        <div>
          <h3 className="font-bold text-gray-800 mb-3">الخدمات السريعة</h3>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
             
             {!isLawyer && (
               <Link to="/lawyers" className="flex items-center p-4 hover:bg-gray-50 transition-colors border-b border-gray-50">
                  <div className="bg-green-50 text-primary p-2.5 rounded-lg ml-3">
                    <Users size={20} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-800 text-sm mb-0.5">تصفح المحامين</h4>
                    <p className="text-xs text-gray-500">ابحث عن محامي مختص واحجز موعد</p>
                  </div>
                  <ChevronLeft size={18} className="text-gray-400" />
               </Link>
             )}

             <Link to="/appointments" className="flex items-center p-4 hover:bg-gray-50 transition-colors border-b border-gray-50">
                <div className="bg-blue-50 text-blue-500 p-2.5 rounded-lg ml-3">
                  <Calendar size={20} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-800 text-sm mb-0.5">{isLawyer ? 'إدارة المواعيد' : 'متابعة مواعيدي'}</h4>
                  <p className="text-xs text-gray-500">حجوزاتك واستشاراتك المجدولة</p>
                </div>
                <ChevronLeft size={18} className="text-gray-400" />
             </Link>

             <Link to="/messages" className="flex items-center p-4 hover:bg-gray-50 transition-colors">
                <div className="bg-purple-50 text-purple-500 p-2.5 rounded-lg ml-3">
                  <MessageSquare size={20} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-800 text-sm mb-0.5">الرسائل النشطة</h4>
                  <p className="text-xs text-gray-500">تواصل مع {isLawyer ? 'عملائك' : 'محاميك'}</p>
                </div>
                <ChevronLeft size={18} className="text-gray-400" />
             </Link>

             {isLawyer && (
               <div className="border-t border-gray-50 flex items-center p-4 bg-gray-50/50">
                  <div className="bg-gray-200 text-gray-500 p-2.5 rounded-lg ml-3">
                    <ShieldCheck size={20} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-800 text-sm mb-0.5">اللوحة القانونية</h4>
                    <p className="text-xs text-gray-500">إدارة القضايا والموكلين (قريباً)</p>
                  </div>
               </div>
             )}

          </div>
        </div>

      </div>
    </div>
  );
}

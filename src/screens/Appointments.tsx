import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import AppointmentCard from '../components/AppointmentCard';
import { Calendar, RefreshCw, Archive } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Appointments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isLawyer = user?.role === 'lawyer';

  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const clientTabs = [
    { id: 'accepted', label: 'القادمة' },
    { id: 'pending', label: 'المنتظرة' },
    { id: 'completed', label: 'المكتملة' },
    { id: 'cancelled', label: 'الملغاة / المرفوضة' } // We will filter both
  ];

  const lawyerTabs = [
    { id: 'pending', label: 'طلبات جديدة' },
    { id: 'accepted', label: 'المقبولة' },
    { id: 'completed', label: 'المكتملة' }
  ];

  const tabs = isLawyer ? lawyerTabs : clientTabs;
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
      if (isLawyer) {
          setActiveTab('pending');
      } else {
          setActiveTab('accepted');
      }
  }, [isLawyer]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/appointments');
      setAppointments(res.data.appointments || []);
    } catch (err) {
      console.error('Error fetching appointments', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleAction = async (id: number, action: string, data?: any) => {
    try {
      if (action === 'chat') {
        const targetUserId = isLawyer 
          ? appointments.find(a => a.id === id)?.client_id 
          : appointments.find(a => a.id === id)?.lawyer_id;
        
        if (!targetUserId) {
          alert('حدث خطأ في فتح المحادثة');
          return;
        }

        const convRes = await api.post('/messages/conversations', { other_user_id: targetUserId });
        if(convRes.data.success) {
            navigate(`/chat/${convRes.data.conversation_id}`);
        }
        return;
      }

      if (action === 'accept') {
        let confirmDate = data?.confirmed_date;
        
        if (!confirmDate) {
          confirmDate = window.prompt('أدخل تاريخ ووقت الموعد المؤكد (YYYY-MM-DD HH:MM):', 
            new Date().toISOString().slice(0, 16).replace('T', ' '));
        }

        if (!confirmDate) return;
        await api.put(`/appointments/${id}/accept`, { confirmed_date: confirmDate });
        await fetchAppointments();
        if (isLawyer) {
          setActiveTab('accepted');
          alert('تم قبول الموعد بنجاح وانتقاله إلى قائمة المواعيد المقبولة');
        }
        return;
      }

      await api.put(`/appointments/${id}/${action}`, data);
      
      // Update local state temporarily or just re-fetch
      fetchAppointments();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'حدث خطأ');
    }
  };

  // Filter based on active tab
  const filteredAppointments = appointments.filter(a => {
    if (activeTab === 'cancelled') {
        return a.status === 'cancelled' || a.status === 'rejected';
    }
    return a.status === activeTab;
  });

  return (
    <div className="flex flex-col h-full bg-gray-50 text-right relative" dir="rtl">
      {/* Header */}
      <div className="bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)] z-10 shrink-0 border-b border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Calendar size={22} className="text-primary" />
            {isLawyer ? 'إدارة المواعيد' : 'مواعيدي'}
          </h1>
          <button 
            onClick={fetchAppointments} 
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors active:bg-gray-200"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin text-primary' : ''} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 snap-x pb-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 snap-start px-5 py-2.5 rounded-full text-[13px] font-bold transition-all ${
                activeTab === tab.id 
                ? 'bg-primary text-white shadow-md' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
              {/* Optional counter */}
              {tab.id === 'pending' && isLawyer && appointments.filter(a => a.status === 'pending').length > 0 && (
                <span className="ml-1.5 inline-block bg-white text-primary text-[10px] w-4 h-4 rounded-full text-center leading-4 relative -top-0.5 shadow-sm">
                  {appointments.filter(a => a.status === 'pending').length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto w-full p-4">
        {loading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map(n => (
              <div key={n} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-full shrink-0"></div>
                  <div className="flex-1 space-y-3 py-1">
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </div>
                <div className="mt-6 flex gap-2">
                  <div className="flex-1 h-8 bg-gray-200 rounded-lg"></div>
                  <div className="flex-1 h-8 bg-gray-200 rounded-lg"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredAppointments.length > 0 ? (
          filteredAppointments.map(app => (
            <AppointmentCard 
              key={app.id} 
              appointment={app} 
              onAction={handleAction} 
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
             <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-5 text-gray-400">
               <Archive size={40} />
             </div>
             <p className="font-bold text-gray-600 text-lg">لا توجد مواعيد</p>
             <p className="text-sm text-gray-500 mt-2">
                {activeTab === 'pending' && isLawyer ? 'لا توجد طلبات مواعيد جديدة حالياً' :
                 activeTab === 'pending' ? 'لا توجد طلبات مواعيد قيد الانتظار' :
                 activeTab === 'accepted' ? 'ليس لديك مواعيد قادمة' :
                 activeTab === 'completed' ? 'لم تقم بإتمام أي مواعيد بعد' :
                 'لا توجد مواعيد ملغاة'}
             </p>
          </div>
        )}
      </div>
    </div>
  );
}

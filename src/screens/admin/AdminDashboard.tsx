import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Users, AlertTriangle, UserCheck, Calendar } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    users: 0,
    pendingLawyers: 0,
    openComplaints: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersRes, pendingRes, complaintsRes] = await Promise.allSettled([
          api.get('/auth/users'),
          api.get('/lawyers/pending'),
          api.get('/complaints')
        ]);
        
        let usersCount = 0;
        if (usersRes.status === 'fulfilled' && usersRes.value.data.success) {
          usersCount = usersRes.value.data.users?.length || 0;
        }

        let pendingCount = 0;
        if (pendingRes.status === 'fulfilled' && pendingRes.value.data.success) {
          pendingCount = pendingRes.value.data.lawyers?.length || 0;
        }

        let openComplaintsCount = 0;
        if (complaintsRes.status === 'fulfilled' && complaintsRes.value.data.success) {
          openComplaintsCount = complaintsRes.value.data.complaints?.filter((c: any) => c.status === 'open').length || 0;
        }

        setStats({
          users: usersCount,
          pendingLawyers: pendingCount,
          openComplaints: openComplaintsCount,
        });
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-full"><div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div></div>;
  }

  return (
    <div className="p-4 space-y-6 flex flex-col font-cairo">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">أهلاً بك، {user?.username}</h2>
        <p className="text-sm text-gray-500 mt-1">نظرة عامة على النظام</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-2">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
            <Users size={24} />
          </div>
          <span className="text-2xl font-bold text-gray-800">{stats.users > 0 ? stats.users : 'N/A'}</span>
          <span className="text-xs text-gray-500 font-medium">إجمالي المستخدمين</span>
        </div>
        
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-2">
          <div className="p-3 bg-yellow-50 text-yellow-600 rounded-full">
            <UserCheck size={24} />
          </div>
          <span className="text-2xl font-bold text-gray-800">{stats.pendingLawyers}</span>
          <span className="text-xs text-gray-500 font-medium">محامون منتظرون</span>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-2">
          <div className="p-3 bg-red-50 text-red-600 rounded-full">
            <AlertTriangle size={24} />
          </div>
          <span className="text-2xl font-bold text-gray-800">{stats.openComplaints}</span>
          <span className="text-xs text-gray-500 font-medium">شكاوى مفتوحة</span>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-2">
          <div className="p-3 bg-green-50 text-green-600 rounded-full">
            <Calendar size={24} />
          </div>
          <span className="text-2xl font-bold text-gray-800">N/A</span>
          <span className="text-xs text-gray-500 font-medium">إجمالي المواعيد</span>
        </div>
      </div>

      <div className="space-y-3 mt-4">
        <h3 className="text-lg font-bold text-gray-800">إجراءات سريعة</h3>
        <Link to="/admin/lawyers" className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:border-primary transition-colors hover:shadow-md">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg">
              <UserCheck size={20} />
            </div>
            <span className="font-bold text-gray-700">مراجعة المحامين المنتظرين</span>
          </div>
          <span className="text-primary font-bold bg-green-50 px-3 py-1 rounded-full text-sm">←</span>
        </Link>

        <Link to="/admin/complaints" className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:border-primary transition-colors hover:shadow-md">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="p-2 bg-red-50 text-red-600 rounded-lg">
              <AlertTriangle size={20} />
            </div>
            <span className="font-bold text-gray-700">مراجعة الشكاوى</span>
          </div>
          <span className="text-primary font-bold bg-green-50 px-3 py-1 rounded-full text-sm">←</span>
        </Link>
      </div>
    </div>
  );
}

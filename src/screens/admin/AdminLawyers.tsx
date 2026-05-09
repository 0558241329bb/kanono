import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Check, X, MapPin, Award, Star } from 'lucide-react';

export default function AdminLawyers() {
  const [tab, setTab] = useState<'pending' | 'active'>('pending');
  const [pending, setPending] = useState<any[]>([]);
  const [active, setActive] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [processingId, setProcessingId] = useState<number | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (tab === 'pending') {
        const res = await api.get('/lawyers/pending');
        if (res.data.success) {
          setPending(res.data.lawyers);
        }
      } else {
        const res = await api.get('/lawyers');
        if (res.data.success) {
          setActive(res.data.lawyers);
        }
      }
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 500) {
        alert('حدث خطأ في الخادم. قد يكون هناك مشكلة في الاتصال بقاعدة البيانات.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tab]);

  const handleApprove = async (id: number) => {
    setProcessingId(id);
    const url = `/lawyers/${id}/approve`;
    console.log(`Calling PUT ${url}`);
    try {
      await api.put(url);
      await fetchData();
    } catch (err: any) {
      console.error('Error in AdminLawyers approve:', err);
      if (err.response?.status === 403) {
        const details = err.response?.data?.details || '';
        alert(`خطأ 403: ليس لديك صلاحية القيام بهذا الإجراء.\n${details}\nيرجى محاولة تسجيل الخروج ثم الدخول مرة أخرى بحساب المدير.`);
      } else {
        const msg = err.response?.data?.message || err.response?.data?.error || 'حدث خطأ أثناء القبول. حاول مرة أخرى.';
        const details = err.response?.data?.details ? `\n(${err.response.data.details})` : '';
        alert(`${msg}${details}\nURL: ${url}`);
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: number) => {
    setProcessingId(id);
    const url = `/lawyers/${id}/reject`;
    console.log(`Calling DELETE ${url}`);
    try {
      await api.delete(url);
      await fetchData();
    } catch (err: any) {
      console.error('Error in AdminLawyers reject:', err);
      if (err.response?.status === 403) {
        const details = err.response?.data?.details || '';
        alert(`خطأ 403: ليس لديك صلاحية القيام بهذا الإجراء.\n${details}\nيرجى محاولة تسجيل الخروج ثم الدخول مرة أخرى بحساب المدير.`);
      } else {
        const msg = err.response?.data?.message || err.response?.data?.error || 'حدث خطأ أثناء الرفض. حاول مرة أخرى.';
        const details = err.response?.data?.details ? `\n(${err.response.data.details})` : '';
        alert(`${msg}${details}\nURL: ${url}`);
      }
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="p-4 flex flex-col h-full font-cairo">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">إدارة المحامين</h2>

      <div className="flex space-x-2 space-x-reverse mb-6 bg-gray-200 p-1 rounded-xl shrink-0">
        <button
          onClick={() => setTab('pending')}
          className={`flex-1 py-2 font-bold text-sm rounded-lg transition-colors ${tab === 'pending' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          منتظرون للموافقة 
        </button>
        <button
          onClick={() => setTab('active')}
          className={`flex-1 py-2 font-bold text-sm rounded-lg transition-colors ${tab === 'active' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          المحامون النشطون
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : tab === 'pending' ? (
          pending.length === 0 ? (
            <div className="text-center py-10 text-gray-500 font-medium">لا يوجد طلبات محامين معلقة</div>
          ) : (
            <div className="space-y-4 pb-20">
              {pending.map((lawyer) => (
                <div key={lawyer.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">{lawyer.username}</h3>
                      <p className="text-sm text-gray-500">{lawyer.email}</p>
                    </div>
                    <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-md font-bold shrink-0">قيد المراجعة</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg overflow-hidden">
                    <div className="flex items-center gap-1.5 truncate" title={lawyer.specialty}><Award size={16} className="text-primary shrink-0"/> <span className="truncate">{lawyer.specialty}</span></div>
                    <div className="flex items-center gap-1.5 truncate" title={lawyer.city}><MapPin size={16} className="text-primary shrink-0"/> <span className="truncate">{lawyer.city}</span></div>
                    <div className="col-span-2 truncate" title={lawyer.bar_number}><strong>رقم النقابة:</strong> <span dir="ltr">{lawyer.bar_number}</span></div>
                    <div className="col-span-2"><strong>سنوات الخبرة:</strong> {lawyer.years_experience} {lawyer.years_experience > 10 ? 'سنة' : 'سنوات'}</div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button 
                      onClick={() => handleApprove(lawyer.id)} 
                      disabled={processingId === lawyer.id}
                      className="flex-1 flex justify-center items-center gap-2 bg-primary text-white py-2 rounded-lg font-bold hover:bg-green-800 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processingId === lawyer.id ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check size={18} />}
                      قبول
                    </button>
                    <button 
                      onClick={() => handleReject(lawyer.id)} 
                      disabled={processingId === lawyer.id}
                      className="flex-1 flex justify-center items-center gap-2 bg-red-50 text-red-600 py-2 rounded-lg font-bold hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processingId === lawyer.id ? <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" /> : <X size={18} />}
                      رفض
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          active.length === 0 ? (
            <div className="text-center py-10 text-gray-500 font-medium">لا يوجد محامين نشطين</div>
          ) : (
            <div className="space-y-4 pb-20">
              {active.map((lawyer) => (
                <div key={lawyer.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex gap-4 items-center">
                  <img src={lawyer.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(lawyer.username)}&background=1B5E20&color=fff`} alt={lawyer.username} className="w-16 h-16 rounded-full object-cover shadow-sm bg-gray-100" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 truncate">{lawyer.username}</h3>
                    <p className="text-sm text-primary font-medium truncate">{lawyer.specialty}</p>
                    <div className="flex items-center gap-4 mt-1">
                       <div className="flex items-center gap-1 text-xs text-gray-500 truncate"><MapPin size={14}/> {lawyer.city}</div>
                       <div className="flex items-center gap-1 text-xs text-yellow-600 font-bold"><Star size={14} className="fill-current"/> {lawyer.rating ? Number(lawyer.rating).toFixed(1) : 'جديد'}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

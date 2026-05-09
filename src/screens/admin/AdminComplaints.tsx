import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { AlertTriangle, Clock, CheckCircle2, ChevronDown, ChevronUp, User } from 'lucide-react';

export default function AdminComplaints() {
  const [filter, setFilter] = useState<'open' | 'in_review' | 'resolved'>('open');
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const res = await api.get('/complaints');
      if (res.data.success) {
        setComplaints(res.data.complaints);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    try {
      await api.put(`/complaints/${id}/status`, { status: newStatus });
      fetchComplaints();
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء تحديث حالة الشكوى');
    }
  };

  const filteredComplaints = complaints.filter(c => c.status === filter);

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'open': return <span className="bg-red-100 text-red-700 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1 shrink-0"><AlertTriangle size={12}/> مفتوحة</span>;
      case 'in_review': return <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1 shrink-0"><Clock size={12}/> مراجعة</span>;
      case 'resolved': return <span className="bg-green-100 text-green-700 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1 shrink-0"><CheckCircle2 size={12}/> محلولة</span>;
      default: return null;
    }
  };

  return (
    <div className="p-4 flex flex-col h-full font-cairo">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">إدارة الشكاوى</h2>

      <div className="flex space-x-2 space-x-reverse mb-6 bg-gray-200 p-1 rounded-xl shrink-0">
        <button
          onClick={() => setFilter('open')}
          className={`flex-1 py-1.5 font-bold text-sm rounded-lg transition-colors ${filter === 'open' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          مفتوحة 
        </button>
        <button
          onClick={() => setFilter('in_review')}
          className={`flex-1 py-1.5 font-bold text-sm rounded-lg transition-colors ${filter === 'in_review' ? 'bg-white text-yellow-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          قيد المراجعة
        </button>
         <button
          onClick={() => setFilter('resolved')}
          className={`flex-1 py-1.5 font-bold text-sm rounded-lg transition-colors ${filter === 'resolved' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          محلولة
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : filteredComplaints.length === 0 ? (
          <div className="text-center py-10 text-gray-500 font-medium">لا يوجد شكاوى في هذا القسم</div>
        ) : (
          <div className="space-y-4 pb-20">
            {filteredComplaints.map((complaint) => (
              <div key={complaint.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 truncate">{complaint.subject}</h3>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1 truncate">
                      <User size={12} className="shrink-0"/>
                      <span className="truncate">{complaint.user_name}</span>
                      <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px] mr-1 shrink-0">{complaint.user_role === 'client' ? 'عميل' : 'محامي'}</span>
                    </div>
                  </div>
                  {renderStatusBadge(complaint.status)}
                </div>

                <div 
                  className={`text-sm text-gray-700 bg-gray-50 p-3 rounded-lg cursor-pointer transition-all hover:bg-gray-100`}
                  onClick={() => setExpanded(expanded === complaint.id ? null : complaint.id)}
                >
                  <p className={`whitespace-pre-line ${expanded === complaint.id ? '' : 'line-clamp-3'}`}>{complaint.description}</p>
                  <div className="text-primary text-xs mt-2 font-bold flex items-center justify-end">
                    {expanded === complaint.id ? <span className="flex items-center"><ChevronUp size={14}/> عرض أقل</span> : <span className="flex items-center"><ChevronDown size={14}/> عرض المزيد</span>}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2 pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-400 font-medium" dir="ltr">{new Date(complaint.created_at).toLocaleDateString('en-GB')} {new Date(complaint.created_at).toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit'})}</span>
                  
                  {complaint.status === 'open' && (
                    <button 
                      onClick={() => handleUpdateStatus(complaint.id, 'in_review')}
                      className="bg-primary text-secondary px-4 py-1.5 rounded-lg text-sm font-bold shadow-sm hover:bg-green-800 transition-colors"
                    >
                      بدء المراجعة
                    </button>
                  )}
                  
                  {complaint.status === 'in_review' && (
                    <button 
                      onClick={() => handleUpdateStatus(complaint.id, 'resolved')}
                      className="bg-green-50 text-green-700 border border-green-200 px-4 py-1.5 rounded-lg text-sm font-bold shadow-sm hover:bg-green-100 transition-colors flex items-center gap-1"
                    >
                      <CheckCircle2 size={16} /> تم الحل
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
       </div>
    </div>
  );
}

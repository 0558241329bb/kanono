import React, { useState } from 'react';
import { Calendar, Clock, Video, MapPin, Check, X, MessageSquare, Star, User, Building, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Props {
  key?: string | number;
  appointment: any;
  onAction: (id: number, action: 'accept' | 'reject' | 'cancel' | 'complete' | 'chat', data?: any) => void;
}

export default function AppointmentCard({ appointment, onAction }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isLawyer = user?.role === 'lawyer';

  const [isModifyingDate, setIsModifyingDate] = useState(false);
  const [newDate, setNewDate] = useState(() => {
    const d = new Date(appointment.requested_date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [newTime, setNewTime] = useState(() => {
    const d = new Date(appointment.requested_date);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  });

  const otherUserName = isLawyer ? appointment.client_name : appointment.lawyer_name;
  const otherUserPic = isLawyer ? appointment.client_pic : appointment.lawyer_pic;

  const dateObj = new Date(appointment.confirmed_date || appointment.requested_date);
  const dateStr = dateObj.toLocaleDateString('ar-DZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = dateObj.toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' });

  const getStatusBadge = () => {
    switch (appointment.status) {
      case 'pending': return <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full text-xs font-bold shrink-0">قيد الانتظار</span>;
      case 'accepted': return <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs font-bold shrink-0">مؤكد</span>;
      case 'rejected': return <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-xs font-bold shrink-0">مرفوض</span>;
      case 'cancelled': return <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-xs font-bold shrink-0">ملغى</span>;
      case 'completed': return <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full text-xs font-bold shrink-0">مكتمل</span>;
      default: return null;
    }
  };

  const handleAccept = () => {
    if (isModifyingDate) {
      onAction(appointment.id, 'accept', { confirmed_date: `${newDate}T${newTime}:00` });
      setIsModifyingDate(false);
    } else {
      setIsModifyingDate(true);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-3" dir="rtl">
      <div className="flex justify-between items-start mb-3 border-b border-gray-50 pb-3">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            {otherUserPic ? (
              <img src={otherUserPic} alt="" className="w-12 h-12 rounded-full object-cover border border-gray-200" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-green-50 text-primary flex items-center justify-center font-bold text-lg border border-green-100">
                {otherUserName?.charAt(0) || <User size={20} />}
              </div>
            )}
          </div>
          <div>
            <h3 className="font-bold text-gray-800 text-sm">
              {!isLawyer && 'الأستاذ '} {otherUserName}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">{isLawyer ? 'عميل' : (appointment.specialty || 'محامي')}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {getStatusBadge()}
          <span className="flex items-center gap-1 text-[10px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-100">
            {appointment.type === 'consultation' ? <Video size={10} /> : <Building size={10} />}
            {appointment.type === 'consultation' ? 'استشارة عن بعد' : 'موعد حضوري'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-600 mb-4 bg-gray-50/50 p-2 rounded-lg">
        <div className="flex items-center gap-1.5 font-bold">
          <Calendar size={16} className="text-primary" />
          <span>{dateStr}</span>
        </div>
        <div className="flex items-center gap-1.5 font-bold text-gray-700" dir="ltr">
          <Clock size={16} className="text-secondary" />
          <span>{timeStr}</span>
        </div>
      </div>

      {appointment.notes && (
        <div className="mb-4 bg-yellow-50/50 p-2.5 rounded-lg border border-yellow-100">
          <p className="text-xs text-gray-400 mb-1 font-bold">ملاحظات:</p>
          <p className="text-sm text-gray-700 leading-relaxed">{appointment.notes}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 mt-2">
        {/* Client Pending */}
        {!isLawyer && appointment.status === 'pending' && (
          <button onClick={() => onAction(appointment.id, 'cancel')} className="flex-1 bg-red-50 text-red-600 font-bold py-2 rounded-lg text-sm transition-colors hover:bg-red-100 flex justify-center items-center gap-1">
            <X size={16} /> إلغاء الموعد
          </button>
        )}
        
        {/* Lawyer Pending */}
        {isLawyer && appointment.status === 'pending' && !isModifyingDate && (
          <>
            <button onClick={() => setIsModifyingDate(true)} className="flex-1 bg-primary text-white font-bold py-2 rounded-lg text-sm transition-colors hover:bg-green-800 flex justify-center items-center gap-1">
              <Check size={16} /> قبول
            </button>
            <button onClick={() => {
              const reason = prompt('أدخل سبب الرفض (اختياري):');
              if (reason !== null) onAction(appointment.id, 'reject', { reason });
            }} className="flex-1 bg-red-50 text-red-600 font-bold py-2 rounded-lg text-sm transition-colors hover:bg-red-100 flex justify-center items-center gap-1">
              <X size={16} /> رفض
            </button>
          </>
        )}

        {/* Lawyer Modifying Date/Time for Accept */}
        {isLawyer && appointment.status === 'pending' && isModifyingDate && (
          <div className="flex flex-col gap-2 w-full bg-green-50/50 p-3 rounded-xl border border-green-100">
            <p className="text-xs font-bold text-primary">تأكيد أو تعديل موعد الحجز:</p>
            <div className="flex gap-2">
              <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="flex-1 border border-gray-200 rounded-lg p-1.5 text-sm" />
              <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="w-24 border border-gray-200 rounded-lg p-1.5 text-sm" />
            </div>
            <div className="flex gap-2 mt-1">
              <button onClick={handleAccept} className="flex-1 bg-primary text-white text-xs font-bold py-2 rounded-lg">تأكيد الموعد</button>
              <button onClick={() => setIsModifyingDate(false)} className="bg-gray-200 text-gray-700 text-xs font-bold py-2 px-4 rounded-lg">إلغاء</button>
            </div>
          </div>
        )}

        {/* Accepted (Both) */}
        {appointment.status === 'accepted' && (
          <>
            <button onClick={() => onAction(appointment.id, 'chat')} className="flex-[2] bg-primary text-white font-bold py-2 rounded-lg text-[13px] transition-colors hover:bg-green-800 flex justify-center items-center gap-1.5 shadow-sm">
              <MessageSquare size={16} /> الذهاب للمحادثة
            </button>
            {!isLawyer && (
              <button onClick={() => onAction(appointment.id, 'cancel')} className="flex-1 bg-red-50 text-red-600 font-bold py-2 rounded-lg text-[13px] transition-colors hover:bg-red-100 flex justify-center items-center gap-1">
                <X size={16} /> إلغاء
              </button>
            )}
            {isLawyer && (
              <button onClick={() => onAction(appointment.id, 'complete')} className="flex-1 bg-secondary text-primary font-bold py-2 rounded-lg text-[13px] transition-colors hover:bg-[#c9953b] flex justify-center items-center gap-1 shadow-sm">
                <Check size={16} /> مكتمل
              </button>
            )}
          </>
        )}

        {/* Completed (Client) */}
        {!isLawyer && appointment.status === 'completed' && (
          <button onClick={() => alert('سيتم إضافة تقييم المحامي قريباً')} className="flex-1 bg-secondary/10 text-secondary border border-secondary/20 font-bold py-2.5 rounded-lg text-sm transition-colors hover:bg-secondary/20 flex justify-center items-center gap-1.5">
            <Star size={16} /> تقييم المحامي
          </button>
        )}
      </div>
    </div>
  );
}

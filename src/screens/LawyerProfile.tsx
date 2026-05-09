import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Star, MapPin, Briefcase, Award, MessageSquare, ArrowRight, CheckCircle, Clock } from 'lucide-react';
import api from '../services/api';
import BookingModal from '../components/BookingModal';

export default function LawyerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lawyer, setLawyer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Booking Modal
  const [bookingType, setBookingType] = useState<'appointment' | 'consultation'>('appointment');
  const [showBookingModal, setShowBookingModal] = useState(false);

  useEffect(() => {
    const fetchLawyer = async () => {
      try {
        const res = await api.get(`/lawyers/${id}`);
        setLawyer(res.data.lawyer);
      } catch (err) {
        console.error('Failed to load lawyer', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLawyer();
  }, [id]);

  const handleBook = (type: 'appointment' | 'consultation') => {
    setBookingType(type);
    setShowBookingModal(true);
  };

  const handleMessage = async () => {
    if (!lawyer) return;
    try {
      // Find existing or create new conversation
      const res = await api.post('/messages/conversations', { other_user_id: lawyer.id });
      if (res.data.success) {
        navigate(`/chat/${res.data.conversation_id}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'حدث خطأ أثناء فتح المحادثة');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full bg-gray-50">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!lawyer) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500 bg-gray-50">
        <p className="font-bold text-lg">لم يتم العثور على المحامي</p>
        <button onClick={() => navigate(-1)} className="text-primary font-bold bg-green-50 px-6 py-2 rounded-lg">عودة</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 text-right overflow-y-auto" dir="rtl">
      {/* Header */}
      <div className="relative bg-primary h-32 shrink-0">
        <button onClick={() => navigate(-1)} className="absolute top-4 right-4 text-white p-2 bg-black/20 hover:bg-black/30 rounded-full transition-colors z-10">
          <ArrowRight size={24} />
        </button>
        {/* Cover Pattern */}
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(45deg,transparent_25%,white_25%,white_50%,transparent_50%,transparent_75%,white_75%,white_100%)] bg-[length:20px_20px]"></div>
      </div>

      {/* Profile Info */}
      <div className="px-5 pb-5 -mt-12 relative z-10 shrink-0">
        <div className="flex justify-between items-end mb-3">
          <div className="relative">
            {lawyer.profile_picture ? (
              <img src={lawyer.profile_picture} alt="" className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-md bg-white" />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-white border-4 border-white text-primary flex items-center justify-center font-bold text-3xl shadow-md">
                <User size={40} />
              </div>
            )}
            <div className="absolute -bottom-1 -left-1 bg-[#25D366] text-white p-1 rounded-full border-2 border-white" title="موثوق">
              <CheckCircle size={14} />
            </div>
          </div>
          
          <div className="mb-2">
            <button 
              onClick={handleMessage}
              className="bg-white text-primary border border-primary font-bold p-2.5 rounded-xl shadow-sm hover:bg-green-50 transition-colors flex items-center gap-2"
            >
              <MessageSquare size={20} />
              <span className="text-sm">رسالة</span>
            </button>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-800 tracking-tight">الأستاذ {lawyer.username}</h1>
        
        <div className="flex flex-wrap items-center gap-3 mt-2">
          <span className="flex items-center gap-1.5 bg-green-50 text-primary px-2.5 py-1 rounded-lg text-sm font-bold">
            <Briefcase size={14} /> {lawyer.specialty || 'محامي عام'}
          </span>
          <span className="flex items-center gap-1.5 text-gray-500 text-sm font-medium">
            <MapPin size={14} /> {lawyer.city}
          </span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center">
            <div className="flex items-center gap-1 text-secondary mb-1">
              <Star size={16} fill="currentColor" />
              <span className="font-bold text-lg">{Number(lawyer.rating || 0).toFixed(1) || 'جديد'}</span>
            </div>
            <span className="text-[10px] text-gray-500 font-semibold">التقييم العام</span>
          </div>
          
          <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center">
            <div className="flex items-center gap-1 text-primary mb-1">
              <Award size={16} />
              <span className="font-bold text-lg">{lawyer.years_experience || 0}+</span>
            </div>
            <span className="text-[10px] text-gray-500 font-semibold">سنوات الخبرة</span>
          </div>
          
          <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center">
            <div className="flex items-center gap-1 text-blue-500 mb-1">
              <CheckCircle size={16} />
              <span className="font-bold text-lg">{lawyer.completed_appointments || 0}</span>
            </div>
            <span className="text-[10px] text-gray-500 font-semibold">استشارة ناجحة</span>
          </div>
        </div>
      </div>

      <div className="w-full h-2 bg-gray-100 shrink-0"></div>

      {/* Bio / Details */}
      <div className="p-5 flex-1 bg-white">
        <h3 className="font-bold text-gray-800 text-lg mb-3">نبذة تعريفية</h3>
        <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">
          {lawyer.bio || 'لا توجد نبذة تعريفية.'}
        </p>

        {lawyer.bar_number && (
          <div className="mt-5 p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
            <div className="bg-white p-2 rounded-lg shadow-sm text-gray-500"><Award size={20} /></div>
            <div>
              <p className="text-xs text-gray-500 font-semibold">رقم الاعتماد (النقابة)</p>
              <p className="font-bold text-gray-800 text-sm">{lawyer.bar_number}</p>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Action Footer */}
      <div className="p-4 bg-white border-t border-gray-100 shrink-0 shadow-[0_-4px_15px_rgba(0,0,0,0.03)] pb-8 mt-auto sticky bottom-0">
        <div className="flex gap-3">
           <button 
            onClick={() => handleBook('appointment')}
            className="flex-1 bg-primary text-white font-bold py-3.5 rounded-xl text-[15px] transition-transform active:scale-95 shadow-md flex justify-center items-center gap-2"
          >
            <Clock size={18} />
            حجز موعد حضوري
          </button>
          <button 
             onClick={() => handleBook('consultation')}
            className="flex-1 bg-green-50 text-primary border border-green-200 font-bold py-3.5 rounded-xl text-[15px] transition-transform active:scale-95 flex justify-center items-center gap-2"
          >
            <MessageSquare size={18} />
            استشارة عن بعد
          </button>
        </div>
      </div>

      {/* Modals */}
      {showBookingModal && (
        <BookingModal 
          lawyer={lawyer}
          defaultType={bookingType}
          onClose={() => setShowBookingModal(false)}
          onSuccess={() => {
            setShowBookingModal(false);
            navigate('/appointments');
          }}
        />
      )}
    </div>
  );
}

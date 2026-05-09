import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Clock, Edit3, Loader2 } from 'lucide-react';
import api from '../services/api';

interface BookingModalProps {
  lawyer: any;
  defaultType: 'appointment' | 'consultation';
  onClose: () => void;
  onSuccess: () => void;
}

export default function BookingModal({ lawyer, defaultType, onClose, onSuccess }: BookingModalProps) {
  const [type, setType] = useState(defaultType);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [dates, setDates] = useState<{ date: Date; label: string }[]>([]);
  const [busySlots, setBusySlots] = useState<string[]>([]);

  useEffect(() => {
    // Generate next 14 days
    const nextDates = [];
    for (let i = 1; i <= 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      // Skip weekends (Friday/Saturday depending on region, but let's say just Fridays = 5)
      if (d.getDay() !== 5) {
        nextDates.push({
          date: d,
          label: d.toLocaleDateString('ar-DZ', { weekday: 'short', month: 'short', day: 'numeric' })
        });
      }
    }
    setDates(nextDates);
    if (nextDates.length > 0) {
      setSelectedDate(nextDates[0].date.toISOString().split('T')[0]);
    }

    // Fetch busy slots for this lawyer
    const fetchBusySlots = async () => {
      try {
        const res = await api.get(`/lawyers/${lawyer.id}/appointments`);
        if (res.data.success) {
          const busy = res.data.appointments.map((a: any) => {
            const d = new Date(a.requested_date);
            return `${d.toISOString().split('T')[0]}_${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
          });
          setBusySlots(busy);
        }
      } catch (e) { /* ignore */ }
    };
    fetchBusySlots();
  }, [lawyer.id]);

  const timeSlots = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime) return;
    
    setLoading(true);
    try {
      // Create full datetime
      const [year, month, day] = selectedDate.split('-');
      const [hour, minute] = selectedTime.split(':');
      const requestedDate = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));

      const res = await api.post('/appointments', {
        lawyer_id: lawyer.id,
        type,
        requested_date: requestedDate.toISOString().slice(0, 19).replace('T', ' '),
        notes
      });
      
      if (res.data.success) {
        onSuccess();
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'حدث خطأ أثناء حجز الموعد');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end" dir="rtl">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity animate-[fadeIn_0.2s_ease-out]" onClick={onClose} />
      
      {/* Bottom Sheet */}
      <div className="bg-white w-full rounded-t-3xl shadow-2xl relative z-10 flex flex-col max-h-[90vh] animate-[slideUp_0.3s_ease-out]">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
          <h2 className="text-xl font-bold text-gray-800">
            {type === 'appointment' ? 'حجز موعد' : 'طلب استشارة'}
          </h2>
          <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors text-gray-600">
            <X size={20} />
          </button>
        </div>
        
        <div className="overflow-y-auto p-5 shrink">
          {/* Lawyer Info Summary */}
          <div className="flex items-center gap-3 mb-6 bg-green-50/50 p-3 rounded-xl border border-green-50">
            {lawyer.profile_picture ? (
              <img src={lawyer.profile_picture} alt="" className="w-12 h-12 rounded-full object-cover shadow-sm" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
                {lawyer.username.charAt(0)}
              </div>
            )}
            <div>
              <p className="font-bold text-gray-800 text-sm">الأستاذ {lawyer.username}</p>
              <p className="text-xs text-gray-500 mt-0.5">{lawyer.specialty || 'محامي عام'}</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Type Selector */}
            <div>
              <p className="font-bold text-gray-700 mb-3 text-sm flex items-center gap-2"><Edit3 size={16} /> نوع الخدمة</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setType('appointment')}
                  className={`flex-1 py-3 rounded-xl font-bold tracking-wide transition-all border-2 text-sm ${type === 'appointment' ? 'bg-primary text-white border-primary shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                >
                  موعد حضوري
                </button>
                <button 
                  onClick={() => setType('consultation')}
                  className={`flex-1 py-3 rounded-xl font-bold tracking-wide transition-all border-2 text-sm ${type === 'consultation' ? 'bg-primary text-white border-primary shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                >
                  استشارة عن بعد
                </button>
              </div>
            </div>

            {/* Date Picker (Horizontal Scroll) */}
            <div>
              <p className="font-bold text-gray-700 mb-3 text-sm flex items-center gap-2"><CalendarIcon size={16} /> اختر اليوم</p>
              <div className="flex overflow-x-auto gap-3 pb-2 -mx-5 px-5 snap-x hide-scrollbar">
                {dates.map((d, i) => {
                  const dateStr = d.date.toISOString().split('T')[0];
                  const isSelected = selectedDate === dateStr;
                  return (
                    <button
                      key={i}
                      onClick={() => { setSelectedDate(dateStr); setSelectedTime(''); }}
                      className={`shrink-0 snap-center w-[85px] py-3 rounded-xl flex flex-col items-center justify-center border-2 transition-all ${isSelected ? 'border-primary bg-green-50 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                    >
                      <span className={`text-xs font-bold mb-1 ${isSelected ? 'text-primary' : 'text-gray-500'}`}>{d.label.split('،')[0]}</span>
                      <span className={`text-lg font-bold ${isSelected ? 'text-primary' : 'text-gray-800'}`}>{d.date.getDate()}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Picker */}
            <div>
              <p className="font-bold text-gray-700 mb-3 text-sm flex items-center gap-2"><Clock size={16} /> اختر الوقت المتاح</p>
              <div className="grid grid-cols-4 gap-3">
                {timeSlots.map((time, i) => {
                  const isSelected = selectedTime === time;
                  const slotKey = `${selectedDate}_${time}`;
                  const isBusy = busySlots.includes(slotKey);
                  return (
                    <button
                      key={i}
                      disabled={!selectedDate || isBusy}
                      onClick={() => setSelectedTime(time)}
                      className={`py-2.5 rounded-xl border-2 text-sm font-bold tracking-wider transition-all disabled:opacity-50 disabled:bg-gray-50 ${isBusy ? 'bg-gray-100 text-gray-400 cursor-not-allowed line-through border-gray-200' : isSelected ? 'border-primary bg-primary text-white shadow-sm' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'}`}
                      dir="ltr"
                    >
                      {time} {isBusy && <span className="text-[10px] block font-normal">محجوز</span>}
                    </button>
                  );
                })}
              </div>
              {!selectedDate && <p className="text-xs text-secondary mt-2">الرجاء اختيار اليوم أولاً لعرض الأوقات المتاحة</p>}
            </div>

            {/* Notes */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="font-bold text-gray-700 text-sm flex items-center gap-2"><Edit3 size={16} /> ملاحظات تفصيلية</p>
                <span className="text-xs text-gray-400">اختياري</span>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="اكتب تفاصيل قضيتك أو استشارتك باختصار..."
                className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm min-h-[80px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all resize-none"
              ></textarea>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-5 border-t border-gray-100 shrink-0 bg-white shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
          <button
            onClick={handleSubmit}
            disabled={!selectedDate || !selectedTime || loading}
            className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95 disabled:bg-gray-300 disabled:shadow-none flex items-center justify-center gap-2 text-lg"
          >
            {loading ? <Loader2 size={24} className="animate-spin" /> : (type === 'appointment' ? 'تأكيد الحجز' : 'تأكيد الاستشارة')}
          </button>
        </div>
      </div>
    </div>
  );
}

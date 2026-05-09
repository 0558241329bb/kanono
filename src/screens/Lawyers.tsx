import React, { useEffect, useState } from 'react';
import { Search, MapPin, X, Loader2 } from 'lucide-react';
import api from '../services/api';
import LawyerCard from '../components/LawyerCard';
import BookingModal from '../components/BookingModal';
import { useNavigate } from 'react-router-dom';

const WILAYAS = ['الجزائر', 'الجلفة'];

export default function Lawyers() {
  const navigate = useNavigate();
  const [lawyers, setLawyers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');

  const [selectedLawyer, setSelectedLawyer] = useState<any>(null);
  const [bookingType, setBookingType] = useState<'appointment' | 'consultation'>('appointment');
  const [showBookingModal, setShowBookingModal] = useState(false);

  const fetchLawyers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (city) params.append('city', city);

      const res = await api.get(`/lawyers?${params.toString()}`);
      setLawyers(res.data.lawyers || []);
    } catch (err) {
      console.error('Error fetching lawyers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLawyers();
    }, 400);
    return () => clearTimeout(timer);
  }, [search, city]);

  const handleBook = (lawyer: any, type: 'appointment' | 'consultation') => {
    setSelectedLawyer(lawyer);
    setBookingType(type);
    setShowBookingModal(true);
  };

  const handleBookingSuccess = () => {
    setShowBookingModal(false);
    setSelectedLawyer(null);
    navigate('/appointments');
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 text-right relative" dir="rtl">
      <div className="bg-white p-4 shadow-sm z-10 shrink-0">
        <h1 className="text-xl font-bold text-gray-800 mb-4">دليل المحامين</h1>

        <div className="relative mb-4">
          <input
            type="text"
            placeholder="ابحث باسم المحامي..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pr-11 pl-4 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-medium"
          />
          <Search size={18} className="absolute right-4 top-3.5 text-gray-400" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute left-4 top-3.5 text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex overflow-x-auto gap-2 pb-2 -mx-4 px-4 hide-scrollbar">
          <span className="shrink-0 flex items-center bg-gray-100 text-gray-500 px-3 py-1.5 rounded-lg text-xs font-bold gap-1 mt-0.5">
            <MapPin size={14} /> الولاية
          </span>
          <button
            onClick={() => setCity('')}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${!city ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-gray-600 border-gray-200'}`}
          >
            الكل
          </button>
          {WILAYAS.map((w) => (
            <button
              key={w}
              onClick={() => setCity(w)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${city === w ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-gray-600 border-gray-200'}`}
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto w-full p-4">
        {loading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-full shrink-0"></div>
                  <div className="flex-1 space-y-3 py-1">
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <div className="flex-1 h-10 bg-gray-200 rounded-lg"></div>
                  <div className="flex-1 h-10 bg-gray-200 rounded-lg"></div>
                </div>
              </div>
            ))}
          </div>
        ) : lawyers.length > 0 ? (
          lawyers.map((lawyer) => <LawyerCard key={lawyer.id} lawyer={lawyer} onBook={handleBook} />)
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
              <Search size={40} />
            </div>
            <p className="font-bold text-gray-600 text-lg">لا يوجد نتائج</p>
            <p className="text-sm text-gray-500 mt-2">جرّب اسماً آخر أو غيّر الولاية</p>
            {(city || search) && (
              <button
                onClick={() => {
                  setCity('');
                  setSearch('');
                }}
                className="mt-6 bg-white border border-gray-300 text-gray-700 font-bold px-6 py-2 rounded-lg text-sm hover:bg-gray-50"
              >
                مسح الفلاتر
              </button>
            )}
          </div>
        )}
      </div>

      {showBookingModal && selectedLawyer && (
        <BookingModal
          lawyer={selectedLawyer}
          defaultType={bookingType}
          onClose={() => setShowBookingModal(false)}
          onSuccess={handleBookingSuccess}
        />
      )}
    </div>
  );
}

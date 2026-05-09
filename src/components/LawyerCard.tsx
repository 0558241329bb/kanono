import React from 'react';
import { User, Star, MapPin, Briefcase } from 'lucide-react';
import { Link } from 'react-router-dom';

interface LawyerProps {
  key?: string | number;
  lawyer: any;
  onBook: (lawyer: any, type: 'appointment' | 'consultation') => void;
}

export default function LawyerCard({ lawyer, onBook }: LawyerProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-3" dir="rtl">
      <Link to={`/lawyer/${lawyer.id}`} className="flex items-start gap-4 mb-3">
        <div className="shrink-0 relative">
          {lawyer.profile_picture ? (
            <img src={lawyer.profile_picture} className="w-16 h-16 rounded-full object-cover border-2 border-green-50 shadow-sm" alt={lawyer.username} />
          ) : (
            <div className="w-16 h-16 rounded-full bg-green-50 text-primary flex items-center justify-center font-bold text-xl border-2 border-green-100 shadow-sm">
              <User size={30} />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg text-gray-800 truncate">{lawyer.username}</h3>
          
          <div className="flex items-center text-sm text-gray-500 mt-1 space-x-reverse space-x-2">
            <span className="flex items-center gap-1 bg-green-50 text-primary px-2 py-0.5 rounded-full text-xs font-semibold shrink-0">
              <Briefcase size={12} />
              {lawyer.specialty || 'محامي عام'}
            </span>
            {lawyer.city && (
              <span className="flex items-center gap-1 truncate">
                <MapPin size={14} className="shrink-0" />
                <span className="truncate">{lawyer.city}</span>
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3 mt-2 text-sm">
            <div className="flex items-center text-secondary">
              <Star size={16} fill="currentColor" />
              <span className="text-gray-700 font-bold mr-1 pt-0.5">{Number(lawyer.rating || 0).toFixed(1) || 'جديد'}</span>
            </div>
            <span className="text-gray-300">|</span>
            <span className="text-gray-600">خبرة {lawyer.years_experience || 0} سنوات</span>
          </div>
        </div>
      </Link>
      
      <div className="flex gap-2 border-t border-gray-50 pt-3">
        <button 
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onBook(lawyer, 'appointment'); }}
          className="flex-1 bg-primary text-white font-bold py-2 rounded-lg text-sm transition-colors hover:bg-green-800 flex justify-center items-center gap-1 active:scale-95"
        >
          حجز موعد
        </button>
        <button 
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onBook(lawyer, 'consultation'); }}
          className="flex-1 bg-white text-primary border border-primary font-bold py-2 rounded-lg text-sm transition-colors hover:bg-green-50 flex justify-center items-center gap-1 active:scale-95"
        >
          استشارة
        </button>
      </div>
    </div>
  );
}

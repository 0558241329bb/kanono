import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { User, UserCircle, Mail, Lock, Phone, MapPin, Briefcase, FileBadge, Hash, AlertCircle, ArrowRight } from 'lucide-react';

const WILAYAS = ['الجزائر', 'الجلفة'];

export default function Register() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    phone: '',
    city: '',
    role: 'client',
    specialty: '',
    bar_number: '',
    years_experience: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const nextStep = () => {
    if (!formData.username || !formData.email || !formData.password) {
      setError('يرجى ملء الحقول المطلوبة (الاسم، البريد، كلمة المرور)');
      return;
    }
    if (formData.password.length < 8) {
      setError('كلمة المرور يجب أن لا تقل عن 8 أحرف');
      return;
    }
    setError('');
    
    if (formData.role === 'lawyer') {
      setStep(2);
    } else {
      submitForm();
    }
  };

  const submitForm = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await api.post('/auth/register', formData);
      
      if (response.data.success) {
        if (formData.role === 'lawyer') {
          setSuccessMsg('طلبك قيد المراجعة، سيتم إخطارك عند الموافقة من قبل الإدارة.');
          setTimeout(() => navigate('/login'), 4000);
        } else {
          // Auto login for clients
          const loginRes = await api.post('/auth/login', { email: formData.email, password: formData.password });
          if (loginRes.data.success) {
            login(loginRes.data.token, loginRes.data.user);
            navigate('/');
          } else {
            navigate('/login');
          }
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'حدث خطأ في التسجيل. حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  if (successMsg) {
    return (
      <div className="flex flex-col h-full bg-white p-6 justify-center items-center text-center" dir="rtl">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
          <Briefcase size={40} />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">تم إرسال الطلب بنجاح</h2>
        <p className="text-gray-600 text-lg leading-relaxed">{successMsg}</p>
        <button 
          onClick={() => navigate('/login')}
          className="mt-8 px-8 py-3 bg-primary text-white rounded-lg font-bold shadow-md hover:bg-green-800"
        >
          العودة للتسجيل الدخول
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white relative p-6 pt-6 text-right" dir="rtl">
      {/* Header */}
      <div className="flex flex-col items-center mb-6">
        <div className="w-16 h-16 bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm flex items-center justify-center p-2 mb-3">
          <img src="/logoatia.png" alt="Logo" className="w-full h-full object-contain" />
        </div>
        <div className="flex items-center w-full">
          <Link to="/login" className="p-2 -mr-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowRight size={24} />
          </Link>
          <h1 className="text-xl font-bold text-gray-800 mr-2">
            {step === 1 ? 'إنشاء حساب جديد' : 'المعلومات المهنية'}
          </h1>
        </div>
      </div>

      {error && (
        <div className="w-full bg-red-50 p-4 rounded-lg flex items-center gap-3 mb-6 text-red-600 border border-red-100">
          <AlertCircle size={20} className="shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {step === 1 ? (
        <form onSubmit={(e) => { e.preventDefault(); nextStep(); }} className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
          {/* Role Selection */}
          <div className="flex p-1 bg-gray-100 rounded-lg mb-4">
            <button
              type="button"
              className={`flex-1 py-2.5 rounded-md font-bold text-sm transition-all ${formData.role === 'client' ? 'bg-white shadow-sm text-primary' : 'text-gray-500'}`}
              onClick={() => setFormData({ ...formData, role: 'client' })}
            >
              عميل (باحث عن محامي)
            </button>
            <button
              type="button"
              className={`flex-1 py-2.5 rounded-md font-bold text-sm transition-all ${formData.role === 'lawyer' ? 'bg-white shadow-sm text-primary' : 'text-gray-500'}`}
              onClick={() => setFormData({ ...formData, role: 'lawyer' })}
            >
              فتح حساب محامي
            </button>
          </div>

          <div className="relative">
            <UserCircle className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg pr-10 pl-4 py-3 focus:outline-none focus:border-primary text-right"
              placeholder="الاسم الكامل"
              required
            />
          </div>

          <div className="relative">
            <Mail className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg pr-10 pl-4 py-3 focus:outline-none focus:border-primary text-right"
              placeholder="البريد الإلكتروني"
              required
              dir="ltr"
            />
          </div>

          <div className="relative">
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg pr-10 pl-4 py-3 focus:outline-none focus:border-primary text-right"
              placeholder="كلمة المرور (8 أحرف على الأقل)"
              required
              dir="ltr"
            />
          </div>

          <div className="relative">
            <Phone className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg pr-10 pl-4 py-3 focus:outline-none focus:border-primary text-right"
              placeholder="رقم الهاتف (اختياري)"
              dir="ltr"
            />
          </div>

          <div className="relative">
            <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={20} />
            <select
              name="city"
              value={formData.city}
              onChange={handleChange}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg pr-10 pl-4 py-3 focus:outline-none focus:border-primary text-right appearance-none"
            >
              <option value="">الولاية (اختياري)</option>
              {WILAYAS.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary text-white font-bold rounded-lg py-3.5 mt-6 flex justify-center items-center shadow-md disabled:bg-opacity-70 transition-all hover:bg-green-800"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              formData.role === 'lawyer' ? 'التالي' : 'تسجيل'
            )}
          </button>
        </form>
      ) : (
        <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
          
          <div className="relative">
            <FileBadge className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              name="specialty"
              value={formData.specialty}
              onChange={handleChange}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg pr-10 pl-4 py-3 focus:outline-none focus:border-primary text-right"
              placeholder="التخصص (مثال: جنائي، مدني، أسرة)"
            />
          </div>

          <div className="relative">
            <Hash className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              name="bar_number"
              value={formData.bar_number}
              onChange={handleChange}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg pr-10 pl-4 py-3 focus:outline-none focus:border-primary text-right"
              placeholder="رقم القيد في النقابة"
            />
          </div>

          <div className="relative">
            <Briefcase className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="number"
              name="years_experience"
              value={formData.years_experience}
              onChange={handleChange}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg pr-10 pl-4 py-3 focus:outline-none focus:border-primary text-right"
              placeholder="سنوات الخبرة"
              dir="ltr"
            />
          </div>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center bg-gray-50 text-gray-500 cursor-pointer hover:bg-gray-100 transition-colors">
            <FileBadge size={32} className="mb-2 text-primary opacity-70" />
            <span className="text-sm font-medium">إرفاق صورة البطاقة المهنية</span>
            <span className="text-xs mt-1">(اختياري في هذه المرحلة)</span>
          </div>

          <div className="flex gap-3 mt-8">
            <button 
              type="button" 
              onClick={() => setStep(1)}
              className="w-1/3 bg-gray-200 text-gray-700 font-bold rounded-lg py-3.5 hover:bg-gray-300 transition-colors"
            >
              السابق
            </button>
            <button 
              type="button" 
              onClick={submitForm}
              disabled={loading}
              className="w-2/3 bg-primary text-white font-bold rounded-lg py-3.5 flex justify-center items-center shadow-md disabled:bg-opacity-70 transition-all hover:bg-green-800"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'إرسال طلب الانضمام'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { Mail, ArrowRight, Lock, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const navigate = useNavigate();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return setError('يرجى إدخال البريد الإلكتروني');
    
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/forgot-password', { email });
      if (res.data.success) {
        // Since we are mocking the email sending, we show the OTP for testing
        alert(`للتجربة: رمز التحقق هو ${res.data.otp}`);
        setStep(2);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'حدث خطأ. تأكد من صحة البريد الإلكتروني.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTPAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return setError('يرجى إدخال رمز التحقق');
    if (newPassword.length < 8) return setError('كلمة المرور الجديدة يجب أن لا تقل عن 8 أحرف');
    if (newPassword !== confirmPassword) return setError('كلمتا المرور غير متطابقتين');
    
    setLoading(true);
    setError('');
    try {
      // Mocking the successful reset since we don't have the actual reset endpoint built
      await new Promise(r => setTimeout(r, 1500));
      setStep(3);
    } catch (err) {
      setError('رمز التحقق غير صحيح أو منتهي الصلاحية');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white relative p-6 pt-6 text-right" dir="rtl">
      {/* Header */}
      <div className="flex flex-col items-center mb-10">
        <div className="w-16 h-16 bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm flex items-center justify-center p-2 mb-3">
          <img src="/logoatia.png" alt="Logo" className="w-full h-full object-contain" />
        </div>
        <div className="flex items-center w-full">
          <Link to="/login" className="p-2 -mr-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowRight size={24} />
          </Link>
          <h1 className="text-xl font-bold text-gray-800 mr-2">استعادة كلمة المرور</h1>
        </div>
      </div>

      {error && (
        <div className="w-full bg-red-50 p-4 rounded-lg flex items-center gap-3 mb-6 text-red-600 border border-red-100">
          <AlertCircle size={20} className="shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {step === 1 && (
        <form onSubmit={handleSendOtp} className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
          <p className="text-gray-600 mb-6 leading-relaxed">
            أدخل بريدك الإلكتروني المسجل لدينا، وسنرسل لك رمز تحقق لإعادة تعيين كلمة المرور.
          </p>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700 block">البريد الإلكتروني</label>
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg pr-10 pl-4 py-3 focus:outline-none focus:border-primary text-right"
                placeholder="name@example.com"
                required
                dir="ltr"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary text-white font-bold rounded-lg py-3.5 flex justify-center items-center shadow-md disabled:bg-opacity-70"
          >
            {loading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'إرسال رمز التحقق'}
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleVerifyOTPAndReset} className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
          <p className="text-gray-600 mb-2 leading-relaxed">
            تم إرسال رمز التحقق إلى: <span className="font-bold direction-ltr inline-block text-primary">{email}</span>
          </p>

          <div className="relative">
            <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg pr-10 pl-4 py-3 focus:outline-none focus:border-primary text-center tracking-[0.5em] font-bold text-lg"
              placeholder="000000"
              maxLength={6}
              required
              dir="ltr"
            />
          </div>

          <div className="pt-4 border-t border-gray-100">
            <div className="space-y-4">
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg pr-10 pl-4 py-3 focus:outline-none focus:border-primary text-right"
                  placeholder="كلمة المرور الجديدة"
                  required
                  dir="ltr"
                />
              </div>

              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg pr-10 pl-4 py-3 focus:outline-none focus:border-primary text-right"
                  placeholder="تأكيد كلمة المرور الجديدة"
                  required
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary text-white font-bold rounded-lg py-3.5 mt-2 flex justify-center items-center shadow-md disabled:bg-opacity-70"
          >
            {loading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'إعادة تعيين كلمة المرور'}
          </button>
        </form>
      )}

      {step === 3 && (
        <div className="flex flex-col items-center justify-center pt-10 animate-[fadeIn_0.5s_ease-out]">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">تم التغيير بنجاح!</h2>
          <p className="text-gray-500 mb-8 text-center px-4">لقد تم إعادة تعيين كلمة المرور الخاصة بك بنجاح. يمكنك الآن تسجيل الدخول.</p>
          
          <button 
            onClick={() => navigate('/login')}
            className="w-full bg-primary text-white font-bold rounded-lg py-3.5 shadow-md hover:bg-green-800 transition-colors"
          >
            تسجيل الدخول
          </button>
        </div>
      )}
    </div>
  );
}

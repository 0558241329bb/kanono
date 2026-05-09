import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Eye, EyeOff, Lock, Mail, AlertCircle } from 'lucide-react';
import { signInWithGoogle } from '../../services/firebase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleFirebaseLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const fbUser = await signInWithGoogle();
      const idToken = await fbUser.getIdToken();
      
      const response = await api.post('/auth/firebase-login', { idToken, role: 'client' });
      if (response.data.success && response.data.user) {
        login(response.data.token, response.data.user);
        if (response.data.user.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/');
        }
      } else if (!response.data.user) {
        setError('تعذر الحصول على بيانات المستخدم. يرجى المحاولة مرة أخرى.');
      }
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        setError('تم إغلاق نافذة تسجيل الدخول. فضلاً حاول مرة أخرى، أو افتح التطبيق في نافذة جديدة إذا كنت تستخدم المتصفح الداخلي.');
      } else {
        console.error("Google Login Error:", err);
        const url = api.defaults.baseURL || 'undefined';
        setError((err.response?.data?.message || err.message || 'فشل تسجيل الدخول') + ` (Target: ${url})`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', { email, password });
      if (response.data.success && response.data.user) {
        login(response.data.token, response.data.user);
        if (response.data.user.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/');
        }
      } else if (!response.data.user) {
        setError('تعذر الحصول على بيانات المستخدم. يرجى المحاولة مرة أخرى.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'حدث خطأ في الاتصال. حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white relative p-6 pt-12 items-center text-right" dir="rtl">
      {/* Logo/Header */}
      <div className="mb-10 w-full flex flex-col items-center">
        <div className="w-24 h-24 overflow-hidden rounded-full flex items-center justify-center shadow-lg mb-4 bg-white border border-gray-100">
          <img src="/logoatia.png" alt="Logo" className="w-full h-full object-contain p-2" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800">تسجيل الدخول</h1>
        <p className="text-gray-500 mt-2">مرحباً بك مجدداً في البوابة القانونية</p>
      </div>

      {error && (
        <div className="w-full bg-red-50 p-4 rounded-lg flex items-center gap-3 mb-6 text-red-600 border border-red-100">
          <AlertCircle size={20} />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <button 
        onClick={handleFirebaseLogin}
        disabled={loading}
        className="w-full bg-white border border-gray-200 text-gray-700 font-bold rounded-lg py-3 flex justify-center items-center gap-3 shadow-sm transition-all hover:bg-gray-50 mb-6"
      >
        <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        تسجيل الدخول باستخدام جوجل
      </button>

      <div className="flex items-center w-full mb-6">
        <div className="flex-1 h-px bg-gray-200"></div>
        <span className="px-4 text-gray-400 text-sm font-semibold">أو عبر البريد</span>
        <div className="flex-1 h-px bg-gray-200"></div>
      </div>

      <form onSubmit={handleLogin} className="w-full space-y-5">
        <div className="space-y-1">
          <label className="text-sm font-semibold text-gray-700 block">البريد الإلكتروني</label>
          <div className="relative">
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Mail size={20} />
            </div>
            <input 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg pr-10 pl-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-right"
              placeholder="name@example.com"
              required
              dir="ltr"
            />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="text-sm font-semibold text-gray-700 block">كلمة المرور</label>
            <Link to="/forgot-password" className="text-sm text-primary font-medium hover:underline">
              نسيت كلمة المرور؟
            </Link>
          </div>
          <div className="relative">
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Lock size={20} />
            </div>
            <input 
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg pr-10 pl-12 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-right"
              placeholder="••••••••"
              required
              dir="ltr"
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-primary text-white font-bold rounded-lg py-3.5 mt-4 flex justify-center items-center shadow-md disabled:bg-opacity-70 transition-all hover:bg-green-800"
        >
          {loading ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent flex rounded-full animate-spin"></div>
          ) : (
            'دخول'
          )}
        </button>
      </form>

      <div className="mt-8 flex gap-1 justify-center w-full">
        <span className="text-gray-500">ليس لديك حساب؟</span>
        <Link to="/register" className="text-primary font-bold hover:underline">
          إنشاء حساب جديد
        </Link>
      </div>
    </div>
  );
}

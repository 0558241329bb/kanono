import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, MapPin, Phone, Mail, Award, FileText, AlertCircle, CheckCircle, ChevronLeft, Edit2, Upload, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Profile() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const isLawyer = user?.role === 'lawyer';

  const [activeSegment, setActiveSegment] = useState<'info' | 'edit' | 'password' | 'complaints'>('info');
  
  // Complaint state
  const [complaintSubject, setComplaintSubject] = useState('');
  const [complaintDesc, setComplaintDesc] = useState('');
  const [submittingComplaint, setSubmittingComplaint] = useState(false);
  const [complaintMsg, setComplaintMsg] = useState({ type: '', text: '' });

  // Edit state
  const [editData, setEditData] = useState({
    username: user?.username || '',
    phone: user?.phone || '',
    city: user?.city || '',
    bio: user?.bio || '',
    specialty: user?.lawyer_profile?.specialty || '',
    years_experience: user?.lawyer_profile?.years_experience || 0,
  });
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [updateMsg, setUpdateMsg] = useState({ type: '', text: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password state
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [updatingPass, setUpdatingPass] = useState(false);

  const CITIES = ['الجزائر', 'الجلفة'];

  const [myComplaints, setMyComplaints] = useState<any[]>([]);
  const [loadingComplaints, setLoadingComplaints] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setNewImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingProfile(true);
    setUpdateMsg({ type: '', text: '' });

    try {
      const formData = new FormData();
      formData.append('username', editData.username);
      formData.append('phone', editData.phone);
      formData.append('city', editData.city);
      formData.append('bio', editData.bio);
      
      if (newImageFile) formData.append('profile_picture', newImageFile);
      
      if (isLawyer) {
        formData.append('specialty', editData.specialty);
        formData.append('years_experience', editData.years_experience.toString());
      }
      
      const res = await api.put('/auth/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        setUpdateMsg({ type: 'success', text: 'تم تحديث الملف الشخصي بنجاح' });
        const token = localStorage.getItem('token') || '';
        if (res.data.user) {
          login(token, res.data.user);
          const u = res.data.user;
          setEditData({
            username: u.username || '',
            phone: u.phone || '',
            city: u.city || '',
            bio: u.bio || '',
            specialty: u.lawyer_profile?.specialty || '',
            years_experience: u.lawyer_profile?.years_experience || 0,
          });
          setNewImageFile(null);
          setImagePreview(null);
        }
      } else {
        setUpdateMsg({ type: 'error', text: res.data.message || 'حدث خطأ' });
      }
    } catch (err: any) {
      setUpdateMsg({ type: 'error', text: err.response?.data?.message || 'حدث خطأ أثناء تحديث الملف' });
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.next !== passwords.confirm) {
      setUpdateMsg({ type: 'error', text: 'كلمات السر الجديدة غير متطابقة' });
      return;
    }

    setUpdatingPass(true);
    setUpdateMsg({ type: '', text: '' });

    try {
      const res = await api.put('/auth/change-password', {
        current_password: passwords.current,
        new_password: passwords.next
      });

      if (res.data.success) {
        setUpdateMsg({ type: 'success', text: 'تم تغيير كلمة السر بنجاح' });
        setPasswords({ current: '', next: '', confirm: '' });
      }
    } catch (err: any) {
      setUpdateMsg({ type: 'error', text: err.response?.data?.message || 'حدث خطأ أثناء تغيير كلمة السر' });
    } finally {
      setUpdatingPass(false);
    }
  };

  const handleComplaintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintSubject || !complaintDesc) return;
    
    setSubmittingComplaint(true);
    setComplaintMsg({ type: '', text: '' });
    
    try {
      const res = await api.post('/complaints', { subject: complaintSubject, description: complaintDesc });
      if (res.data.success) {
        setComplaintMsg({
          type: 'success',
          text: 'تم إرسال الشكوى بنجاح. تُسجَّل في نظام الإدارة وتُعرض في لوحة المسؤول (قسم الشكاوى) للمعالجة، وستجدها أدناه في قائمتك.',
        });
        setComplaintSubject('');
        setComplaintDesc('');
        const listRes = await api.get('/complaints/my');
        if (listRes.data.success) setMyComplaints(listRes.data.complaints || []);
      } else {
        setComplaintMsg({ type: 'error', text: res.data.message || 'حدث خطأ' });
      }
    } catch (err: any) {
      setComplaintMsg({ type: 'error', text: err.response?.data?.message || 'حدث خطأ أثناء إرسال الشكوى' });
    } finally {
      setSubmittingComplaint(false);
    }
  };

  useEffect(() => {
    if (activeSegment !== 'complaints') return;
    let cancelled = false;
    (async () => {
      setLoadingComplaints(true);
      try {
        const res = await api.get('/complaints/my');
        if (!cancelled && res.data.success) {
          setMyComplaints(res.data.complaints || []);
        }
      } catch {
        if (!cancelled) setMyComplaints([]);
      } finally {
        if (!cancelled) setLoadingComplaints(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeSegment]);

  if (!user) return null;

  return (
    <div className="flex flex-col h-full bg-gray-50 text-right overflow-y-auto" dir="rtl">
      {/* Header and Cover */}
      <div className="bg-primary pt-8 pb-16 px-6 relative shrink-0">
         <h1 className="text-2xl font-bold text-white">حسابي</h1>
      </div>

      {/* Profile Card */}
      <div className="px-5 -mt-10 relative z-10 shrink-0">
        <div className="bg-white rounded-2xl shadow-md p-5 border border-gray-100 mb-4">
          <div className="flex items-center gap-4 border-b border-gray-100 pb-4 mb-4">
            <div className="relative shrink-0">
              {user.profile_picture ? (
                <img src={user.profile_picture} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-green-50 text-primary flex items-center justify-center font-bold text-xl border-2 border-white shadow-sm">
                  {user.username?.charAt(0) || <User size={24} />}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-lg text-gray-800 truncate">{user.username}</h2>
              <span className="inline-block bg-green-50 text-primary px-2 py-0.5 rounded text-xs font-semibold mt-1">
                {isLawyer ? 'محامي' : 'عميل'}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <Mail size={16} className="text-gray-400 shrink-0" />
              <span className="truncate" dir="ltr">{user.email}</span>
            </div>
            {user.phone && (
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Phone size={16} className="text-gray-400 shrink-0" />
                <span dir="ltr">{user.phone}</span>
              </div>
            )}
            {user.city && (
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <MapPin size={16} className="text-gray-400 shrink-0" />
                <span>{user.city}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white sticky top-0 z-20 shrink-0">
        <button 
          onClick={() => setActiveSegment('info')}
          className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeSegment === 'info' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          المعلومات
        </button>
        <button 
          onClick={() => setActiveSegment('edit')}
          className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-1 ${activeSegment === 'edit' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          تعديل الملف
        </button>
        <button 
          onClick={() => setActiveSegment('complaints')}
          className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeSegment === 'complaints' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          الدعم والشكاوى
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-5">
        {activeSegment === 'info' && (
          <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
            {isLawyer && user.lawyer_profile && (
               <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <Award size={18} className="text-primary" /> المعلومات المهنية
                  </h3>
                  <div className="space-y-3 mt-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">التخصص</span>
                      <span className="font-semibold text-gray-800">{user.lawyer_profile.specialty || '-'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">رقم الاعتماد</span>
                      <span className="font-semibold text-gray-800">{user.lawyer_profile.bar_number || '-'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">سنوات الخبرة</span>
                      <span className="font-semibold text-gray-800">{user.lawyer_profile.years_experience || 0}</span>
                    </div>
                  </div>
               </div>
            )}
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
               <button 
                 onClick={() => setActiveSegment('edit')}
                 className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
               >
                  <span className="font-bold text-gray-700 text-sm">تعديل الملف الشخصي</span>
                  <ChevronLeft size={18} className="text-gray-400" />
               </button>
               <div className="h-px bg-gray-100 ml-4"></div>
               <button 
                 onClick={() => setActiveSegment('password')}
                 className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
               >
                  <span className="font-bold text-gray-700 text-sm">تغيير كلمة المرور</span>
                  <ChevronLeft size={18} className="text-gray-400" />
               </button>
            </div>

            <button 
              onClick={handleLogout}
              className="w-full mt-4 bg-red-50 text-red-600 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors hover:bg-red-100"
            >
              <LogOut size={18} />
              تسجيل الخروج
            </button>
          </div>
        )}

        {activeSegment === 'edit' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4 animate-[fadeIn_0.3s_ease-out]">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Edit2 size={18} className="text-primary" /> تعديل الملف الشخصي
            </h3>
            
            {updateMsg.text && (
              <div className={`p-3 rounded-lg flex items-start gap-2 mb-4 text-sm ${updateMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                {updateMsg.type === 'success' ? <CheckCircle size={16} className="mt-0.5 shrink-0" /> : <AlertCircle size={16} className="mt-0.5 shrink-0" />}
                <span>{updateMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="flex flex-col items-center mb-6">
                <div className="relative mb-3">
                  <img 
                    src={imagePreview || user.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=1B5E20&color=fff`} 
                    alt="Profile" 
                    className="w-24 h-24 rounded-full object-cover border-4 border-gray-50 shadow-sm"
                  />
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-2 bg-primary text-secondary rounded-full shadow-md hover:bg-green-800 transition-colors"
                  >
                    <Upload size={14} />
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImageChange} 
                    accept="image/*" 
                    className="hidden" 
                  />
                </div>
                <span className="text-xs text-gray-500 font-semibold cursor-pointer hover:text-primary" onClick={() => fileInputRef.current?.click()}>
                  تغيير الصورة
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">الاسم الكامل / اسم المستخدم</label>
                <input 
                  value={editData.username}
                  onChange={(e) => setEditData({...editData, username: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">رقم الهاتف</label>
                <input 
                  value={editData.phone}
                  onChange={(e) => setEditData({...editData, phone: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                  dir="ltr"
                  placeholder="+213..."
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">الولاية</label>
                <select
                  value={editData.city}
                  onChange={(e) => setEditData({...editData, city: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-white"
                >
                  <option value="">اختر الولاية</option>
                  {CITIES.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">نبذة عنك</label>
                <textarea 
                  value={editData.bio}
                  onChange={(e) => setEditData({...editData, bio: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm h-20 resize-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                  placeholder="اكتب نبذة مختصرة هنا..."
                />
              </div>

              {isLawyer && (
                <>
                  <div className="pt-4 border-t border-gray-100">
                    <label className="text-xs font-semibold text-gray-600 block mb-1">التخصص</label>
                    <select
                      value={editData.specialty}
                      onChange={(e) => setEditData({...editData, specialty: e.target.value})}
                      className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-white"
                    >
                      <option value="">اختر التخصص</option>
                      <option value="القانون المدني">القانون المدني</option>
                      <option value="قانون الأسرة">قانون الأسرة</option>
                      <option value="القانون التجاري">القانون التجاري</option>
                      <option value="القانون الجنائي">القانون الجنائي</option>
                      <option value="قانون العمل">قانون العمل</option>
                      <option value="القانون الإداري">القانون الإداري</option>
                      <option value="قانون العقارات">قانون العقارات</option>
                      <option value="عام">عام</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">سنوات الخبرة</label>
                    <input 
                      type="number"
                      min="0"
                      value={editData.years_experience}
                      onChange={(e) => setEditData({...editData, years_experience: parseInt(e.target.value) || 0})}
                      className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                </>
              )}

              <button 
                type="submit" 
                disabled={updatingProfile}
                className="w-full mt-4 bg-primary text-white font-bold py-3 rounded-lg text-sm transition-transform active:scale-95 shadow-sm disabled:bg-gray-300 disabled:shadow-none flex justify-center items-center gap-2"
              >
                {updatingProfile ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : (
                  <>
                    <CheckCircle size={18} /> حفظ التغييرات
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {activeSegment === 'password' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4 animate-[fadeIn_0.3s_ease-out]">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <ShieldCheck size={18} className="text-primary" /> تغيير كلمة المرور
            </h3>
            
            {updateMsg.text && (
              <div className={`p-3 rounded-lg flex items-start gap-2 mb-4 text-sm ${updateMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                {updateMsg.type === 'success' ? <CheckCircle size={16} className="mt-0.5 shrink-0" /> : <AlertCircle size={16} className="mt-0.5 shrink-0" />}
                <span>{updateMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">كلمة المرور الحالية</label>
                <input 
                  type="password"
                  value={passwords.current}
                  onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">كلمة المرور الجديدة</label>
                <input 
                  type="password"
                  value={passwords.next}
                  onChange={(e) => setPasswords({...passwords, next: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">تأكيد كلمة المرور الجديدة</label>
                <input 
                  type="password"
                  value={passwords.confirm}
                  onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                  required
                />
              </div>

              <button 
                type="submit" 
                disabled={updatingPass}
                className="w-full mt-4 bg-primary text-white font-bold py-3 rounded-lg text-sm transition-transform active:scale-95 shadow-sm disabled:bg-gray-300 disabled:shadow-none flex justify-center items-center gap-2"
              >
                {updatingPass ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : (
                  <>
                    حفظ كلمة المرور الجديدة
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {activeSegment === 'complaints' && (
          <div className="animate-[fadeIn_0.3s_ease-out]">
             <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
                <div className="flex items-center gap-2 text-gray-800 font-bold mb-2">
                  <FileText size={18} className="text-primary" /> تقديم شكوى أو اقتراح
                </div>
                <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                  تُرسل الشكوى إلى <span className="font-semibold text-gray-700">لوحة تحكم المسؤول</span> (قسم الشكاوى) للمراجعة. يمكن للإدارة تغيير حالتها إلى «قيد المراجعة» أو «محلولة»، وستصلك إشعار عند التحديث.
                </p>

                {complaintMsg.text && (
                  <div className={`p-3 rounded-lg flex items-start gap-2 mb-4 text-sm ${complaintMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                    {complaintMsg.type === 'success' ? <CheckCircle size={16} className="mt-0.5 shrink-0" /> : <AlertCircle size={16} className="mt-0.5 shrink-0" />}
                    <span>{complaintMsg.text}</span>
                  </div>
                )}

                <form onSubmit={handleComplaintSubmit} className="space-y-3">
                   <div>
                     <label className="text-xs font-semibold text-gray-600 block mb-1">الموضوع</label>
                     <input 
                       value={complaintSubject}
                       onChange={(e) => setComplaintSubject(e.target.value)}
                       className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                       placeholder="موضوع الشكوى..."
                       required
                     />
                   </div>
                   <div>
                     <label className="text-xs font-semibold text-gray-600 block mb-1">التفاصيل</label>
                     <textarea 
                       value={complaintDesc}
                       onChange={(e) => setComplaintDesc(e.target.value)}
                       className="w-full border border-gray-200 rounded-lg p-2.5 text-sm h-24 resize-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                       placeholder="الرجاء كتابة التفاصيل هنا..."
                       required
                     />
                   </div>
                   <button 
                     type="submit" 
                     disabled={submittingComplaint || !complaintSubject || !complaintDesc}
                     className="w-full bg-primary text-white font-bold py-3 rounded-lg text-sm transition-transform active:scale-95 shadow-sm disabled:bg-gray-300 disabled:shadow-none flex justify-center items-center"
                   >
                     {submittingComplaint ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'إرسال'}
                   </button>
                </form>
             </div>

             <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <h3 className="font-bold text-gray-800 text-sm mb-3">شكواك السابقة</h3>
                {loadingComplaints ? (
                  <div className="flex justify-center py-6">
                    <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : myComplaints.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-4">لا توجد شكاوى مسجلة بعد.</p>
                ) : (
                  <ul className="space-y-3">
                    {myComplaints.map((c) => (
                      <li key={c.id} className="border border-gray-100 rounded-lg p-3 text-right">
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <span className="font-semibold text-sm text-gray-800 flex-1">{c.subject}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${
                            c.status === 'open' ? 'bg-red-100 text-red-700' :
                            c.status === 'in_review' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {c.status === 'open' ? 'مفتوحة' : c.status === 'in_review' ? 'قيد المراجعة' : 'محلولة'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2">{c.description}</p>
                      </li>
                    ))}
                  </ul>
                )}
             </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * عنوان خدمة النشر (Render): واجهة + /api + Socket.io على نفس النطاق.
 * يُستخدم في بناء الإنتاج عند غياب VITE_API_URL (مثل تطبيق Android/Capacitor حيث لا يعمل /api النسبي).
 */
export const PRODUCTION_ORIGIN = 'https://kanono-u1wb.onrender.com';

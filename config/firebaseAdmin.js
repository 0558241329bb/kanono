let cached = null;

/** تحميل كسول: لا يُنفَّذ عند بدء السيرفر (يتجنب تعطّل dev إذا كانت الحزمة ناقصة). */
export async function getFirebaseAdmin() {
  if (cached) return cached;
  const { default: admin } = await import('firebase-admin');
  const projectId =
    process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'avocatdz-d6161';
  if (!admin.apps?.length) {
    admin.initializeApp({ projectId });
  }
  cached = admin;
  return admin;
}

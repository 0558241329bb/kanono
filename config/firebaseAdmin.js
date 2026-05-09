import admin from 'firebase-admin';

const projectId =
  process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'avocatdz-d6161';

admin.initializeApp({
  projectId,
});

export default admin;

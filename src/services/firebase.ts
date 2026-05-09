import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, signInWithCredential } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Firebase Auth فقط (مجاني ضمن حدود Spark). لا نستخدم Cloud Firestore — البيانات في MySQL.
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize GoogleAuth for Capacitor
if (Capacitor.isNativePlatform()) {
  GoogleAuth.initialize();
}

export const signInWithGoogle = async () => {
  try {
    if (Capacitor.isNativePlatform()) {
      const user = await GoogleAuth.signIn();
      const credential = GoogleAuthProvider.credential(user.authentication.idToken);
      const result = await signInWithCredential(auth, credential);
      return result.user;
    } else {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    }
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

export const logoutGoogle = async () => {
  if (Capacitor.isNativePlatform()) {
    await GoogleAuth.signOut();
  }
  return signOut(auth);
};

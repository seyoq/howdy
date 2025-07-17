import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, enableNetwork, disableNetwork } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAepkMKNGf8wOk9oA1x0at5hx6x4isXleQ",
  authDomain: "diaryemo-5e11e.firebaseapp.com",
  projectId: "diaryemo-5e11e",
  storageBucket: "diaryemo-5e11e.firebasestorage.app",
  messagingSenderId: "648835360371",
  appId: "1:648835360371:web:f9da41640ceedc2407ac06",
  measurementId: "G-EV3ZDE7LX4"
};

console.log("🔥 Initializing Firebase with config:", firebaseConfig);

// Initialize Firebase
const app = initializeApp(firebaseConfig);
console.log("✅ Firebase app initialized:", app.name);

export const auth = getAuth(app);
console.log("✅ Firebase Auth initialized");

// Google Auth Provider 설정
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});
console.log("✅ Google Auth Provider configured");

// Firestore 초기화 (기본 설정 사용)
export const db = getFirestore(app);

// 네트워크 연결 강제 활성화
enableNetwork(db).catch((error) => {
  console.warn("⚠️ Failed to enable Firestore network:", error);
});

// Firebase Storage 초기화
export const storage = getStorage(app);
console.log("✅ Firebase Storage initialized");

console.log("✅ Firestore initialized");
console.log("✅ Firestore app name:", db.app.name);
console.log("✅ Firestore project ID:", firebaseConfig.projectId); 
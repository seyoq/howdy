import { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // 사용자 정보를 Firestore에 저장
        try {
          await createOrUpdateUserDocument(user);
        } catch (error) {
          console.error("사용자 문서 생성 실패:", error);
        }
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const createOrUpdateUserDocument = async (user: User) => {
    try {
      const userRef = doc(db, "users", user.uid);
      
      // 문서가 이미 존재하는지 확인
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        // 새 사용자 문서 생성
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("사용자 문서 생성 실패:", error);
    }
  };

  const value = {
    currentUser,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
} 
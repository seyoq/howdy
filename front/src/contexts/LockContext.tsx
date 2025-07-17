import { createContext, useContext, useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "./AuthContext";

interface LockContextType {
  isLocked: boolean;
  lockEnabled: boolean;
  unlockApp: () => void;
  lockApp: () => void;
  checkLockStatus: () => Promise<boolean>;
  loading: boolean;
}

const LockContext = createContext<LockContextType>({
  isLocked: false,
  lockEnabled: false,
  unlockApp: () => {},
  lockApp: () => {},
  checkLockStatus: async () => false,
  loading: true,
});

export function useLock() {
  return useContext(LockContext);
}

export function LockProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const [isLocked, setIsLocked] = useState(false);
  const [lockEnabled, setLockEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      checkLockStatus();
    } else {
      setIsLocked(false);
      setLockEnabled(false);
      setLoading(false);
    }
  }, [currentUser]);

  const checkLockStatus = async (): Promise<boolean> => {
    if (!currentUser) {
      setLoading(false);
      return false;
    }

    try {
      const lockRef = doc(db, "users", currentUser.uid, "security", "lock");
      const lockSnap = await getDoc(lockRef);
      
      if (lockSnap.exists()) {
        const lockData = lockSnap.data();
        const enabled = lockData?.enabled || false;
        setLockEnabled(enabled);
        setIsLocked(enabled);
        setLoading(false);
        return enabled;
      } else {
        setLockEnabled(false);
        setIsLocked(false);
        setLoading(false);
        return false;
      }
    } catch (error) {
      console.error("잠금 상태 확인 실패:", error);
      setLockEnabled(false);
      setIsLocked(false);
      setLoading(false);
      return false;
    }
  };

  const unlockApp = () => {
    setIsLocked(false);
  };

  const lockApp = () => {
    if (lockEnabled) {
      setIsLocked(true);
    }
  };

  const value = {
    isLocked,
    lockEnabled,
    unlockApp,
    lockApp,
    checkLockStatus,
    loading,
  };

  return (
    <LockContext.Provider value={value}>
      {children}
    </LockContext.Provider>
  );
} 
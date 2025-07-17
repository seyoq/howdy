import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Lock, Delete } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLock } from "@/contexts/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function LockScreen() {
  const { currentUser } = useAuth();
  const { unlockApp } = useLock();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isShaking, setIsShaking] = useState(false);

  // 간단한 해시 함수 (Settings와 동일)
  function simpleHash(str: string) {
    let hash = 0, i, chr;
    if (str.length === 0) return hash.toString();
    for (i = 0; i < str.length; i++) {
      chr = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    return hash.toString();
  }

  const handleNumberPress = (num: string) => {
    if (pin.length < 6) {
      setPin(prev => prev + num);
      setError("");
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError("");
  };

  const handleSubmit = async () => {
    if (!currentUser || pin.length < 4) {
      setError("비밀번호를 입력해주세요");
      return;
    }

    try {
      const lockRef = doc(db, "users", currentUser.uid, "security", "lock");
      const lockSnap = await getDoc(lockRef);
      
      if (lockSnap.exists()) {
        const lockData = lockSnap.data();
        const storedPin = lockData?.pin;
        
        if (storedPin === simpleHash(pin)) {
          unlockApp();
        } else {
          setError("비밀번호가 올바르지 않습니다");
          setPin("");
          setIsShaking(true);
          setTimeout(() => setIsShaking(false), 500);
        }
      } else {
        setError("잠금 설정을 찾을 수 없습니다");
      }
    } catch (error) {
      console.error("PIN verification failed:", error);
      setError("오류가 발생했습니다");
    }
  };

  // Enter 키 처리
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleNumberPress(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Enter') {
        handleSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [pin]);

  // PIN 입력 완료 시 자동 제출
  useEffect(() => {
    if (pin.length === 6) {
      handleSubmit();
    }
  }, [pin]);

  const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-200 via-orange-100 to-teal-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className={`bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm ${isShaking ? 'animate-pulse' : ''}`}
      >
        {/* 헤더 */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <Lock className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">잠금 해제</h1>
          <p className="text-gray-600">비밀번호를 입력해주세요</p>
        </div>

        {/* PIN 입력 표시 */}
        <div className="flex justify-center mb-6">
          <div className="flex gap-3">
            {Array.from({ length: 6 }, (_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1 * i, duration: 0.3 }}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                  i < pin.length
                    ? 'bg-orange-600 border-orange-600'
                    : 'bg-transparent border-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-red-500 text-sm text-center mb-4"
          >
            {error}
          </motion.div>
        )}

        {/* 숫자 키패드 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {numbers.slice(0, 9).map((num) => (
            <Button
              key={num}
              onClick={() => handleNumberPress(num)}
              variant="outline"
              className="h-14 text-xl font-semibold hover:bg-orange-50 hover:border-orange-600 transition-all duration-200"
            >
              {num}
            </Button>
          ))}
          <div></div>
          <Button
            onClick={() => handleNumberPress('0')}
            variant="outline"
            className="h-14 text-xl font-semibold hover:bg-orange-50 hover:border-orange-600 transition-all duration-200"
          >
            0
          </Button>
          <Button
            onClick={handleDelete}
            variant="outline"
            className="h-14 hover:bg-red-50 hover:border-red-600 transition-all duration-200"
          >
            <Delete className="w-5 h-5" />
          </Button>
        </div>

        {/* 확인 버튼 */}
        <Button
          onClick={handleSubmit}
          className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white font-semibold"
          disabled={pin.length < 4}
        >
          확인
        </Button>
      </motion.div>
    </div>
  );
}
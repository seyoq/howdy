import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Lock, Delete } from "lucide-react";
import { Button } from "@/components/ui/button";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useLock } from "@/contexts/LockContext";

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

const LockScreen = () => {
  const { currentUser } = useAuth();
  const { unlockApp } = useLock();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isShaking, setIsShaking] = useState(false);

  const handleNumberClick = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      setError("");
      
      if (newPin.length === 4) {
        setTimeout(() => handleSubmit(newPin), 100);
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError("");
  };

  const handleClear = () => {
    setPin("");
    setError("");
  };

  const handleSubmit = async (pinToCheck: string) => {
    if (!currentUser || pinToCheck.length !== 4) {
      setError("4자리 비밀번호를 입력해주세요");
      return;
    }

    try {
      const lockRef = doc(db, "users", currentUser.uid, "security", "lock");
      const lockSnap = await getDoc(lockRef);
      
      if (lockSnap.exists()) {
        const lockData = lockSnap.data();
        const savedPin = lockData?.pin;
        
        if (savedPin === simpleHash(pinToCheck)) {
          unlockApp();
        } else {
          setError("잘못된 비밀번호입니다");
          setPin("");
          setIsShaking(true);
          setTimeout(() => setIsShaking(false), 500);
        }
      } else {
        setError("잠금 설정을 찾을 수 없습니다");
      }
    } catch (error) {
      console.error("PIN 확인 실패:", error);
      setError("오류가 발생했습니다");
    }
  };

  // 에러 발생 시 흔들기 효과
  useEffect(() => {
    if (error) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    }
  }, [error]);

  const numbers = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["", "0", "⌫"]
  ];

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-orange-50 to-orange-100 flex flex-col z-50">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 pt-12">
        <div className="flex-1" />
        {pin.length > 0 && (
          <Button
            variant="ghost"
            onClick={handleClear}
            className="text-orange-600 hover:text-orange-700"
          >
            전체 삭제
          </Button>
        )}
      </div>

      {/* 메인 컨텐츠 */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ 
            opacity: 1, 
            y: 0,
            x: isShaking ? [-10, 10, -10, 10, 0] : 0
          }}
          transition={{ duration: 0.3 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-100 rounded-full mb-6">
            <Lock className="w-10 h-10 text-orange-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">잠금 해제</h1>
          <p className="text-gray-600 text-lg">4자리 비밀번호를 입력해주세요</p>
        </motion.div>

        {/* PIN 입력 표시 */}
        <div className="flex justify-center mb-12">
          <div className="flex gap-6">
            {[...Array(4)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0.8 }}
                animate={{ 
                  scale: i < pin.length ? 1.1 : 1,
                  backgroundColor: i < pin.length ? "#f97316" : "#e5e7eb"
                }}
                transition={{ duration: 0.2 }}
                className="w-6 h-6 rounded-full border-2 border-orange-300"
              />
            ))}
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-red-500 text-center mb-8 px-4"
          >
            {error}
          </motion.div>
        )}
      </div>

      {/* 숫자 패드 */}
      <div className="px-8 pb-8">
        <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
          {numbers.map((row, rowIndex) =>
            row.map((num, colIndex) => (
              <motion.div
                key={`${rowIndex}-${colIndex}`}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="ghost"
                  size="lg"
                  className={`h-16 w-16 text-2xl font-semibold rounded-full transition-all duration-200 ${
                    num === ""
                      ? "invisible"
                      : num === "⌫"
                      ? "hover:bg-red-50 hover:text-red-600"
                      : "hover:bg-orange-50 hover:text-orange-600 active:bg-orange-100"
                  }`}
                  onClick={() => {
                    if (num === "⌫") {
                      handleDelete();
                    } else if (num !== "") {
                      handleNumberClick(num);
                    }
                  }}
                  disabled={num === ""}
                >
                  {num === "⌫" ? <Delete className="w-6 h-6" /> : num}
                </Button>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* 하단 정보 */}
      <div className="text-center text-xs text-gray-500 pb-6">
        <p>앱 보안을 위해 비밀번호를 입력해주세요</p>
      </div>
    </div>
  );
};

export default LockScreen; 
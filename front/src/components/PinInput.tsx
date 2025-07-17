import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Delete, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PinInputProps {
  title: string;
  subtitle?: string;
  onComplete: (pin: string) => void;
  onBack?: () => void;
  error?: string;
  clearError?: () => void;
  key?: string; // 단계 변경 시 컴포넌트 리셋을 위한 key
  backgroundType?: 'current' | 'new' | 'confirm' | 'setup'; // 배경 타입
}

const PinInput = ({ 
  title, 
  subtitle, 
  onComplete, 
  onBack, 
  error, 
  clearError, 
  key, 
  backgroundType = 'setup' 
}: PinInputProps) => {
  const [pin, setPin] = useState("");
  const [isShaking, setIsShaking] = useState(false);

  // 배경 스타일 정의
  const getBackgroundStyle = () => {
    switch (backgroundType) {
      case 'current':
        return 'bg-gradient-to-br from-red-50 to-red-100'; // 현재 비밀번호 - 빨간색 계열
      case 'new':
        return 'bg-gradient-to-br from-blue-50 to-blue-100'; // 새 비밀번호 - 파란색 계열
      case 'confirm':
        return 'bg-gradient-to-br from-green-50 to-green-100'; // 확인 - 초록색 계열
      case 'setup':
      default:
        return 'bg-gradient-to-br from-orange-50 to-orange-100'; // 기본 설정 - 주황색 계열
    }
  };

  // 아이콘 및 강조 색상 정의
  const getAccentColor = () => {
    switch (backgroundType) {
      case 'current':
        return {
          accent: 'text-red-600',
          hover: 'hover:text-red-700',
          buttonHover: 'hover:bg-red-50 hover:text-red-600 active:bg-red-100',
          deleteHover: 'hover:bg-red-50 hover:text-red-600',
          indicatorActive: '#dc2626', // red-600
          indicatorBorder: 'border-red-300'
        };
      case 'new':
        return {
          accent: 'text-blue-600',
          hover: 'hover:text-blue-700',
          buttonHover: 'hover:bg-blue-50 hover:text-blue-600 active:bg-blue-100',
          deleteHover: 'hover:bg-blue-50 hover:text-blue-600',
          indicatorActive: '#2563eb', // blue-600
          indicatorBorder: 'border-blue-300'
        };
      case 'confirm':
        return {
          accent: 'text-green-600',
          hover: 'hover:text-green-700',
          buttonHover: 'hover:bg-green-50 hover:text-green-600 active:bg-green-100',
          deleteHover: 'hover:bg-green-50 hover:text-green-600',
          indicatorActive: '#16a34a', // green-600
          indicatorBorder: 'border-green-300'
        };
      case 'setup':
      default:
        return {
          accent: 'text-orange-600',
          hover: 'hover:text-orange-700',
          buttonHover: 'hover:bg-orange-50 hover:text-orange-600 active:bg-orange-100',
          deleteHover: 'hover:bg-red-50 hover:text-red-600',
          indicatorActive: '#ea580c', // orange-600
          indicatorBorder: 'border-orange-300'
        };
    }
  };

  const colors = getAccentColor();

  // key prop이 변경될 때 PIN 상태 리셋
  useEffect(() => {
    setPin("");
    setIsShaking(false);
    clearError?.();
  }, [key, clearError]);

  const handleNumberClick = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      clearError?.();
      
      if (newPin.length === 4) {
        // PIN 입력 완료 후 약간의 지연을 두고 콜백 실행
        setTimeout(() => {
          onComplete(newPin);
          // 콜백 실행 후 PIN 초기화
          setTimeout(() => {
            setPin("");
          }, 300);
        }, 200);
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    clearError?.();
  };

  const handleClear = () => {
    setPin("");
    clearError?.();
  };

  // 에러 발생 시 흔들기 효과 및 PIN 초기화
  useEffect(() => {
    if (error) {
      setIsShaking(true);
      setPin("");
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
    <div className={`fixed inset-0 ${getBackgroundStyle()} flex flex-col`}>
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 pt-12">
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="h-10 w-10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="flex-1" />
        {pin.length > 0 && (
          <Button
            variant="ghost"
            onClick={handleClear}
            className={`${colors.accent} ${colors.hover}`}
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
          <h1 className="text-2xl font-bold text-gray-800 mb-2">{title}</h1>
          {subtitle && (
            <p className="text-gray-600 text-lg">{subtitle}</p>
          )}
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
                  backgroundColor: i < pin.length ? colors.indicatorActive : "#e5e7eb"
                }}
                transition={{ duration: 0.2 }}
                className={`w-6 h-6 rounded-full border-2 ${colors.indicatorBorder}`}
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
                      ? colors.deleteHover
                      : colors.buttonHover
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
    </div>
  );
};

export default PinInput; 
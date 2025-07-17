import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";

interface Emotion {
  id: string;
  name: string;
  emoji: string;
  color: string;
  description: string;
}

interface LocationState {
  text?: string;
  audioFile?: File;
}

const EmotionSelection = () => {
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { text, audioFile } = location.state as LocationState || {};

  const emotions: Emotion[] = [
    {
      id: "happy",
      name: "기쁨",
      emoji: "😊",
      color: "bg-happy",
      description: "기분이 좋고 즐거워요"
    },
    {
      id: "sad",
      name: "슬픔",
      emoji: "😢",
      color: "bg-sad",
      description: "마음이 아프고 슬퍼요"
    },
    {
      id: "angry",
      name: "분노",
      emoji: "😡",
      color: "bg-angry",
      description: "짜증나고 화가 나요"
    },
    {
      id: "fear",
      name: "두려움",
      emoji: "😨",
      color: "bg-anxious",
      description: "겁나고 불안해요"
    },
    {
      id: "surprise",
      name: "놀람",
      emoji: "😲",
      color: "bg-excited",
      description: "예상치 못한 일에 놀랐어요"
    },
    {
      id: "disgust",
      name: "혐오",
      emoji: "🤢",
      color: "bg-disgust",
      description: "불쾌하고 싫어요"
    },
    {
      id: "neutral",
      name: "중성",
      emoji: "😐",
      color: "bg-calm",
      description: "특별한 감정이 없어요"
    }
  ];

  const handleEmotionSelect = (emotionId: string) => {
    setSelectedEmotion(emotionId);
  };

  const handleNext = () => {
    if (!selectedEmotion) return;
    
    // TODO: 실제로는 선택된 감정과 함께 일기 편집 페이지로 이동
    // 현재는 홈페이지로 이동 (임시)
    const selectedEmotionData = emotions.find(e => e.id === selectedEmotion);
    console.log('선택된 감정:', selectedEmotionData);
    
    // 감정 선택 완료 후 다음 페이지로 이동
    // TODO: 실제 구현에서는 일기 편집 페이지로 이동
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-peach-skin via-peach-skin/50 to-mint-aurora/30">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-peach-skin to-mint-aurora p-6 pt-12">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-charcoal mb-2">오늘의 감정</h1>
            <p className="text-charcoal/80">
              {text ? 'AI 분석에 실패했습니다. 직접 감정을 선택해주세요.' : '지금 느끼는 감정을 선택해주세요'}
            </p>
          </div>
        </div>
      </div>

      {/* 텍스트 미리보기 (텍스트가 있는 경우) */}
      {text && (
        <div className="p-6 pb-0">
          <div className="bg-fog-white/80 backdrop-blur-sm border border-charcoal/10 rounded-lg p-4">
            <h3 className="text-sm font-medium text-charcoal mb-2">일기 내용</h3>
            <p className="text-charcoal/80 text-sm line-clamp-3">
              {text}
            </p>
          </div>
        </div>
      )}

      {/* 감정 선택 영역 */}
      <div className="p-6">
        <div className="grid grid-cols-2 gap-4 mb-8">
          {emotions.map((emotion) => (
            <button
              key={emotion.id}
              onClick={() => handleEmotionSelect(emotion.id)}
              className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                selectedEmotion === emotion.id
                  ? 'border-mint-aurora bg-mint-aurora/10 shadow-lg scale-105'
                  : 'border-charcoal/20 bg-fog-white/80 hover:border-mint-aurora/50 hover:bg-mint-aurora/5'
              }`}
            >
              <div className="flex flex-col items-center space-y-2">
                <div className="text-3xl">{emotion.emoji}</div>
                <div className="text-center">
                  <h3 className="font-medium text-charcoal">{emotion.name}</h3>
                  <p className="text-xs text-charcoal/60 mt-1">{emotion.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* 다음 버튼 */}
        <Button
          onClick={handleNext}
          disabled={!selectedEmotion}
          className="w-full py-3 bg-mint-aurora hover:bg-mint-aurora/90 text-charcoal disabled:bg-charcoal/20 disabled:text-charcoal/40"
        >
          <span className="mr-2">다음</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default EmotionSelection;
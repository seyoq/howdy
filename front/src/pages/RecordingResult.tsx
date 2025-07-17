import { useState, useEffect } from "react";
import { Play, Pause, Edit, Trash2, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useNavigate, useSearchParams } from "react-router-dom";

interface EmotionConfig {
  [key: string]: {
    name: string;
    emoji: string;
    bgColor: string;
    textColor: string;
    tags: string[];
  };
}

const RecordingResult = () => {
  const [searchParams] = useSearchParams();
  const emotion = searchParams.get("emotion") || "calm";
  const [isPlaying, setIsPlaying] = useState(false);
  const [playProgress, setPlayProgress] = useState([0]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration] = useState(120); // 2분 샘플
  
  const navigate = useNavigate();

  const emotionConfig: EmotionConfig = {
    happy: {
      name: "기쁨",
      emoji: "😊",
      bgColor: "bg-yellow-200",
      textColor: "text-yellow-900",
      tags: ["#최고에요", "#기분좋음", "#행복한하루", "#웃음가득"]
    },
    calm: {
      name: "평온",
      emoji: "😌",
      bgColor: "bg-teal-200",
      textColor: "text-teal-900",
      tags: ["#차분함", "#평화로운", "#안정감", "#여유로운"]
    },
    excited: {
      name: "설렘",
      emoji: "🤗",
      bgColor: "bg-pink-200",
      textColor: "text-pink-900",
      tags: ["#두근두근", "#기대되는", "#설레는", "#신나는"]
    },
    sad: {
      name: "슬픔",
      emoji: "😢",
      bgColor: "bg-blue-200",
      textColor: "text-blue-900",
      tags: ["#우울함", "#속상한", "#눈물나는", "#힘든하루"]
    },
    anxious: {
      name: "불안",
      emoji: "😰",
      bgColor: "bg-orange-200",
      textColor: "text-orange-900",
      tags: ["#걱정되는", "#불안한", "#초조함", "#마음이무거운"]
    },
    angry: {
      name: "화남",
      emoji: "😠",
      bgColor: "bg-red-200",
      textColor: "text-red-900",
      tags: ["#짜증나는", "#화가난", "#분노", "#스트레스"]
    },
    tired: {
      name: "피곤",
      emoji: "😴",
      bgColor: "bg-purple-200",
      textColor: "text-purple-900",
      tags: ["#피곤한", "#지친", "#졸린", "#휴식필요"]
    },
    confused: {
      name: "혼란",
      emoji: "😵",
      bgColor: "bg-amber-200",
      textColor: "text-amber-900",
      tags: ["#복잡한", "#혼란스러운", "#정리안됨", "#생각많은"]
    }
  };

  const currentEmotion = emotionConfig[emotion] || emotionConfig.calm;

  // 현재 날짜와 요일 가져오기
  const getCurrentDate = () => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      weekday: 'long'
    };
    return now.toLocaleDateString('ko-KR', options);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleProgressChange = (value: number[]) => {
    setPlayProgress(value);
    setCurrentTime(Math.floor((value[0] / 100) * duration));
  };

  const handleEdit = () => {
    // 수정 기능은 아직 미구현
  };

  const handleDelete = () => {
    navigate("/");
  };

  const handleSave = () => {
    navigate("/");
  };

  // 재생 중일 때 진행률 업데이트
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= duration) {
            setIsPlaying(false);
            return duration;
          }
          const newTime = prev + 1;
          setPlayProgress([(newTime / duration) * 100]);
          return newTime;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, duration]);

  return (
    <div className={`min-h-screen ${currentEmotion.bgColor} flex flex-col`}>
      {/* 상단 헤더 */}
      <div className="flex items-center justify-between p-6 pt-12">
        <Button
          onClick={() => navigate(-1)}
          variant="ghost"
          size="icon"
          className={`${currentEmotion.textColor} hover:bg-black/10`}
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={handleEdit}
            variant="ghost"
            size="icon"
            className={`${currentEmotion.textColor} hover:bg-black/10`}
          >
            <Edit className="w-5 h-5" />
          </Button>
          <Button
            onClick={handleDelete}
            variant="ghost"
            size="icon"
            className={`${currentEmotion.textColor} hover:bg-black/10`}
          >
            <Trash2 className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* 날짜와 감정 */}
        <div className="text-center mb-8">
          <div className={`text-lg ${currentEmotion.textColor} mb-2`}>
            {getCurrentDate()}
          </div>
          <div className="text-6xl mb-4">
            {currentEmotion.emoji}
          </div>
          <div className={`text-2xl font-bold ${currentEmotion.textColor}`}>
            {currentEmotion.name}
          </div>
        </div>

        {/* 해시태그 스타일 감정 요약 */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {currentEmotion.tags.map((tag, index) => (
            <span
              key={index}
              className={`px-3 py-1 rounded-full bg-white/20 ${currentEmotion.textColor} text-sm font-medium`}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* 음성 재생 컨트롤 */}
        <div className="w-full max-w-sm">
          {/* 재생 시간 표시 */}
          <div className={`flex justify-between text-sm ${currentEmotion.textColor} mb-2`}>
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          {/* 재생 진행 바 */}
          <div className="mb-6">
            <Slider
              value={playProgress}
              onValueChange={handleProgressChange}
              max={100}
              step={1}
              className="w-full"
            />
          </div>

          {/* 재생 버튼 */}
          <div className="flex justify-center mb-8">
            <Button
              onClick={handlePlayPause}
              size="lg"
              className={`w-16 h-16 rounded-full bg-white/80 hover:bg-white text-gray-800 hover:text-gray-900 shadow-lg`}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6 ml-1" />
              )}
            </Button>
          </div>
        </div>

        {/* 저장 버튼 */}
        <Button
          onClick={handleSave}
          size="lg"
          className="bg-white/80 hover:bg-white text-gray-800 hover:text-gray-900 px-8 py-3 rounded-full shadow-lg"
        >
          <Home className="w-5 h-5 mr-2" />
          홈으로 저장
        </Button>
      </div>
    </div>
  );
};

export default RecordingResult; 
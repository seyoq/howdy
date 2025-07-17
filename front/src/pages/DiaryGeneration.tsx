import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Smile, Frown, Angry, AlertTriangle, Heart, Meh, Zap } from 'lucide-react';

export default function DiaryGeneration() {
  const navigate = useNavigate();
  const text = localStorage.getItem("transcribedText") || "";
  
  const [currentStep, setCurrentStep] = useState(0);
  const [showEmotionButton, setShowEmotionButton] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [dots, setDots] = useState('');
  const [fadeClass, setFadeClass] = useState('opacity-100');
  const [buttonOpacity, setButtonOpacity] = useState('opacity-0');
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stepRef = useRef<NodeJS.Timeout | null>(null);
  const dotsRef = useRef<NodeJS.Timeout | null>(null);
  const emotionButtonRef = useRef<NodeJS.Timeout | null>(null);

  const steps = [
    { icon: Smile, label: '기쁨과 즐거움을 찾고 있어요', color: 'text-yellow-500' },
    { icon: Heart, label: '사랑과 감동을 분석하고 있어요', color: 'text-pink-500' },
    { icon: Frown, label: '슬픔과 아쉬움을 이해하고 있어요', color: 'text-blue-500' },
    { icon: Angry, label: '화남과 분노를 파악하고 있어요', color: 'text-red-500' },
    { icon: AlertTriangle, label: '걱정과 불안을 살펴보고 있어요', color: 'text-orange-500' },
    { icon: Meh, label: '평온함과 무덤덤함을 감지하고 있어요', color: 'text-gray-500' },
  ];

  useEffect(() => {
    if (!text) {
      navigate('/');
      return;
    }

    startAnalysis();

    // 컴포넌트 언마운트 시 타이머 정리
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (stepRef.current) clearInterval(stepRef.current);
      if (dotsRef.current) clearInterval(dotsRef.current);
      if (emotionButtonRef.current) clearTimeout(emotionButtonRef.current);
    };
  }, [text, navigate]);

  const startAnalysis = async () => {
    try {
      setCurrentStep(0);
      setShowEmotionButton(false);
      setButtonOpacity('opacity-0');
      setIsComplete(false);
      setFadeClass('opacity-100');

      // 점 애니메이션 시작
      dotsRef.current = setInterval(() => {
        setDots(prev => {
          if (prev === '...') return '';
          return prev + '.';
        });
      }, 500);

      // 단계 변경 (8초마다, 페이드 효과 포함)
      stepRef.current = setInterval(() => {
        // 페이드 아웃
        setFadeClass('opacity-0');
        
        // 0.5초 후 다음 단계로 변경하고 페이드 인
        setTimeout(() => {
          setCurrentStep(prev => (prev + 1) % steps.length);
          setFadeClass('opacity-100');
        }, 500);
      }, 8000);

      // 10초 후 감정 선택 버튼 표시
      emotionButtonRef.current = setTimeout(() => {
        setShowEmotionButton(true);
        // 버튼을 DOM에 추가한 후 바로 페이드 인 시작
        requestAnimationFrame(() => {
          setButtonOpacity('opacity-100');
        });
      }, 10000);

      // 30초 후 분석 실패로 처리
      timeoutRef.current = setTimeout(() => {
        // 모든 인터벌 정리
        if (stepRef.current) clearInterval(stepRef.current);
        if (dotsRef.current) clearInterval(dotsRef.current);
        if (emotionButtonRef.current) clearTimeout(emotionButtonRef.current);
        
        // 감정 선택 페이지로 이동
        navigate('/emotion-selection');
      }, 30000);

      // 실제 AI 분석 서버에 요청
      // 최소 5초 지연으로 애니메이션 보장
      const minDelay = new Promise(resolve => setTimeout(resolve, 5000));
      
      // 감정 분석 API 호출
      const emotionResponse = await fetch('http://localhost:8001/api/v1/emotion/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          user_id: 'current_user'
        }),
      });

      if (!emotionResponse.ok) {
        throw new Error(`감정 분석 서버 오류: ${emotionResponse.status}`);
      }

      const emotionResult = await emotionResponse.json();
      
      // 피드백 생성 요청
      const feedbackResponse = await fetch('http://localhost:8001/api/v1/feedback/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          emotion: emotionResult.primary_emotion,
          style: 'empathetic',
          user_id: 'current_user'
        }),
      });

      if (!feedbackResponse.ok) {
        throw new Error(`피드백 생성 서버 오류: ${feedbackResponse.status}`);
      }

      const feedbackResult = await feedbackResponse.json();

      // 분석 결과 통합
      const analysisResult = {
        emotion_analysis: {
          primary_emotion: emotionResult.primary_emotion,
          primary_emotion_score: emotionResult.primary_emotion_score,
          primary_emotion_emoji: emotionResult.primary_emotion_emoji,
          all_emotions: emotionResult.all_emotions,
          confidence: emotionResult.confidence
        },
        ai_feedback: {
          feedback_text: feedbackResult.feedback_text,
          style: feedbackResult.style,
          confidence: feedbackResult.confidence
        },
        original_text: text
      };

      // 최소 지연 시간 대기
      await minDelay;

      // 성공 시 타이머 정리
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (stepRef.current) clearInterval(stepRef.current);
      if (dotsRef.current) clearInterval(dotsRef.current);
      if (emotionButtonRef.current) clearTimeout(emotionButtonRef.current);
      
      setIsComplete(true);
      
      // DiaryFeedback 페이지로 이동
      navigate('/diary-feedback', {
        state: { feedbackData: analysisResult }
      });

    } catch (error) {
      console.error('AI 분석 요청 실패:', error);
      
      // 타이머 정리
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (stepRef.current) clearInterval(stepRef.current);
      if (dotsRef.current) clearInterval(dotsRef.current);
      if (emotionButtonRef.current) clearTimeout(emotionButtonRef.current);
      
      // 오류 시 Mock 데이터로 대체
      const mockData = {
        emotion_analysis: {
          primary_emotion: "중성",
          primary_emotion_score: 0.7,
          primary_emotion_emoji: "😐",
          all_emotions: [
            { emotion: "중성", score: 0.7, emoji: "😐" },
            { emotion: "기쁨", score: 0.2, emoji: "😊" },
            { emotion: "슬픔", score: 0.1, emoji: "😢" }
          ],
          confidence: 0.7
        },
        ai_feedback: {
          feedback_text: "현재 AI 분석 서버에 연결할 수 없습니다. 나중에 다시 시도해주세요.",
          style: "empathetic",
          confidence: 0.5
        },
        original_text: text
      };



      // 최소 지연 시간 대기
      await new Promise(resolve => setTimeout(resolve, 3000));

      navigate('/diary-feedback', {
        state: { feedbackData: mockData }
      });
    }
  };

  const handleBack = () => {
    // 타이머 정리
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (stepRef.current) clearInterval(stepRef.current);
    if (dotsRef.current) clearInterval(dotsRef.current);
    if (emotionButtonRef.current) clearTimeout(emotionButtonRef.current);
    
    navigate('/text-edit');
  };

  const handleGoToEmotionSelection = () => {
    // 타이머 정리
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (stepRef.current) clearInterval(stepRef.current);
    if (dotsRef.current) clearInterval(dotsRef.current);
    if (emotionButtonRef.current) clearTimeout(emotionButtonRef.current);
    
    navigate('/emotion-selection');
  };

  // 배경색 - 분석 페이지는 로즈 계열
  const getBackgroundClasses = () => {
    return "bg-gradient-to-br from-rose-100 to-rose-200";
  };

  const getTextClasses = () => {
    return "text-rose-800";
  };

  const getButtonClasses = () => {
    return "text-rose-800 hover:bg-rose-200/50";
  };

  return (
    <div className={`min-h-screen ${getBackgroundClasses()} transition-all duration-1000 ease-in-out flex flex-col relative`}>
      {/* 상단 뒤로가기 버튼 */}
      <div className="flex items-center justify-between p-6 pt-12 transform -translate-y-9">
        <Button
          onClick={handleBack}
          variant="ghost"
          size="icon"
          className={`${getButtonClasses()} transition-colors duration-500`}
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <div className="flex-1" />
      </div>

      {/* 메인 콘텐츠 - 중앙 정렬 */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 transform -translate-y-9">
        {/* 현재 단계 아이콘 */}
        <div className="mb-[160px]">
          <div className="flex justify-center relative">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={index}
                  className={`absolute transition-all duration-2000 ${
                    index === currentStep
                      ? `opacity-100 scale-125 ${step.color}`
                      : 'opacity-0 scale-75'
                  }`}
                >
                  <Icon className={`w-20 h-20 ${index === currentStep ? 'animate-pulse' : ''}`} />
                </div>
              );
            })}
          </div>
        </div>

        {/* 현재 단계 설명 - 중앙 위치에 고정하되 왼쪽 정렬, 페이드 효과 */}
        <div className="mb-8 h-12 flex items-center justify-center w-full relative">
          <div className="absolute left-1/2 transform -translate-x-1/2 w-96 ml-[46px]">
            <p className={`${getTextClasses()} font-bold text-2xl text-left transition-opacity duration-[2000ms] ${fadeClass} whitespace-nowrap`}>
              {steps[currentStep]?.label}{dots}
            </p>
          </div>
        </div>

        {/* 로딩 애니메이션 */}
        <div className="mb-8 flex justify-center space-x-3">
          <div className="w-4 h-4 bg-rose-400 rounded-full animate-bounce"></div>
          <div className="w-4 h-4 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-4 h-4 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>

      {/* 감정 선택 버튼 - 10초 후 표시, 절대 위치로 기존 요소 이동 방지 */}
      {showEmotionButton && (
        <div className={`absolute bottom-20 left-1/2 transform -translate-x-1/2 transition-opacity ease-in-out ${buttonOpacity}`} style={{ transitionDuration: '4000ms' }}>
          <Button
            onClick={handleGoToEmotionSelection}
            className="bg-rose-400 hover:bg-rose-500 text-white px-8 py-3 text-lg font-medium rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            <Zap className="w-5 h-5 mr-2" />
            빠르게 직접 선택하기
          </Button>
        </div>
      )}
    </div>
  );
} 
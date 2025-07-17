import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Edit3, Loader2, Sparkles } from 'lucide-react';

interface LocationState {
  text: string;
  audioFile?: File;
}

export default function TextEdit() {
  const navigate = useNavigate();
  const location = useLocation();
  const { text: initialText, audioFile } = location.state as LocationState || { text: '' };
  
  const [text, setText] = useState(initialText);
  const [isLoading, setIsLoading] = useState(false);

  // 텍스트가 없으면 홈으로 리다이렉트
  useEffect(() => {
    if (!initialText) {
      navigate('/');
    }
  }, [initialText, navigate]);

  const handleBack = () => {
    navigate('/recording');
  };

  const handleStartAnalysis = async () => {
    setIsLoading(true);
    
    try {
      // TODO: 실제 백엔드 API 호출로 텍스트 전송
      // const response = await fetch('/api/analyze-text', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({ text }),
      // });
      
      // 텍스트를 localStorage에 저장
      localStorage.setItem("transcribedText", text);
      
      // Mock 처리로 분석 페이지로 이동
      setTimeout(() => {
        navigate('/diary-generation');
      }, 500);
    } catch (error) {
      console.error('텍스트 분석 요청 실패:', error);
      // 오류 시 감정 선택 페이지로 이동
      navigate('/emotion-selection', {
        state: { text, audioFile }
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-peach-skin via-peach-skin/50 to-mint-aurora/30 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-mint-aurora mb-4 mx-auto" />
          <p className="text-charcoal/70">분석 페이지로 이동 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-peach-skin via-peach-skin/50 to-mint-aurora/30">
      {/* 헤더 */}
      <header className="flex items-center justify-between p-4 border-b border-charcoal/10">
        <Button 
          variant="ghost" 
          onClick={handleBack}
          className="text-charcoal hover:bg-charcoal/5"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <h1 className="text-lg font-semibold text-charcoal">음성 변환 결과</h1>
        
        <div className="w-10" />
      </header>

      {/* 메인 콘텐츠 */}
      <div className="p-6">
        <Card className="bg-fog-white/80 backdrop-blur-sm border-charcoal/10">
          <CardHeader>
            <CardTitle className="text-charcoal flex items-center gap-2">
              <Edit3 className="w-5 h-5" />
              변환된 텍스트
            </CardTitle>
            <p className="text-charcoal/60 text-sm">
              AI가 음성을 텍스트로 변환했습니다. 내용을 확인하고 자유롭게 수정해주세요.
            </p>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* 텍스트 편집 영역 */}
            <div className="relative">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="변환된 텍스트가 여기에 표시됩니다..."
                className="min-h-[400px] bg-fog-white border-charcoal/20 text-charcoal placeholder:text-charcoal/40 focus:border-mint-aurora focus:ring-mint-aurora/20 resize-none text-base leading-relaxed"
              />
            </div>

            {/* 글자 수 표시 */}
            <div className="flex justify-end">
              <div className="text-sm text-charcoal/60">
                {text.length} 글자
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 하단 버튼 */}
        <div className="mt-6 flex justify-center">
          <Button
            onClick={handleStartAnalysis}
            disabled={!text.trim()}
            className="bg-rose-400 hover:bg-rose-500 text-white disabled:bg-charcoal/20 disabled:text-charcoal/40 px-8 py-3 text-lg font-medium"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            분석 시작하기
          </Button>
        </div>
      </div>
    </div>
  );
} 
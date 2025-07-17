import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Brain, Heart, MessageSquare, Sparkles, BookOpen, Save } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface FeedbackData {
  emotion_analysis: {
    primary_emotion: string;
    primary_emotion_score: number;
    primary_emotion_emoji: string;
    all_emotions: Array<{
      emotion: string;
      score: number;
      emoji: string;
    }>;
    confidence: number;
  };
  ai_feedback: {
    feedback_text: string;
    style: string;
    confidence: number;
  };
  original_text: string;
}

export default function DiaryFeedback() {
  const navigate = useNavigate();
  const location = useLocation();

  const { currentUser } = useAuth();
  
  const [feedbackData, setFeedbackData] = useState<FeedbackData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // location.state에서 분석 결과 받기
    if (location.state?.feedbackData) {
      setFeedbackData(location.state.feedbackData);
      setIsLoading(false);
    } else {
      // 데이터가 없으면 홈으로 리다이렉트
      console.error('분석 결과를 불러올 수 없습니다.');
      navigate('/');
    }
  }, [location.state, navigate]);

  const handleBack = () => {
    navigate('/text-edit');
  };

  const handleSaveDiary = async () => {
    if (!feedbackData || !currentUser) {
      console.error('로그인이 필요합니다.');
      return;
    }

    setIsSaving(true);

    try {
      // Firebase Firestore에 일기 데이터 저장
      const diaryData = {
        uid: currentUser.uid,
        text: feedbackData.original_text,
        emotion_analysis: {
          primary_emotion: feedbackData.emotion_analysis.primary_emotion,
          primary_emotion_score: feedbackData.emotion_analysis.primary_emotion_score,
          primary_emotion_emoji: feedbackData.emotion_analysis.primary_emotion_emoji,
          all_emotions: feedbackData.emotion_analysis.all_emotions,
          confidence: feedbackData.emotion_analysis.confidence
        },
        ai_feedback: {
          feedback_text: feedbackData.ai_feedback.feedback_text,
          style: feedbackData.ai_feedback.style,
          confidence: feedbackData.ai_feedback.confidence
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // 'diaries' 컬렉션에 문서 추가
      const docRef = await addDoc(collection(db, 'diaries'), diaryData);
      
      console.log('일기 저장 성공, Document ID:', docRef.id);
      
      // 로컬 스토리지에도 임시 저장 (오프라인 대응)
      localStorage.setItem('lastDiaryFeedback', JSON.stringify(feedbackData));
      
      console.log('일기가 성공적으로 저장되었습니다.');
      
      navigate('/');
    } catch (error) {
      console.error('일기 저장 실패:', error);
      console.error('일기 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const getEmotionColor = (emotion: string) => {
    const colors: { [key: string]: string } = {
      '기쁨': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      '슬픔': 'bg-blue-100 text-blue-800 border-blue-300',
      '분노': 'bg-red-100 text-red-800 border-red-300',
      '두려움': 'bg-purple-100 text-purple-800 border-purple-300',
      '놀람': 'bg-orange-100 text-orange-800 border-orange-300',
      '혐오': 'bg-gray-100 text-gray-800 border-gray-300',
      '중성': 'bg-green-100 text-green-800 border-green-300'
    };
    return colors[emotion] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getFeedbackIcon = (style: string) => {
    switch (style) {
      case 'empathetic':
        return <Heart className="w-5 h-5" />;
      case 'encouraging':
        return <Sparkles className="w-5 h-5" />;
      case 'analytical':
        return <Brain className="w-5 h-5" />;
      default:
        return <MessageSquare className="w-5 h-5" />;
    }
  };

  const getFeedbackStyleName = (style: string) => {
    switch (style) {
      case 'empathetic':
        return '공감형';
      case 'encouraging':
        return '격려형';
      case 'analytical':
        return '분석형';
      default:
        return '일반형';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-peach-skin via-peach-skin/50 to-mint-aurora/30 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mint-aurora mb-4 mx-auto"></div>
          <p className="text-charcoal/70">피드백을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!feedbackData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-peach-skin via-peach-skin/50 to-mint-aurora/30 flex items-center justify-center">
        <div className="text-center">
          <p className="text-charcoal/70">분석 결과를 불러올 수 없습니다.</p>
          <Button onClick={() => navigate('/')} className="mt-4">
            홈으로 돌아가기
          </Button>
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
        
        <h1 className="text-lg font-semibold text-charcoal">AI 분석 결과</h1>
        
        <div className="w-10" />
      </header>

      {/* 메인 콘텐츠 */}
      <div className="p-6 space-y-6">
        {/* 감정 분석 결과 */}
        <Card className="bg-fog-white/80 backdrop-blur-sm border-charcoal/10">
          <CardHeader>
            <CardTitle className="text-charcoal flex items-center gap-2">
              <Brain className="w-5 h-5" />
              감정 분석 결과
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* 주요 감정 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{feedbackData.emotion_analysis.primary_emotion_emoji}</span>
                <div>
                  <Badge className={getEmotionColor(feedbackData.emotion_analysis.primary_emotion)}>
                    {feedbackData.emotion_analysis.primary_emotion}
                  </Badge>
                  <p className="text-sm text-charcoal/60 mt-1">
                    신뢰도: {(feedbackData.emotion_analysis.primary_emotion_score * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>

            {/* 모든 감정 분석 */}
            <div>
              <h4 className="font-medium text-charcoal mb-3">세부 감정 분석</h4>
              <div className="grid grid-cols-2 gap-2">
                {feedbackData.emotion_analysis.all_emotions.map((emotion, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-fog-white/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span>{emotion.emoji}</span>
                      <span className="text-sm text-charcoal">{emotion.emotion}</span>
                    </div>
                    <span className="text-sm text-charcoal/60">
                      {(emotion.score * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI 피드백 */}
        <Card className="bg-fog-white/80 backdrop-blur-sm border-charcoal/10">
          <CardHeader>
            <CardTitle className="text-charcoal flex items-center gap-2">
              {getFeedbackIcon(feedbackData.ai_feedback.style)}
              AI 피드백 ({getFeedbackStyleName(feedbackData.ai_feedback.style)})
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <div className="bg-mint-aurora/5 border border-mint-aurora/20 rounded-lg p-4">
              <p className="text-charcoal leading-relaxed">
                {feedbackData.ai_feedback.feedback_text}
              </p>
              <div className="mt-3 flex justify-end">
                <span className="text-sm text-charcoal/60">
                  신뢰도: {(feedbackData.ai_feedback.confidence * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 원본 텍스트 */}
        <Card className="bg-fog-white/80 backdrop-blur-sm border-charcoal/10">
          <CardHeader>
            <CardTitle className="text-charcoal flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              원본 일기
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <div className="bg-fog-white/50 border border-charcoal/10 rounded-lg p-4">
              <p className="text-charcoal leading-relaxed">
                {feedbackData.original_text}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 하단 버튼 */}
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={handleBack}
            className="flex-1 border-charcoal/20 text-charcoal hover:bg-charcoal/5"
          >
            수정하기
          </Button>
          
          <Button 
            onClick={handleSaveDiary}
            disabled={isSaving}
            className="flex-1 bg-mint-aurora text-fog-white hover:bg-mint-aurora/90 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-fog-white mr-2"></div>
                저장 중...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                일기 저장
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
} 
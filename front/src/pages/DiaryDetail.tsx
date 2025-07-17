import { useState, useEffect } from "react";
import { ArrowLeft, Edit3, Trash2, Brain, BookOpen, Heart, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DiaryDetailData {
  id: string;
  uid: string;
  text: string;
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
  createdAt: any;
  updatedAt: any;
}

const DiaryDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  
  const [diaryData, setDiaryData] = useState<DiaryDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDiary = async () => {
      if (!id || !currentUser) {
        toast({
          title: "오류",
          description: "일기를 불러올 수 없습니다.",
          variant: "destructive"
        });
        navigate('/');
        return;
      }

      try {
        const docRef = doc(db, 'diaries', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as DiaryDetailData;
          if (data.uid === currentUser.uid) {
            setDiaryData({ ...data, id: docSnap.id });
          } else {
            toast({
              title: "접근 권한 없음",
              description: "이 일기에 접근할 권한이 없습니다.",
              variant: "destructive"
            });
            navigate('/');
          }
        } else {
          toast({
            title: "일기를 찾을 수 없음",
            description: "요청한 일기를 찾을 수 없습니다.",
            variant: "destructive"
          });
          navigate('/');
        }
      } catch (error) {
        console.error('일기 불러오기 실패:', error);
        toast({
          title: "오류",
          description: "일기를 불러오는 중 오류가 발생했습니다.",
          variant: "destructive"
        });
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDiary();
  }, [id, currentUser, navigate, toast]);

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

  const getFeedbackIcon = (style: string) => {
    switch (style) {
      case 'empathetic':
        return <Heart className="w-5 h-5" />;
      case 'encouraging':
        return <MessageCircle className="w-5 h-5" />;
      case 'analytical':
        return <Brain className="w-5 h-5" />;
      default:
        return <MessageCircle className="w-5 h-5" />;
    }
  };

  const handleEdit = () => {
    navigate(`/text-edit`, { state: { diaryData } });
  };

  const handleDelete = () => {
    if (window.confirm("정말 이 일기를 삭제하시겠습니까?")) {
      // TODO: Firebase에서 삭제 로직 구현
      console.log("일기 삭제:", diaryData?.id);
      navigate("/");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-peach-skin via-peach-skin/50 to-mint-aurora/30 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mint-aurora mb-4 mx-auto"></div>
          <p className="text-charcoal/70">일기를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!diaryData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-peach-skin via-peach-skin/50 to-mint-aurora/30 flex items-center justify-center">
        <div className="text-center">
          <p className="text-charcoal/70">일기를 불러올 수 없습니다.</p>
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
          onClick={() => navigate(-1)}
          className="text-charcoal hover:bg-charcoal/5"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <h1 className="text-lg font-semibold text-charcoal">일기 상세</h1>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleEdit}
            className="text-charcoal hover:bg-charcoal/5"
          >
            <Edit3 className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleDelete}
            className="text-charcoal hover:bg-charcoal/5"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <div className="p-6 space-y-6">
        {/* 기본 정보 */}
        <Card className="bg-fog-white/80 backdrop-blur-sm border-charcoal/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{diaryData.emotion_analysis.primary_emotion_emoji}</span>
                <div>
                  <Badge className={getEmotionColor(diaryData.emotion_analysis.primary_emotion)}>
                    {diaryData.emotion_analysis.primary_emotion}
                  </Badge>
                  <p className="text-sm text-charcoal/60 mt-1">
                    {diaryData.createdAt && new Date(diaryData.createdAt.toDate()).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-charcoal/60">
                  신뢰도: {(diaryData.emotion_analysis.primary_emotion_score * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* 감정 분석 결과 */}
        <Card className="bg-fog-white/80 backdrop-blur-sm border-charcoal/10">
          <CardHeader>
            <CardTitle className="text-charcoal flex items-center gap-2">
              <Brain className="w-5 h-5" />
              감정 분석 결과
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {diaryData.emotion_analysis.all_emotions.map((emotion, index) => (
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
          </CardContent>
        </Card>

        {/* AI 피드백 */}
        <Card className="bg-fog-white/80 backdrop-blur-sm border-charcoal/10">
          <CardHeader>
            <CardTitle className="text-charcoal flex items-center gap-2">
              {getFeedbackIcon(diaryData.ai_feedback.style)}
              AI 피드백 ({getFeedbackStyleName(diaryData.ai_feedback.style)})
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <div className="bg-mint-aurora/5 border border-mint-aurora/20 rounded-lg p-4">
              <p className="text-charcoal leading-relaxed">
                {diaryData.ai_feedback.feedback_text}
              </p>
              <div className="mt-3 flex justify-end">
                <span className="text-sm text-charcoal/60">
                  신뢰도: {(diaryData.ai_feedback.confidence * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 원본 일기 */}
        <Card className="bg-fog-white/80 backdrop-blur-sm border-charcoal/10">
          <CardHeader>
            <CardTitle className="text-charcoal flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              원본 일기
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <div className="bg-fog-white/50 border border-charcoal/10 rounded-lg p-4">
              <p className="text-charcoal leading-relaxed whitespace-pre-line">
                {diaryData.text}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 하단 버튼 */}
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={() => navigate('/')}
            className="flex-1 border-charcoal/20 text-charcoal hover:bg-charcoal/5"
          >
            홈으로 돌아가기
          </Button>
          
          <Button 
            onClick={handleEdit}
            className="flex-1 bg-mint-aurora text-fog-white hover:bg-mint-aurora/90"
          >
            수정하기
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DiaryDetail;
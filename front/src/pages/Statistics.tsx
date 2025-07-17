import { useState } from "react";
import { TrendingUp, Calendar, Heart, BarChart3, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";

interface EmotionStat {
  emotion: string;
  name: string;
  emoji: string;
  count: number;
  percentage: number;
  color: string;
}

interface MoodTrend {
  date: string;
  mood: number; // 1-5 scale
}

const Statistics = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<"week" | "month" | "year">("month");
  const navigate = useNavigate();

  // 샘플 데이터
  const emotionStats: EmotionStat[] = [
    { emotion: "happy", name: "기쁨", emoji: "😊", count: 12, percentage: 40, color: "bg-happy" },
    { emotion: "calm", name: "평온", emoji: "😌", count: 8, percentage: 27, color: "bg-calm" },
    { emotion: "excited", name: "설렘", emoji: "🤗", count: 5, percentage: 17, color: "bg-excited" },
    { emotion: "sad", name: "슬픔", emoji: "😢", count: 3, percentage: 10, color: "bg-sad" },
    { emotion: "anxious", name: "불안", emoji: "😰", count: 2, percentage: 6, color: "bg-anxious" },
  ];

  const moodTrends: MoodTrend[] = [
    { date: "12/01", mood: 4 },
    { date: "12/02", mood: 3 },
    { date: "12/03", mood: 5 },
    { date: "12/04", mood: 4 },
    { date: "12/05", mood: 2 },
    { date: "12/06", mood: 3 },
    { date: "12/07", mood: 4 },
  ];

  const totalEntries = emotionStats.reduce((sum, stat) => sum + stat.count, 0);
  const averageMood = moodTrends.reduce((sum, trend) => sum + trend.mood, 0) / moodTrends.length;

  const getMoodColor = (mood: number) => {
    if (mood >= 4.5) return "text-happy";
    if (mood >= 3.5) return "text-calm";
    if (mood >= 2.5) return "text-excited";
    if (mood >= 1.5) return "text-sad";
    return "text-anxious";
  };

  const getMoodEmoji = (mood: number) => {
    if (mood >= 4.5) return "😊";
    if (mood >= 3.5) return "😌";
    if (mood >= 2.5) return "😐";
    if (mood >= 1.5) return "😢";
    return "😰";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <div className="bg-gradient-header p-6 pt-12">
        <div className="flex items-center justify-between">
          <Button
            onClick={() => navigate(-1)}
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="text-center flex-1">
          <h1 className="text-2xl font-bold text-white mb-2">감정 통계</h1>
          <p className="text-white/80">나의 감정 패턴을 확인해보세요</p>
          </div>
          <div className="w-10" />
        </div>
      </div>

      {/* 기간 선택 */}
      <div className="p-6 pb-4">
        <div className="flex gap-2 bg-muted rounded-lg p-1">
          {[
            { key: "week", label: "최근 1주" },
            { key: "month", label: "최근 1달" },
            { key: "year", label: "최근 1년" }
          ].map(({ key, label }) => (
            <Button
              key={key}
              variant={selectedPeriod === key ? "default" : "ghost"}
              size="sm"
              className="flex-1"
              onClick={() => setSelectedPeriod(key as any)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div className="px-6">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">개요</TabsTrigger>
            <TabsTrigger value="emotions">감정 분석</TabsTrigger>
            <TabsTrigger value="trends">기분 변화</TabsTrigger>
          </TabsList>

          {/* 개요 탭 */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* 주요 지표 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-card rounded-lg p-4 shadow-card">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  <span className="text-sm text-muted-foreground">총 일기 수</span>
                </div>
                <div className="text-2xl font-bold">{totalEntries}</div>
                <div className="text-xs text-muted-foreground">이번 달</div>
              </div>

              <div className="bg-card rounded-lg p-4 shadow-card">
                <div className="flex items-center gap-3 mb-2">
                  <Heart className="w-5 h-5 text-primary" />
                  <span className="text-sm text-muted-foreground">평균 기분</span>
                </div>
                <div className={`text-2xl font-bold ${getMoodColor(averageMood)}`}>
                  {averageMood.toFixed(1)} {getMoodEmoji(averageMood)}
                </div>
                <div className="text-xs text-muted-foreground">5점 만점</div>
              </div>
            </div>

            {/* 가장 많은 감정 */}
            <div className="bg-card rounded-lg p-4 shadow-card">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                가장 많이 느낀 감정
              </h3>
              {emotionStats.slice(0, 3).map((stat, index) => (
                <div key={stat.emotion} className="flex items-center justify-between mb-3 last:mb-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full ${stat.color} flex items-center justify-center`}>
                      {stat.emoji}
                    </div>
                    <div>
                      <div className="font-medium">{stat.name}</div>
                      <div className="text-sm text-muted-foreground">{stat.count}회</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{stat.percentage}%</div>
                    {index === 0 && <div className="text-xs text-primary">최다</div>}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* 감정 분석 탭 */}
          <TabsContent value="emotions" className="space-y-6 mt-6">
            <div className="bg-card rounded-lg p-4 shadow-card">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                감정별 통계
              </h3>
              
              <div className="space-y-4">
                {emotionStats.map((stat) => (
                  <div key={stat.emotion}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{stat.emoji}</span>
                        <span className="font-medium">{stat.name}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {stat.count}회 ({stat.percentage}%)
                      </div>
                    </div>
                    <Progress value={stat.percentage} className="h-2" />
                  </div>
                ))}
              </div>
            </div>

            {/* 감정 분포 원형 차트 (간단한 시각화) */}
            <div className="bg-card rounded-lg p-4 shadow-card">
              <h3 className="font-semibold mb-4">감정 분포</h3>
              <div className="grid grid-cols-2 gap-4">
                {emotionStats.map((stat) => (
                  <div key={stat.emotion} className="text-center">
                    <div className={`w-16 h-16 rounded-full ${stat.color} flex items-center justify-center text-2xl mx-auto mb-2`}>
                      {stat.emoji}
                    </div>
                    <div className="text-sm font-medium">{stat.name}</div>
                    <div className="text-xs text-muted-foreground">{stat.percentage}%</div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* 기분 변화 탭 */}
          <TabsContent value="trends" className="space-y-6 mt-6">
            <div className="bg-card rounded-lg p-4 shadow-card">
              <h3 className="font-semibold mb-4">최근 기분 변화</h3>
              
              {/* 간단한 기분 차트 */}
              <div className="space-y-3">
                {moodTrends.map((trend, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="w-12 text-sm text-muted-foreground">{trend.date}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-gradient-primary h-2 rounded-full" 
                            style={{ width: `${(trend.mood / 5) * 100}%` }}
                          ></div>
                        </div>
                        <span className={`text-sm font-medium ${getMoodColor(trend.mood)}`}>
                          {trend.mood}.0
                        </span>
                      </div>
                    </div>
                    <span className="text-lg">{getMoodEmoji(trend.mood)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card rounded-lg p-4 shadow-card">
              <h3 className="font-semibold mb-3">기분 개선 팁</h3>
              <div className="space-y-3 text-sm">
                {averageMood < 3 ? (
                  <>
                    <div className="flex items-start gap-2">
                      <span>💙</span>
                      <p>최근 기분이 좋지 않으신 것 같아요. 충분한 휴식을 취해보세요.</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span>🌱</span>
                      <p>산책이나 가벼운 운동으로 기분을 전환해보는 것은 어떨까요?</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start gap-2">
                      <span>✨</span>
                      <p>좋은 감정 상태를 잘 유지하고 계시네요!</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span>📝</span>
                      <p>긍정적인 순간들을 더 자주 기록해보세요.</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Statistics;
"""
감정 통계 분석 서비스
"""
from typing import List, Dict, Optional, Any
from datetime import datetime, date, timedelta
import logging
from collections import Counter

from models.statistics import (
    StatisticsRequest, StatisticsResponse, EmotionStatistics,
    EmotionCount, DailyEmotionSummary
)
from models.emotion import EmotionLabel
from services.emotion_mapping import emotion_mapper
from config.database import db_manager

logger = logging.getLogger(__name__)

class EmotionStatisticsService:
    """감정 통계 분석 서비스"""
    
    def __init__(self):
        self.emotion_collection = "emotion_analysis"
        self.diary_collection = "diaries"
    
    async def get_emotion_statistics(self, request: StatisticsRequest) -> StatisticsResponse:
        """
        사용자의 감정 통계를 분석합니다.
        
        Args:
            request: 통계 조회 요청
            
        Returns:
            StatisticsResponse: 감정 통계 결과
        """
        try:
            # 기간 설정
            start_date, end_date = self._calculate_period(request.period, request.start_date, request.end_date)
            
            # 감정 분석 데이터 조회
            emotion_data = await self._get_emotion_data(request.user_id, start_date, end_date)
            
            if not emotion_data:
                return self._create_empty_statistics(request.user_id, start_date, end_date)
            
            # 전체 감정 분포 계산
            emotion_distribution = self._calculate_emotion_distribution(emotion_data)
            
            # 지배 감정 계산
            dominant_emotion = self._get_dominant_emotion(emotion_distribution)
            
            # 일별 감정 요약 생성
            daily_summaries = await self._generate_daily_summaries(request.user_id, start_date, end_date)
            
            # 감정 추세 분석
            emotion_trend = self._analyze_emotion_trend(daily_summaries)
            
            # 응답 생성
            response = StatisticsResponse(
                period_start=start_date,
                period_end=end_date,
                total_entries=len(emotion_data),
                emotion_distribution=emotion_distribution,
                dominant_emotion=dominant_emotion,
                daily_summaries=daily_summaries,
                emotion_trend=emotion_trend
            )
            
            logger.info(f"감정 통계 분석 완료: {request.user_id} ({start_date} ~ {end_date})")
            return response
            
        except Exception as e:
            logger.error(f"감정 통계 분석 실패: {e}")
            raise
    
    def _calculate_period(self, period: str, start_date: Optional[date], end_date: Optional[date]) -> tuple[date, date]:
        """기간 계산"""
        if start_date and end_date:
            return start_date, end_date
        
        today = date.today()
        
        if period == "day":
            return today, today
        elif period == "week":
            start = today - timedelta(days=today.weekday())  # 이번 주 월요일
            end = start + timedelta(days=6)  # 이번 주 일요일
            return start, end
        elif period == "month":
            start = today.replace(day=1)  # 이번 달 1일
            if today.month == 12:
                end = date(today.year + 1, 1, 1) - timedelta(days=1)
            else:
                end = date(today.year, today.month + 1, 1) - timedelta(days=1)
            return start, end
        elif period == "year":
            start = today.replace(month=1, day=1)  # 올해 1월 1일
            end = today.replace(month=12, day=31)  # 올해 12월 31일
            return start, end
        else:
            # 기본값: 최근 7일
            return today - timedelta(days=6), today
    
    async def _get_emotion_data(self, user_id: str, start_date: date, end_date: date) -> List[Dict]:
        """기간 내 감정 분석 데이터 조회"""
        collection = db_manager.get_collection(self.emotion_collection)
        
        start_datetime = datetime.combine(start_date, datetime.min.time())
        end_datetime = datetime.combine(end_date, datetime.max.time())
        
        # Firebase 쿼리
        query = collection.where("user_id", "==", user_id).where("analyzed_at", ">=", start_datetime).where("analyzed_at", "<=", end_datetime).order_by("analyzed_at")
        docs = query.get()
        
        data = []
        for doc in docs:
            doc_data = doc.to_dict()
            doc_data["id"] = doc.id
            data.append(doc_data)
        
        return data
    
    def _calculate_emotion_distribution(self, emotion_data: List[Dict]) -> List[EmotionCount]:
        """감정 분포 계산"""
        # 감정별 카운트
        emotion_counts = Counter([doc["primary_emotion"] for doc in emotion_data])
        total_count = len(emotion_data)
        
        distribution = []
        for emotion in EmotionLabel:
            count = emotion_counts.get(emotion.value, 0)
            percentage = (count / total_count * 100) if total_count > 0 else 0
            emoji = emotion_mapper.get_emoji(emotion)
            
            distribution.append(EmotionCount(
                emotion=emotion,
                count=count,
                percentage=round(percentage, 2),
                emoji=emoji
            ))
        
        # 카운트 순으로 정렬
        distribution.sort(key=lambda x: x.count, reverse=True)
        return distribution
    
    def _get_dominant_emotion(self, emotion_distribution: List[EmotionCount]) -> EmotionLabel:
        """지배 감정 반환"""
        if not emotion_distribution or emotion_distribution[0].count == 0:
            return EmotionLabel.NEUTRAL
        return emotion_distribution[0].emotion
    
    async def _generate_daily_summaries(self, user_id: str, start_date: date, end_date: date) -> List[DailyEmotionSummary]:
        """일별 감정 요약 생성"""
        summaries = []
        current_date = start_date
        
        while current_date <= end_date:
            # 해당 날짜의 감정 데이터 조회
            daily_data = await self._get_emotion_data(user_id, current_date, current_date)
            
            if daily_data:
                # 해당 일의 감정 분포 계산
                daily_distribution = self._calculate_emotion_distribution(daily_data)
                dominant_emotion = self._get_dominant_emotion(daily_distribution)
                
                summary = DailyEmotionSummary(
                    date=current_date,
                    dominant_emotion=dominant_emotion,
                    dominant_emotion_emoji=emotion_mapper.get_emoji(dominant_emotion),
                    emotion_counts=daily_distribution,
                    total_entries=len(daily_data)
                )
                summaries.append(summary)
            else:
                # 데이터가 없는 날
                summary = DailyEmotionSummary(
                    date=current_date,
                    dominant_emotion=EmotionLabel.NEUTRAL,
                    dominant_emotion_emoji=emotion_mapper.get_emoji(EmotionLabel.NEUTRAL),
                    emotion_counts=[],
                    total_entries=0
                )
                summaries.append(summary)
            
            current_date += timedelta(days=1)
        
        return summaries
    
    def _analyze_emotion_trend(self, daily_summaries: List[DailyEmotionSummary]) -> Dict[str, float]:
        """감정 추세 분석"""
        if len(daily_summaries) < 2:
            return {}
        
        # 각 감정별 추세 계산
        emotion_trends = {}
        
        for emotion in EmotionLabel:
            emotion_counts = []
            for summary in daily_summaries:
                count = sum(ec.count for ec in summary.emotion_counts if ec.emotion == emotion)
                emotion_counts.append(count)
            
            # 간단한 추세 계산 (마지막 절반과 첫 절반 비교)
            mid_point = len(emotion_counts) // 2
            first_half_avg = sum(emotion_counts[:mid_point]) / mid_point if mid_point > 0 else 0
            second_half_avg = sum(emotion_counts[mid_point:]) / (len(emotion_counts) - mid_point)
            
            # 증감률 계산
            if first_half_avg > 0:
                trend = ((second_half_avg - first_half_avg) / first_half_avg) * 100
            else:
                trend = 0.0
            
            emotion_trends[emotion.value] = round(trend, 2)
        
        return emotion_trends
    
    def _create_empty_statistics(self, user_id: str, start_date: date, end_date: date) -> StatisticsResponse:
        """빈 통계 응답 생성"""
        empty_distribution = []
        for emotion in EmotionLabel:
            empty_distribution.append(EmotionCount(
                emotion=emotion,
                count=0,
                percentage=0.0,
                emoji=emotion_mapper.get_emoji(emotion)
            ))
        
        return StatisticsResponse(
            period_start=start_date,
            period_end=end_date,
            total_entries=0,
            emotion_distribution=empty_distribution,
            dominant_emotion=EmotionLabel.NEUTRAL,
            daily_summaries=[],
            emotion_trend={}
        )
    
    async def get_emotion_insights(self, user_id: str, period: str = "month") -> Dict[str, Any]:
        """감정 인사이트 제공"""
        try:
            request = StatisticsRequest(user_id=user_id, period=period)
            stats = await self.get_emotion_statistics(request)
            
            insights = {
                "summary": {
                    "dominant_emotion": stats.dominant_emotion.value,
                    "total_entries": stats.total_entries,
                    "period": f"{stats.period_start} ~ {stats.period_end}"
                },
                "recommendations": self._generate_recommendations(stats),
                "highlights": self._generate_highlights(stats)
            }
            
            return insights
            
        except Exception as e:
            logger.error(f"감정 인사이트 생성 실패: {e}")
            raise
    
    def _generate_recommendations(self, stats: StatisticsResponse) -> List[str]:
        """감정 기반 추천사항 생성"""
        recommendations = []
        
        # 지배 감정 기반 추천
        if stats.dominant_emotion == EmotionLabel.SADNESS:
            recommendations.append("슬픈 감정이 많이 나타났어요. 좋아하는 활동이나 친구들과 시간을 보내보는 것은 어떨까요?")
        elif stats.dominant_emotion == EmotionLabel.ANGER:
            recommendations.append("화가 나는 일이 많았군요. 깊게 숨을 쉬거나 운동으로 스트레스를 해소해보세요.")
        elif stats.dominant_emotion == EmotionLabel.JOY:
            recommendations.append("기쁜 순간들이 많았네요! 이런 긍정적인 경험들을 더 많이 만들어보세요.")
        elif stats.dominant_emotion == EmotionLabel.FEAR:
            recommendations.append("불안감이 느껴지는 시기였어요. 작은 목표부터 차근차근 달성해보세요.")
        
        # 감정 균형 추천
        positive_emotions = sum(ec.count for ec in stats.emotion_distribution 
                              if ec.emotion in [EmotionLabel.JOY, EmotionLabel.SURPRISE])
        negative_emotions = sum(ec.count for ec in stats.emotion_distribution 
                              if ec.emotion in [EmotionLabel.SADNESS, EmotionLabel.ANGER, EmotionLabel.FEAR])
        
        if negative_emotions > positive_emotions * 2:
            recommendations.append("부정적인 감정이 많이 나타났어요. 감정 관리를 위한 활동을 시도해보세요.")
        
        return recommendations
    
    def _generate_highlights(self, stats: StatisticsResponse) -> List[str]:
        """감정 하이라이트 생성"""
        highlights = []
        
        if stats.total_entries > 0:
            # 가장 많이 나타난 감정
            top_emotion = stats.emotion_distribution[0]
            highlights.append(f"이 기간 동안 가장 많이 느낀 감정은 '{top_emotion.emotion.value}'이에요 ({top_emotion.percentage}%)")
            
            # 감정 다양성
            active_emotions = len([ec for ec in stats.emotion_distribution if ec.count > 0])
            highlights.append(f"총 {active_emotions}가지 감정을 경험했어요")
            
            # 추세 분석
            if stats.emotion_trend:
                increasing_emotions = [emotion for emotion, trend in stats.emotion_trend.items() if trend > 10]
                if increasing_emotions:
                    highlights.append(f"'{', '.join(increasing_emotions)}' 감정이 증가하는 추세예요")
        
        return highlights

# 전역 감정 통계 서비스 인스턴스
statistics_service = EmotionStatisticsService() 
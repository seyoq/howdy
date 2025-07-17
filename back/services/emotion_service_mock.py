"""
Mock Emotion Service for testing without AI models
"""
import logging
from typing import Dict, List, Any
from models.emotion import EmotionAnalysisRequest, EmotionAnalysisResult, EmotionScore
import random

logger = logging.getLogger(__name__)

class MockEmotionService:
    """Mock 감정 분석 서비스"""
    
    def __init__(self):
        self.emotions = [
            {"emotion": "기쁨", "emoji": "😊"},
            {"emotion": "슬픔", "emoji": "😢"},
            {"emotion": "분노", "emoji": "😡"},
            {"emotion": "두려움", "emoji": "😰"},
            {"emotion": "놀람", "emoji": "😮"},
            {"emotion": "혐오", "emoji": "🤢"},
            {"emotion": "중성", "emoji": "😐"},
        ]
    
    async def analyze_emotion(self, request: EmotionAnalysisRequest) -> EmotionAnalysisResult:
        """감정 분석 (Mock 버전)"""
        try:
            # 텍스트 기반 간단한 감정 분석
            text_lower = request.text.lower()
            
            # 키워드 기반 감정 분석
            primary_emotion = self._detect_primary_emotion(text_lower)
            
            # 모든 감정 점수 생성
            all_emotions = []
            for emotion_info in self.emotions:
                score = random.uniform(0.1, 0.9)
                if emotion_info["emotion"] == primary_emotion["emotion"]:
                    score = random.uniform(0.6, 0.95)
                
                all_emotions.append(EmotionScore(
                    emotion=emotion_info["emotion"],
                    score=score,
                    emoji=emotion_info["emoji"]
                ))
            
            # 점수순 정렬
            all_emotions.sort(key=lambda x: x.score, reverse=True)
            
            return EmotionAnalysisResult(
                primary_emotion=primary_emotion["emotion"],
                primary_emotion_score=primary_emotion["score"],
                primary_emotion_emoji=primary_emotion["emoji"],
                all_emotions=all_emotions,
                confidence=random.uniform(0.7, 0.9),
                user_id=request.user_id
            )
            
        except Exception as e:
            logger.error(f"Mock 감정 분석 중 오류: {e}")
            # 기본값 반환
            return EmotionAnalysisResult(
                primary_emotion="중성",
                primary_emotion_score=0.7,
                primary_emotion_emoji="😐",
                all_emotions=[
                    EmotionScore(emotion="중성", score=0.7, emoji="😐"),
                    EmotionScore(emotion="기쁨", score=0.2, emoji="😊"),
                    EmotionScore(emotion="슬픔", score=0.1, emoji="😢"),
                ],
                confidence=0.7,
                user_id=request.user_id
            )
    
    def _detect_primary_emotion(self, text: str) -> Dict[str, Any]:
        """키워드 기반 감정 감지"""
        
        # 키워드 매핑
        keyword_mapping = {
            "기쁨": ["행복", "기쁘", "즐거", "웃", "좋", "사랑", "감사", "축하"],
            "슬픔": ["슬프", "우울", "아프", "눈물", "힘들", "괴로", "외로"],
            "분노": ["화", "짜증", "열받", "분노", "싫", "미워", "답답"],
            "두려움": ["무서", "걱정", "불안", "두렵", "떨려", "겁"],
            "놀람": ["놀라", "깜짝", "어머", "헉", "와", "대박"],
            "혐오": ["역겨", "싫", "더러", "지겨", "짜증"],
            "중성": ["평범", "그냥", "보통", "일반적"]
        }
        
        emotion_scores = {}
        
        for emotion, keywords in keyword_mapping.items():
            score = 0
            for keyword in keywords:
                if keyword in text:
                    score += 1
            emotion_scores[emotion] = score
        
        # 점수가 가장 높은 감정 선택
        primary_emotion_name = max(emotion_scores, key=emotion_scores.get)
        
        # 점수가 0이면 중성으로 설정
        if emotion_scores[primary_emotion_name] == 0:
            primary_emotion_name = "중성"
        
        # 해당 감정 정보 찾기
        for emotion_info in self.emotions:
            if emotion_info["emotion"] == primary_emotion_name:
                return {
                    "emotion": emotion_info["emotion"],
                    "score": random.uniform(0.6, 0.9),
                    "emoji": emotion_info["emoji"]
                }
        
        # 기본값
        return {
            "emotion": "중성",
            "score": 0.7,
            "emoji": "😐"
        }

# 싱글톤 인스턴스 생성
emotion_service = MockEmotionService() 
"""
피드백 생성 서비스
"""
from typing import List
import logging
from datetime import datetime

from models.feedback import FeedbackGenerationRequest, FeedbackResult, FeedbackResponse
from models.emotion import EmotionAnalysisRequest, EmotionLabel
from services.feedback_generator import feedback_generator
from config.database import db_manager
from config.settings import settings

logger = logging.getLogger(__name__)

# emotion_service import 시도
try:
    from services.emotion_service import emotion_service
except ImportError as e:
    logger.error(f"emotion_service import 실패: {e}")
    emotion_service = None

class FeedbackService:
    """피드백 생성 서비스"""
    
    def __init__(self):
        self.collection_name = "feedback_results"
    
    async def generate_feedback(self, request: FeedbackGenerationRequest) -> FeedbackResponse:
        """
        공감 피드백 생성 (감정분석 포함)
        
        Args:
            request: 피드백 생성 요청
        
        Returns:
            FeedbackResponse: 생성된 피드백
        """
        try:
            # 딥러닝 모델을 사용한 피드백 생성
            response = await feedback_generator.generate_feedback(request)
            
            # 감정 분석 결과 얻기 (저장을 위해)
            if emotion_service:
                emotion_request = EmotionAnalysisRequest(text=request.text, user_id=request.user_id)
                emotion_result = await emotion_service.analyze_emotion(emotion_request)
                detected_emotion = emotion_result.primary_emotion
            else:
                # 테스트 모드: 기본 감정 사용
                detected_emotion = EmotionLabel.NEUTRAL
            
            # 결과 저장 (실패해도 계속 진행)
            try:
                feedback_result = FeedbackResult(
                    original_text=request.text,
                    emotion=detected_emotion,
                    feedback_text=response.feedback_text,
                    style=response.style,
                    confidence=response.confidence,
                    user_id=request.user_id,
                    model_used=response.model_used
                )
                
                await self._save_feedback_result(feedback_result)
            except Exception as e:
                logger.warning(f"피드백 결과 저장 실패 (테스트 모드): {e}")
            
            logger.info(f"딥러닝 피드백 생성 완료: {response.model_used}")
            return response
            
        except Exception as e:
            logger.error(f"피드백 생성 실패: {e}")
            raise
    

    
    async def _save_feedback_result(self, result: FeedbackResult) -> str:
        """피드백 결과를 데이터베이스에 저장"""
        try:
            collection = db_manager.get_collection(self.collection_name)
            
            # 결과를 딕셔너리로 변환
            result_dict = result.dict(exclude_unset=True)
            result_dict["generated_at"] = datetime.utcnow()
            
            # Firebase에 저장
            time_ref, doc_ref = collection.add(result_dict)
            result.id = str(doc_ref.id)
            
            logger.info(f"피드백 결과 저장 완료: {result.id}")
            return result.id
            
        except Exception as e:
            logger.error(f"피드백 결과 저장 실패: {e}")
            raise
    
    async def get_user_feedback_history(
        self, 
        user_id: str, 
        limit: int = 10
    ) -> List[FeedbackResult]:
        """사용자의 피드백 이력 조회"""
        try:
            collection = db_manager.get_collection(self.collection_name)
            
            # Firebase 쿼리
            query = collection.where("user_id", "==", user_id).order_by("generated_at", direction="desc").limit(limit)
            docs = query.get()
            
            results = []
            for doc in docs:
                doc_data = doc.to_dict()
                doc_data["id"] = doc.id
                result = FeedbackResult(**doc_data)
                results.append(result)
            
            return results
            
        except Exception as e:
            logger.error(f"피드백 이력 조회 실패: {e}")
            raise
    
    async def get_feedback_statistics(self, user_id: str) -> dict:
        """사용자의 피드백 통계 조회"""
        try:
            collection = db_manager.get_collection(self.collection_name)
            
            # 총 피드백 수
            total_count = await collection.count_documents({"user_id": user_id})
            
            # 스타일별 통계
            style_stats = {}
            for style in ["empathetic", "encouraging", "analytical"]:
                count = await collection.count_documents({
                    "user_id": user_id,
                    "style": style
                })
                style_stats[style] = count
            
            # 감정별 통계
            emotion_pipeline = [
                {"$match": {"user_id": user_id}},
                {"$group": {
                    "_id": "$emotion",
                    "count": {"$sum": 1}
                }}
            ]
            
            emotion_stats = {}
            async for doc in collection.aggregate(emotion_pipeline):
                emotion_stats[doc["_id"]] = doc["count"]
            
            return {
                "total_feedback_count": total_count,
                "style_statistics": style_stats,
                "emotion_statistics": emotion_stats
            }
            
        except Exception as e:
            logger.error(f"피드백 통계 조회 실패: {e}")
            raise

# 전역 피드백 서비스 인스턴스
feedback_service = FeedbackService() 
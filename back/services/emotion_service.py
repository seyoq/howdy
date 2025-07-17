"""
감정 분석 서비스
"""
from typing import Optional
import logging
from datetime import datetime
import re
import json

from models.emotion import EmotionAnalysisRequest, EmotionAnalysisResult, EmotionAnalysisResponse
from services.emotion_classifier import openai_classifier, koelectra_generalized_classifier
from config.database import db_manager

logger = logging.getLogger(__name__)

class EmotionAnalysisService:
    """감정 분석 서비스"""
    
    def __init__(self):
        self.collection_name = "emotion_analysis"
    
    def _sanitize_text(self, text: str) -> str:
        """텍스트 데이터 정제 - 제어 문자 및 문제가 될 수 있는 문자 제거"""
        if not text:
            return ""
        
        # 제어 문자 제거 (탭, 줄바꿈, 백스페이스, 폼 피드, 캐리지 리턴 등)
        # 단, 일반적인 공백과 줄바꿈은 보존
        text = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', text)
        
        # 연속된 공백을 하나로 통합
        text = re.sub(r'\s+', ' ', text)
        
        # 앞뒤 공백 제거
        text = text.strip()
        
        # 빈 문자열 체크
        if not text:
            return ""
        
        # 텍스트 길이 제한 (너무 긴 텍스트는 잘라냄)
        max_length = 1000
        if len(text) > max_length:
            text = text[:max_length]
            logger.warning(f"텍스트가 너무 길어서 {max_length}자로 잘렸습니다.")
        
        return text
    
    def _validate_request(self, request: EmotionAnalysisRequest) -> EmotionAnalysisRequest:
        """요청 데이터 검증 및 정제"""
        # 텍스트 정제
        sanitized_text = self._sanitize_text(request.text)
        
        if not sanitized_text:
            raise ValueError("유효한 텍스트를 입력해주세요.")
        
        # 사용자 ID 검증
        if not request.user_id or not request.user_id.strip():
            raise ValueError("사용자 ID를 입력해주세요.")
        
        # 정제된 데이터로 새로운 요청 객체 생성
        return EmotionAnalysisRequest(
            text=sanitized_text,
            user_id=request.user_id.strip()
        )
    
    async def analyze_emotion(
        self, 
        request: EmotionAnalysisRequest,
        model_type: str = "openai"  # OpenAI를 기본으로 사용
    ) -> EmotionAnalysisResponse:
        """
        텍스트 감정 분석
        
        Args:
            request: 감정 분석 요청
            model_type: 사용할 모델 ("openai", "generalized")
        
        Returns:
            EmotionAnalysisResponse: 감정 분석 결과
        """
        try:
            # 요청 데이터 검증 및 정제
            validated_request = self._validate_request(request)
            
            # 모델 선택 - 기본값은 OpenAI 모델 사용
            if model_type.lower() == "generalized":
                classifier = koelectra_generalized_classifier
            elif model_type.lower() == "openai":
                classifier = openai_classifier
            else:
                # 지원하지 않는 모델 타입인 경우 OpenAI를 기본으로 사용
                logger.warning(f"지원하지 않는 모델 타입 '{model_type}', OpenAI 모델을 사용합니다.")
                classifier = openai_classifier
            
            # 감정 분석 수행
            result = await classifier.predict(validated_request.text)
            result.user_id = validated_request.user_id
            
            # 결과를 데이터베이스에 저장
            await self._save_analysis_result(result)
            
            # 응답 객체 생성
            response = EmotionAnalysisResponse(
                primary_emotion=result.primary_emotion,
                primary_emotion_score=result.primary_emotion_score,
                primary_emotion_emoji=result.primary_emotion_emoji,
                all_emotions=result.all_emotions,
                confidence=result.confidence,
                model_used=result.model_used
            )
            
            logger.info(f"감정 분석 완료: {result.primary_emotion} ({result.confidence:.3f})")
            return response
            
        except ValueError as e:
            logger.error(f"감정 분석 요청 검증 실패: {e}")
            raise
        except Exception as e:
            logger.error(f"감정 분석 실패: {e}")
            raise
    
    async def _save_analysis_result(self, result: EmotionAnalysisResult) -> str:
        """감정 분석 결과를 데이터베이스에 저장"""
        try:
            collection = db_manager.get_collection(self.collection_name)
            
            # 결과를 딕셔너리로 변환
            result_dict = result.dict(exclude_unset=True)
            result_dict["analyzed_at"] = datetime.utcnow()
            
            # Firebase에 저장
            time_ref, doc_ref = collection.add(result_dict)
            result.id = str(doc_ref.id)
            
            logger.info(f"감정 분석 결과 저장 완료: {result.id}")
            return result.id
            
        except Exception as e:
            logger.error(f"감정 분석 결과 저장 실패: {e}")
            raise
    
    async def get_user_emotion_history(
        self, 
        user_id: str, 
        limit: int = 10
    ) -> list[EmotionAnalysisResult]:
        """사용자의 감정 분석 이력 조회"""
        try:
            collection = db_manager.get_collection(self.collection_name)
            
            # Firebase 쿼리
            query = collection.where("user_id", "==", user_id).order_by("analyzed_at", direction="desc").limit(limit)
            docs = query.get()
            
            results = []
            for doc in docs:
                doc_data = doc.to_dict()
                doc_data["id"] = doc.id
                result = EmotionAnalysisResult(**doc_data)
                results.append(result)
            
            return results
            
        except Exception as e:
            logger.error(f"감정 분석 이력 조회 실패: {e}")
            raise

# 전역 감정 분석 서비스 인스턴스
emotion_service = EmotionAnalysisService() 